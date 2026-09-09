const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { resolveSportFestId } = require('../utils/season');

const parseCheckbox = (value) => value === true || value === 1 || value === '1' || value === 'true';

const getAll = async (req, res, next) => {
    try {
        const { sportFestId, unscoped } = await resolveSportFestId(req.query.season_id);

        const scoreJoin = unscoped
            ? 'LEFT JOIN department_scores ds ON d.id = ds.department_id'
            : 'LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?';
        const teamJoin = unscoped
            ? 'LEFT JOIN teams t ON d.id = t.department_id'
            : 'LEFT JOIN teams t ON d.id = t.department_id AND t.sport_fest_id <=> ?';

        const params = unscoped ? [] : [sportFestId, sportFestId];

        const [rows] = await pool.execute(
            `
  SELECT
    d.id,
    d.name,
    d.code,
    d.description,
    d.color,
    d.logo_url,
    d.short_name,
    d.division,
    d.is_exhibition,
    d.is_active,
    d.created_at,
    d.updated_at,
    COALESCE(MAX(ds.total_points), 0) AS total_points,
    COALESCE(MAX(ds.gold_medals), 0) AS gold_medals,
    COALESCE(MAX(ds.silver_medals), 0) AS silver_medals,
    COALESCE(MAX(ds.bronze_medals), 0) AS bronze_medals,
    COALESCE(MAX(ds.total_participations), 0) AS total_participations,
    COALESCE(MAX(ds.tournaments_entered), 0) AS tournaments_entered,
    COUNT(DISTINCT t.id) AS total_teams,
    COUNT(DISTINCT p.id) AS total_members
  FROM departments d
  ${scoreJoin}
  ${teamJoin}
  LEFT JOIN players p
    ON t.id = p.team_id AND p.status = 'approved'
  WHERE d.is_active = 1
  GROUP BY
    d.id, d.name, d.code, d.description, d.color,
    d.logo_url, d.short_name, d.division, d.is_exhibition, d.is_active, d.created_at, d.updated_at
  ORDER BY total_points DESC, d.name ASC
  `,
            params
        );
        return res.json({
            success: true,
            data: rows,
            meta: { sport_fest_id: sportFestId, unscoped },
        });
    } catch (err) {
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const { sportFestId, unscoped } = await resolveSportFestId(req.query.season_id);

        const scoreJoin = unscoped
            ? 'LEFT JOIN department_scores ds ON d.id = ds.department_id'
            : 'LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?';
        const teamJoin = unscoped
            ? 'LEFT JOIN teams t ON d.id = t.department_id'
            : 'LEFT JOIN teams t ON d.id = t.department_id AND t.sport_fest_id <=> ?';

        const params = unscoped
            ? [req.params.id]
            : [sportFestId, sportFestId, req.params.id];

        const [rows] = await pool.execute(
            `SELECT
                d.id,
                d.name,
                d.code,
                d.description,
                d.color,
                d.logo_url,
                d.short_name,
                d.division,
                d.is_exhibition,
                d.is_active,
                d.created_at,
                d.updated_at,
                COALESCE(MAX(ds.total_points), 0) AS total_points,
                COALESCE(MAX(ds.gold_medals), 0) AS gold_medals,
                COALESCE(MAX(ds.silver_medals), 0) AS silver_medals,
                COALESCE(MAX(ds.bronze_medals), 0) AS bronze_medals,
                COALESCE(MAX(ds.total_participations), 0) AS total_participations,
                COALESCE(MAX(ds.tournaments_entered), 0) AS tournaments_entered,
                COUNT(DISTINCT t.id) AS total_teams,
                COUNT(DISTINCT p.id) AS total_members
             FROM departments d
             ${scoreJoin}
             ${teamJoin}
             LEFT JOIN players p ON t.id = p.team_id AND p.status = 'approved'
             WHERE d.id = ?
             GROUP BY
                d.id, d.name, d.code, d.description, d.color,
                d.logo_url, d.short_name, d.division, d.is_exhibition, d.is_active, d.created_at, d.updated_at`,
            params
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Department not found.' });
        }

        return res.json({
            success: true,
            data: rows[0],
            meta: { sport_fest_id: sportFestId, unscoped },
        });
    } catch (err) {
        next(err);
    }
};

const getScores = async (req, res, next) => {
    try {
        const { season_id } = req.query;
        const { sportFestId, unscoped } = await resolveSportFestId(season_id);

        let query = `
            SELECT
                tr.\`rank\`, tr.medal, tr.sport_fest_points,
                t.name   AS tournament_name,
                s.name   AS sport_name,
                tr.finalized_at,
                sft.sport_fest_id
             FROM tournament_results tr
             JOIN tournaments t ON tr.tournament_id = t.id
             JOIN sports      s ON t.sport_id       = s.id
             LEFT JOIN sport_fest_tournaments sft ON t.id = sft.tournament_id
             WHERE tr.department_id = ?
        `;
        const params = [req.params.id];

        if (!unscoped && sportFestId != null) {
            query += ' AND sft.sport_fest_id <=> ?';
            params.push(sportFestId);
        }

        query += ' ORDER BY tr.finalized_at DESC';

        const [scores] = await pool.execute(query, params);
        return res.json({
            success: true,
            data: scores,
            meta: { sport_fest_id: sportFestId, unscoped },
        });
    } catch (err) {
        next(err);
    }
};

