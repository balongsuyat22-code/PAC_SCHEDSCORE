const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { resolveSportFestId } = require('../utils/season');

const VALID_SCORING = ['points', 'time', 'sets', 'binary', 'custom'];
const VALID_CATEGORY = ['individual', 'team'];

const getAll = async (req, res, next) => {
    try {
        const { sportFestId, unscoped } = await resolveSportFestId(req.query.season_id);

        let tournamentJoin;
        let params;
        if (unscoped) {
            tournamentJoin = `LEFT JOIN (
                SELECT sport_id, COUNT(*) AS total_tournaments
                FROM tournaments
                GROUP BY sport_id
            ) tournament_counts ON tournament_counts.sport_id = s.id`;
            params = [];
        } else if (sportFestId != null) {
            tournamentJoin = `
                LEFT JOIN (
                    SELECT t.sport_id, COUNT(DISTINCT t.id) AS total_tournaments
                    FROM tournaments t
                    JOIN sport_fest_tournaments sft
                      ON sft.tournament_id = t.id AND sft.sport_fest_id = ?
                    GROUP BY t.sport_id
                ) tournament_counts ON tournament_counts.sport_id = s.id`;
            params = [sportFestId];
        } else {
            tournamentJoin = `LEFT JOIN (
                SELECT sport_id, COUNT(*) AS total_tournaments
                FROM tournaments
                WHERE 1 = 0
                GROUP BY sport_id
            ) tournament_counts ON tournament_counts.sport_id = s.id`;
            params = [];
        }

        const [rows] = await pool.execute(
            `
            SELECT s.*,
                   COALESCE(tournament_counts.total_tournaments, 0) AS total_tournaments,
                   (s.max_entries IS NULL OR s.current_entries < s.max_entries) AS is_available
            FROM sports s
            ${tournamentJoin}
            WHERE s.is_active = 1
            ORDER BY s.name
            `,
            params
        );
        res.json({
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
        const { sportFestId, unscoped } = await resolveSportFestId(req.query.season_id);

        let seasonJoin = '';
        const params = [req.params.id];
        if (!unscoped && sportFestId != null) {
            seasonJoin = `JOIN sport_fest_tournaments sft
                ON sft.tournament_id = t.id AND sft.sport_fest_id = ?`;
            params.unshift(sportFestId);
        }

        let query = `
            SELECT t.*,
                   COALESCE(tp.participant_count, 0) AS participant_count
            FROM tournaments t
            LEFT JOIN (
                SELECT tournament_id, COUNT(DISTINCT department_id) AS participant_count
                FROM tournament_participants
                GROUP BY tournament_id
            ) tp ON tp.tournament_id = t.id
            ${seasonJoin}
            WHERE t.sport_id = ?
        `;

        if (!unscoped && sportFestId == null) {
            query += ' AND 1 = 0';
        }

        query += `
            ORDER BY t.created_at DESC
        `;

        const [rows] = await pool.execute(query, params);
        res.json({
            success: true,
            data: rows,
            meta: { sport_fest_id: sportFestId, unscoped },
        });
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