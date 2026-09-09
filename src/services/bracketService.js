
const VALID_FORMATS = [
    'round_robin',
    'single_elimination',
    'double_elimination',
    'free_for_all',
    'team_ranking',
    'group_stage_se',
    'group_stage_de',
    'group_stage_ffa',
    'division_gauntlet',
];


const generateBracket = async (tournament, participants, pool) => {

    const format = (tournament.format || '').trim();

    if (!format) {
        throw new Error(
            `Tournament "${tournament.name}" has no format set. ` +
            `Please edit the tournament and choose a format before generating a bracket. ` +
            `Valid formats: ${VALID_FORMATS.join(', ')}`
        );
    }

    if (!VALID_FORMATS.includes(format)) {
        throw new Error(
            `Unknown tournament format: "${format}". ` +
            `Valid formats: ${VALID_FORMATS.join(', ')}`
        );
    }


    if (!participants || participants.length < 2) {
        throw new Error(
            `Need at least 2 participants to generate a bracket. ` +
            `Currently have ${participants ? participants.length : 0}.`
        );
    }

    switch (format) {
        case 'round_robin':
            return generateRoundRobin(tournament, participants, pool);

        case 'single_elimination':
            return generateSingleElimination(tournament, participants, pool);

        case 'double_elimination':
            return generateDoubleElimination(tournament, participants, pool);

        case 'free_for_all':
        case 'team_ranking':
            return generateFreeForAll(tournament, participants, pool);


        case 'group_stage_se':
            return generateGroupStage(tournament, participants, pool, 'single_elimination');

        case 'group_stage_de':
            return generateGroupStage(tournament, participants, pool, 'double_elimination');

        case 'group_stage_ffa':
            return generateGroupStage(tournament, participants, pool, 'free_for_all');

        case 'division_gauntlet':
            return generateDivisionGauntlet(tournament, participants, pool);

        default:
            throw new Error(`Unhandled format: "${format}"`);
    }
};

const generateDivisionGauntlet = async (tournament, participants, pool) => {
    const junior = participants.filter((p) => String(p.division || '').toLowerCase() === 'junior_high');
    const senior = participants.filter((p) => String(p.division || '').toLowerCase() === 'senior_high');
    const nightOwls = senior.find((p) => Number(p.is_exhibition) === 1);
    const juniorTeams = junior.filter((p) => Number(p.is_exhibition) !== 1);
    const seniorTeams = senior.filter((p) => Number(p.is_exhibition) !== 1);

    if (juniorTeams.length !== 4 || seniorTeams.length !== 4 || !nightOwls) {
        throw new Error('Division Gauntlet needs 4 Junior High teams, 4 Senior High teams, and one Senior High exhibition team.');
    }

    const matches = [
        ['Day 2 · Junior High · Game 1', juniorTeams[0], juniorTeams[1]],
        ['Day 2 · Junior High · Game 2', juniorTeams[2], juniorTeams[3]],
        ['Day 2 · Senior High · Game 3', seniorTeams[0], seniorTeams[1]],
        ['Day 2 · Senior High · Game 4', seniorTeams[2], seniorTeams[3]],
        ['Day 3 · Junior High · Loser vs Loser', null, null],
        ['Day 3 · Junior High · Winner vs Winner', null, null],
        ['Day 3 · Junior High · Loser vs Winner', null, null],
        ['Day 3 · Senior High · Night Owls Entry', null, nightOwls],
        ['Day 3 · Senior High · Loser vs Loser', null, null],
        ['Day 3 · Senior High · Winner vs Winner', null, null],
        ['Day 4 · Junior High · Grand Final', null, null],
        ['Day 4 · Senior High · Grand Final', null, null],
    ];
    const ids = [];
    for (let i = 0; i < matches.length; i++) {
        const [label, a, b] = matches[i];
        const [result] = await pool.execute(
            `INSERT INTO matches
             (tournament_id, sport_id, round_number, match_number, bracket_position,
              bracket_side, participant_a_department_id, participant_b_department_id, status)
             VALUES (?, ?, ?, ?, ?, 'division_gauntlet', ?, ?, ?)`,
            [tournament.id, tournament.sport_id, i < 4 ? 1 : i < 10 ? 2 : 3, i + 1,
                label, a?.department_id || null, b?.department_id || null,
            a && b ? 'scheduled' : 'pending']
        );
        ids.push(result.insertId);
    }
    const links = [
        [0, 4, 'a', 'loser'], [1, 4, 'b', 'loser'], [0, 5, 'a', 'winner'], [1, 5, 'b', 'winner'],
        [5, 6, 'a', 'loser'], [4, 6, 'b', 'winner'], [3, 7, 'a', 'winner'],
        [2, 8, 'a', 'loser'], [3, 8, 'b', 'loser'], [2, 9, 'a', 'winner'], [7, 9, 'b', 'winner'],
        [5, 10, 'a', 'winner'], [6, 10, 'b', 'winner'], [9, 11, 'a', 'winner'], [8, 11, 'b', 'winner'],
    ];
    for (const [source, target, slot, resultType] of links) {
        const column = resultType === 'loser' ? 'loser_next_match_id' : 'next_match_id';
        const slotColumn = resultType === 'loser' ? 'loser_next_match_slot' : 'next_match_slot';
        await pool.execute(
            `UPDATE matches SET ${column} = ?, ${slotColumn} = ? WHERE id = ?`,
            [ids[target], slot, ids[source]]
        );
    }
};


