const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');

const { ALLOWED_ROLES, PRESIDENT_MANAGEABLE_ROLES } = require('../config/roles');


const n = (v) => (v === undefined || v === '' ? null : v);

function presidentRoleGuard(callerRole, ...roles) {
    if (callerRole !== 'sgo_president') return null;
    const offender = roles.find((r) => r && !PRESIDENT_MANAGEABLE_ROLES.includes(r));
    if (offender) {
        return {
            success: false,
            message: `As SGO President you can only register or edit Dean/Adviser and SGO Officer accounts.`,
        };
    }
    return null;
}

const getAll = async (req, res, next) => {
    try {
        const { role, department_id, is_active, search } = req.query;
        const callerRole = req.user.role;

        let query = `
            SELECT
                u.id, u.uuid, u.username, u.email, u.role,
                u.first_name, u.last_name, u.phone, u.profile_picture,
                u.department_id, u.is_active, u.last_login, u.created_at,
                d.name  AS department_name,
                d.code  AS department_code
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE 1 = 1
        `;
        const params = [];

        if (callerRole === 'sgo_president') {
            if (role && PRESIDENT_MANAGEABLE_ROLES.includes(role)) {
                query += ' AND u.role = ?';
                params.push(role);
            } else {
                query += ' AND u.role IN (?, ?)';
                params.push(...PRESIDENT_MANAGEABLE_ROLES);
            }
        } else {

            if (role) {
                query += ' AND u.role = ?';
                params.push(role);
            }
        }

        if (is_active !== undefined) {
            query += ' AND u.is_active = ?';
            params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
        }

        if (department_id) {
            query += ' AND u.department_id = ?';
            params.push(department_id);
        }

        if (search) {
            query += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)';
            const like = `%${search}%`;
            params.push(like, like, like, like);
        }

        query += ' ORDER BY u.created_at DESC';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows, total: rows.length });

    } catch (err) {
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);
        const callerRole = req.user.role;

        if (callerRole !== 'admin' && req.user.id !== targetId && callerRole !== 'sgo_president') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

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
            [targetId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (
            callerRole === 'sgo_president' &&
            req.user.id !== targetId &&
            !PRESIDENT_MANAGEABLE_ROLES.includes(rows[0].role)
        ) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        return res.json({ success: true, data: rows[0] });

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
        } = req.body;

        if (!username || !email || !password || !first_name || !last_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'username, email, password, first_name, last_name, and role are required.',
            });
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
            });
        }

        const presidentDenied = presidentRoleGuard(req.user.role, role);
        if (presidentDenied) return res.status(403).json(presidentDenied);

        if (role === 'dean_adviser' && !department_id) {
            return res.status(400).json({
                success: false,
                message: 'dean_adviser accounts must have a department assigned.',
            });
        }

        email = email.trim().toLowerCase();
        username = username.trim().toLowerCase();

        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length) {
            return res.status(409).json({ success: false, message: 'Email or username already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const uuid = uuidv4();

        const [result] = await pool.execute(
            `INSERT INTO users
             (uuid, username, email, password_hash, role, first_name, last_name, phone, profile_picture, department_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuid, username, email, hash, role, n(first_name), n(last_name), n(phone), n(profile_picture), n(department_id)]
        );

        await logActivity(
            req.user.id,
            'USER_CREATED',
            'user',
            result.insertId,
            `User created: ${username} (${role})`
        );

        return res.status(201).json({
            success: true,
            message: 'User created successfully.',
            data: { id: result.insertId, uuid, username, email, role },
        });

    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);
        const { first_name, last_name, phone, role, department_id, is_active, password } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'first_name and last_name are required.' });
        }

        if (role && !ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`,
            });
        }

        if (req.user.role === 'sgo_president') {
            const [targetRows] = await pool.execute('SELECT role FROM users WHERE id = ?', [targetId]);
            if (!targetRows.length) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            const presidentDenied = presidentRoleGuard(req.user.role, targetRows[0].role, role);
            if (presidentDenied) return res.status(403).json(presidentDenied);
        }

        if (role && role !== 'admin') {
            const [admins] = await pool.execute(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1 AND id != ?",
                [targetId]
            );
            const [currentRole] = await pool.execute('SELECT role FROM users WHERE id = ?', [targetId]);
            if (currentRole[0]?.role === 'admin' && admins[0].count === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change role — this is the last active admin account.',
                });
            }
        }

        // Optional password change on edit
        if (password && String(password).trim().length > 0) {
            if (String(password).trim().length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters.',
                });
            }
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(String(password).trim(), salt);
            await pool.execute(
                'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
                [hash, targetId]
            );
            // Invalidate existing sessions so they must log in with the new password
            await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [targetId]);
        }

        await pool.execute(
            `UPDATE users
             SET first_name  = ?,
                 last_name   = ?,
                 phone       = ?,
                 role        = COALESCE(?, role),
                 department_id = ?,
                 is_active   = COALESCE(?, is_active),
                 updated_at  = NOW()
             WHERE id = ?`,
            [
                first_name,
                last_name,
                phone || null,
                role || null,
                department_id || null,
                is_active !== undefined ? (is_active ? 1 : 0) : null,
                targetId,
            ]
        );

        await logActivity(req.user.id, 'USER_UPDATED', 'user', targetId, `User updated: ID ${targetId}`);

        return res.json({
            success: true,
            message: password && String(password).trim().length > 0
                ? 'User updated successfully. Password changed — they must log in again.'
                : 'User updated successfully.',
        });

    } catch (err) {
        next(err);
    }
};

