/**
 * PAC SCHED-SCORE — Visitor Live Scores
 * Modals (FFA / binary / sets / points) + Champion FAB near mobile nav
 */
(function () {
    'use strict';

    const API_BASE = (window.API_BASE || window.CONFIG?.API_BASE || '/api').replace(/\/$/, '');
    const SOCKET_URL = window.SOCKET_URL || window.CONFIG?.SOCKET_URL || undefined;

    let allMatches = [];
    let filteredMatches = [];
    let currentStatus = 'all';
    let currentSport = 'all';
    let spotlightDeptId = null;
    let socket = null;
    let countdownTimer = null;
    let clockTimer = null;
    let championData = null;

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        startClock();
        bindMatchCardClicks('#matches-container');
        bindMatchCardClicks('#featured-match-wrap');
        await loadMatches();
        await loadChampion();
        connectSocket();
    }

    // ═══════════════════════════════════════════════════════════
    // DATA
    // ═══════════════════════════════════════════════════════════
    async function loadMatches() {
        const ts = $('#refresh-ts');
        if (ts) ts.textContent = 'Loading…';
        try {
            const res = await fetch(`${API_BASE}/matches`);
            const json = await res.json();
            if (!json.success) throw new Error(json.message || 'Failed to load');
            allMatches = (json.data || []).map(normalizeMatch);
            buildSportFilters();
            buildSpotlightOptions();
            applyFilters();
            updateHeroStats();
            updateCountdown();
            updateTicker();
            if (ts) ts.textContent = `Updated ${formatTime(new Date())}`;
        } catch (err) {
            console.error(err);
            const box = $('#matches-container');
            if (box) {
                box.innerHTML = `<div class="empty-state">
          <div class="empty-title">Couldn’t load matches</div>
          <div class="empty-sub">${escapeHtml(err.message)}</div>
        </div>`;
            }
            if (ts) ts.textContent = 'Error — tap Refresh';
        }
    }

    function normalizeMatch(m) {
        return {
            ...m,
            id: m.id,
            status: m.status || 'pending',
            scoring_type: m.scoring_type || 'points',
            tournament_format: m.tournament_format || m.format || null,
            ffa_scoring: m.ffa_scoring || m.ffa_scoring_type || null,
            sets_to_win: m.sets_to_win || null,
            dept_a_name: m.dept_a_name || m.dept_a || null,
            dept_b_name: m.dept_b_name || m.dept_b || null,
            live_total_a:
                m.live_total_a != null
                    ? Number(m.live_total_a)
                    : m.total_score_a != null
                        ? Number(m.total_score_a)
                        : 0,
            live_total_b:
                m.live_total_b != null
                    ? Number(m.live_total_b)
                    : m.total_score_b != null
                        ? Number(m.total_score_b)
                        : 0,
            sets_won_a: m.sets_won_a != null ? Number(m.sets_won_a) : 0,
            sets_won_b: m.sets_won_b != null ? Number(m.sets_won_b) : 0,
            watchers: m.watchers || 0,
        };
    }

    window.refreshScores = async function (btn) {
        const icon = btn?.querySelector('.refresh-icon');
        if (icon) icon.classList.add('spin');
        await loadMatches();
        await loadChampion();
        setTimeout(() => icon?.classList.remove('spin'), 400);
    };

    function isFFAMatch(m) {
        if (!m) return false;
        const fmt = String(m.tournament_format || m.format || '').toLowerCase();
        const side = String(m.bracket_side || '').toLowerCase();
        const pos = String(m.bracket_position || '').toLowerCase();
        if (fmt === 'free_for_all' || fmt === 'ffa') return true;
        if (side === 'ffa') return true;
        if (pos === 'ffa event' || pos.startsWith('ffa')) return true;
        return false;
    }

    // ═══════════════════════════════════════════════════════════
    // CHAMPION FAB + CONFIDENTIAL (original confetti style)
    // ═══════════════════════════════════════════════════════════
    async function loadChampion() {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`);
            const json = await res.json();
            if (!json.success) return hideChampion();

            const rows = json.data || json.standings || [];
            const meta = json.meta || {};

            const declared =
                meta.champion_declared === true ||
                meta.status === 'completed' ||
                meta.sport_fest_status === 'completed' ||
                json.champion_declared === true;

            if (!declared || !rows.length) {
                hideChampion();
                return;
            }

            const top = rows[0];
            championData = {
                department_id: top.department_id || top.id,
                name: top.department_name || top.name || top.dept_name,
                color: top.department_color || top.color || top.dept_color,
                logo_url: top.logo_url || top.department_logo || top.dept_logo,
                points: top.total_points ?? top.points ?? top.pts,
                gold: top.gold ?? top.medals_gold,
                silver: top.silver ?? top.medals_silver,
                bronze: top.bronze ?? top.medals_bronze,
            };
            showChampion(championData);
        } catch (e) {
            console.warn('Champion load failed', e);
            hideChampion();
        }
    }

    function showChampion(c) {
        const fab = document.getElementById('champion-fab');
        if (fab) {
            fab.style.display = 'flex';
            fab.setAttribute('title', (c.name || 'Champion') + ' — Sport Fest Champion');
        }

        // Same session confetti pattern as before — fire once per champion
        const key = 'champ_confetti_' + (c.department_id || c.name);
        if (!sessionStorage.getItem(key) && typeof confetti === 'function') {
            sessionStorage.setItem(key, '1');
            fireChampionConfetti();
        }
    }

    function hideChampion() {
        championData = null;
        const fab = document.getElementById('champion-fab');
        if (fab) fab.style.display = 'none';
    }

    /** Original-style side cannons (canvas-confetti) */
    function fireChampionConfetti() {
        if (typeof confetti !== 'function') return;
        const end = Date.now() + 2500;
        const colors = ['#f59e0b', '#fbbf24', '#ffffff', '#ffb020'];
        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors,
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors,
            });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();
    }

    window.openChampionModal = function () {
        if (!championData) return;
        const body = document.getElementById('modal-body');
        const overlay = document.getElementById('modal-overlay');
        if (!body || !overlay) return;

        const c = championData;
        const bg = c.color || '#f59e0b';

        body.innerHTML = `
      <div class="modal-header" style="text-align:center">
        <div style="font-size:40px;margin-bottom:8px">🏆</div>
        <div class="modal-final-badge" style="margin:0 auto 10px;background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.4);color:var(--gold)">
          Sport Fest Champion
        </div>
        <div class="modal-title" style="color:var(--gold)">${escapeHtml(c.name || '—')}</div>
      </div>
      <div style="display:flex;justify-content:center;margin:1.25rem 0">
        <div class="modal-dept-avatar is-winner" style="width:72px;height:72px;font-size:22px;background:${bg}">
          ${c.logo_url ? `<img src="${escapeAttr(c.logo_url)}" alt="">` : initials(c.name)}
        </div>
      </div>
      <div style="text-align:center;margin-bottom:1.25rem">
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--accent)">
          ${c.points != null ? Number(c.points).toLocaleString() : '—'}
        </div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Total points</div>
      </div>
      ${c.gold != null || c.silver != null || c.bronze != null
                ? `<div style="display:flex;justify-content:center;gap:16px;margin-bottom:1rem">
               <div style="text-align:center"><div style="font-size:18px">🥇</div><div style="font-family:var(--font-mono);font-weight:700">${c.gold ?? 0}</div></div>
               <div style="text-align:center"><div style="font-size:18px">🥈</div><div style="font-family:var(--font-mono);font-weight:700">${c.silver ?? 0}</div></div>
               <div style="text-align:center"><div style="font-size:18px">🥉</div><div style="font-family:var(--font-mono);font-weight:700">${c.bronze ?? 0}</div></div>
             </div>`
                : ''
            }
      <div class="modal-meta" style="justify-content:center">
        <div class="modal-meta-item">Overall Sport Fest champion</div>
      </div>`;

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    // ═══════════════════════════════════════════════════════════
    // FILTERS / SPOTLIGHT / RENDER (same as before)
    // ═══════════════════════════════════════════════════════════
    window.filterByStatus = function (status, el) {
        currentStatus = status;
        $$('.status-filters .filter-chip').forEach((c) => c.classList.remove('active'));
        if (el) el.classList.add('active');
        applyFilters();
    };

    window.filterBySport = function (sport, el) {
        currentSport = sport;
        $$('.sport-chip').forEach((c) => c.classList.remove('active'));
        if (el) el.classList.add('active');
        applyFilters();
    };

    function applyFilters() {
        filteredMatches = allMatches.filter((m) => {
            if (currentStatus !== 'all' && m.status !== currentStatus) return false;
            if (currentSport !== 'all' && m.sport_name !== currentSport) return false;
            return true;
        });
        if (spotlightDeptId) {
            filteredMatches = [...filteredMatches].sort((a, b) => {
                const aHit =
                    String(a.participant_a_department_id) === String(spotlightDeptId) ||
                    String(a.participant_b_department_id) === String(spotlightDeptId);
                const bHit =
                    String(b.participant_a_department_id) === String(spotlightDeptId) ||
                    String(b.participant_b_department_id) === String(spotlightDeptId);
                if (aHit && !bHit) return -1;
                if (!aHit && bHit) return 1;
                return 0;
            });
        }
        renderFeatured();
        renderMatchList();
    }

    function buildSportFilters() {
        const wrap = $('#sport-filters');
        if (!wrap) return;
        const sports = [...new Set(allMatches.map((m) => m.sport_name).filter(Boolean))].sort();
        let html = `<button type="button" class="sport-chip ${currentSport === 'all' ? 'active' : ''}"
      onclick="filterBySport('all', this)">
      <span class="sport-chip-icon">✦</span><span class="sport-chip-label">All</span></button>`;
        sports.forEach((s) => {
            html += `<button type="button" class="sport-chip ${currentSport === s ? 'active' : ''}"
        onclick="filterBySport('${escapeAttr(s)}', this)">
        <span class="sport-chip-icon">${sportEmoji(s)}</span>
        <span class="sport-chip-label">${escapeHtml(s)}</span></button>`;
        });
        wrap.innerHTML = html;
    }

    function buildSpotlightOptions() {
        const sel = $('#spotlight-select');
        if (!sel) return;
        const depts = new Map();
        allMatches.forEach((m) => {
            if (m.participant_a_department_id && m.dept_a_name)
                depts.set(String(m.participant_a_department_id), m.dept_a_name);
            if (m.participant_b_department_id && m.dept_b_name)
                depts.set(String(m.participant_b_department_id), m.dept_b_name);
        });
        const current = sel.value;
        sel.innerHTML = `<option value="">Follow a department…</option>`;
        [...depts.entries()]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .forEach(([id, name]) => {
                sel.innerHTML += `<option value="${escapeAttr(id)}">${escapeHtml(name)}</option>`;
            });
        if (current) sel.value = current;
    }

    window.onSpotlightChange = function (val) {
        spotlightDeptId = val || null;
        $('#spotlight-clear')?.classList.toggle('visible', !!val);
        applyFilters();
    };

    window.clearSpotlight = function () {
        const sel = $('#spotlight-select');
        if (sel) sel.value = '';
        spotlightDeptId = null;
        $('#spotlight-clear')?.classList.remove('visible');
        applyFilters();
    };

    function isSpotlight(m) {
        if (!spotlightDeptId) return false;
        return (
            String(m.participant_a_department_id) === String(spotlightDeptId) ||
            String(m.participant_b_department_id) === String(spotlightDeptId)
        );
    }

    function renderFeatured() {
        const wrap = $('#featured-match-wrap');
        if (!wrap) return;
        const live = filteredMatches.filter((m) => m.status === 'ongoing');
        if (!live.length) {
            wrap.innerHTML = '';
            return;
        }
        let featured = live[0];
        if (spotlightDeptId) {
            const hit = live.find(
                (m) =>
                    String(m.participant_a_department_id) === String(spotlightDeptId) ||
                    String(m.participant_b_department_id) === String(spotlightDeptId)
            );
            if (hit) featured = hit;
        }
        wrap.innerHTML = renderFeaturedCard(featured);
    }

    function renderMatchList() {
        const box = $('#matches-container');
        if (!box) return;
        const list = [...filteredMatches];
        if (!list.length) {
            box.innerHTML = `<div class="empty-state">
        <div class="empty-title">No matches</div>
        <div class="empty-sub">Try another filter or check back soon.</div>
      </div>`;
            return;
        }
        const order = { ongoing: 0, scheduled: 1, pending: 2, completed: 3, cancelled: 4 };
        list.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
        box.innerHTML = list
            .map((m) => (isFFAMatch(m) ? renderFFACard(m) : renderMatchCard(m)))
            .join('');
    }

    function renderMatchCard(m) {
        const isLive = m.status === 'ongoing';
        const isDone = m.status === 'completed';
        const isBinary = m.scoring_type === 'binary';
        const isSets = m.scoring_type === 'sets' || !!m.sets_to_win;
        const isTime = m.scoring_type === 'time';
        const nameA = m.dept_a_name || 'TBD';
        const nameB = m.dept_b_name || 'TBD';

        let scoreA = m.live_total_a;
        let scoreB = m.live_total_b;
        if (isSets) {
            scoreA = Math.round(Number(m.sets_won_a) || 0);
            scoreB = Math.round(Number(m.sets_won_b) || 0);
        }

        const winnerSide = m.winner_side || m.result?.winner_side || null;
        const aWon =
            isDone &&
            (isBinary ? winnerSide === 'a' : isTime ? scoreA < scoreB : scoreA > scoreB);
        const bWon =
            isDone &&
            (isBinary ? winnerSide === 'b' : isTime ? scoreB < scoreA : scoreB > scoreA);

        const statusBadge = isLive
            ? `<span class="status-badge status-live"><span class="status-dot"></span>Live</span>`
            : isDone
                ? `<span class="status-badge status-done">Final</span>`
                : `<span class="status-badge status-upcoming">Upcoming</span>`;

        const formatPill = isBinary
            ? `<span class="format-pill binary">Win / Loss</span>`
            : isSets
                ? `<span class="format-pill sets">Sets</span>`
                : isTime
                    ? `<span class="format-pill time">Time</span>`
                    : `<span class="format-pill points">Points</span>`;

        let scoreCenter;
        if (isBinary) {
            if (isDone && winnerSide) {
                const label =
                    winnerSide === 'draw' ? 'Draw' : winnerSide === 'a' ? 'Win A' : 'Win B';
                scoreCenter = `<div class="score-center">
          <div class="winner-ribbon">${escapeHtml(label)}</div>
          <div class="vs-text">vs</div></div>`;
            } else {
                scoreCenter = `<div class="score-center"><div class="vs-text">vs</div></div>`;
            }
        } else {
            scoreCenter = `<div class="score-center">
        <div class="score-display">
          <span class="score-num ${aWon ? 'winner-score-final' : isLive && scoreA > scoreB ? 'winner-score' : ''}">${fmtNum(scoreA)}</span>
          <span class="score-sep">–</span>
          <span class="score-num ${bWon ? 'winner-score-final' : isLive && scoreB > scoreA ? 'winner-score' : ''}">${fmtNum(scoreB)}</span>
        </div>
        ${isSets ? `<div class="set-progress-note">sets</div>` : ''}
        ${isLive ? `<div class="live-score-bar"><span class="pulse-ring"></span> LIVE</div>` : ''}
      </div>`;
        }

        return `
      <div class="match-card ${isBinary ? 'binary-card' : ''} ${isLive ? 'is-live' : ''} ${isDone && (aWon || bWon) ? 'is-winner-card' : ''} ${isSpotlight(m) ? 'spotlight-highlight' : ''}"
           data-match-id="${m.id}" role="button" tabindex="0" onclick="openMatchModal(${m.id})">
        <div class="match-top">
          <div class="match-meta">
            <span class="sport-pill">${escapeHtml(m.sport_name || 'Sport')}</span>
            ${formatPill}
            ${m.tournament_name ? `<span class="tournament-pill">${escapeHtml(m.tournament_name)}</span>` : ''}
          </div>
          ${statusBadge}
        </div>
        <div class="teams-row">
          <div class="team">
            <div class="dept-avatar-wrap">${deptAvatarHtml(nameA, m.dept_a_color, m.dept_a_logo, aWon)}</div>
            <div class="dept-name ${aWon ? 'winner-final' : ''}">${escapeHtml(nameA)}</div>
          </div>
          ${scoreCenter}
          <div class="team">
            <div class="dept-avatar-wrap">${deptAvatarHtml(nameB, m.dept_b_color, m.dept_b_logo, bWon)}</div>
            <div class="dept-name ${bWon ? 'winner-final' : ''}">${escapeHtml(nameB)}</div>
          </div>
        </div>
        <div class="match-footer">
          ${m.scheduled_time ? `<span class="match-footer-item">🕐 ${escapeHtml(m.scheduled_time)}</span>` : ''}
          ${m.venue_name ? `<span class="match-footer-item">📍 ${escapeHtml(m.venue_name)}</span>` : ''}
          ${m.watchers > 0 && isLive ? `<span class="match-footer-item">👁 ${m.watchers}</span>` : ''}
          <span class="click-hint">Details →</span>
        </div>
      </div>`;
    }

    function renderFFACard(m) {
        const isLive = m.status === 'ongoing';
        const isDone = m.status === 'completed';
        const statusBadge = isLive
            ? `<span class="status-badge status-live"><span class="status-dot"></span>Live</span>`
            : isDone
                ? `<span class="status-badge status-done">Final</span>`
                : `<span class="status-badge status-upcoming">Upcoming</span>`;
        return `
      <div class="ffa-card ${isLive ? 'is-live' : ''} ${isDone ? 'is-winner-card' : ''}"
           data-match-id="${m.id}" role="button" tabindex="0" onclick="openMatchModal(${m.id})">
        <div class="ffa-header">
          <div>
            <span class="ffa-badge">FFA</span>
            <div class="ffa-title" style="margin-top:6px">${escapeHtml(m.sport_name || m.tournament_name || 'FFA Event')}</div>
          </div>
          ${statusBadge}
        </div>
        <div style="font-size:12px;color:var(--muted2);margin-bottom:.5rem">
          ${escapeHtml(m.tournament_name || '')}
          ${m.ffa_scoring ? ` · ${escapeHtml(m.ffa_scoring)} scoring` : ''}
        </div>
        <div class="ffa-footer">
          <span>${m.scheduled_time ? '🕐 ' + escapeHtml(m.scheduled_time) : 'Multi-department'}</span>
          <span class="click-hint">Rankings →</span>
        </div>
      </div>`;
    }

    function renderFeaturedCard(m) {
        if (isFFAMatch(m)) {
            return `
        <div class="featured-match is-live" data-match-id="${m.id}" role="button" tabindex="0" onclick="openMatchModal(${m.id})">
          <div class="featured-label"><span class="live-dot"></span> Featured FFA</div>
          <div class="ffa-header">
            <div>
              <span class="ffa-badge">FFA</span>
              <div class="ffa-title" style="margin-top:6px">${escapeHtml(m.sport_name || m.tournament_name || 'FFA Event')}</div>
            </div>
            <span class="status-badge status-live"><span class="status-dot"></span>Live</span>
          </div>
          <div class="ffa-footer">
            <span>${escapeHtml(m.tournament_name || '')}</span>
            <span class="click-hint">Rankings →</span>
          </div>
        </div>`;
        }
        const nameA = m.dept_a_name || 'TBD';
        const nameB = m.dept_b_name || 'TBD';
        const isSets = m.scoring_type === 'sets' || !!m.sets_to_win;
        const scoreA = isSets ? Math.round(Number(m.sets_won_a) || 0) : m.live_total_a;
        const scoreB = isSets ? Math.round(Number(m.sets_won_b) || 0) : m.live_total_b;
        return `
      <div class="featured-match is-live" data-match-id="${m.id}" role="button" tabindex="0" onclick="openMatchModal(${m.id})">
        <div class="featured-label"><span class="live-dot"></span> Featured Live</div>
        <div class="match-top">
          <div class="match-meta">
            <span class="sport-pill">${escapeHtml(m.sport_name || '')}</span>
            <span class="tournament-pill">${escapeHtml(m.tournament_name || '')}</span>
          </div>
          <span class="status-badge status-live"><span class="status-dot"></span>Live</span>
        </div>
        <div class="teams-row">
          <div class="team">
            ${deptAvatarHtml(nameA, m.dept_a_color, m.dept_a_logo, false)}
            <div class="dept-name">${escapeHtml(nameA)}</div>
          </div>
          <div class="score-center">
            <div class="score-display">
              <span class="score-num">${fmtNum(scoreA)}</span>
              <span class="score-sep">–</span>
              <span class="score-num">${fmtNum(scoreB)}</span>
            </div>
            <div class="live-score-bar"><span class="pulse-ring"></span> LIVE</div>
          </div>
          <div class="team">
            ${deptAvatarHtml(nameB, m.dept_b_color, m.dept_b_logo, false)}
            <div class="dept-name">${escapeHtml(nameB)}</div>
          </div>
        </div>
      </div>`;
    }

    function deptAvatarHtml(name, color, logo, isWinner) {
        const bg = color || '#4b5563';
        const ring = isWinner ? 'is-winner-ring' : '';
        const crown = isWinner ? `<span class="winner-crown">👑</span>` : '';
        if (logo) {
            return `<div class="dept-avatar-wrap">${crown}
        <div class="dept-avatar ${ring}" style="background:${bg}">
          <img src="${escapeAttr(logo)}" alt="" onerror="this.remove();this.parentElement.textContent='${initials(name)}'">
        </div></div>`;
        }
        return `<div class="dept-avatar-wrap">${crown}
      <div class="dept-avatar ${ring}" style="background:${bg}">${initials(name)}</div></div>`;
    }

    // ═══════════════════════════════════════════════════════════
    // HERO / TICKER / CLOCK / SOCKET
    // ═══════════════════════════════════════════════════════════
    function updateHeroStats() {
        const live = allMatches.filter((m) => m.status === 'ongoing').length;
        const todayStr = new Date().toISOString().slice(0, 10);
        const today = allMatches.filter((m) => m.scheduled_date === todayStr).length;
        const done = allMatches.filter((m) => m.status === 'completed').length;
        const sports = new Set(allMatches.map((m) => m.sport_name).filter(Boolean)).size;
        setText('h-live', live);
        setText('h-today', today);
        setText('h-done', done);
        setText('h-sports', sports || '—');
        const badge = $('#mnav-live-badge');
        if (badge) {
            if (live > 0) {
                badge.style.display = '';
                badge.textContent = live;
            } else badge.style.display = 'none';
        }
    }

    function updateCountdown() {
        const wrap = $('#countdown-wrap');
        if (!wrap) return;
        const upcoming = allMatches
            .filter((m) => (m.status === 'scheduled' || m.status === 'pending') && m.scheduled_date)
            .map((m) => {
                const t = m.scheduled_time || '00:00';
                const dt = new Date(`${m.scheduled_date}T${t.length === 5 ? t + ':00' : t}`);
                return { m, dt };
            })
            .filter((x) => x.dt > new Date())
            .sort((a, b) => a.dt - b.dt);
        if (!upcoming.length) {
            wrap.style.display = 'none';
            if (countdownTimer) clearInterval(countdownTimer);
            return;
        }
        wrap.style.display = '';
        const next = upcoming[0];
        const name = isFFAMatch(next.m)
            ? next.m.sport_name || next.m.tournament_name || 'FFA Event'
            : `${next.m.dept_a_name || 'TBD'} vs ${next.m.dept_b_name || 'TBD'}`;
        setText('cd-match-name', name);
        const tick = () => {
            const diff = next.dt - new Date();
            if (diff <= 0) {
                loadMatches();
                return;
            }
            setText('cd-d', pad(Math.floor(diff / 86400000)));
            setText('cd-h', pad(Math.floor((diff % 86400000) / 3600000)));
            setText('cd-m', pad(Math.floor((diff % 3600000) / 60000)));
            setText('cd-s', pad(Math.floor((diff % 60000) / 1000)));
        };
        tick();
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = setInterval(tick, 1000);
    }

    function updateTicker() {
        const track = $('#ticker-track');
        if (!track) return;
        const live = allMatches.filter((m) => m.status === 'ongoing');
        if (!live.length) {
            track.innerHTML = `
        <span class="ticker-item">Sport Fest · Live Coverage · Stay tuned</span>
        <span class="ticker-item">Sport Fest · Live Coverage · Stay tuned</span>`;
            return;
        }
        const items = live
            .map((m) => {
                if (isFFAMatch(m)) {
                    return `<span class="ticker-item"><b class="ticker-accent">LIVE</b> ${escapeHtml(m.sport_name || 'FFA')} · ${escapeHtml(m.tournament_name || '')}</span>`;
                }
                return `<span class="ticker-item"><b class="ticker-accent">LIVE</b> ${escapeHtml(m.dept_a_name || 'TBD')} ${fmtNum(m.live_total_a)}–${fmtNum(m.live_total_b)} ${escapeHtml(m.dept_b_name || 'TBD')} · ${escapeHtml(m.sport_name || '')}</span>`;
            })
            .join('');
        track.innerHTML = items + items;
    }

    function startClock() {
        const el = $('#topbar-clock');
        if (!el) return;
        const tick = () => {
            el.textContent = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        };
        tick();
        clockTimer = setInterval(tick, 1000);
    }

    function connectSocket() {
        if (typeof io === 'undefined') {
            setWsStatus(false);
            return;
        }
        try {
            socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
            socket.on('connect', () => setWsStatus(true));
            socket.on('disconnect', () => setWsStatus(false));
            socket.on('live:tick', (payload) => {
                if (!payload?.match_id) return;
                const m = allMatches.find((x) => x.id === payload.match_id);
                if (!m) return;
                if (payload.total_a != null) m.live_total_a = payload.total_a;
                if (payload.total_b != null) m.live_total_b = payload.total_b;
                applyFilters();
                updateTicker();
            });
            socket.on('live:matchStarted', () => loadMatches());
            socket.on('match:completed', () => loadMatches());
            socket.on('score:update', (payload) => {
                if (!payload?.match_id) return;
                const m = allMatches.find((x) => x.id === payload.match_id);
                if (m) {
                    if (payload.total_a != null) m.live_total_a = payload.total_a;
                    if (payload.total_b != null) m.live_total_b = payload.total_b;
                    applyFilters();
                    updateTicker();
                }
            });
            socket.on('ffa:resultsUpdated', () => loadMatches());
            socket.on('match:scheduled', () => loadMatches());
            socket.on('leaderboard:changed', () => {
                loadMatches();
                loadChampion();
            });
        } catch (e) {
            console.warn('Socket failed', e);
            setWsStatus(false);
        }
    }

    function setWsStatus(ok) {
        const dot = $('.ws-dot');
        const label = $('.ws-status span:last-child');
        if (dot) {
            dot.classList.toggle('connected', ok);
            dot.classList.toggle('disconnected', !ok);
        }
        if (label) label.textContent = ok ? 'Live' : 'Offline';
    }

    // ═══════════════════════════════════════════════════════════
    // MODALS
    // ═══════════════════════════════════════════════════════════
    window.openMatchModal = async function (matchIdOrObj) {
        const body = $('#modal-body');
        const overlay = $('#modal-overlay');
        if (!body || !overlay) return;
        body.innerHTML = `<div class="empty-state" style="padding:2rem 1rem">
      <div class="live-dot" style="margin:0 auto 12px"></div>
      <div class="empty-sub">Loading match…</div></div>`;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        try {
            let match;
            if (typeof matchIdOrObj === 'object' && matchIdOrObj !== null) {
                match = normalizeMatch(matchIdOrObj);
                if (!match.scores && match.id) {
                    const res = await fetch(`${API_BASE}/matches/${match.id}`);
                    const json = await res.json();
                    if (json.success) match = normalizeMatch({ ...match, ...json.data });
                }
            } else {
                const res = await fetch(`${API_BASE}/matches/${matchIdOrObj}`);
                const json = await res.json();
                if (!json.success) throw new Error(json.message || 'Match not found');
                match = normalizeMatch(json.data);
            }
            const fromList = allMatches.find((x) => x.id === match.id);
            if (fromList) {
                match.tournament_format = match.tournament_format || fromList.tournament_format;
                match.scoring_type = match.scoring_type || fromList.scoring_type;
                match.bracket_side = match.bracket_side || fromList.bracket_side;
                match.bracket_position = match.bracket_position || fromList.bracket_position;
            }
            if (isFFAMatch(match)) body.innerHTML = await buildFFAModal(match);
            else if (match.scoring_type === 'binary') body.innerHTML = buildBinaryModal(match);
            else if (match.scoring_type === 'sets' || match.sets_to_win) body.innerHTML = buildSetsModal(match);
            else body.innerHTML = buildStandardModal(match);
        } catch (err) {
            console.error(err);
            body.innerHTML = `<div class="empty-state" style="padding:2rem 1rem">
        <div class="empty-title">Couldn’t load match</div>
        <div class="empty-sub">${escapeHtml(err.message || 'Try again')}</div></div>`;
        }
    };

    window.closeModal = function () {
        $('#modal-overlay')?.classList.remove('open');
        document.body.style.overflow = '';
    };

    window.closeModalOnBg = function (e) {
        if (e.target === e.currentTarget) closeModal();
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    function bindMatchCardClicks(containerSelector) {
        const root = document.querySelector(containerSelector);
        if (!root || root.dataset.modalBound === '1') return;
        root.dataset.modalBound = '1';
        root.addEventListener('click', (e) => {
            const card = e.target.closest('[data-match-id]');
            if (!card) return;
            if (!e.target.closest('[onclick]')) openMatchModal(card.getAttribute('data-match-id'));
        });
    }
    window.bindMatchCardClicks = bindMatchCardClicks;

    async function buildFFAModal(match) {
        let participants = [];
        let ffaScoring = match.ffa_scoring || 'points';
        try {
            const res = await fetch(`${API_BASE}/matches/ffa/${match.tournament_id}`);
            const json = await res.json();
            if (json.success && json.data) {
                participants = json.data.participants || [];
                ffaScoring = json.data.ffa_scoring || ffaScoring;
            }
        } catch (e) {
            console.warn('FFA results fetch failed', e);
        }
        const sorted = [...participants].sort((a, b) => {
            if (a.rank_position != null && b.rank_position != null) return a.rank_position - b.rank_position;
            const va = a.ffa_result_value != null ? Number(a.ffa_result_value) : null;
            const vb = b.ffa_result_value != null ? Number(b.ffa_result_value) : null;
            if (va == null && vb == null) return 0;
            if (va == null) return 1;
            if (vb == null) return -1;
            return ffaScoring === 'time' ? va - vb : vb - va;
        });
        let rank = 1;
        sorted.forEach((p, i) => {
            if (p.rank_position == null) {
                if (i > 0) {
                    const prev = sorted[i - 1];
                    const same =
                        prev.ffa_result_value != null &&
                        p.ffa_result_value != null &&
                        Number(prev.ffa_result_value) === Number(p.ffa_result_value);
                    if (!same) rank = i + 1;
                }
                p._rank = rank;
            } else p._rank = p.rank_position;
        });
        const top3 = sorted.slice(0, 3);
        const podiumHtml =
            top3.length >= 1
                ? `<div class="modal-ffa-podium">${[1, 0, 2]
                    .map((idx) => {
                        const p = top3[idx];
                        if (!p) return '<div></div>';
                        const r = p._rank || idx + 1;
                        const cls = r === 1 ? 'gold' : r === 2 ? 'silver' : 'bronze';
                        const val =
                            p.ffa_result_value != null
                                ? Number(p.ffa_result_value).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : '—';
                        return `<div class="podium-slot ${cls}">
                <div class="podium-rank">${r}</div>
                <div class="podium-avatar" style="background:${p.department_color || '#4b5563'}">
                  ${p.department_logo ? `<img src="${escapeAttr(p.department_logo)}" alt="">` : initials(p.department_name)}
                </div>
                <div class="podium-name">${escapeHtml(p.department_name || '—')}</div>
                <div class="podium-score">${val}</div>
              </div>`;
                    })
                    .join('')}</div>`
                : '';
        const listHtml = sorted
            .map((p) => {
                const r = p._rank || '—';
                const rankCls = r === 1 ? 'rank-1 top3' : r === 2 ? 'rank-2 top3' : r === 3 ? 'rank-3 top3' : '';
                const val =
                    p.ffa_result_value != null
                        ? Number(p.ffa_result_value).toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : '—';
                return `<div class="ffa-rank-row ${rankCls}">
          <div class="ffa-rank-num">${r}</div>
          <div class="ffa-rank-avatar" style="background:${p.department_color || '#4b5563'}">
            ${p.department_logo ? `<img src="${escapeAttr(p.department_logo)}" alt="">` : initials(p.department_name)}
          </div>
          <div class="ffa-rank-info"><div class="ffa-rank-name">${escapeHtml(p.department_name || '—')}</div></div>
          <div class="ffa-rank-value">${val}</div>
        </div>`;
            })
            .join('');
        if (!participants.length) {
            return `<div class="modal-ffa">
        <div class="modal-header">
          <div class="modal-ffa-badge">FFA · Free For All</div>
          <div class="modal-ffa-title">${escapeHtml(match.sport_name || match.tournament_name || 'FFA Event')}</div>
          <div class="modal-ffa-sub">${escapeHtml(match.tournament_name || '')}</div>
        </div>
        ${statusChip(match.status)}
        <div class="empty-state" style="padding:1.5rem 0">
          <div class="empty-title">Results pending</div>
          <div class="empty-sub">Rankings appear when officers post FFA scores.</div>
        </div>
        ${metaRow(match)}
      </div>`;
        }
        return `<div class="modal-ffa">
      <div class="modal-header">
        <div class="modal-ffa-badge">FFA · Free For All</div>
        <div class="modal-ffa-title">${escapeHtml(match.sport_name || match.tournament_name || 'FFA Event')}</div>
        <div class="modal-ffa-sub">${escapeHtml(match.tournament_name || '')}</div>
      </div>
      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}
      ${podiumHtml}
      <div class="modal-breakdown-title">Full Standings</div>
      <div class="modal-ffa-list">${listHtml}</div>
      <div class="modal-ffa-scoring-note">${ffaScoring === 'time' ? 'Lower time ranks higher' : 'Higher score ranks higher'}</div>
      ${metaRow(match)}
    </div>`;
    }

    function buildBinaryModal(match) {
        const result = match.result || {};
        const winnerSide = result.winner_side || match.winner_side;
        const isDraw = winnerSide === 'draw';
        const isDone = match.status === 'completed';
        const aWon = isDone && winnerSide === 'a';
        const bWon = isDone && winnerSide === 'b';
        const nameA = match.dept_a_name || 'Side A';
        const nameB = match.dept_b_name || 'Side B';
        const winnerName = isDraw ? null : aWon ? nameA : bWon ? nameB : null;
        const banner = isDraw
            ? `<div class="binary-result-banner binary-draw-banner">
           <div class="binary-result-label">Result</div>
           <div class="binary-result-name">Draw</div>
           <div class="binary-result-sub">No winner declared</div>
         </div>`
            : isDone && winnerSide
                ? `<div class="binary-result-banner">
             <div class="binary-result-label">Winner</div>
             <div class="binary-result-name">${escapeHtml(winnerName || '—')}</div>
             <div class="binary-result-sub">${aWon ? 'Win — Side A' : 'Win — Side B'}${result.win_type ? ' · ' + escapeHtml(result.win_type) : ''}</div>
           </div>`
                : '';
        return `<div class="modal-binary">
      <div class="modal-header">
        <div class="modal-sport"><span class="format-pill binary">Win / Loss</span> ${escapeHtml(match.sport_name || '')}</div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>
      ${statusChip(match.status)}
      <div class="modal-teams">
        <div class="modal-team">
          ${modalAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon)}
          <div class="modal-dept-name ${aWon ? 'winner' : ''}">${escapeHtml(nameA)}</div>
        </div>
        <div class="binary-vs">vs</div>
        <div class="modal-team">
          ${modalAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon)}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>
      ${banner}
      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
    }

    function buildSetsModal(match) {
        const scores = match.scores || [];
        const result = match.result || {};
        const nameA = match.dept_a_name || 'Side A';
        const nameB = match.dept_b_name || 'Side B';
        const isDone = match.status === 'completed';
        const whole = (n) => Math.round(Number(n) || 0);

        let setsA = 0;
        let setsB = 0;
        scores.forEach((s) => {
            const a = whole(s.score_a);
            const b = whole(s.score_b);
            if (a > b) setsA++;
            else if (b > a) setsB++;
        });
        if (result.total_score_a != null) setsA = whole(result.total_score_a);
        if (result.total_score_b != null) setsB = whole(result.total_score_b);

        const aWon = isDone && setsA > setsB;
        const bWon = isDone && setsB > setsA;

        const setPills = scores
            .map((s, i) => {
                const a = whole(s.score_a);
                const b = whole(s.score_b);
                return `<div class="set-pill ${a > b || b > a ? 'won' : ''}">
          <div class="set-pill-label">${escapeHtml(s.period_label || 'Set ' + (s.period || i + 1))}</div>
          <div class="set-pill-val">${a}–${b}</div>
        </div>`;
            })
            .join('');

        const tableRows = scores
            .map((s, i) => {
                const a = whole(s.score_a);
                const b = whole(s.score_b);
                return `<tr>
          <td>${escapeHtml(s.period_label || 'Set ' + (s.period || i + 1))}</td>
          <td class="${a > b ? 'winner-score-cell' : ''}">${a}</td>
          <td class="${b > a ? 'winner-score-cell' : ''}">${b}</td>
        </tr>`;
            })
            .join('');

        return `<div class="modal-sets">
      <div class="modal-header">
        <div class="modal-sport"><span class="format-pill sets">Sets</span> ${escapeHtml(match.sport_name || '')}</div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>
      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}
      <div class="modal-teams">
        <div class="modal-team">
          ${modalAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon)}
          <div class="modal-dept-name ${aWon ? 'winner' : ''}">${escapeHtml(nameA)}</div>
        </div>
        <div class="modal-final-score">
          <div class="modal-score-big ${aWon ? 'winner-a' : ''} ${bWon ? 'winner-b' : ''}">
            <span class="score-a">${setsA}</span>
            <span style="color:var(--muted);font-weight:300">–</span>
            <span class="score-b">${setsB}</span>
          </div>
          <div class="modal-score-label">Sets</div>
        </div>
        <div class="modal-team">
          ${modalAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon)}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>
      ${setPills ? `<div class="set-score-summary">${setPills}</div>` : ''}
      ${scores.length
                ? `<div class="modal-breakdown">
               <div class="modal-breakdown-title">Set Breakdown</div>
               <table class="period-table">
                 <thead><tr><th>Set</th><th>${escapeHtml(nameA)}</th><th>${escapeHtml(nameB)}</th></tr></thead>
                 <tbody>${tableRows}<tr class="total-row"><td>Sets</td><td>${setsA}</td><td>${setsB}</td></tr></tbody>
               </table>
             </div>`
                : ''
            }
      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
    }

    function buildStandardModal(match) {
        const scores = match.scores || [];
        const result = match.result || {};
        const nameA = match.dept_a_name || 'Side A';
        const nameB = match.dept_b_name || 'Side B';
        const isTime = match.scoring_type === 'time';
        const isDone = match.status === 'completed';
        let totalA =
            result.total_score_a != null
                ? result.total_score_a
                : scores.reduce((s, r) => s + (Number(r.score_a) || 0), 0);
        let totalB =
            result.total_score_b != null
                ? result.total_score_b
                : scores.reduce((s, r) => s + (Number(r.score_b) || 0), 0);
        if (match.live_total_a != null) totalA = match.live_total_a;
        if (match.live_total_b != null) totalB = match.live_total_b;
        const aWon = isDone && (isTime ? totalA < totalB : totalA > totalB);
        const bWon = isDone && (isTime ? totalB < totalA : totalB > totalA);
        const tableRows = scores
            .map((s, i) => {
                const a = Number(s.score_a) || 0;
                const b = Number(s.score_b) || 0;
                const aBetter = isTime ? a < b : a > b;
                const bBetter = isTime ? b < a : b > a;
                return `<tr>
          <td>${escapeHtml(s.period_label || 'Period ' + (s.period || i + 1))}</td>
          <td class="${aBetter ? 'winner-score-cell' : ''}">${a}</td>
          <td class="${bBetter ? 'winner-score-cell' : ''}">${b}</td>
        </tr>`;
            })
            .join('');
        return `<div class="modal-standard">
      <div class="modal-header">
        <div class="modal-sport">
          <span class="format-pill ${isTime ? 'time' : 'points'}">${isTime ? 'Time' : 'Points'}</span>
          ${escapeHtml(match.sport_name || '')}
        </div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>
      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}
      <div class="modal-teams">
        <div class="modal-team">
          ${modalAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon)}
          <div class="modal-dept-name ${aWon ? 'winner' : ''}">${escapeHtml(nameA)}</div>
        </div>
        <div class="modal-final-score">
          <div class="modal-score-big ${aWon ? 'winner-a' : ''} ${bWon ? 'winner-b' : ''}">
            <span class="score-a">${Number(totalA).toLocaleString()}</span>
            <span style="color:var(--muted);font-weight:300">–</span>
            <span class="score-b">${Number(totalB).toLocaleString()}</span>
          </div>
          <div class="modal-score-label">${isTime ? 'Time' : 'Score'}</div>
        </div>
        <div class="modal-team">
          ${modalAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon)}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>
      ${scores.length
                ? `<div class="modal-breakdown">
               <div class="modal-breakdown-title">Period Breakdown</div>
               <table class="period-table">
                 <thead><tr><th>Period</th><th>${escapeHtml(nameA)}</th><th>${escapeHtml(nameB)}</th></tr></thead>
                 <tbody>${tableRows}
                   <tr class="total-row">
                     <td>Total</td>
                     <td class="${aWon ? 'winner-score-cell' : ''}">${Number(totalA).toLocaleString()}</td>
                     <td class="${bWon ? 'winner-score-cell' : ''}">${Number(totalB).toLocaleString()}</td>
                   </tr>
                 </tbody>
               </table>
             </div>`
                : isDone && result.final_score_display
                    ? `<div style="text-align:center;margin-bottom:1rem;font-family:var(--font-mono);font-size:14px;color:var(--muted2)">${escapeHtml(result.final_score_display)}</div>`
                    : ''
            }
      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
    }

    function modalAvatar(name, color, logo, isWinner) {
        const bg = color || '#4b5563';
        const cls = isWinner ? 'is-winner' : '';
        if (logo) {
            return `<div class="modal-dept-avatar ${cls}" style="background:${bg}">
        <img src="${escapeAttr(logo)}" alt="" onerror="this.parentElement.textContent='${initials(name)}'"></div>`;
        }
        return `<div class="modal-dept-avatar ${cls}" style="background:${bg}">${initials(name)}</div>`;
    }

    function statusChip(status) {
        if (status === 'ongoing')
            return `<div class="modal-live-pulse"><span class="live-dot"></span> Live</div>`;
        if (status === 'completed') return `<div class="modal-final-badge">Final</div>`;
        if (status === 'scheduled' || status === 'pending')
            return `<div class="modal-final-badge" style="background:var(--bg3);color:var(--muted2);border-color:var(--border)">Upcoming</div>`;
        return '';
    }

    function watchersChip(count) {
        if (!count || count < 1) return '';
        return `<span class="modal-watchers"><span class="dot"></span> ${count} watching</span>`;
    }

    function metaRow(match) {
        const items = [];
        if (match.venue_name) items.push(`📍 ${escapeHtml(match.venue_name)}`);
        if (match.scheduled_date) {
            const t = match.scheduled_time ? ` · ${escapeHtml(match.scheduled_time)}` : '';
            items.push(`🗓 ${escapeHtml(match.scheduled_date)}${t}`);
        }
        if (match.referee_name) items.push(`👤 ${escapeHtml(match.referee_name)}`);
        if (match.tournament_name) items.push(`🏆 ${escapeHtml(match.tournament_name)}`);
        if (!items.length) return '';
        return `<div class="modal-meta">${items.map((i) => `<div class="modal-meta-item">${i}</div>`).join('')}</div>`;
    }

    function mvpBlock(result) {
        if (!result?.mvp_player_name) return '';
        return `<div class="modal-mvp">
      <div class="modal-mvp-icon">⭐</div>
      <div>
        <div class="modal-mvp-label">Match MVP</div>
        <div class="modal-mvp-name">${escapeHtml(result.mvp_player_name)}</div>
      </div>
    </div>`;
    }

    // ═══════════════════════════════════════════════════════════
    // UTILS
    // ═══════════════════════════════════════════════════════════
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    function escapeAttr(str) {
        return escapeHtml(str).replace(/'/g, '&#39;');
    }
    function initials(name) {
        if (!name) return '?';
        return name
            .split(/\s+/)
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
    }
    function fmtNum(n) {
        if (n == null || n === '') return '0';
        const x = Number(n);
        if (Number.isNaN(x)) return '0';
        return Number.isInteger(x) ? String(x) : x.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    function pad(n) {
        return String(n).padStart(2, '0');
    }
    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
    function formatTime(d) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    function sportEmoji(name) {
        const n = String(name || '').toLowerCase();
        if (/basket/.test(n)) return '🏀';
        if (/volley|badminton|tennis|table/.test(n)) return '🏸';
        if (/soccer|football|futsal/.test(n)) return '⚽';
        if (/chess|board/.test(n)) return '♟️';
        if (/swim|aqua/.test(n)) return '🏊';
        if (/track|dash|sprint|relay|run|athlet/.test(n)) return '🏃';
        return '🏅';
    }
})();