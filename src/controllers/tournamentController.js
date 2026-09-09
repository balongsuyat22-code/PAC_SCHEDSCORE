const { pool } = require('../config/database');
const { getActiveSportFestId } = require('../utils/season');
const { recordResultsAndRebuild, DEFAULT_MEDAL_POINTS } = require('../utils/scoring');
const cache = require('../utils/cache');
const { emitToLeaderboard } = require('../utils/socketEmit');
const { generateBracket: generateBracketService } = require('../services/bracketService');
const { notifyRoles } = require('./notificationController');

function isTeamSport(row) {
    if (!row) return false;
    const cat = String(row.category || row.sport_category || '').toLowerCase();
    if (cat === 'team') return true;
    if (cat === 'individual') return false;
    if (Number(row.is_team_sport) === 1) return true;
    if (Number(row.is_team_sport) === 0) return false;
    const min = Number(row.min_players) || 0;
    const ts = Number(row.team_size) || 0;
    return min >= 2 || ts >= 2;
}

function requiredPlayers(row) {
    if (!row) return 1;
    const team = isTeamSport(row);
    const minP = Number(row.min_players) || 0;
    const teamSize = Number(row.team_size) || 0;
    if (!team) return minP > 0 ? minP : 1;
    return Math.max(minP, teamSize, 2);
}

function validatePointsMap(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const cleaned = {};
    for (const [rankStr, pts] of Object.entries(raw)) {
        const rank = parseInt(rankStr, 10);
        const points = Number(pts);
        if (!Number.isInteger(rank) || rank < 1) continue;
        if (!Number.isFinite(points) || points < 0) continue;
        cleaned[rank] = Math.round(points);
    }
    return Object.keys(cleaned).length ? cleaned : null;
}

async function getTournamentWithSport(tournamentId) {
    const [rows] = await pool.execute(
        `SELECT t.*,
            s.name AS sport_name,
            s.category AS sport_category,
            s.min_players AS sport_min_players,
            s.max_players AS sport_max_players,
            s.team_size AS sport_team_size,
            s.is_team_sport AS sport_is_team_sport,
            s.scoring_type,
            s.sets_to_win,
            s.icon AS sport_icon
     FROM tournaments t
     JOIN sports s ON s.id = t.sport_id
     WHERE t.id = ?
     LIMIT 1`,
        [tournamentId]
    );
    if (!rows.length) return null;
    const t = rows[0];
    return {
        ...t,
        category: t.category || t.sport_category,
        min_players: t.min_players != null ? t.min_players : t.sport_min_players,
        team_size: t.sport_team_size,
        is_team_sport: t.sport_is_team_sport,
    };
}

