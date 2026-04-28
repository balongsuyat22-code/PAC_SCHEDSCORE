const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');


const n = (v) => (v === undefined || v === '' ? null : v);

const registerPlayer = async (req, res, next) => {
    const conn = await pool.getConnection();

    try {
        const {
            first_name,
            last_name,
            department_id,
            team_id,
            sport_id,
            email,
            username,
            password
        } = req.body;


        if (!first_name || !last_name || !department_id || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, department, username, and password are required',
            });
        }

        const emailNorm = email ? email.trim().toLowerCase() : `${username}@player.local`;

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const uuid = uuidv4();

        await conn.beginTransaction();


        const [existing] = await conn.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [emailNorm, username]
        );

        if (existing.length) {
            await conn.rollback();
            return res.status(409).json({ success: false, message: 'Username or Email already exists' });
        }


        const [userResult] = await conn.execute(
            `INSERT INTO users 
            (uuid, username, email, password_hash, role, first_name, last_name, department_id)
            VALUES (?, ?, ?, ?, 'player', ?, ?, ?)`,
            [uuid, username, emailNorm, password_hash, first_name, last_name, department_id]
        );

        const userId = userResult.insertId;


        await conn.execute(
            `INSERT INTO players 
            (user_id, department_id, team_id, sport_id, first_name, last_name, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [
                userId,
                department_id,
                n(team_id),
                n(sport_id),
                first_name,
                last_name
            ]
        );

        await conn.commit();

        await logActivity(userId, 'PLAYER_REGISTERED', 'user', userId, `Player registered: ${first_name} ${last_name}`);

        res.status(201).json({
            success: true,
            message: 'Player registered successfully. Waiting for Admin approval.',
            data: { id: userId, username }
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};


const getAll = async (req, res, next) => {
    try {
        const { role, department_id } = req.query;

        let query = `
            SELECT u.id, u.uuid, u.username, u.email, u.role,
                   u.first_name, u.last_name, u.phone, u.profile_picture,
                   u.department_id, u.is_active, u.last_login, u.created_at,
                   d.name AS department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE 1=1
        `;

        const params = [];

        if (role) {
            query += ' AND u.role = ?';
            params.push(role);
        }

        if (department_id) {
            query += ' AND u.department_id = ?';
            params.push(department_id);
        }

        query += ' ORDER BY u.created_at DESC';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const create = async (req, res, next) => {
    try {
        let {
            username,
            email,
            password,
            role,
            first_name,
            last_name,
            phone,
            profile_picture,
            department_id,
            jersey_number,
            position,
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email and password are required',
            });
        }


        email = email.trim().toLowerCase();
        username = username.trim().toLowerCase();

        const allowedRoles = ['player', 'referee', 'admin'];
        const safeRole = allowedRoles.includes(role) ? role : 'player';

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existing.length) {
            return res.status(409).json({
                success: false,
                message: 'Email or username already exists',
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const uuid = uuidv4();

        const conn = await pool.getConnection();
        await conn.beginTransaction();

        const [result] = await conn.execute(
            `INSERT INTO users
            (uuid, username, email, password_hash, role,
             first_name, last_name, phone, profile_picture, department_id)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [
                uuid,
                username,
                email,
                hash,
                safeRole,
                n(first_name),
                n(last_name),
                n(phone),
                n(profile_picture),
                n(department_id),
            ]
        );

        const userId = result.insertId;

        if (safeRole === 'referee') {
            await conn.execute(
                'INSERT IGNORE INTO referees (user_id) VALUES (?)',
                [userId]
            );
        }

        if (safeRole === 'player' && department_id) {
            await conn.execute(
                `INSERT INTO players 
                (user_id, department_id, jersey_number, position, is_eligible)
                VALUES (?, ?, ?, ?, 1)`,
                [
                    userId,
                    department_id,
                    n(jersey_number),
                    n(position),
                ]
            );
        }

        await conn.commit();
        conn.release();

        await logActivity(req.user?.id || userId, 'USER_CREATED', 'user', userId, `User created: ${username}`);

        res.status(201).json({
            success: true,
            message: 'User created',
            data: { id: userId, uuid },
        });
    } catch (err) {
        next(err);
    }
};


const getPlayers = async (req, res, next) => {
    try {
        const { department_id } = req.query;


        let query = `
            SELECT u.id, u.first_name, u.last_name, u.email,
                   p.id AS player_id, p.status, p.team_id, p.sport_id,
                   p.jersey_number, p.position,
                   d.name AS department_name
            FROM users u
            JOIN players p ON u.id = p.user_id
            JOIN departments d ON p.department_id = d.id
            WHERE u.is_active = 1
        `;

        const params = [];

        if (department_id) {
            query += ' AND p.department_id = ?';
            params.push(department_id);
        }

        query += ' ORDER BY d.name, u.last_name';

        const [rows] = await pool.execute(query, params);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM users WHERE id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};
const update = async (req, res, next) => {
    try {
        const { first_name, last_name, phone } = req.body;

        await pool.execute(
            `UPDATE users 
             SET first_name=?, last_name=?, phone=? 
             WHERE id=?`,
            [first_name, last_name, phone, req.params.id]
        );

        res.json({ success: true, message: 'User updated' });
    } catch (err) {
        next(err);
    }
};
const deactivate = async (req, res, next) => {
    try {
        await pool.execute(
            `UPDATE users SET is_active = 0 WHERE id = ?`,
            [req.params.id]
        );

        res.json({ success: true, message: 'User deactivated' });
    } catch (err) {
        next(err);
    }
};
const getReferees = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM users WHERE role = 'referee' AND is_active = 1`
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    registerPlayer,
    getAll,
    create,
    getPlayers,
    getReferees,
    getOne,
    update,
    deactivate
};