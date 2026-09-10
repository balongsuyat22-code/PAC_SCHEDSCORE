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

/* ------------------------------------------------------------------ *
 * Total Customization Control Panel additions
 * ------------------------------------------------------------------ */
const LOCKED_STATUSES = new Set(['ongoing', 'completed']);

const httpError = (message, status) => Object.assign(new Error(message), { status });

/** Wraps `work` in a transaction; always releases the connection. */
async function withTransaction(pool, work) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await work(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/**
 * Overwrites participant_a/b_department_id on a match, as long as it
 * hasn't gone ongoing/completed yet.
 */
const editMatchTeams = async (matchId, teamA_id, teamB_id, pool) => {
    if (teamA_id != null && teamB_id != null && Number(teamA_id) === Number(teamB_id)) {
        throw httpError('A match cannot have the same team on both sides.', 400);
    }
    return withTransaction(pool, async (conn) => {
        const [rows] = await conn.execute('SELECT * FROM matches WHERE id = ? FOR UPDATE', [matchId]);
        const match = rows[0];
        if (!match) throw httpError('Match not found.', 404);
        if (LOCKED_STATUSES.has(match.status)) {
            throw httpError(`Cannot edit teams: match is already ${match.status}.`, 409);
        }
        await conn.execute(
            `UPDATE matches SET participant_a_department_id = ?, participant_b_department_id = ? WHERE id = ?`,
            [teamA_id ?? null, teamB_id ?? null, matchId]
        );
        const [updated] = await conn.execute('SELECT * FROM matches WHERE id = ?', [matchId]);
        return updated[0];
    });
};

/**
 * Injects an explicit team into a TBD placeholder slot ('a' | 'b') and
 * unlinks whatever structural next_match_id / loser_next_match_id was
 * still feeding that exact slot, so progressBracket() can never
 * silently overwrite the manual override afterward.
 */
const forceInsertTeam = async (matchId, slot, departmentId, force, pool) => {
    if (!['a', 'b'].includes(slot)) throw httpError('slot must be "a" or "b".', 400);
    return withTransaction(pool, async (conn) => {
        const [rows] = await conn.execute('SELECT * FROM matches WHERE id = ? FOR UPDATE', [matchId]);
        const match = rows[0];
        if (!match) throw httpError('Match not found.', 404);
        if (LOCKED_STATUSES.has(match.status)) {
            throw httpError(`Cannot insert team: match is already ${match.status}.`, 409);
        }
        const column = `participant_${slot}_department_id`;
        if (match[column] != null && !force) {
            throw httpError(`Slot ${slot.toUpperCase()} is already occupied. Pass force:true to override.`, 409);
        }
        await conn.execute(`UPDATE matches SET ${column} = ? WHERE id = ?`, [departmentId, matchId]);
        const winnerSlotCol = slot === 'a' ? "next_match_slot = 'a'" : "next_match_slot = 'b'";
        const loserSlotCol = slot === 'a' ? "loser_next_match_slot = 'a'" : "loser_next_match_slot = 'b'";
        const [unlinkedWinner] = await conn.execute(
            `UPDATE matches SET next_match_id = NULL, next_match_slot = NULL WHERE next_match_id = ? AND ${winnerSlotCol}`,
            [matchId]
        );
        const [unlinkedLoser] = await conn.execute(
            `UPDATE matches SET loser_next_match_id = NULL, loser_next_match_slot = NULL WHERE loser_next_match_id = ? AND ${loserSlotCol}`,
            [matchId]
        );
        const [freshRows] = await conn.execute('SELECT * FROM matches WHERE id = ?', [matchId]);
        const fresh = freshRows[0];
        if (fresh.participant_a_department_id && fresh.participant_b_department_id && fresh.status === 'pending') {
            await conn.execute(`UPDATE matches SET status = 'scheduled' WHERE id = ?`, [matchId]);
            fresh.status = 'scheduled';
        }
        return { match: fresh, unlinkedSources: unlinkedWinner.affectedRows + unlinkedLoser.affectedRows };
    });
};

/**
 * Points a source match's winner (or loser) output at an arbitrary
 * target match/slot — mirrors the bracket generator's own link wiring
 * but callable manually at any time.
 * Pass targetMatchId = null to unlink.
 */
const manualBracketRewire = async (sourceId, targetMatchId, targetSlot, resultType, pool) => {
    if (!['winner', 'loser'].includes(resultType)) throw httpError('result must be "winner" or "loser".', 400);
    if (targetMatchId != null && !['a', 'b'].includes(targetSlot)) {
        throw httpError('target_slot must be "a" or "b" when linking to a target.', 400);
    }
    if (targetMatchId === sourceId) throw httpError('A match cannot feed itself.', 400);
    const idColumn = resultType === 'loser' ? 'loser_next_match_id' : 'next_match_id';
    const slotColumn = resultType === 'loser' ? 'loser_next_match_slot' : 'next_match_slot';
    return withTransaction(pool, async (conn) => {
        const [rows] = await conn.execute('SELECT * FROM matches WHERE id = ?', [sourceId]);
        const source = rows[0];
        if (!source) throw httpError('Source match not found.', 404);
        if (targetMatchId != null) {
            const [targetRows] = await conn.execute('SELECT tournament_id FROM matches WHERE id = ?', [targetMatchId]);
            const target = targetRows[0];
            if (!target) throw httpError('Target match not found.', 404);
            if (Number(target.tournament_id) !== Number(source.tournament_id)) {
                throw httpError('Cannot rewire across different tournaments.', 400);
            }
        }
        await conn.execute(
            `UPDATE matches SET ${idColumn} = ?, ${slotColumn} = ? WHERE id = ?`,
            [targetMatchId, targetMatchId != null ? targetSlot : null, sourceId]
        );
        const [updated] = await conn.execute('SELECT * FROM matches WHERE id = ?', [sourceId]);
        return updated[0];
    });
};

/**
 * Free-form schedule override: date/time/venue/referee/notes.
 * Fixed school blocks were removed; any pending/scheduled match can be updated.
 */
const updateMatchSchedule = async (matchId, fields, pool) => {
    const { scheduled_date, scheduled_time, venue_id, referee_id, notes } = fields;
    if (scheduled_date && !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)) {
        throw httpError('scheduled_date must be in YYYY-MM-DD format.', 400);
    }
    if (scheduled_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(scheduled_time)) {
        throw httpError('scheduled_time must be in HH:MM or HH:MM:SS format.', 400);
    }
    return withTransaction(pool, async (conn) => {
        const [rows] = await conn.execute('SELECT * FROM matches WHERE id = ? FOR UPDATE', [matchId]);
        const match = rows[0];
        if (!match) throw httpError('Match not found.', 404);
        if (LOCKED_STATUSES.has(match.status)) {
            throw httpError(`Cannot reschedule: match is already ${match.status}.`, 409);
        }
        await conn.execute(
            `UPDATE matches
             SET scheduled_date = ?, scheduled_time = ?, venue_id = ?, referee_id = ?, notes = ?,
                 status = CASE WHEN status = 'pending' AND ? IS NOT NULL THEN 'scheduled' ELSE status END
             WHERE id = ?`,
            [
                scheduled_date || null,
                scheduled_time || null,
                venue_id ?? null,
                referee_id ?? null,
                notes || null,
                scheduled_date || null,
                matchId,
            ]
        );
        const [updated] = await conn.execute('SELECT * FROM matches WHERE id = ?', [matchId]);
        return updated[0];
    });
};

module.exports = {
    progressBracket,
    repairBracketProgression,
    editMatchTeams,
    forceInsertTeam,
    manualBracketRewire,
    updateMatchSchedule,
};