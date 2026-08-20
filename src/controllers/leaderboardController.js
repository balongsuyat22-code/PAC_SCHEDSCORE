/**
 * LEADERBOARD CONTROLLER
 * Real-time and historical rankings for the sport fest.
 *
 * Who does what:
 *   visitor       → view overall leaderboard, medal tally, by-sport, champion
 *   dean_adviser  → same as visitor + department-specific breakdown
 *   sgo_president → same + trigger recalculate
 *   admin         → full access including recalculate
 *   sgo_officer   → read-only (same as visitor)
 *
 * SEASON NOTE: department_scores now has one row PER (department, season).
 * Every query below that joins department_scores must filter by the
 * active season's id, or a department with scores from two seasons will
 * come back as two duplicate rows with different totals. The `<=> ?`
 * operator is MySQL's NULL-safe equals, so this also works correctly for
 * legacy rows where sport_fest_id is still NULL.
 *
 * LIVE UPDATES: recalculate() is the one write path in this file — it
 * rebuilds department_scores from scratch. Anyone watching the public
 * leaderboard/medal tally/dashboard needs to know when that happens, so
 * it now emits a global 'leaderboard:changed' event. The read endpoints
 * below stay plain REST; clients that receive 'leaderboard:changed' (from
 * here, or from matchController/tournamentController after a match or
 * tournament finalizes) should silently refetch getLeaderboard/getMedalTally
 * rather than requiring the visitor to hit refresh.
 */

const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { getActiveSportFestId } = require('../utils/season');
const { emitToLeaderboard } = require('../utils/socketEmit');
const cache = require('../utils/cache');
const { rebuildDepartmentScores } = require('../utils/scoring');

// Short TTL: these are hit by every visitor on the public /live board.
// 10s means a burst of 200 concurrent viewers costs one query, not 200,
// while staying close enough to real-time that nobody notices the delay.
// getLiveLeaderboard (below) is intentionally NOT cached — that one exists
// specifically for the "just happened" refresh right after a socket event.
const LEADERBOARD_TTL = 10;

