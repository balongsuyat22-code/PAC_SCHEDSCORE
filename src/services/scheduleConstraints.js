function toDateStr(val) {
    if (!val) return null;
    return String(val).slice(0, 10);
}

function toTimeStr(val) {
    if (!val) return null;
    const s = String(val);
    // '08:00:00' or '08:00'
    return s.length >= 5 ? s.slice(0, 5) : s;
}

/**
 * Build ordered slot list from options.
 * Priority: day_plans > slots > dates × times
 */
function buildSlotList(options = {}) {
    const out = [];

    if (Array.isArray(options.day_plans) && options.day_plans.length) {
        for (const plan of options.day_plans) {
            const date = toDateStr(plan.date || plan.scheduled_date);
            if (!date) continue;
            const times = Array.isArray(plan.times) ? plan.times : [];
            for (const t of times) {
                const time = toTimeStr(t);
                if (time) out.push({ date, time });
            }
        }
        return dedupeSlots(out);
    }

    if (Array.isArray(options.slots) && options.slots.length) {
        for (const s of options.slots) {
            const date = toDateStr(s.date || s.scheduled_date);
            const time = toTimeStr(s.time || s.scheduled_time);
            if (date && time) out.push({ date, time });
        }
        return dedupeSlots(out);
    }

    // Legacy cartesian product
    const dates = Array.isArray(options.dates) ? options.dates.map(toDateStr).filter(Boolean) : [];
    const times = Array.isArray(options.times) ? options.times.map(toTimeStr).filter(Boolean) : [];
    for (const date of dates) {
        for (const time of times) {
            out.push({ date, time });
        }
    }
    return dedupeSlots(out);
}

