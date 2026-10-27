const { pool } = require('../config/database');
const { getActiveSportFestId } = require('./season');

const logActivity = async (userId, action, entityType, entityId, description, ipAddress = null) => {
    try {
        const sportFestId = await getActiveSportFestId();
        await pool.execute(
            'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, sport_fest_id, description, ip_address) VALUES (?,?,?,?,?,?,?)',
            [userId || null, action, entityType || null, entityId || null, sportFestId, description, ipAddress]
        );
    } catch (err) {

        console.error('Activity log error:', err.message);
    }
};

module.exports = { logActivity };