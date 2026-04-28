
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const SEED_USERS = [
    { username: 'admin', email: 'admin@sportfest.com', password: 'Admin@1234', role: 'admin' },
    { username: 'referee', email: 'referee@sportfest.com', password: 'Referee@1234', role: 'referee' },
    { username: 'player', email: 'player@sportfest.com', password: 'Player@1234', role: 'player' },
];

async function run() {
    let conn;
    try {
        console.log('🔧 Connecting to MySQL...');
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sportfest_db',
        });
        console.log('✅ Connected\n');

        for (const u of SEED_USERS) {
            const hash = await bcrypt.hash(u.password, 10);

            // Upsert: update if exists, insert if not
            await conn.execute(`
        INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name)
        VALUES (UUID(), ?, ?, ?, ?, ?, 'User')
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
      `, [u.username, u.email, hash, u.role, u.role.charAt(0).toUpperCase() + u.role.slice(1)]);

            // Verify the hash works
            const ok = await bcrypt.compare(u.password, hash);
            console.log(`${ok ? '✅' : '❌'}  ${u.role.padEnd(8)} | ${u.email.padEnd(32)} | password: ${u.password} | hash ok: ${ok}`);
        }

        // Also create referee and player profiles if missing
        const [[adminRow]] = await conn.execute("SELECT id FROM users WHERE username = 'referee'");
        if (adminRow) {
            await conn.execute(
                'INSERT IGNORE INTO referees (user_id) VALUES (?)',
                [adminRow.id]
            );
        }

        const [[playerRow]] = await conn.execute("SELECT id FROM users WHERE username = 'player'");
        if (playerRow) {
            const [[dept]] = await conn.execute('SELECT id FROM departments LIMIT 1');
            if (dept) {
                await conn.execute(
                    'INSERT IGNORE INTO players (user_id, department_id) VALUES (?, ?)',
                    [playerRow.id, dept.id]
                );
            }
        }

        console.log('\n✅ All passwords reset successfully!\n');
        console.log('  You can now log in with:');
        SEED_USERS.forEach(u => {
            console.log(`  ${u.role.padEnd(8)} → ${u.email} / ${u.password}`);
        });
        console.log('');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (conn) await conn.end();
    }
}

run();