const getAll = async (req, res, next) => {
    try {
        const showAll = req.query.all === 'true';
        const sportFestId = showAll ? null : await getActiveSportFestId();

        let query = `
            SELECT t.*,
              s.name AS sport_name,
              s.category AS sport_category,
              s.icon AS sport_icon,
              s.is_team_sport,
              s.min_players AS sport_min_players,
              s.team_size,
              (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id) AS participant_count
       FROM tournaments t
       JOIN sports s ON s.id = t.sport_id
        `;
        const params = [];

        if (sportFestId) {
            query += ` WHERE EXISTS (SELECT 1 FROM sport_fest_tournaments sft WHERE sft.tournament_id = t.id AND sft.sport_fest_id = ?)`;
            params.push(sportFestId);
        }

        query += ` ORDER BY t.created_at DESC`;

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('getAll error:', err);
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const t = await getTournamentWithSport(req.params.id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const [participants] = await pool.execute(
            `SELECT tp.id,
              tp.tournament_id,
              tp.department_id,
              tp.seed,
              tp.status,
              tp.no_points,
              tp.created_at,
              tp.updated_at,
              d.name AS department_name,
              d.color AS department_color,
              d.logo_url AS department_logo,
              d.code AS department_code,
              d.division,
              d.is_exhibition
       FROM tournament_participants tp
       JOIN departments d ON d.id = tp.department_id
       WHERE tp.tournament_id = ?
       ORDER BY tp.seed IS NULL, tp.seed ASC, d.name ASC`,
            [req.params.id]
        );

        const deptIds = participants.map((p) => p.department_id);
        const playersByDept = {};
        if (deptIds.length) {
            const ph = deptIds.map(() => '?').join(',');
            const [players] = await pool.execute(
                `SELECT id, department_id, first_name, last_name, jersey_number, status, sport_id, position
         FROM players
         WHERE department_id IN (${ph}) AND sport_id = ?
         ORDER BY status = 'approved' DESC, last_name, first_name`,
                [...deptIds, t.sport_id]
            );
            players.forEach((p) => {
                if (!playersByDept[p.department_id]) playersByDept[p.department_id] = [];
                playersByDept[p.department_id].push(p);
            });
        }

        res.json({
            success: true,
            data: {
                ...t,
                is_team_sport: isTeamSport(t),
                required_players: requiredPlayers(t),
                participants: participants.map((p) => ({
                    ...p,
                    players: playersByDept[p.department_id] || [],
                })),
            },
        });
    } catch (err) {
        console.error('getOne error:', err);
        next(err);
    }
};

const getParticipants = async (req, res, next) => {
    try {
        const t = await getTournamentWithSport(req.params.id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const [rows] = await pool.execute(
            `SELECT tp.*,
              d.name AS department_name,
              d.color AS department_color,
              d.logo_url AS department_logo,
              d.code AS department_code,
              d.division,
              d.is_exhibition
       FROM tournament_participants tp
       JOIN departments d ON d.id = tp.department_id
       WHERE tp.tournament_id = ?
       ORDER BY tp.seed IS NULL, tp.seed ASC, d.name ASC`,
            [req.params.id]
        );

        const deptIds = rows.map((r) => r.department_id);
        const playersByDept = {};
        if (deptIds.length) {
            const ph = deptIds.map(() => '?').join(',');
            try {
                const [players] = await pool.execute(
                    `SELECT id, department_id, first_name, last_name, jersey_number, status
           FROM players
           WHERE department_id IN (${ph}) AND sport_id = ?
           ORDER BY last_name, first_name`,
                    [...deptIds, t.sport_id]
                );
                players.forEach((p) => {
                    if (!playersByDept[p.department_id]) playersByDept[p.department_id] = [];
                    playersByDept[p.department_id].push(p);
                });
            } catch (e) {
                console.warn('getParticipants players:', e.message);
            }
        }

        res.json({
            success: true,
            data: rows.map((r) => ({
                ...r,
                players: playersByDept[r.department_id] || [],
            })),
            meta: {
                is_team_sport: isTeamSport(t),
                required_players: requiredPlayers(t),
                sport_name: t.sport_name,
            },
        });
    } catch (err) {
        console.error('getParticipants error:', err);
        next(err);
    }
};

const getEligibility = async (req, res, next) => {
    try {
        const t = await getTournamentWithSport(req.params.id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const required = requiredPlayers(t);
        const teamGame = isTeamSport(t);

        const [already] = await pool.execute(
            `SELECT department_id FROM tournament_participants WHERE tournament_id = ?`,
            [req.params.id]
        );
        const alreadySet = new Set(already.map((r) => Number(r.department_id)));

        const [depts] = await pool.execute(
            `SELECT d.id AS department_id,
              d.name AS department_name,
              d.color AS department_color,
                            d.code AS department_code,
                            d.division,
                            d.is_exhibition
       FROM departments d
       WHERE d.is_active = 1
       ORDER BY d.name`
        );

        const [counts] = await pool.execute(
            `SELECT department_id, COUNT(*) AS approved_count
       FROM players
       WHERE sport_id = ? AND status = 'approved'
       GROUP BY department_id`,
            [t.sport_id]
        );
        const countMap = {};
        counts.forEach((r) => {
            countMap[r.department_id] = Number(r.approved_count);
        });

        const [players] = await pool.execute(
            `SELECT id, department_id, first_name, last_name, jersey_number, status
       FROM players
       WHERE sport_id = ?
       ORDER BY last_name, first_name`,
            [t.sport_id]
        );
        const playersByDept = {};
        players.forEach((p) => {
            if (!playersByDept[p.department_id]) playersByDept[p.department_id] = [];
            playersByDept[p.department_id].push(p);
        });

        const isExhibitionTournament = Number(t.is_exhibition) === 1;
        const data = depts.map((d) => {
            const approved_count = countMap[d.department_id] || 0;
            const already_added = alreadySet.has(Number(d.department_id));
            const noPointsByDepartment = Number(d.is_exhibition) === 1;
            const eligible = !already_added && (isExhibitionTournament || noPointsByDepartment || approved_count >= required);
            let reason = null;
            if (already_added) {
                reason = 'Already in this tournament';
            } else if (!isExhibitionTournament && !noPointsByDepartment && approved_count < required) {
                reason = teamGame
                    ? `Team sport needs at least ${required} approved players (has ${approved_count})`
                    : `Needs at least ${required} approved player(s) (has ${approved_count})`;
            }

            return {
                department_id: d.department_id,
                department_name: d.department_name,
                department_color: d.department_color,
                department_code: d.department_code,
                division: d.division,
                is_exhibition: Number(d.is_exhibition) === 1,
                no_points: noPointsByDepartment,
                team_name: null,
                approved_count,
                required,
                is_team_sport: teamGame,
                sport_name: t.sport_name,
                already_added,
                eligible,
                reason,
                players: playersByDept[d.department_id] || [],
            };
        });

        res.json({
            success: true,
            data,
            meta: {
                sport_id: t.sport_id,
                sport_name: t.sport_name,
                is_team_sport: teamGame,
                required_players: required,
                min_players: t.min_players,
                team_size: t.team_size,
                category: t.category,
                is_exhibition: isExhibitionTournament,
            },
        });
    } catch (err) {
        console.error('getEligibility error:', err);
        next(err);
    }
};

const addParticipants = async (req, res, next) => {
    try {
        const tournamentId = req.params.id;
        const requestedParticipants = Array.isArray(req.body.participants) ? req.body.participants : null;
        let departmentIds = requestedParticipants
            ? requestedParticipants.map((p) => p.department_id)
            : (req.body.department_ids || req.body.departments || []);
        if (!Array.isArray(departmentIds)) departmentIds = [departmentIds];
        departmentIds = [
            ...new Set(departmentIds.map((id) => parseInt(id, 10)).filter((id) => id > 0)),
        ];

        if (!departmentIds.length) {
            return res.status(400).json({ success: false, message: 'Select at least one department' });
        }

        const t = await getTournamentWithSport(tournamentId);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        if (!['draft', 'registration'].includes(t.status)) {
            return res.status(400).json({
                success: false,
                message: 'Participants can only be added while the tournament is in draft or registration',
            });
        }

        const required = requiredPlayers(t);
        const teamGame = isTeamSport(t);

        const [existing] = await pool.execute(
            `SELECT department_id FROM tournament_participants WHERE tournament_id = ?`,
            [tournamentId]
        );
        const existingSet = new Set(existing.map((r) => Number(r.department_id)));

        const rejected = [];
        const toInsert = [];
        const noPointsByDepartment = new Map(
            (requestedParticipants || []).map((p) => [parseInt(p.department_id, 10), p.no_points === true || p.no_points === 1 || p.no_points === '1'])
        );

        for (const deptId of departmentIds) {
            if (existingSet.has(deptId)) {
                rejected.push({ department_id: deptId, reason: 'Already in this tournament' });
                continue;
            }

            const [deptRows] = await pool.execute('SELECT is_exhibition FROM departments WHERE id = ? AND is_active = 1', [deptId]);
            if (!deptRows.length) {
                rejected.push({ department_id: deptId, reason: 'Department not found or inactive' });
                continue;
            }
            const noPoints = Number(deptRows[0].is_exhibition) === 1 || noPointsByDepartment.get(deptId) === true;

            if (noPoints || Number(t.is_exhibition) === 1) {
                toInsert.push({ id: deptId, noPoints: true });
                continue;
            }

            const [cntRows] = await pool.execute(
                `SELECT COUNT(*) AS c FROM players
         WHERE department_id = ? AND sport_id = ? AND status = 'approved'`,
                [deptId, t.sport_id]
            );
            const approved = Number(cntRows[0]?.c || 0);

            if (approved < required) {
                rejected.push({
                    department_id: deptId,
                    reason: teamGame
                        ? `Team sport requires at least ${required} approved players (has ${approved})`
                        : `Requires at least ${required} approved player(s) (has ${approved})`,
                });
                continue;
            }

            toInsert.push({ id: deptId, noPoints: false });
        }

        if (!toInsert.length) {
            return res.status(400).json({
                success: false,
                message: rejected[0]?.reason || 'No eligible departments to add',
                rejected,
            });
        }

        const added = [];
        for (const participant of toInsert) {
            try {
                await pool.execute(
                    `INSERT INTO tournament_participants (tournament_id, department_id, status, no_points, created_at)
           VALUES (?, ?, 'active', ?, NOW())`,
                    [tournamentId, participant.id, participant.noPoints ? 1 : 0]
                );
                added.push(participant.id);
                existingSet.add(participant.id);
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') {
                    rejected.push({ department_id: participant.id, reason: 'Already in this tournament' });
                } else {
                    throw e;
                }
            }
        }

        res.json({
            success: true,
            message:
                `Added ${added.length} department(s)` +
                (rejected.length ? `; ${rejected.length} skipped` : ''),
            added,
            rejected,
            meta: { required_players: required, is_team_sport: teamGame },
        });
    } catch (err) {
        console.error('addParticipants error:', err);
        next(err);
    }
};

const getBracket = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT m.id, m.tournament_id, m.sport_id, m.round_number, m.match_number,
        m.bracket_position, m.bracket_side,
        m.participant_a_department_id, m.participant_b_department_id,
        m.winner_department_id, m.status, m.scheduled_date, m.scheduled_time,
        m.venue_id, m.referee_id, m.started_at, m.completed_at,
        m.created_at, m.updated_at,
        da.name AS dept_a_name, da.color AS dept_a_color,
        db.name AS dept_b_name, db.color AS dept_b_color,
        v.name AS venue_name,
        mr.total_score_a, mr.total_score_b, mr.final_score_display
        FROM matches m
        LEFT JOIN departments da ON da.id = m.participant_a_department_id
        LEFT JOIN departments db ON db.id = m.participant_b_department_id
        LEFT JOIN venues v ON v.id = m.venue_id
        LEFT JOIN match_results mr ON mr.match_id = m.id
        WHERE m.tournament_id = ?
        ORDER BY m.round_number ASC, m.match_number ASC, m.id ASC`,
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('getBracket error:', err);
        next(err);
    }
};

const create = async (req, res, next) => {
    try {
        const {
            name,
            sport_id,
            sport_fest_id,
            format = 'single_elimination',
            gender = 'open',
            status = 'draft',
            max_participants = 0,
            start_date,
            end_date,
            description,
            ffa_scoring,
            group_count,
            advance_per_group,
            min_players,
            category,
            is_exhibition,
        } = req.body;

        if (!name || !sport_id) {
            return res.status(400).json({ success: false, message: 'name and sport_id are required' });
        }

        let festId = sport_fest_id ? parseInt(sport_fest_id, 10) : null;
        if (!festId) {
            festId = await getActiveSportFestId();
        }
        if (!festId) {
            return res.status(400).json({
                success: false,
                message: 'No active sport fest found. Create / activate a sport fest first, or pass sport_fest_id.',
            });
        }

        const [sports] = await pool.execute(
            `SELECT * FROM sports WHERE id = ? LIMIT 1`,
            [sport_id]
        );
        if (!sports.length) {
            return res.status(400).json({ success: false, message: 'Sport not found' });
        }
        const sport = sports[0];
        const team = isTeamSport({
            category: category || sport.category,
            is_team_sport: sport.is_team_sport,
            min_players: sport.min_players,
            team_size: sport.team_size,
        });
        let effectiveMin = min_players != null ? parseInt(min_players, 10) : sport.min_players;
        if (team) effectiveMin = Math.max(effectiveMin || 0, sport.team_size || 0, 2);
        else effectiveMin = effectiveMin > 0 ? effectiveMin : 1;

        const effectiveCategory = category || sport.category || (team ? 'team' : 'individual');

        const [result] = await pool.execute(
            `INSERT INTO tournaments
                (name, sport_id, sport_fest_id, format, gender, status, max_participants,
                 start_date, end_date, description, created_by, ffa_scoring,
                 group_count, advance_per_group, min_players, category, is_exhibition)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                sport_id,
                festId,
                format,
                gender || 'open',
                status || 'draft',
                max_participants || 0,
                start_date || null,
                end_date || null,
                description || null,
                req.user?.id || null,
                ffa_scoring || null,
                group_count || null,
                advance_per_group || null,
                effectiveMin,
                effectiveCategory,
                is_exhibition === true || is_exhibition === 1 || is_exhibition === '1' || is_exhibition === 'true' ? 1 : 0,
            ]
        );

        const tournamentId = result.insertId;

        await pool.execute(
            `INSERT IGNORE INTO sport_fest_tournaments (tournament_id, sport_fest_id)
             VALUES (?, ?)`,
            [tournamentId, festId]
        );

        await notifyRoles(['admin', 'sgo_president', 'dean_adviser', 'sgo_officer'], {
            type: 'tournament', severity: 'info', title: 'Tournament created',
            message: `${name} was created for the current Sport Fest.`,
            link: '/president/game-setup', entity_type: 'tournament', entity_id: tournamentId,
            created_by: req.user?.id || null,
        });

        res.status(201).json({
            success: true,
            message: 'Tournament created',
            data: { id: tournamentId },
        });
    } catch (err) {
        console.error('create error:', err);
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const id = req.params.id;
        const t = await getTournamentWithSport(id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const {
            name,
            format,
            gender,
            status,
            max_participants,
            start_date,
            end_date,
            description,
            ffa_scoring,
            group_count,
            advance_per_group,
            min_players,
            category,
            is_exhibition,
        } = req.body;

        let effectiveMin = min_players !== undefined ? parseInt(min_players, 10) : t.min_players;
        const effectiveCategory = category !== undefined ? category : t.category;
        if (isTeamSport({ ...t, category: effectiveCategory, min_players: effectiveMin })) {
            effectiveMin = Math.max(effectiveMin || 0, t.team_size || 0, 2);
        }

        await pool.execute(
            `UPDATE tournaments SET
        name = COALESCE(?, name),
        format = COALESCE(?, format),
        gender = COALESCE(?, gender),
        status = COALESCE(?, status),
        max_participants = COALESCE(?, max_participants),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        description = COALESCE(?, description),
        ffa_scoring = COALESCE(?, ffa_scoring),
        group_count = COALESCE(?, group_count),
        advance_per_group = COALESCE(?, advance_per_group),
        min_players = COALESCE(?, min_players),
        category = COALESCE(?, category),
        is_exhibition = COALESCE(?, is_exhibition),
        updated_at = NOW()
       WHERE id = ?`,
            [
                name ?? null,
                format ?? null,
                gender ?? null,
                status ?? null,
                max_participants ?? null,
                start_date ?? null,
                end_date ?? null,
                description ?? null,
                ffa_scoring ?? null,
                group_count ?? null,
                advance_per_group ?? null,
                effectiveMin ?? null,
                effectiveCategory ?? null,
                is_exhibition === undefined ? null : (is_exhibition === true || is_exhibition === 1 || is_exhibition === '1' || is_exhibition === 'true' ? 1 : 0),
                id,
            ]
        );

        if (is_exhibition !== undefined && Number(t.is_exhibition) !== (is_exhibition === true || is_exhibition === 1 || is_exhibition === '1' || is_exhibition === 'true' ? 1 : 0)) {
            const [[resultCount]] = await pool.execute(
                'SELECT COUNT(*) AS count FROM tournament_results WHERE tournament_id = ?',
                [id]
            );
            if (Number(resultCount.count) > 0) await recordResultsAndRebuild(pool, id);
            else await rebuildDepartmentScores(pool);
        }

        res.json({ success: true, message: 'Tournament updated' });
    } catch (err) {
        console.error('update error:', err);
        next(err);
    }
};

