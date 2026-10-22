/** Standings / Leaderboard page */
let allLbData = [];
let lbRefreshTimer = null;
let currentLbDivision = 'all';

function buildDivisionFilters() {
    const wrap = document.getElementById('lb-division-filters');
    if (!wrap) return;
    const divisions = [...new Set(allLbData.map(d => d.division).filter(Boolean))].sort();
    // Only one (or zero) divisions in the data — nothing to disambiguate.
    if (divisions.length < 2) {
        wrap.innerHTML = '';
        wrap.style.display = 'none';
        currentLbDivision = 'all';
        return;
    }
    wrap.style.display = '';
    let html = `<button type="button" class="filter-chip ${currentLbDivision === 'all' ? 'active' : ''}"
      onclick="filterLbByDivision('all', this)">All Divisions</button>`;
    divisions.forEach(d => {
        html += `<button type="button" class="filter-chip ${currentLbDivision === d ? 'active' : ''}"
      onclick="filterLbByDivision('${d}', this)">${esc(prettyDivision(d))}</button>`;
    });
    wrap.innerHTML = html;
}

function filterLbByDivision(division, el) {
    currentLbDivision = division;
    document.querySelectorAll('#lb-division-filters .filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderLeaderboard();
    renderChampionBanner();
}
window.filterLbByDivision = filterLbByDivision;

function renderLeaderboard() {
    const el = document.getElementById('lb-container');
    if (!el) return;
    const data = currentLbDivision === 'all'
        ? allLbData
        : allLbData.filter(d => (d.division || '') === currentLbDivision);
    if (!data.length) {
        el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.trophy}</span><div class="empty-title">No standings yet</div><div class="empty-sub">Points appear as tournaments finish</div></div>`;
        return;
    }
    const divisions = [...new Set(data.map(d => d.division).filter(Boolean))].sort();
    const groups = currentLbDivision === 'all' && divisions.length > 1
        ? divisions.map(division => ({
            division,
            rows: data.filter(d => d.division === division),
        }))
        : [{ division: currentLbDivision === 'all' ? divisions[0] : currentLbDivision, rows: data }];
    const rankLabel = n => {
        if (n === 1) return `<div class="rank-badge rank-1">${n}</div>`;
        if (n === 2) return `<div class="rank-badge rank-2">${n}</div>`;
        if (n === 3) return `<div class="rank-badge rank-3">${n}</div>`;
        return `<div class="rank-badge rank-other">${n}</div>`;
    };
    const topClass = n => n === 1 ? 'top1' : n === 2 ? 'top2' : n === 3 ? 'top3' : '';
    const renderGroup = ({ division, rows }) => `${divisions.length > 1
        ? `<div class="lb-division-heading">${esc(prettyDivision(division))}</div>`
        : ''}${podiumHtml(rows)}<div class="lb-table">
    <div class="lb-header"><div>#</div><div>Department</div><div style="text-align:center">Medals</div><div style="text-align:right">Points</div></div>
    ${rows.map((d, i) => {
        const rank = i + 1;
        const col = d.color || deptColor(d.name);
        const logoHtml = d.logo_url
            ? `<div class="lb-dot" style="background:${col}"><img src="${esc(d.logo_url)}" alt="${esc(d.name)}"></div>`
            : `<div class="lb-dot" style="background:${col}">${initials(d.name)}</div>`;
        return `<div class="lb-row ${topClass(rank)}">
        ${rankLabel(rank)}
        <div class="lb-dept">${logoHtml}<div class="lb-name">${esc(d.name)}</div></div>
        <div class="lb-medals">
          <div class="medal-item"><div class="medal-icon mi-gold"></div><div class="medal-count">${d.gold_medals || 0}</div></div>
          <div class="medal-item"><div class="medal-icon mi-silver"></div><div class="medal-count">${d.silver_medals || 0}</div></div>
          <div class="medal-item"><div class="medal-icon mi-bronze"></div><div class="medal-count">${d.bronze_medals || 0}</div></div>
        </div>
        <div class="lb-pts"><span class="pts-num">${d.total_points || 0}</span><span class="pts-lbl">pts</span></div>
      </div>`;
    }).join('')}
  </div>`;
    el.innerHTML = groups.map(renderGroup).join('');
}

/** Top-3 podium shown above the table. Only meaningful for a single
 *  ranked list — skipped when "All Divisions" is mixing multiple
 *  divisions together, since there's no one real #1/#2/#3 across
 *  divisions that haven't been ranked against each other (the table's
 *  per-division headings already handle that case on their own). */
function podiumHtml(data) {
    const divisions = new Set(data.map(d => d.division).filter(Boolean));
    if (divisions.size > 1) return '';
    const top3 = data.slice(0, 3);
    if (top3.length < 2) return ''; // not enough for a podium to mean anything
    const place = (d, n) => {
        if (!d) return '';
        const col = d.color || deptColor(d.name);
        const avatar = d.logo_url
            ? `<img src="${esc(d.logo_url)}" alt="">`
            : initials(d.name);
        return `<div class="podium-place p${n}">
      <div class="podium-avatar" style="background:${col}">${avatar}</div>
      <div class="podium-name">${esc(d.name)}</div>
      <div class="podium-pts">${d.total_points || 0} pts</div>
      <div class="podium-step">${n}</div>
    </div>`;
    };
    return `<div class="podium">${place(top3[0], 1)}${place(top3[1], 2)}${place(top3[2], 3)}</div>`;
}


/** Last-known champion/leader state, cached so the banner can be redrawn
 *  (e.g. after a division-filter re-render, which rebuilds #lb-container
 *  from scratch) without re-hitting the API every time. */
let lastChampionState = null;

/** Re-applies the cached champion/leader banner onto the current
 *  #lb-container. Safe to call after any renderLeaderboard() re-render. */
function renderChampionBanner() {
    if (!lastChampionState) return;
    if (lastChampionState.type === 'final') {
        showWinnerBanner(lastChampionState.champion, lastChampionState.champions);
    } else if (lastChampionState.type === 'leader') {
        showLeaderBanner(lastChampionState.leader, lastChampionState.message);
    }
}

/** Checks whether a champion has already been declared (page-load / poll
 *  path) and shows either the persistent leader banner or the "final"
 *  winner banner + a one-time-per-session confetti burst. */
async function checkAndFireConfetti() {
    try {
        const r = await fetch(`${BASE}/api/leaderboard/overall-champion`);
        if (!r.ok) return;
        const j = await r.json();
        if (j.data && j.data.is_final && j.data.champion) {
            const champs = j.data.champions || [];
            lastChampionState = { type: 'final', champion: j.data.champion, champions: champs };
            const leaderBanner = document.getElementById('leader-banner');
            if (leaderBanner) leaderBanner.style.display = 'none';
            showWinnerBanner(j.data.champion, champs);

            const c = j.data.champion;
            const key = 'champ_confetti_' + (c.department_id || c.id || c.name);
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.fireChampionConfetti?.(c.color || deptColor(c.name), champs.length > 1 ? champs[1]?.color : undefined);
            }
        } else if (j.data && j.data.current_leader && !j.data.is_final) {
            lastChampionState = { type: 'leader', leader: j.data.current_leader, message: j.data.message };
            showLeaderBanner(j.data.current_leader, j.data.message);
        } else {
            lastChampionState = null;
        }
    } catch { /* ignore */ }
}

/** Small persistent "current leader" banner (season still in progress). */
function showLeaderBanner(c, message) {
    const banner = document.getElementById('leader-banner');
    if (!banner) return;
    const img = c.logo_url
        ? `<img src="${esc(c.logo_url)}" class="wb-dept-img" alt="">`
        : `<div class="wb-dept-initials" style="background:${c.color || deptColor(c.name)}">${initials(c.name)}</div>`;
    banner.innerHTML = `<div class="wb-trophy">${I.trophy}</div>${img}<div class="wb-body">
      <div class="wb-label">Current Leader</div>
      <div class="wb-name">${esc(c.name)}</div>
      <div class="wb-sub">${c.total_points || 0} pts · ${esc(message || '')}</div>
    </div>`;
    banner.style.display = '';
}

/** Persistent "Overall Champion" banner pinned above the standings table,
 *  with a button to re-open the full celebration modal on demand. */
function showWinnerBanner(champion, champions = []) {
    const container = document.getElementById('lb-container');
    if (!container) return;
    container.querySelector('.winner-banner')?.remove();

    const isDual = champions.length > 1;
    const avatarHtml = (c) => (c.logo_url
        ? `<img src="${esc(c.logo_url)}" class="wb-dept-img" alt="${esc(c.name)}">`
        : `<div class="wb-dept-initials" style="background:${c.color || deptColor(c.name)}">${initials(c.name)}</div>`);

    // Two champions -> two overlapping badges + a border/label gradient
    // blended from both department colors, instead of the flat gold theme.
    const imgHtml = isDual
        ? `<div class="wb-dept-stack">${avatarHtml(champions[0])}${avatarHtml(champions[1])}</div>`
        : avatarHtml(champion);

    const banner = document.createElement('div');
    banner.className = 'winner-banner' + (isDual ? ' wb-dual' : '');
    if (isDual) {
        banner.style.setProperty('--wb-color', champions[0].color || deptColor(champions[0].name));
        banner.style.setProperty('--wb-color-2', champions[1].color || deptColor(champions[1].name));
    }

    const championNames = isDual
        ? champions.map(c => `${esc(prettyDivision(c.division))}: ${esc(c.name)}`).join(' · ')
        : esc(champion.name);
    const subLine = isDual
        ? champions.map(c => `${esc(prettyDivision(c.division))} ${c.total_points || 0} pts`).join(' · ')
        : `${champion.total_points || 0} pts · ${champion.gold_medals || 0} Gold · ${champion.silver_medals || 0} Silver · ${champion.bronze_medals || 0} Bronze`;

    banner.innerHTML = `<div class="wb-trophy">${I.trophy}</div>${imgHtml}<div class="wb-body">
            <div class="wb-label">${isDual ? 'Division Champions' : 'Overall Champion'}</div>
            <div class="wb-name">${championNames}</div>
      <div class="wb-sub">${subLine}</div>
    </div>
    <button type="button" class="wb-view-btn" onclick="viewChampionCelebration()"
      style="margin-left:auto;background:var(--accent,#f59e0b);color:#000;border:none;border-radius:100px;
      padding:9px 16px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0">
      View
    </button>`;
    container.insertBefore(banner, container.firstChild);
}

/** Re-opens the full celebration modal on demand (e.g. tapping "View" on
 *  the banner after the live moment has passed). */
async function viewChampionCelebration() {
    try {
        const r = await fetch(`${BASE}/api/leaderboard/overall-champion`);
        const j = await r.json();
        const c = j.data?.champion;
        if (!c) return;
        window.showChampionCelebration?.({
            name: c.name,
            color: c.color || deptColor(c.name),
            logoUrl: c.logo_url,
            points: c.total_points,
            gold: c.gold_medals,
            silver: c.silver_medals,
            bronze: c.bronze_medals,
            top3: allLbData.slice(0, 3),
            champions: j.data?.champions || [],
        });
    } catch { /* ignore */ }
}

async function loadLeaderboard() {
    const el = document.getElementById('lb-container');
    try {
        const r = await fetch(`${BASE}/api/leaderboard`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        allLbData = j.data || [];
        buildDivisionFilters();
        renderLeaderboard();
        if (allLbData.length && allLbData[0].color) applyDynamicTheme(allLbData[0].color);
        checkAndFireConfetti();
        const ts = document.getElementById('refresh-ts');
        if (ts) ts.textContent = `Updated ${new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
        if (!allLbData.length && el) {
            el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.trophy}</span><div class="empty-title">Standings unavailable</div><div class="empty-sub">Check server connection</div></div>`;
        }
    }
}

function refreshLeaderboard(btn) {
    const icon = btn?.querySelector('.refresh-icon');
    if (icon) { icon.classList.add('spin'); setTimeout(() => icon.classList.remove('spin'), 500); }
    loadLeaderboard();
}

/* ── Live champion declaration (real-time, via socket) ──
   Fixed: this used to call showChampion()/openChampionModal(), which are
   only defined inside scores.js's private scope and don't exist on this
   page — any live "champion:declared" event here threw a ReferenceError
   and silently killed the celebration. Now it calls the shared
   showChampionCelebration() from config.js directly. */
function bindChampionSocket() {
    if (typeof socket === 'undefined' || !socket) {
        setTimeout(bindChampionSocket, 500); // socket not ready yet, retry
        return;
    }
    socket.on('champion:declared', (data) => {
        if (data?.champion) {
            const c = data.champion;
            lastChampionState = { type: 'final', champion: c, champions: data.champions || [] };
            const leaderBanner = document.getElementById('leader-banner');
            if (leaderBanner) leaderBanner.style.display = 'none';
            showWinnerBanner(c, data.champions || []);
            window.showChampionCelebration?.({
                name: c.name,
                color: c.color,
                logoUrl: c.logo_url,
                points: c.total_points,
                gold: c.gold_medals,
                silver: c.silver_medals,
                bronze: c.bronze_medals,
                top3: allLbData.slice(0, 3),
                champions: data.champions || [],
            });
        } else {
            loadLeaderboard();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav('standings');
    startClock();
    initSocket({
        onLeaderboardChanged: () => { loadLeaderboard(); loadTournamentChampions(); },
        onMatchCompleted: () => { loadLeaderboard(); loadTournamentChampions(); }
    });
    bindChampionSocket();
    loadLeaderboard();
    loadTournamentChampions();
    lbRefreshTimer = setInterval(loadLeaderboard, LEADERBOARD_POLL_MS);
});

/* ── Tournament Champions ──────────────────────────────────────────────
   Per-tournament gold medalist(s) — distinct from the overall Sport Fest
   champion above. Most tournaments have a single winner; a tournament
   whose bracket spans both divisions (ranked separately) can surface two
   champions side by side, same as the overall dual-champion banner. */
let allTcData = [];
let currentTcSport = 'all';

async function loadTournamentChampions() {
    const el = document.getElementById('tc-container');
    try {
        const r = await fetch(`${BASE}/api/leaderboard/tournament-champions`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        allTcData = j.data || [];
        buildTcSportFilters();
        renderTournamentChampions();
    } catch {
        if (!allTcData.length && el) {
            el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.trophy}</span><div class="empty-title">Champions unavailable</div><div class="empty-sub">Check server connection</div></div>`;
        }
    }
}

