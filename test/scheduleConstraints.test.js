const test = require('node:test');
const assert = require('node:assert/strict');
const { rebuildAutoSchedule } = require('../src/services/scheduleConstraints');

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

function makePool(matches, { failMatchId = null, conflictWhen = null } = {}) {
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

test('round-robin schedules each team with at least one intervening slot', async () => {
    const matches = makeRoundRobinMatches([1, 2, 3, 4]);
    const pool = makePool(matches);
    const times = Array.from({ length: 12 }, (_, index) => `${String(8 + index).padStart(2, '0')}:00`);

    const result = await rebuildAutoSchedule(1, {
        day_plans: [{ date: '2026-10-28', times }],
    }, pool);

    assert.equal(result.scheduled, matches.length);
    assert.equal(pool.commits, 1);
    const slotByTeam = new Map();
    for (const match of matches) {
        const placement = pool.updates.find(update => update.matchId === match.id);
        const slot = Number(placement.time.slice(0, 2)) - 8;
        for (const teamId of [match.participant_a_department_id, match.participant_b_department_id]) {
            const previous = slotByTeam.get(teamId);
            if (previous?.date === placement.date) {
                assert.ok(slot >= previous.index + 2, `department ${teamId} has no rest slot`);
            }
            slotByTeam.set(teamId, { date: placement.date, index: slot });
        }
    }
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