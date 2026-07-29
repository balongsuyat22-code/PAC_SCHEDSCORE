/**
 * LOGIN DIAGNOSTIC SCRIPT
 * Usage: node src/config/checkLogin.js
 *
 * Connects with the exact same config your app uses and walks through
 * every step authController.login() does, printing what it finds at
 * each stage — so we can see exactly where the 401 is coming from.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const ACCOUNTS_TO_CHECK = [
    { email: 'admin@sportfest.com', password: 'password' },
    { email: 'dean@sportfest.com', password: 'password' },
    { email: 'president@sportfest.com', password: 'password' },
    { email: 'officer@sportfest.com', password: 'password' },
];

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
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sportfest_db',
        });
    } catch (err) {
        console.error('❌ Could not connect to the database at all:', err.message);
        console.error('   → This means your server would also fail to start. Check DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in .env.');
        process.exit(1);
    }
    console.log('✅ Connected to database\n');

    // ── Step 1: does the users table exist and have rows at all? ──
    const [[countRow]] = await conn.query('SELECT COUNT(*) AS count FROM users');
    console.log(`Step 1 — Total rows in "users" table: ${countRow.count}`);
    if (countRow.count === 0) {
        console.log('❌ FOUND IT: the users table is EMPTY.');
        console.log('   → Run the seed script: node src/config/setupDatabase.js');
        console.log('   → Make sure it prints "✅ sgo_officer created → officer@sportfest.com" etc. without errors.\n');
        await conn.end();
        return;
    }

    // ── Step 2: check the password_hash column's actual defined length ──
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

    // ── Step 3: walk through each demo account exactly like authController.login() ──
    console.log('Step 3 — Checking each demo account:\n');
    for (const { email, password } of ACCOUNTS_TO_CHECK) {
        const [users] = await conn.execute(
            `SELECT id, username, email, role, is_active, password_hash, LENGTH(password_hash) AS hash_len
             FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)`,
            [email, email]
        );

        if (!users.length) {
            console.log(`  ❌ ${email} — NOT FOUND in users table at all.`);
            continue;
        }

        const u = users[0];
        console.log(`  🔎 ${email} — found: id=${u.id}, role=${u.role}, is_active=${u.is_active}, hash_len=${u.hash_len}`);

        if (!u.is_active) {
            console.log(`     ❌ Account is marked is_active=0 — login blocked before password check.`);
            continue;
        }

        if (u.hash_len < 60) {
            console.log(`     ❌ Stored hash is only ${u.hash_len} chars — it's truncated/corrupted, compare will always fail.`);
            continue;
        }

        const match = await bcrypt.compare(password, u.password_hash);
        console.log(`     ${match ? '✅' : '❌'} bcrypt.compare('${password}', stored hash) → ${match}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    await conn.end();
};

run().catch(err => {
    console.error('❌ Diagnostic script crashed:', err);
    process.exit(1);
});