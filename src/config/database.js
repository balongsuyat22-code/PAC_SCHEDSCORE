const mysql = require('mysql2/promise');
require('dotenv').config();

// Railway's MySQL plugin exposes MYSQL_URL (a full connection string) or
// individual MYSQLHOST/MYSQLUSER/etc vars. This keeps local DB_* vars working too.
const buildPoolConfig = () => {
    if (process.env.MYSQL_URL) {
        return process.env.MYSQL_URL; // mysql2 accepts a connection string directly
    }

    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        timezone: '+00:00',
        ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    };
};

const pool = mysql.createPool(buildPoolConfig());

const testConnection = async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ MySQL connected successfully');
        conn.release();
    } catch (err) {
        console.error('❌ MySQL connection failed:', err.message);
        process.exit(1);
    }
};

module.exports = { pool, testConnection };