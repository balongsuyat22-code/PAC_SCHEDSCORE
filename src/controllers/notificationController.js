const { pool } = require('../config/database');
const { emitNotification } = require('../utils/socketEmit');

/**
 * Create a notification row and optionally broadcast via socket.
 */
async function createNotification(opts = {}) {
    const {
        user_id = null,
        role = null,
        department_id = null,
        type = 'system',
        title,
        message,
        link = null,
        severity = 'info',
        entity_type = null,
        entity_id = null,
        created_by = null,
        socketEmit = true,
    } = opts;

    if (!title || !message) return null;

    try {
        const [result] = await pool.execute(
            `INSERT INTO notifications
                (user_id, role, department_id, type, title, message, link, severity,
                 entity_type, entity_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                role,
                department_id,
                type,
                String(title).slice(0, 200),
                message,
                link,
                severity,
                entity_type,
                entity_id,
                created_by,
            ]
        );

        const row = {
            id: result.insertId,
            user_id,
            role,
            department_id,
            type,
            title,
            message,
            link,
            severity,
            entity_type,
            entity_id,
            is_read: 0,
            created_at: new Date().toISOString(),
        };

        if (socketEmit) {
            try {
                emitNotification(row);
            } catch (_) { /* socket optional */ }
        }

        return row;
    } catch (err) {
        if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
            console.warn('[notifications] table missing — skip create');
            return null;
        }
        console.error('[notifications] create failed:', err.message);
        return null;
    }
}

async function notifyRoles(roles, opts = {}) {
    const uniqueRoles = [...new Set((roles || []).filter(Boolean))];
    return Promise.all(uniqueRoles.map((role) => createNotification({ ...opts, role })));
}

/** Build WHERE for the current user (personal + role + department broadcasts). */
function audienceClause(user) {
    const parts = [];
    const params = [];

    const uid = user && user.id != null ? Number(user.id) : null;
    if (uid != null && Number.isFinite(uid)) {
        parts.push('(n.user_id = ?)');
        params.push(uid);
    }

    if (user && user.role) {
        parts.push('(n.user_id IS NULL AND n.role = ?)');
        params.push(String(user.role));
    }

    // Global announcements
    parts.push('(n.user_id IS NULL AND n.role IS NULL AND n.department_id IS NULL)');

    const deptId = user && user.department_id != null ? Number(user.department_id) : null;
    if (deptId != null && Number.isFinite(deptId) && deptId > 0) {
        parts.push('(n.user_id IS NULL AND n.department_id = ?)');
        params.push(deptId);
    }

    if (!parts.length) {
        parts.push('1 = 0');
    }

    return { sql: parts.join(' OR '), params };
}

function isMissingTable(err) {
    return err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146);
}

const list = async (req, res, next) => {
    try {
        // NEVER bind LIMIT as prepared placeholder — mysql2 often throws
        // "Incorrect arguments to mysqld_stmt_execute"
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
        const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
        const type = (req.query.type || '').trim() || null;

        const { sql: audience, params } = audienceClause(req.user);

        let query = `
            SELECT n.*
            FROM notifications n
            WHERE (${audience})
        `;
        const qParams = [...params];

        if (unreadOnly) {
            query += ' AND n.is_read = 0';
        }
        if (type) {
            query += ' AND n.type = ?';
            qParams.push(type);
        }

        // Safe integer only (clamped above) — do not use ?
        query += ` ORDER BY n.created_at DESC LIMIT ${limit}`;

        const [rows] = await pool.execute(query, qParams);

        let unread = 0;
        try {
            const [countRows] = await pool.execute(
                `SELECT COUNT(*) AS unread FROM notifications n WHERE (${audience}) AND n.is_read = 0`,
                params
            );
            unread = Number(countRows[0]?.unread) || 0;
        } catch (_) {
            unread = rows.filter((r) => !r.is_read).length;
        }

        return res.json({
            success: true,
            data: rows,
            unread,
            total: rows.length,
        });
    } catch (err) {
        if (isMissingTable(err)) {
            console.warn('[notifications] table missing — return empty list');
            return res.json({ success: true, data: [], unread: 0, total: 0 });
        }
        console.error('[notifications] list error:', err.message);
        next(err);
    }
};

const markRead = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id || !Number.isFinite(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification id' });
        }

        const { sql: audience, params } = audienceClause(req.user);

        const [visible] = await pool.execute(
            `SELECT n.id FROM notifications n WHERE n.id = ? AND (${audience}) LIMIT 1`,
            [id, ...params]
        );
        if (!visible.length) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        await pool.execute(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
        return res.json({ success: true, message: 'Marked as read' });
    } catch (err) {
        if (isMissingTable(err)) {
            return res.json({ success: true, message: 'Marked as read' });
        }
        next(err);
    }
};

const markAllRead = async (req, res, next) => {
    try {
        const { sql: audience, params } = audienceClause(req.user);

        const [ids] = await pool.execute(
            `SELECT n.id FROM notifications n WHERE (${audience}) AND n.is_read = 0`,
            params
        );
        if (!ids.length) {
            return res.json({ success: true, message: 'All notifications marked as read', updated: 0 });
        }

        const placeholders = ids.map(() => '?').join(',');
        const [result] = await pool.execute(
            `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`,
            ids.map((r) => r.id)
        );

        return res.json({
            success: true,
            message: 'All notifications marked as read',
            updated: result.affectedRows,
        });
    } catch (err) {
        if (isMissingTable(err)) {
            return res.json({ success: true, message: 'All notifications marked as read', updated: 0 });
        }
        next(err);
    }
};

const broadcast = async (req, res, next) => {
    try {
        const { title, message, link, role, department_id, severity, type } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'title and message are required',
            });
        }

        const row = await createNotification({
            user_id: null,
            role: role || null,
            department_id: department_id ? parseInt(department_id, 10) : null,
            type: type || 'announce',
            title,
            message,
            link: link || null,
            severity: severity || 'info',
            created_by: req.user.id,
            socketEmit: true,
        });

        if (!row) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create notification (is the notifications table created?)',
            });
        }

        return res.status(201).json({ success: true, message: 'Announcement sent', data: row });
    } catch (err) {
        next(err);
    }
};

const remove = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id || !Number.isFinite(id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification id' });
        }

        const { sql: audience, params } = audienceClause(req.user);

        const [visible] = await pool.execute(
            `SELECT n.id FROM notifications n WHERE n.id = ? AND (${audience}) LIMIT 1`,
            [id, ...params]
        );
        if (!visible.length) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        await pool.execute(`DELETE FROM notifications WHERE id = ?`, [id]);
        return res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        if (isMissingTable(err)) {
            return res.json({ success: true, message: 'Deleted' });
        }
        next(err);
    }
};

module.exports = {
    list,
    markRead,
    markAllRead,
    broadcast,
    remove,
    createNotification,
    notifyRoles,
};