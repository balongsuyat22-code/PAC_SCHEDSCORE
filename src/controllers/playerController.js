const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { getActiveSportFestId } = require('../utils/season');

/**
 * Confirms a team is a legal fit for a player before we attach them at
 * registration time: same department, same sport, same season, gender
 * matches the team's roster type, and there's still an open slot.
 * Used by both the staff registration form and the public self-registration link.
 */
async function validateTeamForPlayer(conn, teamId, { department_id, sport_id, sport_fest_id, gender }) {
    const [rows] = await conn.execute(
        `SELECT t.id, t.department_id, t.sport_id, t.sport_fest_id, t.gender AS team_gender,
                s.max_players,
                (SELECT COUNT(*) FROM players WHERE team_id = t.id AND status = 'approved') AS approved_count
         FROM teams t
         LEFT JOIN sports s ON t.sport_id = s.id
         WHERE t.id = ?`,
        [teamId]
    );
    if (!rows.length) return { ok: false, message: 'Selected team was not found.' };
    const team = rows[0];

    if (team.department_id !== department_id) {
        return { ok: false, message: 'That team does not belong to this department.' };
    }
    if (team.sport_id !== sport_id) {
        return { ok: false, message: 'That team is not registered for the selected sport.' };
    }
    if (team.sport_fest_id !== sport_fest_id) {
        return { ok: false, message: 'That team belongs to a different season.' };
    }
    const genderOk = team.team_gender === 'Mixed'
        || (team.team_gender === 'Men' && gender === 'Male')
        || (team.team_gender === 'Women' && gender === 'Female');
    if (!genderOk) {
        return { ok: false, message: `The "${team.team_gender}" team doesn't match the selected gender.` };
    }
    if (team.max_players != null && team.approved_count >= team.max_players) {
        return { ok: false, message: 'That team is already at its maximum roster size.' };
    }
    return { ok: true };
}


/**
 * Auto-pick a department team for a player by gender:
 * Male → Men (preferred) or Mixed; Female → Women (preferred) or Mixed.
 * Skips teams that are already at max approved roster.
 * Returns team id or null if none available.
 */
async function findMatchingTeamId(conn, { department_id, sport_id, sport_fest_id, gender }) {
    if (!department_id || !sport_id || !sport_fest_id) return null;
    if (!['Male', 'Female'].includes(gender)) return null;

    const preferred = gender === 'Male' ? 'Men' : 'Women';
    const [rows] = await conn.execute(
        `SELECT t.id, t.gender AS team_gender, s.max_players,
                (SELECT COUNT(*) FROM players WHERE team_id = t.id AND status = 'approved') AS approved_count
         FROM teams t
         LEFT JOIN sports s ON t.sport_id = s.id
         WHERE t.department_id = ?
           AND t.sport_id = ?
           AND t.sport_fest_id = ?
           AND (t.gender = ? OR t.gender = 'Mixed')
         ORDER BY CASE WHEN t.gender = ? THEN 0 ELSE 1 END, t.id ASC`,
        [department_id, sport_id, sport_fest_id, preferred, preferred]
    );

    for (const team of rows) {
        if (team.max_players == null || Number(team.approved_count) < Number(team.max_players)) {
            return team.id;
        }
    }
    return null;
}

