const { pool } = require('../config/database');

const logActivity = async (userId, action, entityType, entityId, description, ipAddress = null) => {
    try {
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address) VALUES (?,?,?,?,?,?)',
            [userId || null, action, entityType || null, entityId || null, description, ipAddress]
        );
    } catch (err) {

        console.error('Activity log error:', err.message);
    }
};

module.exports = { logActivity };