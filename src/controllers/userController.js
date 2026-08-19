/**
 * USER CONTROLLER
 * Manages system user accounts (not players — players are in playerController)
 *
 * Role map:
 *   admin        → full CRUD on all users
 *   dean_adviser → read-only on their own department users; update own profile via authController
 *   sgo_president→ CRUD limited to dean_adviser + sgo_officer accounts only
 *                   (register, edit, deactivate/reactivate). Cannot create,
 *                   view, edit, or touch admin / sgo_president accounts, and
 *                   cannot hard-delete anyone — see PRESIDENT_MANAGEABLE_ROLES
 *                   and presidentRoleGuard() below.
 *   sgo_officer  → read-only own record
 *
 * Roles allowed as user accounts: admin | dean_adviser | sgo_president | sgo_officer
 * NOTE: "player" is NOT a user-account role — players are managed via playerController
 *
 * REFEREE CONVENTION FIX: matches.referee_id points DIRECTLY at users.id
 * (an sgo_officer account) — there is no separate `referees` table in
 * this schema. matchController.getAvailableOfficers and
 * scheduleController use that convention consistently. getOfficers below
 * previously joined through `SELECT id FROM referees WHERE user_id = u.id`,
 * which either throws (if the `referees` table doesn't exist) or silently
 * returns 0 assigned_matches for everyone (if it exists but is unrelated/
 * empty) — either way the assignment counts sgo_president relies on when
 * picking an officer were wrong. Fixed to match m.referee_id = u.id
 * directly, same as everywhere else.
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');

const ALLOWED_ROLES = ['admin', 'dean_adviser', 'sgo_president', 'sgo_officer'];

// Roles an sgo_president is allowed to register/edit/deactivate.
// Presidents run day-to-day tournament ops and need to be able to onboard
// their own officers (referees) and coordinate with dean/advisers, but must
// never be able to create/promote/touch admin or sgo_president accounts.
const PRESIDENT_MANAGEABLE_ROLES = ['dean_adviser', 'sgo_officer'];

// Helper — convert empty string / undefined → null
const n = (v) => (v === undefined || v === '' ? null : v);

// Throws a 403-shaped error object if an sgo_president caller is trying to
// touch a role outside PRESIDENT_MANAGEABLE_ROLES. Admins are unrestricted.
// `targetRole` may be null when the target doesn't exist yet (create flow).
function presidentRoleGuard(callerRole, ...roles) {
    if (callerRole !== 'sgo_president') return null; // only presidents are restricted here
    const offender = roles.find((r) => r && !PRESIDENT_MANAGEABLE_ROLES.includes(r));
    if (offender) {
        return {
            success: false,
            message: `As SGO President you can only register or edit Dean/Adviser and SGO Officer accounts.`,
        };
    }
    return null;
}

// ---------------------------------------------------------------------------
// GET ALL USERS
// GET /api/users
// Query params: role, department_id, is_active, search
// Protected: admin (full list) | sgo_president (officers only)
// ---------------------------------------------------------------------------
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

        // SGO president can see (and manage) dean/adviser + sgo_officer accounts —
        // dean/advisers for coordination/notifications, officers for match
        // assignment. Never admin or fellow sgo_president accounts.
        if (callerRole === 'sgo_president') {
            if (role && PRESIDENT_MANAGEABLE_ROLES.includes(role)) {
                query += ' AND u.role = ?';
                params.push(role);
            } else {
                query += ' AND u.role IN (?, ?)';
                params.push(...PRESIDENT_MANAGEABLE_ROLES);
            }
        } else {
            // Admin: respect optional filters
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

// ---------------------------------------------------------------------------
// GET ONE USER
// GET /api/users/:id
// Protected: admin | own record
// ---------------------------------------------------------------------------
const getOne = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);
        const callerRole = req.user.role;

        // Non-admins can view their own record; sgo_president can also view
        // any dean_adviser / sgo_officer record it's allowed to manage.
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

// ---------------------------------------------------------------------------
// CREATE USER  (Admin only)
// POST /api/users
// Body: { username, email, password, role, first_name, last_name, phone, department_id }
// ---------------------------------------------------------------------------
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

        // Required fields
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

        // dean_adviser must be tied to a department
        if (role === 'dean_adviser' && !department_id) {
            return res.status(400).json({
                success: false,
                message: 'dean_adviser accounts must have a department assigned.',
            });
        }

        email = email.trim().toLowerCase();
        username = username.trim().toLowerCase();

        // Duplicate check
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

// ---------------------------------------------------------------------------
// UPDATE USER  (Admin only — for admin to edit any user's account details)
// PUT /api/users/:id
// Note: users update their own profile via PUT /api/auth/me
// ---------------------------------------------------------------------------
const update = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);
        const { first_name, last_name, phone, role, department_id, is_active } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'first_name and last_name are required.' });
        }

        // Validate role if being changed
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
            // Guard against both the account's existing role and whatever
            // role it's being changed to (if any) — a president can't edit
            // an admin's profile, nor turn a dean/officer INTO an admin.
            const presidentDenied = presidentRoleGuard(req.user.role, targetRows[0].role, role);
            if (presidentDenied) return res.status(403).json(presidentDenied);
        }

        // Prevent admin from accidentally removing the last admin
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

        return res.json({ success: true, message: 'User updated successfully.' });

    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// DEACTIVATE USER  (Admin only — soft delete)
// PATCH /api/users/:id/deactivate
// ---------------------------------------------------------------------------
const deactivate = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);

        // Prevent self-deactivation
        if (req.user.id === targetId) {
            return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
        }

        // Prevent removing last admin
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

        // Revoke refresh tokens so they are immediately logged out
        await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [targetId]);

        await logActivity(req.user.id, 'USER_DEACTIVATED', 'user', targetId, `User deactivated: ID ${targetId}`);

        return res.json({ success: true, message: 'User deactivated successfully.' });

    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// REACTIVATE USER  (Admin only)
// PATCH /api/users/:id/activate
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// DELETE USER  (Admin only — hard delete, use sparingly)
// DELETE /api/users/:id
// ---------------------------------------------------------------------------
const remove = async (req, res, next) => {
    try {
        const targetId = parseInt(req.params.id);

        // Hard delete stays admin-only regardless of route wiring — an
        // sgo_president can register/edit/deactivate dean/officer accounts,
        // but permanent deletion (including of its own scope) is reserved
        // for admin so there's always an audit trail via deactivate instead.
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

// ---------------------------------------------------------------------------
// GET SGO OFFICERS  (used by sgo_president to list available officers for assignment)
// GET /api/users/officers
// Protected: admin | sgo_president
//
// FIXED: referee_id on `matches` points directly at users.id — there is
// no separate `referees` table anywhere else in this codebase (see
// matchController.getAvailableOfficers, which already joined this way).
// The previous version here joined through
//   LEFT JOIN matches m ON m.referee_id = (SELECT id FROM referees WHERE user_id = u.id LIMIT 1)
// which assumed a `referees` table that this schema doesn't use, so
// assigned_matches came back wrong (0, or a query error) for every
// officer — meaning sgo_president's "pick the least-busy officer" screen
// was working off bad data. Aligned to the same convention as
// matchController.getAvailableOfficers.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET DEAN/ADVISERS  (used by admin for listing; by sgo_president for notifications)
// GET /api/users/deans
// Protected: admin | sgo_president
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// VIEW USER ACTIVITY LOGS  (Admin only)
// GET /api/users/:id/logs
// ---------------------------------------------------------------------------
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