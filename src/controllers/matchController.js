const { pool } = require('../config/database');
const { progressBracket } = require('../services/matchService');
const { logActivity } = require('../utils/logger');
const { getActiveSportFestId } = require('../utils/season');
const {
    emitToMatch,
    emitToTournament,
    emitToLeaderboard,
    emitToAll,
    getMatchWatchers,
} = require('../utils/socketEmit');
const { createNotification, notifyRoles } = require('./notificationController');

const safeFK = (val) => { const n = parseInt(val); return Number.isInteger(n) && n > 0 ? n : null; };
const safeDate = (val) => { if (!val) return null; return String(val).split('T')[0]; };

const canReschedule = (status) => ['pending', 'scheduled'].includes(status);
const canStart = (status) => ['pending', 'scheduled'].includes(status);
const canScore = (status) => ['ongoing', 'completed'].includes(status);
const canComplete = (status) => status === 'ongoing';

/** Load names for notification messages */
async function loadMatchLabel(matchId) {
    const [rows] = await pool.execute(
        `SELECT m.id, m.participant_a_department_id, m.participant_b_department_id,
                m.referee_id, m.tournament_id, m.scheduled_date, m.scheduled_time,
                da.name AS dept_a_name, db.name AS dept_b_name,
                s.name AS sport_name, t.name AS tournament_name, t.format AS tournament_format
         FROM matches m
         LEFT JOIN departments da ON m.participant_a_department_id = da.id
         LEFT JOIN departments db ON m.participant_b_department_id = db.id
         LEFT JOIN sports s ON m.sport_id = s.id
         LEFT JOIN tournaments t ON m.tournament_id = t.id
         WHERE m.id = ?`,
        [matchId]
    );
    return rows[0] || null;
}

function matchupFromRow(m) {
    if (!m) return 'Match';
    const f = (m.tournament_format || '').toLowerCase();
    if (f === 'free_for_all' || f === 'team_ranking') {
        return m.tournament_name || m.sport_name || 'FFA Event';
    }
    const a = m.dept_a_name || 'Side A';
    const b = m.dept_b_name || 'Side B';
    return `${a} vs ${b}`;
}

/**
 * Fire notifications for match lifecycle events.
 * Never throws — failures are logged only.
 */
async function notifyMatchEvent(kind, matchId, extra = {}, createdBy = null) {
    try {
        const m = await loadMatchLabel(matchId);
        if (!m) return;
        const label = matchupFromRow(m);
        const sport = m.sport_name ? ` (${m.sport_name})` : '';

        if (kind === 'scheduled') {
            const when = [extra.scheduled_date, extra.scheduled_time].filter(Boolean).join(' ');
            const msg = `${label}${sport} scheduled${when ? ` for ${when}` : ''}.`;
            const depts = [m.participant_a_department_id, m.participant_b_department_id].filter(Boolean);
            for (const department_id of depts) {
                await createNotification({
                    department_id,
                    type: 'schedule',
                    severity: 'info',
                    title: 'Match scheduled',
                    message: msg,
                    link: '/dean/schedule',
                    entity_type: 'match',
                    entity_id: matchId,
                    created_by: createdBy,
                });
            }
            if (extra.referee_id) {
                await createNotification({
                    user_id: extra.referee_id,
                    type: 'schedule',
                    severity: 'info',
                    title: 'You were assigned a match',
                    message: msg,
                    link: '/referee/scoring.html',
                    entity_type: 'match',
                    entity_id: matchId,
                    created_by: createdBy,
                });
            }
            await createNotification({
                role: 'sgo_president',
                type: 'schedule',
                severity: 'info',
                title: 'Match scheduled',
                message: msg,
                link: '/president/schedule.html',
                entity_type: 'match',
                entity_id: matchId,
                created_by: createdBy,
            });
            await createNotification({
                role: 'admin', type: 'schedule', severity: 'info', title: 'Match scheduled',
                message: msg, link: '/admin/schedule', entity_type: 'match', entity_id: matchId,
                created_by: createdBy,
            });
            return;
        }

        if (kind === 'started') {
            const msg = `${label}${sport} is now live.`;
            await createNotification({
                role: 'sgo_president',
                type: 'score',
                severity: 'live',
                title: 'Match started',
                message: msg,
                link: '/president/live-scores.html',
                entity_type: 'match',
                entity_id: matchId,
                created_by: createdBy,
            });
            await notifyRoles(['admin', 'dean_adviser'], {
                type: 'score', severity: 'live', title: 'Match started', message: msg,
                link: '/admin/live', entity_type: 'match', entity_id: matchId, created_by: createdBy,
            });
            for (const department_id of [m.participant_a_department_id, m.participant_b_department_id].filter(Boolean)) {
                await createNotification({
                    department_id,
                    type: 'score',
                    severity: 'live',
                    title: 'Your match is live',
                    message: msg,
                    link: '/dean/live',
                    entity_type: 'match',
                    entity_id: matchId,
                    created_by: createdBy,
                });
            }
            return;
        }

        if (kind === 'completed') {
            const score = extra.final_score_display ? ` — ${extra.final_score_display}` : '';
            const msg = `${label}${sport} finished${score}.`;
            await createNotification({
                role: 'sgo_president',
                type: 'result',
                severity: 'success',
                title: 'Match completed',
                message: msg,
                link: '/president/live-scores.html',
                entity_type: 'match',
                entity_id: matchId,
                created_by: createdBy,
            });
            await notifyRoles(['admin', 'dean_adviser'], {
                type: 'result', severity: 'success', title: 'Match completed', message: msg,
                link: '/admin/matches', entity_type: 'match', entity_id: matchId, created_by: createdBy,
            });
            for (const department_id of [m.participant_a_department_id, m.participant_b_department_id].filter(Boolean)) {
                await createNotification({
                    department_id,
                    type: 'result',
                    severity: 'success',
                    title: 'Match result recorded',
                    message: msg,
                    link: '/dean/matches',
                    entity_type: 'match',
                    entity_id: matchId,
                    created_by: createdBy,
                });
            }
            return;
        }

        if (kind === 'ffa_completed') {
            const msg = `${label}${sport} FFA event completed.`;
            await createNotification({
                role: 'sgo_president',
                type: 'result',
                severity: 'success',
                title: 'FFA event completed',
                message: msg,
                link: '/president/live-scores.html',
                entity_type: 'match',
                entity_id: matchId,
                created_by: createdBy,
            });
            await createNotification({
                role: 'dean_adviser',
                type: 'result',
                severity: 'success',
                title: 'FFA event completed',
                message: msg,
                link: '/dean/matches',
                entity_type: 'match',
                entity_id: matchId,
                created_by: createdBy,
            });
        }
    } catch (err) {
        console.error('[notifyMatchEvent]', err.message);
    }
}