function refreshTournamentChampions(btn) {
    const icon = btn?.querySelector('.refresh-icon');
    if (icon) { icon.classList.add('spin'); setTimeout(() => icon.classList.remove('spin'), 500); }
    loadTournamentChampions();
}
window.refreshTournamentChampions = refreshTournamentChampions;

function buildTcSportFilters() {
    const wrap = document.getElementById('tc-sport-filters');
    if (!wrap) return;
    const sports = [...new Set(allTcData.map(t => t.sport_name).filter(Boolean))].sort();
    if (sports.length < 2) {
        wrap.innerHTML = '';
        wrap.style.display = 'none';
        currentTcSport = 'all';
        return;
    }
    wrap.style.display = '';
    let html = `<button type="button" class="filter-chip ${currentTcSport === 'all' ? 'active' : ''}"
      onclick="filterTcBySport('all', this)">All Sports</button>`;
    sports.forEach(s => {
        html += `<button type="button" class="filter-chip ${currentTcSport === s ? 'active' : ''}"
      onclick="filterTcBySport('${s.replace(/'/g, "\\'")}', this)">${esc(s)}</button>`;
    });
    wrap.innerHTML = html;
}

function filterTcBySport(sport, el) {
    currentTcSport = sport;
    document.querySelectorAll('#tc-sport-filters .filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderTournamentChampions();
}
window.filterTcBySport = filterTcBySport;

function tcChampionHtml(c) {
    const col = c.color || deptColor(c.name);
    const avatar = c.logo_url
        ? `<img src="${esc(c.logo_url)}" class="tc-champ-img" alt="${esc(c.name)}">`
        : `<div class="tc-champ-img tc-champ-initials" style="background:${col}">${initials(c.name)}</div>`;
    return `<div class="tc-champ" style="--tc-color:${col}">
        ${avatar}
        <div class="tc-champ-body">
          ${c.division ? `<div class="tc-champ-division">${esc(prettyDivision(c.division))}</div>` : ''}
          <div class="tc-champ-name">${esc(c.name)}</div>
          <div class="tc-champ-sub">${c.team_name ? `${esc(c.team_name)} · ` : ''}${Number(c.points || 0).toLocaleString()} pts</div>
        </div>
      </div>`;
}

function renderTournamentChampions() {
    const el = document.getElementById('tc-container');
    if (!el) return;
    const data = currentTcSport === 'all'
        ? allTcData
        : allTcData.filter(t => t.sport_name === currentTcSport);

    if (!data.length) {
        el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.trophy}</span><div class="empty-title">No champions yet</div><div class="empty-sub">Champions appear once a tournament is finalized</div></div>`;
        return;
    }

    el.innerHTML = `<div class="tc-grid">${data.map(t => {
        const isDual = t.champions.length > 1;
        return `<div class="tc-card${isDual ? ' tc-dual' : ''}">
        <div class="tc-card-head">
          <span class="tc-sport-icon">${t.sport_icon ? esc(t.sport_icon) : '🏅'}</span>
          <div>
            <div class="tc-sport-name">${esc(t.sport_name || 'Sport')}</div>
            <div class="tc-tournament-name">${esc(t.tournament_name || '')}</div>
          </div>
        </div>
        <div class="tc-champs">${t.champions.map(tcChampionHtml).join(isDual ? '<div class="tc-x">×</div>' : '')}</div>
      </div>`;
    }).join('')}</div>`;
}