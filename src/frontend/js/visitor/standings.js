/** Standings / Leaderboard page */
let allLbData = [];
let confettiFired = false;
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
}

async function checkAndFireConfetti() {
    if (confettiFired || typeof confetti === 'undefined') return;
    try {
        const r = await fetch(`${BASE}/api/leaderboard/overall-champion`);
        if (!r.ok) return;
        const j = await r.json();
        if (j.data && j.data.is_final && j.data.champion) fireConfetti(j.data.champion);
        else if (j.data && j.data.current_leader && !j.data.is_final) {
            const banner = document.getElementById('leader-banner');
            if (banner && j.data.current_leader) {
                const c = j.data.current_leader;
                const img = c.logo_url
                    ? `<img src="${esc(c.logo_url)}" class="wb-dept-img" alt="">`
                    : `<div class="wb-dept-initials" style="background:${c.color || deptColor(c.name)}">${initials(c.name)}</div>`;
                banner.innerHTML = `<div class="wb-trophy">${I.trophy}</div>${img}<div class="wb-body">
          <div class="wb-label">Current Leader</div>
          <div class="wb-name">${esc(c.name)}</div>
          <div class="wb-sub">${c.total_points || 0} pts · ${j.data.message || ''}</div>
        </div>`;
                banner.style.display = '';
            }
        }
    } catch { /* ignore */ }
}

function fireConfetti(champion) {
    confettiFired = true;
    const col = champion.color || '#22c55e';
    const cfg = { particleCount: 180, spread: 100, startVelocity: 55, colors: [col, '#ffffff', '#f59e0b', col + '88'], origin: { y: 0.55 } };
    confetti({ ...cfg, angle: 60, origin: { x: 0, y: 0.6 } });
    confetti({ ...cfg, angle: 120, origin: { x: 1, y: 0.6 } });
    setTimeout(() => confetti({ ...cfg, particleCount: 80, origin: { x: 0.5, y: 0.4 } }), 400);
    const container = document.getElementById('lb-container');
    if (!container) return;
    const imgHtml = champion.logo_url
        ? `<img src="${esc(champion.logo_url)}" class="wb-dept-img" alt="${esc(champion.name)}">`
        : `<div class="wb-dept-initials" style="background:${champion.color || deptColor(champion.name)}">${initials(champion.name)}</div>`;
    const banner = document.createElement('div');
    banner.className = 'winner-banner';
    banner.innerHTML = `<div class="wb-trophy">${I.trophy}</div>${imgHtml}<div class="wb-body"><div class="wb-label">Overall Champion</div><div class="wb-name">${esc(champion.name)}</div><div class="wb-sub">${champion.total_points || 0} pts · ${champion.gold_medals || 0} Gold · ${champion.silver_medals || 0} Silver · ${champion.bronze_medals || 0} Bronze</div></div>`;
    container.insertBefore(banner, container.firstChild);
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

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav('standings');
    startClock();
    initSocket({
        onLeaderboardChanged: () => loadLeaderboard(),
        onMatchCompleted: () => loadLeaderboard()
    });
    bindChampionSocket(); // ← add this line
    loadLeaderboard();
    lbRefreshTimer = setInterval(loadLeaderboard, LEADERBOARD_POLL_MS);
});

/* ── Champion celebration (full-screen, triggered live) ── */
let championModalShown = false;

function bindChampionSocket() {
    if (typeof socket === 'undefined' || !socket) {
        setTimeout(bindChampionSocket, 500); // socket not ready yet, retry
        return;
    }
    socket.on('champion:declared', (data) => {
        if (data?.champion) {
            championData = {
                department_id: data.champion.id,
                name: data.champion.name,
                points: data.champion.total_points,
                color: data.champion.color,
                logo_url: data.champion.logo_url,
            };
            showChampion(championData);
            // Full celebration overlay when declared live
            openChampionModal();
        } else {
            loadChampion();
        }
    });
}

