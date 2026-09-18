require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const PRESERVE_DATA =
    process.env.PRESERVE_DATA === '1' || process.env.PRESERVE_DATA === 'true';

const buildConnectionOptions = () => {
    if (process.env.MYSQL_URL) return { uri: process.env.MYSQL_URL, multipleStatements: true };
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
        try { await conn.query(`TRUNCATE TABLE \`${t}\``); } catch (_) { }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Safety wipe complete\n');
};

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

// ────────────────────────────────────────────────────────────
// BRACKET FILLER — replaces the SQL stored procedures
// (DELIMITER / CREATE PROCEDURE don't work through mysql2)
// ────────────────────────────────────────────────────────────
async function fillBrackets(conn) {
    console.log('\n🎯 Filling every bracket slot with participants + scores...');

    const [[fest]] = await conn.query(
        `SELECT id FROM sport_fest_events WHERE year = 2026 AND name = 'High School SGO Days 2026' LIMIT 1`
    );
    if (!fest) { console.log('  ⚠️  No SGO Days 2026 event found — skipping.'); return; }
    const festId = fest.id;

    const [adminRows] = await conn.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = adminRows[0]?.id || null;

    const [deptRows] = await conn.query(
        `SELECT code, id FROM departments
      WHERE code IN ('MANTIS','BBEES','DOLPHIN','REDFOX','PANTHER','DPEACOCK','STALLION','SGOAT','NOWL')`
    );
    const D = Object.fromEntries(deptRows.map(r => [r.code, r.id]));

    const [tournaments] = await conn.query(
        `SELECT id, sport_id, format FROM tournaments WHERE sport_fest_id = ?`,
        [festId]
    );

    const pick = (R, a, b) => {
        if (a == null) return b;
        if (b == null) return a;
        const ra = R[a], rb = R[b];
        if (ra == null && rb == null) return a;
        if (ra == null) return b;
        if (rb == null) return a;
        return ra < rb ? a : b;
    };

    let gauntletCount = 0;
    let ffaCount = 0;

    for (const t of tournaments) {
        if (t.format === 'division_gauntlet') {
            const [res] = await conn.query(
                `SELECT department_id, \`rank\` FROM tournament_results WHERE tournament_id = ?`,
                [t.id]
            );
            if (!res.length) continue; // skip tournaments with no official results

            const R = {};
            for (const r of res) R[r.department_id] = r.rank;

            const [[sport]] = await conn.query(`SELECT scoring_type FROM sports WHERE id = ?`, [t.sport_id]);
            const stype = sport?.scoring_type || 'points';

            const g1w = pick(R, D.MANTIS, D.BBEES);
            const g1l = g1w === D.MANTIS ? D.BBEES : D.MANTIS;
            const g2w = pick(R, D.DOLPHIN, D.REDFOX);
            const g2l = g2w === D.DOLPHIN ? D.REDFOX : D.DOLPHIN;
            const g3w = pick(R, D.PANTHER, D.DPEACOCK);
            const g3l = g3w === D.PANTHER ? D.DPEACOCK : D.PANTHER;
            const g4w = pick(R, D.STALLION, D.SGOAT);
            const g4l = g4w === D.STALLION ? D.SGOAT : D.STALLION;

            const wwj = pick(R, g1w, g2w);
            const llj = pick(R, g1l, g2l);
            const wws = pick(R, g3w, g4w);
            const lls = pick(R, g3l, g4l);

            const loserWwj = wwj === g1w ? g2w : g1w;
            const loserWws = wws === g3w ? g4w : g3w;
            const lwj = pick(R, loserWwj, llj);
            const lws = pick(R, loserWws, lls);

            const chj = pick(R, wwj, lwj);
            const chs = pick(R, wws, lws);

            const slots = [
                // [position, round, match#, A, B, winner, completedAt]
                ['JHS-A', 1, 101, D.MANTIS, D.BBEES, g1w, '2026-09-14 08:25:00'],
                ['JHS-B', 1, 102, D.DOLPHIN, D.REDFOX, g2w, '2026-09-14 09:25:00'],
                ['SHS-A', 1, 103, D.PANTHER, D.DPEACOCK, g3w, '2026-09-14 10:25:00'],
                ['SHS-B', 1, 104, D.STALLION, D.SGOAT, g4w, '2026-09-14 11:25:00'],
                ['NOWL', 1, 105, g4w, D.NOWL, g4w, '2026-09-14 12:25:00'],
                ['LL-JHS', 2, 106, g1l, g2l, llj, '2026-09-15 08:25:00'],
                ['WW-JHS', 2, 107, g1w, g2w, wwj, '2026-09-15 09:25:00'],
                ['LL-SHS', 2, 108, g3l, g4l, lls, '2026-09-15 10:25:00'],
                ['WW-SHS', 2, 109, g3w, g4w, wws, '2026-09-15 11:25:00'],
                ['LW-JHS', 2, 110, loserWwj, llj, lwj, '2026-09-15 12:25:00'],
                ['LW-SHS', 2, 111, loserWws, lls, lws, '2026-09-15 14:25:00'],
                ['CH-JHS', 3, 112, wwj, lwj, chj, '2026-09-15 15:25:00'],
                ['CH-SHS', 3, 113, wws, lws, chs, '2026-09-15 16:25:00'],
            ];

            for (const [pos, round, num, a, b, w, completed] of slots) {
                const [exist] = await conn.query(
                    `SELECT id FROM matches WHERE tournament_id = ? AND bracket_position = ?`,
                    [t.id, pos]
                );

                let matchId;
                if (exist.length) {
                    matchId = exist[0].id;
                    await conn.query(
                        `UPDATE matches
                SET participant_a_department_id = ?,
                    participant_b_department_id = ?,
                    winner_department_id = ?,
                    status = 'completed',
                    completed_at = ?
              WHERE id = ?`,
                        [a, b, w, completed, matchId]
                    );
                } else {
                    const [ins] = await conn.query(
                        `INSERT INTO matches
              (tournament_id, sport_id, round_number, match_number,
               bracket_position, bracket_side, status,
               participant_a_department_id, participant_b_department_id,
               winner_department_id, completed_at, scheduled_date, scheduled_time)
             VALUES (?, ?, ?, ?, ?, 'division_gauntlet', 'completed',
                     ?, ?, ?, ?, ?, ?)`,
                        [t.id, t.sport_id, round, num, pos,
                            a, b, w, completed, completed.slice(0, 10), completed.slice(11)]
                    );
                    matchId = ins.insertId;
                }

                await conn.query(`DELETE FROM match_results WHERE match_id = ?`, [matchId]);

                let scoreA, scoreB, display;
                if (stype === 'points') {
                    scoreA = w === a ? 18 + Math.floor(Math.random() * 10) : 5 + Math.floor(Math.random() * 10);
                    scoreB = w === b ? 18 + Math.floor(Math.random() * 10) : 5 + Math.floor(Math.random() * 10);
                    if (scoreA === scoreB) scoreA += 1;
                    display = w === a ? `${scoreA}-${scoreB}` : `${scoreA}-${scoreB}`;
                } else if (stype === 'sets') {
                    scoreA = w === a ? 2 : 1;
                    scoreB = w === b ? 2 : 1;
                    display = w === a ? '2-1' : '1-2';
                } else if (stype === 'time') {
                    // Lower is better. Winner gets the smaller number.
                    scoreA = w === a ? 10 + Math.floor(Math.random() * 15) : 25 + Math.floor(Math.random() * 15);
                    scoreB = w === b ? 10 + Math.floor(Math.random() * 15) : 25 + Math.floor(Math.random() * 15);
                    display = w === a ? '1st-2nd' : '2nd-1st';
                } else {
                    // binary
                    scoreA = w === a ? 1 : 0;
                    scoreB = w === b ? 1 : 0;
                    display = w === a ? '1-0' : '0-1';
                }
                const side = w === a ? 'a' : 'b';

                await conn.query(
                    `INSERT INTO match_results
             (match_id, total_score_a, total_score_b, final_score_display,
              winner_side, win_type, recorded_by)
           VALUES (?, ?, ?, ?, ?, 'normal', ?)`,
                    [matchId, scoreA, scoreB, display, side, adminId]
                );
            }
            gauntletCount++;
        }

        if (t.format === 'free_for_all') {
            const [exist] = await conn.query(
                `SELECT id FROM matches WHERE tournament_id = ? LIMIT 1`,
                [t.id]
            );
            let matchId;
            if (exist.length) {
                matchId = exist[0].id;
            } else {
                const [[top]] = await conn.query(
                    `SELECT department_id FROM tournament_results
            WHERE tournament_id = ? ORDER BY \`rank\` ASC LIMIT 1`,
                    [t.id]
                );
                if (!top?.department_id) continue; // no results, skip

                const [ins] = await conn.query(
                    `INSERT INTO matches
            (tournament_id, sport_id, round_number, match_number,
             bracket_position, bracket_side, status,
             participant_a_department_id, winner_department_id,
             completed_at, scheduled_date, scheduled_time)
           VALUES (?, ?, 1, 1, 'FFA Event', 'ffa', 'completed',
                   ?, ?, '2026-09-14 10:00:00', '2026-09-14', '09:00:00')`,
                    [t.id, t.sport_id, top.department_id, top.department_id]
                );
                matchId = ins.insertId;
            }

            const [mr] = await conn.query(`SELECT id FROM match_results WHERE match_id = ?`, [matchId]);
            if (!mr.length) {
                await conn.query(
                    `INSERT INTO match_results
             (match_id, total_score_a, total_score_b, final_score_display,
              winner_side, win_type, recorded_by)
           VALUES (?, 1, 0, '1st Place', 'a', 'normal', ?)`,
                    [matchId, adminId]
                );
            }
            ffaCount++;
        }
    }

    console.log(`  ✅ ${gauntletCount} division_gauntlet bracket(s) filled`);
    console.log(`  ✅ ${ffaCount} free_for_all event(s) scored`);
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
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

        await seedDefaultUsers(conn);

        const seedPath = findFile([
            'sgo_days_2026_COMPLETE_ALL.sql',
            'sql/sgo_days_2026_COMPLETE_ALL.sql',
            'artifacts/sgo_days_2026_COMPLETE_ALL.sql',
        ]);
        if (!seedPath) throw new Error('sgo_days_2026_COMPLETE_ALL.sql not found');
        await runSqlFile(conn, seedPath, 'SGO Days 2026 COMPLETE seed');

        // ← NEW: fill every bracket slot with participants + scores
        await fillBrackets(conn);

        // Rebuild department scores one more time (brackets may have added results)
        await conn.query(`
      UPDATE department_scores ds
      JOIN (
        SELECT tr.department_id,
               SUM(tr.sport_fest_points) AS pts,
               SUM(tr.medal='gold')      AS g,
               SUM(tr.medal='silver')    AS s,
               SUM(tr.medal='bronze')    AS b,
               COUNT(*) AS cnt
        FROM tournament_results tr
        JOIN tournaments t ON tr.tournament_id = t.id
        JOIN sport_fest_tournaments sft
             ON sft.tournament_id = t.id
        WHERE sft.sport_fest_id = (SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
        GROUP BY tr.department_id
      ) x ON ds.department_id = x.department_id
      SET ds.total_points        = x.pts + COALESCE(ds.bonus_points, 0),
          ds.gold_medals         = x.g,
          ds.silver_medals       = x.s,
          ds.bronze_medals       = x.b,
          ds.total_participations= x.cnt,
          ds.tournaments_entered = x.cnt
    `);

        // ── Summary ──
        try {
            const [[s]] = await conn.query(`
        SELECT
          (SELECT COUNT(*) FROM departments WHERE is_active = 1)                       AS depts,
          (SELECT COUNT(*) FROM sports WHERE is_active = 1)                            AS sports,
          (SELECT COUNT(*) FROM tournaments)                                           AS tournaments,
          (SELECT COUNT(*) FROM tournaments WHERE format = 'division_gauntlet')        AS gauntlet,
          (SELECT COUNT(*) FROM tournaments WHERE format = 'free_for_all')             AS ffa,
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
            console.log(`     • division_gauntlet: ${s.gauntlet}`);
            console.log(`     • free_for_all:      ${s.ffa}`);
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