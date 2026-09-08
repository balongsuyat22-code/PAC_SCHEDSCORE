/** Standings / Leaderboard page */
let allLbData = [];
let lbRefreshTimer = null;

function renderLeaderboard() {
    const el = document.getElementById('lb-container');
    if (!el) return;
    const data = allLbData;
    if (!data.length) {
        el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.trophy}</span><div class="empty-title">No standings yet</div><div class="empty-sub">Points appear as tournaments finish</div></div>`;
        return;
    }
    const rankLabel = n => {
        if (n === 1) return `<div class="rank-badge rank-1">1st</div>`;
        if (n === 2) return `<div class="rank-badge rank-2">2nd</div>`;
        if (n === 3) return `<div class="rank-badge rank-3">3rd</div>`;
        return `<div class="rank-badge rank-other">${n}</div>`;
    };
    const topClass = n => n === 1 ? 'top1' : n === 2 ? 'top2' : n === 3 ? 'top3' : '';
    el.innerHTML = `<div class="lb-table">
    <div class="lb-header"><div>#</div><div>Department</div><div style="text-align:center">Medals</div><div style="text-align:right">Points</div></div>
    ${data.map((d, i) => {
        const rank = d.rank || i + 1;
        const previous = data[i - 1];
        const divisionHeading = d.division && (!previous || previous.division !== d.division)
            ? `<div class="lb-division-heading">${esc(String(d.division).replace(/_/g, ' '))}</div>`
            : '';
        const col = d.color || deptColor(d.name);
        const logoHtml = d.logo_url
            ? `<div class="lb-dot" style="background:${col}"><img src="${esc(d.logo_url)}" alt="${esc(d.name)}"></div>`
            : `<div class="lb-dot" style="background:${col}">${initials(d.name)}</div>`;
        return `${divisionHeading}<div class="lb-row ${topClass(rank)}">
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
            showWinnerBanner(j.data.champion, j.data.champions || []);

            const c = j.data.champion;
            const key = 'champ_confetti_' + (c.department_id || c.id || c.name);
            if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.fireChampionConfetti?.(c.color || deptColor(c.name));
            }
        } else if (j.data && j.data.current_leader && !j.data.is_final) {
            showLeaderBanner(j.data.current_leader, j.data.message);
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
    if (!container || container.querySelector('.winner-banner')) return;

    const imgHtml = champion.logo_url
        ? `<img src="${esc(champion.logo_url)}" class="wb-dept-img" alt="${esc(champion.name)}">`
        : `<div class="wb-dept-initials" style="background:${champion.color || deptColor(champion.name)}">${initials(champion.name)}</div>`;

    const banner = document.createElement('div');
    banner.className = 'winner-banner';
    const championNames = champions.length > 1
        ? champions.map(c => `${esc(String(c.division || '').replace(/_/g, ' '))}: ${esc(c.name)}`).join(' · ')
        : esc(champion.name);
    banner.innerHTML = `<div class="wb-trophy">${I.trophy}</div>${imgHtml}<div class="wb-body">
            <div class="wb-label">${champions.length > 1 ? 'Division Champions' : 'Overall Champion'}</div>
            <div class="wb-name">${championNames}</div>
      <div class="wb-sub">${champion.total_points || 0} pts · ${champion.gold_medals || 0} Gold · ${champion.silver_medals || 0} Silver · ${champion.bronze_medals || 0} Bronze</div>
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
        onLeaderboardChanged: () => loadLeaderboard(),
        onMatchCompleted: () => loadLeaderboard()
    });
    bindChampionSocket();
    loadLeaderboard();
    lbRefreshTimer = setInterval(loadLeaderboard, LEADERBOARD_POLL_MS);
});