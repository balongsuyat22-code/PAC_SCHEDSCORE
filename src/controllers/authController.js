const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const jwtConfig = require('../config/jwt');
const { logActivity } = require('../utils/logger');
const { ALLOWED_ROLES } = require('../config/roles');

const login = async (req, res, next) => {
    try {
        const identifier = (req.body.login || req.body.email || req.body.username || '').trim();
        const password = (req.body.password || '').trim();

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/Username and password are required.',
            });
        }

        const [users] = await pool.execute(
            `SELECT u.*, d.name AS department_name, d.code AS department_code
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE LOWER(u.email) = LOWER(?) OR LOWER(u.username) = LOWER(?)`,
            [identifier, identifier]
        );

        if (!users.length) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = users[0];

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Contact the administrator.',
            });
        }

        const storedHash = user.password_hash || '';
        const isMatch = await bcrypt.compare(password, storedHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const payload = {
            id: user.id,
            uuid: user.uuid,
            role: user.role,
        };

        const accessToken = jwt.sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.expiresIn,
        });

        const refreshToken = jwt.sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.refreshExpiresIn,
        });

        await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await pool.execute(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [user.id, refreshToken, expiresAt]
        );

        await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        await logActivity(user.id, 'USER_LOGIN', 'user', user.id, `User logged in: ${user.username}`);

        const { password_hash, ...safeUser } = user;

        return res.json({
            success: true,
            message: 'Login successful.',
            data: {
                accessToken,
                refreshToken,
                user: safeUser,
            },
        });
    } catch (err) {
        next(err);
    }
};

const register = async (req, res, next) => {
    try {
        const {
            username,
            email,
            password,
            first_name,
            last_name,
            role,
            department_id,
            phone,
        } = req.body;

        if (!username || !email || !password || !first_name || !last_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'username, email, password, first_name, last_name, and role are required.',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters.',
            });
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`,
            });
        }

        if (role === 'dean_adviser' && !department_id) {
            return res.status(400).json({
                success: false,
                message: 'dean_adviser accounts must have a department assigned.',
            });
        }

        const emailNorm = email.trim().toLowerCase();
        const usernameNorm = username.trim().toLowerCase();

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [emailNorm, usernameNorm]
        );
        if (existing.length) {
            return res.status(409).json({ success: false, message: 'Email or username already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const uuid = uuidv4();

        const [result] = await pool.execute(
            `INSERT INTO users
             (uuid, username, email, password_hash, role, first_name, last_name, phone, department_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                uuid,
                usernameNorm,
                emailNorm,
                password_hash,
                role,
                first_name,
                last_name,
                phone || null,
                department_id || null,
            ]
        );

        await logActivity(
            req.user?.id || null,
            'USER_REGISTERED',
            'user',
            result.insertId,
            `Account created: ${usernameNorm} (${role})`
        );

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: { id: result.insertId, uuid, username: usernameNorm, email: emailNorm, role },
        });
    } catch (err) {
        next(err);
    }
};

const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token is required.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, jwtConfig.secret);
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
        }

        const [tokens] = await pool.execute(
            'SELECT id FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
            [refreshToken]
        );
        if (!tokens.length) {
            return res.status(401).json({ success: false, message: 'Refresh token not found or expired.' });
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

        await logActivity(req.user?.id, 'USER_LOGOUT', 'user', req.user?.id, 'User logged out');

        return res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT
                u.id, u.uuid, u.username, u.email, u.role,
                u.first_name, u.last_name, u.phone, u.profile_picture,
                u.department_id, u.is_active, u.last_login, u.created_at,
                d.name  AS department_name,
                d.code  AS department_code,
                d.color AS department_color
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.id = ?`,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
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

        if (!first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'First name and last name are required.' });
        }

        await pool.execute(
            `UPDATE users
             SET first_name = ?, last_name = ?, phone = ?, profile_picture = ?, updated_at = NOW()
             WHERE id = ?`,
            [first_name, last_name, phone || null, profile_picture || null, userId]
        );

        await logActivity(userId, 'PROFILE_UPDATED', 'user', userId, 'Profile updated');

        return res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
        next(err);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, message: 'current_password and new_password are required.' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
        }
        if (current_password === new_password) {
            return res.status(400).json({ success: false, message: 'New password must differ from the current password.' });
        }

        const [rows] = await pool.execute(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(current_password, rows[0].password_hash || '');
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(new_password, salt);

        await pool.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, req.user.id]);
        await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);

        await logActivity(req.user.id, 'PASSWORD_CHANGED', 'user', req.user.id, 'Password changed');

        return res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
    } catch (err) {
        next(err);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Only an admin can reset another user's password." });
        }

        const { new_password } = req.body;
        const targetId = parseInt(req.params.userId);

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'new_password must be at least 6 characters.' });
        }

        const [rows] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [targetId]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(new_password, salt);

        await pool.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, targetId]);
        await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [targetId]);

        await logActivity(
            req.user.id,
            'PASSWORD_RESET',
            'user',
            targetId,
            `Admin reset password for: ${rows[0].username}`
        );

        return res.json({ success: true, message: 'Password reset successfully.' });
    } catch (err) {
        next(err);
    }
};

const debugPassword = async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(404).json({ success: false, message: 'Not found.' });
        }

        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required in the POST body (not query params).',
            });
        }

        const [users] = await pool.execute(
            'SELECT id, username, email, password_hash FROM users WHERE email = ? OR username = ?',
            [email, email]
        );

        if (!users.length) {
            return res.json({ success: false, message: 'User not found', email });
        }

        const user = users[0];
        const raw = user.password_hash || '';
        const trimmed = raw.trim();

        const [matchRaw, matchTrimmed] = await Promise.all([
            bcrypt.compare(password, raw).catch(() => false),
            bcrypt.compare(password, trimmed).catch(() => false),
        ]);

        return res.json({
            success: true,
            data: {
                user: { id: user.id, username: user.username, email: user.email },
                hash_length_raw: raw.length,
                hash_length_trimmed: trimmed.length,
                has_stray_whitespace: raw.length !== trimmed.length,
                password_match_raw_hash: matchRaw,
                password_match_trimmed_hash: matchTrimmed,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    login,
    register,
    refresh,
    logout,
    getMe,
    updateProfile,
    changePassword,
    resetPassword,
    debugPassword,
};