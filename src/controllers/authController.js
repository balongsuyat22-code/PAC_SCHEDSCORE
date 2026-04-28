const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const jwtConfig = require('../config/jwt');
const { logActivity } = require('../utils/logger');


const register = async (req, res, next) => {
    try {
        const { username, email, password, first_name, last_name, role, department_id, phone } = req.body;

        if (!username || !email || !password || !first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'username, email, password, first_name and last_name are all required',
            });
        }

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length) {
            return res.status(409).json({ success: false, message: 'Email or username already exists' });
        }

        const assignedRole = role === 'player' ? 'player' : 'player';
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const uuid = uuidv4();

        const [result] = await pool.execute(
            `INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name, phone, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, username, email, password_hash, assignedRole, first_name, last_name, phone || null, department_id || null]
        );

        if (assignedRole === 'player' && department_id) {
            await pool.execute(
                'INSERT INTO players (user_id, department_id) VALUES (?, ?)',
                [result.insertId, department_id]
            );
        }

        await logActivity(result.insertId, 'USER_REGISTERED', 'user', result.insertId, `New user registered: ${username}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { id: result.insertId, uuid, username, email, role: assignedRole },
        });
    } catch (err) {
        next(err);
    }
};


const login = async (req, res, next) => {
    try {
        const identifier = req.body.login || req.body.email || req.body.username;
        const password = req.body.password;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/Username and password are required',
            });
        }


        const [users] = await pool.execute(
            'SELECT * FROM users WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?))',
            [identifier.trim(), identifier.trim()]
        );

        if (!users.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        const user = users[0];

        // 2. Check if account is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account deactivated',
            });
        }


        const isMatch = await bcrypt.compare(password.trim(), user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        const payload = { id: user.id, uuid: user.uuid, role: user.role };

        const accessToken = jwt.sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.expiresIn,
        });

        const refreshToken = jwt.sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.refreshExpiresIn,
        });

        // Remove old tokens
        await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await pool.execute(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, refreshToken, expiresAt]
        );

        await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        return res.json({
            success: true,
            message: 'Login successful',
            data: { accessToken, refreshToken, user },
        });

    } catch (err) {
        console.error("Login Error:", err);
        next(err);
    }
};


const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, jwtConfig.secret);
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        const [tokens] = await pool.execute(
            'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
            [refreshToken]
        );
        if (!tokens.length) {
            return res.status(401).json({ success: false, message: 'Refresh token not found or expired' });
        }

        const payload = { id: decoded.id, uuid: decoded.uuid, role: decoded.role };
        const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

        return res.json({ success: true, data: { accessToken } });
    } catch (err) {
        next(err);
    }
};


const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await pool.execute('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
        }
        return res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};


const getMe = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT u.id, u.uuid, u.username, u.email, u.role,
              u.first_name, u.last_name, u.phone, u.profile_picture,
              u.department_id, u.last_login, u.created_at,
              d.name AS department_name, d.code AS department_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
            [req.user.id]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};


const updateProfile = async (req, res, next) => {
    try {
        const { first_name, last_name, phone, profile_picture } = req.body;
        const userId = req.user.id;

        await pool.execute(
            `UPDATE users SET first_name=?, last_name=?, phone=?, profile_picture=? WHERE id=?`,
            [first_name, last_name, phone, profile_picture || null, userId]
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) { next(err); }
};


const changePassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: 'current_password and new_password are required' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(new_password, salt);
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

        return res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
    refresh,
    logout,
    getMe,
    updateProfile,
    changePassword
};