/**
 * DELETE /tournaments/:id
 * Allowed only when NO match has started (ongoing/completed).
 * Cascades related rows safely inside a transaction.
 */
const remove = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Invalid tournament id' });
        }

        const t = await getTournamentWithSport(id);
        if (!t) {
            conn.release();
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        if (t.status === 'completed') {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a finalized tournament. Finalized results are locked.',
            });
        }

        // Block if any match has actually started or finished
        const [started] = await pool.execute(
            `SELECT COUNT(*) AS c FROM matches
             WHERE tournament_id = ?
               AND status IN ('ongoing', 'completed', 'in_progress')`,
            [id]
        );
        const startedCount = Number(started[0]?.c || 0);
        if (startedCount > 0) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: `Cannot delete — ${startedCount} match(es) have already started or been completed.`,
            });
        }

        await conn.beginTransaction();

        // Match IDs for this tournament (scheduled / pending only at this point)
        const [matchRows] = await conn.execute(
            `SELECT id FROM matches WHERE tournament_id = ?`,
            [id]
        );
        const matchIds = matchRows.map((r) => r.id);

        if (matchIds.length) {
            const ph = matchIds.map(() => '?').join(',');

            // Child tables that may reference matches — ignore if table missing
            const childDeletes = [
                `DELETE FROM match_results WHERE match_id IN (${ph})`,
                `DELETE FROM match_set_scores WHERE match_id IN (${ph})`,
                `DELETE FROM match_events WHERE match_id IN (${ph})`,
                `DELETE FROM match_period_scores WHERE match_id IN (${ph})`,
                `DELETE FROM ffa_results WHERE match_id IN (${ph})`,
            ];
            for (const sql of childDeletes) {
                try {
                    await conn.execute(sql, matchIds);
                } catch (e) {
                    // Unknown table / column — skip (schema variants)
                    if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR') {
                        throw e;
                    }
                }
            }

            await conn.execute(`DELETE FROM matches WHERE tournament_id = ?`, [id]);
        }

        // Tournament-level related rows
        const tournamentChildDeletes = [
            `DELETE FROM tournament_participants WHERE tournament_id = ?`,
            `DELETE FROM sport_fest_tournaments WHERE tournament_id = ?`,
            `DELETE FROM round_robin_standings WHERE tournament_id = ?`,
            `DELETE FROM tournament_standings WHERE tournament_id = ?`,
            `DELETE FROM ffa_results WHERE tournament_id = ?`,
            `DELETE FROM tournament_results WHERE tournament_id = ?`,
        ];
        for (const sql of tournamentChildDeletes) {
            try {
                await conn.execute(sql, [id]);
            } catch (e) {
                if (e.code !== 'ER_NO_SUCH_TABLE' && e.code !== 'ER_BAD_FIELD_ERROR') {
                    throw e;
                }
            }
        }

        const [del] = await conn.execute(`DELETE FROM tournaments WHERE id = ?`, [id]);
        if (!del.affectedRows) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        await conn.commit();

        await notifyRoles(['admin', 'sgo_president', 'dean_adviser', 'sgo_officer'], {
            type: 'tournament', severity: 'success', title: 'Tournament finalized',
            message: `${t.name} was finalized and ${recorded} result(s) were recorded.`,
            link: `/president/tournament-export?tournament_id=${req.params.id}`,
            entity_type: 'tournament', entity_id: req.params.id, created_by: req.user?.id || null,
        });

        cache.clearPrefix('leaderboard:');

        res.json({
            success: true,
            message: `Tournament "${t.name}" deleted.`,
            data: {
                id,
                matches_removed: matchIds.length,
            },
        });
    } catch (err) {
        try { await conn.rollback(); } catch (_) { }
        console.error('remove tournament error:', err);
        next(err);
    } finally {
        conn.release();
    }
};

