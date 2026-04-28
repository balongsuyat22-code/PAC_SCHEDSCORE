const { pool } = require('../config/database');


const getLeaderboard = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
         d.id, d.name, d.code, d.color, d.logo_url,
         COALESCE(ds.total_points, 0) as total_points,
         COALESCE(ds.gold_medals, 0) as gold_medals,
         COALESCE(ds.silver_medals, 0) as silver_medals,
         COALESCE(ds.bronze_medals, 0) as bronze_medals,
         COALESCE(ds.total_participations, 0) as total_participations,
         COALESCE(ds.tournaments_entered, 0) as tournaments_entered,
         RANK() OVER (ORDER BY COALESCE(ds.total_points, 0) DESC,
                      COALESCE(ds.gold_medals, 0) DESC,
                      COALESCE(ds.silver_medals, 0) DESC,
                      COALESCE(ds.bronze_medals, 0) DESC) as \`rank\`
       FROM departments d
       LEFT JOIN department_scores ds ON d.id = ds.department_id
       WHERE d.is_active = 1
       ORDER BY total_points DESC, gold_medals DESC, silver_medals DESC, bronze_medals DESC`
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const getBySport = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
         s.id as sport_id, s.name as sport_name, s.code as sport_code,
         d.id as department_id, d.name as department_name, d.color,
         MIN(tr.rank) as best_rank,
         SUM(tr.sport_fest_points) as sport_points,
         MAX(tr.medal) as best_medal
       FROM tournament_results tr
       JOIN tournaments t ON tr.tournament_id = t.id
       JOIN sports s ON t.sport_id = s.id
       JOIN departments d ON tr.department_id = d.id
       GROUP BY s.id, d.id
       ORDER BY s.name, sport_points DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const calculateChampion = async (req, res, next) => {
    try {
        const [incomplete] = await pool.execute(
            "SELECT COUNT(*) as count FROM tournaments WHERE status NOT IN ('completed', 'cancelled')"
        );
        const hasIncomplete = incomplete[0].count > 0;

        const [rows] = await pool.execute(
            `SELECT
         d.id, d.name, d.code, d.color, d.logo_url,
         COALESCE(ds.total_points, 0) as total_points,
         COALESCE(ds.gold_medals, 0) as gold_medals,
         COALESCE(ds.silver_medals, 0) as silver_medals,
         COALESCE(ds.bronze_medals, 0) as bronze_medals,
         COALESCE(ds.total_participations, 0) as total_participations,
         COALESCE(ds.tournaments_entered, 0) as tournaments_entered
       FROM departments d
       LEFT JOIN department_scores ds ON d.id = ds.department_id
       WHERE d.is_active = 1
       ORDER BY total_points DESC, gold_medals DESC, silver_medals DESC, bronze_medals DESC
       LIMIT 1`
        );

        const champion = rows[0] || null;
        let sportBreakdown = [];

        if (champion) {
            const [breakdown] = await pool.execute(
                `SELECT s.name as sport_name, s.code, tr.rank, tr.medal, tr.sport_fest_points,
                t.name as tournament_name
         FROM tournament_results tr
         JOIN tournaments t ON tr.tournament_id = t.id
         JOIN sports s ON t.sport_id = s.id
         WHERE tr.department_id = ?
         ORDER BY tr.sport_fest_points DESC`,
                [champion.id]
            );
            sportBreakdown = breakdown;
        }

        const [leaderboard] = await pool.execute(
            `SELECT
         d.id, d.name, d.code, d.color,
         COALESCE(ds.total_points, 0) as total_points,
         COALESCE(ds.gold_medals, 0) as gold_medals,
         COALESCE(ds.silver_medals, 0) as silver_medals,
         COALESCE(ds.bronze_medals, 0) as bronze_medals,
         RANK() OVER (ORDER BY COALESCE(ds.total_points, 0) DESC,
                      COALESCE(ds.gold_medals, 0) DESC,
                      COALESCE(ds.silver_medals, 0) DESC) as \`rank\`
       FROM departments d
       LEFT JOIN department_scores ds ON d.id = ds.department_id
       WHERE d.is_active = 1
       ORDER BY total_points DESC, gold_medals DESC`
        );

        const [tournamentStats] = await pool.execute(
            `SELECT
         COUNT(*) as total_tournaments,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tournaments,
         SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing_tournaments,
         SUM(CASE WHEN status IN ('draft','registration') THEN 1 ELSE 0 END) as upcoming_tournaments
       FROM tournaments`
        );

        const stats = tournamentStats[0];
        const allComplete = !hasIncomplete;

        res.json({
            success: true,
            data: {
                is_final: allComplete,
                message: allComplete
                    ? `🏆 ${champion?.name || 'TBD'} is the Sport Fest Overall Champion!`
                    : `📊 Current standings (${stats.completed_tournaments}/${stats.total_tournaments} events completed)`,
                champion: allComplete ? champion : null,
                current_leader: !allComplete ? champion : null,
                sport_breakdown: sportBreakdown,
                leaderboard,
                tournament_stats: stats,
            },
        });
    } catch (err) {
        next(err);
    }
};


const getMedalTally = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
         d.id, d.name, d.code, d.color,
         COALESCE(ds.gold_medals, 0) as gold,
         COALESCE(ds.silver_medals, 0) as silver,
         COALESCE(ds.bronze_medals, 0) as bronze,
         COALESCE(ds.gold_medals + ds.silver_medals + ds.bronze_medals, 0) as total_medals,
         COALESCE(ds.total_points, 0) as total_points
       FROM departments d
       LEFT JOIN department_scores ds ON d.id = ds.department_id
       WHERE d.is_active = 1
       ORDER BY gold DESC, silver DESC, bronze DESC`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const recalculate = async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();


            await conn.execute(
                'UPDATE department_scores SET total_points=0, gold_medals=0, silver_medals=0, bronze_medals=0, total_participations=0, tournaments_entered=0'
            );


            const [results] = await conn.execute(
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

            for (const r of results) {
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
            res.json({ success: true, message: 'Leaderboard recalculated successfully' });
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getLeaderboard,
    getBySport,
    calculateChampion,
    getMedalTally,
    recalculate
};