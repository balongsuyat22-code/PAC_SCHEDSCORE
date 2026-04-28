/* ══════════════════════════════════════════════════════════════
   BRACKET DESIGNS — one per format
   ══════════════════════════════════════════════════════════════ */

/* ── Shared helpers ─────────────────────────────────────────── */
const BD = {
    dept(m, slot) {
        const name = slot === 'a'
            ? (m.team_a_name || m.dept_a_name || 'TBD')
            : (m.team_b_name || m.dept_b_name || 'TBD');
        const color = slot === 'a'
            ? (m.dept_a_color || '#555')
            : (m.dept_b_color || '#555');
        const scoreRaw = slot === 'a' ? m.total_score_a : m.total_score_b;
        const score = scoreRaw !== null && scoreRaw !== undefined ? scoreRaw : '';
        const isWinner = m.winner_department_id &&
            m.winner_department_id === (slot === 'a'
                ? m.participant_a_department_id
                : m.participant_b_department_id);
        return { name, color, score, isWinner };
    },

    initials(name = '') {
        return name.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || '?';
    },

    statusDot(status) {
        const map = { ongoing: '#22C55E', completed: '#F5B800', scheduled: '#60A5FA', pending: '#6B7494' };
        return map[status] || '#6B7494';
    },
};

/* ══════════════════════════════════════════════════════════════
   SINGLE ELIMINATION BRACKET
   ══════════════════════════════════════════════════════════════ */