const generateBracket = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const t = await getTournamentWithSport(req.params.id);
        if (!t) {
            conn.release();
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const [participants] = await pool.execute(
            `SELECT tp.department_id, d.is_exhibition
             FROM tournament_participants tp
             JOIN departments d ON d.id = tp.department_id
             WHERE tp.tournament_id = ?
             ORDER BY tp.seed IS NULL, tp.seed ASC, tp.id ASC`,
            [req.params.id]
        );
        if (participants.length < 2) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'Need at least 2 participants to generate a bracket',
            });
        }

        await conn.beginTransaction();

        const [claim] = await conn.execute(
            `UPDATE tournaments SET status = 'ongoing', updated_at = NOW()
             WHERE id = ? AND status IN ('draft', 'registration')`,
            [req.params.id]
        );
        if (claim.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(409).json({
                success: false,
                message: 'Bracket can only be generated in draft or registration — it looks like this already happened.',
            });
        }

        await conn.execute(`DELETE FROM matches WHERE tournament_id = ?`, [req.params.id]);

        const depts = participants.map((p) => p.department_id);
        const exhibitionDepts = participants
            .filter((p) => Number(p.is_exhibition) === 1)
            .map((p) => p.department_id);
        const format = t.format || 'single_elimination';
        let created = 0;

        if (format === 'round_robin') {

            await conn.execute(`DELETE FROM round_robin_standings WHERE tournament_id = ?`, [req.params.id]);
            for (const deptId of depts) {
                await conn.execute(
                    `INSERT INTO round_robin_standings
                     (tournament_id, department_id, wins, losses, draws, matches_played, standing_points, points_for, points_against)
                     VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0)`,
                    [req.params.id, deptId]
                );
            }

            let matchNumber = 1;
            for (let i = 0; i < depts.length; i++) {
                for (let j = i + 1; j < depts.length; j++) {
                    await conn.execute(
                        `INSERT INTO matches
              (tournament_id, sport_id, round_number, match_number,
               participant_a_department_id, participant_b_department_id, status)
             VALUES (?, ?, 1, ?, ?, ?, 'scheduled')`,
                        [req.params.id, t.sport_id, matchNumber++, depts[i], depts[j]]
                    );
                    created++;
                }
            }
        } else if (format === 'free_for_all') {
            await conn.execute(
                `INSERT INTO matches
          (tournament_id, sport_id, round_number, match_number, status)
         VALUES (?, ?, 1, 1, 'scheduled')`,
                [req.params.id, t.sport_id]
            );
            created = 1;
        } else {

            const competitiveParticipants = participants.filter((p) => Number(p.is_exhibition) !== 1);

            if (competitiveParticipants.length < 2 && exhibitionDepts.length) {
                await conn.rollback();
                conn.release();
                return res.status(400).json({
                    success: false,
                    message: 'An exhibition team needs at least two competing departments for its qualifying bracket.',
                });
            }

            await generateBracketService(t, competitiveParticipants, conn);
            const [[matchCount]] = await conn.execute(
                'SELECT COUNT(*) AS count FROM matches WHERE tournament_id = ?',
                [req.params.id]
            );
            created = Number(matchCount.count || 0);

            const [lastMatch] = await conn.execute(
                'SELECT COALESCE(MAX(match_number), 0) AS match_number FROM matches WHERE tournament_id = ?',
                [req.params.id]
            );
            let matchNumber = Number(lastMatch[0]?.match_number || 0) + 1;
            for (const [exhibitionIndex, exhibitionDeptId] of exhibitionDepts.entries()) {
                const exhibitionOpponent = competitiveParticipants[exhibitionIndex % competitiveParticipants.length];
                await conn.execute(
                    `INSERT INTO matches
              (tournament_id, sport_id, round_number, match_number, bracket_position, bracket_side,
               participant_a_department_id, participant_b_department_id, status)
             VALUES (?, ?, 0, ?, ?, 'exhibition', ?, ?, 'scheduled')`,
                    [
                        req.params.id,
                        t.sport_id,
                        matchNumber++,
                        `EXHIBITION-${exhibitionDeptId}`,
                        exhibitionDeptId,
                        exhibitionOpponent.department_id,
                    ]
                );
                created++;
            }
        }

        await conn.commit();

        res.json({
            success: true,
            message: `Bracket generated (${created} match(es))`,
            data: { matches_created: created },
        });
    } catch (err) {
        await conn.rollback();
        console.error('generateBracket error:', err);
        next(err);
    } finally {
        conn.release();
    }
};

