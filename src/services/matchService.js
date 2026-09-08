
const progressBracket = async (matchId, winnerTeamId, winnerPlayerId, winnerDeptId, pool) => {
    try {
        const [matches] = await pool.execute(
            `SELECT m.*, d.is_exhibition AS winner_is_exhibition
             FROM matches m
             LEFT JOIN departments d ON d.id = m.winner_department_id
             WHERE m.id = ?`,
            [matchId]
        );
        if (!matches.length) return;

        const match = matches[0];

        const loserDeptId = Number(match.participant_a_department_id) === Number(winnerDeptId)
            ? match.participant_b_department_id
            : match.participant_a_department_id;

        if (match.winner_is_exhibition) return;

        if (!match.next_match_id) return;

        const slot = match.next_match_slot;
        if (slot === 'a') {
            await pool.execute(
                `UPDATE matches SET
                 participant_a_department_id = ?
                 WHERE id = ?`,
                [winnerDeptId, match.next_match_id]
            );
        } else if (slot === 'b') {
            await pool.execute(
                `UPDATE matches SET
                 participant_b_department_id = ?
                 WHERE id = ?`, [winnerDeptId, match.next_match_id]
            );
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
            if (loserNext[0]?.participant_a_department_id && loserNext[0]?.participant_b_department_id && loserNext[0].status === 'pending') {
                await pool.execute(
                    'UPDATE matches SET status = "scheduled" WHERE id = ?',
                    [match.loser_next_match_id]
                );
            }
        }


        const [nextMatch] = await pool.execute(
            'SELECT * FROM matches WHERE id = ?', [match.next_match_id]
        );

        if (nextMatch.length) {
            const nm = nextMatch[0];
            const hasA = nm.participant_a_department_id;
            const hasB = nm.participant_b_department_id;

            if (hasA && hasB && nm.status === 'pending') {
                await pool.execute(
                    'UPDATE matches SET status = "scheduled" WHERE id = ?',
                    [match.next_match_id]
                );
            }
        }
    } catch (err) {
        console.error('progressBracket error:', err);
    }
};

module.exports = { progressBracket };