const registerPlayer = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {

        if (!req.user || !['dean_adviser', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only a department dean/adviser or an admin can register players.',
            });
        }

        const {
            first_name, last_name, gender,
            department_id, sport_id, sport_ids, team_id,
            jersey_number, position, image_url,
        } = req.body;

        // A player can now be entered into more than one sport in a single submit.
        // `sport_ids` (array) takes priority; `sport_id` (single value) is kept for
        // backward compatibility with older clients / the CSV import format.
        const sportIdList = [...new Set(
            (Array.isArray(sport_ids) ? sport_ids : (sport_id != null ? [sport_id] : []))
                .map(id => parseInt(id, 10))
                .filter(id => Number.isInteger(id) && id > 0)
        )];

        if (!first_name || !last_name || !gender || !department_id || !sportIdList.length) {
            return res.status(400).json({
                success: false,
                message: 'first_name, last_name, gender, department_id, and at least one sport are required.',
            });
        }

        if (req.user.role === 'dean_adviser' && req.user.department_id !== parseInt(department_id)) {
            return res.status(403).json({
                success: false,
                message: 'You can only register players for your own department.',
            });
        }

        const sportFestId = await getActiveSportFestId();
        if (!sportFestId) {
            return res.status(400).json({
                success: false,
                message: 'No active Sport Fest season. Ask an admin to start a season before registering players.',
            });
        }

        await conn.beginTransaction();

        // Staff (dean/adviser or admin) registrations are auto-approved — the person
        // entering the roster is trusted. Public self-registration stays pending.
        const autoApprove = ['dean_adviser', 'admin'].includes(req.user.role);
        const insertStatus = autoApprove ? 'approved' : 'pending';

        // Explicit team pick only applies when registering for exactly one sport.
        // Otherwise (or when no team chosen) we auto-assign a gender-matching team
        // per sport: Male→Men/Mixed, Female→Women/Mixed.
        const explicitTeamId = sportIdList.length === 1 ? (team_id || null) : null;

        const created = [];
        const skipped = [];

        for (const sid of sportIdList) {
            const [duplicate] = await conn.execute(
                `SELECT id FROM players
                 WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
                   AND department_id = ? AND sport_id = ? AND sport_fest_id = ?`,
                [first_name.trim(), last_name.trim(), department_id, sid, sportFestId]
            );
            if (duplicate.length) {
                skipped.push(sid);
                continue;
            }

            let validatedTeamId = null;
            if (explicitTeamId) {
                const teamCheck = await validateTeamForPlayer(conn, explicitTeamId, {
                    department_id: parseInt(department_id, 10),
                    sport_id: sid,
                    sport_fest_id: sportFestId,
                    gender,
                });
                if (!teamCheck.ok) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, message: teamCheck.message });
                }
                validatedTeamId = explicitTeamId;
            } else {
                validatedTeamId = await findMatchingTeamId(conn, {
                    department_id: parseInt(department_id, 10),
                    sport_id: sid,
                    sport_fest_id: sportFestId,
                    gender,
                });
            }

            const [result] = await conn.execute(
                `INSERT INTO players
                 (first_name, last_name, gender, image_url, department_id,
                  sport_id, team_id, jersey_number, position, status, registered_by, sport_fest_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    first_name.trim(),
                    last_name.trim(),
                    gender,
                    image_url || null,
                    department_id,
                    sid,
                    validatedTeamId,
                    jersey_number || null,
                    position || null,
                    insertStatus,
                    req.user.id,
                    sportFestId,
                ]
            );
            created.push({ id: result.insertId, sport_id: sid });
        }

        if (!created.length) {
            await conn.rollback();
            return res.status(409).json({
                success: false,
                message: 'This player is already registered for the selected sport(s) in this department this season.',
            });
        }

        await conn.commit();

        await logActivity(
            req.user.id,
            'PLAYER_REGISTERED',
            'player',
            created[0].id,
            `Player registered: ${first_name} ${last_name} — ${created.length} sport(s)${autoApprove ? ' (auto-approved)' : ' (pending approval)'}`
        );

        return res.status(201).json({
            success: true,
            message: skipped.length
                ? `Player registered for ${created.length} sport(s)${autoApprove ? ' and auto-approved' : ', waiting for approval'}. Already registered for ${skipped.length} of the selected sport(s), so those were skipped.`
                : `Player registered for ${created.length} sport(s)${autoApprove ? ' and auto-approved.' : '. Waiting for approval.'}`,
            data: {
                id: created[0]?.id,
                created,
                skipped_sport_ids: skipped,
                auto_approved: autoApprove,
            },
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

/**
 * PUBLIC self-registration — no login required.
 * A dean/adviser shares a link like /register.html?dept=<department_id> with their
 * students; the student fills in their own info, picks their sport(s) and (optionally)
 * an existing team to join, and submits. The record still lands as 'pending' so the
 * dean/adviser only has to review and approve it from the Players screen — they never
 * have to type the player's details themselves.
 */
const publicRegisterPlayer = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const {
            first_name, last_name, gender,
            department_id, sport_id, sport_ids, team_id,
            jersey_number, position, image_url,
        } = req.body;

        const sportIdList = [...new Set(
            (Array.isArray(sport_ids) ? sport_ids : (sport_id != null ? [sport_id] : []))
                .map(id => parseInt(id, 10))
                .filter(id => Number.isInteger(id) && id > 0)
        )];

        if (!first_name || !last_name || !gender || !department_id || !sportIdList.length) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, gender, and at least one sport are required.',
            });
        }
        if (!['Male', 'Female'].includes(gender)) {
            return res.status(400).json({ success: false, message: 'Gender must be Male or Female.' });
        }

        const [dept] = await pool.execute(
            'SELECT id, name, is_active FROM departments WHERE id = ?',
            [department_id]
        );
        if (!dept.length || !dept[0].is_active) {
            return res.status(404).json({
                success: false,
                message: 'This registration link is invalid or no longer active. Please check the link with your department adviser.',
            });
        }

        const sportFestId = await getActiveSportFestId();
        if (!sportFestId) {
            return res.status(400).json({
                success: false,
                message: 'Registration is currently closed — there is no active Sport Fest season yet.',
            });
        }

        await conn.beginTransaction();

        // Explicit team only when joining exactly one sport; otherwise auto-assign
        // a gender-matching team per sport (Male→Men/Mixed, Female→Women/Mixed).
        const explicitTeamId = sportIdList.length === 1 ? (team_id || null) : null;

        const created = [];
        const skipped = [];

        for (const sid of sportIdList) {
            const [duplicate] = await conn.execute(
                `SELECT id FROM players
                 WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
                   AND department_id = ? AND sport_id = ? AND sport_fest_id = ?`,
                [first_name.trim(), last_name.trim(), department_id, sid, sportFestId]
            );
            if (duplicate.length) {
                skipped.push(sid);
                continue;
            }

            let validatedTeamId = null;
            if (explicitTeamId) {
                const teamCheck = await validateTeamForPlayer(conn, explicitTeamId, {
                    department_id: parseInt(department_id, 10),
                    sport_id: sid,
                    sport_fest_id: sportFestId,
                    gender,
                });
                if (!teamCheck.ok) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, message: teamCheck.message });
                }
                validatedTeamId = explicitTeamId;
            } else {
                validatedTeamId = await findMatchingTeamId(conn, {
                    department_id: parseInt(department_id, 10),
                    sport_id: sid,
                    sport_fest_id: sportFestId,
                    gender,
                });
            }

            const [result] = await conn.execute(
                `INSERT INTO players
                 (first_name, last_name, gender, image_url, department_id,
                  sport_id, team_id, jersey_number, position, status, registered_by, sport_fest_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)`,
                [
                    first_name.trim(),
                    last_name.trim(),
                    gender,
                    image_url || null,
                    department_id,
                    sid,
                    validatedTeamId,
                    jersey_number || null,
                    position || null,
                    sportFestId,
                ]
            );
            created.push({ id: result.insertId, sport_id: sid });
        }

        if (!created.length) {
            await conn.rollback();
            return res.status(409).json({
                success: false,
                message: 'You already have a pending or approved registration for the selected sport(s) this season.',
            });
        }

        await conn.commit();

        await logActivity(
            null,
            'PLAYER_SELF_REGISTERED',
            'player',
            created[0].id,
            `Player self-registered via link: ${first_name} ${last_name} — ${dept[0].name} — ${created.length} sport(s) (pending approval)`
        );

        return res.status(201).json({
            success: true,
            message: skipped.length
                ? `You're registered for ${created.length} sport(s) and waiting on your department adviser's approval. You were already registered for ${skipped.length} of the sport(s) you picked, so those were skipped.`
                : `You're registered for ${created.length} sport(s)! Your department adviser will review and approve it soon.`,
            data: {
                created,
                skipped_sport_ids: skipped,
                department_name: dept[0].name,
            },
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const getAllPlayers = async (req, res, next) => {
    try {
        const { department_id, sport_id, team_id, status, gender, search, season_id } = req.query;
        const callerRole = req.user?.role;

        let query = `
            SELECT
                p.id, p.first_name, p.last_name, p.gender, p.image_url,
                p.jersey_number, p.position, p.status,
                p.department_id, p.sport_id, p.team_id, p.sport_fest_id,
                p.created_at, p.updated_at,
                d.name  AS department_name,
                d.color AS department_color,
                d.logo_url AS department_logo,
                s.name  AS sport_name,
                t.name  AS team_name
            FROM players p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sports      s ON p.sport_id      = s.id
            LEFT JOIN teams       t ON p.team_id       = t.id
            WHERE 1 = 1
        `;
        const params = [];

        if (season_id === 'all') {

        } else if (season_id) {
            query += ' AND p.sport_fest_id = ?';
            params.push(season_id);
        } else {
            const activeId = await getActiveSportFestId();
            if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }
        }

        if (!callerRole || callerRole === 'visitor') {
            query += " AND p.status = 'approved'";
        } else if (callerRole === 'dean_adviser') {

            query += ' AND p.department_id = ?';
            params.push(req.user.department_id);
        } else {

            if (status) { query += ' AND p.status = ?'; params.push(status); }
        }

        if (department_id) { query += ' AND p.department_id = ?'; params.push(department_id); }
        if (sport_id) { query += ' AND p.sport_id = ?'; params.push(sport_id); }
        if (team_id) { query += ' AND p.team_id = ?'; params.push(team_id); }
        if (gender) { query += ' AND p.gender = ?'; params.push(gender); }

        if (search) {
            query += ' AND (p.first_name LIKE ? OR p.last_name LIKE ?)';
            const like = `%${search}%`;
            params.push(like, like);
        }

        query += ' ORDER BY d.name, p.last_name, p.first_name';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows, total: rows.length });

    } catch (err) {
        next(err);
    }
};