// ---------------------------------------------------------------------------
// GET OVERALL LEADERBOARD — active season only
// GET /api/leaderboard
// Returns all departments ranked by total_points → gold → silver → bronze
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getLeaderboard = async (req, res, next) => {
    try {
        const sportFestId = await getActiveSportFestId();

        const rows = await cache.wrap(`leaderboard:overall:${sportFestId}`, LEADERBOARD_TTL, async () => {
            const [r] = await pool.execute(
                `SELECT
                    d.id, d.name, d.code, d.color, d.logo_url, d.short_name,
                    COALESCE(ds.total_points,        0) AS total_points,
                    COALESCE(ds.gold_medals,         0) AS gold_medals,
                    COALESCE(ds.silver_medals,       0) AS silver_medals,
                    COALESCE(ds.bronze_medals,       0) AS bronze_medals,
                    COALESCE(ds.total_participations,0) AS total_participations,
                    COALESCE(ds.tournaments_entered, 0) AS tournaments_entered,
                    RANK() OVER (
                        ORDER BY
                            COALESCE(ds.total_points,  0) DESC,
                            COALESCE(ds.gold_medals,   0) DESC,
                            COALESCE(ds.silver_medals, 0) DESC,
                            COALESCE(ds.bronze_medals, 0) DESC
                    ) AS \`rank\`
                 FROM departments d
                 LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
                 WHERE d.is_active = 1
                 ORDER BY total_points DESC, gold_medals DESC, silver_medals DESC, bronze_medals DESC`,
                [sportFestId]
            );
            return r;
        });

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET DEPARTMENT RANKING  (alias used by visitor/dean pages) — active season
// GET /api/leaderboard/departments
// Same as getLeaderboard but includes win/loss record per department
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getDepartmentRanking = async (req, res, next) => {
    try {
        const sportFestId = await getActiveSportFestId();

        const rows = await cache.wrap(`leaderboard:ranking:${sportFestId}`, LEADERBOARD_TTL, async () => {
            const [r] = await pool.execute(
                `SELECT
            d.id, d.name, d.code, d.color, d.logo_url, d.short_name,
            COALESCE(ds.total_points,        0) AS total_points,
            COALESCE(ds.gold_medals,         0) AS gold_medals,
            COALESCE(ds.silver_medals,       0) AS silver_medals,
            COALESCE(ds.bronze_medals,       0) AS bronze_medals,
            COALESCE(ds.total_participations,0) AS total_participations,
            COALESCE(ds.tournaments_entered, 0) AS tournaments_entered,
            COUNT(DISTINCT CASE WHEN m.winner_department_id = d.id AND m.status = 'completed' THEN m.id END) AS total_wins,
            COUNT(DISTINCT CASE WHEN (m.participant_a_department_id = d.id OR m.participant_b_department_id = d.id)
                                 AND m.status = 'completed'
                                 AND m.winner_department_id != d.id THEN m.id END) AS total_losses,
            COUNT(DISTINCT CASE WHEN (m.participant_a_department_id = d.id OR m.participant_b_department_id = d.id)
                                 AND m.status = 'completed' THEN m.id END) AS total_matches_played,
            RANK() OVER (
                ORDER BY
                    COALESCE(ds.total_points,  0) DESC,
                    COALESCE(ds.gold_medals,   0) DESC,
                    COALESCE(ds.silver_medals, 0) DESC,
                    COALESCE(ds.bronze_medals, 0) DESC
            ) AS \`rank\`
         FROM departments d
         LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
         LEFT JOIN matches m
               ON (m.participant_a_department_id = d.id OR m.participant_b_department_id = d.id)
              AND EXISTS (
                  SELECT 1 FROM sport_fest_tournaments sft
                  WHERE sft.tournament_id = m.tournament_id AND sft.sport_fest_id <=> ?
              )
         WHERE d.is_active = 1
         GROUP BY d.id
         ORDER BY total_points DESC, gold_medals DESC`,
                [sportFestId, sportFestId]
            );
            return r;
        });

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET MEDAL TALLY — active season only
// GET /api/leaderboard/medals
// Classic Olympic-style medal table (gold → silver → bronze)
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getMedalTally = async (req, res, next) => {
    try {
        const sportFestId = await getActiveSportFestId();

        const rows = await cache.wrap(`leaderboard:medals:${sportFestId}`, LEADERBOARD_TTL, async () => {
            const [r] = await pool.execute(
                `SELECT
                    d.id, d.name, d.code, d.color, d.logo_url,
                    COALESCE(ds.gold_medals,   0) AS gold,
                    COALESCE(ds.silver_medals, 0) AS silver,
                    COALESCE(ds.bronze_medals, 0) AS bronze,
                    COALESCE(ds.gold_medals + ds.silver_medals + ds.bronze_medals, 0) AS total_medals,
                    COALESCE(ds.total_points,  0) AS total_points,
                    RANK() OVER (
                        ORDER BY
                            COALESCE(ds.gold_medals,   0) DESC,
                            COALESCE(ds.silver_medals, 0) DESC,
                            COALESCE(ds.bronze_medals, 0) DESC
                    ) AS \`rank\`
                 FROM departments d
                 LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
                 WHERE d.is_active = 1
                 ORDER BY gold DESC, silver DESC, bronze DESC`,
                [sportFestId]
            );
            return r;
        });

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET LEADERBOARD BY SPORT
// GET /api/leaderboard/by-sport
// Shows each department's best performance per sport, across all seasons
// this sport has run — this is a "trophy case" view (same intent as
// departmentController.getScores), so it's deliberately NOT season-scoped.
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getBySport = async (req, res, next) => {
    try {
        const { sport_id } = req.query;

        let query = `
            SELECT
                s.id   AS sport_id,
                s.name AS sport_name,
                s.code AS sport_code,
                s.icon AS sport_icon,
                d.id   AS department_id,
                d.name AS department_name,
                d.color,
                d.logo_url,
                MIN(tr.rank)               AS best_rank,
                SUM(tr.sport_fest_points)  AS sport_points,
                SUM(CASE WHEN tr.medal = 'gold'   THEN 1 ELSE 0 END) AS gold,
                SUM(CASE WHEN tr.medal = 'silver' THEN 1 ELSE 0 END) AS silver,
                SUM(CASE WHEN tr.medal = 'bronze' THEN 1 ELSE 0 END) AS bronze
            FROM tournament_results tr
            JOIN tournaments   t ON tr.tournament_id = t.id
            JOIN sports        s ON t.sport_id       = s.id
            JOIN departments   d ON tr.department_id = d.id
            WHERE 1 = 1
        `;
        const params = [];

        if (sport_id) {
            query += ' AND s.id = ?';
            params.push(sport_id);
        }

        query += `
            GROUP BY s.id, d.id
            ORDER BY s.name, sport_points DESC
        `;

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET TOP SCORERS / MVP LEADERBOARD
// GET /api/leaderboard/top-scorers
// All-time (across seasons) — same rationale as getBySport above.
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getTopScorers = async (req, res, next) => {
    try {
        const { sport_id, limit = 20 } = req.query;

        let query = `
            SELECT
                mr.mvp_player_id   AS player_id,
                mr.mvp_player_name AS player_name,
                d.name             AS department_name,
                d.color            AS department_color,
                s.name             AS sport_name,
                COUNT(mr.match_id) AS mvp_count,
                SUM(CASE WHEN mr.winner_side = 'a' AND m.participant_a_department_id = d.id THEN 1
                         WHEN mr.winner_side = 'b' AND m.participant_b_department_id = d.id THEN 1
                         ELSE 0 END) AS win_count
            FROM match_results mr
            INNER JOIN matches m ON mr.match_id = m.id
            LEFT JOIN tournaments t ON m.tournament_id = t.id
            LEFT JOIN sports      s ON t.sport_id      = s.id
            LEFT JOIN departments d ON m.winner_department_id = d.id
            WHERE mr.mvp_player_name IS NOT NULL AND mr.mvp_player_name != ''
        `;
        const params = [];

        if (sport_id) {
            query += ' AND t.sport_id = ?';
            params.push(sport_id);
        }

        query += `
            GROUP BY mr.mvp_player_id, mr.mvp_player_name, d.id, s.id
            ORDER BY mvp_count DESC, win_count DESC
            LIMIT ?
        `;
        params.push(parseInt(limit));

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET WINNING TEAMS
// GET /api/leaderboard/winning-teams
// All-time — see note on getBySport.
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getWinningTeams = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                t.id   AS team_id,
                t.name AS team_name,
                t.gender,
                d.name AS department_name,
                d.color,
                s.name AS sport_name,
                COUNT(m.id) AS total_wins
             FROM teams t
             JOIN departments d ON t.department_id = d.id
             JOIN sports      s ON t.sport_id      = s.id
             JOIN matches m
                   ON m.winner_department_id = d.id
                   AND m.tournament_id IN (
                       SELECT id FROM tournaments WHERE sport_id = t.sport_id
                   )
                   AND m.status = 'completed'
             GROUP BY t.id
             ORDER BY total_wins DESC
             LIMIT 20`
        );

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET CHAMPION TEAMS (gold medal per sport)
// GET /api/leaderboard/champions
// All-time — see note on getBySport.
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getChampionTeams = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                s.id   AS sport_id,
                s.name AS sport_name,
                s.icon AS sport_icon,
                t.name AS tournament_name,
                d.id   AS department_id,
                d.name AS department_name,
                d.color,
                d.logo_url,
                te.name AS team_name,
                tr.sport_fest_points,
                tr.finalized_at
             FROM tournament_results tr
             JOIN tournaments  t  ON tr.tournament_id = t.id
             JOIN sports       s  ON t.sport_id       = s.id
             JOIN departments  d  ON tr.department_id = d.id
             LEFT JOIN teams   te ON te.department_id = d.id AND te.sport_id = s.id
             WHERE tr.medal = 'gold'
             ORDER BY s.name, tr.finalized_at DESC`
        );

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET OVERALL CHAMPION  (used on sport fest summary page) — active season
// GET /api/leaderboard/overall-champion
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getOverallChampion = async (req, res, next) => {
    try {
        const sportFestId = await getActiveSportFestId();

        const [[festRow]] = await pool.execute(
            `SELECT champion_department_id, status FROM sport_fest_events WHERE id <=> ?`,
            [sportFestId]
        );
        const manuallyDeclared = !!(festRow && festRow.champion_department_id);
        const [[totals]] = await pool.execute(
            `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN t.status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) AS incomplete
     FROM tournaments t
     JOIN sport_fest_tournaments sft ON t.id = sft.tournament_id
     WHERE sft.sport_fest_id <=> ?`,
            [sportFestId]
        );
        const hasTournaments = Number(totals.total) > 0;
        const allComplete = manuallyDeclared || (hasTournaments && Number(totals.incomplete) === 0);

        // Current leader / champion (rank 1) for THIS season
        const [leaders] = await pool.execute(
            `SELECT
                d.id, d.name, d.code, d.color, d.logo_url,
                COALESCE(ds.total_points,  0) AS total_points,
                COALESCE(ds.gold_medals,   0) AS gold_medals,
                COALESCE(ds.silver_medals, 0) AS silver_medals,
                COALESCE(ds.bronze_medals, 0) AS bronze_medals
             FROM departments d
             LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
             WHERE d.is_active = 1
             ORDER BY total_points DESC, gold_medals DESC, silver_medals DESC, bronze_medals DESC
             LIMIT 1`,
            [sportFestId]
        );

        const leader = leaders[0] || null;

        // Sport breakdown for the leader, THIS season only
        let sportBreakdown = [];
        if (leader) {
            const [breakdown] = await pool.execute(
                `SELECT
                    s.name  AS sport_name,
                    s.code  AS sport_code,
                    tr.rank,
                    tr.medal,
                    tr.sport_fest_points,
                    t.name  AS tournament_name
                 FROM tournament_results tr
                 JOIN tournaments t ON tr.tournament_id = t.id
                 JOIN sports      s ON t.sport_id       = s.id
                 JOIN sport_fest_tournaments sft ON t.id = sft.tournament_id
                 WHERE tr.department_id = ? AND sft.sport_fest_id <=> ?
                 ORDER BY tr.sport_fest_points DESC`,
                [leader.id, sportFestId]
            );
            sportBreakdown = breakdown;
        }

        // Full leaderboard for the widget, THIS season
        const [leaderboard] = await pool.execute(
            `SELECT
                d.id, d.name, d.code, d.color, d.logo_url,
                COALESCE(ds.total_points,  0) AS total_points,
                COALESCE(ds.gold_medals,   0) AS gold_medals,
                COALESCE(ds.silver_medals, 0) AS silver_medals,
                COALESCE(ds.bronze_medals, 0) AS bronze_medals,
                RANK() OVER (
                    ORDER BY
                        COALESCE(ds.total_points,  0) DESC,
                        COALESCE(ds.gold_medals,   0) DESC,
                        COALESCE(ds.silver_medals, 0) DESC
                ) AS \`rank\`
             FROM departments d
             LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
             WHERE d.is_active = 1
             ORDER BY total_points DESC, gold_medals DESC`,
            [sportFestId]
        );

        // Tournament progress stats for THIS season
        const [[stats]] = await pool.execute(
            `SELECT
                COUNT(*)                                                         AS total_tournaments,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)          AS completed_tournaments,
                SUM(CASE WHEN t.status = 'ongoing'   THEN 1 ELSE 0 END)          AS ongoing_tournaments,
                SUM(CASE WHEN t.status IN ('draft','registration') THEN 1 ELSE 0 END) AS upcoming_tournaments
             FROM tournaments t
             JOIN sport_fest_tournaments sft ON t.id = sft.tournament_id
             WHERE sft.sport_fest_id <=> ?`,
            [sportFestId]
        );

        return res.json({
            success: true,
            data: {
                is_final: allComplete,
                message: allComplete
                    ? `🏆 ${leader?.name || 'TBD'} is the Sport Fest Overall Champion!`
                    : `📊 Current standings (${stats.completed_tournaments || 0}/${stats.total_tournaments || 0} events completed)`,
                champion: allComplete ? leader : null,
                current_leader: !allComplete ? leader : null,
                sport_breakdown: sportBreakdown,
                leaderboard,
                tournament_stats: stats,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET DEPARTMENT MVP  (top MVP per department)
// GET /api/leaderboard/department-mvp/:departmentId
// All-time — see note on getBySport.
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getDepartmentMVP = async (req, res, next) => {
    try {
        const { departmentId } = req.params;

        const [rows] = await pool.execute(
            `SELECT
                mr.mvp_player_id   AS player_id,
                mr.mvp_player_name AS player_name,
                s.name             AS sport_name,
                COUNT(mr.match_id) AS mvp_count,
                MAX(mr.created_at) AS last_awarded
             FROM match_results mr
             INNER JOIN matches    m ON mr.match_id     = m.id
             LEFT JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN sports      s ON t.sport_id      = s.id
             WHERE m.winner_department_id = ?
               AND mr.mvp_player_name IS NOT NULL
               AND mr.mvp_player_name != ''
             GROUP BY mr.mvp_player_id, mr.mvp_player_name, s.id
             ORDER BY mvp_count DESC
             LIMIT 10`,
            [departmentId]
        );

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET OVERALL MVP  (across all departments)
// GET /api/leaderboard/overall-mvp
// All-time — see note on getBySport.
// Protected: all roles (public)
// ---------------------------------------------------------------------------
const getOverallMVP = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                mr.mvp_player_id   AS player_id,
                mr.mvp_player_name AS player_name,
                d.name             AS department_name,
                d.color            AS department_color,
                s.name             AS sport_name,
                COUNT(mr.match_id) AS mvp_count,
                MAX(mr.created_at) AS last_awarded
             FROM match_results mr
             INNER JOIN matches    m ON mr.match_id         = m.id
             LEFT JOIN departments d ON m.winner_department_id = d.id
             LEFT JOIN tournaments t ON m.tournament_id     = t.id
             LEFT JOIN sports      s ON t.sport_id          = s.id
             WHERE mr.mvp_player_name IS NOT NULL AND mr.mvp_player_name != ''
             GROUP BY mr.mvp_player_id, mr.mvp_player_name, d.id, s.id
             ORDER BY mvp_count DESC
             LIMIT 10`
        );

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// RECALCULATE LEADERBOARD  (re-aggregates from tournament_results)
// POST /api/leaderboard/recalculate
// Protected: admin | sgo_president
//
// SEASON FIX: the previous version grouped only by department_id, which
// after the season migration would collapse every season's history into
// a single row (data loss) and then fight with the new unique key on
// (department_id, sport_fest_id) — each run could pile up duplicate rows
// instead of updating in place. This version groups by season too, via
// tournament → sport_fest_tournaments → sport_fest_id, and rebuilds
// EVERY season's totals correctly and independently.
//
// LIVE UPDATE: this is a full rebuild of department_scores, so it can
// change what every visitor's leaderboard/medal-tally/dashboard widget
// is showing. Emits a global 'leaderboard:changed' once committed so
// connected clients can silently refetch instead of needing a refresh.
// ---------------------------------------------------------------------------
const recalculate = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await rebuildDepartmentScores(conn);

        await conn.commit();

        cache.clearPrefix('leaderboard:');

        await logActivity(
            req.user.id,
            'LEADERBOARD_RECALCULATED',
            'system',
            null,
            'Leaderboard manually recalculated (all seasons rebuilt)'
        );

        emitToLeaderboard('leaderboard:changed', { reason: 'manual_recalculate' });

        return res.json({ success: true, message: 'Leaderboard recalculated successfully.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};
const getLiveLeaderboard = async (req, res, next) => {
    try {
        const sportFestId = await getActiveSportFestId();

        const [rows] = await pool.execute(
            `SELECT
          d.id, d.name, d.code, d.color, d.logo_url, d.short_name,
          COALESCE(ds.total_points, 0) AS total_points,
          COALESCE(ds.gold_medals, 0) AS gold_medals,
          COALESCE(ds.silver_medals, 0) AS silver_medals,
          COALESCE(ds.bronze_medals, 0) AS bronze_medals,
          RANK() OVER (
              ORDER BY
                  COALESCE(ds.total_points, 0) DESC,
                  COALESCE(ds.gold_medals, 0) DESC,
                  COALESCE(ds.silver_medals, 0) DESC
          ) AS \`rank\`
       FROM departments d
       LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
       WHERE d.is_active = 1
       ORDER BY total_points DESC, gold_medals DESC`,
            [sportFestId]
        );

        const [[liveCount]] = await pool.execute(
            'SELECT COUNT(*) AS count FROM matches WHERE status = "ongoing"'
        );

        const [recent] = await pool.execute(
            `SELECT 
          'match' AS type,
          m.id,
          m.status,
          da.name AS dept_a,
          db.name AS dept_b,
          s.name AS sport_name,
          m.updated_at
       FROM matches m
       LEFT JOIN departments da ON m.participant_a_department_id = da.id
       LEFT JOIN departments db ON m.participant_b_department_id = db.id
       LEFT JOIN sports s ON m.sport_id = s.id
       WHERE m.status IN ('ongoing', 'completed')
       ORDER BY m.updated_at DESC
       LIMIT 10`
        );

        return res.json({
            success: true,
            data: {
                leaderboard: rows,
                live_matches: liveCount.count,
                recent_activity: recent,
                last_updated: new Date()
            }
        });
    } catch (err) {
        next(err);
    }
};

const getActivityFeed = async (req, res, next) => {
    try {
        const { limit = 20 } = req.query;

        const [activity] = await pool.execute(
            `SELECT
          'score' AS type,
          m.id AS match_id,
          da.name AS dept_a_name,
          db.name AS dept_b_name,
          s.name AS sport_name,
          ms.score_a,
          ms.score_b,
          ms.period,
          ms.updated_at,
          CONCAT(u.first_name, ' ', u.last_name) AS updated_by
       FROM match_scores ms
       JOIN matches m ON ms.match_id = m.id
       LEFT JOIN departments da ON m.participant_a_department_id = da.id
       LEFT JOIN departments db ON m.participant_b_department_id = db.id
       LEFT JOIN sports s ON m.sport_id = s.id
       LEFT JOIN users u ON ms.updated_by = u.id
       WHERE m.status != 'cancelled'
       ORDER BY ms.updated_at DESC
       LIMIT ?`,
            [parseInt(limit)]
        );

        return res.json({ success: true, data: activity });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getLeaderboard,
    getDepartmentRanking,
    getMedalTally,
    getBySport,
    getTopScorers,
    getWinningTeams,
    getChampionTeams,
    getOverallChampion,
    getDepartmentMVP,
    getOverallMVP,
    recalculate,
    getLiveLeaderboard,
    getActivityFeed,
};