const getMatchStatus = async (matchId) => {
    const [[row]] = await pool.execute('SELECT status FROM matches WHERE id = ?', [matchId]);
    return row ? row.status : null;
};

const getAll = async (req, res, next) => {
    try {
        const { tournament_id, status, date, referee_id, department_id, venue_id } = req.query;
        const callerRole = req.user?.role;
        const showAll = req.query.all === 'true';
        const sportFestId = showAll ? null : await getActiveSportFestId();

        let query = `
            SELECT
                m.*,
                DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                DATE_FORMAT(m.scheduled_time, '%H:%i')    AS scheduled_time,
                s.name   AS sport_name,
                s.scoring_type,
                s.sets_to_win,
                t.name   AS tournament_name,
                t.format AS tournament_format,
                t.ffa_scoring AS ffa_scoring_type,
                da.name  AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                db.name  AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                v.name   AS venue_name,
                CONCAT(referee_user.first_name,' ',referee_user.last_name) AS referee_name,
                referee_user.id AS referee_user_id,
                mr.total_score_a,
                mr.total_score_b,
                mr.final_score_display,
                mr.mvp_player_name,
                mr.winner_side,
                (SELECT COUNT(*) FROM match_scores ms
                  WHERE ms.match_id = m.id AND ms.score_a > ms.score_b) AS sets_won_a,
                (SELECT COUNT(*) FROM match_scores ms
                  WHERE ms.match_id = m.id AND ms.score_b > ms.score_a) AS sets_won_b,
                (SELECT COALESCE(SUM(score_a),0) FROM match_scores WHERE match_id = m.id) AS live_total_a,
                (SELECT COALESCE(SUM(score_b),0) FROM match_scores WHERE match_id = m.id) AS live_total_b
            FROM matches m
            JOIN  tournaments t  ON m.tournament_id = t.id
            JOIN  sports s       ON t.sport_id      = s.id
            LEFT JOIN departments da ON m.participant_a_department_id = da.id
            LEFT JOIN departments db ON m.participant_b_department_id = db.id
            LEFT JOIN venues v      ON m.venue_id                     = v.id
            LEFT JOIN users referee_user ON m.referee_id = referee_user.id
            LEFT JOIN match_results mr ON m.id = mr.match_id
            WHERE 1 = 1
                AND (m.status NOT IN ('pending', 'scheduled')
                    OR m.bracket_side = 'ffa'
                       OR t.format IN ('free_for_all', 'team_ranking', 'group_stage_ffa')
                       OR m.bracket_side = 'exhibition'
                   OR (m.participant_a_department_id IS NOT NULL
                       AND m.participant_b_department_id IS NOT NULL))
        `;
        const params = [];

        if (sportFestId) {
            query += ` AND EXISTS (
                SELECT 1 FROM sport_fest_tournaments sft
                WHERE sft.tournament_id = t.id AND sft.sport_fest_id = ?
            )`;
            params.push(sportFestId);
        }

        if (callerRole === 'dean_adviser') {
            query += ' AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)';
            params.push(req.user.department_id, req.user.department_id);
        }

        if (callerRole === 'sgo_officer') {
            query += ' AND m.referee_id = ?';
            params.push(req.user.id);
        }

        if (tournament_id) { query += ' AND m.tournament_id = ?'; params.push(tournament_id); }
        if (status) { query += ' AND m.status = ?'; params.push(status); }
        if (date) { query += ' AND m.scheduled_date = ?'; params.push(date); }
        if (venue_id) { query += ' AND m.venue_id = ?'; params.push(venue_id); }
        if (referee_id) { query += ' AND m.referee_id = ?'; params.push(referee_id); }
        if (department_id) {
            query += ' AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)';
            params.push(department_id, department_id);
        }

        query += ' ORDER BY m.scheduled_date ASC, m.scheduled_time ASC';

        const [rows] = await pool.execute(query, params);
        const enrichedRows = rows.map(row => ({
            ...row,
            watchers: row.status === 'ongoing' ? getMatchWatchers(row.id) : 0
        }));

        return res.json({ success: true, data: enrichedRows });
    } catch (err) {
        next(err);
    }
};