function dedupeSlots(slots) {
    const seen = new Set();
    const out = [];
    for (const s of slots) {
        const key = `${s.date}|${s.time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
    }
    // chronological
    out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return out;
}

/**
 * Returns a conflicting match row if departmentId is already booked at date+time,
 * otherwise null. Ignores matchId (self) when rescheduling.
 */
async function findTeamConflict(pool, {
    departmentId,
    date,
    time,
    excludeMatchId = null,
    ignoreOpenMatchesInTournamentId = null,
} = {}) {
    if (!departmentId || !date || !time) return null;
    const d = toDateStr(date);
    const t = toTimeStr(time);
    const params = [departmentId, departmentId, d, t];
    let sql = `
        SELECT id, tournament_id, scheduled_date, scheduled_time, status,
               participant_a_department_id, participant_b_department_id
        FROM matches
        WHERE (participant_a_department_id = ? OR participant_b_department_id = ?)
          AND scheduled_date = ?
          AND DATE_FORMAT(scheduled_time, '%H:%i') = ?
          AND status IN ('pending', 'scheduled', 'ongoing')
    `;
    if (excludeMatchId) {
        sql += ' AND id != ?';
        params.push(excludeMatchId);
    }
    if (ignoreOpenMatchesInTournamentId) {
        sql += ` AND NOT (tournament_id = ? AND status IN ('pending', 'scheduled'))`;
        params.push(ignoreOpenMatchesInTournamentId);
    }
    sql += ' LIMIT 1';
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
}

/**
 * Sort open matches into a sensible schedule order:
 * earlier rounds first, upper before lower before grand final.
 */
function sortMatchesForSchedule(list) {
    return [...list].sort((a, b) => {
        const ra = Number(a.round_number) || 0;
        const rb = Number(b.round_number) || 0;
        if (ra !== rb) return ra - rb;
        const sideRank = (s) => {
            const v = String(s || '').toLowerCase();
            if (v === 'lower') return 1;
            if (v === 'grand_final') return 2;
            return 0;
        };
        const sa = sideRank(a.bracket_side);
        const sb = sideRank(b.bracket_side);
        if (sa !== sb) return sa - sb;
        const ma = Number(a.match_number) || 0;
        const mb = Number(b.match_number) || 0;
        if (ma !== mb) return ma - mb;
        return (a.id || 0) - (b.id || 0);
    });
}

function matchDepartments(match) {
    return new Set([
        match.participant_a_department_id,
        match.participant_b_department_id,
    ].filter(Boolean));
}

function departmentPairKey(left, right) {
    const [first, second] = [String(left), String(right)].sort();
    return `${first}|${second}`;
}

function orderCompleteRoundRobinMatches(matches, teamIds) {
    const matchByPair = new Map(matches.map(match => [
        departmentPairKey(match.participant_a_department_id, match.participant_b_department_id),
        match,
    ]));
    if (matchByPair.size !== matches.length || matches.length !== teamIds.length * (teamIds.length - 1) / 2) {
        return null;
    }

    const circle = [...teamIds];
    if (circle.length % 2) circle.push(null);
    const rounds = [];
    for (let roundIndex = 0; roundIndex < circle.length - 1; roundIndex++) {
        const round = [];
        for (let index = 0; index < circle.length / 2; index++) {
            const left = circle[index];
            const right = circle[circle.length - 1 - index];
            if (left != null && right != null) {
                const match = matchByPair.get(departmentPairKey(left, right));
                if (!match) return null;
                round.push(match);
            }
        }
        rounds.push(round);
        circle.splice(1, 0, circle.pop());
    }

    const ordered = [];
    let previousTeams = new Set();
    for (const round of rounds) {
        while (round.length) {
            let bestIndex = 0;
            let fewestSharedTeams = Infinity;
            round.forEach((match, index) => {
                const shared = [...matchDepartments(match)].filter(teamId => previousTeams.has(teamId)).length;
                if (shared < fewestSharedTeams) {
                    fewestSharedTeams = shared;
                    bestIndex = index;
                }
            });
            const [match] = round.splice(bestIndex, 1);
            ordered.push(match);
            previousTeams = matchDepartments(match);
        }
    }
    return ordered;
}

function nextRoundRobinMatchIndex(remaining, scheduledMatches, random = Math.random) {
    const previousTeams = scheduledMatches.length
        ? matchDepartments(scheduledMatches[scheduledMatches.length - 1])
        : new Set();
    const twoBackTeams = scheduledMatches.length > 1
        ? matchDepartments(scheduledMatches[scheduledMatches.length - 2])
        : new Set();

    let bestIndex = 0;
    let bestScore = Infinity;
    remaining.forEach((match, index) => {
        const teams = matchDepartments(match);
        const sharedWithPrevious = [...teams].filter(teamId => previousTeams.has(teamId)).length;
        const createsThreeInARow = [...teams].some(teamId =>
            previousTeams.has(teamId) && twoBackTeams.has(teamId)
        );
        const sharedWithTwoBack = [...teams].filter(teamId => twoBackTeams.has(teamId)).length;
        const score = (createsThreeInARow ? 10000 : 0)
            + sharedWithPrevious * 1000
            + sharedWithTwoBack * 10
            + random() / 1000
            + index / 1000000;

        if (score < bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });
    return bestIndex;
}

function roundRobinOrderQuality(matches) {
    let threeMatchStreaks = 0;
    let consecutiveSharedTeams = 0;
    let twoBackSharedTeams = 0;
    for (let index = 0; index < matches.length; index++) {
        const teams = matchDepartments(matches[index]);
        if (index > 0) {
            consecutiveSharedTeams += [...teams].filter(teamId =>
                matchDepartments(matches[index - 1]).has(teamId)
            ).length;
        }
        if (index > 1) {
            const previousTeams = matchDepartments(matches[index - 1]);
            const twoBackTeams = matchDepartments(matches[index - 2]);
            if ([...teams].some(teamId => previousTeams.has(teamId) && twoBackTeams.has(teamId))) {
                threeMatchStreaks++;
            }
            twoBackSharedTeams += [...teams].filter(teamId => twoBackTeams.has(teamId)).length;
        }
    }
    return [threeMatchStreaks, consecutiveSharedTeams, twoBackSharedTeams];
}

function orderRoundRobinMatches(list, precedingMatches = []) {
    const base = sortMatchesForSchedule(list);
    const prefix = precedingMatches.slice(-2);
    if (!prefix.length) {
        const teamIds = [...new Set(base.flatMap(match => [...matchDepartments(match)]))]
            .sort((left, right) => String(left).localeCompare(String(right)));
        const completeOrder = orderCompleteRoundRobinMatches(base, teamIds);
        if (completeOrder) return completeOrder;
    }
    let bestOrder = base;
    let bestQuality = [Infinity, Infinity, Infinity];
    const attempts = Math.min(128, Math.max(16, base.length));

    for (let attempt = 0; attempt < attempts; attempt++) {
        const remaining = [...base];
        let seed = (remaining.reduce((total, match) => total + Number(match.id || match.match_number || 1), 0)
            + attempt + 1) >>> 0;
        const random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        for (let index = remaining.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(random() * (index + 1));
            [remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]];
        }

        const ordered = [...prefix];
        while (remaining.length) {
            ordered.push(remaining.splice(nextRoundRobinMatchIndex(remaining, ordered, random), 1)[0]);
        }

        const quality = roundRobinOrderQuality(ordered);
        const better = quality.some((value, index) =>
            value < bestQuality[index] && quality.slice(0, index).every((prior, priorIndex) => prior === bestQuality[priorIndex])
        );
        if (better) {
            bestOrder = ordered.slice(prefix.length);
            bestQuality = quality;
        }
        if (quality[0] === 0 && quality[1] === 0 && quality[2] === 0) break;
    }

    return bestOrder;
}

/**
 * Pick an active officer with the fewest concurrent assignments at date+time.
 * Returns user id or null.
 */
async function pickOfficer(pool, date, time, preferredId = null) {
    if (preferredId) {
        const [busy] = await pool.execute(
            `SELECT id FROM matches
             WHERE referee_id = ? AND scheduled_date = ? AND DATE_FORMAT(scheduled_time, '%H:%i') = ?
               AND status IN ('pending', 'scheduled', 'ongoing')
             LIMIT 1`,
            [preferredId, date, time]
        );
        if (!busy.length) return preferredId;
    }

    const [officers] = await pool.execute(
        `SELECT u.id,
                (SELECT COUNT(*) FROM matches m
                  WHERE m.referee_id = u.id
                    AND m.status IN ('scheduled', 'ongoing')) AS active_assignments
         FROM users u
         WHERE u.role = 'sgo_officer' AND u.is_active = 1
         ORDER BY active_assignments ASC, u.first_name ASC`
    );
    if (!officers.length) return null;

    for (const o of officers) {
        const [busy] = await pool.execute(
            `SELECT id FROM matches
             WHERE referee_id = ? AND scheduled_date = ? AND DATE_FORMAT(scheduled_time, '%H:%i') = ?
               AND status IN ('pending', 'scheduled', 'ongoing')
             LIMIT 1`,
            [o.id, date, time]
        );
        if (!busy.length) return o.id;
    }
    return null;
}

/**
 * Auto-schedule open matches for a tournament into conflict-free slots.
 *
 * @param {number} tournamentId
 * @param {object} options
 * @param {object} pool  mysql pool
 * @returns {{ scheduled: number, skipped: number, placements: array }}
 */
async function rebuildAutoSchedule(tournamentId, options = {}, pool) {
    if (!pool) throw new Error('Database pool is required.');

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await rebuildAutoScheduleInTransaction(tournamentId, options, connection);
        await connection.commit();
        return result;
    } catch (error) {
        try { await connection.rollback(); } catch (_) { }
        throw error;
    } finally {
        connection.release();
    }
}

async function rebuildAutoScheduleInTransaction(tournamentId, options, pool) {

    const [[tournament]] = await pool.execute(
        `SELECT id, sport_id, status, format, name FROM tournaments WHERE id = ? FOR UPDATE`,
        [tournamentId]
    );
    if (!tournament) {
        const err = new Error('Tournament not found.');
        throw err;
    }

    // Open matches (pending / scheduled) — re-date even if already scheduled
    // unless locked to ongoing/completed.
    const [matches] = await pool.execute(
        `SELECT m.id, m.round_number, m.match_number, m.bracket_side, m.bracket_position,
                m.participant_a_department_id, m.participant_b_department_id,
                m.scheduled_date, m.scheduled_time, m.venue_id, m.referee_id, m.status
         FROM matches m
         WHERE m.tournament_id = ?
           AND m.status IN ('pending', 'scheduled')
                 ORDER BY m.round_number ASC, m.match_number ASC, m.id ASC
                 FOR UPDATE`,
        [tournamentId]
    );

    if (!matches.length) {
        return { scheduled: 0, skipped: 0, placements: [], message: 'No open matches to schedule.' };
    }

    let remainingMatches = sortMatchesForSchedule(matches);
    let plannedRoundRobinMatches = tournament.format === 'round_robin'
        ? orderRoundRobinMatches(remainingMatches)
        : null;
    let slotList = buildSlotList(options);

    // Fallback: generate slots from dayStart/dayEnd/slotMinutes if nothing provided
    if (!slotList.length && options.startDate) {
        const start = toDateStr(options.startDate);
        const dayStart = toTimeStr(options.dayStart) || '08:00';
        const dayEnd = toTimeStr(options.dayEnd) || '17:00';
        const step = Math.max(15, parseInt(options.slotMinutes, 10) || 60);
        // single day fallback
        const times = [];
        let [h, m] = dayStart.split(':').map(Number);
        const [eh, em] = dayEnd.split(':').map(Number);
        while (h < eh || (h === eh && m <= em)) {
            times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            m += step;
            while (m >= 60) { m -= 60; h += 1; }
            if (h > 23) break;
        }
        slotList = times.map(time => ({ date: start, time }));
    }

    if (!slotList.length) {
        const err = new Error('No schedule slots provided. Add day plans (date + times) first.');
        throw err;
    }

    const defaultVenueId = options.defaultVenueId ?? options.venue_id ?? null;
    const defaultRefereeId = options.defaultRefereeId ?? options.default_referee_id ?? null;
    const assignOfficers = options.assign_officers === true || options.assign_officers === 1
        || options.assignOfficers === true;

    // Optional: clear previous schedule times on these matches so we fully rebuild
    // (keeps status pending until reassigned)
    // We overwrite in place instead of clearing globally.

    let scheduled = 0;
    let skipped = 0;
    const placements = [];
    // Track in-memory occupancy so two matches in the same run don't clash
    // before DB writes are visible to later iterations.
    const occupiedByDept = new Set(); // `${deptId}|${date}|${time}`
    const occupiedSlots = new Set();  // `${date}|${time}` — one match per slot by default
    const scheduledRoundRobinMatches = [];

    let slotIdx = 0;

    while (remainingMatches.length) {
        let matchIndex = 0;
        if (plannedRoundRobinMatches) {
            const plannedMatch = plannedRoundRobinMatches.shift();
            matchIndex = remainingMatches.findIndex(match => match.id === plannedMatch?.id);
            if (matchIndex < 0) matchIndex = 0;
        }
        const [match] = remainingMatches.splice(matchIndex, 1);
        const deptA = match.participant_a_department_id || null;
        const deptB = match.participant_b_department_id || null;

        let placed = null;
        // Search from current index forward for a free slot
        for (let i = slotIdx; i < slotList.length; i++) {
            const { date, time } = slotList[i];
            const slotKey = `${date}|${time}`;

            // Prefer unique slots; allow reuse only if we run out (handled by outer skip)
            if (occupiedSlots.has(slotKey)) continue;

            let conflict = false;
            for (const deptId of [deptA, deptB].filter(Boolean)) {
                const memKey = `${deptId}|${date}|${time}`;
                if (occupiedByDept.has(memKey)) { conflict = true; break; }
                const row = await findTeamConflict(pool, {
                    departmentId: deptId,
                    date,
                    time,
                    excludeMatchId: match.id,
                    ignoreOpenMatchesInTournamentId: tournamentId,
                });
                if (row) { conflict = true; break; }
            }
            if (conflict) continue;

            placed = { date, time, slotIndex: i };
            break;
        }

        if (!placed) {
            skipped += 1;
            placements.push({ match_id: match.id, skipped: true, reason: 'no_conflict_free_slot' });
            if (plannedRoundRobinMatches) {
                plannedRoundRobinMatches = orderRoundRobinMatches(remainingMatches, scheduledRoundRobinMatches);
            }
            continue;
        }

        const { date, time, slotIndex } = placed;
        let refereeId = match.referee_id || null;
        if (assignOfficers || defaultRefereeId) {
            refereeId = await pickOfficer(pool, date, time, defaultRefereeId || refereeId);
        } else if (defaultRefereeId) {
            refereeId = defaultRefereeId;
        }

        const venueId = defaultVenueId || match.venue_id || null;

        await pool.execute(
            `UPDATE matches
             SET scheduled_date = ?,
                 scheduled_time = ?,
                 venue_id = COALESCE(?, venue_id),
                 referee_id = COALESCE(?, referee_id),
                 status = CASE WHEN status = 'pending' THEN 'scheduled' ELSE status END,
                 updated_at = NOW()
             WHERE id = ?`,
            [date, time, venueId, refereeId, match.id]
        );

        occupiedSlots.add(`${date}|${time}`);
        for (const deptId of [deptA, deptB].filter(Boolean)) {
            occupiedByDept.add(`${deptId}|${date}|${time}`);
        }
        // Advance cursor so earlier slots are preferred for earlier matches
        // but later matches can still use gaps we skipped due to conflicts.
        slotIdx = Math.min(slotIndex + 1, slotList.length);

        scheduled += 1;
        if (tournament.format === 'round_robin') scheduledRoundRobinMatches.push(match);
        placements.push({
            match_id: match.id,
            scheduled_date: date,
            scheduled_time: time,
            venue_id: venueId,
            referee_id: refereeId,
        });
    }

    return {
        scheduled,
        skipped,
        placements,
        slots_available: slotList.length,
        matches_considered: matches.length,
    };
}

module.exports = {
    findTeamConflict,
    rebuildAutoSchedule,
    buildSlotList,
    sortMatchesForSchedule,
    orderRoundRobinMatches,
};