const generateFreeForAll = async (tournament, participants, pool) => {
    const list = [...participants];
    const n = list.length;
    let matchNum = 1;


    for (const p of participants) {
        await pool.execute(
            `INSERT IGNORE INTO round_robin_standings
             (tournament_id, department_id, standing_points)
             VALUES (?, ?, 0)`, [tournament.id, p.department_id]
        );
    }


    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = list[i];
            const b = list[j];

            await pool.execute(
                `INSERT INTO matches
                 (tournament_id, sport_id, round_number, match_number, bracket_position,
                  participant_a_department_id, participant_b_department_id,
                  bracket_side, status)
                 VALUES (?, ?, 1, ?, ?, ?, ?, 'group', 'scheduled')`, [
                tournament.id, tournament.sport_id,
                matchNum,
                `FFA-${matchNum}`,
                a.department_id, b.department_id,
            ]
            );
            matchNum++;
        }
    }
};


const generateRoundRobin = async (tournament, participants, pool) => {
    const list = [...participants];
    const n = list.length;


    if (n % 2 !== 0) list.push(null);

    const slots = list.length;
    const totalRounds = slots - 1;
    let matchNum = 1;


    for (const p of participants) {
        await pool.execute(
            `INSERT IGNORE INTO round_robin_standings
             (tournament_id, department_id, standing_points)
             VALUES (?, ?, 0)`,
            [tournament.id, p.department_id]
        );
    }

    for (let round = 0; round < totalRounds; round++) {
        for (let i = 0; i < slots / 2; i++) {
            const a = list[i];
            const b = list[slots - 1 - i];
            if (!a || !b) continue;

            await pool.execute(
                `INSERT INTO matches
                 (tournament_id, sport_id, round_number, match_number, bracket_position,
                  participant_a_department_id, participant_b_department_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`, [
                tournament.id, tournament.sport_id,
                round + 1, matchNum++, `R${round + 1}`,
                a.department_id, b.department_id,
            ]
            );
        }


        const rotating = list.slice(1);
        rotating.unshift(rotating.pop());
        list.splice(1, rotating.length, ...rotating);
    }
};