const getPlayersByDepartment = async (req, res, next) => {
    try {
        const departmentId = parseInt(req.params.departmentId);

        const sportId = parseInt(req.query.sport_id);

        const params = [departmentId];
        let sportFilter = '';
        if (Number.isInteger(sportId) && sportId > 0) {
            sportFilter = 'AND p.sport_id = ?';
            params.push(sportId);
        }

        const [rows] = await pool.execute(
            `SELECT 
                p.id,
                p.first_name,
                p.last_name,
                p.jersey_number,
                p.position,
                p.image_url,
                p.status,
                t.name AS team_name
             FROM players p
             LEFT JOIN teams t ON p.team_id = t.id
             WHERE p.department_id = ? 
               AND p.status = 'approved'
               ${sportFilter}
             ORDER BY p.last_name ASC, p.first_name ASC`,
            params
        );

        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT m.*,
                    DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                    DATE_FORMAT(m.scheduled_time, '%H:%i')    AS scheduled_time,
                    s.name  AS sport_name, s.scoring_type, s.sets_to_win,
                    t.name  AS tournament_name, t.format AS tournament_format, t.ffa_scoring,
                    da.name AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                    db.name AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                    v.name  AS venue_name, v.location AS venue_location,
                    CONCAT(referee_user.first_name,' ',referee_user.last_name) AS referee_name,
                    referee_user.id AS referee_user_id
             FROM matches m
             JOIN  tournaments t ON m.tournament_id = t.id
             JOIN  sports      s ON t.sport_id      = s.id
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN venues      v  ON m.venue_id                    = v.id
             LEFT JOIN users referee_user ON m.referee_id = referee_user.id
             WHERE m.id = ?`,
            [req.params.id]
        );

        if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found.' });

        const [scores] = await pool.execute(
            'SELECT * FROM match_scores WHERE match_id = ? ORDER BY period ASC',
            [req.params.id]
        );
        const [result] = await pool.execute(
            'SELECT * FROM match_results WHERE match_id = ?',
            [req.params.id]
        );

        const data = {
            ...rows[0],
            scores,
            result: result[0] || null,
            watchers: rows[0].status === 'ongoing' ? getMatchWatchers(parseInt(req.params.id)) : 0
        };

        return res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

const getScoreboard = async (req, res, next) => {
    try {
        const [match] = await pool.execute(
            `SELECT m.*,
                    DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                    DATE_FORMAT(m.scheduled_time, '%H:%i')    AS scheduled_time,
                    s.name AS sport_name, s.scoring_type,
                    t.name AS tournament_name,
                    t.ffa_scoring,
                    da.name AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                    db.name AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                    v.name  AS venue_name
             FROM matches m
             JOIN  tournaments t ON m.tournament_id = t.id
             JOIN  sports      s ON t.sport_id      = s.id
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN venues      v  ON m.venue_id                    = v.id
             WHERE m.id = ?`,
            [req.params.id]
        );

        if (!match.length) return res.status(404).json({ success: false, message: 'Match not found.' });

        const [scores] = await pool.execute(
            'SELECT * FROM match_scores WHERE match_id = ? ORDER BY period ASC',
            [req.params.id]
        );
        const totalA = scores.reduce((s, r) => s + (r.score_a || 0), 0);
        const totalB = scores.reduce((s, r) => s + (r.score_b || 0), 0);

        const [result] = await pool.execute(
            'SELECT * FROM match_results WHERE match_id = ?',
            [req.params.id]
        );

        return res.json({
            success: true,
            data: {
                match: match[0],
                scores,
                total_a: totalA,
                total_b: totalB,
                result: result[0] || null,
                watchers: match[0].status === 'ongoing' ? getMatchWatchers(parseInt(req.params.id)) : 0,
                last_updated: new Date()
            },
        });
    } catch (err) {
        next(err);
    }
};


const getLive = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT m.id, m.tournament_id, m.bracket_side, m.bracket_position, m.status,
                    DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                    DATE_FORMAT(m.scheduled_time, '%H:%i')    AS scheduled_time,
                    t.name  AS tournament_name, t.format AS tournament_format, t.ffa_scoring,
                    s.name  AS sport_name,
                    da.id AS dept_a_id, da.name AS dept_a, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                    db.id AS dept_b_id, db.name AS dept_b, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                    v.name  AS venue_name, m.started_at,
                    COALESCE((SELECT SUM(score_a) FROM match_scores WHERE match_id = m.id), 0) AS live_score_a,
                    COALESCE((SELECT SUM(score_b) FROM match_scores WHERE match_id = m.id), 0) AS live_score_b,
                    (SELECT COUNT(*) FROM match_scores WHERE match_id = m.id) AS periods_played,
                    (SELECT MAX(ms.updated_at) FROM match_scores ms WHERE ms.match_id = m.id) AS score_updated_at,
                    (SELECT CONCAT(u.first_name, ' ', u.last_name)
                     FROM match_scores ms JOIN users u ON u.id = ms.updated_by
                     WHERE ms.match_id = m.id ORDER BY ms.updated_at DESC LIMIT 1) AS score_updated_by
                    FROM matches m
                    JOIN  tournaments t ON m.tournament_id = t.id
                    JOIN  sports      s ON t.sport_id      = s.id
                    LEFT JOIN departments da ON m.participant_a_department_id = da.id
                    LEFT JOIN departments db ON m.participant_b_department_id = db.id
                    LEFT JOIN venues      v  ON m.venue_id                    = v.id
                    LEFT JOIN match_scores ms ON m.id = ms.match_id
                    WHERE m.status IN ('ongoing', 'scheduled')
                      AND (m.bracket_side = 'ffa'
                           OR t.format IN ('free_for_all', 'team_ranking', 'group_stage_ffa')
                           OR m.bracket_side = 'exhibition'
                           OR (m.participant_a_department_id IS NOT NULL
                               AND m.participant_b_department_id IS NOT NULL))
                    GROUP BY m.id
                    ORDER BY m.status DESC, m.started_at DESC, m.scheduled_date ASC`
        );

        const enrichedRows = rows.map(row => ({
            ...row,
            watchers: row.status === 'ongoing' ? getMatchWatchers(row.id) : 0
        }));

        return res.json({ success: true, data: enrichedRows });
    } catch (err) {
        next(err);
    }
};


const getMyAssignments = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT m.*,
                    DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                    DATE_FORMAT(m.scheduled_time, '%H:%i')    AS scheduled_time,
                    s.name  AS sport_name,
                    t.name  AS tournament_name,
                    da.name AS dept_a, db.name AS dept_b,
                    v.name  AS venue_name,
                    (SELECT COALESCE(SUM(score_a),0) FROM match_scores WHERE match_id = m.id) AS live_total_a,
                    (SELECT COALESCE(SUM(score_b),0) FROM match_scores WHERE match_id = m.id) AS live_total_b
             FROM matches m
             JOIN  tournaments t ON m.tournament_id = t.id
             JOIN  sports      s ON t.sport_id      = s.id
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN venues      v  ON m.venue_id                    = v.id
             WHERE m.referee_id = ? AND m.status NOT IN ('cancelled','completed')
             ORDER BY m.scheduled_date ASC, m.scheduled_time ASC`,
            [req.user.id]
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const getAvailableOfficers = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                COUNT(m.id) AS active_assignments
             FROM users u
             LEFT JOIN matches m ON m.referee_id = u.id AND m.status IN ('scheduled','ongoing')
             WHERE u.role = 'sgo_officer' AND u.is_active = 1
             GROUP BY u.id
             ORDER BY active_assignments ASC, u.first_name`
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};