const promoteKnockout = async (req, res, next) => {
    try {
        res.status(501).json({
            success: false,
            message: 'Group-stage promote-knockout is not implemented for this schema yet.',
        });
    } catch (err) {
        next(err);
    }
};

const AUTO_SCHEDULE_FORMATS = new Set([
    'round_robin',
    'single_elimination',
    'double_elimination',
]);

const scheduleRoundRobin = async (req, res, next) => {
    try {
        const t = await getTournamentWithSport(req.params.id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }
        const format = (t.format || '').trim();
        if (!AUTO_SCHEDULE_FORMATS.has(format)) {
            return res.status(400).json({
                success: false,
                message: `Auto-schedule supports round robin, single elimination, and double elimination (got "${format || 'none'}").`,
            });
        }

        const dates = Array.isArray(req.body.dates) ? req.body.dates.filter(Boolean) : [];
        const times = Array.isArray(req.body.times) ? req.body.times.filter(Boolean) : [];
        const venueId = req.body.venue_id ? parseInt(req.body.venue_id, 10) : null;
        const assignOfficers = req.body.assign_officers !== false;

        if (!dates.length || !times.length) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least one date and one time slot',
            });
        }

        const [allMatches] = await pool.execute(
            `SELECT id, status, round_number, match_number, bracket_side, bracket_position,
                    participant_a_department_id, participant_b_department_id
             FROM matches
             WHERE tournament_id = ?
             ORDER BY
               COALESCE(round_number, 0) ASC,
               CASE
                 WHEN bracket_side = 'lower' THEN 1
                 WHEN bracket_side = 'grand_final' THEN 2
                 ELSE 0
               END ASC,
               COALESCE(match_number, 0) ASC,
               id ASC`,
            [req.params.id]
        );
        if (!allMatches.length) {
            return res.status(400).json({
                success: false,
                message: 'No matches found. Generate the bracket first.',
            });
        }

        const requiredSlots = allMatches.length;
        const matches = allMatches.filter((m) =>
            ['pending', 'scheduled'].includes(m.status) &&
            (m.bracket_side === 'ffa' ||
                (m.participant_a_department_id && m.participant_b_department_id))
        );
        const locked = allMatches.length - matches.length;
        if (!matches.length) {
            return res.status(400).json({
                success: false,
                message: 'All matches in this tournament are already in progress or completed — nothing left to schedule.',
            });
        }

        const sortedDates = [...dates].sort();
        const sortedTimes = [...times].sort();
        const slots = [];
        for (const d of sortedDates) {
            for (const tm of sortedTimes) {
                slots.push({ date: d, time: tm });
            }
        }

        let ordered = [...matches];
        if (format === 'round_robin') {
            for (let i = ordered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
            }
        }

        let officers = [];
        const officerBusy = new Set();
        if (assignOfficers) {
            const [officerRows] = await pool.execute(
                `SELECT id FROM users WHERE role = 'sgo_officer' AND is_active = 1`
            );
            officers = officerRows.map((r) => r.id);

            if (officers.length) {
                const [existingAssignments] = await pool.execute(
                    `SELECT referee_id, scheduled_date, scheduled_time
                     FROM matches
                     WHERE referee_id IS NOT NULL
                       AND status IN ('scheduled','ongoing')
                       AND scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL`
                );
                existingAssignments.forEach((r) => {
                    officerBusy.add(`${r.referee_id}|${r.scheduled_date}|${r.scheduled_time}`);
                });
            }
        }

        const pickOfficer = (date, time) => {
            if (!officers.length) return null;
            const shuffled = [...officers].sort(() => Math.random() - 0.5);
            for (const officerId of shuffled) {
                const key = `${officerId}|${date}|${time}`;
                if (!officerBusy.has(key)) {
                    officerBusy.add(key);
                    return officerId;
                }
            }
            return null;
        };

        let updated = 0;
        let officersAssigned = 0;
        for (let i = 0; i < ordered.length; i++) {
            const slot = slots[i % slots.length];
            const referee_id = assignOfficers ? pickOfficer(slot.date, slot.time) : null;
            if (referee_id) officersAssigned++;

            await pool.execute(
                `UPDATE matches
                 SET scheduled_date = ?, scheduled_time = ?, venue_id = COALESCE(?, venue_id),
                     referee_id = COALESCE(?, referee_id), updated_at = NOW()
                 WHERE id = ?`,
                [slot.date, slot.time, venueId, referee_id, ordered[i].id]
            );
            updated++;
        }

        const formatLabel = format.replace(/_/g, ' ');
        res.json({
            success: true,
            message:
                `Scheduled ${updated} ${formatLabel} match(es) across ${slots.length} slot(s)` +
                (assignOfficers ? `, ${officersAssigned} officer(s) auto-assigned` : '') +
                (locked ? `; ${locked} locked match(es) left untouched` : ''),
            data: {
                updated,
                slots: slots.length,
                required_slots: requiredSlots,
                officers_assigned: officersAssigned,
                skipped_locked: locked,
                format,
            },
        });
    } catch (err) {
        console.error('scheduleRoundRobin error:', err);
        next(err);
    }
};

