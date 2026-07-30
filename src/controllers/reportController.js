/**
 * REPORT / DASHBOARD CONTROLLER
 */
const { pool } = require('../config/database');
const { getActiveSportFestId } = require('../utils/season');

const getDashboard = async (req, res, next) => {
    try {
        const sportFestId = (await getActiveSportFestId()) ?? null;

        const [[totals]] = await pool.execute(
            `
            SELECT
                (SELECT COUNT(*) FROM departments WHERE is_active=1) as total_departments,
                (SELECT COUNT(*) FROM sports WHERE is_active=1) as total_sports,
                (SELECT COUNT(*) FROM tournaments) as total_tournaments,
                (SELECT COUNT(*) FROM tournaments WHERE status='ongoing') as ongoing_tournaments,
                (SELECT COUNT(*) FROM tournaments WHERE status='completed') as completed_tournaments,
                (SELECT COUNT(*) FROM matches) as total_matches,
                (SELECT COUNT(*) FROM matches WHERE status='ongoing') as live_matches,
                (SELECT COUNT(*) FROM matches WHERE status='completed') as completed_matches,
                (SELECT COUNT(*) FROM matches WHERE scheduled_date=CURDATE()) as todays_matches,
                (SELECT COUNT(*) FROM players WHERE status = 'approved') as total_players,
                (SELECT COUNT(*) FROM users WHERE role = 'sgo_officer' AND is_active = 1) as total_referees,
                (SELECT COUNT(*) FROM teams WHERE sport_fest_id <=> ?) as total_teams
        `,
            [sportFestId]
        );

        const [upcomingMatches] = await pool.execute(`
            SELECT m.id, m.scheduled_date, m.scheduled_time, s.name as sport_name,
                   t.name as tournament_name,
                   da.name as dept_a, db.name as dept_b,
                   v.name as venue_name
            FROM matches m
            JOIN sports s ON m.sport_id = s.id
            JOIN tournaments t ON m.tournament_id = t.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN venues v ON m.venue_id = v.id
            WHERE m.status = 'scheduled' AND m.scheduled_date >= CURDATE()
              AND m.participant_a_department_id IS NOT NULL
            ORDER BY m.scheduled_date, m.scheduled_time
            LIMIT 10
        `);

        const [recentResults] = await pool.execute(`
            SELECT m.id, m.completed_at, s.name as sport_name,
                   da.name as dept_a, da.color as color_a,
                   db.name as dept_b, db.color as color_b,
                   dw.name as winner,
                   mr.final_score_display
            FROM matches m
            JOIN sports s ON m.sport_id = s.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN departments dw ON m.winner_department_id = dw.id
            LEFT JOIN match_results mr ON m.id = mr.match_id
            WHERE m.status = 'completed'
            ORDER BY m.completed_at DESC
            LIMIT 10
        `);

        const [leaderboard] = await pool.execute(
            `
            SELECT d.name, d.code, d.color,
                   COALESCE(ds.total_points,0) as total_points,
                   COALESCE(ds.gold_medals,0) as gold,
                   COALESCE(ds.silver_medals,0) as silver,
                   COALESCE(ds.bronze_medals,0) as bronze
            FROM departments d
            LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
            WHERE d.is_active = 1
            ORDER BY total_points DESC, gold DESC
        `,
            [sportFestId]
        );

        res.json({ success: true, data: { totals, upcomingMatches, recentResults, leaderboard } });
    } catch (err) {
        next(err);
    }
};

