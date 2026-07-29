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

        const statements = schemaSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
            try {
                await conn.query(stmt + ';');
            } catch (err) {
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

        // ── 2. Create triggers ────────────────────────────────────
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

        // ── 3. Seed default departments ──────────────────────────
        console.log('🏫 Creating departments...');

        await conn.query(`
            INSERT IGNORE INTO departments (id, name, code, description) VALUES 
            (1, 'College of Arts and Sciences', 'CAS', 'Arts and Sciences Department'),
            (2, 'College of Business Administration', 'CBA', 'Business Administration Department'),
            (3, 'College of Education', 'CED', 'Education Department'),
            (4, 'College of Engineering', 'CEN', 'Engineering Department'),
            (5, 'College of Nursing', 'CON', 'Nursing Department'),
            (6, 'College of Information Technology', 'CIT', 'Information Technology Department')
        `);
        console.log('✅ Departments created\n');

        // ── 4. Seed default users ────────────────────────────────
        console.log('👤 Creating default users...');

        const defaultUsers = [
            { username: 'admin', email: 'admin@sportfest.com', password: 'password', role: 'admin', first: 'System', last: 'Admin', dept: 1 },
            { username: 'dean_adviser', email: 'dean@sportfest.com', password: 'password', role: 'dean_adviser', first: 'Dean', last: 'Adviser', dept: 2 },
            { username: 'sgo_president', email: 'president@sportfest.com', password: 'password', role: 'sgo_president', first: 'SGO', last: 'President', dept: null },
            { username: 'sgo_officer', email: 'officer@sportfest.com', password: 'password', role: 'sgo_officer', first: 'SGO', last: 'Officer', dept: null },
        ];

        for (const u of defaultUsers) {
            const hash = await bcrypt.hash(u.password, 10);

            await conn.query(`
                INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name, department_id, is_active)
                VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE 
                    password_hash = VALUES(password_hash),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    department_id = VALUES(department_id),
                    is_active = 1
            `, [u.username, u.email, hash, u.role, u.first, u.last, u.dept]);

            console.log(`  ✅  ${u.role.padEnd(12)} created → ${u.email}  (password: ${u.password})`);
        }

        // ── 5. Summary ────────────────────────────────────────────
        console.log('\n🎉 Setup complete!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  🔑 LOGIN CREDENTIALS (password is "password" for all):');
        console.log('───────────────────────────────────────────────────────────');
        console.log('  Role           Email                     Password');
        console.log('───────────────────────────────────────────────────────────');
        console.log('  admin          admin@sportfest.com        password');
        console.log('  dean_adviser   dean@sportfest.com         password');
        console.log('  sgo_president  president@sportfest.com    password');
        console.log('  sgo_officer    officer@sportfest.com      password');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('\n  🚀 Start the server: npm run dev\n');

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