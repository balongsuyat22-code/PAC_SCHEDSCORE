
const progressBracket = async (matchId, winnerTeamId, winnerPlayerId, winnerDeptId, pool) => {
    try {
        const [matches] = await pool.execute(
            'SELECT * FROM matches WHERE id = ?',
            [matchId]
        );
        if (!matches.length) return;

        const match = matches[0];

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