const schedule = async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.id);
        const finalDate = safeDate(req.body.scheduled_date);
        const finalTime = req.body.scheduled_time || null;
        const finalVenue = safeFK(req.body.venue_id);
        const finalReferee = safeFK(req.body.referee_id);

        const currentStatus = await getMatchStatus(matchId);
        if (currentStatus === null) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }
        if (!canReschedule(currentStatus)) {
            return res.status(409).json({
                success: false,
                message: currentStatus === 'ongoing'
                    ? 'This match is currently in progress — venue, time, and officer are locked until it ends.'
                    : 'This match is already completed and can no longer be rescheduled.',
            });
        }

        if (finalReferee) {
            const [officerCheck] = await pool.execute(
                'SELECT id FROM users WHERE id = ? AND role = "sgo_officer" AND is_active = 1',
                [finalReferee]
            );
            if (!officerCheck.length) {
                return res.status(400).json({ success: false, message: 'Selected user is not an active SGO Officer.' });
            }
        }

        if (finalReferee && finalDate && finalTime) {
            const [conflicts] = await pool.execute(
                `SELECT id FROM matches
                 WHERE referee_id = ? AND scheduled_date = ? AND scheduled_time = ? AND id != ?`,
                [finalReferee, finalDate, finalTime, matchId]
            );
            if (conflicts.length) {
                return res.status(409).json({ success: false, message: 'Selected officer is already assigned to another match at this time.' });
            }
        }

        if (finalVenue && finalDate && finalTime) {
            const [vConflicts] = await pool.execute(
                `SELECT id FROM matches
                 WHERE venue_id = ? AND scheduled_date = ? AND scheduled_time = ? AND id != ?`,
                [finalVenue, finalDate, finalTime, matchId]
            );
            if (vConflicts.length) {
                return res.status(409).json({ success: false, message: 'Selected venue is already booked at this time.' });
            }
        }

        await pool.execute(
            `UPDATE matches
             SET scheduled_date = ?,
                 scheduled_time = ?,
                 venue_id       = ?,
                 referee_id     = ?,
                 status = CASE WHEN status = 'pending' THEN 'scheduled' ELSE status END,
                 updated_at = NOW()
             WHERE id = ?`,
            [finalDate, finalTime, finalVenue, finalReferee, matchId]
        );

        await logActivity(req.user.id, 'MATCH_SCHEDULED', 'match', matchId, `Match ${matchId} scheduled`);

        const [[m]] = await pool.execute('SELECT tournament_id FROM matches WHERE id = ?', [matchId]);

        emitToTournament(m.tournament_id, 'match:scheduled', {
            match_id: matchId,
            scheduled_date: finalDate,
            scheduled_time: finalTime,
            venue_id: finalVenue,
            referee_id: finalReferee,
        });

        // Real-time + persisted notifications
        await notifyMatchEvent('scheduled', matchId, {
            scheduled_date: finalDate,
            scheduled_time: finalTime,
            referee_id: finalReferee,
        }, req.user.id);

        return res.json({ success: true, message: 'Match scheduled successfully.' });
    } catch (err) {
        next(err);
    }
};


const startMatch = async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.id);

        const [[startInfo]] = await pool.execute(
            `SELECT m.id, m.status, m.scheduled_date, m.scheduled_time,
                    participant_a_department_id, participant_b_department_id,
                venue_id, referee_id, bracket_side, t.format AS tournament_format
             FROM matches m
             JOIN tournaments t ON t.id = m.tournament_id
             WHERE m.id = ?`,
            [matchId]
        );
        if (!startInfo) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        const warnings = [];
        if (!startInfo.scheduled_date || !startInfo.scheduled_time) {
            warnings.push('This match has no scheduled date and time. Confirm the event schedule before starting.');
        }

        const isFfa = startInfo.bracket_side === 'ffa' ||
            startInfo.bracket_side === 'exhibition' ||
            ['free_for_all', 'team_ranking', 'group_stage_ffa']
                .includes(String(startInfo.tournament_format || '').toLowerCase());
        if ((!startInfo.participant_a_department_id && !isFfa) ||
            (!startInfo.participant_b_department_id && !isFfa)) {
            return res.status(409).json({
                success: false,
                code: 'MISSING_PARTICIPANT',
                warning: true,
                message: 'This match cannot start because both participants are not assigned yet.',
            });
        }

        let scheduledAt = null;
        if (startInfo.scheduled_date && startInfo.scheduled_time) {
            const dateText = String(startInfo.scheduled_date).slice(0, 10);
            const timeText = String(startInfo.scheduled_time).slice(0, 8);
            scheduledAt = new Date(`${dateText}T${timeText}`);
            if (!Number.isNaN(scheduledAt.getTime())) {
                const now = new Date();
                if (now < scheduledAt) {
                    const message = `This match is scheduled for ${dateText} ${timeText}. It cannot start yet.`;
                    warnings.push(`${message} Officer override used.`);
                } else if (now.getTime() - scheduledAt.getTime() > 30 * 60 * 1000) {
                    warnings.push('This match is more than 30 minutes late. Confirm the venue and participants before starting.');
                }
            }
        }

        if (req.user.role === 'sgo_officer') {
            const [assigned] = await pool.execute(
                'SELECT id FROM matches WHERE id = ? AND referee_id = ?',
                [matchId, req.user.id]
            );
            if (!assigned.length) {
                return res.status(403).json({ success: false, message: 'You are not assigned to this match.' });
            }
        }

        const currentStatus = await getMatchStatus(matchId);
        if (currentStatus === null) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }
        if (!canStart(currentStatus)) {
            return res.status(409).json({
                success: false,
                message: currentStatus === 'ongoing'
                    ? 'This match is already in progress.'
                    : `This match is ${currentStatus} and cannot be started.`,
            });
        }

        await pool.execute(
            "UPDATE matches SET status = 'ongoing', started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE id = ?",
            [matchId]
        );

        await logActivity(req.user.id, 'MATCH_STARTED', 'match', matchId, `Match ${matchId} started`);

        const [[m]] = await pool.execute('SELECT tournament_id FROM matches WHERE id = ?', [matchId]);

        const [matchDetails] = await pool.execute(
            `SELECT m.*, da.name AS dept_a_name, db.name AS dept_b_name, s.name AS sport_name
             FROM matches m
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             LEFT JOIN sports s ON m.sport_id = s.id
             WHERE m.id = ?`,
            [matchId]
        );

        const startData = {
            match_id: matchId,
            match: matchDetails[0],
            started_at: new Date(),
            watchers: 0,
            dept_a: matchDetails[0]?.dept_a_name,
            dept_b: matchDetails[0]?.dept_b_name,
        };

        emitToMatch(matchId, 'match:started', startData);
        emitToTournament(m.tournament_id, 'match:started', startData);
        emitToAll('live:matchStarted', startData);

        await notifyMatchEvent('started', matchId, {}, req.user.id);

        return res.json({
            success: true,
            message: warnings.length ? `Match started with warning: ${warnings[0]}` : 'Match started.',
            warnings,
            data: { ...startData, warnings },
        });
    } catch (err) {
        next(err);
    }
};