function showChampionCelebration(champion, message) {
    if (championModalShown) return;
    championModalShown = true;
    injectChampionStyles();

    const col = champion.color || deptColor(champion.name);
    const imgHtml = champion.logo_url
        ? `<img src="${esc(champion.logo_url)}" class="cc-logo" alt="${esc(champion.name)}">`
        : `<div class="cc-logo cc-logo-initials" style="background:${col}">${initials(champion.name)}</div>`;

    const overlay = document.createElement('div');
    overlay.className = 'champion-overlay';
    overlay.innerHTML = `
      <div class="champion-modal" style="--cc-color:${col}">
        <button class="cc-close" onclick="closeChampionCelebration()" aria-label="Close">×</button>
        <div class="cc-trophy">${I.trophy}</div>
        ${imgHtml}
        <div class="cc-eyebrow">Sport Fest Overall Champion</div>
        <div class="cc-name">${esc(champion.name)}</div>
        <div class="cc-sub">${esc(message || `${champion.total_points || 0} points`)}</div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('open'));

    if (typeof confetti === 'function') {
        const base = { particleCount: 160, spread: 110, startVelocity: 60, colors: [col, '#ffffff', '#f59e0b'] };
        confetti({ ...base, angle: 60, origin: { x: 0, y: 0.65 } });
        confetti({ ...base, angle: 120, origin: { x: 1, y: 0.65 } });
        setTimeout(() => confetti({ ...base, particleCount: 100, angle: 90, origin: { x: 0.5, y: 0.3 } }), 350);
        setTimeout(() => confetti({ ...base, particleCount: 80, spread: 140, origin: { x: 0.5, y: 0.5 } }), 700);
    }
}

function closeChampionCelebration() {
    const overlay = document.querySelector('.champion-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 300);
}

function injectChampionStyles() {
    if (document.getElementById('champion-celebration-styles')) return;
    const style = document.createElement('style');
    style.id = 'champion-celebration-styles';
    style.textContent = `
    .champion-overlay{position:fixed;inset:0;z-index:1000;background:rgba(5,6,7,.88);backdrop-filter:blur(10px);
      display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;
      transition:opacity .35s ease,visibility .35s ease;padding:1.25rem}
    .champion-overlay.open{opacity:1;visibility:visible}
    .champion-modal{position:relative;max-width:420px;width:100%;text-align:center;
      background:radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--cc-color) 22%, #111417), #0a0c0e 70%);
      border:1px solid color-mix(in srgb, var(--cc-color) 55%, transparent);
      border-radius:28px;padding:2.5rem 1.75rem 2rem;
      box-shadow:0 30px 80px rgba(0,0,0,.6), 0 0 60px color-mix(in srgb, var(--cc-color) 35%, transparent);
      transform:scale(.85) translateY(20px);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
    .champion-overlay.open .champion-modal{transform:scale(1) translateY(0)}
    .cc-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;
      border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:18px;
      cursor:pointer;display:flex;align-items:center;justify-content:center}
    .cc-trophy{font-size:48px;margin-bottom:.5rem;filter:drop-shadow(0 0 14px var(--cc-color))}
    .cc-logo{width:88px;height:88px;border-radius:50%;object-fit:cover;margin:.5rem auto 1rem;
      border:3px solid var(--cc-color);box-shadow:0 0 24px color-mix(in srgb, var(--cc-color) 50%, transparent)}
    .cc-logo-initials{display:flex;align-items:center;justify-content:center;font-family:var(--font-head);
      font-size:28px;font-weight:800;color:#fff}
    .cc-eyebrow{font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
      color:var(--cc-color);margin-bottom:.4rem}
    .cc-name{font-family:var(--font-head);font-size:clamp(28px,7vw,40px);font-weight:900;text-transform:uppercase;
      color:#fff;line-height:1.05;text-shadow:0 0 20px color-mix(in srgb, var(--cc-color) 60%, transparent)}
    .cc-sub{font-size:13px;color:var(--muted2);margin-top:.6rem}`;
    document.head.appendChild(style);
}