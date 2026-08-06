const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { emitToAll, emitToLeaderboard } = require('../utils/socketEmit')


const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT sf.*,
                   d.name as champion_department_name,
                   d.color as champion_color,
                   COUNT(DISTINCT sft.tournament_id) as tournament_count
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            LEFT JOIN sport_fest_tournaments sft ON sf.id = sft.sport_fest_id
            GROUP BY sf.id
            ORDER BY sf.year DESC, sf.id DESC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getActive = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT sf.*, d.name as champion_name
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            WHERE sf.is_current = 1
            LIMIT 1
        `);

        res.json({ success: true, data: rows[0] || null });
    } catch (err) {
        next(err);
    }
};


const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT sf.*, d.name as champion_name
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            WHERE sf.id = ?
        `, [req.params.id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Sport Fest event not found' });
        }

        const [tournaments] = await pool.execute(`
            SELECT t.*, s.name as sport_name, s.category
            FROM sport_fest_tournaments sft
            JOIN tournaments t ON sft.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            WHERE sft.sport_fest_id = ?
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...rows[0],
                tournaments
            }
        });

    } catch (err) {
        next(err);
    }
};


const create = async (req, res, next) => {
    try {
        const { name, year, theme, start_date, end_date, description } = req.body;

        const [result] = await pool.execute(
            `INSERT INTO sport_fest_events 
             (name, year, theme, start_date, end_date, description) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, year, theme, start_date, end_date, description || null]
        );

        await logActivity(
            req.user.id,
            'SPORTFEST_CREATED',
            'sport_fest',
            result.insertId,
            `Sport Fest created: ${name}`
        );

        res.status(201).json({
            success: true,
            message: 'Sport Fest event created',
            data: { id: result.insertId }
        });

    } catch (err) {
        next(err);
    }
};


const update = async (req, res, next) => {
    try {
        const { name, year, theme, start_date, end_date, description, status } = req.body;

        await pool.execute(
            `UPDATE sport_fest_events 
             SET name=?, year=?, theme=?, start_date=?, end_date=?, description=?, status=? 
             WHERE id=?`,
            [
                name,
                year,
                theme,
                start_date,
                end_date,
                description || null,
                status || 'upcoming',
                req.params.id
            ]
        );

        res.json({ success: true, message: 'Sport Fest event updated' });

    } catch (err) {
        next(err);
    }
};


const addTournament = async (req, res, next) => {
    try {
        const { tournament_id } = req.body;

        await pool.execute(
            `INSERT IGNORE INTO sport_fest_tournaments (sport_fest_id, tournament_id)
             VALUES (?, ?)`,
            [req.params.id, tournament_id]
        );

        res.json({ success: true, message: 'Tournament linked to Sport Fest' });

    } catch (err) {
        next(err);
    }
};


const removeTournament = async (req, res, next) => {
    try {
        await pool.execute(
            `DELETE FROM sport_fest_tournaments 
             WHERE sport_fest_id=? AND tournament_id=?`,
            [req.params.id, req.params.tournamentId]
        );

        res.json({ success: true, message: 'Tournament removed from Sport Fest' });

    } catch (err) {
        next(err);
    }
};


