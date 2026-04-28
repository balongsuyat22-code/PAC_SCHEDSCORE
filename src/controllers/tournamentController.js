const { pool } = require('../config/database');
const { progressBracket } = require('../services/matchService');
const { logActivity } = require('../utils/logger');


const safeFK = (val) => {
    const n = parseInt(val);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const safeDate = (val) => {
    if (!val) return null;
    return String(val).split('T')[0];
};

const VALID_FORMATS = [
    'round_robin', 'single_elimination', 'double_elimination',
    'free_for_all', 'team_ranking',
    'group_stage_se', 'group_stage_de', 'group_stage_ffa'
];

const SCORING = {
    getPointsForRank: (rank) => {
        const points = [10, 7, 5, 3];
        return rank <= points.length ? points[rank - 1] : 2;
    },
    getMedalForRank: (rank) => {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return null;
    }
};


const reRankFFAResults = async (conn, tournamentId) => {
    const [[t]] = await conn.execute(
        'SELECT ffa_scoring FROM tournaments WHERE id = ?',
        [tournamentId]
    );

    const isTimeBased = t && t.ffa_scoring === 'time';
    const orderDir = isTimeBased ? 'ASC' : 'DESC';

    const [results] = await conn.execute(
        `SELECT id, result_value FROM ffa_results 
         WHERE tournament_id = ?
         ORDER BY result_value ${orderDir}`,
        [tournamentId]
    );

    if (results.length === 0) return;

    let currentRank = 1;
    for (let i = 0; i < results.length; i++) {
        if (i > 0 && results[i].result_value !== results[i - 1].result_value) {
            currentRank = i + 1;
        }
        await conn.execute(
            'UPDATE ffa_results SET rank_position = ? WHERE id = ?',
            [currentRank, results[i].id]
        );
    }
};


const generateSingleEliminationBracket = async (tournament, participants, conn) => {
    const participantIds = participants.map(p => p.department_id);
    const totalParticipants = participantIds.length;
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalParticipants)));
    const byes = nextPowerOfTwo - totalParticipants;


    let matchNumber = 1;
    let roundNumber = 1;
    let currentParticipants = [...participantIds];


    for (let i = 0; i < byes; i++) {
        currentParticipants.push(null);
    }


    for (let i = currentParticipants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentParticipants[i], currentParticipants[j]] = [currentParticipants[j], currentParticipants[i]];
    }


    const matches = [];
    for (let i = 0; i < currentParticipants.length; i += 2) {
        const participantA = currentParticipants[i];
        const participantB = currentParticipants[i + 1];


        if (participantA === null && participantB === null) continue;

        matches.push({
            tournament_id: tournament.id,
            sport_id: tournament.sport_id,
            round_number: roundNumber,
            match_number: matchNumber++,
            bracket_position: `R${roundNumber}M${Math.floor((i / 2) + 1)}`,
            participant_a_department_id: participantA,
            participant_b_department_id: participantB,
            status: 'pending'
        });
    }


    for (const match of matches) {
        await conn.execute(
            `INSERT INTO matches (tournament_id, sport_id, round_number, match_number, 
             bracket_position, participant_a_department_id, participant_b_department_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [match.tournament_id, match.sport_id, match.round_number, match.match_number,
            match.bracket_position, match.participant_a_department_id, match.participant_b_department_id, match.status]
        );
    }


    let currentRoundMatches = matches.length;
    roundNumber++;

    while (currentRoundMatches > 1) {
        const nextRoundMatches = Math.ceil(currentRoundMatches / 2);
        for (let i = 0; i < nextRoundMatches; i++) {
            await conn.execute(
                `INSERT INTO matches (tournament_id, sport_id, round_number, match_number, 
                 bracket_position, status)
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
                [tournament.id, tournament.sport_id, roundNumber, i + 1, `R${roundNumber}M${i + 1}`]
            );
        }
        currentRoundMatches = nextRoundMatches;
        roundNumber++;
    }


    if (totalParticipants >= 4) {
        await conn.execute(
            `INSERT INTO matches (tournament_id, sport_id, round_number, match_number,
             bracket_position, status)
             VALUES (?, ?, ?, ?, '3rd Place', 'pending')`,
            [tournament.id, tournament.sport_id, roundNumber, 1]
        );
    }
};


