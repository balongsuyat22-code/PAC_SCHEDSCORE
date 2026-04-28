
const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT d.*,
                COALESCE(ds.total_points, 0) AS total_points, 
                COALESCE(ds.gold_medals, 0) AS gold_medals, 
                COALESCE(ds.silver_medals, 0) AS silver_medals, 
                COALESCE(ds.bronze_medals, 0) AS bronze_medals,
                COALESCE(ds.total_participations, 0) AS total_participations, 
                COALESCE(ds.tournaments_entered, 0) AS tournaments_entered,

                COUNT(DISTINCT t.id) AS total_teams,
                COUNT(DISTINCT p.id) AS total_members

            FROM departments d
            LEFT JOIN department_scores ds ON d.id = ds.department_id
            LEFT JOIN teams t ON d.id = t.department_id
            LEFT JOIN players p ON t.id = p.team_id

            WHERE d.is_active = 1

            GROUP BY d.id
            ORDER BY COALESCE(ds.total_points, 0) DESC, d.name ASC`
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT d.*,
                COALESCE(ds.total_points, 0) AS total_points, 
                COALESCE(ds.gold_medals, 0) AS gold_medals, 
                COALESCE(ds.silver_medals, 0) AS silver_medals, 
                COALESCE(ds.bronze_medals, 0) AS bronze_medals,
                COALESCE(ds.total_participations, 0) AS total_participations, 
                COALESCE(ds.tournaments_entered, 0) AS tournaments_entered,

                COUNT(DISTINCT t.id) AS total_teams,
                COUNT(DISTINCT p.id) AS total_members

            FROM departments d
            LEFT JOIN department_scores ds ON d.id = ds.department_id
            LEFT JOIN teams t ON d.id = t.department_id
            LEFT JOIN players p ON t.id = p.team_id

            WHERE d.id = ?
            GROUP BY d.id`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Grade/Strand not found'
            });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};


const getScores = async (req, res, next) => {
    try {
        const [scores] = await pool.execute(
            `SELECT 
                tr.rank,
                tr.medal,
                tr.sport_fest_points,
                t.name AS tournament_name,
                s.name AS sport_name,
                tr.finalized_at
            FROM tournament_results tr
            JOIN tournaments t ON tr.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            WHERE tr.department_id = ?
            ORDER BY tr.finalized_at DESC`,
            [req.params.id]
        );

        res.json({ success: true, data: scores });
    } catch (err) {
        next(err);
    }
};
const create = async (req, res, next) => {
    try {
        const { name, code, description, color, logo_url, short_name } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Name and code are required' });
        }

        let finalLogoUrl = logo_url || null;
        if (req.file) {
            finalLogoUrl = `/uploads/departments/${req.file.filename}`;
        }

        const [result] = await pool.execute(
            `INSERT INTO departments 
            (name, code, description, color, logo_url, short_name)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                name,
                code.toUpperCase(),
                description || null,
                color || '#3B82F6',
                finalLogoUrl,
                short_name || null
            ]
        );

        await pool.execute(
            'INSERT INTO department_scores (department_id, total_points) VALUES (?, 0)',
            [result.insertId]
        );

        await logActivity(req.user.id, 'DEPARTMENT_CREATED', 'department', result.insertId, `Grade/Strand created: ${name}`);

        res.status(201).json({ success: true, message: 'Grade/Strand created', data: { id: result.insertId } });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const { name, code, description, color, logo_url, short_name, is_active } = req.body;

        let finalLogoUrl = logo_url;
        if (req.file) {
            finalLogoUrl = `/uploads/departments/${req.file.filename}`;
        }

        await pool.execute(
            `UPDATE departments 
             SET name=?, code=?, description=?, color=?, logo_url=?, short_name=?, is_active=?
             WHERE id=?`,
            [
                name,
                code ? code.toUpperCase() : null,
                description || null,
                color || '#3B82F6',
                finalLogoUrl || null,
                short_name || null,
                is_active !== undefined ? is_active : 1,
                req.params.id
            ]
        );

        await logActivity(req.user.id, 'DEPARTMENT_UPDATED', 'department', req.params.id, `Grade/Strand updated: ${name}`);

        res.json({ success: true, message: 'Grade/Strand updated' });
    } catch (err) {
        next(err);
    }
};

const getPlayers = async (req, res, next) => {
    try {
        const [players] = await pool.execute(
            `SELECT p.*, t.name AS team_name
             FROM players p
             JOIN teams t ON p.team_id = t.id
             WHERE t.department_id = ?`,
            [req.params.id]
        );

        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};


const remove = async (req, res, next) => {
    try {
        await pool.execute(
            'UPDATE departments SET is_active = 0 WHERE id = ?',
            [req.params.id]
        );

        await logActivity(
            req.user.id,
            'DEPARTMENT_DEACTIVATED',
            'department',
            req.params.id,
            'Grade/Strand deactivated'
        );

        res.json({
            success: true,
            message: 'Grade/Strand deactivated'
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getOne,
    getScores,
    create,
    getPlayers,
    update,
    remove
};