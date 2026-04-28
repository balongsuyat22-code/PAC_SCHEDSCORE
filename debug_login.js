/**
 * debug-login.js
 * Run: node debug-login.js
 * 
 * This will tell you EXACTLY what is wrong with the login.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
    let conn;
    try {
        console.log('\n==============================');
        console.log(' SPORT FEST — LOGIN DEBUGGER');
        console.log('==============================\n');

        // ── 1. Connect ──────────────────────────────────────────
        console.log('1️⃣  Connecting to MySQL...');
        console.log(`    Host:     ${process.env.DB_HOST || 'localhost'}`);
        console.log(`    Port:     ${process.env.DB_PORT || 3306}`);
        console.log(`    User:     ${process.env.DB_USER || 'root'}`);
        console.log(`    Database: ${process.env.DB_NAME || 'sportfest_db'}\n`);

        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sportfest_db',
        });
        console.log('    ✅ Connected\n');

        // ── 2. Check users table ─────────────────────────────────
        console.log('2️⃣  Checking users table...');
        const [users] = await conn.execute('SELECT id, username, email, role, is_active, LEFT(password_hash,30) as hash_preview, password_hash FROM users');

        if (!users.length) {
            console.log('    ❌ NO USERS FOUND IN DATABASE!');
            console.log('    → Run: npm run setup-db  then  node reset-passwords.js\n');
            return;
        }

        console.log(`    Found ${users.length} user(s):\n`);
        for (const u of users) {
            console.log(`    👤 ${u.username} (${u.role})`);
            console.log(`       email:     ${u.email}`);
            console.log(`       is_active: ${u.is_active}`);
            console.log(`       hash:      ${u.hash_preview}...`);
            console.log(`       hash_len:  ${u.password_hash ? u.password_hash.length : 0} chars`);
            console.log(`       valid_bcrypt: ${u.password_hash && u.password_hash.startsWith('$2') ? '✅ YES' : '❌ NO — hash is not bcrypt!'}`);
            console.log('');
        }

        // ── 3. Test bcrypt compare for each known user ───────────
        console.log('3️⃣  Testing password comparison...\n');
        const testCases = [
            { email: 'admin@sportfest.com', password: 'Admin@1234' },
            { email: 'referee@sportfest.com', password: 'Referee@1234' },
            { email: 'player@sportfest.com', password: 'Player@1234' },
        ];

        for (const tc of testCases) {
            const user = users.find(u => u.email === tc.email || u.username === tc.email.split('@')[0]);
            if (!user) {
                console.log(`    ⚠️   ${tc.email} → NOT FOUND IN DB`);
                continue;
            }
            if (!user.password_hash) {
                console.log(`    ❌  ${tc.email} → password_hash IS EMPTY`);
                continue;
            }
            try {
                const match = await bcrypt.compare(tc.password, user.password_hash);
                console.log(`    ${match ? '✅' : '❌'}  ${tc.email}`);
                console.log(`       password "${tc.password}" matches: ${match}`);
                if (!match) {
                    console.log(`       → Hash in DB does NOT match this password.`);
                    console.log(`       → Run: node reset-passwords.js  to fix this.`);
                }
            } catch (e) {
                console.log(`    ❌  ${tc.email} → bcrypt.compare threw: ${e.message}`);
                console.log(`       The stored hash is probably corrupted or not bcrypt format.`);
            }
            console.log('');
        }

        // ── 4. Fix option ────────────────────────────────────────
        console.log('4️⃣  Auto-fixing all passwords now...\n');
        const fixes = [
            { username: 'admin', email: 'admin@sportfest.com', password: 'Admin@1234', role: 'admin', firstName: 'System', lastName: 'Admin' },
            { username: 'referee', email: 'referee@sportfest.com', password: 'Referee@1234', role: 'referee', firstName: 'Game', lastName: 'Official' },
            { username: 'player', email: 'player@sportfest.com', password: 'Player@1234', role: 'player', firstName: 'Sample', lastName: 'Player' },
        ];

        for (const f of fixes) {
            const hash = await bcrypt.hash(f.password, 10);
            const verify = await bcrypt.compare(f.password, hash);

            if (!verify) {
                console.log(`    ❌  Hash generation failed for ${f.username}!`);
                continue;
            }

            // Upsert user
            await conn.execute(`
        INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name, is_active)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
          password_hash = VALUES(password_hash),
          is_active     = 1
      `, [f.username, f.email, hash, f.role, f.firstName, f.lastName]);

            console.log(`    ✅  ${f.username} → password set & is_active=1`);
        }

        // Also ensure referee/player profiles exist
        console.log('\n5️⃣  Ensuring referee & player profiles exist...');
        const [[refUser]] = await conn.execute("SELECT id FROM users WHERE username='referee'");
        const [[playerUser]] = await conn.execute("SELECT id FROM users WHERE username='player'");
        const [[firstDept]] = await conn.execute("SELECT id FROM departments LIMIT 1");

        if (refUser) {
            await conn.execute('INSERT IGNORE INTO referees (user_id) VALUES (?)', [refUser.id]);
            console.log('    ✅  referee profile OK');
        }
        if (playerUser && firstDept) {
            await conn.execute('INSERT IGNORE INTO players (user_id, department_id) VALUES (?,?)', [playerUser.id, firstDept.id]);
            console.log('    ✅  player profile OK');
        }

        console.log('\n==============================');
        console.log(' ALL DONE — Try logging in now');
        console.log('==============================');
        console.log('\n  admin@sportfest.com    / Admin@1234');
        console.log('  referee@sportfest.com  / Referee@1234');
        console.log('  player@sportfest.com   / Player@1234\n');

    } catch (err) {
        console.error('\n❌ FATAL ERROR:', err.message);
        if (err.code === 'ECONNREFUSED') console.error('   → MySQL is not running. Start XAMPP first.');
        if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('   → Wrong DB_USER or DB_PASSWORD in .env');
        if (err.code === 'ER_BAD_DB_ERROR') console.error('   → Database "sportfest_db" does not exist. Run: npm run setup-db');
    } finally {
        if (conn) await conn.end();
    }
}

run();