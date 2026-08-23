const { pool } = require('../config/database');

async function getActiveSportFestId() {
    const [rows] = await pool.execute(
        `SELECT id FROM sport_fest_events WHERE is_current = 1 LIMIT 1`
    );
    return rows.length ? rows[0].id : null;
}

/**
 * Resolve which sport_fest_id to use for season-scoped queries.
 * @param {string|undefined} seasonIdQuery  req.query.season_id
 * @returns {Promise<{ sportFestId: number|null, unscoped: boolean }>}
 */
async function resolveSportFestId(seasonIdQuery) {
    if (seasonIdQuery === 'all') {
        return { sportFestId: null, unscoped: true };
    }
    if (seasonIdQuery) {
        const id = parseInt(seasonIdQuery, 10);
        if (Number.isInteger(id) && id > 0) {
            return { sportFestId: id, unscoped: false };
        }
    }

    const activeId = await getActiveSportFestId();
    if (activeId != null) {
        return { sportFestId: activeId, unscoped: false };
    }

    const [latest] = await pool.execute(
        `SELECT id FROM sport_fest_events
         ORDER BY year DESC, id DESC
         LIMIT 1`
    );
    return {
        sportFestId: latest[0]?.id ?? null,
        unscoped: false,
    };
}

module.exports = { getActiveSportFestId, resolveSportFestId };