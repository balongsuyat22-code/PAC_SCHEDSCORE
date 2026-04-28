const { pool } = require('../config/database');


const getDashboard = async (req, res, next) => {
    try {
        const [[totals]] = await pool.execute(`
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
                (SELECT COUNT(*) FROM users WHERE role='player' AND is_active=1) as total_players,
                (SELECT COUNT(*) FROM users WHERE role='referee' AND is_active=1) as total_referees,
                (SELECT COUNT(*) FROM teams) as total_teams
        `);

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

        const [leaderboard] = await pool.execute(`
            SELECT d.name, d.code, d.color,
                   COALESCE(ds.total_points,0) as total_points,
                   COALESCE(ds.gold_medals,0) as gold,
                   COALESCE(ds.silver_medals,0) as silver,
                   COALESCE(ds.bronze_medals,0) as bronze
            FROM departments d
            LEFT JOIN department_scores ds ON d.id = ds.department_id
            WHERE d.is_active = 1
            ORDER BY total_points DESC, gold DESC
        `);

        res.json({ success: true, data: { totals, upcomingMatches, recentResults, leaderboard } });
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
                   ta.name as team_a_name, tb.name as team_b_name,
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
            LEFT JOIN teams ta ON m.participant_a_team_id = ta.id
            LEFT JOIN teams tb ON m.participant_b_team_id = tb.id
            LEFT JOIN departments dw ON m.winner_department_id = dw.id
            LEFT JOIN match_results mr ON m.id = mr.match_id
            LEFT JOIN venues v ON m.venue_id = v.id
            LEFT JOIN referees r ON m.referee_id = r.id
            LEFT JOIN users ru ON r.user_id = ru.id
            WHERE m.status = 'completed'
        `;
        const params = [];
        if (sport_id) { query += ' AND m.sport_id = ?'; params.push(sport_id); }
        if (tournament_id) { query += ' AND m.tournament_id = ?'; params.push(tournament_id); }
        if (department_id) {
            query += ' AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)';
            params.push(department_id, department_id);
        }
        if (from_date) { query += ' AND m.completed_at >= ?'; params.push(from_date); }
        if (to_date) { query += ' AND m.completed_at <= ?'; params.push(to_date + ' 23:59:59'); }
        query += ' ORDER BY m.completed_at DESC';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        next(err);
    }
};


const getDepartmentReport = async (req, res, next) => {
    try {
        const deptId = req.params.id;

        const [dept] = await pool.execute(`
            SELECT d.*, ds.total_points, ds.gold_medals, ds.silver_medals,
                   ds.bronze_medals, ds.total_participations, ds.tournaments_entered
            FROM departments d
            LEFT JOIN department_scores ds ON d.id = ds.department_id
            WHERE d.id = ?`, [deptId]
        );
        if (!dept.length) return res.status(404).json({ success: false, message: 'Department not found' });

        const [wl] = await pool.execute(`
            SELECT
                COUNT(*) as total_matches,
                SUM(CASE WHEN winner_department_id = ? THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN winner_department_id != ? AND winner_department_id IS NOT NULL THEN 1 ELSE 0 END) as losses
            FROM matches
            WHERE (participant_a_department_id = ? OR participant_b_department_id = ?)
              AND status = 'completed'
        `, [deptId, deptId, deptId, deptId]);

        const [sportBreakdown] = await pool.execute(`
            SELECT s.name as sport_name, tr.rank, tr.medal, tr.sport_fest_points, t.name as tournament
            FROM tournament_results tr
            JOIN tournaments t ON tr.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            WHERE tr.department_id = ?
            ORDER BY tr.finalized_at DESC
        `, [deptId]);

        const [players] = await pool.execute(`
            SELECT u.first_name, u.last_name, p.jersey_number, p.position
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE p.department_id = ? AND u.is_active = 1
        `, [deptId]);

        res.json({
            success: true,
            data: { department: dept[0], win_loss: wl[0], sport_breakdown: sportBreakdown, players }
        });
    } catch (err) {
        next(err);
    }
};


const getTournamentReport = async (req, res, next) => {
    try {
        const tid = req.params.id;

        const [tourney] = await pool.execute(`
            SELECT t.*, s.name as sport_name, s.category
            FROM tournaments t
            JOIN sports s ON t.sport_id = s.id
            WHERE t.id = ?`, [tid]
        );
        if (!tourney.length) return res.status(404).json({ success: false, message: 'Tournament not found' });

        const [stats] = await pool.execute(`
            SELECT COUNT(*) as total_matches,
                   SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
                   SUM(CASE WHEN status='ongoing' THEN 1 ELSE 0 END) as ongoing,
                   SUM(CASE WHEN status='scheduled' THEN 1 ELSE 0 END) as scheduled
            FROM matches
            WHERE tournament_id = ?`, [tid]
        );

        const [results] = await pool.execute(`
            SELECT tr.rank, tr.medal, tr.sport_fest_points,
                   d.name as department_name, d.color,
                   te.name as team_name
            FROM tournament_results tr
            JOIN departments d ON tr.department_id = d.id
            LEFT JOIN teams te ON tr.team_id = te.id
            WHERE tr.tournament_id = ?
            ORDER BY tr.rank ASC
        `, [tid]);

        res.json({ success: true, data: { tournament: tourney[0], stats: stats[0], results } });
    } catch (err) {
        next(err);
    }
};


const getActivityLog = async (req, res, next) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const [rows] = await pool.execute(`
            SELECT al.*, CONCAT(u.first_name,' ',u.last_name) as user_name, u.role
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboard,
    getMatchHistory,
    getDepartmentReport,
    getTournamentReport,
    getActivityLog
};