function renderSingleEliminationBracket(matches, participants, tournament) {
    // Group matches by round
    const rounds = {};
    matches.forEach(m => {
        const r = m.round_number || 1;
        if (!rounds[r]) rounds[r] = [];
        rounds[r].push(m);
    });

    const roundNumbers = Object.keys(rounds).sort((a, b) => parseInt(a) - parseInt(b));

    if (roundNumbers.length === 0) {
        return `<div class="section-empty">No bracket matches available. Generate bracket first.</div>`;
    }

    return `
    <div style="overflow-x: auto; padding: 20px; background: var(--bg3); border-radius: 14px;">
        <div style="display: flex; gap: 20px; min-width: max-content;">
            ${roundNumbers.map(round => `
                <div style="flex-shrink: 0; min-width: 220px;">
                    <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 900; text-align: center; padding: 10px; background: var(--bg2); border-radius: 8px; margin-bottom: 15px; color: var(--gold);">
                        ${round === '1' ? 'Round 1' : round === roundNumbers[roundNumbers.length - 1] ? '🏆 FINAL' : `Round ${round}`}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        ${rounds[round].map(match => {
        const a = BD.dept(match, 'a');
        const b = BD.dept(match, 'b');
        const isCompleted = match.status === 'completed';
        return `
                            <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden;">
                                <div style="padding: 8px 12px; background: var(--bg3); font-size: 10px; font-weight: 700; color: var(--muted); border-bottom: 1px solid var(--border);">
                                    ${match.bracket_position || `Match ${match.match_number}`}
                                </div>
                                <div style="padding: 10px 12px; ${a.isWinner && isCompleted ? 'background: rgba(245,184,0,0.1);' : ''} border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 24px; height: 24px; border-radius: 6px; background: ${a.color}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: white;">${BD.initials(a.name)}</div>
                                        <span style="font-size: 13px; font-weight: 600;">${a.name}</span>
                                    </div>
                                    <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 900; ${a.isWinner && isCompleted ? 'color: var(--gold);' : ''}">${a.score}</span>
                                </div>
                                <div style="padding: 10px 12px; ${b.isWinner && isCompleted ? 'background: rgba(245,184,0,0.1);' : ''} display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 24px; height: 24px; border-radius: 6px; background: ${b.color}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: white;">${BD.initials(b.name)}</div>
                                        <span style="font-size: 13px; font-weight: 600;">${b.name}</span>
                                    </div>
                                    <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 900; ${b.isWinner && isCompleted ? 'color: var(--gold);' : ''}">${b.score}</span>
                                </div>
                            </div>`;
    }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   ROUND ROBIN BRACKET
   ══════════════════════════════════════════════════════════════ */
function renderRoundRobinBracket(matches, participants, tournament) {
    // Calculate standings
    const standings = {};
    participants.forEach(p => {
        standings[p.department_id] = {
            name: p.team_name || p.department_name,
            color: p.department_color || '#555',
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            pf: 0,
            pa: 0
        };
    });

    matches.forEach(m => {
        if (m.status === 'completed') {
            const a = standings[m.participant_a_department_id];
            const b = standings[m.participant_b_department_id];
            if (a && b) {
                a.played++; b.played++;
                a.pf += m.total_score_a || 0;
                a.pa += m.total_score_b || 0;
                b.pf += m.total_score_b || 0;
                b.pa += m.total_score_a || 0;

                if (m.winner_department_id === m.participant_a_department_id) {
                    a.wins++; a.points += 3;
                    b.losses++;
                } else if (m.winner_department_id === m.participant_b_department_id) {
                    b.wins++; b.points += 3;
                    a.losses++;
                } else {
                    a.draws++; a.points += 1;
                    b.draws++; b.points += 1;
                }
            }
        }
    });

    const sortedStandings = Object.values(standings).sort((a, b) => b.points - a.points || (b.pf - b.pa) - (a.pf - a.pa));

    // Group matches by round
    const rounds = {};
    matches.forEach(m => {
        const r = m.round_number || 1;
        if (!rounds[r]) rounds[r] = [];
        rounds[r].push(m);
    });

    return `
    <div style="background: var(--bg3); border-radius: 14px; padding: 20px;">
        <div style="margin-bottom: 24px;">
            <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 900; margin-bottom: 15px; color: var(--gold);">📊 Standings</div>
            <div style="background: var(--bg2); border-radius: 12px; overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg3); border-bottom: 1px solid var(--border);">
                            <th style="padding: 12px; text-align: left;">#</th>
                            <th style="padding: 12px; text-align: left;">Team</th>
                            <th style="padding: 12px; text-align: center;">P</th>
                            <th style="padding: 12px; text-align: center;">W</th>
                            <th style="padding: 12px; text-align: center;">D</th>
                            <th style="padding: 12px; text-align: center;">L</th>
                            <th style="padding: 12px; text-align: center;">PF</th>
                            <th style="padding: 12px; text-align: center;">PA</th>
                            <th style="padding: 12px; text-align: center;">GD</th>
                            <th style="padding: 12px; text-align: center;">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedStandings.map((s, i) => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 12px; font-weight: 800; color: ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--muted)'};">${i + 1}</td>
                                <td style="padding: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 28px; height: 28px; border-radius: 7px; background: ${s.color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; color: white;">${BD.initials(s.name)}</div>
                                        <span style="font-weight: 600;">${s.name}</span>
                                    </div>
                                 </td>
                                <td style="padding: 12px; text-align: center;">${s.played}</td>
                                <td style="padding: 12px; text-align: center; color: var(--green);">${s.wins}</td>
                                <td style="padding: 12px; text-align: center; color: var(--muted);">${s.draws}</td>
                                <td style="padding: 12px; text-align: center; color: var(--red);">${s.losses}</td>
                                <td style="padding: 12px; text-align: center;">${s.pf}</td>
                                <td style="padding: 12px; text-align: center;">${s.pa}</td>
                                <td style="padding: 12px; text-align: center; color: ${s.pf - s.pa > 0 ? 'var(--green)' : s.pf - s.pa < 0 ? 'var(--red)' : 'var(--muted)'};">${s.pf - s.pa > 0 ? '+' : ''}${s.pf - s.pa}</td>
                                <td style="padding: 12px; text-align: center; font-weight: 800; color: var(--gold);">${s.points}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div>
            <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 900; margin-bottom: 15px; color: var(--gold);">📅 Match Schedule</div>
            ${Object.entries(rounds).map(([round, roundMatches]) => `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 14px; font-weight: 700; padding: 8px 12px; background: var(--bg2); border-radius: 8px; margin-bottom: 10px; border-left: 3px solid var(--gold);">Round ${round}</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
                        ${roundMatches.map(m => {
        const a = BD.dept(m, 'a');
        const b = BD.dept(m, 'b');
        const hasScore = m.total_score_a !== null && m.total_score_a !== undefined;
        return `
                            <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 12px;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                                    <div style="flex: 1; text-align: right;">
                                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                                            <span style="font-size: 13px; font-weight: 600;">${a.name}</span>
                                            <div style="width: 22px; height: 22px; border-radius: 5px; background: ${a.color}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: white;">${BD.initials(a.name)}</div>
                                        </div>
                                    </div>
                                    <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 900; color: var(--gold); min-width: 50px; text-align: center;">
                                        ${hasScore ? `${m.total_score_a} - ${m.total_score_b}` : 'VS'}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <div style="width: 22px; height: 22px; border-radius: 5px; background: ${b.color}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: white;">${BD.initials(b.name)}</div>
                                            <span style="font-size: 13px; font-weight: 600;">${b.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>`;
    }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   FFA BRACKET
   ══════════════════════════════════════════════════════════════ */
function renderFFABracket(matches, participants, tournament) {
    const ffaScoring = tournament.ffa_scoring || 'points';
    const unit = ffaScoring === 'time' ? 's' : ffaScoring === 'distance' ? 'm' : 'pts';
    const lowerBetter = ffaScoring === 'time';

    const rows = participants.filter(p => !p.dq).map(p => ({
        name: p.team_name || p.department_name,
        color: p.department_color || '#555',
        value: p.ffa_result_value || null
    }));

    const ranked = rows.filter(r => r.value !== null).sort((a, b) => lowerBetter ? a.value - b.value : b.value - a.value);

    return `
    <div style="background: var(--bg3); border-radius: 14px; padding: 20px;">
        <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 900; margin-bottom: 15px; color: var(--gold);">🏆 Event Rankings</div>
        <div style="background: var(--bg2); border-radius: 12px; overflow: hidden;">
            ${ranked.map((r, i) => `
                <div style="display: flex; align-items: center; gap: 15px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="width: 40px; text-align: center;">
                        <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 900; color: ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--muted)'};">${i + 1}</span>
                    </div>
                    <div style="width: 36px; height: 36px; border-radius: 9px; background: ${r.color}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: white;">${BD.initials(r.name)}</div>
                    <div style="flex: 1;"><span style="font-weight: 600;">${r.name}</span></div>
                    <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 24px; font-weight: 900; color: var(--gold);">${r.value}<span style="font-size: 12px; color: var(--muted); margin-left: 4px;">${unit}</span></div>
                </div>
            `).join('')}
            ${ranked.length === 0 ? '<div style="padding: 40px; text-align: center; color: var(--muted);">No results entered yet.</div>' : ''}
        </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   MAIN RENDER FUNCTION
   ══════════════════════════════════════════════════════════════ */
function renderBracketByFormat(matches, participants, tournament) {
    if (!matches || matches.length === 0) {
        return `<div class="section-empty">No matches available. Generate bracket first.</div>`;
    }

    const format = tournament.format;

    switch (format) {
        case 'single_elimination':
            return renderSingleEliminationBracket(matches, participants, tournament);
        case 'double_elimination':
            return renderSingleEliminationBracket(matches, participants, tournament);
        case 'round_robin':
            return renderRoundRobinBracket(matches, participants, tournament);
        case 'free_for_all':
        case 'team_ranking':
            return renderFFABracket(matches, participants, tournament);
        default:
            return renderSingleEliminationBracket(matches, participants, tournament);
    }
}