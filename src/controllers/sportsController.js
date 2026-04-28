const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');


const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT s.*,
                   COUNT(DISTINCT t.id) as total_tournaments,
                   (s.max_entries IS NULL OR s.current_entries < s.max_entries) AS is_available
            FROM sports s
            LEFT JOIN tournaments t ON s.id = t.sport_id
            WHERE s.is_active = 1
            GROUP BY s.id
            ORDER BY s.name
        `);

        res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};


const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM sports WHERE id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Sport not found'
            });
        }

        res.json({ success: true, data: rows[0] });

    } catch (err) {
        next(err);
    }
};


const getTournaments = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT t.*,
                   COUNT(DISTINCT tp.department_id) as participant_count
            FROM tournaments t
            LEFT JOIN tournament_participants tp 
                ON t.id = tp.tournament_id
            WHERE t.sport_id = ?
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `, [req.params.id]);

        res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};


const create = async (req, res, next) => {
    try {
        const {
            name,
            code,
            category,
            description,
            min_players,
            max_players,
            team_size,
            scoring_type,
            icon
        } = req.body;


        const validScoringTypes = ['points', 'time', 'binary'];
        const finalScoringType = validScoringTypes.includes(scoring_type)
            ? scoring_type
            : 'points';

        const [result] = await pool.execute(
            `INSERT INTO sports 
             (name, code, category, description, min_players, max_players, team_size, scoring_type, icon)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                code.toUpperCase(),
                category,
                description || null,
                min_players || 1,
                max_players || 1,
                team_size || 1,
                finalScoringType,
                icon || null
            ]
        );

        await logActivity(
            req.user.id,
            'SPORT_CREATED',
            'sport',
            result.insertId,
            `Sport created: ${name} (Scoring: ${finalScoringType})`
        );

        res.status(201).json({
            success: true,
            message: 'Sport created successfully',
            data: {
                id: result.insertId,
                scoring_type: finalScoringType
            }
        });

    } catch (err) {
        next(err);
    }
};


const update = async (req, res, next) => {
    try {
        const {
            name,
            code,
            category,
            description,
            min_players,
            max_players,
            team_size,
            scoring_type,
            icon,
            is_active
        } = req.body;

        await pool.execute(
            `UPDATE sports 
             SET name = ?, 
                 code = ?, 
                 category = ?, 
                 description = ?, 
                 min_players = ?, 
                 max_players = ?, 
                 team_size = ?, 
                 scoring_type = ?, 
                 icon = ?, 
                 is_active = ?
             WHERE id = ?`,
            [
                name,
                code?.toUpperCase(),
                category,
                description || null,
                min_players || 1,
                max_players || 1,
                team_size || 1,
                scoring_type || 'points',
                icon || null,
                is_active !== undefined ? is_active : 1,
                req.params.id
            ]
        );

        res.json({ success: true, message: 'Sport updated' });

    } catch (err) {
        next(err);
    }
};


const remove = async (req, res, next) => {
    try {
        await pool.execute(
            `UPDATE sports SET is_active = 0 WHERE id = ?`,
            [req.params.id]
        );

        res.json({ success: true, message: 'Sport deactivated' });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getOne,
    getTournaments,
    create,
    update,
    remove
};