const getPendingPlayers = async (req, res, next) => {
    try {
        let query = `
            SELECT p.*,
                   d.name  AS department_name,
                   s.name  AS sport_name,
                   t.name  AS team_name,
                   CONCAT(u.first_name,' ',u.last_name) AS registered_by_name
            FROM players p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sports      s ON p.sport_id      = s.id
            LEFT JOIN teams       t ON p.team_id       = t.id
            LEFT JOIN users       u ON p.registered_by = u.id
            WHERE p.status = 'pending'
        `;
        const params = [];

        const activeId = await getActiveSportFestId();
        if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }

        if (req.user.role === 'dean_adviser') {
            query += ' AND p.department_id = ?';
            params.push(req.user.department_id);
        }

        query += ' ORDER BY p.created_at ASC';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};

const getApprovedPlayers = async (req, res, next) => {
    try {
        const { department_id, sport_id } = req.query;

        let query = `
            SELECT p.id, p.first_name, p.last_name, p.gender, p.image_url,
                   p.jersey_number, p.position,
                   d.name  AS department_name, d.color AS department_color,
                   s.name  AS sport_name,
                   t.name  AS team_name
            FROM players p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sports      s ON p.sport_id      = s.id
            LEFT JOIN teams       t ON p.team_id       = t.id
            WHERE p.status = 'approved'
        `;
        const params = [];

        const activeId = await getActiveSportFestId();
        if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }

        if (department_id) { query += ' AND p.department_id = ?'; params.push(department_id); }
        if (sport_id) { query += ' AND p.sport_id = ?'; params.push(sport_id); }

        query += ' ORDER BY d.name, t.name, p.jersey_number';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};

