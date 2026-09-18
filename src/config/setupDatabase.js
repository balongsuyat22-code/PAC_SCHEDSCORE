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
    process.env.PRESERVE_DATA === '1' || process.env.PRESERVE_DATA === 'true';

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

/** Safety net: wipe every non-users table regardless of schema outcome. */
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
        try { await conn.query(`TRUNCATE TABLE \`${t}\``); } catch (_) { /* table may not exist */ }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Safety wipe complete\n');
};

/**
 * Users live here (not in SQL) because bcrypt hashes must be generated at
 * runtime — the plaintext password "password" never touches the database.
 */
const seedDefaultUsers = async (conn) => {
    const users = [
        { username: 'admin', email: 'admin@sportfest.com', role: 'admin', first: 'System', last: 'Admin' },
        { username: 'dean_adviser', email: 'dean@sportfest.com', role: 'dean_adviser', first: 'Dean', last: 'Adviser' },
        { username: 'sgo_president', email: 'president@sportfest.com', role: 'sgo_president', first: 'SGO', last: 'President' },
        { username: 'sgo_officer', email: 'officer@sportfest.com', role: 'sgo_officer', first: 'SGO', last: 'Officer' },
        { username: 'aogarte', email: 'aogarte@sportfest.com', role: 'sgo_officer', first: 'A.', last: 'Ogarte' },
        { username: 'klongakit', email: 'klongakit@sportfest.com', role: 'sgo_officer', first: 'K.', last: 'Longakit' },
        { username: 'rmontemayor', email: 'rmontemayor@sportfest.com', role: 'sgo_officer', first: 'R.', last: 'Montemayor' },
        { username: 'mdumaboc', email: 'mdumaboc@sportfest.com', role: 'sgo_officer', first: 'M.', last: 'Dumaboc' },
    ];
    console.log('👤 Creating default users...');
    for (const u of users) {
        const hash = await bcrypt.hash('password', 10);
        await conn.query(
            `INSERT INTO users (uuid, username, email, password_hash, role, first_name, last_name, is_active)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1`,
            [u.username, u.email, hash, u.role, u.first, u.last]
        );
        console.log(`  ✅  ${u.role.padEnd(14)} → ${u.email}`);
    }
};

const run = async () => {
    let conn;
    try {
        const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db';

        console.log('🔧 Connecting to MySQL...');
        console.log('  host:', process.env.DB_HOST || process.env.MYSQLHOST || '(from URL)');
        console.log('  database:', dbName);
        console.log('  mode:', PRESERVE_DATA ? 'PRESERVE_DATA (no wipe)' : 'FULL RESEED');

        conn = await mysql.createConnection(buildConnectionOptions());
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await conn.query(`USE \`${dbName}\``);
        console.log('✅ Connected\n');

        // ── 1. Schema ─────────────────────────────────────────────
        if (PRESERVE_DATA) {
            console.log('⏭️  PRESERVE_DATA → skipping schema reset + hard wipe');
        } else {
            const schemaPath = findFile(['schema.sql', 'sql/schema.sql']);
            if (!schemaPath) throw new Error('schema.sql not found');
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

        // ── 2. Default users (bcrypt at runtime) ──────────────────
        await seedDefaultUsers(conn);

        // ── 3. All seed data in one file ──────────────────────────
        const seedPath = findFile([
            'sgo_days_2026_COMPLETE_ALL.sql',
            'sql/sgo_days_2026_COMPLETE_ALL.sql',
            'artifacts/sgo_days_2026_COMPLETE_ALL.sql',
        ]);
        if (!seedPath) throw new Error('sgo_days_2026_COMPLETE_ALL.sql not found');
        await runSqlFile(conn, seedPath, 'SGO Days 2026 COMPLETE seed');

        // ── 4. Summary ────────────────────────────────────────────
        try {
            const [[s]] = await conn.query(`
        SELECT
          (SELECT COUNT(*) FROM departments WHERE is_active = 1)                       AS depts,
          (SELECT COUNT(*) FROM sports WHERE is_active = 1)                            AS sports,
          (SELECT COUNT(*) FROM tournaments)                                           AS tournaments,
          (SELECT COUNT(*) FROM matches)                                               AS matches,
          (SELECT COUNT(*) FROM matches WHERE winner_department_id IS NOT NULL)        AS with_winner,
          (SELECT COUNT(*) FROM match_results)                                         AS match_results,
          (SELECT COUNT(*) FROM tournament_results)                                    AS tournament_results,
          (SELECT COUNT(*) FROM matches
            WHERE winner_department_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM match_results mr WHERE mr.match_id = matches.id))
                                                                                       AS missing_scores
      `);
            console.log('\n📊 Database summary:');
            console.log(`   active departments:    ${s.depts}`);
            console.log(`   active sports:         ${s.sports}`);
            console.log(`   tournaments:           ${s.tournaments}`);
            console.log(`   matches:               ${s.matches}`);
            console.log(`   matches with winner:   ${s.with_winner}`);
            console.log(`   match_results:         ${s.match_results}`);
            console.log(`   tournament_results:    ${s.tournament_results}`);
            console.log(`   ⚠️  missing scores:     ${s.missing_scores}  ← must be 0`);
        } catch (e) {
            console.log('(summary query skipped:', e.message, ')');
        }

        console.log('\n🎉 Setup complete!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  LOGIN (password = "password" for all):');
        console.log('    admin@sportfest.com');
        console.log('    dean@sportfest.com');
        console.log('    president@sportfest.com');
        console.log('    officer@sportfest.com');
        console.log('═══════════════════════════════════════════════════════════\n');
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        if (err.sqlMessage) console.error('   SQL:', err.sqlMessage);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();