const declareChampion = async (req, res, next) => {
    try {
        const festId = req.params.id;

        const [rows] = await pool.execute(`
            SELECT d.id, d.name,
                   COALESCE(ds.total_points,0) as total_points,
                   COALESCE(ds.gold_medals,0) as gold_medals
            FROM departments d
            LEFT JOIN department_scores ds
                ON d.id = ds.department_id AND ds.sport_fest_id = ?
            WHERE d.is_active = 1
            ORDER BY total_points DESC, gold_medals DESC
            LIMIT 1
        `, [festId]);

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'No departments found' });
        }

        const champion = rows[0];

        await pool.execute(
            `UPDATE sport_fest_events 
             SET champion_department_id=?, status='completed' 
             WHERE id=?`,
            [champion.id, festId]
        );

        await logActivity(
            req.user.id,
            'CHAMPION_DECLARED',
            'sport_fest',
            festId,
            `Champion declared: ${champion.name}`
        );

        emitToAll('champion:declared', {
            sport_fest_id: parseInt(festId),
            champion: {
                id: champion.id,
                name: champion.name,
                total_points: champion.total_points,
            },
            message: `🏆 ${champion.name} declared as Sport Fest Champion!`
        });

        emitToLeaderboard('leaderboard:changed', {
            reason: 'champion_declared',
            sport_fest_id: parseInt(festId)
        });

        res.json({
            success: true,
            message: `🏆 ${champion.name} declared as Sport Fest Champion!`,
            data: champion
        });

    } catch (err) {
        next(err);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const [fest] = await pool.execute(`
            SELECT sf.*, d.name as champion_name, d.color as champion_color
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            WHERE sf.id = ?
        `, [req.params.id]);

        if (!fest.length) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [leaderboard] = await pool.execute(`
            SELECT d.id, d.name, d.code, d.color,
                   COALESCE(ds.total_points,0) as total_points,
                   COALESCE(ds.gold_medals,0) as gold,
                   COALESCE(ds.silver_medals,0) as silver,
                   COALESCE(ds.bronze_medals,0) as bronze
            FROM departments d
            LEFT JOIN department_scores ds
                ON d.id = ds.department_id AND ds.sport_fest_id = ?
            WHERE d.is_active = 1
            ORDER BY total_points DESC, gold DESC
        `, [req.params.id]);

        const [tournamentSummary] = await pool.execute(`
            SELECT 
                s.name as sport_name,
                t.name as tournament_name,
                t.status,
                t.format,
                t.gender,
                winner.name as winner_department,
                (
                    SELECT COUNT(DISTINCT tp.department_id)
                    FROM tournament_participants tp
                    WHERE tp.tournament_id = t.id
                ) as departments_participated
            FROM sport_fest_tournaments sft
            JOIN tournaments t ON sft.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            LEFT JOIN tournament_results tr
                ON t.id = tr.tournament_id AND tr.\`rank\` = 1
            LEFT JOIN departments winner ON tr.department_id = winner.id
            WHERE sft.sport_fest_id = ?
            ORDER BY t.name
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                event: fest[0],
                leaderboard,
                tournaments: tournamentSummary
            }
        });

    } catch (err) {
        next(err);
    }
};

const startNewSeason = async (req, res, next) => {
    try {
        const { name, year, theme, start_date, end_date, description } = req.body;

        if (!name || !year) {
            return res.status(400).json({ success: false, message: 'Name and year are required' });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [current] = await conn.execute(
                `SELECT id, name FROM sport_fest_events WHERE is_current = 1 LIMIT 1`
            );

            if (current.length) {
                await conn.execute(
                    `UPDATE sport_fest_events 
                     SET is_current = 0, 
                         status = IF(status = 'completed', status, 'completed') 
                     WHERE id = ?`,
                    [current[0].id]
                );
            }

            const [result] = await conn.execute(
                `INSERT INTO sport_fest_events 
                 (name, year, theme, start_date, end_date, description, status, is_current)
                 VALUES (?, ?, ?, ?, ?, ?, 'upcoming', 1)`,
                [name, year, theme || null, start_date || null, end_date || null, description || null]
            );

            await conn.commit();

            await logActivity(
                req.user.id,
                'SEASON_STARTED',
                'sport_fest',
                result.insertId,
                `New season started: ${name} (${year})` +
                (current.length ? `, archived "${current[0].name}"` : '')
            );

            res.status(201).json({
                success: true,
                message: current.length
                    ? `New season "${name}" started. "${current[0].name}" is now archived.`
                    : `New season "${name}" started.`,
                data: { id: result.insertId }
            });

        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

    } catch (err) {
        next(err);
    }
};


const remove = async (req, res, next) => {
    try {
        const festId = parseInt(req.params.id, 10);

        const [rows] = await pool.execute(
            'SELECT id, name, is_current, status FROM sport_fest_events WHERE id = ?',
            [festId]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Sport Fest event not found.' });
        }

        const fest = rows[0];

        if (Number(fest.is_current) === 1) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete the current season. Use "Start New Season" to archive it first, then delete the archived event if needed.',
            });
        }

        // 2) Linked tournaments still open
        const [openTourneys] = await pool.execute(
            `SELECT COUNT(*) AS count
             FROM sport_fest_tournaments sft
             JOIN tournaments t ON t.id = sft.tournament_id
             WHERE sft.sport_fest_id = ?
               AND t.status IN ('draft', 'registration', 'ongoing')`,
            [festId]
        );
        if (Number(openTourneys[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete this Sport Fest — it still has draft, registration, or ongoing tournaments. Finalize or cancel them first.',
            });
        }

        const [openMatches] = await pool.execute(
            `SELECT COUNT(*) AS count
             FROM matches m
             JOIN sport_fest_tournaments sft ON sft.tournament_id = m.tournament_id
             WHERE sft.sport_fest_id = ?
               AND m.status IN ('pending', 'scheduled', 'ongoing')`,
            [festId]
        );
        if (Number(openMatches[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete this Sport Fest — linked tournaments still have pending, scheduled, or ongoing matches. Complete or cancel those matches first.',
            });
        }

        await pool.execute(
            'DELETE FROM sport_fest_tournaments WHERE sport_fest_id = ?',
            [festId]
        );
        await pool.execute(
            'DELETE FROM sport_fest_events WHERE id = ?',
            [festId]
        );

        await logActivity(
            req.user.id,
            'SPORTFEST_DELETED',
            'sport_fest',
            festId,
            `Sport Fest deleted: ${fest.name}`
        );

        return res.json({
            success: true,
            message: `Sport Fest "${fest.name}" deleted.`,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getActive,
    getOne,
    create,
    update,
    addTournament,
    removeTournament,
    declareChampion,
    getSummary,
    startNewSeason,
    remove,
};