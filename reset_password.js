
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { getDatabaseSslConfig } = require('./src/config/databaseSsl');

const buildConnectionOptions = () => {
    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    const ssl = getDatabaseSslConfig();
    if (databaseUrl) {
        const url = new URL(databaseUrl);
        if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL must use the mysql:// protocol');
        return {
            host: url.hostname,
            port: Number(url.port || 3306),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: decodeURIComponent(url.pathname.replace(/^\//, '')),
            ...(ssl ? { ssl } : {}),
        };
    }
    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db',
        ...(ssl ? { ssl } : {}),
    };
};

async function run() {
    let conn;
    try {
        const username = process.env.RESET_ACCOUNT_USERNAME?.trim();
        const password = process.env.RESET_ACCOUNT_PASSWORD;
        if (!username || !password) {
            throw new Error('Set RESET_ACCOUNT_USERNAME and RESET_ACCOUNT_PASSWORD to reset one existing account.');
        }
        if (password.length < 12) {
            throw new Error('RESET_ACCOUNT_PASSWORD must be at least 12 characters.');
        }

        console.log('🔧 Connecting to MySQL...');
        conn = await mysql.createConnection(buildConnectionOptions());
        console.log('✅ Connected\n');

        const [users] = await conn.execute(
            'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
            [username, username]
        );
        if (users.length !== 1) {
            throw new Error(
                users.length
                    ? 'Account lookup was ambiguous; no password was changed.'
                    : 'Account was not found; no account was created.'
            );
        }

        const hash = await bcrypt.hash(password, 12);
        await conn.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
            hash,
            users[0].id,
        ]);
        console.log('✅ Password updated for the specified existing account.');
    } catch (err) {
        console.error('❌ Password reset failed:', err.message);
        process.exitCode = 1;
    } finally {
        if (conn) await conn.end();
    }
}

run();