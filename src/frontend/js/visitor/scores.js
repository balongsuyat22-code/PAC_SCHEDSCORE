/* ═══════════════════════════════════════════════════════════
   MATCH DETAIL MODAL — FFA / Binary / Sets / Points / Time
   ═══════════════════════════════════════════════════════════ */

const API_BASE = window.API_BASE || '/api'; // adjust if needed

// ── Open / Close ─────────────────────────────────────────────
async function openMatchModal(matchIdOrObj) {
    const body = document.getElementById('modal-body');
    const overlay = document.getElementById('modal-overlay');
    if (!body || !overlay) return;

    body.innerHTML = `
    <div class="empty-state" style="padding:2rem 1rem">
      <div class="live-dot" style="margin:0 auto 12px"></div>
      <div class="empty-sub">Loading match…</div>
    </div>`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    try {
        let match;
        if (typeof matchIdOrObj === 'object' && matchIdOrObj !== null) {
            match = matchIdOrObj;
            // Enrich if we only have a card-level object
            if (!match.scores && match.id) {
                const res = await fetch(`${API_BASE}/matches/${match.id}`);
                const json = await res.json();
                if (json.success) match = { ...match, ...json.data };
            }
        } else {
            const res = await fetch(`${API_BASE}/matches/${matchIdOrObj}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.message || 'Match not found');
            match = json.data;
        }

        // FFA detection
        const isFFA =
            match.tournament_format === 'free_for_all' ||
            match.bracket_side === 'ffa' ||
            match.bracket_position === 'FFA Event' ||
            match.format === 'free_for_all';

        if (isFFA) {
            body.innerHTML = await buildFFAModal(match);
        } else if (match.scoring_type === 'binary') {
            body.innerHTML = buildBinaryModal(match);
        } else if (match.scoring_type === 'sets' || match.sets_to_win) {
            body.innerHTML = buildSetsModal(match);
        } else {
            body.innerHTML = buildStandardModal(match); // points | time
        }
    } catch (err) {
        console.error(err);
        body.innerHTML = `
      <div class="empty-state" style="padding:2rem 1rem">
        <div class="empty-title">Couldn’t load match</div>
        <div class="empty-sub">${escapeHtml(err.message || 'Try again')}</div>
      </div>`;
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function closeModalOnBg(e) {
    if (e.target === e.currentTarget) closeModal();
}

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ── Helpers ──────────────────────────────────────────────────
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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

function deptAvatar(name, color, logoUrl, extraClass = '') {
    const bg = color || '#4b5563';
    if (logoUrl) {
        return `<div class="modal-dept-avatar ${extraClass}" style="background:${bg}">
      <img src="${escapeHtml(logoUrl)}" alt="" onerror="this.parentElement.textContent='${initials(name)}'">
    </div>`;
    }
    return `<div class="modal-dept-avatar ${extraClass}" style="background:${bg}">${initials(name)}</div>`;
}

function formatPill(scoringType, setsToWin) {
    if (scoringType === 'binary') return `<span class="format-pill binary">Win / Loss</span>`;
    if (scoringType === 'sets' || setsToWin) return `<span class="format-pill sets">Sets</span>`;
    if (scoringType === 'time') return `<span class="format-pill time">Time</span>`;
    return `<span class="format-pill points">Points</span>`;
}

function statusChip(status) {
    if (status === 'ongoing') {
        return `<div class="modal-live-pulse"><span class="live-dot"></span> Live</div>`;
    }
    if (status === 'completed') {
        return `<div class="modal-final-badge">Final</div>`;
    }
    if (status === 'scheduled' || status === 'pending') {
        return `<div class="modal-final-badge" style="background:var(--bg3);color:var(--muted2);border-color:var(--border)">Upcoming</div>`;
    }
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
        const t = match.scheduled_time ? ` · ${match.scheduled_time}` : '';
        items.push(`🗓 ${escapeHtml(match.scheduled_date)}${t}`);
    }
    if (match.referee_name) items.push(`👤 ${escapeHtml(match.referee_name)}`);
    if (match.tournament_name) items.push(`🏆 ${escapeHtml(match.tournament_name)}`);
    if (!items.length) return '';
    return `<div class="modal-meta">${items.map((i) => `<div class="modal-meta-item">${i}</div>`).join('')}</div>`;
}

function mvpBlock(result) {
    if (!result || !result.mvp_player_name) return '';
    return `
    <div class="modal-mvp">
      <div class="modal-mvp-icon">⭐</div>
      <div>
        <div class="modal-mvp-label">Match MVP</div>
        <div class="modal-mvp-name">${escapeHtml(result.mvp_player_name)}</div>
      </div>
    </div>`;
}

// ── FFA Modal ────────────────────────────────────────────────
async function buildFFAModal(match) {
    const tournamentId = match.tournament_id;
    let participants = [];
    let ffaScoring = match.ffa_scoring || match.ffa_scoring_type || 'points';

    try {
        const res = await fetch(`${API_BASE}/matches/ffa/${tournamentId}`);
        const json = await res.json();
        if (json.success && json.data) {
            participants = json.data.participants || [];
            ffaScoring = json.data.ffa_scoring || ffaScoring;
        }
    } catch (e) {
        console.warn('FFA results fetch failed', e);
    }

    // Sort by rank if present, else by result_value
    const sorted = [...participants].sort((a, b) => {
        if (a.rank_position != null && b.rank_position != null) {
            return a.rank_position - b.rank_position;
        }
        const va = a.ffa_result_value != null ? Number(a.ffa_result_value) : null;
        const vb = b.ffa_result_value != null ? Number(b.ffa_result_value) : null;
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return ffaScoring === 'time' ? va - vb : vb - va;
    });

    // Assign display ranks if missing
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
        } else {
            p._rank = p.rank_position;
        }
    });

    const top3 = sorted.slice(0, 3);
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd

    const podiumHtml =
        top3.length >= 1
            ? `<div class="modal-ffa-podium">
          ${[1, 0, 2]
                .map((idx) => {
                    const p = top3[idx];
                    if (!p) return '<div></div>';
                    const r = p._rank || idx + 1;
                    const cls = r === 1 ? 'gold' : r === 2 ? 'silver' : 'bronze';
                    const val =
                        p.ffa_result_value != null
                            ? Number(p.ffa_result_value).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                            })
                            : '—';
                    return `
                <div class="podium-slot ${cls}">
                  <div class="podium-rank">${r}</div>
                  <div class="podium-avatar" style="background:${p.department_color || '#4b5563'}">
                    ${p.department_logo
                            ? `<img src="${escapeHtml(p.department_logo)}" alt="">`
                            : initials(p.department_name)}
                  </div>
                  <div class="podium-name">${escapeHtml(p.department_name || '—')}</div>
                  <div class="podium-score">${val}</div>
                </div>`;
                })
                .join('')}
        </div>`
            : '';

    const listHtml = sorted
        .map((p) => {
            const r = p._rank || '—';
            const rankCls = r === 1 ? 'rank-1 top3' : r === 2 ? 'rank-2 top3' : r === 3 ? 'rank-3 top3' : '';
            const val =
                p.ffa_result_value != null
                    ? Number(p.ffa_result_value).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : '—';
            return `
        <div class="ffa-rank-row ${rankCls}">
          <div class="ffa-rank-num">${r}</div>
          <div class="ffa-rank-avatar" style="background:${p.department_color || '#4b5563'}">
            ${p.department_logo
                    ? `<img src="${escapeHtml(p.department_logo)}" alt="">`
                    : initials(p.department_name)}
          </div>
          <div class="ffa-rank-info">
            <div class="ffa-rank-name">${escapeHtml(p.department_name || '—')}</div>
          </div>
          <div class="ffa-rank-value">${val}</div>
        </div>`;
        })
        .join('');

    const scoringNote =
        ffaScoring === 'time'
            ? 'Lower time ranks higher'
            : 'Higher score ranks higher';

    return `
    <div class="modal-ffa">
      <div class="modal-header">
        <div class="modal-ffa-badge">FFA · Free For All</div>
        <div class="modal-ffa-title">${escapeHtml(match.sport_name || match.tournament_name || 'FFA Event')}</div>
        <div class="modal-ffa-sub">${escapeHtml(match.tournament_name || '')}</div>
      </div>

      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}

      ${podiumHtml}

      <div class="modal-breakdown-title">Full Standings</div>
      <div class="modal-ffa-list">
        ${listHtml || '<div class="empty-sub" style="padding:1rem;text-align:center">No results yet</div>'}
      </div>

      <div class="modal-ffa-scoring-note">${scoringNote}</div>
      ${metaRow(match)}
    </div>`;
}

// ── Binary Modal ─────────────────────────────────────────────
function buildBinaryModal(match) {
    const result = match.result || {};
    const winnerSide = result.winner_side || match.winner_side;
    const isDraw = winnerSide === 'draw';
    const aWon = winnerSide === 'a';
    const bWon = winnerSide === 'b';

    const nameA = match.dept_a_name || 'Side A';
    const nameB = match.dept_b_name || 'Side B';
    const winnerName = isDraw ? null : aWon ? nameA : nameB;

    const banner = isDraw
        ? `<div class="binary-result-banner binary-draw-banner">
         <div class="binary-result-label">Result</div>
         <div class="binary-result-name">Draw</div>
         <div class="binary-result-sub">No winner declared</div>
       </div>`
        : `<div class="binary-result-banner">
         <div class="binary-result-label">Winner</div>
         <div class="binary-result-name">${escapeHtml(winnerName || '—')}</div>
         <div class="binary-result-sub">${aWon ? 'Win — Side A' : 'Win — Side B'}${result.win_type ? ' · ' + escapeHtml(result.win_type) : ''}</div>
       </div>`;

    return `
    <div class="modal-binary">
      <div class="modal-header">
        <div class="modal-sport">
          ${formatPill('binary')}
          ${escapeHtml(match.sport_name || '')}
        </div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>

      ${statusChip(match.status)}

      <div class="modal-teams">
        <div class="modal-team">
          ${deptAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${aWon ? 'winner' : ''}">${escapeHtml(nameA)}</div>
        </div>
        <div class="binary-vs">vs</div>
        <div class="modal-team">
          ${deptAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>

      ${match.status === 'completed' || winnerSide ? banner : ''}
      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
}

// ── Sets Modal ───────────────────────────────────────────────
function buildSetsModal(match) {
    const scores = match.scores || [];
    const result = match.result || {};
    const nameA = match.dept_a_name || 'Side A';
    const nameB = match.dept_b_name || 'Side B';

    let setsA = 0;
    let setsB = 0;
    scores.forEach((s) => {
        if ((s.score_a || 0) > (s.score_b || 0)) setsA++;
        else if ((s.score_b || 0) > (s.score_a || 0)) setsB++;
    });

    // Prefer result totals if completed
    if (result.total_score_a != null) setsA = result.total_score_a;
    if (result.total_score_b != null) setsB = result.total_score_b;

    const aWon = match.status === 'completed' && setsA > setsB;
    const bWon = match.status === 'completed' && setsB > setsA;

    const setPills = scores
        .map((s, i) => {
            const a = s.score_a || 0;
            const b = s.score_b || 0;
            const aWin = a > b;
            const bWin = b > a;
            return `
        <div class="set-pill ${aWin || bWin ? 'won' : ''}">
          <div class="set-pill-label">${escapeHtml(s.period_label || 'Set ' + (s.period || i + 1))}</div>
          <div class="set-pill-val">${a}–${b}</div>
        </div>`;
        })
        .join('');

    const tableRows = scores
        .map((s, i) => {
            const a = s.score_a || 0;
            const b = s.score_b || 0;
            return `
        <tr>
          <td>${escapeHtml(s.period_label || 'Set ' + (s.period || i + 1))}</td>
          <td class="${a > b ? 'winner-score-cell' : ''}">${a}</td>
          <td class="${b > a ? 'winner-score-cell' : ''}">${b}</td>
        </tr>`;
        })
        .join('');

    return `
    <div class="modal-sets">
      <div class="modal-header">
        <div class="modal-sport">
          ${formatPill('sets', match.sets_to_win)}
          ${escapeHtml(match.sport_name || '')}
        </div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>

      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}

      <div class="modal-teams">
        <div class="modal-team">
          ${deptAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon ? 'is-winner' : '')}
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
          ${deptAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>

      ${setPills ? `<div class="set-score-summary">${setPills}</div>` : ''}

      ${scores.length
            ? `<div class="modal-breakdown">
               <div class="modal-breakdown-title">Set Breakdown</div>
               <table class="period-table">
                 <thead><tr><th>Set</th><th>${escapeHtml(nameA)}</th><th>${escapeHtml(nameB)}</th></tr></thead>
                 <tbody>
                   ${tableRows}
                   <tr class="total-row"><td>Sets</td><td>${setsA}</td><td>${setsB}</td></tr>
                 </tbody>
               </table>
             </div>`
            : ''
        }

      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
}

// ── Standard (Points / Time) Modal ───────────────────────────
function buildStandardModal(match) {
    const scores = match.scores || [];
    const result = match.result || {};
    const nameA = match.dept_a_name || 'Side A';
    const nameB = match.dept_b_name || 'Side B';
    const isTime = match.scoring_type === 'time';

    let totalA =
        result.total_score_a != null
            ? result.total_score_a
            : scores.reduce((s, r) => s + (Number(r.score_a) || 0), 0);
    let totalB =
        result.total_score_b != null
            ? result.total_score_b
            : scores.reduce((s, r) => s + (Number(r.score_b) || 0), 0);

    // Live totals from API if present
    if (match.live_total_a != null) totalA = match.live_total_a;
    if (match.live_total_b != null) totalB = match.live_total_b;
    if (match.total_a != null) totalA = match.total_a;
    if (match.total_b != null) totalB = match.total_b;

    const aWon =
        match.status === 'completed' &&
        (isTime ? totalA < totalB : totalA > totalB);
    const bWon =
        match.status === 'completed' &&
        (isTime ? totalB < totalA : totalB > totalA);

    const displayScore =
        result.final_score_display ||
        `${Number(totalA).toLocaleString()} – ${Number(totalB).toLocaleString()}`;

    const tableRows = scores
        .map((s, i) => {
            const a = Number(s.score_a) || 0;
            const b = Number(s.score_b) || 0;
            const aBetter = isTime ? a < b : a > b;
            const bBetter = isTime ? b < a : b > a;
            return `
        <tr>
          <td>${escapeHtml(s.period_label || 'Period ' + (s.period || i + 1))}</td>
          <td class="${aBetter ? 'winner-score-cell' : ''}">${a}</td>
          <td class="${bBetter ? 'winner-score-cell' : ''}">${b}</td>
        </tr>`;
        })
        .join('');

    return `
    <div class="modal-standard">
      <div class="modal-header">
        <div class="modal-sport">
          ${formatPill(match.scoring_type)}
          ${escapeHtml(match.sport_name || '')}
        </div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>

      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}

      <div class="modal-teams">
        <div class="modal-team">
          ${deptAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon ? 'is-winner' : '')}
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
          ${deptAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>

      ${scores.length
            ? `<div class="modal-breakdown">
               <div class="modal-breakdown-title">Period Breakdown</div>
               <table class="period-table">
                 <thead><tr><th>Period</th><th>${escapeHtml(nameA)}</th><th>${escapeHtml(nameB)}</th></tr></thead>
                 <tbody>
                   ${tableRows}
                   <tr class="total-row">
                     <td>Total</td>
                     <td class="${aWon ? 'winner-score-cell' : ''}">${Number(totalA).toLocaleString()}</td>
                     <td class="${bWon ? 'winner-score-cell' : ''}">${Number(totalB).toLocaleString()}</td>
                   </tr>
                 </tbody>
               </table>
             </div>`
            : match.status === 'completed'
                ? `<div style="text-align:center;margin-bottom:1rem;font-family:var(--font-mono);font-size:14px;color:var(--muted2)">${escapeHtml(displayScore)}</div>`
                : ''
        }

      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
}

// ── Wire card clicks (call once after matches render) ────────
function bindMatchCardClicks(containerSelector = '#matches-container') {
    const root = document.querySelector(containerSelector);
    if (!root) return;

    root.addEventListener('click', (e) => {
        const card = e.target.closest('[data-match-id]');
        if (!card) return;
        const id = card.getAttribute('data-match-id');
        if (id) openMatchModal(id);
    });
}

// Also support featured match
document.getElementById('featured-match-wrap')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-match-id]');
    if (card) openMatchModal(card.getAttribute('data-match-id'));
});
/* ═══════════════════════════════════════════════════════════
   MATCH DETAIL MODAL — FFA / Binary / Sets / Points / Time
   ═══════════════════════════════════════════════════════════ */