const getRejectedPlayers = async (req, res, next) => {
    try {
        let query = `
            SELECT p.*,
                   d.name AS department_name,
                   s.name AS sport_name
            FROM players p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN sports      s ON p.sport_id      = s.id
            WHERE p.status = 'rejected'
        `;
        const params = [];

        const activeId = await getActiveSportFestId();
        if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }

        if (req.user.role === 'dean_adviser') {
            query += ' AND p.department_id = ?';
            params.push(req.user.department_id);
        }

        query += ' ORDER BY p.updated_at DESC';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};

const getPlayerById = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT p.*,
                    d.name  AS department_name,
                    s.name  AS sport_name,
                    t.name  AS team_name
             FROM players p
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN sports      s ON p.sport_id      = s.id
             LEFT JOIN teams       t ON p.team_id       = t.id
             WHERE p.id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }

        if (req.user.role === 'dean_adviser' && rows[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        return res.json({ success: true, data: rows[0] });

    } catch (err) {
        next(err);
    }
};

const getPlayersBySport = async (req, res, next) => {
    try {
        const { sportId } = req.params;
        const { department_id } = req.query;

        let query = `
            SELECT p.id, p.first_name, p.last_name, p.gender,
                   p.jersey_number, p.position, p.image_url,
                   d.name  AS department_name,
                   t.name  AS team_name
            FROM players p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN teams       t ON p.team_id       = t.id
            WHERE p.sport_id = ? AND p.status = 'approved'
        `;
        const params = [sportId];

        const activeId = await getActiveSportFestId();
        if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }

        if (department_id) { query += ' AND p.department_id = ?'; params.push(department_id); }

        query += ' ORDER BY t.name, p.jersey_number';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};

