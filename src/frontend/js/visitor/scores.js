/**
 * Live Scores page — real-time updates for points / sets / binary / time / FFA
 */
let allMatches = [];
let currentStatusFilter = 'all';
let currentSportFilter = 'all';
let currentSpotlight = null;
let openModalMatchId = null;
let modalRefreshTimer = null;
let matchesRefreshTimer = null;
const setsDataCache = {};
const ffaDataCache = {};

function isSpotlighted(m) {
    if (!currentSpotlight) return false;
    return String(m.participant_a_department_id) === String(currentSpotlight) ||
        String(m.participant_b_department_id) === String(currentSpotlight);
}

async function loadSetsData(matchId, force) {
    if (!force && setsDataCache[matchId]) return setsDataCache[matchId];
    try {
        const r = await fetch(`${BASE}/api/matches/${matchId}/scoreboard`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        const scores = j.data?.scores || [];
        let setsWonA = 0, setsWonB = 0, currentSet = null;
        const ordered = [...scores].sort((a, b) => a.period - b.period);
        ordered.forEach(s => {
            if (s.score_a > s.score_b) setsWonA++;
            else if (s.score_b > s.score_a) setsWonB++;
        });
        if (ordered.length) {
            const last = ordered[ordered.length - 1];
            currentSet = { set: last.period, a: last.score_a, b: last.score_b };
        }
        setsDataCache[matchId] = { setsWonA, setsWonB, currentSet, scores };
        return setsDataCache[matchId];
    } catch {
        return setsDataCache[matchId] || { setsWonA: 0, setsWonB: 0, currentSet: null };
    }
}

async function loadFFAData(tournamentId, force) {
    if (!force && ffaDataCache[tournamentId]) return ffaDataCache[tournamentId];
    try {
        const r = await fetch(`${BASE}/api/matches/ffa/${tournamentId}`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        ffaDataCache[tournamentId] = j.data || { participants: [], ffa_scoring: 'points' };
        return ffaDataCache[tournamentId];
    } catch {
        return ffaDataCache[tournamentId] || { participants: [], ffa_scoring: 'points' };
    }
}

function ffaCardHTML(m) {
    const data = ffaDataCache[m.tournament_id] || { participants: [] };
    const parts = [...(data.participants || [])].sort((a, b) => (a.rank_position || 99) - (b.rank_position || 99));
    const live = m.status === 'ongoing';
    const done = m.status === 'completed';
    const spotClass = isSpotlighted(m) ? ' spotlight-highlight' : '';
    const unit = (data.ffa_scoring === 'time') ? 's' : 'pts';

    const rows = parts.slice(0, 8).map(p => {
        const rank = p.rank_position || '—';
        const rc = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'rank-other';
        const win = done && rank === 1 ? ' is-winner' : '';
        const val = p.ffa_result_value != null ? p.ffa_result_value : '—';
        return `<div class="ffa-participant${win}">
      <div class="ffa-rank ${rc}">${rank}</div>
      <div class="ffa-participant-info">
        <div class="ffa-participant-name">${esc(p.department_name)}</div>
        <div class="ffa-participant-dept">${esc(m.sport_name || '')}</div>
      </div>
      <div class="ffa-participant-score">${esc(String(val))}<span class="ffa-unit">${unit}</span></div>
    </div>`;
    }).join('');

    return `<div class="ffa-card${live ? ' is-live' : ''}${spotClass}${done ? ' is-winner-card' : ''}" onclick="openMatchModal(${m.id})" data-match-id="${m.id}">
    <div class="ffa-header">
      <div>
        <span class="ffa-badge">FFA</span>
        <div class="ffa-title" style="margin-top:6px">${sportIcon(m.sport_name)} ${esc(m.sport_name || 'Free-for-All')}</div>
      </div>
      ${statusBadgeHTML(m.status)}
    </div>
    <div class="ffa-participants">${rows || '<div class="empty-sub">Waiting for results…</div>'}</div>
    ${live ? `<div class="live-score-bar"><span class="pulse-ring"></span> Live rankings · updating automatically</div>` : ''}
    <div class="ffa-footer">
      <span>${done ? 'Champion crowned' : 'Live rankings'}</span>
      <span class="click-hint">${I.search} Details</span>
    </div>
  </div>`;
}

function matchCardHTML(m, featured = false) {
    const na = esc(m.dept_a_name || m.dept_a || 'TBD');
    const nb = esc(m.dept_b_name || m.dept_b || 'TBD');
    const colorA = m.dept_a_color || deptColor(na);
    const colorB = m.dept_b_color || deptColor(nb);
    const logoA = m.dept_a_logo || m.dept_a_logo_url || null;
    const logoB = m.dept_b_logo || m.dept_b_logo_url || null;
    const sa = fmtScore(m.total_score_a !== undefined ? m.total_score_a : (m.live_score_a ?? m.live_total_a ?? 0), m.sport_name);
    const sb = fmtScore(m.total_score_b !== undefined ? m.total_score_b : (m.live_score_b ?? m.live_total_b ?? 0), m.sport_name);
    const live = m.status === 'ongoing';
    const done = m.status === 'completed';
    const winA = done && (m.winner_side === 'a' || String(m.winner_department_id) === String(m.participant_a_department_id));
    const winB = done && (m.winner_side === 'b' || String(m.winner_department_id) === String(m.participant_b_department_id));
    const spotClass = isSpotlighted(m) ? ' spotlight-highlight' : '';
    const winnerCard = done && (winA || winB) ? ' is-winner-card' : '';
    const isTime = isTimeBased(m.sport_name) || m.scoring_type === 'time';
    const formatPill = isTime
        ? `<span class="format-pill time">${I.clock} TIME</span>`
        : `<span class="format-pill points">${I.zap} POINTS</span>`;
    const cls = featured ? 'featured-match' : `match-card${live ? ' is-live' : ''}${spotClass}${winnerCard}`;
    const scoreClassA = winA ? 'score-num winner-score-final' : (live && Number(sa) > Number(sb) ? 'score-num winner-score' : 'score-num');
    const scoreClassB = winB ? 'score-num winner-score-final' : (live && Number(sb) > Number(sa) ? 'score-num winner-score' : 'score-num');

    let centerExtra = '';
    if (done && (winA || winB)) centerExtra = `<div class="winner-ribbon" style="margin:6px auto 0">${I.check} Final</div>`;
    else if (live) centerExtra = `<div class="live-score-bar"><span class="pulse-ring"></span> Live score</div>`;
    else centerExtra = `<div class="vs-text">vs</div>`;

    return `<div class="${cls}" onclick="openMatchModal(${m.id})" data-match-id="${m.id}">
    ${featured ? `<div class="featured-label">${I.star} Match of the Day</div>` : ''}
    <div class="match-top">
      <div class="match-meta">
        <span class="sport-pill">${sportIcon(m.sport_name)} ${esc(m.sport_name || 'Sport')}</span>
        ${formatPill}
        ${m.tournament_name ? `<span class="tournament-pill">${esc(m.tournament_name)}</span>` : ''}
      </div>
      ${statusBadgeHTML(m.status)}
    </div>
    <div class="teams-row">
      <div class="team">
        <div class="dept-avatar-wrap">${deptAvatarHTML(na, colorA, logoA, 'sm', winA)}${winA ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
        <div class="dept-name${winA ? ' winner-final' : ''}">${na}</div>
        ${winA ? `<div class="winner-ribbon">${I.check} Winner</div>` : ''}
      </div>
      <div class="score-center">
        <div class="score-display">
          <div class="${scoreClassA}" data-side="a">${sa}</div>
          <div class="score-sep">–</div>
          <div class="${scoreClassB}" data-side="b">${sb}</div>
        </div>
        ${centerExtra}
      </div>
      <div class="team">
        <div class="dept-avatar-wrap">${deptAvatarHTML(nb, colorB, logoB, 'sm', winB)}${winB ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
        <div class="dept-name${winB ? ' winner-final' : ''}">${nb}</div>
        ${winB ? `<div class="winner-ribbon">${I.check} Winner</div>` : ''}
      </div>
    </div>
    <div class="match-footer">
      ${m.venue_name ? `<span class="match-footer-item">${I.pin} ${esc(m.venue_name)}</span>` : ''}
      ${m.scheduled_time ? `<span class="match-footer-item">${I.clock} ${fmtTime(m.scheduled_time)}</span>` : ''}
      ${m.scheduled_date ? `<span class="match-footer-item">${I.calendar} ${fmtDate(m.scheduled_date)}</span>` : ''}
      <span class="click-hint">${I.search} Details</span>
    </div>
  </div>`;
}

function setsCardHTML(m) {
    const na = esc(m.dept_a_name || m.dept_a || 'TBD');
    const nb = esc(m.dept_b_name || m.dept_b || 'TBD');
    const colorA = m.dept_a_color || deptColor(na);
    const colorB = m.dept_b_color || deptColor(nb);
    const logoA = m.dept_a_logo || m.dept_a_logo_url || null;
    const logoB = m.dept_b_logo || m.dept_b_logo_url || null;
    const live = m.status === 'ongoing';
    const done = m.status === 'completed';
    const spotClass = isSpotlighted(m) ? ' spotlight-highlight' : '';
    const sd = setsDataCache[m.id] || {
        setsWonA: Number(m.sets_won_a ?? m.total_score_a ?? m.live_score_a ?? 0) || 0,
        setsWonB: Number(m.sets_won_b ?? m.total_score_b ?? m.live_score_b ?? 0) || 0,
        currentSet: null
    };
    const winA = done && (sd.setsWonA > sd.setsWonB || m.winner_side === 'a');
    const winB = done && (sd.setsWonB > sd.setsWonA || m.winner_side === 'b');
    const winnerCard = done && (winA || winB) ? ' is-winner-card' : '';
    const cls = `match-card sets-card${live ? ' is-live' : ''}${spotClass}${winnerCard}`;
    const scoreClassA = winA ? 'score-num winner-score-final' : (live && sd.setsWonA > sd.setsWonB ? 'score-num winner-score' : 'score-num');
    const scoreClassB = winB ? 'score-num winner-score-final' : (live && sd.setsWonB > sd.setsWonA ? 'score-num winner-score' : 'score-num');
    const target = Number(m.sets_to_win) || Math.max(sd.setsWonA, sd.setsWonB, 2);
    const dotsA = Array.from({ length: target }, (_, i) => `<span class="set-dot${i < sd.setsWonA ? ' on' : ''}"></span>`).join('');
    const dotsB = Array.from({ length: target }, (_, i) => `<span class="set-dot${i < sd.setsWonB ? ' on' : ''}"></span>`).join('');

    let centerExtra = `<div class="vs-text">sets</div>`;
    if (done && (winA || winB)) centerExtra = `<div class="winner-ribbon" style="margin:6px auto 0">${I.check} Final</div>`;
    else if (live) centerExtra = `<div class="live-score-bar"><span class="pulse-ring"></span> Live sets</div>`;
    if (sd.currentSet) centerExtra += `<div class="set-progress-note">Set ${sd.currentSet.set}: ${sd.currentSet.a}–${sd.currentSet.b}</div>`;

    return `<div class="${cls}" onclick="openMatchModal(${m.id})" data-match-id="${m.id}">
    <div class="match-top">
      <div class="match-meta">
        <span class="sport-pill">${sportIcon(m.sport_name)} ${esc(m.sport_name || 'Sport')}</span>
        <span class="format-pill sets">${I.sets} SETS</span>
        ${m.tournament_name ? `<span class="tournament-pill">${esc(m.tournament_name)}</span>` : ''}
      </div>
      ${statusBadgeHTML(m.status)}
    </div>
    <div class="teams-row">
      <div class="team">
        <div class="dept-avatar-wrap">${deptAvatarHTML(na, colorA, logoA, 'sm', winA)}${winA ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
        <div class="dept-name${winA ? ' winner-final' : ''}">${na}</div>
        <div class="set-dots">${dotsA}</div>
        ${winA ? `<div class="winner-ribbon">${I.check} Winner</div>` : ''}
      </div>
      <div class="score-center">
        <div class="score-display">
          <div class="${scoreClassA}" data-side="a">${sd.setsWonA}</div>
          <div class="score-sep">–</div>
          <div class="${scoreClassB}" data-side="b">${sd.setsWonB}</div>
        </div>
        ${centerExtra}
      </div>
      <div class="team">
        <div class="dept-avatar-wrap">${deptAvatarHTML(nb, colorB, logoB, 'sm', winB)}${winB ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
        <div class="dept-name${winB ? ' winner-final' : ''}">${nb}</div>
        <div class="set-dots">${dotsB}</div>
        ${winB ? `<div class="winner-ribbon">${I.check} Winner</div>` : ''}
      </div>
    </div>
    <div class="match-footer">
      ${m.venue_name ? `<span class="match-footer-item">${I.pin} ${esc(m.venue_name)}</span>` : ''}
      ${m.scheduled_time ? `<span class="match-footer-item">${I.clock} ${fmtTime(m.scheduled_time)}</span>` : ''}
      <span class="click-hint">${I.search} Details</span>
    </div>
  </div>`;
}

function binaryCardHTML(m) {
    const na = esc(m.dept_a_name || m.dept_a || 'TBD');
    const nb = esc(m.dept_b_name || m.dept_b || 'TBD');
    const colorA = m.dept_a_color || deptColor(na);
    const colorB = m.dept_b_color || deptColor(nb);
    const logoA = m.dept_a_logo || m.dept_a_logo_url || null;
    const logoB = m.dept_b_logo || m.dept_b_logo_url || null;
    const live = m.status === 'ongoing';
    const done = m.status === 'completed';
    const winA = done && (m.winner_side === 'a' || String(m.winner_department_id) === String(m.participant_a_department_id));
    const winB = done && (m.winner_side === 'b' || String(m.winner_department_id) === String(m.participant_b_department_id));
    const isDraw = done && m.winner_side === 'draw';
    const spotClass = isSpotlighted(m) ? ' spotlight-highlight' : '';
    const winnerCard = done && (winA || winB) ? ' is-winner-card' : '';
    const cls = `match-card binary-card${live ? ' is-live' : ''}${spotClass}${winnerCard}`;

    let centerHTML;
    if (done && isDraw) centerHTML = `<div style="font-family:var(--font-head);font-size:14px;font-weight:800;color:var(--silver)">DRAW</div>`;
    else if (done) centerHTML = `<div style="font-family:var(--font-head);font-size:14px;font-weight:800;color:var(--gold)">${I.check} FINAL</div>`;
    else if (live) centerHTML = `<div class="live-score-bar"><span class="pulse-ring"></span> In progress</div>`;
    else centerHTML = `<div class="vs-text">vs</div>`;

    return `<div class="${cls}" data-match-id="${m.id}" style="cursor:default">
    <div class="match-top">
      <div class="match-meta">
        <span class="sport-pill">${sportIcon(m.sport_name)} ${esc(m.sport_name || 'Sport')}</span>
        <span class="format-pill binary">${I.binary} WIN / LOSS</span>
      </div>
      ${statusBadgeHTML(m.status)}
    </div>
    <div class="teams-row">
      <div class="team">
        <div class="dept-avatar-wrap">${deptAvatarHTML(na, colorA, logoA, 'sm', winA)}${winA ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
        <div class="dept-name${winA ? ' winner-final' : ''}">${na}</div>
        ${winA ? `<div class="winner-ribbon">${I.check} Winner</div>` : ''}
      </div>
      <div class="score-center">${centerHTML}</div>
      <div class="team">
        <div class="dept-avatar-wrap">${deptAvatarHTML(nb, colorB, logoB, 'sm', winB)}${winB ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
        <div class="dept-name${winB ? ' winner-final' : ''}">${nb}</div>
        ${winB ? `<div class="winner-ribbon">${I.check} Winner</div>` : ''}
      </div>
    </div>
    <div class="match-footer">
      ${m.venue_name ? `<span class="match-footer-item">${I.pin} ${esc(m.venue_name)}</span>` : ''}
      ${m.scheduled_time ? `<span class="match-footer-item">${I.clock} ${fmtTime(m.scheduled_time)}</span>` : ''}
      <span class="click-hint" style="opacity:.45">Result only</span>
    </div>
  </div>`;
}

function renderCard(m, featured = false) {
    if (isFFA(m)) return ffaCardHTML(m);
    if (isSets(m)) return setsCardHTML(m);
    if (isBinary(m)) return binaryCardHTML(m);
    return matchCardHTML(m, featured);
}

async function renderMatches() {
    const el = document.getElementById('matches-container');
    const featWrap = document.getElementById('featured-match-wrap');
    if (!el) return;
    let data = [...allMatches];

    for (const match of data) {
        if (isFFA(match) && match.tournament_id) await loadFFAData(match.tournament_id, match.status === 'ongoing');
        else if (isSets(match)) await loadSetsData(match.id, true);
    }

    if (currentStatusFilter !== 'all') data = data.filter(m => m.status === currentStatusFilter);
    if (currentSportFilter !== 'all') data = data.filter(m => m.sport_name === currentSportFilter);

    const liveMatches = allMatches.filter(m => m.status === 'ongoing');
    const todayMatches = allMatches.filter(m => isToday(m.scheduled_date));
    const featuredCandidate = liveMatches[0] || todayMatches[0] || null;
    const featured = featuredCandidate && !isFFA(featuredCandidate) && !isSets(featuredCandidate) && !isBinary(featuredCandidate)
        ? featuredCandidate : null;

    if (featWrap) {
        if (featured && currentStatusFilter === 'all' && currentSportFilter === 'all') {
            featWrap.innerHTML = matchCardHTML(featured, true);
            data = data.filter(m => m.id !== featured.id);
        } else featWrap.innerHTML = '';
    }

    if (!data.length) {
        el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.zap}</span><div class="empty-title">No matches found</div><div class="empty-sub">Try another filter or check back later</div></div>`;
        return;
    }
    if (currentSpotlight) data.sort((a, b) => (isSpotlighted(b) ? 1 : 0) - (isSpotlighted(a) ? 1 : 0));
    el.innerHTML = data.map(m => renderCard(m)).join('');
}

function filterByStatus(f, el) {
    currentStatusFilter = f;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderMatches();
}

function filterBySport(s, el) {
    currentSportFilter = s;
    document.querySelectorAll('.sport-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderMatches();
}

function buildSportFilters(matches) {
    const wrap = document.getElementById('sport-filters');
    if (!wrap) return;
    const sports = [...new Set(matches.map(m => m.sport_name).filter(Boolean))].sort();
    wrap.innerHTML = `<button class="sport-chip active" onclick="filterBySport('all',this)"><span class="sport-chip-icon">🏅</span><span class="sport-chip-label">All</span></button>` +
        sports.map(s => `<button class="sport-chip" onclick="filterBySport('${esc(s)}',this)"><span class="sport-chip-icon">${sportIcon(s)}</span><span class="sport-chip-label">${esc(s)}</span></button>`).join('');
}

function populateSpotlightSelect(depts) {
    const sel = document.getElementById('spotlight-select');
    if (!sel) return;
    const cur = currentSpotlight;
    sel.innerHTML = `<option value="">Follow a department…</option>` +
        depts.sort((a, b) => a.name.localeCompare(b.name))
            .map(d => `<option value="${d.id}" ${String(cur) === String(d.id) ? 'selected' : ''}>${esc(d.name)}</option>`).join('');
}

function onSpotlightChange(val) {
    currentSpotlight = val || null;
    document.getElementById('spotlight-clear')?.classList.toggle('visible', !!val);
    renderMatches();
}

function clearSpotlight() {
    currentSpotlight = null;
    const sel = document.getElementById('spotlight-select');
    if (sel) sel.value = '';
    document.getElementById('spotlight-clear')?.classList.remove('visible');
    renderMatches();
}
function setupCountdown(matches) {
    const wrap = document.getElementById('countdown-wrap');
    if (!wrap) return;
    const upcoming = matches
        .filter(m => m.status === 'scheduled' || m.status === 'pending')
        .filter(m => m.scheduled_date && m.scheduled_time)
        .map(m => {
            const t = new Date(`${m.scheduled_date}T${m.scheduled_time}:00`);
            return { m, t };
        })
        .filter(x => x.t > new Date())
        .sort((a, b) => a.t - b.t)[0];

    if (!upcoming) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = '';
    const nameEl = document.getElementById('cd-match-name');
    if (nameEl) {
        const na = upcoming.m.dept_a_name || 'TBD';
        const nb = upcoming.m.dept_b_name || 'TBD';
        nameEl.textContent = isFFA(upcoming.m) ? `${upcoming.m.sport_name} FFA` : `${na} vs ${nb}`;
    }
    const target = upcoming.t.getTime();
    const tick = () => {
        const diff = Math.max(0, target - Date.now());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const mi = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v).padStart(2, '0'); };
        set('cd-d', d); set('cd-h', h); set('cd-m', mi); set('cd-s', s);
    };
    tick();
    clearInterval(window._cdTimer);
    window._cdTimer = setInterval(tick, 1000);
}

function updateTicker() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    const items = allMatches.filter(m => m.status === 'ongoing' || m.status === 'completed').slice(0, 12);
    if (!items.length) {
        track.innerHTML = '<span class="ticker-item">Sport Fest · Live Coverage · Stay tuned</span><span class="ticker-item">Sport Fest · Live Coverage · Stay tuned</span>';
        return;
    }
    const html = items.map(m => {
        const na = m.dept_a_name || m.dept_a || '?';
        const nb = m.dept_b_name || m.dept_b || '?';
        const tag = m.status === 'ongoing' ? '<span class="ticker-accent">LIVE</span>' : 'FINAL';
        let scorePart;
        if (isBinary(m)) {
            const winner = m.winner_side === 'a' ? na : (m.winner_side === 'b' ? nb : null);
            scorePart = winner ? `${winner} won` : 'in progress';
        } else if (isSets(m)) {
            const sd = setsDataCache[m.id];
            scorePart = sd ? `${sd.setsWonA}–${sd.setsWonB} sets` : '—';
        } else {
            const sa = fmtScore(m.total_score_a ?? m.live_score_a ?? 0, m.sport_name);
            const sb = fmtScore(m.total_score_b ?? m.live_score_b ?? 0, m.sport_name);
            scorePart = `${sa}–${sb}`;
        }
        return `<span class="ticker-item">${tag} · <b>${esc(na)}</b> ${scorePart} <b>${esc(nb)}</b> · ${sportIcon(m.sport_name)} ${esc(m.sport_name || '')}</span>`;
    }).join('');
    track.innerHTML = html + html;
}

function applyLiveScoreToDOM(matchId, totalA, totalB, sportName) {
    const card = document.querySelector(`[data-match-id="${matchId}"]`);
    if (!card) return;
    const aEl = card.querySelector('[data-side="a"]');
    const bEl = card.querySelector('[data-side="b"]');
    if (aEl) {
        const next = fmtScore(totalA, sportName);
        if (aEl.textContent !== next) { aEl.textContent = next; aEl.classList.add('score-flash'); setTimeout(() => aEl.classList.remove('score-flash'), 600); }
    }
    if (bEl) {
        const next = fmtScore(totalB, sportName);
        if (bEl.textContent !== next) { bEl.textContent = next; bEl.classList.add('score-flash'); setTimeout(() => bEl.classList.remove('score-flash'), 600); }
    }
    if (aEl && bEl && !card.classList.contains('is-winner-card')) {
        const na = Number(totalA), nb = Number(totalB);
        aEl.classList.toggle('winner-score', na > nb);
        bEl.classList.toggle('winner-score', nb > na);
    }
}

async function loadMatches() {
    try {
        const r = await fetch(`${BASE}/api/matches`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        allMatches = j.data || [];

        if (socket && isConnected) {
            allMatches.filter(m => m.status === 'ongoing').forEach(m => {
                if (!activeMatchRooms.has(m.id)) {
                    socket.emit('joinMatch', m.id);
                    activeMatchRooms.add(m.id);
                }
            });
        }

        const deptMap = {};
        allMatches.forEach(m => {
            if (m.participant_a_department_id && m.dept_a_name) deptMap[m.participant_a_department_id] = { id: m.participant_a_department_id, name: m.dept_a_name };
            if (m.participant_b_department_id && m.dept_b_name) deptMap[m.participant_b_department_id] = { id: m.participant_b_department_id, name: m.dept_b_name };
        });
        populateSpotlightSelect(Object.values(deptMap));
        buildSportFilters(allMatches);
        setupCountdown(allMatches);

        const live = allMatches.filter(m => m.status === 'ongoing').length;
        const today = allMatches.filter(m => isToday(m.scheduled_date)).length;
        const done = allMatches.filter(m => m.status === 'completed').length;
        const sports = [...new Set(allMatches.map(m => m.sport_name).filter(Boolean))].length;
        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('h-live', live);
        setTxt('h-today', today);
        setTxt('h-done', done);
        setTxt('h-sports', sports || '—');

        const badge = document.getElementById('live-badge');
        if (badge) {
            if (live > 0) { badge.textContent = live; badge.style.display = ''; }
            else badge.style.display = 'none';
        }
        const mBadge = document.getElementById('mnav-live-badge');
        if (mBadge) {
            if (live > 0) { mBadge.textContent = live; mBadge.style.display = ''; }
            else mBadge.style.display = 'none';
        }

        const ts = document.getElementById('refresh-ts');
        if (ts) ts.textContent = `Live · last synced ${new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

        await renderMatches();
        updateTicker();
        if (openModalMatchId) refreshOpenModalIfNeeded();
    } catch {
        const el = document.getElementById('matches-container');
        if (el) el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.zap}</span><div class="empty-title">Could not load matches</div><div class="empty-sub">Check server connection</div></div>`;
    }
}

function refreshScores(btn) {
    const icon = btn?.querySelector('.refresh-icon');
    if (icon) { icon.classList.add('spin'); setTimeout(() => icon.classList.remove('spin'), 500); }
    loadMatches();
}

/* ── Modal (fixed close) ── */
async function loadAndRenderModal(matchId, silent = false) {
    const body = document.getElementById('modal-body');
    if (!body) return;
    if (!silent) body.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--muted)"><div class="live-dot" style="margin:0 auto 12px"></div>Loading details…</div>`;
    try {
        const r = await fetch(`${BASE}/api/matches/${matchId}`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        const m = j.data;
        const scores = m.scores || [];
        const result = m.result || null;
        const na = esc(m.dept_a_name || 'TBD');
        const nb = esc(m.dept_b_name || 'TBD');
        const colorA = m.dept_a_color || deptColor(na);
        const colorB = m.dept_b_color || deptColor(nb);
        const logoA = m.dept_a_logo || m.dept_a_logo_url || null;
        const logoB = m.dept_b_logo || m.dept_b_logo_url || null;
        const done = m.status === 'completed';
        const live = m.status === 'ongoing';
        const winA = done && (result?.winner_side === 'a');
        const winB = done && (result?.winner_side === 'b');
        const scoringType = m.scoring_type || 'points';

        let display, totalA, totalB;
        if (scoringType === 'binary') {
            totalA = ''; totalB = '';
            display = done ? `${winA ? na : nb} won` : (live ? 'In progress' : 'Not started');
        } else if (scoringType === 'sets') {
            const ordered = [...scores].sort((a, b) => a.period - b.period);
            let setsWonA = 0, setsWonB = 0;
            ordered.forEach(s => { if (s.score_a > s.score_b) setsWonA++; else if (s.score_b > s.score_a) setsWonB++; });
            totalA = setsWonA; totalB = setsWonB;
            display = `${setsWonA} – ${setsWonB} sets`;
            setsDataCache[matchId] = {
                setsWonA, setsWonB,
                currentSet: ordered.length ? { set: ordered[ordered.length - 1].period, a: ordered[ordered.length - 1].score_a, b: ordered[ordered.length - 1].score_b } : null
            };
        } else {
            totalA = fmtScore(result?.total_score_a ?? scores.reduce((s, r) => s + (r.score_a || 0), 0), m.sport_name);
            totalB = fmtScore(result?.total_score_b ?? scores.reduce((s, r) => s + (r.score_b || 0), 0), m.sport_name);
            display = result?.final_score_display || `${totalA} – ${totalB}`;
        }

        const avatarA = logoA
            ? `<div class="modal-dept-avatar" style="background:${colorA}"><img src="${esc(logoA)}" alt=""></div>`
            : `<div class="modal-dept-avatar" style="background:${colorA}">${initials(na)}</div>`;
        const avatarB = logoB
            ? `<div class="modal-dept-avatar" style="background:${colorB}"><img src="${esc(logoB)}" alt=""></div>`
            : `<div class="modal-dept-avatar" style="background:${colorB}">${initials(nb)}</div>`;

        let breakdownHTML = '';
        if (scoringType !== 'binary') {
            const periodLabel = scoringType === 'sets' ? 'Set' : 'Period';
            const periodRows = scores.length ? scores.map(s => {
                const wA = s.score_a > s.score_b;
                const wB = s.score_b > s.score_a;
                return `<tr>
          <td style="color:var(--muted2)">${esc(s.period_label || periodLabel + ' ' + s.period)}</td>
          <td class="${wA ? 'winner-score-cell' : ''}">${fmtScore(s.score_a, m.sport_name)}</td>
          <td class="${wB ? 'winner-score-cell' : ''}">${fmtScore(s.score_b, m.sport_name)}</td>
        </tr>`;
            }).join('') : `<tr><td colspan="3" style="text-align:center;color:var(--muted2);padding:1rem">No ${periodLabel.toLowerCase()} scores yet — scores will appear live</td></tr>`;
            breakdownHTML = `<div class="modal-breakdown">
        <div class="modal-breakdown-title">${periodLabel} Breakdown ${live ? '· live' : ''}</div>
        <table class="period-table">
          <thead><tr><th>${periodLabel}</th><th>${na}</th><th>${nb}</th></tr></thead>
          <tbody>${periodRows}</tbody>
          ${scores.length ? `<tfoot><tr class="total-row"><td>Total</td><td class="${winA ? 'winner-score-cell' : ''}">${totalA}</td><td class="${winB ? 'winner-score-cell' : ''}">${totalB}</td></tr></tfoot>` : ''}
        </table>
      </div>`;
        }

        body.innerHTML = `
      <div class="modal-header">
        <div class="modal-sport">${sportIcon(m.sport_name)} ${esc(m.sport_name || 'Sport')} ${statusBadgeHTML(m.status)}</div>
        <div class="modal-title">${na} vs ${nb}</div>
      </div>
      ${live ? `<div class="modal-live-pulse"><span class="live-dot"></span>Live — scores update automatically</div>` : ''}
      <div class="modal-teams">
        <div class="modal-team">
          <div style="position:relative">${avatarA}${winA ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
          <div class="modal-dept-name${winA ? ' winner' : ''}">${na}</div>
        </div>
        <div class="modal-final-score">
          <div class="modal-score-big" style="${scoringType === 'binary' ? 'font-size:22px' : ''}">${display}</div>
          <div class="modal-score-label">${done ? 'Final Result' : (live ? 'Current Score' : 'Not started')}</div>
        </div>
        <div class="modal-team">
          <div style="position:relative">${avatarB}${winB ? `<div class="winner-crown">${I.crown}</div>` : ''}</div>
          <div class="modal-dept-name${winB ? ' winner' : ''}">${nb}</div>
        </div>
      </div>
      ${breakdownHTML}
      <div class="modal-meta">
        ${m.venue_name ? `<span class="modal-meta-item">${I.pin} ${esc(m.venue_name)}</span>` : ''}
        ${m.scheduled_time ? `<span class="modal-meta-item">${I.clock} ${fmtTime(m.scheduled_time)}</span>` : ''}
        ${m.scheduled_date ? `<span class="modal-meta-item">${I.calendar} ${fmtDate(m.scheduled_date)}</span>` : ''}
        ${m.referee_name ? `<span class="modal-meta-item">👤 ${esc(m.referee_name)}</span>` : ''}
      </div>`;

        if (done && modalRefreshTimer) { clearInterval(modalRefreshTimer); modalRefreshTimer = null; }
    } catch {
        if (!silent) {
            const m = allMatches.find(x => x.id === matchId || String(x.id) === String(matchId));
            if (m && !isBinary(m)) {
                const na = esc(m.dept_a_name || 'TBD');
                const nb = esc(m.dept_b_name || 'TBD');
                const sa = m.total_score_a ?? m.live_score_a ?? 0;
                const sb = m.total_score_b ?? m.live_score_b ?? 0;
                body.innerHTML = `<div style="padding:1rem 0">
          <div class="modal-sport">${sportIcon(m.sport_name)} ${esc(m.sport_name || '')} ${statusBadgeHTML(m.status)}</div>
          <div class="modal-title" style="margin:8px 0 1rem">${na} vs ${nb}</div>
          <div class="modal-final-score"><div class="modal-score-big">${sa} – ${sb}</div>
          <div class="modal-score-label">${m.status === 'ongoing' ? 'Live score' : 'Score'}</div></div>
        </div>`;
            } else {
                body.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--muted2)">Could not load match details</div>`;
            }
        }
    }
}

function refreshOpenModalIfNeeded() {
    if (openModalMatchId) loadAndRenderModal(openModalMatchId, true);
}

async function openMatchModal(matchId) {
    const fromList = allMatches.find(x => x.id === matchId || String(x.id) === String(matchId));
    if (fromList && isBinary(fromList)) return;

    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    openModalMatchId = matchId;
    joinMatchRoom(matchId);
    await loadAndRenderModal(matchId, false);
    clearInterval(modalRefreshTimer);
    if (fromList && fromList.status === 'ongoing') {
        modalRefreshTimer = setInterval(() => loadAndRenderModal(matchId, true), MODAL_POLL_MS);
    }
}

function closeModal() {
    if (openModalMatchId) leaveMatchRoom(openModalMatchId);
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    openModalMatchId = null;
    clearInterval(modalRefreshTimer);
    modalRefreshTimer = null;
}

function closeModalOnBg(e) {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
}

/* ── Real-time handlers ── */
function onScoreUpdate(data) {
    if (!data || data.match_id == null) return;
    const idx = allMatches.findIndex(m => m.id === data.match_id || String(m.id) === String(data.match_id));
    if (idx >= 0) {
        allMatches[idx].live_score_a = data.total_a;
        allMatches[idx].live_score_b = data.total_b;
        allMatches[idx].total_score_a = data.total_a;
        allMatches[idx].total_score_b = data.total_b;
        allMatches[idx].live_total_a = data.total_a;
        allMatches[idx].live_total_b = data.total_b;
    }
    applyLiveScoreToDOM(data.match_id, data.total_a, data.total_b, data.match?.sport_name);
    if (isSets({ scoring_type: 'sets', id: data.match_id }) || setsDataCache[data.match_id]) {
        loadSetsData(data.match_id, true).then(() => renderMatches());
    }
    updateTicker();
    if (openModalMatchId && String(openModalMatchId) === String(data.match_id)) {
        refreshOpenModalIfNeeded();
    }
}

function onMatchStarted(data) {
    loadMatches();
}

function onMatchCompleted(data) {
    if (data?.match_id != null) {
        const idx = allMatches.findIndex(m => m.id === data.match_id || String(m.id) === String(data.match_id));
        if (idx >= 0) {
            allMatches[idx].status = 'completed';
            allMatches[idx].winner_side = data.winner_side;
            allMatches[idx].winner_department_id = data.winner_department_id;
            allMatches[idx].total_score_a = data.total_a;
            allMatches[idx].total_score_b = data.total_b;
        }
    }
    renderMatches();
    updateTicker();
    if (openModalMatchId && data && String(openModalMatchId) === String(data.match_id)) {
        refreshOpenModalIfNeeded();
    }
}

function onLiveTick(data) {
    if (!data) return;
    applyLiveScoreToDOM(data.match_id, data.total_a, data.total_b);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav('index');
    startClock();
    initSocket({
        onScoreUpdate,
        onMatchStarted,
        onMatchCompleted,
        onLiveTick,
        onConnect: () => loadMatches()
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    setTimeout(() => loadMatches(), 300);
    matchesRefreshTimer = setInterval(loadMatches, MATCHES_POLL_MS);

    checkChampionOnEntry();      // ← add: auto-shows once per session if a champion exists
    bindChampionSocketScores();  // ← add: live celebration if declared while page is open
});
/* ══════════════════════════════════════════════════════════
   CHAMPION PODIUM CELEBRATION (Scores page)
   Shows once per browser session per champion; replayable via button.
   ══════════════════════════════════════════════════════════ */
let podiumChampionData = null;
let podiumSessionKeyShown = null;

function podiumSessionKey(festId, championId) {
    return `sf_champion_seen_${festId || 'na'}_${championId || 'na'}`;
}

async function checkChampionOnEntry() {
    try {
        const r = await fetch(`${BASE}/api/leaderboard/overall-champion`);
        if (!r.ok) return;
        const j = await r.json();
        const d = j.data;
        if (!d || !d.is_final || !d.champion) {
            hideChampionFab();
            return;
        }

        podiumChampionData = d;
        showChampionFab();

        const key = podiumSessionKey(d.sport_fest_id, d.champion.id);
        if (sessionStorage.getItem(key)) return; // already seen this champion this session

        showChampionPodium(d);
        sessionStorage.setItem(key, '1');
        podiumSessionKeyShown = key;
    } catch { /* ignore — don't block the page over this */ }
}

function showChampionFab() {
    if (document.getElementById('champion-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'champion-fab';
    btn.type = 'button';
    btn.className = 'champion-fab';
    btn.innerHTML = `<span class="champion-fab-icon">${I.trophy || '🏆'}</span><span>Champion</span>`;
    btn.onclick = () => { if (podiumChampionData) showChampionPodium(podiumChampionData); };
    document.body.appendChild(btn);
    injectPodiumStyles();
}

function hideChampionFab() {
    document.getElementById('champion-fab')?.remove();
}

function showChampionPodium(data) {
    if (document.querySelector('.podium-overlay')) return; // already open
    injectPodiumStyles();

    const board = [...(data.leaderboard || [])].sort((a, b) => (a.rank || 99) - (b.rank || 99));
    const first = data.champion || board[0];
    const second = board.find(d => (d.rank || 0) === 2) || board[1];
    const third = board.find(d => (d.rank || 0) === 3) || board[2];

    const slot = (dept, place) => {
        if (!dept) return '';
        const col = dept.color || deptColor(dept.name);
        const img = dept.logo_url
            ? `<img src="${esc(dept.logo_url)}" class="podium-avatar" alt="${esc(dept.name)}">`
            : `<div class="podium-avatar podium-avatar-initials" style="background:${col}">${initials(dept.name)}</div>`;
        return `
        <div class="podium-slot podium-slot-${place}" style="--p-color:${col}">
            <div class="podium-rank-badge">${place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}</div>
            ${img}
            <div class="podium-name">${esc(dept.name)}</div>
            <div class="podium-pts">${dept.total_points || 0} pts</div>
            <div class="podium-pillar podium-pillar-${place}"></div>
        </div>`;
    };

    const overlay = document.createElement('div');
    overlay.className = 'podium-overlay';
    overlay.innerHTML = `
        <div class="podium-modal">
            <button class="podium-close" onclick="closeChampionPodium()" aria-label="Close">×</button>
            <div class="podium-eyebrow">${I.trophy || '🏆'} Sport Fest Overall Champion</div>
            <div class="podium-stage">
                ${slot(second, 2)}
                ${slot(first, 1)}
                ${slot(third, 3)}
            </div>
            <div class="podium-sub">${esc(data.message || '')}</div>
        </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => overlay.classList.add('open'));

    // Staggered reveal: 3rd -> 2nd -> 1st
    const s3 = overlay.querySelector('.podium-slot-3');
    const s2 = overlay.querySelector('.podium-slot-2');
    const s1 = overlay.querySelector('.podium-slot-1');
    [s3, s2, s1].forEach(s => s && s.classList.remove('reveal'));

    setTimeout(() => s3 && s3.classList.add('reveal'), 250);
    setTimeout(() => s2 && s2.classList.add('reveal'), 700);
    setTimeout(() => {
        s1 && s1.classList.add('reveal');
        firePodiumConfetti(first?.color || deptColor(first?.name || ''));
    }, 1200);
}

function closeChampionPodium() {
    const overlay = document.querySelector('.podium-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 300);
}

function firePodiumConfetti(color) {
    if (typeof confetti !== 'function') return;
    const col = color || '#f59e0b';
    const base = { particleCount: 150, spread: 100, startVelocity: 55, colors: [col, '#ffffff', '#f59e0b'], zIndex: 950 };
    confetti({ ...base, angle: 60, origin: { x: 0, y: 0.6 } });
    confetti({ ...base, angle: 120, origin: { x: 1, y: 0.6 } });
    setTimeout(() => confetti({ ...base, particleCount: 90, angle: 90, origin: { x: 0.5, y: 0.35 } }), 300);
}

function bindChampionSocketScores() {
    if (typeof socket === 'undefined' || !socket) {
        setTimeout(bindChampionSocketScores, 500);
        return;
    }
    socket.on('champion:declared', () => {
        // A champion was just declared while this tab is open — re-check and celebrate live.
        checkChampionOnEntry();
    });
}

function injectPodiumStyles() {
    if (document.getElementById('champion-podium-styles')) return;
    const style = document.createElement('style');
    style.id = 'champion-podium-styles';
    style.textContent = `
    .champion-fab{position:fixed;right:18px;
  bottom:calc(var(--nav-h) + var(--safe-bottom) + 14px);
  z-index:400;
  display:flex;align-items:center;gap:7px;padding:11px 16px;border-radius:100px;border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--gold),#d97706);color:#0a0c0e;font-family:var(--font-head);
  font-weight:800;font-size:13px;letter-spacing:.3px;box-shadow:0 8px 24px rgba(245,158,11,.4);
  transition:transform .15s}
.champion-fab:hover{transform:translateY(-2px)}
.champion-fab-icon{font-size:15px}
@media(min-width:1024px){.champion-fab{bottom:18px}}

    .podium-overlay{position:fixed;inset:0;z-index:900;background:rgba(5,6,7,.9);backdrop-filter:blur(10px);
      display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;
      transition:opacity .3s ease,visibility .3s ease;padding:1rem}
    .podium-overlay.open{opacity:1;visibility:visible}
    .podium-modal{position:relative;max-width:520px;width:100%;text-align:center;
      background:radial-gradient(circle at 50% 0%, rgba(245,158,11,.14), #0a0c0e 65%);
      border:1px solid rgba(245,158,11,.35);border-radius:26px;padding:2.25rem 1.5rem 1.75rem;
      box-shadow:0 30px 80px rgba(0,0,0,.6);transform:scale(.9) translateY(15px);
      transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
    .podium-overlay.open .podium-modal{transform:scale(1) translateY(0)}
    .podium-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;
      border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:16px;
      cursor:pointer;display:flex;align-items:center;justify-content:center}
    .podium-eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
      color:var(--gold);margin-bottom:1.5rem}
    .podium-stage{display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-bottom:1rem}
    .podium-slot{flex:1;max-width:150px;display:flex;flex-direction:column;align-items:center;
      opacity:0;transform:translateY(24px) scale(.85);transition:opacity .45s ease,transform .45s cubic-bezier(.34,1.56,.64,1)}
    .podium-slot.reveal{opacity:1;transform:translateY(0) scale(1)}
    .podium-rank-badge{font-family:var(--font-head);font-size:11px;font-weight:800;letter-spacing:.06em;
      color:var(--p-color);text-transform:uppercase;margin-bottom:6px}
    .podium-avatar{width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid var(--p-color);
      box-shadow:0 0 18px color-mix(in srgb, var(--p-color) 45%, transparent)}
    .podium-avatar-initials{display:flex;align-items:center;justify-content:center;font-family:var(--font-head);
      font-size:18px;font-weight:800;color:#fff}
    .podium-slot-1 .podium-avatar{width:78px;height:78px;border-width:4px}
    .podium-name{font-size:12px;font-weight:700;margin-top:8px;line-height:1.2;color:#fff}
    .podium-slot-1 .podium-name{font-size:15px;font-family:var(--font-head);text-transform:uppercase;color:var(--gold)}
    .podium-pts{font-family:var(--font-mono);font-size:10px;color:var(--muted2);margin-top:2px}
    .podium-pillar{width:100%;margin-top:10px;border-radius:8px 8px 0 0;
      background:linear-gradient(180deg, color-mix(in srgb, var(--p-color) 35%, transparent), transparent)}
    .podium-pillar-1{height:64px;background:linear-gradient(180deg, rgba(245,158,11,.3), rgba(245,158,11,.05))}
    .podium-pillar-2{height:44px}
    .podium-pillar-3{height:30px}
    .podium-sub{font-size:12px;color:var(--muted2);margin-top:.5rem}
  `;
    document.head.appendChild(style);
}