const API_BASE = window.API_BASE || '/api'; // adjust if needed

// ── Open / Close ─────────────────────────────────────────────
async function openMatchModal(matchIdOrObj) {
    const body = document.getElementById('modal-body');
    const overlay = document.getElementById('modal-overlay');
    if (!body || !overlay) return;

    body.innerHTML = `
    <div class="empty-state" style="padding:2rem 1rem">
      <div class="live-dot" style="margin:0 auto 12px"></div>
      <div class="empty-sub">Loading match…</div>
    </div>`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    try {
        let match;
        if (typeof matchIdOrObj === 'object' && matchIdOrObj !== null) {
            match = matchIdOrObj;
            // Enrich if we only have a card-level object
            if (!match.scores && match.id) {
                const res = await fetch(`${API_BASE}/matches/${match.id}`);
                const json = await res.json();
                if (json.success) match = { ...match, ...json.data };
            }
        } else {
            const res = await fetch(`${API_BASE}/matches/${matchIdOrObj}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.message || 'Match not found');
            match = json.data;
        }

        // FFA detection
        const isFFA =
            match.tournament_format === 'free_for_all' ||
            match.bracket_side === 'ffa' ||
            match.bracket_position === 'FFA Event' ||
            match.format === 'free_for_all';

        if (isFFA) {
            body.innerHTML = await buildFFAModal(match);
        } else if (match.scoring_type === 'binary') {
            body.innerHTML = buildBinaryModal(match);
        } else if (match.scoring_type === 'sets' || match.sets_to_win) {
            body.innerHTML = buildSetsModal(match);
        } else {
            body.innerHTML = buildStandardModal(match); // points | time
        }
    } catch (err) {
        console.error(err);
        body.innerHTML = `
      <div class="empty-state" style="padding:2rem 1rem">
        <div class="empty-title">Couldn’t load match</div>
        <div class="empty-sub">${escapeHtml(err.message || 'Try again')}</div>
      </div>`;
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function closeModalOnBg(e) {
    if (e.target === e.currentTarget) closeModal();
}

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ── Helpers ──────────────────────────────────────────────────
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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

function deptAvatar(name, color, logoUrl, extraClass = '') {
    const bg = color || '#4b5563';
    if (logoUrl) {
        return `<div class="modal-dept-avatar ${extraClass}" style="background:${bg}">
      <img src="${escapeHtml(logoUrl)}" alt="" onerror="this.parentElement.textContent='${initials(name)}'">
    </div>`;
    }
    return `<div class="modal-dept-avatar ${extraClass}" style="background:${bg}">${initials(name)}</div>`;
}

function formatPill(scoringType, setsToWin) {
    if (scoringType === 'binary') return `<span class="format-pill binary">Win / Loss</span>`;
    if (scoringType === 'sets' || setsToWin) return `<span class="format-pill sets">Sets</span>`;
    if (scoringType === 'time') return `<span class="format-pill time">Time</span>`;
    return `<span class="format-pill points">Points</span>`;
}

function statusChip(status) {
    if (status === 'ongoing') {
        return `<div class="modal-live-pulse"><span class="live-dot"></span> Live</div>`;
    }
    if (status === 'completed') {
        return `<div class="modal-final-badge">Final</div>`;
    }
    if (status === 'scheduled' || status === 'pending') {
        return `<div class="modal-final-badge" style="background:var(--bg3);color:var(--muted2);border-color:var(--border)">Upcoming</div>`;
    }
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
        const t = match.scheduled_time ? ` · ${match.scheduled_time}` : '';
        items.push(`🗓 ${escapeHtml(match.scheduled_date)}${t}`);
    }
    if (match.referee_name) items.push(`👤 ${escapeHtml(match.referee_name)}`);
    if (match.tournament_name) items.push(`🏆 ${escapeHtml(match.tournament_name)}`);
    if (!items.length) return '';
    return `<div class="modal-meta">${items.map((i) => `<div class="modal-meta-item">${i}</div>`).join('')}</div>`;
}

function mvpBlock(result) {
    if (!result || !result.mvp_player_name) return '';
    return `
    <div class="modal-mvp">
      <div class="modal-mvp-icon">⭐</div>
      <div>
        <div class="modal-mvp-label">Match MVP</div>
        <div class="modal-mvp-name">${escapeHtml(result.mvp_player_name)}</div>
      </div>
    </div>`;
}

// ── FFA Modal ────────────────────────────────────────────────
async function buildFFAModal(match) {
    const tournamentId = match.tournament_id;
    let participants = [];
    let ffaScoring = match.ffa_scoring || match.ffa_scoring_type || 'points';

    try {
        const res = await fetch(`${API_BASE}/matches/ffa/${tournamentId}`);
        const json = await res.json();
        if (json.success && json.data) {
            participants = json.data.participants || [];
            ffaScoring = json.data.ffa_scoring || ffaScoring;
        }
    } catch (e) {
        console.warn('FFA results fetch failed', e);
    }

    // Sort by rank if present, else by result_value
    const sorted = [...participants].sort((a, b) => {
        if (a.rank_position != null && b.rank_position != null) {
            return a.rank_position - b.rank_position;
        }
        const va = a.ffa_result_value != null ? Number(a.ffa_result_value) : null;
        const vb = b.ffa_result_value != null ? Number(b.ffa_result_value) : null;
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return ffaScoring === 'time' ? va - vb : vb - va;
    });

    // Assign display ranks if missing
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
        } else {
            p._rank = p.rank_position;
        }
    });

    const top3 = sorted.slice(0, 3);
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd

    const podiumHtml =
        top3.length >= 1
            ? `<div class="modal-ffa-podium">
          ${[1, 0, 2]
                .map((idx) => {
                    const p = top3[idx];
                    if (!p) return '<div></div>';
                    const r = p._rank || idx + 1;
                    const cls = r === 1 ? 'gold' : r === 2 ? 'silver' : 'bronze';
                    const val =
                        p.ffa_result_value != null
                            ? Number(p.ffa_result_value).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                            })
                            : '—';
                    return `
                <div class="podium-slot ${cls}">
                  <div class="podium-rank">${r}</div>
                  <div class="podium-avatar" style="background:${p.department_color || '#4b5563'}">
                    ${p.department_logo
                            ? `<img src="${escapeHtml(p.department_logo)}" alt="">`
                            : initials(p.department_name)}
                  </div>
                  <div class="podium-name">${escapeHtml(p.department_name || '—')}</div>
                  <div class="podium-score">${val}</div>
                </div>`;
                })
                .join('')}
        </div>`
            : '';

    const listHtml = sorted
        .map((p) => {
            const r = p._rank || '—';
            const rankCls = r === 1 ? 'rank-1 top3' : r === 2 ? 'rank-2 top3' : r === 3 ? 'rank-3 top3' : '';
            const val =
                p.ffa_result_value != null
                    ? Number(p.ffa_result_value).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : '—';
            return `
        <div class="ffa-rank-row ${rankCls}">
          <div class="ffa-rank-num">${r}</div>
          <div class="ffa-rank-avatar" style="background:${p.department_color || '#4b5563'}">
            ${p.department_logo
                    ? `<img src="${escapeHtml(p.department_logo)}" alt="">`
                    : initials(p.department_name)}
          </div>
          <div class="ffa-rank-info">
            <div class="ffa-rank-name">${escapeHtml(p.department_name || '—')}</div>
          </div>
          <div class="ffa-rank-value">${val}</div>
        </div>`;
        })
        .join('');

    const scoringNote =
        ffaScoring === 'time'
            ? 'Lower time ranks higher'
            : 'Higher score ranks higher';

    return `
    <div class="modal-ffa">
      <div class="modal-header">
        <div class="modal-ffa-badge">FFA · Free For All</div>
        <div class="modal-ffa-title">${escapeHtml(match.sport_name || match.tournament_name || 'FFA Event')}</div>
        <div class="modal-ffa-sub">${escapeHtml(match.tournament_name || '')}</div>
      </div>

      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}

      ${podiumHtml}

      <div class="modal-breakdown-title">Full Standings</div>
      <div class="modal-ffa-list">
        ${listHtml || '<div class="empty-sub" style="padding:1rem;text-align:center">No results yet</div>'}
      </div>

      <div class="modal-ffa-scoring-note">${scoringNote}</div>
      ${metaRow(match)}
    </div>`;
}

// ── Binary Modal ─────────────────────────────────────────────
function buildBinaryModal(match) {
    const result = match.result || {};
    const winnerSide = result.winner_side || match.winner_side;
    const isDraw = winnerSide === 'draw';
    const aWon = winnerSide === 'a';
    const bWon = winnerSide === 'b';

    const nameA = match.dept_a_name || 'Side A';
    const nameB = match.dept_b_name || 'Side B';
    const winnerName = isDraw ? null : aWon ? nameA : nameB;

    const banner = isDraw
        ? `<div class="binary-result-banner binary-draw-banner">
         <div class="binary-result-label">Result</div>
         <div class="binary-result-name">Draw</div>
         <div class="binary-result-sub">No winner declared</div>
       </div>`
        : `<div class="binary-result-banner">
         <div class="binary-result-label">Winner</div>
         <div class="binary-result-name">${escapeHtml(winnerName || '—')}</div>
         <div class="binary-result-sub">${aWon ? 'Win — Side A' : 'Win — Side B'}${result.win_type ? ' · ' + escapeHtml(result.win_type) : ''}</div>
       </div>`;

    return `
    <div class="modal-binary">
      <div class="modal-header">
        <div class="modal-sport">
          ${formatPill('binary')}
          ${escapeHtml(match.sport_name || '')}
        </div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>

      ${statusChip(match.status)}

      <div class="modal-teams">
        <div class="modal-team">
          ${deptAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${aWon ? 'winner' : ''}">${escapeHtml(nameA)}</div>
        </div>
        <div class="binary-vs">vs</div>
        <div class="modal-team">
          ${deptAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>

      ${match.status === 'completed' || winnerSide ? banner : ''}
      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
}

// ── Sets Modal ───────────────────────────────────────────────
function buildSetsModal(match) {
    const scores = match.scores || [];
    const result = match.result || {};
    const nameA = match.dept_a_name || 'Side A';
    const nameB = match.dept_b_name || 'Side B';

    let setsA = 0;
    let setsB = 0;
    scores.forEach((s) => {
        if ((s.score_a || 0) > (s.score_b || 0)) setsA++;
        else if ((s.score_b || 0) > (s.score_a || 0)) setsB++;
    });

    // Prefer result totals if completed
    if (result.total_score_a != null) setsA = result.total_score_a;
    if (result.total_score_b != null) setsB = result.total_score_b;

    const aWon = match.status === 'completed' && setsA > setsB;
    const bWon = match.status === 'completed' && setsB > setsA;

    const setPills = scores
        .map((s, i) => {
            const a = s.score_a || 0;
            const b = s.score_b || 0;
            const aWin = a > b;
            const bWin = b > a;
            return `
        <div class="set-pill ${aWin || bWin ? 'won' : ''}">
          <div class="set-pill-label">${escapeHtml(s.period_label || 'Set ' + (s.period || i + 1))}</div>
          <div class="set-pill-val">${a}–${b}</div>
        </div>`;
        })
        .join('');

    const tableRows = scores
        .map((s, i) => {
            const a = s.score_a || 0;
            const b = s.score_b || 0;
            return `
        <tr>
          <td>${escapeHtml(s.period_label || 'Set ' + (s.period || i + 1))}</td>
          <td class="${a > b ? 'winner-score-cell' : ''}">${a}</td>
          <td class="${b > a ? 'winner-score-cell' : ''}">${b}</td>
        </tr>`;
        })
        .join('');

    return `
    <div class="modal-sets">
      <div class="modal-header">
        <div class="modal-sport">
          ${formatPill('sets', match.sets_to_win)}
          ${escapeHtml(match.sport_name || '')}
        </div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>

      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}

      <div class="modal-teams">
        <div class="modal-team">
          ${deptAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon ? 'is-winner' : '')}
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
          ${deptAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>

      ${setPills ? `<div class="set-score-summary">${setPills}</div>` : ''}

      ${scores.length
            ? `<div class="modal-breakdown">
               <div class="modal-breakdown-title">Set Breakdown</div>
               <table class="period-table">
                 <thead><tr><th>Set</th><th>${escapeHtml(nameA)}</th><th>${escapeHtml(nameB)}</th></tr></thead>
                 <tbody>
                   ${tableRows}
                   <tr class="total-row"><td>Sets</td><td>${setsA}</td><td>${setsB}</td></tr>
                 </tbody>
               </table>
             </div>`
            : ''
        }

      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
}

// ── Standard (Points / Time) Modal ───────────────────────────
function buildStandardModal(match) {
    const scores = match.scores || [];
    const result = match.result || {};
    const nameA = match.dept_a_name || 'Side A';
    const nameB = match.dept_b_name || 'Side B';
    const isTime = match.scoring_type === 'time';

    let totalA =
        result.total_score_a != null
            ? result.total_score_a
            : scores.reduce((s, r) => s + (Number(r.score_a) || 0), 0);
    let totalB =
        result.total_score_b != null
            ? result.total_score_b
            : scores.reduce((s, r) => s + (Number(r.score_b) || 0), 0);

    // Live totals from API if present
    if (match.live_total_a != null) totalA = match.live_total_a;
    if (match.live_total_b != null) totalB = match.live_total_b;
    if (match.total_a != null) totalA = match.total_a;
    if (match.total_b != null) totalB = match.total_b;

    const aWon =
        match.status === 'completed' &&
        (isTime ? totalA < totalB : totalA > totalB);
    const bWon =
        match.status === 'completed' &&
        (isTime ? totalB < totalA : totalB > totalA);

    const displayScore =
        result.final_score_display ||
        `${Number(totalA).toLocaleString()} – ${Number(totalB).toLocaleString()}`;

    const tableRows = scores
        .map((s, i) => {
            const a = Number(s.score_a) || 0;
            const b = Number(s.score_b) || 0;
            const aBetter = isTime ? a < b : a > b;
            const bBetter = isTime ? b < a : b > a;
            return `
        <tr>
          <td>${escapeHtml(s.period_label || 'Period ' + (s.period || i + 1))}</td>
          <td class="${aBetter ? 'winner-score-cell' : ''}">${a}</td>
          <td class="${bBetter ? 'winner-score-cell' : ''}">${b}</td>
        </tr>`;
        })
        .join('');

    return `
    <div class="modal-standard">
      <div class="modal-header">
        <div class="modal-sport">
          ${formatPill(match.scoring_type)}
          ${escapeHtml(match.sport_name || '')}
        </div>
        <div class="modal-title">${escapeHtml(match.tournament_name || 'Match')}</div>
      </div>

      ${statusChip(match.status)}
      ${match.status === 'ongoing' ? watchersChip(match.watchers) : ''}

      <div class="modal-teams">
        <div class="modal-team">
          ${deptAvatar(nameA, match.dept_a_color, match.dept_a_logo, aWon ? 'is-winner' : '')}
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
          ${deptAvatar(nameB, match.dept_b_color, match.dept_b_logo, bWon ? 'is-winner' : '')}
          <div class="modal-dept-name ${bWon ? 'winner' : ''}">${escapeHtml(nameB)}</div>
        </div>
      </div>

      ${scores.length
            ? `<div class="modal-breakdown">
               <div class="modal-breakdown-title">Period Breakdown</div>
               <table class="period-table">
                 <thead><tr><th>Period</th><th>${escapeHtml(nameA)}</th><th>${escapeHtml(nameB)}</th></tr></thead>
                 <tbody>
                   ${tableRows}
                   <tr class="total-row">
                     <td>Total</td>
                     <td class="${aWon ? 'winner-score-cell' : ''}">${Number(totalA).toLocaleString()}</td>
                     <td class="${bWon ? 'winner-score-cell' : ''}">${Number(totalB).toLocaleString()}</td>
                   </tr>
                 </tbody>
               </table>
             </div>`
            : match.status === 'completed'
                ? `<div style="text-align:center;margin-bottom:1rem;font-family:var(--font-mono);font-size:14px;color:var(--muted2)">${escapeHtml(displayScore)}</div>`
                : ''
        }

      ${mvpBlock(result)}
      ${metaRow(match)}
    </div>`;
}

// ── Wire card clicks (call once after matches render) ────────
function bindMatchCardClicks(containerSelector = '#matches-container') {
    const root = document.querySelector(containerSelector);
    if (!root) return;

    root.addEventListener('click', (e) => {
        const card = e.target.closest('[data-match-id]');
        if (!card) return;
        const id = card.getAttribute('data-match-id');
        if (id) openMatchModal(id);
    });
}

// Also support featured match
document.getElementById('featured-match-wrap')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-match-id]');
    if (card) openMatchModal(card.getAttribute('data-match-id'));
});


window.openMatchModal = openMatchModal;
window.closeModal = closeModal;
window.closeModalOnBg = closeModalOnBg;
window.bindMatchCardClicks = bindMatchCardClicks;