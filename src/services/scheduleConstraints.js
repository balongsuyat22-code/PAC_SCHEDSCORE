const timeToMinutes = (value) => {
    const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

const addMinutes = (hhmm, minutes) => {
    const [h, m] = String(hhmm || '00:00').slice(0, 5).split(':').map(Number);
    const total = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0) + minutes;
    const hh = String(Math.floor(((total % 1440) + 1440) % 1440 / 60)).padStart(2, '0');
    const mm = String(((total % 60) + 60) % 60).padStart(2, '0');
    return `${hh}:${mm}`;
};

const addDays = (isoDate, days) => {
    const d = new Date(`${isoDate}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

function randomizeWithoutConsecutiveTeams(matches, attempts = 200) {
    if (matches.length < 2) return [...matches];

    const teamsFor = (match) => new Set([
        match.participant_a_department_id,
        match.participant_b_department_id,
    ].filter(Boolean));
    const sharesTeam = (left, right) => {
        const rightTeams = teamsFor(right);
        return [...teamsFor(left)].some((teamId) => rightTeams.has(teamId));
    };

    const search = (remaining, order) => {
        if (!remaining.length) return order;

        const previous = order[order.length - 1];
        const available = previous
            ? remaining.filter((match) => !sharesTeam(previous, match))
            : [...remaining];
        available.sort(() => Math.random() - 0.5);

        for (const next of available) {
            const nextRemaining = remaining.filter((match) => match !== next);
            const result = search(nextRemaining, [...order, next]);
            if (result) return result;
        }
        return null;
    };

    for (let attempt = 0; attempt < attempts; attempt++) {
        const result = search([...matches], []);
        if (result) return result;
    }

    return [];
}

async function findTeamConflict(pool, matchId, departmentId, date, start, end) {
    if (!departmentId || !date || !start || !end) return null;
    const [rows] = await pool.execute(
        `SELECT m.id, m.scheduled_time, s.name AS sport_name
         FROM matches m
         JOIN sports s ON s.id = m.sport_id
         WHERE m.id <> ? AND m.status IN ('pending', 'scheduled', 'ongoing')
           AND m.scheduled_date = ?
           AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)
           AND m.scheduled_time IS NOT NULL`,
        [matchId, date, departmentId, departmentId]
    );
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    const conflict = rows.find((row) => {
        const existingStart = timeToMinutes(row.scheduled_time);
        return existingStart != null && startMinutes != null && endMinutes != null &&
            rangesOverlap(startMinutes, endMinutes, existingStart, existingStart + (endMinutes - startMinutes));
    });
    return conflict || null;
}

/**
 * Walks flexible fixtures for a tournament and places each into the first
 * day/time window where findTeamConflict() clears for both sides.
 * Venues/referees are assigned round-robin unless pinned via options.
 * Fixed school blocks have been removed — every pending/scheduled pair is treated as flexible.
 */
async function rebuildAutoSchedule(tournamentId, options = {}, pool) {
    const dayStart = options.dayStart || '08:00';
    const dayEnd = options.dayEnd || '17:00';
    const slotMinutes = options.slotMinutes || 60;

    const [tournamentRows] = await pool.execute(`SELECT * FROM tournaments WHERE id = ?`, [tournamentId]);
    const tournament = tournamentRows[0];
    if (!tournament) throw new Error('Tournament not found.');

    const startDate = options.startDate
        || (tournament.start_date?.toISOString?.().slice(0, 10))
        || String(tournament.start_date || '').slice(0, 10)
        || new Date().toISOString().slice(0, 10);

    const [candidates] = await pool.execute(
        `SELECT m.*, sa.name AS dept_a_name, sb.name AS dept_b_name, s.name AS sport_name
         FROM matches m
         JOIN sports s ON s.id = m.sport_id
         LEFT JOIN departments sa ON sa.id = m.participant_a_department_id
         LEFT JOIN departments sb ON sb.id = m.participant_b_department_id
         WHERE m.tournament_id = ?
           AND m.status IN ('pending', 'scheduled')
           AND m.participant_a_department_id IS NOT NULL
           AND m.participant_b_department_id IS NOT NULL
         ORDER BY m.round_number ASC, m.match_number ASC, m.id ASC`,
        [tournamentId]
    );

    if (!candidates.length) {
        return { scheduled: 0, skipped: 0, conflicts: [], message: 'No flexible fixtures to schedule.' };
    }

    let [venues] = await pool.execute(`SELECT id, name FROM venues ORDER BY id`);
    let [referees] = await pool.execute(
        `SELECT id, first_name, last_name FROM users WHERE role = 'sgo_officer' AND is_active = 1 ORDER BY id`
    );

    if (!venues.length) throw new Error('No venues configured — cannot auto-schedule.');

    if (options.defaultVenueId) {
        const pinned = venues.find((v) => Number(v.id) === Number(options.defaultVenueId));
        if (pinned) venues = [pinned];
    }
    if (options.defaultRefereeId) {
        const pinned = referees.find((r) => Number(r.id) === Number(options.defaultRefereeId));
        if (pinned) referees = [pinned];
    }

    const scheduled = [];
    const conflicts = [];
    let refereeCursor = 0;
    let venueCursor = 0;

    for (const match of candidates) {
        let placed = false;

        for (let dayOffset = 0; dayOffset < 14 && !placed; dayOffset++) {
            const date = addDays(startDate, dayOffset);
            for (
                let slot = dayStart;
                timeToMinutes(slot) + slotMinutes <= timeToMinutes(dayEnd);
                slot = addMinutes(slot, slotMinutes)
            ) {
                const slotEnd = addMinutes(slot, slotMinutes);
                const conflictA = await findTeamConflict(
                    pool, match.id, match.participant_a_department_id, date, slot, slotEnd
                );
                if (conflictA) continue;
                const conflictB = await findTeamConflict(
                    pool, match.id, match.participant_b_department_id, date, slot, slotEnd
                );
                if (conflictB) continue;

                const venue = venues[venueCursor % venues.length];
                venueCursor++;
                const referee = referees.length ? referees[refereeCursor % referees.length] : null;
                if (referee) refereeCursor++;

                await pool.execute(
                    `UPDATE matches
                     SET scheduled_date = ?, scheduled_time = ?, venue_id = ?, referee_id = ?, status = 'scheduled'
                     WHERE id = ?`,
                    [date, slot, venue.id, referee ? referee.id : null, match.id]
                );

                scheduled.push({
                    matchId: match.id,
                    date,
                    time: slot,
                    venue: venue.name,
                    referee: referee ? `${referee.first_name} ${referee.last_name}` : null,
                });
                placed = true;
                break;
            }
        }

        if (!placed) {
            conflicts.push({
                matchId: match.id,
                reason: `No conflict-free slot found for ${match.dept_a_name || 'Side A'} vs ${match.dept_b_name || 'Side B'} within the scheduling window.`,
            });
        }
    }

    return {
        scheduled: scheduled.length,
        skipped: conflicts.length,
        conflicts,
        details: scheduled,
    };
}

module.exports = {
    findTeamConflict,
    randomizeWithoutConsecutiveTeams,
    timeToMinutes,
    rebuildAutoSchedule,
};