const getReportSummary = async (req, res, next) => {
    try {
        const [[summary]] = await pool.execute(`
            SELECT
                (SELECT COUNT(*) FROM tournaments t
                 WHERE t.status IN ('ongoing', 'scheduled', 'active', 'open')
                   AND EXISTS (
                       SELECT 1 FROM matches m WHERE m.tournament_id = t.id AND m.status != 'cancelled'
                   )
                   AND NOT EXISTS (
                       SELECT 1 FROM matches m
                       WHERE m.tournament_id = t.id
                         AND m.status NOT IN ('completed', 'cancelled')
                   )
                ) AS unfinalized_tournaments,

                (SELECT COUNT(*) FROM matches m
                 WHERE m.status = 'scheduled'
                   AND m.scheduled_date IS NOT NULL
                   AND (
                        m.scheduled_date < CURDATE()
                     OR (m.scheduled_date = CURDATE()
                         AND m.scheduled_time IS NOT NULL
                         AND m.scheduled_time < CURTIME())
                   )
                ) AS overdue_matches,

                (SELECT COUNT(*) FROM matches m
                 WHERE m.status = 'pending'
                ) AS pending_matches,

                (SELECT COUNT(*) FROM matches m
                 WHERE m.status = 'ongoing'
                   AND m.started_at IS NOT NULL
                   AND m.started_at < DATE_SUB(NOW(), INTERVAL 4 HOUR)
                ) AS stuck_ongoing,

                (SELECT COUNT(*) FROM matches m
                 WHERE m.status IN ('scheduled', 'ongoing', 'pending')
                   AND m.referee_id IS NULL
                ) AS missing_referee,

                (SELECT COUNT(*) FROM matches m
                 WHERE m.status IN ('scheduled', 'ongoing', 'pending')
                   AND m.venue_id IS NULL
                ) AS missing_venue,

                (SELECT COUNT(*) FROM matches m WHERE m.status = 'ongoing') AS live_now,

                (SELECT COUNT(*) FROM matches m
                 WHERE m.status = 'scheduled'
                   AND m.scheduled_date = CURDATE()
                ) AS today_scheduled
        `);

        res.json({ success: true, data: summary });
    } catch (err) {
        next(err);
    }
};