const getPointsConfig = async (req, res, next) => {
    try {
        const [[t]] = await pool.execute(
            'SELECT points_config FROM tournaments WHERE id = ?',
            [req.params.id]
        );
        if (!t) return res.status(404).json({ success: false, message: 'Tournament not found' });

        let map = DEFAULT_MEDAL_POINTS;
        if (t.points_config) {
            try {
                const parsed = typeof t.points_config === 'string' ? JSON.parse(t.points_config) : t.points_config;
                if (parsed && Object.keys(parsed).length) map = parsed;
            } catch { }
        }
        return res.json({ success: true, data: { points_map: map } });
    } catch (err) {
        next(err);
    }
};

const finalizeTournament = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const t = await getTournamentWithSport(req.params.id);
        if (!t) {
            conn.release();
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const [open] = await pool.execute(
            `SELECT COUNT(*) AS c FROM matches
       WHERE tournament_id = ?
         AND status NOT IN ('completed', 'cancelled', 'walkover')
         AND (bracket_side = 'ffa'
              OR (participant_a_department_id IS NOT NULL
                  AND participant_b_department_id IS NOT NULL))`,
            [req.params.id]
        );
        if (Number(open[0]?.c || 0) > 0) {
            conn.release();
            return res.status(400).json({
                success: false,
                message: 'All matches must be completed (or cancelled) before finalizing',
            });
        }

        const requestedMap = validatePointsMap(req.body?.points_map);
        let savedMap = null;
        if (!requestedMap && t.points_config) {
            try {
                savedMap = typeof t.points_config === 'string' ? JSON.parse(t.points_config) : t.points_config;
            } catch { savedMap = null; }
        }
        const pointsMap = requestedMap || savedMap || DEFAULT_MEDAL_POINTS;

        await conn.beginTransaction();

        const [claim] = await conn.execute(
            `UPDATE tournaments SET status = 'completed', points_config = ?, updated_at = NOW()
             WHERE id = ? AND status != 'completed'`,
            [JSON.stringify(pointsMap), req.params.id]
        );
        if (claim.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(409).json({ success: false, message: 'This tournament was already finalized.' });
        }

        const { recorded } = await recordResultsAndRebuild(conn, req.params.id, pointsMap);

        await conn.commit();

        cache.clearPrefix('leaderboard:');
        emitToLeaderboard('leaderboard:changed', {
            reason: 'tournament_finalized',
            tournament_id: Number(req.params.id),
        });

        res.json({
            success: true,
            message: recorded
                ? `Tournament finalized — ${recorded} department result(s) recorded.`
                : 'Tournament finalized (no standings could be determined — check the bracket/results were entered).',
            data: { id: req.params.id, status: 'completed', results_recorded: recorded, points_map: pointsMap },
        });
    } catch (err) {
        await conn.rollback();
        console.error('finalizeTournament error:', err);
        next(err);
    } finally {
        conn.release();
    }
};

const removeParticipant = async (req, res, next) => {
    try {
        const { id, departmentId } = req.params;
        const t = await getTournamentWithSport(id);
        if (!t) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }
        if (!['draft', 'registration'].includes(t.status)) {
            return res.status(400).json({
                success: false,
                message: 'Participants can only be removed in draft or registration',
            });
        }

        const [result] = await pool.execute(
            `DELETE FROM tournament_participants WHERE tournament_id = ? AND department_id = ?`,
            [id, departmentId]
        );

        res.json({
            success: true,
            message: result.affectedRows ? 'Participant removed' : 'Participant not found',
        });
    } catch (err) {
        console.error('removeParticipant error:', err);
        next(err);
    }
};

module.exports = {
    getAll,
    getOne,
    getParticipants,
    getEligibility,
    addParticipants,
    removeParticipant,
    getBracket,
    create,
    update,
    remove,
    generateBracket,
    promoteKnockout,
    scheduleRoundRobin,
    getPointsConfig,
    finalizeTournament,
    isTeamSport,
    requiredPlayers,
};