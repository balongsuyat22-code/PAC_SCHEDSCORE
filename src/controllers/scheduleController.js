const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');


const getAll = async (req, res, next) => {
    try {
        const { date, tournament_id, venue_id } = req.query;

        let query = `
            SELECT sc.*, 
                   t.name as tournament_name, 
                   v.name as venue_name,
                   CONCAT(u.first_name,' ',u.last_name) as created_by_name
            FROM schedules sc
            LEFT JOIN tournaments t ON sc.tournament_id = t.id
            LEFT JOIN venues v ON sc.venue_id = v.id
            LEFT JOIN users u ON sc.created_by = u.id
            WHERE 1=1
        `;

        const params = [];
        if (date) {
            query += ' AND sc.scheduled_date = ?';
            params.push(date);
        }
        if (tournament_id) {
            query += ' AND sc.tournament_id = ?';
            params.push(tournament_id);
        }
        if (venue_id) {
            query += ' AND sc.venue_id = ?';
            params.push(venue_id);
        }

        query += ' ORDER BY sc.scheduled_date ASC, sc.start_time ASC';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};


const getToday = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                m.id as match_id,
                m.scheduled_time,
                m.status,
                m.bracket_position,
                s.name as sport_name,
                t.name as tournament_name,
                da.name as dept_a,
                da.color as dept_a_color,
                da.logo_url as dept_a_logo,
                db.name as dept_b,
                db.color as dept_b_color,
                 db.logo_url as dept_b_logo,
                v.name as venue_name,
                CONCAT(ru.first_name,' ',ru.last_name) as referee_name
            FROM matches m
            JOIN sports s ON m.sport_id = s.id
            JOIN tournaments t ON m.tournament_id = t.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN venues v ON m.venue_id = v.id
            LEFT JOIN referees r ON m.referee_id = r.id
            LEFT JOIN users ru ON r.user_id = ru.id
            WHERE m.scheduled_date = CURDATE() 
              AND m.status NOT IN ('cancelled')
            ORDER BY m.scheduled_time ASC
        `);

        res.json({
            success: true,
            data: rows,
            date: new Date().toISOString().split('T')[0]
        });

    } catch (err) {
        next(err);
    }
};


const create = async (req, res, next) => {
    try {
        const {
            title,
            tournament_id,
            venue_id,
            scheduled_date,
            start_time,
            end_time,
            notes
        } = req.body;

        // Check venue conflict
        if (venue_id) {
            const [conflicts] = await pool.execute(
                `SELECT id FROM schedules
                 WHERE venue_id = ? 
                   AND scheduled_date = ?
                   AND (
                        (start_time <= ? AND end_time > ?) OR
                        (start_time < ? AND end_time >= ?) OR
                        (start_time >= ? AND end_time <= ?)
                   )`,
                [
                    venue_id,
                    scheduled_date,
                    start_time, start_time,
                    end_time, end_time,
                    start_time, end_time
                ]
            );

            if (conflicts.length) {
                return res.status(409).json({
                    success: false,
                    message: 'Venue has a scheduling conflict at that time'
                });
            }
        }

        const [result] = await pool.execute(
            `INSERT INTO schedules 
             (title, tournament_id, venue_id, scheduled_date, start_time, end_time, notes, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                tournament_id || null,
                venue_id || null,
                scheduled_date,
                start_time,
                end_time,
                notes || null,
                req.user.id
            ]
        );

        await logActivity(
            req.user.id,
            'SCHEDULE_CREATED',
            'schedule',
            result.insertId,
            `Schedule created: ${title}`
        );

        res.status(201).json({
            success: true,
            message: 'Schedule created',
            data: { id: result.insertId }
        });

    } catch (err) {
        next(err);
    }
};


const update = async (req, res, next) => {
    try {
        const {
            title,
            tournament_id,
            venue_id,
            scheduled_date,
            start_time,
            end_time,
            notes
        } = req.body;

        await pool.execute(
            `UPDATE schedules 
             SET title = ?, 
                 tournament_id = ?, 
                 venue_id = ?, 
                 scheduled_date = ?, 
                 start_time = ?, 
                 end_time = ?, 
                 notes = ?
             WHERE id = ?`,
            [
                title,
                tournament_id || null,
                venue_id || null,
                scheduled_date,
                start_time,
                end_time,
                notes || null,
                req.params.id
            ]
        );

        res.json({ success: true, message: 'Schedule updated' });

    } catch (err) {
        next(err);
    }
};


const remove = async (req, res, next) => {
    try {
        await pool.execute(
            'DELETE FROM schedules WHERE id = ?',
            [req.params.id]
        );

        res.json({ success: true, message: 'Schedule deleted' });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getToday,
    create,
    update,
    remove
};