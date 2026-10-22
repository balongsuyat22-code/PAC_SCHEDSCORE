const mysql = require('mysql2/promise');
require('dotenv').config();
const { getDatabaseSslConfig } = require('./databaseSsl');

const buildPoolConfig = () => {
    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || (process.env.VERCEL === '1' ? 5 : 20));
    const ssl = getDatabaseSslConfig();

    if (databaseUrl) {
        const url = new URL(databaseUrl);
        if (url.protocol !== 'mysql:') {
            throw new Error('DATABASE_URL must use the mysql:// protocol');
        }

        return {
            host: url.hostname,
            port: Number(url.port || 3306),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: decodeURIComponent(url.pathname.replace(/^\//, '')),
            waitForConnections: true,
            connectionLimit,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            timezone: '+00:00',
            ...(ssl ? { ssl } : {}),
        };
    }

    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db',
        waitForConnections: true,
        connectionLimit,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        timezone: '+00:00',
        ...(ssl ? { ssl } : {}),
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