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

/** Group participants by their division (or '__none__' if missing). */
function groupByDivision(participants) {
    const groups = new Map();
    for (const p of participants) {
        const key = (p.division && String(p.division).trim()) || '__none__';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
    }
    return groups;
}

function divisionSortPriority(key) {
    const normalized = String(key || '').trim().toLowerCase();
    if (!normalized || normalized === '__none__') return 99;
    const priority = { junior_high: 0, junior: 0, senior_high: 1, senior: 1 };
    return priority[normalized] ?? 50;
}

function sortDivisionEntries(entries) {
    return [...entries].sort(([leftKey, leftGroup], [rightKey, rightGroup]) => {
        const pLeft = divisionSortPriority(leftKey);
        const pRight = divisionSortPriority(rightKey);
        if (pLeft !== pRight) return pLeft - pRight;
        return String(leftKey).localeCompare(String(rightKey));
    });
}

function divisionLabel(key) {
    if (!key || key === '__none__') return '';
    return String(key)
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

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

    // Opt-out of auto-split when tournament is marked manual (bracket_mode = 'manual')
    // or when the caller explicitly passes a single-group override.
    const manualMode = tournament.bracket_mode === 'manual' || tournament._forceSingleBracket === true;
    const SPLITTABLE = new Set(['round_robin', 'single_elimination', 'double_elimination']);
    const groups = groupByDivision(participants);

    if (SPLITTABLE.has(format) && !manualMode && groups.size > 1) {
        let matchNum = 1;
        for (const [key, group] of sortDivisionEntries(groups.entries())) {
            if (group.length < 2) continue;
            const label = divisionLabel(key);
            const divisionTournament = { ...tournament, _labelPrefix: label };
            if (format === 'round_robin') {
                matchNum = await generateRoundRobin(divisionTournament, group, pool, matchNum);
            } else if (format === 'single_elimination') {
                const result = await generateSingleElimination(divisionTournament, group, pool, matchNum);
                matchNum = result.nextMatchNum;
            } else if (format === 'double_elimination') {
                const result = await generateDoubleElimination(divisionTournament, group, pool, matchNum);
                matchNum = result.nextMatchNum;
            }
        }
        return;
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

/**
 * Division Gauntlet — no longer requires specific department names or an exhibition team.
 * Builds a double-elimination bracket per division that actually exists among participants.
 * Exhibition teams are optional (used only if present).
 */
const generateDivisionGauntlet = async (tournament, participants, pool) => {
    const competitive = participants.filter((p) => Number(p.is_exhibition) !== 1);
    const groups = groupByDivision(competitive);

    if (groups.size < 2) {
        // Only one (or zero) division → fall back to a normal double-elim rather than failing
        return generateDoubleElimination(tournament, competitive.length ? competitive : participants, pool);
    }

    let matchNum = 1;
    for (const [key, group] of sortDivisionEntries(groups.entries())) {
        if (group.length < 2) continue; // skip divisions that can't form matches
        const label = divisionLabel(key);
        const divisionTournament = { ...tournament, _labelPrefix: label };
        const result = await generateDoubleElimination(divisionTournament, group, pool, matchNum);
        matchNum = result.nextMatchNum;
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

const generateRoundRobin = async (tournament, participants, pool, startMatchNum = 1) => {
    const list = [...participants];
    const n = list.length;
    const prefix = tournament._labelPrefix ? `${tournament._labelPrefix} · ` : '';

    if (n % 2 !== 0) list.push(null);

    const slots = list.length;
    const totalRounds = slots - 1;
    let matchNum = startMatchNum;

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
                round + 1, matchNum++, `${prefix}R${round + 1}`,
                a.department_id, b.department_id,
            ]
            );
        }

        const rotating = list.slice(1);
        rotating.unshift(rotating.pop());
        list.splice(1, rotating.length, ...rotating);
    }
    return matchNum;
};

const generateSingleElimination = async (tournament, participants, pool, startMatchNum = 1) => {
    const n = participants.length;
    const bracketSize = nextPowerOf2(n);
    const prefix = tournament._labelPrefix ? `${tournament._labelPrefix} · ` : '';

    const seeded = [...participants];
    while (seeded.length < bracketSize) seeded.push(null);

    const pairs = [];
    for (let i = 0; i < bracketSize / 2; i++) {
        pairs.push([seeded[i], seeded[bracketSize - 1 - i]]);
    }

    const totalRounds = Math.log2(bracketSize);
    let matchNum = startMatchNum;
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
            matchNum++, `${prefix}R1M${i + 1}`,
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
                ? `${prefix}Final`
                : isSemi
                    ? `${prefix}SF${Math.floor(i / 2) + 1}`
                    : isQuarter
                        ? `${prefix}QF${Math.floor(i / 2) + 1}`
                        : `${prefix}R${round}M${Math.floor(i / 2) + 1}`;

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
             VALUES (?, ?, ?, ?, ?, 'scheduled')`,
            [tournament.id, tournament.sport_id, totalRounds, matchNum++, `${prefix}3rd Place`]
        );
    }

    return { nextMatchNum: matchNum };
};

const generateDoubleElimination = async (tournament, participants, pool, startMatchNum = 1) => {
    const seResult = await generateSingleElimination(tournament, participants, pool, startMatchNum);
    let matchNum = seResult.nextMatchNum;

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
    const prefix = tournament._labelPrefix ? `${tournament._labelPrefix} · ` : '';

    for (let round = 1; round <= lowerRounds; round++) {
        const matchesInRound = Math.ceil(bracketSize / Math.pow(2, Math.ceil(round / 2) + 1));
        for (let i = 0; i < matchesInRound; i++) {
            await pool.execute(
                `INSERT INTO matches
                 (tournament_id, sport_id, round_number, match_number,
                  bracket_position, bracket_side, status)
                 VALUES (?, ?, ?, ?, ?, 'lower', 'pending')`,
                [tournament.id, tournament.sport_id, round, matchNum++, `${prefix}LR${round}M${i + 1}`]
            );
        }
    }

    await pool.execute(
        `INSERT INTO matches
         (tournament_id, sport_id, round_number, match_number,
          bracket_position, bracket_side, status)
         VALUES (?, ?, 999, ?, ?, 'grand_final', 'pending')`,
        [tournament.id, tournament.sport_id, matchNum++, `${prefix}Grand Final`]
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

    for (let i = 0; i < upperRounds.length - 1; i++) {
        const upperRoundNumber = upperRounds[i];
        const upperRound = upper.filter((m) => m.round_number === upperRoundNumber && !String(m.bracket_position || '').includes('3rd Place'));
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
        .filter((m) => m.round_number === Math.max(...upperRounds) && !String(m.bracket_position || '').includes('3rd Place'))
        .sort((a, b) => a.match_number - b.match_number)[0];
    const lowerFinal = lowerRoundsByNumber.get(Math.max(...lowerRoundsByNumber.keys()))?.[0];
    const [grandFinal] = await pool.execute(
        `SELECT id FROM matches WHERE tournament_id = ? AND bracket_side = 'grand_final' ORDER BY id DESC LIMIT 1`,
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

    return { nextMatchNum: matchNum };
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

module.exports = { generateBracket, generateKnockoutFromGroups, VALID_FORMATS, sortDivisionEntries };