const generateSingleElimination = async (tournament, participants, pool) => {
    const n = participants.length;
    const bracketSize = nextPowerOf2(n);


    const seeded = [...participants];
    while (seeded.length < bracketSize) seeded.push(null);


    const pairs = [];
    for (let i = 0; i < bracketSize / 2; i++) {
        pairs.push([seeded[i], seeded[bracketSize - 1 - i]]);
    }

    const totalRounds = Math.log2(bracketSize);
    let matchNum = 1;
    const insertedMatches = {};
    insertedMatches[1] = [];


    for (let i = 0; i < pairs.length; i++) {
        const [a, b] = pairs[i];
        const isBye = !a || !b;
        const winner = a || b;

        const [result] = await pool.execute(
            `INSERT INTO matches
             (tournament_id, sport_id, round_number, match_number, bracket_position,
              participant_a_department_id, participant_b_department_id, status)
             VALUES (?, ?, 1, ?, ?, ?, ?, ?)`, [
            tournament.id, tournament.sport_id,
            matchNum++, `R1M${i + 1}`,
            a ? a.department_id : null,
            b ? b.department_id : null,
            isBye ? 'walkover' : 'scheduled',
        ]
        );
        const matchId = result.insertId;
        insertedMatches[1].push(matchId);


        if (isBye && winner) {
            await pool.execute(
                `UPDATE matches
                 SET winner_department_id = ?,
                     status               = 'completed',
                     completed_at         = NOW()
                 WHERE id = ?`, [winner.department_id, matchId]
            );
        }
    }

    for (let round = 2; round <= totalRounds; round++) {
        const prev = insertedMatches[round - 1];
        insertedMatches[round] = [];

        const isFinal = round === totalRounds;
        const isSemi = round === totalRounds - 1;
        const isQuarter = round === totalRounds - 2;

        for (let i = 0; i < prev.length; i += 2) {
            const label = isFinal
                ? 'Final'
                : isSemi
                    ? `SF${Math.floor(i / 2) + 1}`
                    : isQuarter
                        ? `QF${Math.floor(i / 2) + 1}`
                        : `R${round}M${Math.floor(i / 2) + 1}`;

            const [res] = await pool.execute(
                `INSERT INTO matches
                 (tournament_id, sport_id, round_number, match_number, bracket_position, status)
                 VALUES (?, ?, ?, ?, ?, 'scheduled')`,
                [tournament.id, tournament.sport_id, round, matchNum++, label]
            );
            const newMatchId = res.insertId;
            insertedMatches[round].push(newMatchId);
        }
    }

    for (let round = 1; round < totalRounds; round++) {
        const currentMatches = insertedMatches[round];
        const nextMatches = insertedMatches[round + 1];
        for (let i = 0; i < currentMatches.length; i++) {
            await pool.execute(
                `UPDATE matches
                 SET next_match_id = ?, next_match_slot = ?
                 WHERE id = ?`,
                [nextMatches[Math.floor(i / 2)], i % 2 === 0 ? 'a' : 'b', currentMatches[i]]
            );
        }
    }


    if (totalRounds >= 2) {
        await pool.execute(
            `INSERT INTO matches
             (tournament_id, sport_id, round_number, match_number, bracket_position, status)
             VALUES (?, ?, ?, ?, '3rd Place', 'scheduled')`, [tournament.id, tournament.sport_id, totalRounds, matchNum++]
        );
    }
};

