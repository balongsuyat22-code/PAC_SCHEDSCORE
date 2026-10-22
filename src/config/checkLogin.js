
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { getDatabaseSslConfig } = require('./databaseSsl');

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

const run = async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🔍 LOGIN DIAGNOSTIC');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Connecting with:');
    console.log(`  DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  DB_PORT: ${process.env.DB_PORT || 3306}`);
    console.log(`  DB_USER: ${process.env.DB_USER || 'root'}`);
    console.log(`  DB_NAME: ${process.env.DB_NAME || 'sportfest_db'}\n`);

    let conn;
    try {
        conn = await mysql.createConnection(buildConnectionOptions());
    } catch (err) {
        console.error('❌ Could not connect to the database at all:', err.message);
        console.error('   → This means your server would also fail to start. Check DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in .env.');
        process.exit(1);
    }
    console.log('✅ Connected to database\n');

    const [[countRow]] = await conn.query('SELECT COUNT(*) AS count FROM users');
    console.log(`Step 1 — Total rows in "users" table: ${countRow.count}`);
    if (countRow.count === 0) {
        console.log('❌ FOUND IT: the users table is EMPTY.');
        console.log('   → Provision an administrator using INITIAL_ADMIN_* when initializing a new database.\n');
        await conn.end();
        return;
    }

    const [[colInfo]] = await conn.query(
        `SELECT CHARACTER_MAXIMUM_LENGTH AS len, DATA_TYPE AS type
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'`
    );
    console.log(`Step 2 — "password_hash" column: type=${colInfo?.type}, max_length=${colInfo?.len}`);
    if (colInfo && colInfo.len && colInfo.len < 60) {
        console.log(`❌ FOUND IT: password_hash column is only ${colInfo.len} chars long, but bcrypt hashes are always 60 chars.`);
        console.log('   → Every hash on insert got silently truncated, so bcrypt.compare() can never match.');
        console.log('   → Fix: ALTER TABLE users MODIFY password_hash VARCHAR(255) NOT NULL;');
        console.log('   → Then re-run: node src/config/setupDatabase.js\n');
    } else {
        console.log('✅ Column length looks fine (>= 60 chars)\n');
    }

    const loginIdentifier = process.env.LOGIN_CHECK_USERNAME;
    const loginPassword = process.env.LOGIN_CHECK_PASSWORD;
    if (!loginIdentifier && !loginPassword) {
        console.log('Step 3 — Login credential check skipped (set LOGIN_CHECK_USERNAME and LOGIN_CHECK_PASSWORD to test one account).');
        await conn.end();
        return;
    }
    if (!loginIdentifier || !loginPassword) {
        throw new Error('Set LOGIN_CHECK_USERNAME and LOGIN_CHECK_PASSWORD together to test a login.');
    }

    console.log('Step 3 — Checking the supplied account:\n');
    {
        const [users] = await conn.execute(
            `SELECT id, username, email, role, is_active, password_hash, LENGTH(password_hash) AS hash_len
             FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)`,
            [loginIdentifier, loginIdentifier]
        );

        if (!users.length) {
            console.log('  ❌ Account not found.');
        } else {
            const u = users[0];
            console.log(`  🔎 Account found: role=${u.role}, is_active=${u.is_active}, hash_len=${u.hash_len}`);

            if (!u.is_active) {
                console.log('     ❌ Account is inactive — login is blocked.');
            } else if (u.hash_len < 60) {
                console.log(`     ❌ Stored hash is only ${u.hash_len} chars — it may be truncated.`);
            } else {
                const match = await bcrypt.compare(loginPassword, u.password_hash);
                console.log(`     ${match ? '✅' : '❌'} Password matches the stored hash: ${match}`);
            }
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    await conn.end();
};

run().catch(err => {
    console.error('❌ Diagnostic script crashed:', err);
    process.exit(1);
});