/**
 * Database Setup Script
 * Usage: node src/config/setupDatabase.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const run = async () => {
    let conn;
    try {
        console.log('🔧 Connecting to MySQL...');
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true,
        });
        console.log('✅ Connected\n');

        // ── 1. Run schema DDL ─────────────────────────────────────
        console.log('📦 Applying schema...');
        const schemaSQL = fs.readFileSync(
            path.join(__dirname, '../../sql/schema.sql'), 'utf8'
        );

        // Split on semicolons, skip empty/comment-only lines
        const statements = schemaSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
            try {
                await conn.query(stmt + ';');
            } catch (err) {
                // Ignore harmless "already exists" errors so re-runs are safe
                const ignorable = [
                    'ER_TABLE_EXISTS_ERROR',
                    'ER_DUP_ENTRY',
                    'ER_DUP_KEYNAME',
                    'ER_MULTIPLE_PRI_KEY',
                ];
                if (!ignorable.includes(err.code) && !err.message.includes('Duplicate')) {
                    console.warn(`  ⚠️  ${err.message.slice(0, 120)}`);
                }
            }
        }
        console.log('✅ Schema applied\n');

        // ── 2. Create triggers (each sent individually — no DELIMITER) ──
        console.log('⚡ Creating triggers...');
        await conn.query('USE sportfest_db;').catch(() => { });

        await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_insert;').catch(() => { });
        await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_update;').catch(() => { });

        await conn.query(`
      CREATE TRIGGER after_tournament_result_insert
      AFTER INSERT ON tournament_results
      FOR EACH ROW
      BEGIN
        INSERT INTO department_scores
          (department_id, total_points, gold_medals, silver_medals,
           bronze_medals, total_participations, tournaments_entered)
        VALUES
          (NEW.department_id, NEW.sport_fest_points,
           IF(NEW.medal='gold',1,0), IF(NEW.medal='silver',1,0),
           IF(NEW.medal='bronze',1,0), 1, 1)
        ON DUPLICATE KEY UPDATE
          total_points         = total_points         + NEW.sport_fest_points,
          gold_medals          = gold_medals          + IF(NEW.medal='gold',1,0),
          silver_medals        = silver_medals        + IF(NEW.medal='silver',1,0),
          bronze_medals        = bronze_medals        + IF(NEW.medal='bronze',1,0),
          total_participations = total_participations + 1,
          tournaments_entered  = tournaments_entered  + 1;
      END
    `);

        await conn.query(`
      CREATE TRIGGER after_tournament_result_update
      AFTER UPDATE ON tournament_results
      FOR EACH ROW
      BEGIN
        UPDATE department_scores SET
          total_points  = total_points  - OLD.sport_fest_points + NEW.sport_fest_points,
          gold_medals   = gold_medals   - IF(OLD.medal='gold',1,0)   + IF(NEW.medal='gold',1,0),
          silver_medals = silver_medals - IF(OLD.medal='silver',1,0) + IF(NEW.medal='silver',1,0),
          bronze_medals = bronze_medals - IF(OLD.medal='bronze',1,0) + IF(NEW.medal='bronze',1,0)
        WHERE department_id = NEW.department_id;
      END
    `);
        console.log('✅ Triggers created\n');

        // ── 3. Seed default users with CORRECT hashes ────────────
        console.log('👤 Creating default users...');

        const defaultUsers = [
            { username: 'admin', email: 'admin@sportfest.com', password: 'Admin@1234', role: 'admin', first: 'System', last: 'Admin' },
            { username: 'referee', email: 'referee@sportfest.com', password: 'Referee@1234', role: 'referee', first: 'Default', last: 'Referee' },
            { username: 'player', email: 'player@sportfest.com', password: 'Player@1234', role: 'player', first: 'Sample', last: 'Player' },
        ];

        for (const u of defaultUsers) {
            const hash = await bcrypt.hash(u.password, 10);

            await conn.query(`
        INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name)
        VALUES (UUID(), ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
      `, [u.username, u.email, hash, u.role, u.first, u.last]);

            // Create profile rows
            if (u.role === 'referee') {
                await conn.query(`
          INSERT IGNORE INTO referees (user_id)
          SELECT id FROM users WHERE username = ?
        `, [u.username]);
            }
            if (u.role === 'player') {
                await conn.query(`
          INSERT IGNORE INTO players (user_id, department_id)
          SELECT u.id, d.id FROM users u
          JOIN departments d ON d.code = 'IT'
          WHERE u.username = ?
        `, [u.username]);
            }

            console.log(`  ✅  ${u.role.padEnd(8)} created → ${u.email}  (password: ${u.password})`);
        }

        // ── 4. Summary ────────────────────────────────────────────
        console.log('\n🎉 Setup complete!\n');
        console.log('══════════════════════════════════════════════════');
        console.log('  Login credentials:');
        console.log('  Role      Email                     Password');
        console.log('──────────────────────────────────────────────────');
        console.log('  admin     admin@sportfest.com        Admin@1234');
        console.log('  referee   referee@sportfest.com      Referee@1234');
        console.log('  player    player@sportfest.com       Player@1234');
        console.log('══════════════════════════════════════════════════');
        console.log('\n  Start the server: npm run dev\n');

    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        if (err.code === 'ECONNREFUSED') console.error('   → MySQL is not running. Start XAMPP first.');
        if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('   → Wrong DB_USER or DB_PASSWORD in .env');
        if (err.code === 'ER_BAD_DB_ERROR') console.error('   → Database does not exist yet (it will be created by schema.sql).');
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();