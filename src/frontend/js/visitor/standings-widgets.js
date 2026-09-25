/**
 * Live Standings sidebar widget — Scores page only (#live-standings-widget).
 * Deliberately independent of scores.js: it only needs to exist above
 * ~1300px where there's spare width next to the match board, so it just
 * polls the same /api/leaderboard endpoint standings.js uses rather than
 * hooking into scores.js's own (already-busy) socket connection.
 */
(function () {
    'use strict';

    async function loadMiniStandings() {
        const el = document.getElementById('live-standings-body');
        if (!el) return; // widget not present on this page

        try {
            const r = await fetch(`${BASE}/api/leaderboard`);
            if (!r.ok) throw new Error();
            const j = await r.json();
            const data = (j.data || []).slice(0, 5);

            if (!data.length) {
                el.innerHTML = `<div class="side-panel-empty">Standings will appear once matches are scored.</div>`;
                return;
            }

            const rankClass = n => n === 1 ? 'rank-1' : n === 2 ? 'rank-2' : n === 3 ? 'rank-3' : 'rank-other';

            el.innerHTML = data.map((d, i) => {
                const rank = d.rank || i + 1;
                const col = d.color || deptColor(d.name);
                const logo = d.logo_url
                    ? `<div class="lb-dot" style="background:${col}"><img src="${esc(d.logo_url)}" alt=""></div>`
                    : `<div class="lb-dot" style="background:${col}">${initials(d.name)}</div>`;
                return `<div class="mini-lb-row">
          <div class="rank-badge ${rankClass(rank)}">${rank}</div>
          ${logo}
          <div class="mini-lb-name">${esc(d.name)}</div>
          <div class="mini-lb-pts">${d.total_points || 0}</div>
        </div>`;
            }).join('');
        } catch {
            el.innerHTML = `<div class="side-panel-empty">Standings unavailable.</div>`;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('live-standings-widget')) return;
        loadMiniStandings();
        setInterval(loadMiniStandings, 20000);
    });
})();