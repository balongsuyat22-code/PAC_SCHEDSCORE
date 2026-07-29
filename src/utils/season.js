const { pool } = require('../config/database');

/**
 * Returns the id of the currently active ("live") Sport Fest season,
 * or null if none has been started yet.
 *
 * Use this anywhere a new record should be stamped with the current
 * season, e.g. when a player registers, a team is created, or a
 * department's points are updated:
 *
 *   const { getActiveSportFestId } = require('../utils/season');
 *   const sportFestId = await getActiveSportFestId();
 *   await pool.execute(
 *     `INSERT INTO players (..., sport_fest_id) VALUES (..., ?)`,
 *     [..., sportFestId]
 *   );
 */
async function getActiveSportFestId() {
    const [rows] = await pool.execute(
        `SELECT id FROM sport_fest_events WHERE is_current = 1 LIMIT 1`
    );
    return rows.length ? rows[0].id : null;
}

module.exports = { getActiveSportFestId };