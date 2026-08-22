const { pool } = require('../config/database');

async function getActiveSportFestId() {
    const [rows] = await pool.execute(
        `SELECT id FROM sport_fest_events WHERE is_current = 1 LIMIT 1`
    );
    return rows.length ? rows[0].id : null;
}

module.exports = { getActiveSportFestId };