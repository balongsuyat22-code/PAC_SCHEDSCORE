const test = require('node:test');
const assert = require('node:assert/strict');
const {
    rebuildAutoSchedule,
    orderRoundRobinMatches,
} = require('../src/services/scheduleConstraints');

function makeRoundRobinMatches(teamIds) {
    const matches = [];
    let id = 1;
    for (let a = 0; a < teamIds.length; a++) {
        for (let b = a + 1; b < teamIds.length; b++) {
            matches.push({
                id: id++,
                round_number: 1,
                match_number: id,
                participant_a_department_id: teamIds[a],
                participant_b_department_id: teamIds[b],
                status: 'pending',
            });
        }
    }
    return matches;
}

function makePool(matches, { failMatchId = null, conflictWhen = null, staleScheduleConflict = false } = {}) {
    const updates = [];
    let rollbacks = 0;
    let commits = 0;
    const connection = {
        beginTransaction: async () => {},
        commit: async () => { commits++; },
        rollback: async () => { rollbacks++; updates.length = 0; },
        release: () => {},
        execute: async (sql, params = []) => {
            if (sql.includes('FROM tournaments')) return [[{ id: 1, format: 'round_robin' }]];
            if (sql.includes('FROM matches m') && sql.includes('WHERE m.tournament_id')) return [matches];
            if (sql.includes('SELECT id, tournament_id')) {
                if (staleScheduleConflict && !sql.includes("AND NOT (tournament_id = ? AND status IN ('pending', 'scheduled'))")) {
                    return [[{ id: 99 }]];
                }
                return conflictWhen?.(params) ? [[{ id: 99 }]] : [[]];
            }
            if (sql.includes('UPDATE matches')) {
                const matchId = params[params.length - 1];
                if (matchId === failMatchId) throw new Error('simulated update failure');
                updates.push({ matchId, date: params[0], time: params[1] });
                return [{ affectedRows: 1 }];
            }
            throw new Error(`Unexpected SQL in test: ${sql}`);
        },
    };
    return {
        updates,
        get rollbacks() { return rollbacks; },
        get commits() { return commits; },
        getConnection: async () => connection,
        execute: (...args) => connection.execute(...args),
    };
}