const updateScore = async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.id);
        const { period, period_label, score_a, score_b } = req.body;
        const userId = req.user.id;


        if (req.user.role === 'sgo_officer') {
            const [assigned] = await pool.execute(
                'SELECT id FROM matches WHERE id = ? AND referee_id = ?',
                [matchId, userId]
            );
            if (!assigned.length) {
                return res.status(403).json({ success: false, message: 'You are not assigned to this match.' });
            }
        }

        const currentStatus = await getMatchStatus(matchId);
        if (currentStatus === null) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }
        if (!canScore(currentStatus)) {
            return res.status(409).json({
                success: false,
                message: 'Scores can only be entered after the match has started.',
            });
        }

        const safeA = parseFloat(score_a) || 0;
        const safeB = parseFloat(score_b) || 0;
        const safePeriod = parseInt(period) || 1;

        await pool.execute(
            `INSERT INTO match_scores (match_id, period, period_label, score_a, score_b, updated_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE score_a = VALUES(score_a), score_b = VALUES(score_b),
             updated_by = VALUES(updated_by), updated_at = NOW()`,
            [matchId, safePeriod, period_label || `Period ${safePeriod}`, safeA, safeB, userId]
        );

        const [[totals]] = await pool.execute(
            'SELECT COALESCE(SUM(score_a),0) AS total_a, COALESCE(SUM(score_b),0) AS total_b FROM match_scores WHERE match_id = ?',
            [matchId]
        );


        const [allScores] = await pool.execute(
            `SELECT ms.*,
                    CONCAT(u.first_name, ' ', u.last_name) AS updated_by_name
             FROM match_scores ms
             LEFT JOIN users u ON ms.updated_by = u.id
             WHERE ms.match_id = ? 
             ORDER BY ms.period ASC`,
            [matchId]
        );


        const [[match]] = await pool.execute(
            `SELECT m.*, t.name AS tournament_name,
                    da.name AS dept_a_name, db.name AS dept_b_name,
                    s.name AS sport_name, s.scoring_type
             FROM matches m
             JOIN tournaments t ON m.tournament_id = t.id
             JOIN sports s ON m.sport_id = s.id
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             WHERE m.id = ?`,
            [matchId]
        );

        if (match.status === 'completed') {
            await pool.execute(
                `UPDATE match_results
                 SET total_score_a = ?, total_score_b = ?, final_score_display = ?
                 WHERE match_id = ?`,
                [totals.total_a, totals.total_b, `${totals.total_a} - ${totals.total_b}`, matchId]
            );
        }


        const scoreUpdate = {
            match_id: matchId,
            period: safePeriod,
            period_label: period_label || `Period ${safePeriod}`,
            score_a: safeA,
            score_b: safeB,
            total_a: totals.total_a,
            total_b: totals.total_b,
            all_scores: allScores,
            updated_at: new Date(),
            updated_by: req.user.first_name + ' ' + req.user.last_name,
            updated_by_id: userId,
            watchers: getMatchWatchers(matchId),
            match: {
                id: match.id,
                tournament_name: match.tournament_name,
                dept_a_name: match.dept_a_name,
                dept_b_name: match.dept_b_name,
                sport_name: match.sport_name,
                status: match.status
            }
        };


        emitToMatch(matchId, 'score:update', scoreUpdate);


        emitToAll('live:tick', {
            match_id: matchId,
            total_a: totals.total_a,
            total_b: totals.total_b,
            updated_at: new Date()
        });


        emitToTournament(match.tournament_id, 'score:update', scoreUpdate);

        await logActivity(
            userId, 'SCORE_UPDATED', 'match', matchId,
            `Score updated: ${safeA}-${safeB} in period ${safePeriod}`
        );

        await createNotification({
            role: 'dean_adviser',
            type: 'score_updated',
            title: 'Match score updated',
            message: `${match.dept_a_name || 'Team A'} vs ${match.dept_b_name || 'Team B'} was updated to ${totals.total_a}-${totals.total_b} by ${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
            link: `/dean/matches?match_id=${matchId}`,
            severity: 'info',
            entity_type: 'match',
            entity_id: matchId,
            created_by: userId,
        });
        await notifyRoles(['admin', 'sgo_president'], {
            type: 'score_updated',
            title: 'Match score updated',
            message: `${match.dept_a_name || 'Team A'} vs ${match.dept_b_name || 'Team B'} was updated to ${totals.total_a}-${totals.total_b} by ${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
            link: '/admin/live',
            severity: 'info',
            entity_type: 'match',
            entity_id: matchId,
            created_by: userId,
        });

        return res.json({
            success: true,
            data: {
                total_a: totals.total_a,
                total_b: totals.total_b,
                watchers: getMatchWatchers(matchId)
                , updated: true
                , updated_by: req.user.first_name + ' ' + req.user.last_name
                , updated_at: new Date()
            }
        });
    } catch (err) {
        next(err);
    }
};


