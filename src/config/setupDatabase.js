require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const RESET_DATABASE = process.env.RESET_DATABASE === '1' || process.env.RESET_DATABASE === 'true';
const SEED_DATABASE = process.env.SEED_DATABASE === '1' || process.env.SEED_DATABASE === 'true';

const buildSslConfig = () => {
    if (process.env.DB_SSL !== 'true') return undefined;

    const ca = process.env.DB_CA_CERT?.replace(/\\n/g, '\n');
    return {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
        ...(ca ? { ca } : {}),
    };
};

const buildConnectionOptions = () => {
    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    const ssl = buildSslConfig();
    if (databaseUrl) {
        const url = new URL(databaseUrl);
        if (url.protocol !== 'mysql:') {
            throw new Error('DATABASE_URL must use the mysql:// protocol');
        }

        return {
            host: url.hostname,
            port: Number(url.port || 3306),
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: decodeURIComponent(url.pathname.replace(/^\//, '')) || undefined,
            multipleStatements: true,
            ...(ssl ? { ssl } : {}),
        };
    }

    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQLDATABASE || undefined,
        multipleStatements: true,
        ...(ssl ? { ssl } : {}),
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
    for (const base of bases)
        for (const name of names) {
            const p = path.join(base, name);
            if (fs.existsSync(p)) return p;
        }
    return null;
};

const runSqlFile = async (conn, filePath, label) => {
    console.log(`\n📄 Running ${label}...`);
    console.log('   file:', filePath);
    await conn.query(fs.readFileSync(filePath, 'utf8'));
    console.log(`✅ ${label} applied`);
};

const tableExists = async (conn, tableName) => {
    const [[row]] = await conn.query(
        `SELECT COUNT(*) AS count FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [tableName]
    );
    return row.count > 0;
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
    for (const t of tables) { try { await conn.query(`TRUNCATE TABLE \`${t}\``); } catch (_) { } }
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
    ON DUPLICATE KEY UPDATE id = id`,
            [u.username, u.email, hash, u.role, u.first, u.last]
        );
        console.log(`  ✅  ${u.role.padEnd(14)} → ${u.email}`);
    }
};

// ────────────────────────────────────────────────────────────
// Schedules
// ────────────────────────────────────────────────────────────
const FFA_SCHEDULE = {
    QUIZ_BEE: { date: '2026-09-14', time: '09:00:00', done: '2026-09-14 10:00:00' },
    BIBLE_QUIZ: { date: '2026-09-14', time: '09:00:00', done: '2026-09-14 10:00:00' },
    BANNER_RACING: { date: '2026-09-14', time: '10:00:00', done: '2026-09-14 10:30:00' },
    BIG_VOLLEYBALL: { date: '2026-09-14', time: '13:00:00', done: '2026-09-14 13:30:00' },
    TUG_OF_WAR: { date: '2026-09-14', time: '13:00:00', done: '2026-09-14 13:30:00' },
    SACK_RACE: { date: '2026-09-14', time: '14:00:00', done: '2026-09-14 14:30:00' },
    SPIN_WHEEL: { date: '2026-09-14', time: '15:00:00', done: '2026-09-14 15:30:00' },
};

const GAUNTLET_SCHEDULE = {
    'JHS-A': { date: '2026-09-14', time: '07:30:00', done: '2026-09-14 08:25:00' },
    'JHS-B': { date: '2026-09-14', time: '08:30:00', done: '2026-09-14 09:25:00' },
    'SHS-A': { date: '2026-09-14', time: '09:30:00', done: '2026-09-14 10:25:00' },
    'SHS-B': { date: '2026-09-14', time: '10:30:00', done: '2026-09-14 11:25:00' },
    'NOWL': { date: '2026-09-14', time: '11:30:00', done: '2026-09-14 12:25:00' },
    'LL-JHS': { date: '2026-09-15', time: '07:30:00', done: '2026-09-15 08:25:00' },
    'WW-SHS': { date: '2026-09-15', time: '08:30:00', done: '2026-09-15 09:25:00' },
    'WW-JHS': { date: '2026-09-15', time: '09:30:00', done: '2026-09-15 10:25:00' },
    'LL-SHS': { date: '2026-09-15', time: '10:30:00', done: '2026-09-15 11:25:00' },
    'LW-JHS': { date: '2026-09-15', time: '11:30:00', done: '2026-09-15 12:25:00' },
    'LW-SHS': { date: '2026-09-15', time: '13:00:00', done: '2026-09-15 13:55:00' },
    'CH-JHS': { date: '2026-09-15', time: '14:00:00', done: '2026-09-15 14:55:00' },
    'CH-SHS': { date: '2026-09-15', time: '15:00:00', done: '2026-09-15 15:55:00' },
};

// ────────────────────────────────────────────────────────────
// Write match_results + match_scores for one match
// ────────────────────────────────────────────────────────────
async function writeScore(conn, matchId, stype, winnerIsA, adminId, championName = null, sportCode = '') {
    await conn.query(`DELETE FROM match_results WHERE match_id = ?`, [matchId]);
    await conn.query(`DELETE FROM match_scores  WHERE match_id = ?`, [matchId]);

    const rnd = (n) => Math.floor(Math.random() * n);
    let scoreA, scoreB, display, side;

    if (stype === 'points') {
        const isBasketball = sportCode.toUpperCase() === 'BASKETBALL';
        const winningScore = isBasketball ? 60 + rnd(21) : 18 + rnd(10);
        const losingScore = isBasketball
            ? 50 + rnd(winningScore - 50)
            : 5 + rnd(10);
        scoreA = winnerIsA ? winningScore : losingScore;
        scoreB = winnerIsA ? losingScore : winningScore;
        if (scoreA === scoreB) scoreA += 1;
        display = `${scoreA}-${scoreB}`;
    } else if (stype === 'sets') {
        const loser = rnd(2);
        scoreA = winnerIsA ? 2 : loser;
        scoreB = winnerIsA ? loser : 2;
        display = `${scoreA}-${scoreB}`;
    } else if (stype === 'time') {
        scoreA = winnerIsA ? 10 + rnd(15) : 25 + rnd(15);
        scoreB = winnerIsA ? 25 + rnd(15) : 10 + rnd(15);
        display = winnerIsA ? '1st-2nd' : '2nd-1st';
    } else if (stype === 'ffa') {
        scoreA = 1; scoreB = 0;
        display = championName ? `Champion: ${championName}` : '1st Place';
    } else { // binary
        scoreA = winnerIsA ? 1 : 0;
        scoreB = winnerIsA ? 0 : 1;
        display = winnerIsA ? '1-0' : '0-1';
    }
    side = winnerIsA ? 'a' : 'b';

    await conn.query(
        `INSERT INTO match_results
       (match_id, total_score_a, total_score_b, final_score_display,
        winner_side, win_type, recorded_by)
     VALUES (?, ?, ?, ?, ?, 'normal', ?)`,
        [matchId, scoreA, scoreB, display, side, adminId]
    );

    // UI needs match_scores rows for 'sets' display (COUNT score_a > score_b)
    if (stype === 'sets') {
        const labels = ['Set 1', 'Set 2', 'Set 3'];
        for (let i = 0; i < scoreA + scoreB; i++) {
            const aWon = i < scoreA;
            await conn.query(
                `INSERT INTO match_scores (match_id, period, period_label, score_a, score_b, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [matchId, i + 1, labels[i] || `Set ${i + 1}`,
                    aWon ? 21 : 18 + rnd(3), aWon ? 18 + rnd(3) : 21, adminId]
            );
        }
    } else if (stype === 'points') {
        const qA = Math.floor(scoreA / 4);
        const qB = Math.floor(scoreB / 4);
        for (let i = 0; i < 4; i++) {
            await conn.query(
                `INSERT INTO match_scores (match_id, period, period_label, score_a, score_b, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [matchId, i + 1, `Q${i + 1}`,
                    i === 3 ? scoreA - qA * 3 : qA,
                    i === 3 ? scoreB - qB * 3 : qB, adminId]
            );
        }
    }
}

// ────────────────────────────────────────────────────────────
// Fill every tournament with matches + scores + ffa_results
// ────────────────────────────────────────────────────────────
async function fillAll(conn) {
    console.log('\n🎯 Filling every tournament with matches + scores + schedules...');

    const [[fest]] = await conn.query(
        `SELECT id FROM sport_fest_events WHERE year = 2026 AND name = 'High School SGO Days 2026' LIMIT 1`
    );
    if (!fest) throw new Error('SGO Days 2026 event not found — run the SQL seed first');
    const festId = fest.id;

    const [adminRows] = await conn.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = adminRows[0]?.id || null;

    const [deptRows] = await conn.query(
        `SELECT code, id, short_name, name FROM departments
      WHERE code IN ('MANTIS','BBEES','DOLPHIN','REDFOX','PANTHER','DPEACOCK','STALLION','SGOAT','NOWL')`
    );
    const D = {};
    for (const r of deptRows) D[r.code] = r.id;

    const [tournaments] = await conn.query(
        `SELECT t.id, t.sport_id, t.format, t.gender, t.name AS tname,
            s.code AS sport_code, s.scoring_type, s.name AS sport_name
       FROM tournaments t
       JOIN sports s ON s.id = t.sport_id
      WHERE t.sport_fest_id = ?
      ORDER BY t.id`, [festId]
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

    const noResults = [];
    let gauntletCount = 0;
    let ffaCount = 0;
    let ffaResultRows = 0;
    let totalMatches = 0;

    for (const t of tournaments) {
        // ── DIVISION-GAUNTLET ──
        if (t.format === 'division_gauntlet') {
            const [res] = await conn.query(
                `SELECT department_id, \`rank\` FROM tournament_results WHERE tournament_id = ?`, [t.id]
            );
            if (!res.length) { noResults.push({ id: t.id, name: t.tname }); continue; }

            const R = {};
            for (const r of res) R[r.department_id] = r.rank;
            const stype = (t.scoring_type || 'points').toLowerCase();

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
                ['JHS-A', 1, 101, D.MANTIS, D.BBEES, g1w],
                ['JHS-B', 1, 102, D.DOLPHIN, D.REDFOX, g2w],
                ['SHS-A', 1, 103, D.PANTHER, D.DPEACOCK, g3w],
                ['SHS-B', 1, 104, D.STALLION, D.SGOAT, g4w],
                ['NOWL', 1, 105, g4w, D.NOWL, g4w],
                ['LL-JHS', 2, 106, g1l, g2l, llj],
                ['WW-JHS', 2, 107, g1w, g2w, wwj],
                ['LL-SHS', 2, 108, g3l, g4l, lls],
                ['WW-SHS', 2, 109, g3w, g4w, wws],
                ['LW-JHS', 2, 110, loserWwj, llj, lwj],
                ['LW-SHS', 2, 111, loserWws, lls, lws],
                ['CH-JHS', 3, 112, wwj, lwj, chj],
                ['CH-SHS', 3, 113, wws, lws, chs],
            ];

            for (const [pos, round, num, a, b, w] of slots) {
                const sched = GAUNTLET_SCHEDULE[pos];

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
                    completed_at = ?,
                    scheduled_date = ?,
                    scheduled_time = ?
              WHERE id = ?`,
                        [a, b, w, sched.done, sched.date, sched.time, matchId]
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
                            a, b, w, sched.done, sched.date, sched.time]
                    );
                    matchId = ins.insertId;
                }

                await writeScore(conn, matchId, stype, w === a, adminId, null, t.sport_code);
                totalMatches++;
            }
            gauntletCount++;
        }

        // ── FREE-FOR-ALL ──
        if (t.format === 'free_for_all') {
            const [allResults] = await conn.query(
                `SELECT tr.department_id, tr.\`rank\`, d.short_name, d.name
           FROM tournament_results tr
           JOIN departments d ON d.id = tr.department_id
          WHERE tr.tournament_id = ?
          ORDER BY tr.\`rank\` ASC`, [t.id]
            );
            if (!allResults.length) { noResults.push({ id: t.id, name: t.tname }); continue; }

            const champion = allResults[0];
            const championName = champion.short_name || champion.name;
            const sched = FFA_SCHEDULE[t.sport_code] || { date: '2026-09-14', time: '09:00:00', done: '2026-09-14 10:00:00' };

            // ─── POPULATE ffa_results for EVERY ranking row ───
            //     This is what getFFAResults reads for the UI panel.
            await conn.query(`DELETE FROM ffa_results WHERE tournament_id = ?`, [t.id]);
            for (const r of allResults) {
                await conn.query(
                    `INSERT INTO ffa_results
             (tournament_id, department_id, result_value, rank_position, recorded_by)
           VALUES (?, ?, ?, ?, ?)`,
                    [t.id, r.department_id, r.rank, r.rank, adminId]
                );
                ffaResultRows++;
            }

            // Create / update the FFA event match
            const [exist] = await conn.query(
                `SELECT id FROM matches WHERE tournament_id = ? LIMIT 1`, [t.id]
            );
            let matchId;
            if (exist.length) {
                matchId = exist[0].id;
                await conn.query(
                    `UPDATE matches
              SET participant_a_department_id = ?,
                  winner_department_id = ?,
                  status = 'completed',
                  completed_at = ?,
                  scheduled_date = ?,
                  scheduled_time = ?,
                  bracket_side = 'ffa',
                  bracket_position = 'FFA Event'
            WHERE id = ?`,
                    [champion.department_id, champion.department_id, sched.done,
                    sched.date, sched.time, matchId]
                );
            } else {
                const [ins] = await conn.query(
                    `INSERT INTO matches
             (tournament_id, sport_id, round_number, match_number,
              bracket_position, bracket_side, status,
              participant_a_department_id, winner_department_id,
              completed_at, scheduled_date, scheduled_time)
           VALUES (?, ?, 1, 1, 'FFA Event', 'ffa', 'completed',
                   ?, ?, ?, ?, ?)`,
                    [t.id, t.sport_id, champion.department_id, champion.department_id,
                    sched.done, sched.date, sched.time]
                );
                matchId = ins.insertId;
            }

            await writeScore(conn, matchId, 'ffa', true, adminId, championName);
            totalMatches++;
            ffaCount++;
        }
    }

    console.log(`  ✅ ${gauntletCount} division_gauntlet tournament(s) × 13 slots = ${gauntletCount * 13} matches`);
    console.log(`  ✅ ${ffaCount} free_for_all event(s) → ${ffaResultRows} ffa_results rows written`);
    console.log(`  ✅ Total matches created/filled: ${totalMatches}`);
    if (noResults.length) {
        console.log(`  ⚠️  ${noResults.length} tournament(s) had NO official results:`);
        for (const t of noResults) console.log(`      id=${t.id}  ${t.name}`);
    }
}

