const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { logActivity } = require('../utils/logger');
const jwt = require('../config/jwt');
const registerPlayer = async (req, res, next) => {
    const conn = await pool.getConnection();

    try {
        const {
            first_name, last_name, gender,
            image_url, department_id,
            sport_id, team_id, email, username, password,
            jersey_number, position
        } = req.body;

        if (!first_name || !last_name || !gender || !username || !password || !email) {
            return res.status(400).json({ success: false, message: 'Gender and all account details are required.' });
        }

        await conn.beginTransaction();

        const [existingUsers] = await conn.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Username or Email is already taken!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPw = await bcrypt.hash(password, salt);
        const userUuid = uuidv4();

        const [userResult] = await conn.execute(
            `INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name, gender, department_id, profile_picture, is_active)
             VALUES (?, ?, ?, ?, 'player', ?, ?, ?, ?, ?, 1)`,
            [userUuid, username, email, hashedPw, first_name, last_name, gender, department_id, image_url || null]
        );

        const newUserId = userResult.insertId;

        const [playerResult] = await conn.execute(
            `INSERT INTO players (user_id, first_name, last_name, gender, image_url, department_id, sport_id, team_id, jersey_number, position, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                newUserId,
                first_name,
                last_name,
                gender,
                image_url || null,
                department_id,
                sport_id,
                team_id || null,
                jersey_number || null,
                position || null
            ]
        );

        await conn.commit();


        const token = jwt.generateToken({
            id: newUserId,
            username,
            role: 'player'
        });

        res.status(201).json({
            success: true,
            message: 'Account created and Registration submitted successfully. Waiting for Admin approval.',
            token: token,
            user: {
                id: newUserId,
                username,
                email,
                first_name,
                last_name,
                role: 'player'
            },
            data: { userId: newUserId, playerId: playerResult.insertId }
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const updatePlayerStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const playerId = req.params.id;

        await pool.execute(
            `UPDATE players SET status = ? WHERE id = ?`,
            [status, playerId]
        );

        await logActivity(req.user.id, `PLAYER_${status.toUpperCase()}`, 'player', playerId, `Player ${status}`);

        res.json({ success: true, message: `Player has been ${status}.` });

    } catch (err) {
        next(err);
    }
};

const getTeamPlayers = async (req, res, next) => {
    try {
        const teamId = req.params.teamId;
        const [players] = await pool.execute(
            `SELECT p.*, u.first_name, u.last_name, u.email, u.username
             FROM players p
             JOIN users u ON p.user_id = u.id
             WHERE p.team_id = ? 
             ORDER BY p.status DESC, p.created_at ASC`,
            [teamId]
        );
        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

const getSinglePlayers = async (req, res, next) => {
    try {
        const [players] = await pool.execute(
            `SELECT p.*, d.name AS department_name, s.name AS sport_name
             FROM players p
             JOIN departments d ON p.department_id = d.id
             JOIN sports s ON p.sport_id = s.id
             WHERE p.team_id IS NULL
             ORDER BY p.gender ASC, d.name ASC`
        );

        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

const getApprovedPlayers = async (req, res, next) => {
    try {
        const [players] = await pool.execute(`
            SELECT p.*, d.name as department_name, d.color as department_color, d.logo_url as department_logo,
                   t.name as team_name, s.name as sport_name
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sports s ON p.sport_id = s.id
            WHERE p.status = 'approved'
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

const getPlayerById = async (req, res, next) => {
    try {
        const [players] = await pool.execute(
            `SELECT p.*, 
                    u.email, u.username,
                    d.name AS department_name,
                    s.name AS sport_name,
                    t.name AS team_name
             FROM players p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN sports s ON p.sport_id = s.id
             LEFT JOIN teams t ON p.team_id = t.id
             WHERE p.id = ?`,
            [req.params.id]
        );

        if (!players.length) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        res.json({ success: true, data: players[0] });
    } catch (err) {
        next(err);
    }
};

const getPlayerByUserId = async (req, res, next) => {
    try {
        const [players] = await pool.execute(
            `SELECT p.*, 
                    d.name AS department_name,
                    s.name AS sport_name,
                    t.name AS team_name
             FROM players p
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN sports s ON p.sport_id = s.id
             LEFT JOIN teams t ON p.team_id = t.id
             WHERE p.user_id = ?`,
            [req.params.userId]
        );

        if (!players.length) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        res.json({ success: true, data: players[0] });
    } catch (err) {
        next(err);
    }
};


const getAllPlayers = async (req, res, next) => {
    try {
        const [players] = await pool.execute(
            `SELECT p.*, 
                    u.email, u.username,
                    d.name AS department_name,
                    s.name AS sport_name,
                    t.name AS team_name
             FROM players p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN sports s ON p.sport_id = s.id
             LEFT JOIN teams t ON p.team_id = t.id
             ORDER BY p.created_at DESC`
        );
        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

const getPlayersBySport = async (req, res, next) => {
    try {
        const sportId = req.params.sportId;
        const [players] = await pool.execute(
            `SELECT p.*, 
                    u.first_name, u.last_name,
                    d.name AS department_name,
                    t.name AS team_name
             FROM players p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN teams t ON p.team_id = t.id
             WHERE p.sport_id = ? AND p.status = 'approved'
             ORDER BY t.name, p.jersey_number`,
            [sportId]
        );
        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

const updatePlayer = async (req, res, next) => {
    const conn = await pool.getConnection();

    try {
        const playerId = req.params.id;
        const {
            jersey_number,
            position,
            team_id,
            image_url
        } = req.body;

        await conn.beginTransaction();

        const [result] = await conn.execute(
            `UPDATE players 
             SET jersey_number = ?, 
                 position = ?, 
                 team_id = ?,
                 image_url = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [jersey_number || null, position || null, team_id || null, image_url || null, playerId]
        );

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        await conn.commit();

        await logActivity(req.user.id, 'PLAYER_UPDATED', 'player', playerId, 'Player information updated');

        res.json({ success: true, message: 'Player updated successfully' });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const deletePlayer = async (req, res, next) => {
    const conn = await pool.getConnection();

    try {
        const playerId = req.params.id;

        await conn.beginTransaction();

        const [player] = await conn.execute(
            'SELECT user_id FROM players WHERE id = ?',
            [playerId]
        );

        if (player.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        const userId = player[0].user_id;


        await conn.execute('DELETE FROM players WHERE id = ?', [playerId]);


        await conn.execute('DELETE FROM users WHERE id = ?', [userId]);

        await conn.commit();

        await logActivity(req.user.id, 'PLAYER_DELETED', 'player', playerId, 'Player and user account deleted');

        res.json({ success: true, message: 'Player deleted successfully' });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const getPendingPlayers = async (req, res, next) => {
    try {
        const [players] = await pool.execute(
            `SELECT p.*, 
                    u.email, u.username,
                    d.name AS department_name,
                    s.name AS sport_name,
                    t.name AS team_name
             FROM players p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN sports s ON p.sport_id = s.id
             LEFT JOIN teams t ON p.team_id = t.id
             WHERE p.status = 'pending'
             ORDER BY p.created_at ASC`
        );
        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

const getRejectedPlayers = async (req, res, next) => {
    try {
        const [players] = await pool.execute(
            `SELECT p.*, 
                    u.email, u.username,
                    d.name AS department_name,
                    s.name AS sport_name,
                    t.name AS team_name
             FROM players p
             JOIN users u ON p.user_id = u.id
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN sports s ON p.sport_id = s.id
             LEFT JOIN teams t ON p.team_id = t.id
             WHERE p.status = 'rejected'
             ORDER BY p.created_at DESC`
        );
        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    registerPlayer,
    updatePlayerStatus,
    getTeamPlayers,
    getSinglePlayers,
    getApprovedPlayers,
    getPlayerById,
    getPlayerByUserId,
    getAllPlayers,
    getPlayersBySport,
    updatePlayer,
    deletePlayer,
    getPendingPlayers,
    getRejectedPlayers
};