const completeMatch = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const matchId = parseInt(req.params.id);
        let {
            winner_side, win_type, duration_minutes, highlights,
            final_score_display, mvp_player_id, mvp_player_name,
        } = req.body;
        const userId = req.user.id;

        if (req.user.role === 'sgo_officer') {
            const [assigned] = await pool.execute(
                'SELECT id FROM matches WHERE id = ? AND referee_id = ?',
                [matchId, userId]
            );
            if (!assigned.length) {
                return res.status(403).json({ success: false, message: 'You are not assigned to this match.' });
            }
        }

        const [rows] = await pool.execute(
            `SELECT m.*, s.scoring_type FROM matches m JOIN sports s ON m.sport_id = s.id WHERE m.id = ?`,
            [matchId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Match not found.' });
        const match = rows[0];

        if (!canComplete(match.status)) {
            return res.status(409).json({
                success: false,
                message: match.status === 'completed'
                    ? 'This match is already completed.'
                    : 'Only a match that is currently in progress can be completed.',
            });
        }

        // ——— BINARY ———
        if (match.scoring_type === 'binary') {
            if (!winner_side || !['a', 'b', 'draw'].includes(winner_side)) {
                return res.status(400).json({
                    success: false,
                    message: 'Binary sport: provide winner_side as "a", "b", or "draw".',
                });
            }

            const winner_dept_id = winner_side === 'draw'
                ? null
                : (winner_side === 'a'
                    ? match.participant_a_department_id
                    : match.participant_b_department_id);

            await conn.beginTransaction();

            const [lockResult] = await conn.execute(
                `UPDATE matches
                 SET status = 'completed', completed_at = NOW(),
                     winner_department_id = ?, updated_at = NOW()
                 WHERE id = ? AND status = 'ongoing'`,
                [winner_dept_id, matchId]
            );
            if (lockResult.affectedRows === 0) {
                await conn.rollback();
                return res.status(409).json({ success: false, message: 'This match was already completed.' });
            }

            const binaryScoreDisplay = winner_side === 'draw' ? 'Draw' : (winner_side === 'a' ? 'Win — A' : 'Win — B');

            await conn.execute(
                `INSERT INTO match_results
                 (match_id, total_score_a, total_score_b, final_score_display, winner_side,
                  win_type, duration_minutes, highlights, recorded_by, mvp_player_id, mvp_player_name)
                 VALUES (?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 total_score_a = 0, total_score_b = 0,
                 final_score_display = VALUES(final_score_display),
                 winner_side = VALUES(winner_side),
                 win_type = VALUES(win_type),
                 duration_minutes = VALUES(duration_minutes),
                 highlights = VALUES(highlights),
                 recorded_by = VALUES(recorded_by),
                 mvp_player_id = VALUES(mvp_player_id),
                 mvp_player_name = VALUES(mvp_player_name)`,
                [
                    matchId,
                    binaryScoreDisplay,
                    winner_side,
                    win_type || 'normal',
                    duration_minutes ? parseInt(duration_minutes) : null,
                    highlights?.trim() || null,
                    userId,
                    mvp_player_id ? parseInt(mvp_player_id) : null,
                    mvp_player_name?.trim() || null,
                ]
            );

            await _updateRoundRobinStandings(
                conn, match,
                winner_side === 'draw' ? null : winner_side,
                0, 0
            );

            await conn.commit();

            try {
                if (winner_dept_id) {
                    await progressBracket(matchId, null, null, winner_dept_id, pool);
                }
            } catch (e) {
                console.warn('progressBracket warning:', e.message);
            }

            await logActivity(
                userId, 'MATCH_COMPLETED', 'match', matchId,
                `Binary match ${matchId} — winner_side: ${winner_side}`
            );

            const resultData = {
                match_id: matchId,
                winner_side,
                winner_department_id: winner_dept_id,
                final_score_display: binaryScoreDisplay,
                completed_at: new Date(),
                watchers: getMatchWatchers(matchId),
            };

            emitToMatch(matchId, 'match:completed', resultData);
            emitToTournament(match.tournament_id, 'bracket:updated', {
                match_id: matchId,
                winner_department_id: winner_dept_id,
            });
            emitToLeaderboard('leaderboard:changed', {
                reason: 'match_completed',
                match_id: matchId,
                tournament_id: match.tournament_id,
            });

            await notifyMatchEvent('completed', matchId, {
                final_score_display: binaryScoreDisplay,
                winner_side,
            }, userId);

            return res.json({ success: true, message: 'Match completed (winner only).' });
        }

        // ——— POINTS / SETS / TIME ———
        const [[totals]] = await pool.execute(
            'SELECT COALESCE(SUM(score_a),0) AS total_a, COALESCE(SUM(score_b),0) AS total_b FROM match_scores WHERE match_id = ?',
            [matchId]
        );

        if (!winner_side) {
            winner_side = (match.scoring_type === 'time')
                ? (totals.total_a < totals.total_b ? 'a' : 'b')
                : (totals.total_a > totals.total_b ? 'a' : 'b');
        }

        const winner_dept_id = winner_side === 'a'
            ? match.participant_a_department_id
            : match.participant_b_department_id;

        const scoreDisplay = final_score_display || `${totals.total_a} - ${totals.total_b}`;
        const safeDuration = duration_minutes ? parseInt(duration_minutes) : null;
        const safeHighlights = highlights?.trim() || null;
        const safeWinType = win_type || 'normal';
        const safeMvpId = mvp_player_id ? parseInt(mvp_player_id) : null;
        const safeMvpName = mvp_player_name?.trim() || null;

        await conn.beginTransaction();

        const [lockResult] = await conn.execute(
            "UPDATE matches SET status = 'completed', completed_at = NOW(), winner_department_id = ?, updated_at = NOW() WHERE id = ? AND status = 'ongoing'",
            [winner_dept_id, matchId]
        );
        if (lockResult.affectedRows === 0) {
            await conn.rollback();
            return res.status(409).json({ success: false, message: 'This match was already completed.' });
        }

        await conn.execute(
            `INSERT INTO match_results
             (match_id, total_score_a, total_score_b, final_score_display, winner_side,
              win_type, duration_minutes, highlights, recorded_by, mvp_player_id, mvp_player_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_score_a    = VALUES(total_score_a),
             total_score_b    = VALUES(total_score_b),
             final_score_display = VALUES(final_score_display),
             winner_side      = VALUES(winner_side),
             win_type         = VALUES(win_type),
             duration_minutes = VALUES(duration_minutes),
             highlights       = VALUES(highlights),
             recorded_by      = VALUES(recorded_by),
             mvp_player_id    = VALUES(mvp_player_id),
             mvp_player_name  = VALUES(mvp_player_name)`,
            [matchId, totals.total_a, totals.total_b, scoreDisplay, winner_side,
                safeWinType, safeDuration, safeHighlights, userId, safeMvpId, safeMvpName]
        );

        await _updateRoundRobinStandings(conn, match, winner_side, totals.total_a, totals.total_b);

        await conn.commit();

        try {
            await progressBracket(matchId, null, null, winner_dept_id, pool);
        } catch (e) {
            console.warn('progressBracket warning:', e.message);
        }

        await logActivity(
            userId, 'MATCH_COMPLETED', 'match', matchId,
            `Match ${matchId} completed — winner: ${winner_side}${safeMvpName ? `, MVP: ${safeMvpName}` : ''}`
        );

        const [allScores] = await pool.execute(
            `SELECT * FROM match_scores WHERE match_id = ? ORDER BY period`,
            [matchId]
        );

        const resultData = {
            match_id: matchId,
            winner_side,
            winner_department_id: winner_dept_id,
            total_a: totals.total_a,
            total_b: totals.total_b,
            final_score_display: scoreDisplay,
            mvp_player_name: safeMvpName,
            mvp_player_id: safeMvpId,
            win_type: safeWinType,
            duration_minutes: safeDuration,
            highlights: safeHighlights,
            all_scores: allScores,
            completed_at: new Date(),
            watchers: getMatchWatchers(matchId),
        };

        emitToMatch(matchId, 'match:completed', resultData);
        emitToTournament(match.tournament_id, 'bracket:updated', {
            match_id: matchId,
            winner_department_id: winner_dept_id,
        });
        emitToLeaderboard('leaderboard:changed', {
            reason: 'match_completed',
            match_id: matchId,
            tournament_id: match.tournament_id,
        });

        await notifyMatchEvent('completed', matchId, {
            final_score_display: scoreDisplay,
            winner_side,
        }, userId);

        return res.json({ success: true, message: 'Match completed.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};


const _updateRoundRobinStandings = async (conn, match, winnerSide, totalA, totalB) => {
    const [[tourney]] = await conn.execute('SELECT format FROM tournaments WHERE id = ?', [match.tournament_id]);
    if (!tourney || tourney.format !== 'round_robin') return;

    const a = match.participant_a_department_id;
    const b = match.participant_b_department_id;

    if (winnerSide === 'a') {
        await conn.execute(
            `UPDATE round_robin_standings SET wins=wins+1, matches_played=matches_played+1, standing_points=standing_points+3,
             points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`,
            [totalA, totalB, match.tournament_id, a]
        );
        await conn.execute(
            `UPDATE round_robin_standings SET losses=losses+1, matches_played=matches_played+1,
             points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`,
            [totalB, totalA, match.tournament_id, b]
        );
    } else if (winnerSide === 'b') {
        await conn.execute(
            `UPDATE round_robin_standings SET losses=losses+1, matches_played=matches_played+1,
             points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`,
            [totalA, totalB, match.tournament_id, a]
        );
        await conn.execute(
            `UPDATE round_robin_standings SET wins=wins+1, matches_played=matches_played+1, standing_points=standing_points+3,
             points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`,
            [totalB, totalA, match.tournament_id, b]
        );
    } else {
        for (const [dId, pf, pa] of [[a, totalA, totalB], [b, totalB, totalA]]) {
            await conn.execute(
                `UPDATE round_robin_standings SET draws=draws+1, matches_played=matches_played+1, standing_points=standing_points+1,
                 points_for=points_for+?, points_against=points_against+? WHERE tournament_id=? AND department_id=?`,
                [pf, pa, match.tournament_id, dId]
            );
        }
    }
};


const getFFAResults = async (req, res, next) => {
    try {
        const { tournamentId } = req.params;

        const [participants] = await pool.execute(
            `SELECT tp.department_id, d.name AS department_name, d.color AS department_color,
                    fr.result_value AS ffa_result_value, fr.rank_position
             FROM tournament_participants tp
             JOIN departments d ON tp.department_id = d.id
             LEFT JOIN ffa_results fr
                   ON fr.tournament_id = ? AND fr.department_id = tp.department_id
             WHERE tp.tournament_id = ? AND tp.status = 'active'
             ORDER BY d.name`,
            [tournamentId, tournamentId]
        );

        const [[tourInfo]] = await pool.execute(
            'SELECT ffa_scoring FROM tournaments WHERE id = ?',
            [tournamentId]
        );

        return res.json({
            success: true,
            data: { participants, ffa_scoring: tourInfo?.ffa_scoring || 'points' },
        });
    } catch (err) {
        next(err);
    }
};


const saveFFAResults = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { tournamentId } = req.params;
        const { results } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(results)) {
            return res.status(400).json({ success: false, message: 'results must be an array.' });
        }

        await conn.beginTransaction();

        for (const r of results) {
            const val = r.result_value !== null ? parseFloat(r.result_value) : null;
            await conn.execute(
                `INSERT INTO ffa_results (tournament_id, department_id, result_value, recorded_by)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE result_value = VALUES(result_value),
                 recorded_by = VALUES(recorded_by), recorded_at = NOW()`,
                [tournamentId, r.department_id, val, userId]
            );
        }


        await conn.execute(
            `UPDATE matches SET status = 'ongoing', started_at = COALESCE(started_at, NOW())
             WHERE tournament_id = ?
               AND (bracket_side = 'ffa' OR bracket_position = 'FFA Event'
                    OR tournament_id IN (
                        SELECT id FROM tournaments
                        WHERE format IN ('free_for_all', 'team_ranking', 'group_stage_ffa')
                    ))`,
            [tournamentId]
        );

        await _reRankFFA(conn, tournamentId);
        await conn.commit();

        emitToTournament(tournamentId, 'ffa:resultsUpdated', { tournament_id: tournamentId });

        return res.json({ success: true, message: 'FFA results saved.' });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};


const _reRankFFA = async (conn, tournamentId) => {
    const [[t]] = await conn.execute('SELECT ffa_scoring FROM tournaments WHERE id = ?', [tournamentId]);
    const orderDir = (t && t.ffa_scoring === 'time') ? 'ASC' : 'DESC';

    const [results] = await conn.execute(
        `SELECT id, result_value FROM ffa_results WHERE tournament_id = ? ORDER BY result_value ${orderDir}`,
        [tournamentId]
    );

    let rank = 1;
    for (let i = 0; i < results.length; i++) {
        if (i > 0 && results[i].result_value !== results[i - 1].result_value) rank = i + 1;
        await conn.execute('UPDATE ffa_results SET rank_position = ? WHERE id = ?', [rank, results[i].id]);
    }
};

const completeFFAMatch = async (req, res, next) => {
    try {
        const { matchId } = req.params;
        const userId = req.user.id;

        const [[check]] = await pool.execute(
            `SELECT COUNT(*) AS count,
                    (SELECT COUNT(*) FROM tournament_participants tp
                     WHERE tp.tournament_id = m.tournament_id) AS participant_count
             FROM ffa_results fr
             JOIN matches m ON m.tournament_id = fr.tournament_id
             WHERE m.id = ? AND fr.result_value IS NOT NULL`,
            [matchId]
        );
        if (Number(check.count) === 0 || Number(check.count) < Number(check.participant_count)) {
            return res.status(400).json({ success: false, message: 'Record results for every FFA participant before finishing.' });
        }

        const [[m]] = await pool.execute(
            `SELECT m.tournament_id, m.status, t.format
             FROM matches m JOIN tournaments t ON t.id = m.tournament_id
             WHERE m.id = ?`,
            [matchId]
        );
        if (!m) return res.status(404).json({ success: false, message: 'Match not found.' });
        if (m.status === 'completed') {
            return res.status(409).json({ success: false, message: 'This FFA event is already completed.' });
        }

        const [lockResult] = await pool.execute(
            "UPDATE matches SET status = 'completed', completed_at = NOW() WHERE id = ? AND status != 'completed'",
            [matchId]
        );
        if (lockResult.affectedRows === 0) {
            return res.status(409).json({ success: false, message: 'This FFA event is already completed.' });
        }

        await logActivity(userId, 'FFA_COMPLETED', 'match', matchId, `FFA event ${matchId} completed`);

        emitToMatch(matchId, 'match:completed', { match_id: matchId, format: 'ffa' });
        if (m) emitToTournament(m.tournament_id, 'bracket:updated', { match_id: matchId });
        emitToLeaderboard('leaderboard:changed', { reason: 'ffa_completed', match_id: matchId });

        await notifyMatchEvent('ffa_completed', matchId, {}, userId);

        return res.json({ success: true, message: 'FFA event completed.' });
    } catch (err) {
        next(err);
    }
};


const getMVPs = async (req, res, next) => {
    try {
        const [mvps] = await pool.execute(
            `SELECT
                mr.mvp_player_id    AS id,
                mr.mvp_player_name  AS player_name,
                s.name              AS sport,
                d.name              AS dept_name,
                d.color             AS dept_color,
                'mvp'               AS type,
                (mr.total_score_a + mr.total_score_b) AS match_total,
                mr.created_at       AS awarded_at,
                mr.highlights       AS notes
             FROM match_results mr
             INNER JOIN matches m ON mr.match_id = m.id
             LEFT JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN sports      s ON t.sport_id      = s.id
             LEFT JOIN departments d ON m.winner_department_id = d.id
             WHERE mr.mvp_player_name IS NOT NULL AND mr.mvp_player_name != ''
             ORDER BY mr.created_at DESC
             LIMIT 50`
        );
        return res.json({ success: true, data: mvps });
    } catch (err) {

        return res.json({ success: true, data: [] });
    }
};

const getScoreHistory = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT ms.*,
                    CONCAT(u.first_name,' ',u.last_name) AS updated_by_name
             FROM match_scores ms
             LEFT JOIN users u ON ms.updated_by = u.id
             WHERE ms.match_id = ?
             ORDER BY ms.period ASC, ms.updated_at DESC`,
            [req.params.id]
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getMatchPlayers = async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.id);

        const [matches] = await pool.execute(
            `SELECT
                m.id,
                m.sport_id,
                m.participant_a_department_id,
                m.participant_b_department_id,
                da.name AS dept_a_name,
                db.name AS dept_b_name
             FROM matches m
             LEFT JOIN departments da ON m.participant_a_department_id = da.id
             LEFT JOIN departments db ON m.participant_b_department_id = db.id
             WHERE m.id = ?`,
            [matchId]
        );

        if (!matches.length) {
            return res.status(404).json({ success: false, message: 'Match not found.' });
        }

        const match = matches[0];

        const loadSide = async (departmentId) => {
            if (!departmentId) return [];

            const [rows] = await pool.execute(
                `SELECT
                    p.id,
                    p.first_name,
                    p.last_name,
                    p.jersey_number,
                    p.position,
                    p.image_url,
                    p.status,
                    p.team_id,
                    t.name AS team_name
                 FROM players p
                 LEFT JOIN teams t ON p.team_id = t.id
                 WHERE p.department_id = ?
                   AND p.sport_id = ?
                   AND p.status = 'approved'
                 ORDER BY
                   (p.team_id IS NULL) ASC,
                   t.name ASC,
                   p.last_name ASC,
                   p.first_name ASC`,
                [departmentId, match.sport_id]
            );

            return rows;
        };

        const [side_a, side_b] = await Promise.all([
            loadSide(match.participant_a_department_id),
            loadSide(match.participant_b_department_id),
        ]);

        return res.json({
            success: true,
            data: {
                side_a,
                side_b,
                label_a: match.dept_a_name || 'Side A',
                label_b: match.dept_b_name || 'Side B',
            },
        });
    } catch (err) {
        next(err);
    }
};


const getWatchers = async (req, res, next) => {
    try {
        const matchId = parseInt(req.params.id);
        const count = getMatchWatchers(matchId);
        return res.json({ success: true, data: { match_id: matchId, watchers: count } });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getOne,
    getPlayersByDepartment,
    getScoreboard,
    getLive,
    getMyAssignments,
    getAvailableOfficers,
    schedule,
    startMatch,
    updateScore,
    completeMatch,
    getFFAResults,
    saveFFAResults,
    completeFFAMatch,
    getMVPs,
    getScoreHistory,
    getMatchPlayers,
    getWatchers,
};