// ────────────────────────────────────────────────────────────
// Rebuild department_scores
// ────────────────────────────────────────────────────────────
async function rebuildDepartmentScores(conn, festId) {
    await conn.query(`
    INSERT INTO department_scores (department_id, sport_fest_id, total_points, bonus_points)
    SELECT d.id, ?, 0, 0 FROM departments d WHERE d.is_active = 1
    ON DUPLICATE KEY UPDATE department_id = department_id
  `, [festId]);

    await conn.query(`
    UPDATE department_scores
       SET total_points=0, gold_medals=0, silver_medals=0, bronze_medals=0,
           total_participations=0, tournaments_entered=0
     WHERE sport_fest_id = ?
  `, [festId]);

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
        JOIN sport_fest_tournaments sft ON sft.tournament_id = t.id
       WHERE sft.sport_fest_id = ?
       GROUP BY tr.department_id
    ) x ON ds.department_id = x.department_id
    SET ds.total_points        = x.pts + COALESCE(ds.bonus_points, 0),
        ds.gold_medals         = x.g,
        ds.silver_medals       = x.s,
        ds.bronze_medals       = x.b,
        ds.total_participations= x.cnt,
        ds.tournaments_entered = x.cnt
  `, [festId]);

    await conn.query(`
    UPDATE department_scores ds
    JOIN (
      SELECT department_id, SUM(points) AS bonus
        FROM sport_fest_bonus_points
       WHERE sport_fest_id = ? GROUP BY department_id
    ) b ON ds.department_id = b.department_id
    SET ds.bonus_points = b.bonus,
        ds.total_points = ds.total_points + b.bonus
  `, [festId]);
}

// ────────────────────────────────────────────────────────────
// Sanity check
// ────────────────────────────────────────────────────────────
async function sanityCheck(conn) {
    console.log('\n🔎 Sanity check...');

    const [[orphans]] = await conn.query(`
    SELECT COUNT(*) AS n FROM tournaments t
     WHERE t.sport_fest_id = (SELECT id FROM sport_fest_events
                               WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.tournament_id = t.id)
  `);
    console.log(`  ${orphans.n === 0 ? '✅' : '⚠️ '} Tournaments with zero matches: ${orphans.n}`);

    const [[noScores]] = await conn.query(`
    SELECT COUNT(*) AS n FROM matches m
     WHERE m.winner_department_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM match_results mr WHERE mr.match_id = m.id)
  `);
    console.log(`  ${noScores.n === 0 ? '✅' : '⚠️ '} Completed matches missing scores: ${noScores.n}`);

    const [[noSchedule]] = await conn.query(`
    SELECT COUNT(*) AS n FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE t.sport_fest_id = (SELECT id FROM sport_fest_events
                               WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
       AND (m.scheduled_date IS NULL OR m.scheduled_time IS NULL)
  `);
    console.log(`  ${noSchedule.n === 0 ? '✅' : '⚠️ '} Matches without a schedule: ${noSchedule.n}`);

    // FFA check: every FFA tournament must have ffa_results for every participant
    const [ffaMissing] = await conn.query(`
    SELECT t.id, t.name, COUNT(DISTINCT fr.department_id) AS ffa_rows
      FROM tournaments t
      LEFT JOIN ffa_results fr ON fr.tournament_id = t.id
     WHERE t.format = 'free_for_all'
       AND t.sport_fest_id = (SELECT id FROM sport_fest_events
                               WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1)
     GROUP BY t.id
    HAVING ffa_rows < 2
  `);
    console.log(`  ${ffaMissing.length === 0 ? '✅' : '⚠️ '} FFA events with < 2 ffa_results rows: ${ffaMissing.length}`);
    for (const f of ffaMissing) console.log(`      id=${f.id}  ${f.name}  (rows: ${f.ffa_rows})`);
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
const run = async () => {
    let conn;
    try {
        const connectionOptions = buildConnectionOptions();
        const dbName = connectionOptions.database ||
            process.env.DB_NAME || process.env.MYSQLDATABASE || 'sportfest_db';

        console.log('🔧 Connecting to MySQL-compatible database...');
        console.log('  host:', connectionOptions.host || '(from URL)');
        console.log('  database:', dbName);
        console.log('  mode:', RESET_DATABASE ? 'FULL RESEED' : SEED_DATABASE ? 'SEED' : 'PRESERVE DATA');

        conn = await mysql.createConnection(connectionOptions);
        if (!connectionOptions.database) {
            await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
            await conn.query(`USE \`${dbName}\``);
        }
        console.log('✅ Connected\n');

        const hasSchema = await tableExists(conn, 'departments');
        if (RESET_DATABASE || !hasSchema) {
            const schemaPath = findFile(['schema.sql', 'sql/schema.sql']);
            if (!schemaPath) throw new Error('schema.sql not found');
            console.log('📦 Applying schema...');
            try { await conn.query(fs.readFileSync(schemaPath, 'utf8')); console.log('✅ Schema applied'); }
            catch (err) { console.warn('⚠️  schema.sql failed halfway:', err.message); }
            if (RESET_DATABASE) await hardWipeAllTables(conn);
        }

        await seedDefaultUsers(conn);

        if (hasSchema && !RESET_DATABASE && !SEED_DATABASE) {
            console.log('🛡️  Existing data preserved. Skipping full seed and generated results.');
            return;
        }

        const seedPath = findFile([
            'sgo_days_2026_COMPLETE_ALL.sql',
            'sql/sgo_days_2026_COMPLETE_ALL.sql',
            'artifacts/sgo_days_2026_COMPLETE_ALL.sql',
        ]);
        if (!seedPath) throw new Error('sgo_days_2026_COMPLETE_ALL.sql not found');
        await runSqlFile(conn, seedPath, 'SGO Days 2026 COMPLETE seed');

        await fillAll(conn);

        const [[fest]] = await conn.query(
            `SELECT id FROM sport_fest_events WHERE year=2026 AND name='High School SGO Days 2026' LIMIT 1`
        );
        await rebuildDepartmentScores(conn, fest.id);
        await sanityCheck(conn);

        // Summary
        const [[s]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM departments WHERE is_active = 1)                AS depts,
        (SELECT COUNT(*) FROM sports WHERE is_active = 1)                     AS sports,
        (SELECT COUNT(*) FROM tournaments)                                    AS tournaments,
        (SELECT COUNT(*) FROM tournaments WHERE format = 'division_gauntlet') AS gauntlet,
        (SELECT COUNT(*) FROM tournaments WHERE format = 'free_for_all')      AS ffa,
        (SELECT COUNT(*) FROM matches)                                        AS matches,
        (SELECT COUNT(*) FROM match_results)                                  AS match_results,
        (SELECT COUNT(*) FROM match_scores)                                   AS match_scores,
        (SELECT COUNT(*) FROM ffa_results)                                    AS ffa_results,
        (SELECT COUNT(*) FROM tournament_results)                             AS tournament_results
    `);
        console.log('\n📊 Database summary:');
        console.log(`   active departments:    ${s.depts}`);
        console.log(`   active sports:         ${s.sports}`);
        console.log(`   tournaments:           ${s.tournaments}`);
        console.log(`     • division_gauntlet: ${s.gauntlet}`);
        console.log(`     • free_for_all:      ${s.ffa}`);
        console.log(`   matches:               ${s.matches}`);
        console.log(`   match_results:         ${s.match_results}`);
        console.log(`   match_scores:          ${s.match_scores}`);
        console.log(`   ffa_results:           ${s.ffa_results}  ← feeds FFA panel`);
        console.log(`   tournament_results:    ${s.tournament_results}`);

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