const getPlayersByDepartment = async (req, res, next) => {
    try {
        const { departmentId } = req.params;
        const { sport_id } = req.query;

        let query = `
            SELECT p.id, p.first_name, p.last_name, p.jersey_number, p.position, p.image_url
            FROM players p
            WHERE p.department_id = ? AND p.status = 'approved'
        `;
        const params = [departmentId];

        const activeId = await getActiveSportFestId();
        if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }

        if (sport_id) { query += ' AND p.sport_id = ?'; params.push(sport_id); }

        query += ' ORDER BY p.first_name, p.last_name';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};

const getTeamPlayers = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT p.*,
                    d.name AS department_name,
                    s.name AS sport_name
             FROM players p
             LEFT JOIN departments d ON p.department_id = d.id
             LEFT JOIN sports      s ON p.sport_id      = s.id
             WHERE p.team_id = ?
             ORDER BY p.status DESC, p.jersey_number ASC`,
            [req.params.teamId]
        );
        return res.json({ success: true, data: rows });

    } catch (err) {
        next(err);
    }
};

const updatePlayer = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const playerId = parseInt(req.params.id);
        const { first_name, last_name, gender, jersey_number, position, team_id, image_url } = req.body;

        // Load full row so we can find sibling registrations (same person, other sports).
        const [existing] = await conn.execute(
            `SELECT id, first_name, last_name, gender, image_url,
                    department_id, sport_fest_id, status
             FROM players WHERE id = ?`,
            [playerId]
        );
        if (!existing.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }

        const current = existing[0];

        if (req.user.role === 'dean_adviser' && current.department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'You can only edit players in your department.' });
        }

        await conn.beginTransaction();

        // Sport-specific fields only update this registration row.
        await conn.execute(
            `UPDATE players
             SET first_name    = COALESCE(?, first_name),
                 last_name     = COALESCE(?, last_name),
                 gender        = COALESCE(?, gender),
                 jersey_number = ?,
                 position      = ?,
                 team_id       = ?,
                 image_url     = ?,
                 updated_at    = NOW()
             WHERE id = ?`,
            [
                first_name || null,
                last_name || null,
                gender || null,
                jersey_number || null,
                position || null,
                team_id || null,
                image_url || null,
                playerId,
            ]
        );

        // Identity fields (name, gender, photo) should stay in sync across every sport
        // this person is registered for in the same department + season.
        // Match siblings by the *previous* name so a rename still finds the other rows.
        const newFirst = (first_name != null && String(first_name).trim() !== '')
            ? String(first_name).trim() : current.first_name;
        const newLast = (last_name != null && String(last_name).trim() !== '')
            ? String(last_name).trim() : current.last_name;
        const newGender = (gender != null && String(gender).trim() !== '')
            ? gender : current.gender;
        // image_url: explicit null/empty clears; undefined keeps existing cascade value
        const newImage = image_url !== undefined
            ? (image_url || null)
            : current.image_url;

        const [sibResult] = await conn.execute(
            `UPDATE players
             SET first_name = ?,
                 last_name  = ?,
                 gender     = ?,
                 image_url  = ?,
                 updated_at = NOW()
             WHERE department_id = ?
               AND sport_fest_id <=> ?
               AND LOWER(first_name) = LOWER(?)
               AND LOWER(last_name)  = LOWER(?)
               AND id != ?`,
            [
                newFirst,
                newLast,
                newGender,
                newImage,
                current.department_id,
                current.sport_fest_id,
                current.first_name,
                current.last_name,
                playerId,
            ]
        );

        const siblingsUpdated = sibResult.affectedRows || 0;

        await conn.commit();

        await logActivity(
            req.user.id,
            'PLAYER_UPDATED',
            'player',
            playerId,
            `Player updated: ID ${playerId}` +
            (siblingsUpdated ? ` (+${siblingsUpdated} other sport registration(s) identity synced)` : '')
        );

        const message = siblingsUpdated
            ? `Player updated. Name/gender/photo also synced to ${siblingsUpdated} other sport registration(s).`
            : 'Player updated successfully.';

        return res.json({
            success: true,
            message,
            data: { siblings_updated: siblingsUpdated },
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const updatePlayerStatus = async (req, res, next) => {
    try {
        const playerId = parseInt(req.params.id);
        const { status, reason } = req.body;

        const VALID = ['approved', 'rejected', 'pending'];
        if (!VALID.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${VALID.join(', ')}`,
            });
        }

        const [rows] = await pool.execute(
            'SELECT id, department_id, first_name, last_name, team_id, sport_id FROM players WHERE id = ?',
            [playerId]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }

        const player = rows[0];

        if (req.user.role === 'dean_adviser' && player.department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        if (status === 'approved') {
            if (player.team_id) {
                const conn = await pool.getConnection();
                try {
                    await conn.beginTransaction();
                    const [lockedTeam] = await conn.execute(
                        `SELECT t.id, s.max_players
                         FROM teams t JOIN sports s ON s.id = t.sport_id
                         WHERE t.id = ? FOR UPDATE`,
                        [player.team_id]
                    );
                    if (!lockedTeam.length) {
                        await conn.rollback();
                        return res.status(404).json({ success: false, message: 'Team not found.' });
                    }
                    const [lockedPlayer] = await conn.execute(
                        `SELECT id, status FROM players
                         WHERE id = ? AND team_id = ? FOR UPDATE`,
                        [playerId, player.team_id]
                    );
                    if (!lockedPlayer.length) {
                        await conn.rollback();
                        return res.status(409).json({
                            success: false,
                            message: 'Player team changed. Reload the roster and try again.',
                        });
                    }
                    const [[{ approved_count: approvedCount }]] = await conn.execute(
                        `SELECT COUNT(*) AS approved_count
                         FROM players WHERE team_id = ? AND status = 'approved'`,
                        [player.team_id]
                    );
                    if (lockedPlayer[0].status !== 'approved'
                        && lockedTeam[0].max_players != null
                        && approvedCount >= lockedTeam[0].max_players) {
                        await conn.rollback();
                        return res.status(400).json({
                            success: false,
                            message: 'Cannot approve. Team is already at the maximum roster limit.',
                        });
                    }
                    await conn.execute(
                        `UPDATE players
                         SET status = 'approved', rejection_reason = NULL, updated_at = NOW()
                         WHERE id = ? AND team_id = ?`,
                        [playerId, player.team_id]
                    );
                    await conn.commit();
                } catch (err) {
                    await conn.rollback();
                    throw err;
                } finally {
                    conn.release();
                }
            } else {
                const [result] = await pool.execute(
                    `UPDATE players
                     SET status = 'approved', rejection_reason = NULL, updated_at = NOW()
                     WHERE id = ? AND team_id IS NULL`,
                    [playerId]
                );
                if (!result.affectedRows) {
                    return res.status(409).json({
                        success: false,
                        message: 'Player team changed. Reload the roster and try again.',
                    });
                }
            }
        } else {
            await pool.execute(
                `UPDATE players
                 SET status = ?,
                     rejection_reason = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [status, status === 'rejected' ? (reason || null) : null, playerId]
            );
        }

        const action =
            status === 'approved' ? 'PLAYER_APPROVED' :
                status === 'rejected' ? 'PLAYER_REJECTED' : 'PLAYER_PENDING';

        await logActivity(
            req.user.id,
            action,
            'player',
            playerId,
            `Player ${status}: ${player.first_name} ${player.last_name}${reason ? ` — ${reason}` : ''}`
        );

        return res.json({ success: true, message: `Player ${status} successfully.` });
    } catch (err) {
        next(err);
    }
};

const checkEligibility = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT p.*,
                    s.min_players, s.max_players, s.category,
                    d.name AS department_name
             FROM players p
             LEFT JOIN sports s ON p.sport_id = s.id
             LEFT JOIN departments d ON p.department_id = d.id
             WHERE p.id = ?`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }

        const player = rows[0];
        const issues = [];

        if (!player.sport_id) issues.push('No sport assigned.');
        if (!player.gender) issues.push('Gender not specified.');
        if (!player.first_name || !player.last_name) issues.push('Incomplete name.');

        const [dups] = await pool.execute(
            `SELECT COUNT(*) AS count FROM players
             WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
               AND department_id = ? AND sport_id = ? AND id != ? AND status = 'approved'
               AND sport_fest_id <=> ?`,
            [player.first_name, player.last_name, player.department_id, player.sport_id, player.id, player.sport_fest_id]
        );
        if (dups[0].count > 0) issues.push('Duplicate registration detected for the same sport this season.');

        return res.json({
            success: true,
            data: {
                player_id: player.id,
                name: `${player.first_name} ${player.last_name}`,
                department: player.department_name,
                is_eligible: issues.length === 0,
                issues,
                current_status: player.status,
            },
        });

    } catch (err) {
        next(err);
    }
};

