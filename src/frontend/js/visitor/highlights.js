/** Highlights — completed match results */
let allMatches = [];
const setsDataCache = {};

async function loadSetsData(matchId) {
    if (setsDataCache[matchId]) return setsDataCache[matchId];
    try {
        const r = await fetch(`${BASE}/api/matches/${matchId}/scoreboard`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        const scores = j.data?.scores || [];
        let setsWonA = 0, setsWonB = 0;
        scores.forEach(s => {
            if (s.score_a > s.score_b) setsWonA++;
            else if (s.score_b > s.score_a) setsWonB++;
        });
        setsDataCache[matchId] = { setsWonA, setsWonB };
        return setsDataCache[matchId];
    } catch {
        return { setsWonA: 0, setsWonB: 0 };
    }
}

async function renderHighlights() {
    const el = document.getElementById('highlights-container');
    if (!el) return;
    const done = allMatches.filter(m => m.status === 'completed');
    if (!done.length) {
        el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.star}</span><div class="empty-title">No completed matches yet</div><div class="empty-sub">Finals and results will show here</div></div>`;
        return;
    }
    for (const m of done) {
        if (isSets(m)) await loadSetsData(m.id);
    }
    el.innerHTML = done.slice().reverse().slice(0, 30).map(m => {
        const na = esc(m.dept_a_name || m.dept_a || '?');
        const nb = esc(m.dept_b_name || m.dept_b || '?');
        const sa = fmtScore(m.total_score_a, m.sport_name);
        const sb = fmtScore(m.total_score_b, m.sport_name);
        const winnerRaw = m.winner_side === 'a' ? (m.dept_a_name || m.dept_a)
            : m.winner_side === 'b' ? (m.dept_b_name || m.dept_b)
                : null;
        const winner = winnerRaw ? esc(winnerRaw) : null;

        let scoreLabel;
        let scoreClass = 'hl-score';
        let descLine;

        if (isBinary(m)) {
            // Short badge only on the right — full name stays in the body
            scoreLabel = winner ? 'WIN' : (m.winner_side === 'draw' ? 'DRAW' : 'FINAL');
            scoreClass = 'hl-score hl-binary';
            descLine = winner
                ? `<strong>${winner}</strong> wins`
                : (m.winner_side === 'draw' ? 'Match drawn' : 'Final result');
        } else if (isSets(m)) {
            const sd = setsDataCache[m.id];
            scoreLabel = sd ? `${sd.setsWonA}–${sd.setsWonB}` : (m.final_score_display || `${sa}–${sb}`);
            descLine = winner ? `<strong>${winner}</strong> wins · ${scoreLabel} sets` : `Final: ${scoreLabel} sets`;
        } else if (isFFA(m)) {
            scoreLabel = 'FFA';
            descLine = m.final_score_display || 'Free-for-All complete';
        } else {
            scoreLabel = m.final_score_display || `${sa}–${sb}`;
            descLine = winner ? `<strong>${winner}</strong> wins · ${scoreLabel}` : `Final: ${scoreLabel}`;
        }

        const title = isFFA(m)
            ? `${esc(m.sport_name || 'FFA')} — Free-for-All`
            : `${na} vs ${nb}`;

        return `<div class="highlight-card">
      <div class="hl-icon">${sportIcon(m.sport_name)}</div>
      <div class="hl-body">
        <div class="hl-title">${title}</div>
        <div class="hl-desc">${descLine}</div>
        <div class="hl-sub">${esc(m.sport_name || '')}${m.tournament_name ? ' · ' + esc(m.tournament_name) : ''}${m.venue_name ? ' · ' + esc(m.venue_name) : ''}</div>
      </div>
      <div class="${scoreClass}" title="${esc(String(scoreLabel))}">${scoreLabel}</div>
    </div>`;
    }).join('');
}

async function loadMatches() {
    try {
        const r = await fetch(`${BASE}/api/matches`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        allMatches = j.data || [];
        await renderHighlights();
    } catch {
        const el = document.getElementById('highlights-container');
        if (el) el.innerHTML = `<div class="empty-state"><span class="empty-icon">${I.star}</span><div class="empty-title">Could not load highlights</div></div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav('highlights');
    startClock();
    initSocket({ onMatchCompleted: () => loadMatches() });
    loadMatches();
    setInterval(loadMatches, MATCHES_POLL_MS);
});