const deactivate = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);

        if (req.user.id === targetId) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
        }

        const [rows] = await pool.execute('SELECT role FROM users WHERE id = ?', [targetId]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const presidentDenied = presidentRoleGuard(req.user.role, rows[0].role);
        if (presidentDenied) return res.status(403).json(presidentDenied);

        if (rows[0].role === 'admin') {
            const [admins] = await pool.execute(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1"
            );
            if (admins[0].count <= 1) {
                return res.status(400).json({ success: false, message: 'Cannot deactivate the last admin account.' });
            }
        }

        await pool.execute('UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?', [targetId]);

        await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [targetId]);

        await logActivity(req.user.id, 'USER_DEACTIVATED', 'user', targetId, `User deactivated: ID ${targetId}`);

        return res.json({ success: true, message: 'User deactivated successfully.' });

    } catch (err) {
        next(err);
    }
};

const activate = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);

        const [rows] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [targetId]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const presidentDenied = presidentRoleGuard(req.user.role, rows[0].role);
        if (presidentDenied) return res.status(403).json(presidentDenied);

        await pool.execute('UPDATE users SET is_active = 1, updated_at = NOW() WHERE id = ?', [targetId]);

        await logActivity(req.user.id, 'USER_ACTIVATED', 'user', targetId, `User reactivated: ID ${targetId}`);

        return res.json({ success: true, message: 'User activated successfully.' });

    } catch (err) {
        next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only an admin can permanently delete a user. Use Deactivate instead.' });
        }

        if (req.user.id === targetId) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }

        const [rows] = await pool.execute('SELECT role, username FROM users WHERE id = ?', [targetId]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (rows[0].role === 'admin') {
            const [admins] = await pool.execute(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1"
            );
            if (admins[0].count <= 1) {
                return res.status(400).json({ success: false, message: 'Cannot delete the last admin account.' });
            }
        }

        await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [targetId]);
        await pool.execute('DELETE FROM users WHERE id = ?', [targetId]);

        await logActivity(
            req.user.id,
            'USER_DELETED',
            'user',
            targetId,
            `User permanently deleted: ${rows[0].username}`
        );

        return res.json({ success: true, message: 'User deleted successfully.' });

    } catch (err) {
        next(err);
    }
};

const getOfficers = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
                    COUNT(m.id) AS assigned_matches
             FROM users u
             LEFT JOIN matches m
                   ON m.referee_id = u.id
                   AND m.status IN ('scheduled', 'ongoing')
             WHERE u.role = 'sgo_officer' AND u.is_active = 1
             GROUP BY u.id
             ORDER BY u.first_name, u.last_name`
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getDeans = async (req, res, next) => {
    try {
        const { department_id } = req.query;

        let query = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
                   d.name AS department_name, d.code AS department_code
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.role = 'dean_adviser' AND u.is_active = 1
        `;
        const params = [];

        if (department_id) {
            query += ' AND u.department_id = ?';
            params.push(department_id);
        }

        query += ' ORDER BY d.name, u.first_name';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};

const getUserLogs = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);
        const { limit = 50, offset = 0 } = req.query;

        const [rows] = await pool.execute(
            `SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.role
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.user_id = ?
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [targetId, parseInt(limit), parseInt(offset)]
        );

        return res.json({ success: true, data: rows, total: rows.length });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getOne,
    create,
    update,
    deactivate,
    activate,
    remove,
    getOfficers,
    getDeans,
    getUserLogs,
};