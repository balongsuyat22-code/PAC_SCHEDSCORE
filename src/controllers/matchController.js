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

const getAll = async (req, res, next) => {
    try {
        const { tournament_id, status, date, referee_id, department_id } = req.query;
        let query = `
            SELECT m.*,
                   DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                   DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                   s.name  AS sport_name,
                   t.name  AS tournament_name,
                   t.format AS tournament_format,
                   t.ffa_scoring AS ffa_scoring_type,
                   da.name AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                   db.name AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                   MAX(ta.name) AS team_a_name,
                   MAX(tb.name) AS team_b_name,
                   v.name  AS venue_name,
                   CONCAT(ru.first_name,' ',ru.last_name) AS referee_name,
                   mr.total_score_a, mr.total_score_b, mr.final_score_display,
                   mr.mvp_player_id, mr.mvp_player_name
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN teams ta ON m.participant_a_department_id = ta.department_id AND ta.sport_id = s.id
            LEFT JOIN teams tb ON m.participant_b_department_id = tb.department_id AND tb.sport_id = s.id
            LEFT JOIN venues v ON m.venue_id = v.id
            LEFT JOIN referees r ON m.referee_id = r.id
            LEFT JOIN users ru ON r.user_id = ru.id
            LEFT JOIN match_results mr ON m.id = mr.match_id
            WHERE 1=1
        `;
        const params = [];
        if (tournament_id) { query += ' AND m.tournament_id = ?'; params.push(tournament_id); }
        if (status) { query += ' AND m.status = ?'; params.push(status); }
        if (date) { query += ' AND m.scheduled_date = ?'; params.push(date); }
        if (referee_id) { query += ' AND r.user_id = ?'; params.push(referee_id); }
        if (department_id) {
            query += ' AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)';
            params.push(department_id, department_id);
        }
        query += ' GROUP BY m.id ORDER BY m.scheduled_date ASC, m.scheduled_time ASC';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT m.*, 
                    DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                    DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                    s.name AS sport_name, s.scoring_type,
                    t.name AS tournament_name, t.format AS tournament_format, t.ffa_scoring AS ffa_scoring_type,
                    da.name AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                    db.name AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                    v.name AS venue_name, v.location AS venue_location,
                    CONCAT(ru.first_name,' ',ru.last_name) AS referee_name,
                    r.id AS referee_row_id
             FROM matches m
             JOIN tournaments t ON m.tournament_id = t.id
             JOIN sports s ON t.sport_id = s.id
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN venues v ON m.venue_id = v.id
             LEFT JOIN referees r ON m.referee_id = r.id
             LEFT JOIN users ru ON r.user_id = ru.id
             WHERE m.id = ?`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found' });

        const [scores] = await pool.execute('SELECT * FROM match_scores WHERE match_id = ? ORDER BY period ASC', [req.params.id]);
        const [result] = await pool.execute('SELECT * FROM match_results WHERE match_id = ?', [req.params.id]);

        res.json({ success: true, data: { ...rows[0], scores, result: result[0] || null } });
    } catch (err) { next(err); }
};

const getScoreboard = async (req, res, next) => {
    try {
        const [match] = await pool.execute(
            `SELECT m.*, 
                    DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                    DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                    s.name AS sport_name, s.scoring_type,
                    t.name AS tournament_name, t.format AS tournament_format, t.ffa_scoring AS ffa_scoring_type,
                    da.name AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo, 
                    db.name AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo, 
                    MAX(ta.name) AS team_a_name,
                    MAX(tb.name) AS team_b_name,
                    v.name AS venue_name
             FROM matches m
             JOIN tournaments t ON m.tournament_id = t.id
             JOIN sports s ON t.sport_id = s.id
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN teams ta ON m.participant_a_department_id = ta.department_id AND ta.sport_id = s.id
             LEFT JOIN teams tb ON m.participant_b_department_id = tb.department_id AND tb.sport_id = s.id
             LEFT JOIN venues v ON m.venue_id = v.id
             WHERE m.id = ?
             GROUP BY m.id`,
            [req.params.id]
        );

        if (!match.length) return res.status(404).json({ success: false, message: 'Match not found' });
        const [scores] = await pool.execute('SELECT * FROM match_scores WHERE match_id = ? ORDER BY period ASC', [req.params.id]);
        const totalA = scores.reduce((s, r) => s + (r.score_a || 0), 0);
        const totalB = scores.reduce((s, r) => s + (r.score_b || 0), 0);

        res.json({ success: true, data: { match: match[0], scores, total_a: totalA, total_b: totalB, last_updated: new Date() } });
    } catch (err) { next(err); }
};

const getLive = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT m.id, m.tournament_id, m.bracket_side, m.bracket_position,
                    DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                    DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                    t.name AS tournament_name, t.format AS tournament_format, t.ffa_scoring AS ffa_scoring_type,
                    s.name AS sport_name, da.name AS dept_a, da.color AS dept_a_color,
                    db.name AS dept_b, db.color AS dept_b_color, da.logo_url AS dept_a_logo,
                    db.logo_url AS dept_b_logo, v.name AS venue_name, m.started_at,
                    COALESCE(SUM(ms.score_a), 0) AS live_score_a, COALESCE(SUM(ms.score_b), 0) AS live_score_b
             FROM matches m
             JOIN tournaments t ON m.tournament_id = t.id
             JOIN sports s ON t.sport_id = s.id
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN venues v ON m.venue_id = v.id
             LEFT JOIN match_scores ms ON m.id = ms.match_id
             WHERE m.status = 'ongoing'
             GROUP BY m.id
             ORDER BY m.started_at DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) { next(err); }
};

const getReferees = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`SELECT r.id AS id, u.first_name, u.last_name FROM users u LEFT JOIN referees r ON u.id = r.user_id WHERE u.role = 'referee'`);
        res.json({ success: true, data: rows.filter(ref => ref.id !== null) });
    } catch (err) { next(err); }
};

const schedule = async (req, res, next) => {
    try {
        const { scheduled_date, scheduled_time, venue_id, referee_id } = req.body;
        const matchId = req.params.id;
        const finalDate = safeDate(scheduled_date);
        const finalTime = scheduled_time || null;
        const finalVenue = safeFK(venue_id);
        const finalReferee = safeFK(referee_id);

        if (finalReferee && finalDate && finalTime) {
            const [refConflicts] = await pool.execute(
                `SELECT id FROM matches WHERE referee_id = ? AND scheduled_date = ? AND scheduled_time = ? AND id != ?`,
                [finalReferee, finalDate, finalTime, matchId]
            );
            if (refConflicts.length > 0) return res.status(409).json({ success: false, message: 'Referee conflict' });
        }

        await pool.execute(
            `UPDATE matches SET scheduled_date=?, scheduled_time=?, venue_id=?, referee_id=?, status = CASE WHEN status = 'pending' THEN 'scheduled' ELSE status END WHERE id=?`,
            [finalDate, finalTime, finalVenue, finalReferee, matchId]
        );
        res.json({ success: true, message: 'Match scheduled' });
    } catch (err) { next(err); }
};

const startMatch = async (req, res, next) => {
    try {
        await pool.execute("UPDATE matches SET status = 'ongoing', started_at = COALESCE(started_at, NOW()) WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: 'Match started' });
    } catch (err) { next(err); }
};

const updateScore = async (req, res, next) => {
    try {
        const { period, period_label, score_a, score_b } = req.body;
        const matchId = req.params.id;
        const userId = req.user?.id || null;
        const safeA = parseFloat(score_a) || 0;
        const safeB = parseFloat(score_b) || 0;
        const safePeriod = parseInt(period) || 1;

        await pool.execute(
            `INSERT INTO match_scores (match_id, period, period_label, score_a, score_b, updated_by)
             VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE score_a=VALUES(score_a), score_b=VALUES(score_b), updated_by=VALUES(updated_by), updated_at=NOW()`,
            [matchId, safePeriod, period_label || `Period ${safePeriod}`, safeA, safeB, userId]
        );
        const [[totals]] = await pool.execute('SELECT COALESCE(SUM(score_a),0) AS total_a, COALESCE(SUM(score_b),0) AS total_b FROM match_scores WHERE match_id = ?', [matchId]);
        res.json({ success: true, data: { total_a: totals.total_a, total_b: totals.total_b } });
    } catch (err) { next(err); }
};

const completeMatch = async (req, res, next) => {
    try {
        const matchId = req.params.id;
        let { winner_side, win_type, duration_minutes, highlights, final_score_display, mvp_player_id, mvp_player_name } = req.body;
        const userId = req.user?.id || 1;

        const [rows] = await pool.execute(`SELECT m.*, s.scoring_type FROM matches m JOIN sports s ON m.sport_id = s.id WHERE m.id = ?`, [matchId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found' });
        const match = rows[0];

        const [[totals]] = await pool.execute('SELECT COALESCE(SUM(score_a),0) AS total_a, COALESCE(SUM(score_b),0) AS total_b FROM match_scores WHERE match_id = ?', [matchId]);

        if (!winner_side) {
            winner_side = (match.scoring_type === 'time') ? (totals.total_a < totals.total_b ? 'a' : 'b') : (totals.total_a > totals.total_b ? 'a' : 'b');
        }

        const winner_dept_id = winner_side === 'a' ? match.participant_a_department_id : match.participant_b_department_id;
        const scoreDisplay = final_score_display || `${totals.total_a} - ${totals.total_b}`;

        // Handle undefined values - convert to null
        const safeHighlights = highlights && highlights.trim() !== '' ? highlights : null;
        const safeDuration = duration_minutes ? parseInt(duration_minutes) : null;
        const safeWinType = win_type || 'normal';
        const safeMvpPlayerId = mvp_player_id ? parseInt(mvp_player_id) : null;
        const safeMvpPlayerName = mvp_player_name && mvp_player_name.trim() !== '' ? mvp_player_name : null;

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute(`UPDATE matches SET status='completed', completed_at=NOW(), winner_department_id=? WHERE id=?`, [winner_dept_id, matchId]);
            await conn.execute(
                `INSERT INTO match_results (match_id, total_score_a, total_score_b, final_score_display, winner_side, win_type, duration_minutes, highlights, recorded_by, mvp_player_id, mvp_player_name)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                     total_score_a=VALUES(total_score_a), 
                     total_score_b=VALUES(total_score_b), 
                     final_score_display=VALUES(final_score_display), 
                     winner_side=VALUES(winner_side), 
                     win_type=VALUES(win_type), 
                     duration_minutes=VALUES(duration_minutes), 
                     highlights=VALUES(highlights), 
                     recorded_by=VALUES(recorded_by),
                     mvp_player_id=VALUES(mvp_player_id),
                     mvp_player_name=VALUES(mvp_player_name)`,
                [matchId, totals.total_a, totals.total_b, scoreDisplay, winner_side, safeWinType, safeDuration, safeHighlights, userId, safeMvpPlayerId, safeMvpPlayerName]
            );
            await updateRoundRobinStandings(conn, match, winner_side, totals.total_a, totals.total_b);
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

        try { await progressBracket(matchId, null, null, winner_dept_id, pool); } catch (e) { console.warn(e.message); }
        await logActivity(userId, 'MATCH_COMPLETED', 'match', matchId, `Match ${matchId} completed — winner: ${winner_side}${safeMvpPlayerName ? `, MVP: ${safeMvpPlayerName}` : ''}`);
        res.json({ success: true, message: 'Match completed' });
    } catch (err) {
        console.error('Error in completeMatch:', err);
        next(err);
    }
};

// Add new endpoint to get players by department for MVP selection
const getPlayersByDepartment = async (req, res, next) => {
    try {
        const { department_id } = req.params;

        if (!department_id) {
            return res.status(400).json({ success: false, message: 'Department ID is required' });
        }

        const [players] = await pool.execute(
            `SELECT p.id, p.user_id, p.first_name, p.last_name, p.jersey_number, p.position, p.image_url,
                    u.email, u.username
             FROM players p
             JOIN users u ON p.user_id = u.id
             WHERE p.department_id = ? AND p.status = 'approved'
             ORDER BY p.first_name, p.last_name`,
            [department_id]
        );

        res.json({ success: true, data: players });
    } catch (err) {
        console.error('Error getting players by department:', err);
        next(err);
    }
};

const updateRoundRobinStandings = async (conn, match, winner_side, totalA, totalB) => {
    const [[tourney]] = await conn.execute('SELECT format FROM tournaments WHERE id = ?', [match.tournament_id]);
    if (!tourney || tourney.format !== 'round_robin') return;
    const aDeptId = match.participant_a_department_id;
    const bDeptId = match.participant_b_department_id;

    if (winner_side === 'a') {
        await conn.execute(`UPDATE round_robin_standings SET wins=wins+1, matches_played=matches_played+1, standing_points=standing_points+3, points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`, [totalA, totalB, match.tournament_id, aDeptId]);
        await conn.execute(`UPDATE round_robin_standings SET losses=losses+1, matches_played=matches_played+1, points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`, [totalB, totalA, match.tournament_id, bDeptId]);
    } else if (winner_side === 'b') {
        await conn.execute(`UPDATE round_robin_standings SET losses=losses+1, matches_played=matches_played+1, points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`, [totalA, totalB, match.tournament_id, aDeptId]);
        await conn.execute(`UPDATE round_robin_standings SET wins=wins+1, matches_played=matches_played+1, standing_points=standing_points+3, points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`, [totalB, totalA, match.tournament_id, bDeptId]);
    } else {
        for (const [dId, pf, pa] of [[aDeptId, totalA, totalB], [bDeptId, totalB, totalA]]) {
            await conn.execute(`UPDATE round_robin_standings SET draws=draws+1, matches_played=matches_played+1, standing_points=standing_points+1, points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`, [pf, pa, match.tournament_id, dId]);
        }
    }
};

const getFFAResultsForTournament = async (req, res, next) => {
    try {
        const { tournamentId } = req.params;
        const [participants] = await pool.execute(
            `SELECT tp.department_id, d.name AS department_name, d.color AS department_color, t.name AS team_name, fr.result_value AS ffa_result_value, fr.rank_position  
             FROM tournament_participants tp
             JOIN departments d ON tp.department_id = d.id
             LEFT JOIN teams t ON t.department_id = d.id AND t.sport_id = (SELECT sport_id FROM tournaments WHERE id = ?)
             LEFT JOIN ffa_results fr ON fr.tournament_id = ? AND fr.department_id = tp.department_id
             WHERE tp.tournament_id = ? AND tp.status = 'active'
             ORDER BY d.name`,
            [tournamentId, tournamentId, tournamentId]
        );
        const [tournamentInfo] = await pool.execute('SELECT ffa_scoring FROM tournaments WHERE id = ?', [tournamentId]);
        res.json({ success: true, data: { participants, ffa_scoring: tournamentInfo[0]?.ffa_scoring || 'points' } });
    } catch (err) { next(err); }
};

const saveFFAResults = async (req, res, next) => {
    try {
        const { tournamentId } = req.params;
        const { results } = req.body;
        const userId = req.user?.id || null;

        if (!Array.isArray(results)) return res.status(400).json({ success: false, message: 'Results must be an array.' });

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const r of results) {
                const safeVal = r.result_value !== null ? parseFloat(r.result_value) : null;
                await conn.execute(
                    `INSERT INTO ffa_results (tournament_id, department_id, result_value, recorded_by)
                     VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE result_value = VALUES(result_value), recorded_by = VALUES(recorded_by), recorded_at = NOW()`,
                    [tournamentId, r.department_id, safeVal, userId]
                );
            }

            await conn.execute(
                `UPDATE matches SET status = 'ongoing', started_at = COALESCE(started_at, NOW()) 
                 WHERE tournament_id = ? AND (bracket_side = 'ffa' OR bracket_position = 'FFA Event')`,
                [tournamentId]
            );
            await reRankFFAResults(conn, tournamentId);
            await conn.commit();
        } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
        res.json({ success: true, message: 'FFA results saved successfully.' });
    } catch (err) { next(err); }
};

const completeFFAMatch = async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const userId = req.user?.id || 1;
        const [existing] = await pool.execute(`SELECT COUNT(*) as count FROM ffa_results WHERE tournament_id = (SELECT tournament_id FROM matches WHERE id = ?)`, [matchId]);
        if (existing[0].count === 0) return res.status(400).json({ success: false, message: 'No results recorded yet.' });

        await pool.execute(`UPDATE matches SET status='completed', completed_at=NOW() WHERE id=?`, [matchId]);
        await logActivity(userId, 'FFA_EVENT_COMPLETED', 'match', matchId, `FFA Event ${matchId} completed.`);
        res.json({ success: true, message: 'FFA event completed.' });
    } catch (err) { next(err); }
};
// Get MVPs from match_results - Fixed version
const getMVPs = async (req, res, next) => {
    try {
        const [mvps] = await pool.execute(
            `SELECT 
                mr.mvp_player_id as id,
                mr.mvp_player_name as player_name,
                NULL as player_img,
                mr.mvp_player_name as first_name,
                '' as last_name,
                COALESCE(s.name, 'Unknown') as sport,
                COALESCE(d.name, 'Unknown Department') as dept_name,
                COALESCE(d.color, '#F5B800') as dept_color,
                NULL as team_name,
                'mvp' as type,
                (mr.total_score_a + mr.total_score_b) as score,
                NULL as assists,
                mr.created_at as awarded_at,
                mr.highlights as notes,
                m.winner_department_id
             FROM match_results mr
             INNER JOIN matches m ON mr.match_id = m.id
             LEFT JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN sports s ON t.sport_id = s.id
             LEFT JOIN departments d ON m.winner_department_id = d.id
             WHERE mr.mvp_player_id IS NOT NULL 
                OR (mr.mvp_player_name IS NOT NULL AND mr.mvp_player_name != '')
             ORDER BY mr.created_at DESC
             LIMIT 50`
        );

        console.log(`Found ${mvps.length} MVP records`); // Debug log

        res.json({ success: true, data: mvps });
    } catch (err) {
        console.error('Error fetching MVPs:', err);
        // Return empty array instead of error
        res.json({ success: true, data: [] });
    }
};

// Simple MVP endpoint - Alternative version
const getMVPsSimple = async (req, res, next) => {
    try {
        const [mvps] = await pool.execute(
            `SELECT 
                match_id,
                mvp_player_id as id,
                mvp_player_name as player_name,
                total_score_a,
                total_score_b,
                final_score_display,
                winner_side,
                created_at as awarded_at,
                highlights as notes
             FROM match_results 
             WHERE mvp_player_name IS NOT NULL AND mvp_player_name != ''
             ORDER BY created_at DESC
             LIMIT 50`
        );

        // Enrich with match data
        const enrichedMvps = [];
        for (const mvp of mvps) {
            const [matchData] = await pool.execute(
                `SELECT m.*, s.name as sport_name, t.name as tournament_name
                 FROM matches m
                 LEFT JOIN tournaments t ON m.tournament_id = t.id
                 LEFT JOIN sports s ON t.sport_id = s.id
                 WHERE m.id = ?`,
                [mvp.match_id]
            );

            if (matchData.length > 0) {
                const winnerDeptId = matchData[0].winner_department_id;
                let deptName = null;
                let deptColor = null;

                if (winnerDeptId) {
                    const [dept] = await pool.execute(
                        `SELECT name, color FROM departments WHERE id = ?`,
                        [winnerDeptId]
                    );
                    if (dept.length > 0) {
                        deptName = dept[0].name;
                        deptColor = dept[0].color;
                    }
                }

                enrichedMvps.push({
                    id: mvp.id,
                    player_name: mvp.player_name,
                    player_img: null,
                    sport: matchData[0].sport_name || 'Unknown',
                    dept_name: deptName || 'Unknown',
                    dept_color: deptColor || '#F5B800',
                    team_name: null,
                    type: 'mvp',
                    score: mvp.total_score_a + mvp.total_score_b,
                    awarded_at: mvp.awarded_at,
                    notes: mvp.notes
                });
            }
        }

        res.json({ success: true, data: enrichedMvps });
    } catch (err) {
        console.error('Error fetching MVPs (simple):', err);
        res.json({ success: true, data: [] });
    }
};

module.exports = {
    getAll,
    getOne,
    getScoreboard,
    getLive,
    getReferees,
    schedule,
    startMatch,
    updateScore,
    completeMatch,
    getFFAResultsForTournament,
    saveFFAResults,
    completeFFAMatch,
    getPlayersByDepartment,
    getMVPs,
    getMVPsSimple
};