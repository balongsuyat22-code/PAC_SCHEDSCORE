

const NotificationEngine = (function () {

    const TTL = 24 * 60 * 60 * 1000;
    const SEVERITY_WEIGHT = { critical: 5, live: 4, warning: 3, info: 2, success: 1 };
    const SEVERITY_COLOR = {
        critical: '#E8323B',
        live: '#22C55E',
        warning: '#F5B800',
        info: '#3B82F6',
        success: '#22C55E',
    };

    function dismissKey() {
        let uid = 'anon';
        try { uid = (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()?.id) || 'anon'; } catch (_) { }
        return `sf_notif_dismissed_${uid}`;
    }

    function getDismissed() {
        try {
            const raw = JSON.parse(localStorage.getItem(dismissKey()) || '{}');
            const now = Date.now();
            const pruned = {};
            Object.keys(raw).forEach(id => { if (now - raw[id] < TTL) pruned[id] = raw[id]; });
            return pruned;
        } catch (_) {
            return {};
        }
    }

    function isDismissed(id) {
        return !!getDismissed()[id];
    }

    function dismiss(id) {
        const d = getDismissed();
        d[id] = Date.now();
        localStorage.setItem(dismissKey(), JSON.stringify(d));
    }

    function undismissAll() {
        localStorage.removeItem(dismissKey());
    }

    function pushUnique(list, n) {
        if (isDismissed(n.id)) return;
        n.severity = n.severity || 'info';
        n.dismissible = n.dismissible !== false;
        list.push(n);
    }

    function minutesUntil(dateStr, timeStr) {
        if (!dateStr) return null;
        const dt = new Date(`${dateStr}T${(timeStr || '00:00')}`);
        if (Number.isNaN(dt.getTime())) return null;
        return (dt - new Date()) / 60000;
    }

    function isFFA(m) {
        const f = (m.tournament_format || m.format || '').toLowerCase();
        return f === 'free_for_all' || f === 'team_ranking';
    }

    function matchupLabel(m) {
        if (isFFA(m)) return m.tournament_name || 'FFA Event';
        const a = m.dept_a_name || m.dept_a || m.team_a || 'TBD';
        const b = m.dept_b_name || m.dept_b || m.team_b || 'TBD';
        return `${a} vs ${b}`;
    }

    function fmtTime(t) {
        if (!t) return 'TBD';
        try { return (typeof formatTime === 'function') ? formatTime(t) : String(t).slice(0, 5); }
        catch (_) { return String(t).slice(0, 5); }
    }

    function fromMatches(list, matches, opts = {}) {
        (matches || []).forEach(m => {
            const label = matchupLabel(m);
            const diff = minutesUntil(m.scheduled_date, m.scheduled_time);
            const link = opts.matchLink ? opts.matchLink(m) : '/admin/matches';

            if (m.status === 'pending' || m.status === 'scheduled') {
                if (diff != null) {
                    if (diff < 0) {
                        pushUnique(list, {
                            id: `match_${m.id}_overdue`,
                            severity: 'critical',
                            icon: '⏰',
                            title: 'Match hasn\'t started',
                            message: `${label} (${m.sport_name || 'match'}) was set for ${fmtTime(m.scheduled_time)} and still hasn't started.`,
                            link,
                        });
                    } else if (diff <= 30) {
                        pushUnique(list, {
                            id: `match_${m.id}_soon`,
                            severity: 'warning',
                            icon: '⏱️',
                            title: 'Match starting soon',
                            message: `${label} starts in ${Math.max(1, Math.round(diff))} min${m.venue_name ? ` at ${m.venue_name}` : ''}.`,
                            link,
                        });
                    }
                }
                if (opts.checkLogistics) {
                    if (!m.venue_id && !m.venue_name) {
                        pushUnique(list, {
                            id: `match_${m.id}_novenue`,
                            severity: 'warning',
                            icon: '📍',
                            title: 'No venue assigned',
                            message: `${label} (${m.sport_name || 'match'}) has no venue set yet.`,
                            link: '/admin/schedule',
                        });
                    }
                    if (!m.referee_id && !m.referee_name && !m.referee_user_id) {
                        pushUnique(list, {
                            id: `match_${m.id}_noref`,
                            severity: 'warning',
                            icon: '🧑\u200d⚖️',
                            title: 'No official assigned',
                            message: `${label} (${m.sport_name || 'match'}) has no referee/officer assigned.`,
                            link: '/admin/schedule',
                        });
                    }
                }
            } else if (m.status === 'ongoing') {
                pushUnique(list, {
                    id: `match_${m.id}_live`,
                    severity: 'live',
                    icon: '🔴',
                    title: 'Match live now',
                    message: `${label} is in progress${m.venue_name ? ` at ${m.venue_name}` : ''}.`,
                    link,
                    dismissible: false,
                });
            } else if (m.status === 'completed' && opts.showCompleted) {
                pushUnique(list, {
                    id: `match_${m.id}_completed`,
                    severity: 'success',
                    icon: '✅',
                    title: 'Result finalized',
                    message: `${label} is complete${m.winner_side ? '' : ''}.`,
                    link: opts.resultsLink || link,
                });
            } else if (m.status === 'cancelled' && opts.showCancelled) {
                pushUnique(list, {
                    id: `match_${m.id}_cancelled`,
                    severity: 'info',
                    icon: '🚫',
                    title: 'Match cancelled',
                    message: `${label} (${m.sport_name || 'match'}) was cancelled.`,
                    link,
                });
            }
        });
    }

    function fromTeams(list, teams, sportsById, opts = {}) {
        (teams || []).forEach(t => {
            const sport = sportsById[t.sport_id] || {};
            const min = sport.min_players || 1;
            const approved = t.approved_count || 0;
            const total = t.total_count || 0;
            const label = `${t.name}${opts.showDept !== false && t.department_name ? ` (${t.department_name})` : ''}`;

            if (total === 0) {
                pushUnique(list, {
                    id: `team_${t.id}_noplayers`,
                    severity: 'critical',
                    icon: '🚫',
                    title: 'No players registered',
                    message: `${label} has zero players registered so far.`,
                    link: opts.link || '/admin/teams',
                });
            } else if (approved < min) {
                pushUnique(list, {
                    id: `team_${t.id}_understaffed_${approved}`,
                    severity: 'warning',
                    icon: '👥',
                    title: 'Team understaffed',
                    message: `${label} has ${approved}/${min} approved players — below the minimum roster.`,
                    link: opts.link || '/admin/teams',
                });
            }
        });
    }

    function fromTournaments(list, tournaments, opts = {}) {
        const now = new Date();
        (tournaments || []).forEach(t => {
            if (t.status !== 'registration' && t.status !== 'draft') return;
            const count = t.participant_count || 0;
            const daysLeft = t.start_date ? Math.ceil((new Date(t.start_date) - now) / 86400000) : null;

            if (count === 0) {
                pushUnique(list, {
                    id: `tourney_${t.id}_noparticipants`,
                    severity: (daysLeft != null && daysLeft <= 2) ? 'critical' : 'warning',
                    icon: '📋',
                    title: 'No departments registered',
                    message: `${t.name} (${t.sport_name || 'sport'}) has no participants yet${daysLeft != null ? `, starts in ${daysLeft}d` : ''}.`,
                    link: opts.link || '/admin/tournaments',
                });
            } else if (count === 1 && t.status === 'registration') {
                pushUnique(list, {
                    id: `tourney_${t.id}_lowturnout`,
                    severity: 'info',
                    icon: '📉',
                    title: 'Low turnout so far',
                    message: `Only 1 department has joined ${t.name}.`,
                    link: opts.link || '/admin/tournaments',
                });
            }
        });
    }

    function fromPendingPlayers(list, pending, opts = {}) {
        const n = (pending || []).length;
        if (!n) return;
        pushUnique(list, {
            id: `pending_players_${opts.scope || 'all'}_${n}`,
            severity: 'info',
            icon: '🕓',
            title: 'Players awaiting approval',
            message: opts.message || `${n} player registration${n > 1 ? 's are' : ' is'} waiting on review.`,
            link: opts.link || '/admin/departments',
        });
    }

    function fromSeasonStatus(list, champ, opts = {}) {
        if (!champ) return;
        if (champ.is_final && champ.champion) {
            const c = champ.champion;
            pushUnique(list, {
                id: `champion_${c.id || c.name}`,
                severity: 'success',
                icon: '🏆',
                title: 'Champion declared',
                message: `${c.name} is the Sport Fest Champion with ${c.total_points ?? '—'} points!`,
                link: opts.link || '/admin/leaderboard',
                dismissible: true,
            });
            return;
        }
        const s = champ.tournament_stats;
        if (!s) return;
        if (s.total_tournaments > 0 && s.upcoming_tournaments === 0 && s.ongoing_tournaments > 0) {
            pushUnique(list, {
                id: `season_final_stretch_${s.completed_tournaments}_${s.ongoing_tournaments}`,
                severity: 'info',
                icon: '🏁',
                title: 'Final events underway',
                message: `Every remaining event is live or done (${s.completed_tournaments}/${s.total_tournaments} completed).`,
                link: opts.link || '/admin/leaderboard',
            });
        }
    }

    async function quietApi(path) {
        try {
            const r = await api(path);
            return r && r.success ? r : { success: false, data: [] };
        } catch (_) {
            return { success: false, data: [] };
        }
    }

    async function sportsById() {
        const res = await quietApi('/sports');
        const map = {};
        (res.data || []).forEach(s => { map[s.id] = s; });
        return map;
    }

    async function list(role) {
        const out = [];
        try {
            if (role === 'admin' || role === 'sgo_president') {
                const [matches, teams, tourneys, pending, champ, sports] = await Promise.all([
                    quietApi('/matches'),
                    quietApi('/teams'),
                    quietApi('/tournaments'),
                    quietApi('/players/pending'),
                    quietApi('/leaderboard/champion'),
                    sportsById(),
                ]);
                fromMatches(out, matches.data, {
                    checkLogistics: true,
                    showCompleted: true,
                    showCancelled: true,
                    matchLink: () => role === 'admin' ? '/admin/matches' : '/president/live',
                    resultsLink: role === 'admin' ? '/admin/reports' : '/president/reports',
                });
                fromTeams(out, teams.data, sports, { link: role === 'admin' ? '/admin/teams' : '/president/departments' });
                fromTournaments(out, tourneys.data, { link: role === 'admin' ? '/admin/tournaments' : '/president/game-setup' });
                fromPendingPlayers(out, pending.data, {
                    scope: 'admin',
                    link: role === 'admin' ? '/admin/departments' : '/president/departments',
                });
                fromSeasonStatus(out, champ.data, { link: role === 'admin' ? '/admin/leaderboard' : '/president/dashboard' });

            } else if (role === 'dean_adviser') {
                const [matches, teams, pending, sports] = await Promise.all([
                    quietApi('/matches'),
                    quietApi('/teams'),
                    quietApi('/players/pending'),
                    sportsById(),
                ]);
                fromMatches(out, matches.data, {
                    checkLogistics: false,
                    showCompleted: true,
                    showCancelled: true,
                    matchLink: () => '/dean/matches',
                    resultsLink: '/dean/reports',
                });
                fromTeams(out, teams.data, sports, { showDept: false, link: '/dean/teams' });
                fromPendingPlayers(out, pending.data, {
                    scope: 'dean',
                    link: '/dean/players',
                    message: `${pending.data.length} of your players ${pending.data.length > 1 ? 'are' : 'is'} waiting on admin approval.`,
                });

            } else {

                const [live, champ] = await Promise.all([
                    quietApi('/matches/live'),
                    quietApi('/leaderboard/champion'),
                ]);
                fromMatches(out, live.data, { showCompleted: false, matchLink: () => '/live' });
                fromSeasonStatus(out, champ.data, { link: '/leaderboard' });
            }
        } catch (err) {
            console.warn('[NotificationEngine] list() failed:', err);
        }

        out.sort((a, b) => (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0));
        return out;
    }

    function itemHtml(n) {
        const color = SEVERITY_COLOR[n.severity] || 'var(--muted)';
        const clickAttr = n.link ? ` onclick="window.location.href='${n.link}'" style="cursor:pointer"` : '';
        const dismissBtn = n.dismissible
            ? `<button type="button" data-notif-dismiss="${n.id}" title="Dismiss" aria-label="Dismiss"
                    style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:15px;line-height:1;padding:2px 6px;flex-shrink:0">&times;</button>`
            : '';
        return `
        <div class="notif-item" data-notif-id="${n.id}"${clickAttr}>
            <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-bottom:1px solid var(--border)">
                <span style="font-size:16px;flex-shrink:0">${n.icon || '🔔'}</span>
                <div style="flex:1;min-width:0">
                    <strong style="color:${color};font-size:13px">${n.title}</strong>
                    <div style="font-size:12px;color:var(--muted);margin-top:2px">${n.message}</div>
                </div>
                ${dismissBtn}
            </div>
        </div>`;
    }

    function liveFeedToNotif(item) {
        const sevMap = { live: 'live', done: 'success', trophy: 'success', lb: 'info', info: 'info' };
        const iconMap = { live: '🔴', done: '✅', trophy: '🏆', lb: '📊', info: 'ℹ️' };
        return {
            id: `live_${item.id}`,
            severity: sevMap[item.type] || 'info',
            icon: iconMap[item.type] || '🔔',
            title: item.title,
            message: item.body || '',
            link: null,
            dismissible: false,
        };
    }

    function render(stateContainerId, badgeId, stateItems, liveItems) {
        const list = document.getElementById(stateContainerId);
        const badge = document.getElementById(badgeId);

        const merged = [...(stateItems || [])];
        (liveItems || []).forEach(li => merged.push(liveFeedToNotif(li)));

        const seen = new Set();
        const finalList = [];
        merged.forEach(n => { if (!seen.has(n.id)) { seen.add(n.id); finalList.push(n); } });
        finalList.sort((a, b) => (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0));

        if (badge) {
            const n = finalList.length;
            badge.textContent = n > 9 ? '9+' : String(n);
            badge.style.display = n > 0 ? '' : 'none';
        }

        if (!list) return;
        if (!finalList.length) {
            list.innerHTML = `<div class="notif-item empty" style="padding:16px;color:var(--muted);text-align:center;font-size:13px">You're all caught up</div>`;
            return;
        }
        list.innerHTML = finalList.slice(0, 30).map(itemHtml).join('');
        list.querySelectorAll('[data-notif-dismiss]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-notif-dismiss');
                dismiss(id);
                btn.closest('[data-notif-id]')?.remove();
                if (badge) {
                    const remaining = Math.max(0, (parseInt(badge.textContent, 10) || 0) - 1);
                    badge.textContent = remaining > 9 ? '9+' : String(remaining);
                    badge.style.display = remaining > 0 ? '' : 'none';
                }
                if (!list.querySelector('[data-notif-id]')) {
                    list.innerHTML = `<div class="notif-item empty" style="padding:16px;color:var(--muted);text-align:center;font-size:13px">You're all caught up</div>`;
                }
            });
        });
    }

    let _timer = null;
    let _activeTick = null;

    function mount({ stateContainerId, badgeId, role, intervalMs = 45000 } = {}) {
        if (!stateContainerId || !badgeId) return null;
        const resolvedRole = role || (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()?.role);

        const tick = async () => {
            const state = await list(resolvedRole);
            const live = (typeof Realtime !== 'undefined' && Realtime.getFeed) ? Realtime.getFeed() : [];
            render(stateContainerId, badgeId, state, live);
        };

        tick();
        if (_timer) clearInterval(_timer);
        _timer = setInterval(tick, intervalMs);
        _activeTick = tick;

        ['sf:notif', 'sf:live', 'sf:match', 'sf:leaderboard', 'sf:champion'].forEach(evt => {
            window.addEventListener(evt, tick);
        });

        return tick;
    }

    return {
        list,
        render,
        mount,
        dismiss,
        isDismissed,
        undismissAll,
        get _activeTick() { return _activeTick; },
    };
})();

window.NotificationEngine = NotificationEngine;