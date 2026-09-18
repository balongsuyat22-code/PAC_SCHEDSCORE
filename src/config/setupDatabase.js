require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

/**
 * Always wipes & reseeds by default.
 * Opt out with:  PRESERVE_DATA=1 node src/config/setupDatabase.js
 */

const PRESERVE_DATA =
    process.env.PRESERVE_DATA === '1' ||
    process.env.PRESERVE_DATA === 'true';

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

const findFile = (names) => {
    const bases = [
        path.join(__dirname, '../..'),
        path.join(__dirname, '../../..'),
        path.join(__dirname, '../../sql'),
        path.join(__dirname, '../../../sql'),
        process.cwd(),
        path.join(process.cwd(), 'sql'),
        path.join(process.cwd(), 'artifacts'),
        path.join(process.cwd(), 'attachments'),
    ];
    for (const base of bases) {
        for (const name of names) {
            const p = path.join(base, name);
            if (fs.existsSync(p)) return p;
        }
    }
    return null;
};

const runSqlFile = async (conn, filePath, label) => {
    console.log(`\n📄 Running ${label}...`);
    console.log('   file:', filePath);
    const sql = fs.readFileSync(filePath, 'utf8');
    await conn.query(sql);
    console.log(`✅ ${label} applied`);
};

/** Safety net: TRUNCATE every non-users table regardless of schema outcome. */
const hardWipeAllTables = async (conn) => {
    const tables = [
        'sport_fest_bonus_points', 'sport_fest_champions', 'notifications',
        'schedules', 'department_scores', 'tournament_results',
        'ffa_results', 'round_robin_standings', 'match_results',
        'match_scores', 'matches', 'tournament_participants', 'venues',
        'players', 'teams', 'sport_fest_tournaments', 'tournaments',
        'sports', 'activity_logs', 'refresh_tokens',
        'sport_fest_events', 'departments',
    ];
    console.log('🧹 Safety wipe of all non-user tables...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of tables) {
        try {
            await conn.query(`TRUNCATE TABLE \`${t}\``);
        } catch (_) { /* table may not exist yet */ }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Safety wipe complete\n');
};

const run = async () => {
    let conn;
    try {
        const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db';

        console.log('🔧 Connecting to MySQL...');
        console.log('  host:', process.env.DB_HOST || process.env.MYSQLHOST || '(from URL)');
        console.log('  user:', process.env.DB_USER || process.env.MYSQLUSER || 'root');
        console.log('  database (target):', dbName);
        console.log('  mode:', PRESERVE_DATA ? 'PRESERVE_DATA (no wipe)' : 'FULL RESEED (wipe + reseed every run)');

        const opts = buildConnectionOptions();
        conn = await mysql.createConnection(opts);

        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await conn.query(`USE \`${dbName}\``);
        console.log('✅ Connected\n');

        // ── Schema ──────────────────────────────────────────────
        const schemaPath = findFile(['schema.sql', 'sql/schema.sql']);
        if (!schemaPath) throw new Error('schema.sql not found');

        if (PRESERVE_DATA) {
            console.log('⏭️  PRESERVE_DATA → skipping schema reset + hard wipe');
        } else {
            console.log('📦 Applying schema (keeps `users`, wipes everything else)...');
            console.log('   file:', schemaPath);
            try {
                await conn.query(fs.readFileSync(schemaPath, 'utf8'));
                console.log('✅ Schema applied');
            } catch (err) {
                console.warn('⚠️  schema.sql failed halfway:', err.message);
                console.warn('   → running hard wipe safety net anyway');
            }
            await hardWipeAllTables(conn);
        }

        try {
            await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_insert');
            await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_update');
            console.log('✅ Legacy triggers dropped\n');
        } catch (_) { /* ignore */ }

        // ── College departments ─────────────────────────────────
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

        // ── Default users ───────────────────────────────────────
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

        // ── Base SGO data ───────────────────────────────────────
        console.log('\n📦 Seeding base data for SGO Days 2026...');

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

        await conn.query(`
            INSERT INTO sport_fest_events (name, year, status, is_current, start_date, end_date, champion_count)
            VALUES ('High School SGO Days 2026', 2026, 'ongoing', 1, '2026-09-14', '2026-09-16', 2)
            ON DUPLICATE KEY UPDATE is_current = 1, status = 'ongoing', champion_count = 2
        `);
        await conn.query(`UPDATE sport_fest_events SET is_current = 0 WHERE NOT (year = 2026 AND name = 'High School SGO Days 2026')`);
        await conn.query(`UPDATE sport_fest_events SET is_current = 1 WHERE year = 2026 AND name = 'High School SGO Days 2026'`);
        console.log('  ✅ Sport Fest Event');
        console.log('✅ Base data ready\n');

        // ── Seed 1: COMPLETE_ALL ────────────────────────────────
        const seedPath = findFile([
            'sgo_days_2026_COMPLETE_ALL.sql',
            'sql/sgo_days_2026_COMPLETE_ALL.sql',
        ]);
        if (!seedPath) throw new Error('sgo_days_2026_COMPLETE_ALL.sql not found');
        await runSqlFile(conn, seedPath, 'SGO Days 2026 COMPLETE_ALL seed');

        // ── Seed 2: RESULTS + SCORES ────────────────────────────
        const resultsPath = findFile([
            'sgo_days_2026_RESULTS_AND_SCORES.sql',
            'sql/sgo_days_2026_RESULTS_AND_SCORES.sql',
            'artifacts/sgo_days_2026_RESULTS_AND_SCORES.sql',
        ]);
        if (!resultsPath) throw new Error('sgo_days_2026_RESULTS_AND_SCORES.sql not found');
        await runSqlFile(conn, resultsPath, 'SGO Days 2026 RESULTS + MATCH SCORES');

        // ── Seed 3: FIX_SCORES_FORMAT ───────────────────────────
        const fixPath = findFile([
            'sgo_days_2026_FIX_SCORES_FORMAT.sql',
            'sql/sgo_days_2026_FIX_SCORES_FORMAT.sql',
            'artifacts/sgo_days_2026_FIX_SCORES_FORMAT.sql',
        ]);
        if (!fixPath) throw new Error('sgo_days_2026_FIX_SCORES_FORMAT.sql not found');
        await runSqlFile(conn, fixPath, 'SGO Days 2026 FIX_SCORES_FORMAT (winners + scores)');

        // ── Summary ─────────────────────────────────────────────
        try {
            const [[stats]] = await conn.query(`
                SELECT
                  (SELECT COUNT(*) FROM tournaments WHERE name LIKE '%SGO Days 2026%') AS tournaments,
                  (SELECT COUNT(*) FROM matches m JOIN tournaments t ON m.tournament_id=t.id WHERE t.name LIKE '%SGO Days 2026%') AS matches,
                  (SELECT COUNT(*) FROM matches m JOIN tournaments t ON m.tournament_id=t.id
                    WHERE t.name LIKE '%SGO Days 2026%' AND m.winner_department_id IS NOT NULL) AS with_winner,
                  (SELECT COUNT(*) FROM match_results mr JOIN matches m ON mr.match_id=m.id JOIN tournaments t ON m.tournament_id=t.id WHERE t.name LIKE '%SGO Days 2026%') AS match_results,
                  (SELECT COUNT(*) FROM tournament_results tr JOIN tournaments t ON tr.tournament_id=t.id WHERE t.name LIKE '%SGO Days 2026%') AS tournament_results,
                  (SELECT COUNT(*) FROM sport_fest_bonus_points) AS bonus_points
            `);
            console.log('\n📊 Database summary:');
            console.log(`   tournaments:         ${stats.tournaments}`);
            console.log(`   matches:             ${stats.matches}`);
            console.log(`   matches with winner: ${stats.with_winner}`);
            console.log(`   match_results:       ${stats.match_results}`);
            console.log(`   tournament_results:  ${stats.tournament_results}`);
            console.log(`   bonus_points rows:   ${stats.bonus_points}`);
        } catch (e) {
            console.log('(summary query skipped:', e.message, ')');
        }

        console.log('\n🎉 Setup complete!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  LOGIN (password is "password" for all):');
        console.log('  admin@sportfest.com');
        console.log('  dean@sportfest.com');
        console.log('  president@sportfest.com');
        console.log('  officer@sportfest.com');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('📌 To run without wiping: PRESERVE_DATA=1 node src/config/setupDatabase.js\n');
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        if (err.sqlMessage) console.error('   SQL:', err.sqlMessage);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();