const generateDoubleElimination = async (tournament, participants, pool) => {
    await generateSingleElimination(tournament, participants, pool);

    await pool.execute(
        `UPDATE matches
         SET status = 'pending'
         WHERE tournament_id = ?
           AND bracket_side IS NULL
           AND participant_a_department_id IS NULL
           AND participant_b_department_id IS NULL
           AND status = 'scheduled'`,
        [tournament.id]
    );

    const n = participants.length;
    const bracketSize = nextPowerOf2(n);
    const lowerRounds = (Math.log2(bracketSize) - 1) * 2;

    let matchNum = 1000;

    for (let round = 1; round <= lowerRounds; round++) {
        const matchesInRound = Math.ceil(bracketSize / Math.pow(2, Math.ceil(round / 2) + 1));
        for (let i = 0; i < matchesInRound; i++) {
            await pool.execute(
                `INSERT INTO matches
                 (tournament_id, sport_id, round_number, match_number,
                  bracket_position, bracket_side, status)
                 VALUES (?, ?, ?, ?, ?, 'lower', 'pending')`, [tournament.id, tournament.sport_id, round, matchNum++, `LR${round}M${i + 1}`]
            );
        }
    }


    await pool.execute(
        `INSERT INTO matches
         (tournament_id, sport_id, round_number, match_number,
          bracket_position, bracket_side, status)
         VALUES (?, ?, 999, 9999, 'Grand Final', 'grand_final', 'pending')`,
        [tournament.id, tournament.sport_id]
    );

    const [upper] = await pool.execute(
        `SELECT id, round_number, match_number
         FROM matches
         WHERE tournament_id = ? AND bracket_side IS NULL
         ORDER BY round_number, match_number`,
        [tournament.id]
    );
    const [lower] = await pool.execute(
        `SELECT id, round_number, match_number
         FROM matches
         WHERE tournament_id = ? AND bracket_side = 'lower'
         ORDER BY round_number, match_number`,
        [tournament.id]
    );

    const upperRounds = [...new Set(upper.map((m) => m.round_number))].sort((a, b) => a - b);
    const lowerRoundsByNumber = new Map();
    lower.forEach((match) => {
        if (!lowerRoundsByNumber.has(match.round_number)) lowerRoundsByNumber.set(match.round_number, []);
        lowerRoundsByNumber.get(match.round_number).push(match);
    });

    // Lower winners advance round by round. The first lower round feeds one
    // match per winner into the next round; later rounds pair winners.
    for (const [roundIndex, roundNumber] of [...lowerRoundsByNumber.keys()].sort((a, b) => a - b).entries()) {
        const current = lowerRoundsByNumber.get(roundNumber);
        const next = [...lowerRoundsByNumber.values()][roundIndex + 1];
        if (!next) continue;
        for (let i = 0; i < current.length; i++) {
            const target = next[roundNumber === 1 ? i : Math.floor(i / 2)];
            if (!target) continue;
            await pool.execute(
                `UPDATE matches SET next_match_id = ?, next_match_slot = ? WHERE id = ?`,
                [target.id, roundNumber === 1 ? 'a' : (i % 2 === 0 ? 'a' : 'b'), current[i].id]
            );
        }
    }

    // Upper losers enter the lower bracket. Round 1 losers pair together;
    // later upper-round losers enter the matching lower round's open slot.
    for (let i = 0; i < upperRounds.length - 1; i++) {
        const upperRoundNumber = upperRounds[i];
        const upperRound = upper.filter((m) => m.round_number === upperRoundNumber && m.bracket_position !== '3rd Place');
        const lowerRoundNumber = upperRoundNumber === upperRounds[0]
            ? 1
            : upperRoundNumber === upperRounds[upperRounds.length - 2]
                ? Math.max(...lowerRoundsByNumber.keys())
                : upperRoundNumber;
        const lowerRound = lowerRoundsByNumber.get(lowerRoundNumber) || [];

        for (let j = 0; j < upperRound.length; j++) {
            const target = lowerRound[Math.floor(j / 2)];
            if (!target) continue;
            await pool.execute(
                `UPDATE matches SET loser_next_match_id = ?, loser_next_match_slot = ? WHERE id = ?`,
                [target.id, upperRoundNumber === upperRounds[0] ? (j % 2 === 0 ? 'a' : 'b') : 'b', upperRound[j].id]
            );
        }
    }

    const upperFinal = upper
        .filter((m) => m.round_number === Math.max(...upperRounds) && m.bracket_position !== '3rd Place')
        .sort((a, b) => a.match_number - b.match_number)[0];
    const lowerFinal = lowerRoundsByNumber.get(Math.max(...lowerRoundsByNumber.keys()))?.[0];
    const [grandFinal] = await pool.execute(
        `SELECT id FROM matches WHERE tournament_id = ? AND bracket_side = 'grand_final' LIMIT 1`,
        [tournament.id]
    );
    if (upperFinal && lowerFinal) {
        await pool.execute(
            `UPDATE matches SET loser_next_match_id = ?, loser_next_match_slot = 'b' WHERE id = ?`,
            [lowerFinal.id, upperFinal.id]
        );
    }
    if (grandFinal?.length && upperFinal) {
        await pool.execute(
            `UPDATE matches SET next_match_id = ?, next_match_slot = 'a' WHERE id = ?`,
            [grandFinal[0].id, upperFinal.id]
        );
    }
    if (grandFinal?.length && lowerFinal) {
        await pool.execute(
            `UPDATE matches SET next_match_id = ?, next_match_slot = 'b' WHERE id = ?`,
            [grandFinal[0].id, lowerFinal.id]
        );
    }
};


