require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const buildConnectionOptions = () => {
    if (process.env.MYSQL_URL) {
        return { uri: process.env.MYSQL_URL, multipleStatements: true };
    }
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) {
        return { uri: process.env.DATABASE_URL, multipleStatements: true };
    }
    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        multipleStatements: true,
    };
};

const isSgoSeedAlreadyInserted = async (conn) => {
    const [rows] = await conn.query(`
        SELECT COUNT(*) AS total
        FROM tournaments
        WHERE name LIKE '%SGO Days 2026%'
           OR sport_fest_id = (
                SELECT id
                FROM sport_fest_events
                WHERE year = 2026
                  AND name = 'High School SGO Days 2026'
                LIMIT 1
           )
    `);

    return Number(rows[0].total) > 0;
};

const run = async () => {
    let conn;
    try {
        const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db';

        console.log('🔧 Connecting to MySQL...');
        console.log('  host:', process.env.DB_HOST || process.env.MYSQLHOST || '(from URL)');
        console.log('  user:', process.env.DB_USER || process.env.MYSQLUSER || 'root');
        console.log('  database (target):', dbName);

        const opts = buildConnectionOptions();
        conn = await mysql.createConnection(opts);

        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await conn.query(`USE \`${dbName}\``);
        console.log('✅ Connected\n');

        // Step 1: apply the main schema before any SGO data seed
        const schemaCandidates = [
            path.join(__dirname, '../../schema.sql'),
            path.join(__dirname, '../../../schema.sql'),
            path.join(__dirname, '../../sql/schema.sql'),
            path.join(process.cwd(), 'schema.sql'),
            path.join(process.cwd(), 'sql/schema.sql'),
        ];
        const schemaPath = schemaCandidates.find((p) => fs.existsSync(p));
        if (!schemaPath) throw new Error('schema.sql not found');

        console.log('📦 Applying schema...');
        console.log('   file:', schemaPath);
        await conn.query(fs.readFileSync(schemaPath, 'utf8'));
        console.log('✅ Schema applied\n');

        await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_insert');
        await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_update');
        console.log('✅ Legacy triggers dropped\n');

        // College departments
        console.log('🏫 Creating departments...');
        await conn.query(`
            INSERT INTO departments (id, name, code, description, division, is_exhibition) VALUES
            (1, 'College of Arts and Sciences', 'CAS', 'Arts and Sciences Department', 'college', 0),
            (2, 'College of Business Administration', 'CBA', 'Business Administration Department', 'college', 0),
            (3, 'College of Education', 'CED', 'Education Department', 'college', 0),
            (4, 'College of Engineering', 'CEN', 'Engineering Department', 'college', 0),
            (5, 'College of Nursing', 'CON', 'Nursing Department', 'college', 0),
            (6, 'College of Information Technology', 'CIT', 'Information Technology Department', 'college', 0),
            (7, 'Faculty / Night Owls', 'FAC', 'Exhibition-only faculty team', NULL, 1),
            (8, 'Supreme Goat / SGO / SELECOM', 'SGO', 'Student Officer team', 'senior_high', 0)
            ON DUPLICATE KEY UPDATE name = VALUES(name), division = VALUES(division), is_exhibition = VALUES(is_exhibition)
        `);
        console.log('✅ Departments created\n');

        // Default users
        console.log('👤 Creating default users...');
        const defaultUsers = [
            { username: 'admin', email: 'admin@sportfest.com', password: 'password', role: 'admin', first: 'System', last: 'Admin', dept: 1 },
            { username: 'dean_adviser', email: 'dean@sportfest.com', password: 'password', role: 'dean_adviser', first: 'Dean', last: 'Adviser', dept: 2 },
            { username: 'sgo_president', email: 'president@sportfest.com', password: 'password', role: 'sgo_president', first: 'SGO', last: 'President', dept: null },
            { username: 'sgo_officer', email: 'officer@sportfest.com', password: 'password', role: 'sgo_officer', first: 'SGO', last: 'Officer', dept: null },
        ];
        for (const u of defaultUsers) {
            const hash = await bcrypt.hash(u.password, 10);
            await conn.query(
                `INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name, department_id, is_active)
                 VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1`,
                [u.username, u.email, hash, u.role, u.first, u.last, u.dept]
            );
            console.log(`  ✅  ${u.role.padEnd(14)} → ${u.email}`);
        }

        // ============================================================
        // BASE DATA for SGO Days 2026
        // ============================================================
        console.log('\n📦 Seeding base data for SGO Days 2026...');

        // High school departments
        await conn.query(`
            INSERT INTO departments (name, code, description, division, is_exhibition, is_active) VALUES
            ('Blue Bees', 'BBEES', 'Junior High', 'junior_high', 0, 1),
            ('Dolphins', 'DOLPHIN', 'Junior High', 'junior_high', 0, 1),
            ('Dancing Peacocks', 'DPEACOCK', 'Senior High', 'senior_high', 0, 1),
            ('Mantises', 'MANTIS', 'Junior High', 'junior_high', 0, 1),
            ('Night Owls', 'NOWL', 'Faculty / Exhibition', NULL, 1, 1),
            ('Panthers', 'PANTHER', 'Senior High', 'senior_high', 0, 1),
            ('Red Foxes', 'REDFOX', 'Junior High', 'junior_high', 0, 1),
            ('Supreme Goats', 'SGOAT', 'Senior High', 'senior_high', 0, 1),
            ('Stallions', 'STALLION', 'Senior High', 'senior_high', 0, 1),
            ('Eagles', 'EAGLE', 'Junior High', 'junior_high', 0, 1),
            ('Pythons', 'PYTHON', 'Junior High', 'junior_high', 0, 1)
            ON DUPLICATE KEY UPDATE name = VALUES(name), division = VALUES(division), is_exhibition = VALUES(is_exhibition), is_active = 1
        `);
        console.log('  ✅ High school departments');

        // Sports
        await conn.query(`
            INSERT INTO sports (name, code, category, is_team_sport, scoring_type, is_active) VALUES
            ('Chess', 'CHESS', 'individual', 0, 'binary', 1),
            ('Scrabble', 'SCRABBLE', 'individual', 0, 'points', 1),
            ('Checkers', 'CHECKERS', 'individual', 0, 'binary', 1),
            ('Darts', 'DARTS', 'individual', 0, 'points', 1),
            ('Sudoku', 'SUDOKU', 'individual', 0, 'time', 1),
            ('Sungka', 'SUNGKA', 'individual', 0, 'points', 1),
            ('Basketball', 'BASKETBALL', 'team', 1, 'points', 1),
            ('Volleyball', 'VOLLEYBALL', 'team', 1, 'sets', 1),
            ('Badminton', 'BADMINTON', 'individual', 0, 'sets', 1),
            ('Table Tennis', 'TABLE_TENNIS', 'individual', 0, 'sets', 1),
            ('Sepak Takraw', 'SEPAK_TAKRAW', 'team', 1, 'sets', 1),
            ('Mobile Legends', 'MOBILE_LEGENDS', 'team', 1, 'binary', 1)
            ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = 1
        `);
        console.log('  ✅ Sports');

        // Venues
        await conn.query(`
            INSERT INTO venues (name, location, is_active) VALUES
            ('Board Games Area', 'Main Building', 1),
            ('Gym', 'Sports Complex', 1),
            ('Covered Court', 'Sports Complex', 1),
            ('Computer Lab', 'ICT Building', 1),
            ('Open Field', 'Campus Grounds', 1)
            ON DUPLICATE KEY UPDATE is_active = 1
        `);
        console.log('  ✅ Venues');

        // Referee users
        const referees = [
            { username: 'aogarte', email: 'aogarte@sportfest.com', first: 'A.', last: 'Ogarte' },
            { username: 'klongakit', email: 'klongakit@sportfest.com', first: 'K.', last: 'Longakit' },
            { username: 'rmontemayor', email: 'rmontemayor@sportfest.com', first: 'R.', last: 'Montemayor' },
            { username: 'mdumaboc', email: 'mdumaboc@sportfest.com', first: 'M.', last: 'Dumaboc' },
        ];
        for (const r of referees) {
            const hash = await bcrypt.hash('password', 10);
            await conn.query(
                `INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name, is_active)
                 VALUES (UUID(), ?, ?, ?, 'sgo_officer', ?, ?, 1)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1`,
                [r.username, r.email, hash, r.first, r.last]
            );
        }
        console.log('  ✅ Referee users');

        // Sport Fest Event
        await conn.query(`
            INSERT INTO sport_fest_events (name, year, status, is_current, start_date, end_date)
            VALUES ('High School SGO Days 2026', 2026, 'ongoing', 1, '2026-09-14', '2026-09-16')
            ON DUPLICATE KEY UPDATE is_current = 1, status = 'ongoing'
        `);
        console.log('  ✅ Sport Fest Event');
        console.log('✅ Base data ready\n');

        // Step 2: import SGO Days 2026 only after the schema exists
        // and only when the tournament data has not been inserted yet.
        const seedCandidates = [
            path.join(__dirname, '../../sgo_days_2026_COMPLETE_ALL.sql'),
            path.join(__dirname, '../../sql/sgo_days_2026_COMPLETE_ALL.sql'),
            path.join(process.cwd(), 'sgo_days_2026_COMPLETE_ALL.sql'),
            path.join(process.cwd(), 'sql/sgo_days_2026_COMPLETE_ALL.sql'),
        ];
        const seedPath = seedCandidates.find((p) => fs.existsSync(p));

        if (seedPath) {
            const alreadyInserted = await isSgoSeedAlreadyInserted(conn);
            if (alreadyInserted) {
                console.log('✅ SGO Days 2026 seed already exists; skipping duplicate import.');
            } else {
                console.log('🏆 Running SGO Days 2026 seed (one-time)...');
                console.log('   file:', seedPath);
                try {
                    // This file removes prior SGO Days data before inserting, so it only needs to run once.
                    await conn.query(fs.readFileSync(seedPath, 'utf8'));
                    console.log('✅ SGO Days 2026 seed applied successfully');
                } catch (seedErr) {
                    console.error('❌ SGO Days seed failed:', seedErr.message);
                }
            }
        } else {
            console.log('⏭️  No seed file found – skipping.');
        }

        console.log('\n🎉 Setup complete!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  LOGIN (password is "password" for all):');
        console.log('  admin@sportfest.com');
        console.log('  dean@sportfest.com');
        console.log('  president@sportfest.com');
        console.log('  officer@sportfest.com');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('📌 After successful seed, delete sgo_days_2026_COMPLETE_ALL.sql\n');
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();