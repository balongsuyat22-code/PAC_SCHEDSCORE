/**
 * MVP page — uses PUBLIC endpoints only (no /api/players which requires auth)
 * Tries: /api/leaderboard/overall-mvp, /api/leaderboard/top-scorers, /api/matches/mvps
 */
let mvpData = [];

async function fetchMVPs() {
    const endpoints = [
        `${BASE}/api/leaderboard/overall-mvp`,
        `${BASE}/api/leaderboard/top-scorers?limit=30`,
        `${BASE}/api/matches/mvps`
    ];
    for (const url of endpoints) {
        try {
            const r = await fetch(url);
            if (!r.ok) continue;
            const j = await r.json();
            const rows = j.data || [];
            if (rows.length) return normalizeMVP(rows);
        } catch { /* try next */ }
    }
    return [];
}

function normalizeMVP(rows) {
    return rows.map(r => ({
        id: r.player_id || r.id,
        name: r.player_name || r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
        sport: r.sport_name || r.sport || '',
        dept: r.department_name || r.dept_name || '',
        color: r.department_color || r.dept_color || deptColor(r.department_name || r.dept_name || ''),
        photo: r.photo_url || r.image_url || null,
        count: r.mvp_count || 1,
        last: r.last_awarded || r.awarded_at || null
    }));
}

function renderMVPs(list) {
    const el = document.getElementById('mvp-container');
    if (!el) return;
    if (!list.length) {
        el.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span class="empty-icon">${I.star}</span>
      <div class="empty-title">MVPs will be announced</div>
      <div class="empty-sub">Match MVPs appear here after officers record them when matches complete</div>
    </div>`;
        return;
    }
    el.innerHTML = list.map((p, i) => {
        const featured = i < 3;
        const imgHtml = p.photo
            ? `<img src="${esc(p.photo)}" class="mvp-photo" alt="${esc(p.name)}" onerror="this.outerHTML='<div class=mvp-initials style=background:${p.color}>${initials(p.name)}</div>'">`
            : `<div class="mvp-initials" style="background:${p.color}">${initials(p.name)}</div>`;
        return `<div class="mvp-card${featured ? ' featured' : ''}"
      data-name="${esc(p.name.toLowerCase())}"
      data-sport="${esc((p.sport || '').toLowerCase())}"
      data-dept="${esc((p.dept || '').toLowerCase())}">
      <div class="mvp-photo-wrap">${imgHtml}</div>
      <div class="mvp-name">${esc(p.name)}</div>
      <div class="mvp-sport">${esc(p.sport)}</div>
      <div class="mvp-dept">${esc(p.dept)}</div>
      ${p.count > 1 ? `<div class="mvp-count">${p.count}× MVP</div>` : ''}
    </div>`;
    }).join('');
}

function filterMVPs(q) {
    document.getElementById('mvp-search-clear')?.classList.toggle('visible', q.length > 0);
    const ql = q.toLowerCase();
    document.querySelectorAll('.mvp-card').forEach(c => {
        const hit = !ql || c.dataset.name.includes(ql) || c.dataset.sport.includes(ql) || c.dataset.dept.includes(ql);
        c.classList.toggle('hidden-by-search', !hit);
    });
}

function clearSearch() {
    const input = document.getElementById('mvp-search');
    if (input) input.value = '';
    filterMVPs('');
}

async function loadMVPs() {
    const el = document.getElementById('mvp-container');
    if (el) el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="live-dot" style="margin:0 auto 12px"></div><div class="empty-sub">Loading MVPs…</div></div>`;
    mvpData = await fetchMVPs();
    renderMVPs(mvpData);
}

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav('mvp');
    startClock();
    initSocket({ onMatchCompleted: () => loadMVPs() });
    loadMVPs();
});