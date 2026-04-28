const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');


const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT v.*, COUNT(DISTINCT m.id) as scheduled_matches
       FROM venues v
       LEFT JOIN matches m ON v.id = m.venue_id AND m.status IN ('scheduled','ongoing')
       WHERE v.is_active = 1
       GROUP BY v.id ORDER BY v.name`
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM venues WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Venue not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};


const getSchedule = async (req, res, next) => {
    try {
        const { date } = req.query;
        let query = `
      SELECT m.id, m.scheduled_date, m.scheduled_time, m.status,
             s.name as sport_name,
             t.name as tournament_name,
             ta.name as team_a, tb.name as team_b
      FROM matches m
      JOIN sports s ON m.sport_id = s.id
      JOIN tournaments t ON m.tournament_id = t.id
      LEFT JOIN teams ta ON m.participant_a_team_id = ta.id
      LEFT JOIN teams tb ON m.participant_b_team_id = tb.id
      WHERE m.venue_id = ? AND m.status NOT IN ('cancelled')
    `;
        const params = [req.params.id];
        if (date) { query += ' AND m.scheduled_date = ?'; params.push(date); }
        query += ' ORDER BY m.scheduled_date, m.scheduled_time';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        const { name, location, capacity, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Venue name is required'
            });
        }

        if (capacity && (isNaN(capacity) || capacity < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Capacity must be a valid positive number'
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO venues (name, location, capacity, description) VALUES (?,?,?,?)',
            [
                name.trim(),
                location || null,
                capacity || 0,
                description || null
            ]
        );

        await logActivity(
            req.user.id,
            'VENUE_CREATED',
            'venue',
            result.insertId,
            `Venue created: ${name}`
        );

        res.status(201).json({
            success: true,
            message: 'Venue created',
            data: { id: result.insertId }
        });
    } catch (err) {
        next(err);
    }
};


const update = async (req, res, next) => {
    try {
        const { name, location, capacity, description, is_active } = req.body;
        await pool.execute(
            'UPDATE venues SET name=?, location=?, capacity=?, description=?, is_active=? WHERE id=?',
            [name, location || 0, capacity || 0, description || null, is_active !== undefined ? is_active : 1, req.params.id]
        );
        await logActivity(req.user.id, 'VENUE_UPDATED', 'venue', req.params.id, `Venue updated: ${name}`);
        res.json({ success: true, message: 'Venue updated' });
    } catch (err) {
        console.error('Venue update error:', err);
        next(err);
    }
};


const remove = async (req, res, next) => {
    try {
        await pool.execute('UPDATE venues SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Venue deactivated' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getOne,
    getSchedule,
    create,
    update,
    remove
};