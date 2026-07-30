require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const buildConfig = () => {
    // Prefer full URL when Railway provides it
    if (process.env.MYSQL_URL) {
        return process.env.MYSQL_URL;
    }
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) {
        return process.env.DATABASE_URL;
    }

    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        // Don't force database here if it might not exist yet — we CREATE/USE below
        multipleStatements: true,
    };
};

const run = async () => {
    let conn;
    try {
        const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db';

        console.log('🔧 Connecting to MySQL...');
        console.log('  host:', process.env.DB_HOST || process.env.MYSQLHOST || '(from URL)');
        console.log('  user:', process.env.DB_USER || process.env.MYSQLUSER || 'root');
        console.log('  database (target):', dbName);

        const cfg = buildConfig();
        conn = typeof cfg === 'string'
            ? await mysql.createConnection(cfg)
            : await mysql.createConnection(cfg);

        // Ensure DB exists, then use it (schema may assume a DB name)
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await conn.query(`USE \`${dbName}\``);

        console.log('✅ Connected\n');

        // ── 1. Run schema DDL ─────────────────────────────────────
        console.log('📦 Applying schema...');
        const schemaPath = path.join(__dirname, '../../sql/schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at ${schemaPath}`);
        }
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

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

        // ── 2. Triggers (unchanged) ───────────────────────────────
        console.log('⚡ Creating triggers...');
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

        // ── 3–4. Departments + users (your existing INSERT IGNORE / ON DUPLICATE KEY) ──
        // ... keep the rest of your seed code exactly as you have it ...

        console.log('\n🎉 Setup complete!');
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('   → Nothing is listening on the host/port you used.');
            console.error('   → On Railway: set DB_HOST/MYSQLHOST (or MYSQL_URL) from the MySQL service.');
            console.error('   → Locally: start MySQL/XAMPP.');
        }
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   → Wrong user/password. Check MYSQLUSER/MYSQLPASSWORD or DB_USER/DB_PASSWORD.');
        }
        if (err.code === 'ENOTFOUND') {
            console.error('   → Hostname not found. Use the MySQL service private host (*.railway.internal), not a public URL.');
        }
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();