test('round-robin prefers disjoint matches and prevents three-match team streaks', async () => {
    const matches = makeRoundRobinMatches([1, 2, 3, 4]);
    const pool = makePool(matches);
    const times = Array.from({ length: 24 }, (_, index) => {
        const start = 8 * 60 + index * 30;
        return `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    });

    const result = await rebuildAutoSchedule(1, {
        day_plans: [{ date: '2026-10-28', times }],
    }, pool);

    assert.equal(result.scheduled, matches.length);
    assert.equal(pool.commits, 1);
    const matchesById = new Map(matches.map(match => [match.id, match]));
    const orderedMatches = result.placements.map(placement => matchesById.get(placement.match_id));
    const teamsIn = match => new Set([
        match.participant_a_department_id,
        match.participant_b_department_id,
    ].filter(Boolean));

    assert.equal(
        [...teamsIn(orderedMatches[0])].some(teamId => teamsIn(orderedMatches[1]).has(teamId)),
        false,
        'the first two matches should not share a department when a disjoint pair exists'
    );

    for (let index = 2; index < orderedMatches.length; index++) {
        const currentTeams = teamsIn(orderedMatches[index]);
        const previousTeams = teamsIn(orderedMatches[index - 1]);
        const twoBackTeams = teamsIn(orderedMatches[index - 2]);
        assert.equal(
            [...currentTeams].some(teamId => previousTeams.has(teamId) && twoBackTeams.has(teamId)),
            false,
            `department appears in three consecutive matches ending at index ${index}`
        );
        }
});

test('round-robin ordering avoids three-match streaks for larger tournaments', () => {
    const teamsIn = match => new Set([
        match.participant_a_department_id,
        match.participant_b_department_id,
    ].filter(Boolean));

    for (const teamCount of [4, 8, 12, 16]) {
        const ordered = orderRoundRobinMatches(makeRoundRobinMatches(
            Array.from({ length: teamCount }, (_, index) => index + 1)
        ));

        for (let index = 1; index < ordered.length; index++) {
            const previousTeams = teamsIn(ordered[index - 1]);
            const currentTeams = teamsIn(ordered[index]);
            const disjointAlternativeRemains = ordered.slice(index).some(match =>
                [...teamsIn(match)].every(teamId => !previousTeams.has(teamId))
            );
            if (disjointAlternativeRemains) {
                assert.equal(
                    [...currentTeams].some(teamId => previousTeams.has(teamId)),
                    false,
                    `${teamCount} teams: selected an avoidable adjacent department repeat at ${index}`
                );
            }
        }

        for (let index = 2; index < ordered.length; index++) {
            const currentTeams = teamsIn(ordered[index]);
            const previousTeams = teamsIn(ordered[index - 1]);
            const twoBackTeams = teamsIn(ordered[index - 2]);
            assert.equal(
                [...currentTeams].some(teamId => previousTeams.has(teamId) && twoBackTeams.has(teamId)),
                false,
                `${teamCount} teams: department appears in three consecutive matches at ${index}`
            );
        }
    }
});

test('round-robin replans after a conflicting fixture is skipped', async () => {
    const matches = makeRoundRobinMatches([1, 2, 3, 4]);
    const pool = makePool(matches, {
        conflictWhen: ([departmentId]) => departmentId === 1,
    });
    const times = Array.from({ length: 8 }, (_, index) => `${String(8 + index).padStart(2, '0')}:00`);

    const result = await rebuildAutoSchedule(1, {
        day_plans: [{ date: '2026-10-28', times }],
    }, pool);

    assert.equal(result.scheduled, 3);
    assert.equal(result.skipped, 3);
    const matchesById = new Map(matches.map(match => [match.id, match]));
    const orderedMatches = result.placements
        .filter(placement => !placement.skipped)
        .map(placement => matchesById.get(placement.match_id));
    const teamsIn = match => new Set([
        match.participant_a_department_id,
        match.participant_b_department_id,
    ].filter(Boolean));
    for (let index = 2; index < orderedMatches.length; index++) {
        const currentTeams = teamsIn(orderedMatches[index]);
        const previousTeams = teamsIn(orderedMatches[index - 1]);
        const twoBackTeams = teamsIn(orderedMatches[index - 2]);
        assert.equal(
            [...currentTeams].some(teamId => previousTeams.has(teamId) && twoBackTeams.has(teamId)),
            false
        );
    }
});

test('scheduler can reschedule fixtures that already have stale scheduled times', async () => {
    const matches = makeRoundRobinMatches([1, 2, 3]).map(match => ({ ...match, status: 'scheduled' }));
    const pool = makePool(matches, { staleScheduleConflict: true });

    const result = await rebuildAutoSchedule(1, {
        day_plans: [{ date: '2026-10-28', times: ['09:00', '10:00', '11:00', '12:00', '13:00'] }],
    }, pool);

    assert.equal(result.scheduled, matches.length);
    assert.equal(result.skipped, 0);
    assert.equal(pool.updates.length, matches.length);
});

test('scheduler uses the exact per-day plans supplied by the UI', async () => {
    const matches = makeRoundRobinMatches([1, 2]);
    const pool = makePool(matches, {
        conflictWhen: ([, , date]) => date === '2026-10-28',
    });

    const result = await rebuildAutoSchedule(1, {
        day_plans: [
            { date: '2026-10-28', times: ['09:00'] },
            { date: '2026-10-30', times: ['13:00'] },
        ],
    }, pool);

    assert.equal(result.scheduled, 1);
    assert.deepEqual(pool.updates.map(({ date, time }) => ({ date, time })), [
        { date: '2026-10-30', time: '13:00' },
    ]);
    assert.equal(pool.commits, 1);
});

test('scheduler rolls back every update when one match write fails', async () => {
    const matches = makeRoundRobinMatches([1, 2, 3]);
    const pool = makePool(matches, { failMatchId: 2 });

    await assert.rejects(rebuildAutoSchedule(1, {
        day_plans: [{ date: '2026-10-28', times: ['09:00', '10:00', '11:00', '12:00', '13:00'] }],
    }, pool), /simulated update failure/);

    assert.equal(pool.rollbacks, 1);
    assert.equal(pool.commits, 0);
    assert.deepEqual(pool.updates, []);
});