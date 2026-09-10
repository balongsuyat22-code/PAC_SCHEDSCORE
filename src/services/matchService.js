
const progressBracket = async (matchId, winnerTeamId, winnerPlayerId, winnerDeptId, pool) => {
    try {
        const [matches] = await pool.execute(
            `SELECT m.* FROM matches m WHERE m.id = ?`,
            [matchId]
        );
        if (!matches.length) return;

        const match = matches[0];
        if (!winnerDeptId) return;

        const loserDeptId = Number(match.participant_a_department_id) === Number(winnerDeptId)
            ? match.participant_b_department_id
            : match.participant_a_department_id;

        if (match.next_match_id) {
            const slot = match.next_match_slot === 'a' ? 'a' : 'b';
            await pool.execute(
                `UPDATE matches SET participant_${slot}_department_id = ? WHERE id = ?`,
                [winnerDeptId, match.next_match_id]
            );

            const [nextMatch] = await pool.execute(
                'SELECT participant_a_department_id, participant_b_department_id, status FROM matches WHERE id = ?',
                [match.next_match_id]
            );
            if (nextMatch[0]?.participant_a_department_id && nextMatch[0]?.participant_b_department_id
                && nextMatch[0].status === 'pending') {
                await pool.execute(
                    'UPDATE matches SET status = "scheduled" WHERE id = ?',
                    [match.next_match_id]
                );
            }
        }

        if (loserDeptId && match.loser_next_match_id) {
            const loserSlot = match.loser_next_match_slot === 'a' ? 'a' : 'b';
            await pool.execute(
                `UPDATE matches SET participant_${loserSlot}_department_id = ? WHERE id = ?`,
                [loserDeptId, match.loser_next_match_id]
            );
            const [loserNext] = await pool.execute(
                'SELECT participant_a_department_id, participant_b_department_id, status FROM matches WHERE id = ?',
                [match.loser_next_match_id]
            );
            if (loserNext[0]?.participant_a_department_id && loserNext[0]?.participant_b_department_id
                && loserNext[0].status === 'pending') {
                await pool.execute(
                    'UPDATE matches SET status = "scheduled" WHERE id = ?',
                    [match.loser_next_match_id]
                );
            }
        }
    } catch (err) {
        console.error('progressBracket error:', err);
    }
};

/** Re-apply progression for all completed matches (fills leftover TBDs). */
const repairBracketProgression = async (tournamentId, pool) => {
    const [completed] = await pool.execute(
        `SELECT id, winner_department_id
         FROM matches
         WHERE tournament_id = ?
           AND status IN ('completed', 'walkover')
           AND winner_department_id IS NOT NULL
         ORDER BY round_number ASC, match_number ASC, id ASC`,
        [tournamentId]
    );
    for (const m of completed) {
        await progressBracket(m.id, null, null, m.winner_department_id, pool);
    }
    return completed.length;
};

module.exports = { progressBracket, repairBracketProgression };