const getPlayers = async (req, res, next) => {
    try {
        const deptId = parseInt(req.params.id, 10);

        if (req.user.role === 'dean_adviser' && req.user.department_id !== deptId) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const { status, season_id } = req.query;
        const { sportFestId, unscoped } = await resolveSportFestId(season_id);

        let query = `
            SELECT p.*,
                   t.name AS team_name,
                   s.name AS sport_name
            FROM players p
            LEFT JOIN teams  t ON p.team_id  = t.id
            LEFT JOIN sports s ON p.sport_id = s.id
            WHERE p.department_id = ?
        `;
        const params = [deptId];

        if (!unscoped && sportFestId != null) {
            query += ' AND p.sport_fest_id = ?';
            params.push(sportFestId);
        }

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }

        query += ' ORDER BY s.name, t.name, p.last_name';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        const { name, code, description, color, logo_url, short_name, division, is_exhibition } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Name and code are required.' });
        }

        const normalizedName = String(name).trim();
        const normalizedCode = String(code).trim().toUpperCase();
        const [dup] = await pool.execute(
            'SELECT id, name, code FROM departments WHERE name = ? OR code = ? LIMIT 1',
            [normalizedName, normalizedCode]
        );
        if (dup.length) {
            const field = dup[0].code === normalizedCode ? 'code' : 'name';
            return res.status(409).json({ success: false, message: `A department with this ${field} already exists.` });
        }

        let finalLogoUrl = logo_url || null;
        if (req.file) {
            finalLogoUrl = `/uploads/departments/${req.file.filename}`;
        }

        const [result] = await pool.execute(
            `INSERT INTO departments (name, code, description, color, logo_url, short_name, division, is_exhibition)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                normalizedName,
                normalizedCode,
                description || null,
                color || '#3B82F6',
                finalLogoUrl,
                short_name || null,
                division || null,
                parseCheckbox(is_exhibition) ? 1 : 0,
            ]
        );

        const { sportFestId } = await resolveSportFestId(undefined);
        if (sportFestId != null) {
            await pool.execute(
                'INSERT INTO department_scores (department_id, sport_fest_id, total_points) VALUES (?, ?, 0)',
                [result.insertId, sportFestId]
            );
        }

        await logActivity(
            req.user.id,
            'DEPARTMENT_CREATED',
            'department',
            result.insertId,
            `Department created: ${normalizedName} (${normalizedCode})`
        );

        return res.status(201).json({
            success: true,
            message: 'Department created successfully.',
            data: { id: result.insertId },
        });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const { name, code, description, color, logo_url, short_name, division, is_exhibition, is_active } = req.body;

        const [existing] = await pool.execute(
            'SELECT id, name, code, description, color, logo_url, short_name, division, is_exhibition, is_active FROM departments WHERE id = ?',
            [req.params.id]
        );
        if (!existing.length) {
            return res.status(404).json({ success: false, message: 'Department not found.' });
        }
        const cur = existing[0];

        let finalLogoUrl = logo_url !== undefined ? logo_url : cur.logo_url;
        if (req.file) {
            finalLogoUrl = `/uploads/departments/${req.file.filename}`;
        }

        const finalName = name != null && String(name).trim() !== '' ? String(name).trim() : cur.name;
        const finalCode = code != null && String(code).trim() !== ''
            ? String(code).trim().toUpperCase()
            : cur.code;

        const [duplicate] = await pool.execute(
            'SELECT id, name, code FROM departments WHERE id <> ? AND (name = ? OR code = ?) LIMIT 1',
            [req.params.id, finalName.trim(), finalCode.trim().toUpperCase()]
        );
        if (duplicate.length) {
            const field = duplicate[0].code === finalCode.trim().toUpperCase() ? 'code' : 'name';
            return res.status(409).json({ success: false, message: `A department with this ${field} already exists.` });
        }
        const finalDescription = description !== undefined ? (description || null) : cur.description;
        const finalColor = color != null && String(color).trim() !== '' ? color : (cur.color || '#3B82F6');
        const finalShortName = short_name !== undefined ? (short_name || null) : cur.short_name;
        const finalDivision = division !== undefined ? (division || null) : cur.division;
        const finalExhibition = is_exhibition !== undefined ? (parseCheckbox(is_exhibition) ? 1 : 0) : cur.is_exhibition;
        const finalActive = is_active !== undefined ? (parseCheckbox(is_active) ? 1 : 0) : cur.is_active;

        await pool.execute(
            `UPDATE departments
             SET name       = ?,
                 code       = ?,
                 description= ?,
                 color      = ?,
                 logo_url   = ?,
                 short_name = ?,
                 division   = ?,
                 is_exhibition = ?,
                 is_active  = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [
                finalName,
                finalCode,
                finalDescription,
                finalColor,
                finalLogoUrl || null,
                finalShortName,
                finalDivision,
                finalExhibition,
                finalActive,
                req.params.id,
            ]
        );

        await logActivity(
            req.user.id,
            'DEPARTMENT_UPDATED',
            'department',
            req.params.id,
            `Department updated: ${finalName}`
        );

        return res.json({ success: true, message: 'Department updated successfully.' });
    } catch (err) {
        next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const [active] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tournament_participants tp
             JOIN tournaments t ON tp.tournament_id = t.id
             WHERE tp.department_id = ? AND t.status IN ('registration','ongoing')`,
            [req.params.id]
        );
        if (active[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate a department that is currently participating in active tournaments.',
            });
        }

        await pool.execute('DELETE FROM sport_fest_champions WHERE department_id = ?', [req.params.id]);
        const [result] = await pool.execute('DELETE FROM departments WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: 'Department not found.' });
        }

        await logActivity(
            req.user.id,
            'DEPARTMENT_DELETED',
            'department',
            req.params.id,
            'Department permanently deleted'
        );

        return res.json({ success: true, message: 'Department deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getOne,
    getScores,
    getPlayers,
    create,
    update,
    remove,
};