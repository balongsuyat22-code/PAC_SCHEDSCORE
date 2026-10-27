async function ensureActivityLogSchema(conn) {
    const addIfMissing = async (query, duplicateErrno) => {
        try {
            await conn.query(query);
        } catch (err) {
            if (Number(err.errno) !== duplicateErrno) throw err;
        }
    };

    const [[table]] = await conn.query(
        `SELECT COUNT(*) AS count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'activity_logs'`
    );
    if (Number(table.count) === 0) {
        throw new Error('activity_logs table is missing; initialize the database schema first.');
    }

    const [[columns]] = await conn.query(
        `SELECT
            SUM(column_name = 'sport_fest_id') AS has_sport_fest_id,
            SUM(column_name = 'ip_address') AS has_ip_address
         FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'activity_logs'`
    );
    if (Number(columns.has_sport_fest_id) === 0) {
        await addIfMissing('ALTER TABLE activity_logs ADD COLUMN sport_fest_id INT NULL', 1060);
    }
    if (Number(columns.has_ip_address) === 0) {
        await addIfMissing('ALTER TABLE activity_logs ADD COLUMN ip_address VARCHAR(45) NULL', 1060);
    }

    const [[index]] = await conn.query(
        `SELECT COUNT(*) AS count FROM information_schema.statistics
         WHERE table_schema = DATABASE() AND table_name = 'activity_logs'
           AND index_name = 'idx_al_sport_fest'`
    );
    if (Number(index.count) === 0) {
        await addIfMissing('CREATE INDEX idx_al_sport_fest ON activity_logs (sport_fest_id)', 1061);
    }
}

module.exports = { ensureActivityLogSchema };