const importPlayers = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        if (!req.user || !['dean_adviser', 'admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only a department dean/adviser or an admin can import players.',
            });
        }

        const { players } = req.body;
        const department_id = req.user.role === 'dean_adviser'
            ? req.user.department_id
            : req.body.department_id;

        // Optional batch-level default: sport(s) to apply to any row that doesn't
        // specify its own sport_id / sport_ids. Lets the "Quick Add Roster" UI pick
        // one or more sports once and enter names without retyping the sport per row.
        const { sport_ids: batchSportIds } = req.body;
        const defaultSportIds = Array.isArray(batchSportIds)
            ? batchSportIds.map(id => parseInt(id, 10)).filter(id => Number.isInteger(id) && id > 0)
            : [];

        if (!Array.isArray(players) || !players.length) {
            return res.status(400).json({ success: false, message: 'players array is required.' });
        }
        if (!department_id) {
            return res.status(400).json({ success: false, message: 'department_id is required.' });
        }

        const sportFestId = await getActiveSportFestId();
        if (!sportFestId) {
            return res.status(400).json({
                success: false,
                message: 'No active Sport Fest season. Ask an admin to start a season before importing players.',
            });
        }

        await conn.beginTransaction();

        // Dean/adviser (and admin) bulk imports are auto-approved, same as single register.
        const autoApprove = ['dean_adviser', 'admin'].includes(req.user.role);
        const insertStatus = autoApprove ? 'approved' : 'pending';

        const results = { inserted: 0, skipped: 0, errors: [], possible_duplicates: [] };

        for (const p of players) {
            const rowSportIds = [...new Set(
                (Array.isArray(p.sport_ids) && p.sport_ids.length
                    ? p.sport_ids
                    : (p.sport_id != null ? [p.sport_id] : defaultSportIds)
                ).map(id => parseInt(id, 10)).filter(id => Number.isInteger(id) && id > 0)
            )];

            if (!p.first_name || !p.last_name || !p.gender || !rowSportIds.length) {
                results.errors.push(`Skipped: missing fields for ${p.first_name || 'unknown'} ${p.last_name || ''}`);
                results.skipped++;
                continue;
            }

            // Explicit team only for single-sport rows; otherwise auto-match by gender.
            const explicitTeamForRow = rowSportIds.length === 1 ? (p.team_id || null) : null;

            for (const sid of rowSportIds) {
                const [dup] = await conn.execute(
                    `SELECT id FROM players
                     WHERE LOWER(first_name)=LOWER(?) AND LOWER(last_name)=LOWER(?)
                       AND department_id=? AND sport_id=? AND sport_fest_id=?`,
                    [p.first_name.trim(), p.last_name.trim(), department_id, sid, sportFestId]
                );
                if (dup.length) {
                    results.skipped++;
                    results.errors.push(`Duplicate skipped: ${p.first_name} ${p.last_name}`);
                    continue;
                }

                let teamIdForRow = explicitTeamForRow;
                if (!teamIdForRow) {
                    teamIdForRow = await findMatchingTeamId(conn, {
                        department_id: parseInt(department_id, 10),
                        sport_id: sid,
                        sport_fest_id: sportFestId,
                        gender: p.gender,
                    });
                }

                await conn.execute(
                    `INSERT INTO players
                     (first_name, last_name, gender, department_id, sport_id,
                      team_id, jersey_number, position, status, registered_by, sport_fest_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        p.first_name.trim(), p.last_name.trim(), p.gender,
                        department_id, sid,
                        teamIdForRow, p.jersey_number || null, p.position || null,
                        insertStatus, req.user.id, sportFestId,
                    ]
                );
                results.inserted++;
            }
        }

        await conn.commit();

        await logActivity(
            req.user.id,
            'PLAYERS_IMPORTED',
            'player',
            null,
            `Bulk import: ${results.inserted} inserted${autoApprove ? ' (auto-approved)' : ''}, ${results.skipped} skipped`
        );

        return res.status(201).json({
            success: true,
            message: `Import complete: ${results.inserted} registration(s) added${autoApprove ? ' and auto-approved' : ''}, ${results.skipped} skipped.`,
            data: { ...results, auto_approved: autoApprove },
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const deletePlayer = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const playerId = parseInt(req.params.id);

        const [rows] = await conn.execute(
            'SELECT id, first_name, last_name FROM players WHERE id = ?',
            [playerId]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }

        await conn.beginTransaction();
        await conn.execute('DELETE FROM players WHERE id = ?', [playerId]);
        await conn.commit();

        await logActivity(
            req.user.id,
            'PLAYER_DELETED',
            'player',
            playerId,
            `Player deleted: ${rows[0].first_name} ${rows[0].last_name}`
        );

        return res.json({ success: true, message: 'Player deleted successfully.' });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

const removeFromTeam = async (req, res, next) => {
    try {
        const playerId = parseInt(req.params.id);

        const [rows] = await pool.execute('SELECT id, department_id FROM players WHERE id = ?', [playerId]);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }
        if (req.user.role === 'dean_adviser' && rows[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        await pool.execute('UPDATE players SET team_id = NULL, updated_at = NOW() WHERE id = ?', [playerId]);

        return res.json({ success: true, message: 'Player removed from team.' });

    } catch (err) {
        next(err);
    }
};

const checkDuplicate = async (req, res, next) => {
    try {
        const { first_name, last_name, department_id, sport_id } = req.query;
        if (!first_name || !last_name || !department_id) {
            return res.status(400).json({ success: false, message: 'first_name, last_name, and department_id are required.' });
        }
        if (req.user.role === 'dean_adviser' && req.user.department_id !== parseInt(department_id)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const sportFestId = await getActiveSportFestId();

        const [matches] = await pool.execute(
            `SELECT p.id, p.status, p.team_id, p.sport_id, s.name AS sport_name, t.name AS team_name
             FROM players p
             LEFT JOIN sports s ON p.sport_id = s.id
             LEFT JOIN teams  t ON p.team_id  = t.id
             WHERE LOWER(p.first_name) = LOWER(?) AND LOWER(p.last_name) = LOWER(?)
               AND p.department_id = ? AND p.sport_fest_id <=> ?`,
            [String(first_name).trim(), String(last_name).trim(), department_id, sportFestId]
        );

        const sameSport = sport_id ? matches.filter(m => String(m.sport_id) === String(sport_id)) : [];
        const otherSports = sport_id ? matches.filter(m => String(m.sport_id) !== String(sport_id)) : matches;

        return res.json({
            success: true,
            data: {
                exact_duplicate: sameSport.length > 0,
                possible_duplicates: otherSports.map(m => ({
                    player_id: m.id, sport: m.sport_name, team: m.team_name, status: m.status,
                })),
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    registerPlayer,
    publicRegisterPlayer,
    getAllPlayers,
    getPendingPlayers,
    getApprovedPlayers,
    getRejectedPlayers,
    getPlayerById,
    getPlayersBySport,
    getPlayersByDepartment,
    getTeamPlayers,
    updatePlayer,
    updatePlayerStatus,
    checkEligibility,
    checkDuplicate,
    importPlayers,
    deletePlayer,
    removeFromTeam,
};