const getUnfinalizedTournaments = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                t.id,
                t.name AS tournament_name,
                t.status AS tournament_status,
                t.format,
                s.name AS sport_name,
                s.scoring_type,
                (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id AND m.status != 'cancelled') AS total_matches,
                (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id AND m.status = 'completed') AS completed_matches,
                (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id AND m.status = 'cancelled') AS cancelled_matches,
                (SELECT MAX(m.completed_at) FROM matches m WHERE m.tournament_id = t.id AND m.status = 'completed') AS last_match_completed_at,
                (SELECT COUNT(*) FROM tournament_results tr WHERE tr.tournament_id = t.id) AS results_recorded
            FROM tournaments t
            JOIN sports s ON t.sport_id = s.id
            WHERE t.status IN ('ongoing', 'scheduled', 'active', 'open')
              AND EXISTS (
                  SELECT 1 FROM matches m WHERE m.tournament_id = t.id AND m.status != 'cancelled'
              )
              AND NOT EXISTS (
                  SELECT 1 FROM matches m
                  WHERE m.tournament_id = t.id
                    AND m.status NOT IN ('completed', 'cancelled')
              )
            ORDER BY last_match_completed_at DESC, t.name ASC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getOverdueMatches = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                m.id,
                m.scheduled_date,
                DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                m.status,
                m.bracket_side,
                m.bracket_position,
                s.name AS sport_name,
                t.name AS tournament_name,
                t.id AS tournament_id,
                da.name AS dept_a,
                da.color AS color_a,
                db.name AS dept_b,
                db.color AS color_b,
                v.name AS venue_name,
                CONCAT(u.first_name, ' ', u.last_name) AS referee_name,
                m.referee_id,
                m.venue_id,
                TIMESTAMPDIFF(
                    MINUTE,
                    CONCAT(m.scheduled_date, ' ', COALESCE(m.scheduled_time, '00:00:00')),
                    NOW()
                ) AS minutes_overdue
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN venues v ON m.venue_id = v.id
            LEFT JOIN users u ON m.referee_id = u.id
            WHERE m.status = 'scheduled'
              AND m.scheduled_date IS NOT NULL
              AND (
                    m.scheduled_date < CURDATE()
                 OR (m.scheduled_date = CURDATE()
                     AND m.scheduled_time IS NOT NULL
                     AND m.scheduled_time < CURTIME())
              )
            ORDER BY m.scheduled_date ASC, m.scheduled_time ASC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getStuckOngoing = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                m.id,
                m.started_at,
                m.status,
                s.name AS sport_name,
                t.name AS tournament_name,
                t.id AS tournament_id,
                da.name AS dept_a,
                da.color AS color_a,
                db.name AS dept_b,
                db.color AS color_b,
                v.name AS venue_name,
                CONCAT(u.first_name, ' ', u.last_name) AS referee_name,
                TIMESTAMPDIFF(MINUTE, m.started_at, NOW()) AS minutes_running,
                (SELECT COALESCE(SUM(score_a),0) FROM match_scores WHERE match_id = m.id) AS live_a,
                (SELECT COALESCE(SUM(score_b),0) FROM match_scores WHERE match_id = m.id) AS live_b
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN venues v ON m.venue_id = v.id
            LEFT JOIN users u ON m.referee_id = u.id
            WHERE m.status = 'ongoing'
              AND m.started_at IS NOT NULL
              AND m.started_at < DATE_SUB(NOW(), INTERVAL 4 HOUR)
            ORDER BY m.started_at ASC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getMissingAssignments = async (req, res, next) => {
    try {
        const { type } = req.query;

        let condition = `(m.referee_id IS NULL OR m.venue_id IS NULL)`;
        if (type === 'referee') condition = `m.referee_id IS NULL`;
        if (type === 'venue') condition = `m.venue_id IS NULL`;

        const [rows] = await pool.execute(`
            SELECT
                m.id,
                m.status,
                DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                s.name AS sport_name,
                t.name AS tournament_name,
                t.id AS tournament_id,
                da.name AS dept_a,
                da.color AS color_a,
                db.name AS dept_b,
                db.color AS color_b,
                v.name AS venue_name,
                CONCAT(u.first_name, ' ', u.last_name) AS referee_name,
                m.referee_id,
                m.venue_id,
                CASE WHEN m.referee_id IS NULL THEN 1 ELSE 0 END AS needs_referee,
                CASE WHEN m.venue_id IS NULL THEN 1 ELSE 0 END AS needs_venue
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN venues v ON m.venue_id = v.id
            LEFT JOIN users u ON m.referee_id = u.id
            WHERE m.status IN ('scheduled', 'ongoing', 'pending')
              AND ${condition}
            ORDER BY
                FIELD(m.status, 'ongoing', 'scheduled', 'pending'),
                m.scheduled_date ASC,
                m.scheduled_time ASC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getPendingMatches = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                m.id,
                m.status,
                m.bracket_side,
                m.bracket_position,
                s.name AS sport_name,
                t.name AS tournament_name,
                t.id AS tournament_id,
                t.status AS tournament_status,
                da.name AS dept_a,
                da.color AS color_a,
                db.name AS dept_b,
                db.color AS color_b,
                m.referee_id,
                m.venue_id
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            WHERE m.status = 'pending'
            ORDER BY t.name ASC, m.bracket_position ASC, m.id ASC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getMatchHistory = async (req, res, next) => {
    try {
        const { sport_id, department_id, tournament_id, from_date, to_date } = req.query;
        let query = `
            SELECT m.id, m.scheduled_date, m.completed_at, m.bracket_position,
                   s.name as sport_name, t.name as tournament_name,
                   da.name as team_a_dept, da.color as color_a,
                   db.name as team_b_dept, db.color as color_b,
                   dw.name as winner_dept, dw.color as winner_color,
                   mr.total_score_a, mr.total_score_b, mr.final_score_display,
                   mr.win_type, mr.duration_minutes,
                   CONCAT(ru.first_name,' ',ru.last_name) as referee_name,
                   v.name as venue_name
            FROM matches m
            JOIN sports s ON m.sport_id = s.id
            JOIN tournaments t ON m.tournament_id = t.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN departments dw ON m.winner_department_id = dw.id
            LEFT JOIN match_results mr ON m.id = mr.match_id
            LEFT JOIN venues v ON m.venue_id = v.id
            LEFT JOIN users ru ON m.referee_id = ru.id
            WHERE m.status = 'completed'
        `;
        const params = [];
        if (sport_id) {
            query += ' AND m.sport_id = ?';
            params.push(sport_id);
        }
        if (tournament_id) {
            query += ' AND m.tournament_id = ?';
            params.push(tournament_id);
        }
        if (department_id) {
            query += ' AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)';
            params.push(department_id, department_id);
        }
        if (from_date) {
            query += ' AND m.completed_at >= ?';
            params.push(from_date);
        }
        if (to_date) {
            query += ' AND m.completed_at <= ?';
            params.push(to_date + ' 23:59:59');
        }
        query += ' ORDER BY m.completed_at DESC';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getDepartmentReport = async (req, res, next) => {
    try {
        const deptId = req.params.id;
        const { season_id } = req.query;

        const sportFestId =
            season_id === 'all' ? null : season_id || (await getActiveSportFestId()) || null;

        const [dept] = await pool.execute(
            `
            SELECT d.*, ds.total_points, ds.gold_medals, ds.silver_medals,
                   ds.bronze_medals, ds.total_participations, ds.tournaments_entered
            FROM departments d
            LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
            WHERE d.id = ?`,
            [sportFestId, deptId]
        );
        if (!dept.length) return res.status(404).json({ success: false, message: 'Department not found' });

        const [wl] = await pool.execute(
            `
            SELECT
                COUNT(*) as total_matches,
                SUM(CASE WHEN winner_department_id = ? THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN winner_department_id != ? AND winner_department_id IS NOT NULL THEN 1 ELSE 0 END) as losses
            FROM matches
            WHERE (participant_a_department_id = ? OR participant_b_department_id = ?)
              AND status = 'completed'
        `,
            [deptId, deptId, deptId, deptId]
        );

        const [sportBreakdown] = await pool.execute(
            `
            SELECT s.name as sport_name, tr.rank, tr.medal, tr.sport_fest_points, t.name as tournament
            FROM tournament_results tr
            JOIN tournaments t ON tr.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            WHERE tr.department_id = ?
            ORDER BY tr.finalized_at DESC
        `,
            [deptId]
        );

        let playerQuery = `
            SELECT p.first_name, p.last_name, p.jersey_number, p.position
            FROM players p
            WHERE p.department_id = ? AND p.status = 'approved'
        `;
        const playerParams = [deptId];
        if (sportFestId != null) {
            playerQuery += ' AND p.sport_fest_id = ?';
            playerParams.push(sportFestId);
        }
        const [players] = await pool.execute(playerQuery, playerParams);

        res.json({
            success: true,
            data: { department: dept[0], win_loss: wl[0], sport_breakdown: sportBreakdown, players },
        });
    } catch (err) {
        next(err);
    }
};

const getTournamentReport = async (req, res, next) => {
    try {
        const tid = req.params.id;

        const [tourney] = await pool.execute(
            `
            SELECT t.*, s.name as sport_name, s.category
            FROM tournaments t
            JOIN sports s ON t.sport_id = s.id
            WHERE t.id = ?`,
            [tid]
        );
        if (!tourney.length) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const [stats] = await pool.execute(
            `
            SELECT COUNT(*) as total_matches,
                   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN status='ongoing' THEN 1 ELSE 0 END) as ongoing,
                   SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) as scheduled
            FROM matches
            WHERE tournament_id = ?`,
            [tid]
        );

        const [results] = await pool.execute(
            `
            SELECT tr.rank, tr.medal, tr.sport_fest_points,
                   d.name as department_name, d.color,
                   te.name as team_name
            FROM tournament_results tr
            JOIN departments d ON tr.department_id = d.id
            LEFT JOIN teams te ON tr.team_id = te.id
            WHERE tr.tournament_id = ?
            ORDER BY tr.rank ASC
        `,
            [tid]
        );

        res.json({ success: true, data: { tournament: tourney[0], stats: stats[0], results } });
    } catch (err) {
        next(err);
    }
};

const getActivityLog = async (req, res, next) => {
    try {
        const limitNum = Math.max(1, parseInt(req.query.limit, 10) || 50);
        const offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);

        // pool.query avoids some mysql2 prepared-statement issues with LIMIT/OFFSET
        const [rows] = await pool.query(
            `
            SELECT al.*, CONCAT(u.first_name,' ',u.last_name) as user_name, u.role
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `,
            [limitNum, offsetNum]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboard,
    getReportSummary,
    getUnfinalizedTournaments,
    getOverdueMatches,
    getStuckOngoing,
    getMissingAssignments,
    getPendingMatches,
    getMatchHistory,
    getDepartmentReport,
    getTournamentReport,
    getActivityLog,
};