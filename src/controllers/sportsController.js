const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');

const VALID_SCORING = ['points', 'time', 'sets', 'binary', 'custom'];
const VALID_CATEGORY = ['individual', 'team'];

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
        const [rows] = await pool.execute(`SELECT * FROM sports WHERE id = ?`, [req.params.id]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Sport not found' });
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
            LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
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
            name, code, category, description,
            min_players, max_players, team_size,
            scoring_type, sets_to_win, icon,
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Name and code are required.' });
        }

        const finalScoring = VALID_SCORING.includes(scoring_type) ? scoring_type : 'points';
        const finalCategory = VALID_CATEGORY.includes(category) ? category : 'team';
        const finalSets = finalScoring === 'sets' ? (parseInt(sets_to_win) || 2) : null;

        const [result] = await pool.execute(
            `INSERT INTO sports
             (name, code, category, description, min_players, max_players, team_size,
              scoring_type, sets_to_win, icon, is_team_sport)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                code.toUpperCase().trim(),
                finalCategory,
                description || null,
                min_players || 1,
                max_players || 1,
                team_size || 1,
                finalScoring,
                finalSets,
                icon || null,
                finalCategory === 'team' ? 1 : 0,
            ]
        );

        await logActivity(
            req.user.id, 'SPORT_CREATED', 'sport', result.insertId,
            `Sport created: ${name} (Scoring: ${finalScoring})`
        );

        res.status(201).json({
            success: true,
            message: 'Sport created successfully',
            data: { id: result.insertId, scoring_type: finalScoring },
        });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const {
            name, code, category, description,
            min_players, max_players, team_size,
            scoring_type, sets_to_win, icon, is_active,
        } = req.body;

        const finalScoring = VALID_SCORING.includes(scoring_type) ? scoring_type : 'points';
        const finalCategory = VALID_CATEGORY.includes(category) ? category : undefined;
        const finalSets = finalScoring === 'sets' ? (parseInt(sets_to_win) || 2) : null;

        await pool.execute(
            `UPDATE sports
             SET name = COALESCE(?, name),
                 code = COALESCE(?, code),
                 category = COALESCE(?, category),
                 description = ?,
                 min_players = COALESCE(?, min_players),
                 max_players = COALESCE(?, max_players),
                 team_size = COALESCE(?, team_size),
                 scoring_type = ?,
                 sets_to_win = ?,
                 icon = ?,
                 is_active = COALESCE(?, is_active),
                 is_team_sport = IF(? IS NOT NULL, IF(? = 'team', 1, 0), is_team_sport),
                 updated_at = NOW()
             WHERE id = ?`,
            [
                name || null,
                code ? code.toUpperCase() : null,
                finalCategory || null,
                description || null,
                min_players || null,
                max_players || null,
                team_size || null,
                finalScoring,
                finalSets,
                icon || null,
                is_active !== undefined ? Number(is_active) : null,
                finalCategory || null,
                finalCategory || null,
                req.params.id,
            ]
        );

        res.json({ success: true, message: 'Sport updated' });
    } catch (err) {
        next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        // Same guard pattern as departmentController/venueController — a
        // sport with tournaments still open shouldn't be able to vanish
        // out from under registration/bracket/scoring flows.
        const [active] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tournaments
             WHERE sport_id = ? AND status IN ('draft', 'registration', 'ongoing')`,
            [req.params.id]
        );
        if (active[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate a sport with active tournaments (draft, registration, or ongoing). Finalize or cancel them first.',
            });
        }

        await pool.execute(`UPDATE sports SET is_active = 0 WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Sport deactivated' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getOne, getTournaments, create, update, remove };