const generateRoundRobinBracket = async (tournament, participants, conn) => {
    const participantIds = participants.map(p => p.department_id);
    const totalParticipants = participantIds.length;
    let matchNumber = 1;


    for (let i = 0; i < totalParticipants; i++) {
        for (let j = i + 1; j < totalParticipants; j++) {
            await conn.execute(
                `INSERT INTO matches (tournament_id, sport_id, round_number, match_number,
                 bracket_position, participant_a_department_id, participant_b_department_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [tournament.id, tournament.sport_id, matchNumber, matchNumber,
                `Match ${matchNumber}`, participantIds[i], participantIds[j]]
            );
            matchNumber++;
        }
    }
};


const generateDoubleEliminationBracket = async (tournament, participants, conn) => {
    const participantIds = participants.map(p => p.department_id);
    const totalParticipants = participantIds.length;
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalParticipants)));
    const byes = nextPowerOfTwo - totalParticipants;

    let currentParticipants = [...participantIds];
    for (let i = 0; i < byes; i++) currentParticipants.push(null);


    for (let i = currentParticipants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentParticipants[i], currentParticipants[j]] = [currentParticipants[j], currentParticipants[i]];
    }


    let matchNumber = 1;
    for (let i = 0; i < currentParticipants.length; i += 2) {
        const participantA = currentParticipants[i];
        const participantB = currentParticipants[i + 1];

        if (participantA === null && participantB === null) continue;

        await conn.execute(
            `INSERT INTO matches (tournament_id, sport_id, round_number, match_number,
             bracket_side, bracket_position, participant_a_department_id, participant_b_department_id, status)
             VALUES (?, ?, ?, ?, 'upper', ?, ?, ?, 'pending')`,
            [tournament.id, tournament.sport_id, 1, matchNumber,
            `UB-M${matchNumber}`, participantA, participantB]
        );
        matchNumber++;
    }


    await conn.execute(
        `INSERT INTO matches (tournament_id, sport_id, round_number, match_number,
         bracket_side, bracket_position, status)
         VALUES (?, ?, ?, ?, 'lower', 'LB Final', 'pending')`,
        [tournament.id, tournament.sport_id, 1, 1]
    );


    await conn.execute(
        `INSERT INTO matches (tournament_id, sport_id, round_number, match_number,
         bracket_side, bracket_position, status)
         VALUES (?, ?, ?, ?, 'grand_final', 'Grand Final', 'pending')`,
        [tournament.id, tournament.sport_id, 1, 1]
    );
};


const generateGroupStageBracket = async (tournament, participants, conn) => {
    const participantIds = participants.map(p => p.department_id);
    const groupCount = tournament.group_count || 2;
    const advancePerGroup = tournament.advance_per_group || 2;


    for (let i = participantIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participantIds[i], participantIds[j]] = [participantIds[j], participantIds[i]];
    }


    const groups = [];
    for (let i = 0; i < groupCount; i++) groups.push([]);

    participantIds.forEach((p, idx) => {
        groups[idx % groupCount].push(p);
    });


    let matchNumber = 1;
    for (let g = 0; g < groups.length; g++) {
        const groupParticipants = groups[g].filter(p => p !== null);
        const groupLetter = String.fromCharCode(65 + g);

        for (let i = 0; i < groupParticipants.length; i++) {
            for (let j = i + 1; j < groupParticipants.length; j++) {
                await conn.execute(
                    `INSERT INTO matches (tournament_id, sport_id, round_number, match_number,
                     bracket_side, bracket_position, participant_a_department_id, participant_b_department_id, status)
                     VALUES (?, ?, ?, ?, 'group', ?, ?, ?, 'pending')`,
                    [tournament.id, tournament.sport_id, g + 1, matchNumber,
                    `${groupLetter}-${matchNumber}`, groupParticipants[i], groupParticipants[j]]
                );
                matchNumber++;
            }
        }
    }


};


const generateBracket = async (tournament, participants, conn) => {
    const format = tournament.format;

    switch (format) {
        case 'single_elimination':
            await generateSingleEliminationBracket(tournament, participants, conn);
            break;
        case 'double_elimination':
            await generateDoubleEliminationBracket(tournament, participants, conn);
            break;
        case 'round_robin':
            await generateRoundRobinBracket(tournament, participants, conn);
            break;
        case 'group_stage_se':
        case 'group_stage_de':
        case 'group_stage_ffa':
            await generateGroupStageBracket(tournament, participants, conn);
            break;
        default:
            await generateSingleEliminationBracket(tournament, participants, conn);
    }
};


const generateKnockoutFromGroups = async (tournamentId, conn) => {

    const [groupStandings] = await conn.execute(
        `SELECT tp.department_id, d.name, tp.group_letter, 
         COUNT(CASE WHEN m.winner_department_id = tp.department_id THEN 1 END) as wins
         FROM tournament_participants tp
         JOIN departments d ON tp.department_id = d.id
         LEFT JOIN matches m ON (m.participant_a_department_id = tp.department_id OR m.participant_b_department_id = tp.department_id)
         WHERE tp.tournament_id = ? AND m.bracket_side = 'group'
         GROUP BY tp.department_id
         ORDER BY group_letter, wins DESC`,
        [tournamentId]
    );


    const [tourney] = await conn.execute('SELECT group_count, advance_per_group FROM tournaments WHERE id = ?', [tournamentId]);
    const advancePerGroup = tourney[0]?.advance_per_group || 2;


    const groups = {};
    for (const standing of groupStandings) {
        if (!groups[standing.group_letter]) groups[standing.group_letter] = [];
        groups[standing.group_letter].push(standing);
    }


    const advancingTeams = [];
    for (const groupLetter in groups) {
        const sorted = groups[groupLetter].sort((a, b) => b.wins - a.wins);
        for (let i = 0; i < Math.min(advancePerGroup, sorted.length); i++) {
            advancingTeams.push(sorted[i].department_id);
        }
    }


    if (advancingTeams.length >= 2) {
        await generateSingleEliminationBracket(
            { id: tournamentId, sport_id: (await conn.execute('SELECT sport_id FROM tournaments WHERE id = ?', [tournamentId]))[0].sport_id },
            advancingTeams.map(id => ({ department_id: id })),
            conn
        );
    }
};



const getAll = async (req, res, next) => {
    try {
        const query = `
            SELECT t.*, 
                   s.name AS sport_name,
                   (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) AS participant_count,
                   (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id) AS match_count
            FROM tournaments t
            LEFT JOIN sports s ON t.sport_id = s.id
            ORDER BY t.created_at DESC
        `;

        const [rows] = await pool.execute(query);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT t.*, s.name AS sport_name, s.category, s.min_players
             FROM tournaments t
             JOIN sports s ON t.sport_id = s.id
             WHERE t.id = ?`,
            [req.params.id]
        );

        if (!rows.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
        const tournament = rows[0];

        const [participants] = await pool.execute(
            `SELECT tp.*, d.name AS department_name, d.color AS department_color
             FROM tournament_participants tp
             JOIN departments d ON tp.department_id = d.id
             WHERE tp.tournament_id = ?
             ORDER BY tp.seed ASC`,
            [req.params.id]
        );

        for (let p of participants) {
            if (tournament.category === 'team') {
                const [teams] = await pool.execute(
                    'SELECT id, name FROM teams WHERE department_id = ? AND sport_id = ?',
                    [p.department_id, tournament.sport_id]
                );
                if (teams.length > 0) {
                    p.team_name = teams[0].name;
                    const [players] = await pool.execute(
                        'SELECT id, first_name, last_name, jersey_number FROM players WHERE team_id = ? AND status = "approved"',
                        [teams[0].id]
                    );
                    p.players = players;
                } else {
                    p.players = [];
                }
            } else {
                const [players] = await pool.execute(
                    `SELECT p.id, p.first_name, p.last_name, p.jersey_number, p.status
                     FROM players p
                     WHERE p.department_id = ? 
                     AND p.sport_id = ? 
                     AND p.status = 'approved'
                     AND (p.team_id IS NULL OR p.team_id = 0)`,
                    [p.department_id, tournament.sport_id]
                );
                p.players = players;
            }
        }

        res.json({ success: true, data: { ...tournament, participants } });
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        const {
            name, sport_id, format, gender,
            max_participants, start_date, end_date,
            description, ffa_scoring,
            group_count, advance_per_group
        } = req.body;

        if (!name || !sport_id || !format) {
            return res.status(400).json({ success: false, message: 'name, sport_id, format required' });
        }

        if (!VALID_FORMATS.includes(format)) {
            return res.status(400).json({ success: false, message: 'Invalid format' });
        }

        const [result] = await pool.execute(
            `INSERT INTO tournaments 
            (name, sport_id, format, gender, max_participants,
             start_date, end_date, description,
             ffa_scoring, group_count, advance_per_group, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, sport_id, format,
                gender || 'open',
                max_participants || 0,
                start_date || null,
                end_date || null,
                description || null,
                ffa_scoring || null,
                group_count || null,
                advance_per_group || null,
                req.user.id
            ]
        );

        await logActivity(req.user.id, 'TOURNAMENT_CREATED', 'tournament', result.insertId, `Created ${name}`);

        res.status(201).json({ success: true, data: { id: result.insertId } });
    } catch (err) { next(err); }
};

const update = async (req, res, next) => {
    try {
        const {
            name, format, gender, max_participants,
            start_date, end_date, description, status,
            ffa_scoring, group_count, advance_per_group
        } = req.body;

        await pool.execute(
            `UPDATE tournaments SET
                name=?, format=?, gender=?, max_participants=?,
                start_date=?, end_date=?, description=?, status=?,
                ffa_scoring=?, group_count=?, advance_per_group=?
             WHERE id=?`,
            [
                name, format, gender, max_participants,
                start_date, end_date, description, status,
                ffa_scoring, group_count, advance_per_group,
                req.params.id
            ]
        );

        res.json({ success: true });
    } catch (err) { next(err); }
};

const addParticipant = async (req, res, next) => {
    try {
        const { department_ids } = req.body;
        const tournamentId = req.params.id;

        if (!department_ids || !Array.isArray(department_ids) || department_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one Grade/Strand.' });
        }

        const [tourneyInfo] = await pool.execute(
            `SELECT t.status, s.min_players, s.name as sport_name, s.category, s.id as sport_id
             FROM tournaments t
             JOIN sports s ON t.sport_id = s.id
             WHERE t.id = ?`,
            [tournamentId]
        );

        if (!tourneyInfo.length) return res.status(404).json({ success: false, message: 'Tournament not found' });
        const { status, min_players, sport_name, category, sport_id } = tourneyInfo[0];

        if (status !== 'draft' && status !== 'registration') {
            return res.status(403).json({ success: false, message: 'Cannot add participants once bracket has started.' });
        }

        const errors = [];
        let addedCount = 0;

        for (const dept_id of department_ids) {
            let memberCount = 0;
            let deptName = `Dept ID ${dept_id}`;

            const [deptRes] = await pool.execute('SELECT name FROM departments WHERE id = ?', [dept_id]);
            if (deptRes.length) deptName = deptRes[0].name;

            if (category === 'team') {
                const [teams] = await pool.execute('SELECT id FROM teams WHERE department_id = ? AND sport_id = ?', [dept_id, sport_id]);
                if (!teams.length) {
                    errors.push(`${deptName} lacks a registered team for ${sport_name}.`);
                    continue;
                }
                const [players] = await pool.execute('SELECT COUNT(id) AS count FROM players WHERE team_id = ? AND status = "approved"', [teams[0].id]);
                memberCount = players[0].count;
            } else {
                const [players] = await pool.execute(
                    `SELECT COUNT(p.id) AS count 
                     FROM players p
                     WHERE p.department_id = ? 
                     AND p.sport_id = ? 
                     AND p.status = 'approved'
                     AND (p.team_id IS NULL OR p.team_id = 0)`,
                    [dept_id, sport_id]
                );
                memberCount = players[0].count;
            }

            if (memberCount < min_players) {
                errors.push(`${deptName} has only ${memberCount} approved players (Requires ${min_players}).`);
                continue;
            }

            await pool.execute(
                `INSERT INTO tournament_participants (tournament_id, department_id, status)
                 VALUES (?, ?, 'active')
                 ON DUPLICATE KEY UPDATE status='active'`,
                [tournamentId, dept_id]
            );
            addedCount++;
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: addedCount > 0,
                message: errors.join(' ') + (addedCount > 0 ? ` (${addedCount} added)` : '')
            });
        }

        res.json({ success: true, message: 'Participants successfully added.' });
    } catch (err) { next(err); }
};

const generateMatches = async (req, res, next) => {
    try {
        const tournamentId = req.params.id;

        const [tourney] = await pool.execute(
            'SELECT * FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        if (!tourney.length) return res.status(404).json({ success: false });

        const [participants] = await pool.execute(
            `SELECT * FROM tournament_participants 
             WHERE tournament_id=? AND status='active'`,
            [tournamentId]
        );

        if (participants.length < 2) {
            return res.status(400).json({ success: false, message: 'Need at least 2 participants' });
        }

        const format = tourney[0].format;

        if (['free_for_all', 'team_ranking'].includes(format)) {
            await pool.execute('DELETE FROM matches WHERE tournament_id=?', [tournamentId]);
            await pool.execute(
                `INSERT INTO matches (tournament_id, sport_id, status, bracket_side, bracket_position)
                 VALUES (?, ?, 'pending', 'ffa', 'FFA Event')`,
                [tournamentId, tourney[0].sport_id]
            );
            await pool.execute(
                "UPDATE tournaments SET status='ongoing' WHERE id=?",
                [tournamentId]
            );
            return res.json({ success: true, message: 'Event initialized successfully. You can now schedule it.' });
        }

        await pool.execute('DELETE FROM matches WHERE tournament_id=?', [tournamentId]);

        await generateBracket(tourney[0], participants, pool);

        await pool.execute(
            "UPDATE tournaments SET status='ongoing' WHERE id=?",
            [tournamentId]
        );

        res.json({ success: true, message: 'Bracket generated' });
    } catch (err) { next(err); }
};

const getBracket = async (req, res, next) => {
    try {
        const [matches] = await pool.execute(
            `SELECT m.*,
                DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                da.name AS dept_a_name, da.color AS dept_a_color,
                db.name AS dept_b_name, db.color AS dept_b_color,
                dw.name AS winner_name
             FROM matches m
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN departments dw ON m.winner_department_id = dw.id
             WHERE m.tournament_id = ?
             ORDER BY m.round_number, m.match_number`,
            [req.params.id]
        );

        res.json({ success: true, data: matches });
    } catch (err) { next(err); }
};

const finalize = async (req, res, next) => {
    try {
        const tournamentId = req.params.id;
        const { rankings } = req.body;

        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();
            await conn.execute('DELETE FROM tournament_results WHERE tournament_id=?', [tournamentId]);

            if (rankings && rankings.length > 0) {
                for (const r of rankings) {
                    const medal = SCORING.getMedalForRank(r.rank) || null;
                    await conn.execute(
                        `INSERT INTO tournament_results
                         (tournament_id, rank, department_id, sport_fest_points, medal)
                         VALUES (?, ?, ?, ?, ?)`,
                        [tournamentId, r.rank, r.department_id, r.sport_fest_points, medal]
                    );
                }
            } else {
                const [ffaData] = await conn.execute(
                    `SELECT * FROM ffa_results WHERE tournament_id=? ORDER BY rank_position`,
                    [tournamentId]
                );

                if (!ffaData.length) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, message: 'No results found to finalize.' });
                }

                for (const r of ffaData) {
                    const points = SCORING.getPointsForRank(r.rank_position);
                    const medal = SCORING.getMedalForRank(r.rank_position);
                    await conn.execute(
                        `INSERT INTO tournament_results
                         (tournament_id, rank, department_id, sport_fest_points, medal)
                         VALUES (?, ?, ?, ?, ?)`,
                        [tournamentId, r.rank_position, r.department_id, points, medal]
                    );
                }
            }

            await conn.execute("UPDATE tournaments SET status='completed' WHERE id=?", [tournamentId]);


            await conn.execute('UPDATE department_scores SET total_points=0, gold_medals=0, silver_medals=0, bronze_medals=0, total_participations=0, tournaments_entered=0');

            const [scoreResults] = await conn.execute(
                `SELECT department_id,
                SUM(sport_fest_points) as total_points,
                SUM(CASE WHEN medal='gold' THEN 1 ELSE 0 END) as gold,
                SUM(CASE WHEN medal='silver' THEN 1 ELSE 0 END) as silver,
                SUM(CASE WHEN medal='bronze' THEN 1 ELSE 0 END) as bronze,
                COUNT(*) as participations,
                COUNT(DISTINCT tournament_id) as tournaments
                FROM tournament_results
                GROUP BY department_id`
            );

            for (const r of scoreResults) {
                await conn.execute(
                    `INSERT INTO department_scores (department_id, total_points, gold_medals, silver_medals, bronze_medals, total_participations, tournaments_entered)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     total_points=?, gold_medals=?, silver_medals=?, bronze_medals=?, total_participations=?, tournaments_entered=?`,
                    [r.department_id, r.total_points, r.gold, r.silver, r.bronze, r.participations, r.tournaments,
                    r.total_points, r.gold, r.silver, r.bronze, r.participations, r.tournaments]
                );
            }

            await conn.commit();
            res.json({ success: true, message: 'Tournament finalized & Leaderboard updated successfully!' });

        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

    } catch (err) { next(err); }
};

const getStandings = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM tournament_results WHERE tournament_id = ? ORDER BY rank ASC`,
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

const promoteKnockout = async (req, res, next) => {
    try {
        await generateKnockoutFromGroups(req.params.id, pool);
        res.json({ success: true, message: 'Knockout stage generated' });
    } catch (err) { next(err); }
};

const removeParticipant = async (req, res, next) => {
    try {
        await pool.execute('DELETE FROM tournament_participants WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Participant removed successfully.' });
    } catch (err) { next(err); }
};

module.exports = {
    getAll,
    getOne,
    create,
    getStandings,
    promoteKnockout,
    update,
    addParticipant,
    generateMatches,
    getBracket,
    finalize,
    removeParticipant
};