const generateGroupStage = async (tournament, participants, pool, knockoutFormat) => {
    const groupCount = tournament.group_count || 2;
    const advancePerGroup = tournament.advance_per_group || 2;
    let matchNum = 1;


    const groups = Array.from({ length: groupCount }, () => []);
    participants.forEach((p, i) => groups[i % groupCount].push(p));


    for (const p of participants) {
        await pool.execute(
            `INSERT IGNORE INTO round_robin_standings
             (tournament_id, department_id, standing_points)
             VALUES (?, ?, 0)`, [tournament.id, p.department_id]
        );
    }


    for (let g = 0; g < groups.length; g++) {
        const groupLetter = String.fromCharCode(65 + g);
        const list = [...groups[g]];
        const n = list.length;

        if (n < 2) continue;

        if (n % 2 !== 0) list.push(null);
        const slots = list.length;
        const totalRounds = slots - 1;

        for (let round = 0; round < totalRounds; round++) {
            for (let i = 0; i < slots / 2; i++) {
                const a = list[i];
                const b = list[slots - 1 - i];
                if (!a || !b) continue;

                await pool.execute(
                    `INSERT INTO matches
                     (tournament_id, sport_id, round_number, match_number, bracket_position,
                      participant_a_department_id, participant_b_department_id,
                      bracket_side, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'group', 'scheduled')`, [
                    tournament.id, tournament.sport_id,
                    round + 1, matchNum++,
                    `G${groupLetter}R${round + 1}`,
                    a.department_id, b.department_id,
                ]
                );
            }


            const rotating = list.slice(1);
            rotating.unshift(rotating.pop());
            list.splice(1, rotating.length, ...rotating);
        }
    }

    const advancingCount = groupCount * advancePerGroup;


    if (advancingCount >= 2) {
        await pool.execute(
            `INSERT INTO matches
             (tournament_id, sport_id, round_number, match_number,
              bracket_position, bracket_side, status)
             VALUES (?, ?, 0, 0, 'KNOCKOUT_PENDING', 'knockout_pending', 'pending')`, [tournament.id, tournament.sport_id]
        );
    }
};

const generateKnockoutFromGroups = async (tournament, advancingParticipants, pool) => {

    await pool.execute(
        `DELETE FROM matches
         WHERE tournament_id = ? AND bracket_side = 'knockout_pending'`,
        [tournament.id]
    );

    const knockoutFormat = {
        group_stage_se: 'single_elimination',
        group_stage_de: 'double_elimination',
        group_stage_ffa: 'free_for_all',
    }[tournament.format] || 'single_elimination';


    const tournamentOverride = { ...tournament, format: knockoutFormat };

    switch (knockoutFormat) {
        case 'single_elimination':
            return generateSingleElimination(tournamentOverride, advancingParticipants, pool);
        case 'double_elimination':
            return generateDoubleElimination(tournamentOverride, advancingParticipants, pool);
        case 'free_for_all':
            return generateFreeForAll(tournamentOverride, advancingParticipants, pool);
    }
};


const nextPowerOf2 = (n) => {
    if (n < 2) return 2;
    let p = 1;
    while (p < n) p *= 2;
    return p;
};

module.exports = { generateBracket, generateKnockoutFromGroups, VALID_FORMATS };