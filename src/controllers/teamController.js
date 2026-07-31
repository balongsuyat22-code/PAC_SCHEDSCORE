/**
 * TEAM CONTROLLER
 * Teams belong to a department and a sport.
 *
 * Who does what:
 *   dean_adviser  → create/edit teams for their own dept; manage roster (add/remove players)
 *   admin         → full CRUD
 *   sgo_president → read (for bracket seeding)
 *   sgo_officer   → read (for scoring context)
 *   visitor       → read approved teams
 *
 * SEASON NOTE: teams now carry a sport_fest_id stamped at creation time
 * (utils/season.js). "Current roster" endpoints default to the active
 * season so an archived season's teams don't clutter today's lists, and
 * the Men/Women/Mixed gender-conflict check is scoped per season so a
 * department can field a "Men" team again next year even if one existed
 * in a completed season.
 */

const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { getActiveSportFestId } = require('../utils/season');

// ---------------------------------------------------------------------------
// GET ALL TEAMS — active season only by default
// GET /api/teams
// Query: sport_id, department_id, gender, player_gender, season_id
// Protected: all roles
// ---------------------------------------------------------------------------
const getAll = async (req, res, next) => {
    try {
        const { sport_id, department_id, gender, player_gender, season_id } = req.query;
        const callerRole = req.user?.role;

        let query = `
            SELECT
                t.*,
                d.name  AS department_name,
                d.color AS department_color,
                s.name  AS sport_name,
                s.max_players AS sport_max_players,
                s.icon  AS sport_icon,
                (SELECT COUNT(*) FROM players WHERE team_id = t.id AND status = 'approved') AS approved_count,
                (SELECT COUNT(*) FROM players WHERE team_id = t.id)                          AS total_count
            FROM teams t
            JOIN departments d ON t.department_id = d.id
            LEFT JOIN sports s ON t.sport_id = s.id
            WHERE 1 = 1
        `;
        const params = [];

        if (season_id === 'all') {
            // no filter — show every season
        } else if (season_id) {
            query += ' AND t.sport_fest_id = ?';
            params.push(season_id);
        } else {
            const activeId = await getActiveSportFestId();
            if (activeId) { query += ' AND t.sport_fest_id = ?'; params.push(activeId); }
        }

        // Dean sees their dept only
        if (callerRole === 'dean_adviser') {
            query += ' AND t.department_id = ?';
            params.push(req.user.department_id);
        }

        if (sport_id) { query += ' AND t.sport_id = ?'; params.push(sport_id); }
        if (department_id) { query += ' AND t.department_id = ?'; params.push(department_id); }
        if (gender) { query += ' AND t.gender = ?'; params.push(gender); }

        if (player_gender) {
            const genderMap = { Male: 'Men', Female: 'Women' };
            const mapped = genderMap[player_gender] || player_gender;
            query += ' AND (t.gender = ? OR t.gender = ?)';
            params.push(mapped, 'Mixed');
        }

        query += ' ORDER BY d.name, t.name';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET SINGLE PLAYERS (players not yet assigned to a team) — active season only
// GET /api/teams/singles
// Protected: dean_adviser | admin
// ---------------------------------------------------------------------------
const getSingles = async (req, res, next) => {
    try {
        const { sport_id, department_id } = req.query;

        let query = `
            SELECT p.*,
                   d.name  AS department_name,
                   d.color AS department_color,
                   s.name  AS sport_name,
                   s.icon  AS sport_icon,
                   s.max_players
            FROM players p
            JOIN departments d ON p.department_id = d.id
            JOIN sports      s ON p.sport_id      = s.id
            WHERE p.team_id IS NULL
        `;
        const params = [];

        const activeId = await getActiveSportFestId();
        if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }

        if (req.user.role === 'dean_adviser') {
            query += ' AND p.department_id = ?';
            params.push(req.user.department_id);
        } else if (department_id) {
            query += ' AND p.department_id = ?';
            params.push(department_id);
        }

        if (sport_id) { query += ' AND p.sport_id = ?'; params.push(sport_id); }

        query += ' ORDER BY p.status DESC, p.created_at ASC';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET ONE TEAM (with players)
// GET /api/teams/:id
// Protected: all authenticated roles
// ---------------------------------------------------------------------------
const getOne = async (req, res, next) => {
    try {
        const [team] = await pool.execute(
            `SELECT t.*,
                    d.name AS department_name,
                    s.name AS sport_name,
                    s.max_players
             FROM teams t
             JOIN departments d ON t.department_id = d.id
             LEFT JOIN sports s ON t.sport_id = s.id
             WHERE t.id = ?`,
            [req.params.id]
        );

        if (!team.length) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }

        // Dean/Adviser: dept check (optional chaining — this route may be
        // hit without req.user set, e.g. a public/visitor request)
        if (req.user?.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const [players] = await pool.execute(
            'SELECT * FROM players WHERE team_id = ? ORDER BY status DESC, jersey_number',
            [req.params.id]
        );

        return res.json({ success: true, data: { ...team[0], players } });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// CREATE TEAM  (Dean/Adviser own dept | Admin)
// POST /api/teams
// Body: { name, department_id, sport_id, gender, coach_name, logo_url }
// ---------------------------------------------------------------------------
const create = async (req, res, next) => {
    try {
        const { name, department_id, sport_id, gender, coach_name, logo_url } = req.body;

        if (!name || !department_id || !sport_id || !gender) {
            return res.status(400).json({
                success: false,
                message: 'name, department_id, sport_id, and gender are required.',
            });
        }

        const sportFestId = await getActiveSportFestId();
        if (!sportFestId) {
            return res.status(400).json({
                success: false,
                message: 'No active Sport Fest season. Ask an admin to start a season before creating teams.',
            });
        }

        // Dean can only create for their dept
        const effectiveDeptId = req.user.role === 'dean_adviser'
            ? req.user.department_id
            : parseInt(department_id);

        if (req.user.role === 'dean_adviser' && effectiveDeptId !== parseInt(department_id)) {
            return res.status(403).json({ success: false, message: 'You can only create teams for your own department.' });
        }

        // Gender conflict checks — scoped to THIS season only, so a Men/Women/Mixed
        // team from an archived season never blocks the same sport next season.
        const [existingTeams] = await pool.execute(
            'SELECT gender FROM teams WHERE department_id = ? AND sport_id = ? AND sport_fest_id = ?',
            [effectiveDeptId, sport_id, sportFestId]
        );
        const existingGenders = existingTeams.map(t => t.gender.toLowerCase());
        const newGender = gender.toLowerCase();

        if (newGender === 'mixed' && (existingGenders.includes('men') || existingGenders.includes('women'))) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create a Mixed team — Men/Women teams already exist for this sport this season.',
            });
        }
        if ((newGender === 'men' || newGender === 'women') && existingGenders.includes('mixed')) {
            return res.status(400).json({
                success: false,
                message: `Cannot create a ${gender} team — a Mixed team already exists for this sport this season.`,
            });
        }
        if (existingGenders.includes(newGender)) {
            return res.status(400).json({
                success: false,
                message: `A ${gender} team for this sport already exists in this department this season.`,
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO teams (name, department_id, sport_id, gender, coach_name, logo_url, sport_fest_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, effectiveDeptId, sport_id, gender, coach_name || null, logo_url || null, sportFestId]
        );

        await logActivity(req.user.id, 'TEAM_CREATED', 'team', result.insertId, `Team created: ${name} (${gender})`);

        return res.status(201).json({
            success: true,
            message: 'Team created successfully.',
            data: { id: result.insertId },
        });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// UPDATE TEAM  (Dean own dept | Admin)
// PUT /api/teams/:id
// ---------------------------------------------------------------------------
const update = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id);
        const { name, department_id, sport_id, gender, coach_name, logo_url } = req.body;

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found.' });

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Gender conflict (exclude self), scoped to the team's own season
        const [existingTeams] = await pool.execute(
            'SELECT gender FROM teams WHERE department_id = ? AND sport_id = ? AND id != ? AND sport_fest_id = ?',
            [department_id, sport_id, teamId, team[0].sport_fest_id]
        );
        const existingGenders = existingTeams.map(t => t.gender.toLowerCase());
        const newGender = gender.toLowerCase();

        if (newGender === 'mixed' && (existingGenders.includes('men') || existingGenders.includes('women'))) {
            return res.status(400).json({ success: false, message: 'Cannot switch to Mixed — Men/Women teams exist this season.' });
        }
        if ((newGender === 'men' || newGender === 'women') && existingGenders.includes('mixed')) {
            return res.status(400).json({ success: false, message: `Cannot switch to ${gender} — a Mixed team exists this season.` });
        }
        if (existingGenders.includes(newGender)) {
            return res.status(400).json({ success: false, message: `A ${gender} team already exists for this sport this season.` });
        }

        await pool.execute(
            'UPDATE teams SET name=?, department_id=?, sport_id=?, gender=?, coach_name=?, logo_url=?, updated_at=NOW() WHERE id=?',
            [name, department_id, sport_id, gender, coach_name || null, logo_url || null, teamId]
        );

        await logActivity(req.user.id, 'TEAM_UPDATED', 'team', teamId, `Team updated: ${name}`);
        return res.json({ success: true, message: 'Team updated successfully.' });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// ADD PLAYER TO TEAM  (Dean own dept | Admin)
// POST /api/teams/:id/members
// Body: { player_id }
// ---------------------------------------------------------------------------
const addMember = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id);
        const { player_id } = req.body;

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found.' });

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Verify player is from the same dept
        const [player] = await pool.execute('SELECT department_id, sport_fest_id FROM players WHERE id = ?', [player_id]);
        if (!player.length) return res.status(404).json({ success: false, message: 'Player not found.' });
        if (player[0].department_id !== team[0].department_id) {
            return res.status(400).json({ success: false, message: 'Player must be from the same department as the team.' });
        }
        if (player[0].sport_fest_id !== team[0].sport_fest_id) {
            return res.status(400).json({ success: false, message: 'Player and team belong to different seasons.' });
        }

        // Check capacity + assign atomically — same TOCTOU fix as
        // playerController.updatePlayerStatus: read-then-write on a COUNT
        // lets two concurrent adds both slip in when the team has exactly
        // one slot left.
        const [claim] = await pool.execute(
            `UPDATE players p
             JOIN sports s ON s.id = ?
             SET p.team_id = ?, p.updated_at = NOW()
             WHERE p.id = ?
               AND (SELECT COUNT(*) FROM players WHERE team_id = ? AND status = 'approved') < s.max_players`,
            [team[0].sport_id, teamId, player_id, teamId]
        );
        if (claim.affectedRows === 0) {
            const [sport] = await pool.execute('SELECT max_players FROM sports WHERE id = ?', [team[0].sport_id]);
            return res.status(400).json({
                success: false,
                message: `Team is at max capacity (${sport[0]?.max_players ?? '?'} approved players).`,
            });
        }

        return res.json({ success: true, message: 'Player added to team.' });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// REMOVE PLAYER FROM TEAM  (Dean own dept | Admin)
// DELETE /api/teams/:id/members/:playerId
// ---------------------------------------------------------------------------
const removeMember = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id);
        const playerId = parseInt(req.params.playerId);

        const [team] = await pool.execute('SELECT department_id FROM teams WHERE id = ?', [teamId]);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found.' });

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        await pool.execute('UPDATE players SET team_id = NULL, updated_at = NOW() WHERE id = ? AND team_id = ?', [playerId, teamId]);
        return res.json({ success: true, message: 'Player removed from team.' });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// UPDATE PLAYER STATUS WITHIN TEAM  (approve / reject within dept — Dean | Admin)
// PATCH /api/teams/:id/members/:playerId/status
// Body: { status: 'approved' | 'rejected' | 'pending' }
// ---------------------------------------------------------------------------
const updatePlayerStatus = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id);
        const playerId = parseInt(req.params.playerId);
        const { status } = req.body;

        const VALID = ['approved', 'rejected', 'pending'];
        if (!VALID.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${VALID.join(', ')}` });
        }

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found.' });

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        if (status === 'approved') {
            const [claim] = await pool.execute(
                `UPDATE players p
                 JOIN teams t ON t.id = ?
                 JOIN sports s ON t.sport_id = s.id
                 SET p.status = 'approved', p.updated_at = NOW()
                 WHERE p.id = ? AND p.team_id = ?
                   AND (SELECT COUNT(*) FROM players WHERE team_id = ? AND status = 'approved') < s.max_players`,
                [teamId, playerId, teamId, teamId]
            );
            if (claim.affectedRows === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot approve. Max roster limit reached (or player not on this team).',
                });
            }
            return res.json({ success: true, message: 'Player marked as approved.' });
        }

        await pool.execute('UPDATE players SET status = ?, updated_at = NOW() WHERE id = ? AND team_id = ?', [status, playerId, teamId]);
        return res.json({ success: true, message: `Player marked as ${status}.` });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// SUBMIT TEAM ROSTER  (Dean finalizes lineup — marks all approved players as confirmed)
// POST /api/teams/:id/submit-roster
// Protected: dean_adviser (own dept) | admin
// ---------------------------------------------------------------------------
const submitRoster = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id);

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found.' });

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const [sport] = await pool.execute('SELECT min_players, max_players FROM sports WHERE id = ?', [team[0].sport_id]);
        const [count] = await pool.execute(
            "SELECT COUNT(*) AS c FROM players WHERE team_id = ? AND status = 'approved'",
            [teamId]
        );

        if (sport[0] && count[0].c < sport[0].min_players) {
            return res.status(400).json({
                success: false,
                message: `Need at least ${sport[0].min_players} approved players to submit roster. Currently have ${count[0].c}.`,
            });
        }

        await pool.execute('UPDATE teams SET roster_submitted = 1, updated_at = NOW() WHERE id = ?', [teamId]);

        await logActivity(req.user.id, 'ROSTER_SUBMITTED', 'team', teamId, `Roster submitted for team ID ${teamId}`);

        return res.json({ success: true, message: 'Team roster submitted successfully.' });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// DELETE TEAM  (Admin only)
// DELETE /api/teams/:id
// ---------------------------------------------------------------------------
const remove = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id);

        // Same guard departmentController.remove() already had — a team
        // that's an active participant (or has matches scheduled) shouldn't
        // vanish out from under a tournament in progress.
        const [active] = await pool.execute(
            `SELECT COUNT(*) AS count FROM matches m
             JOIN teams t ON t.id = ?
             WHERE (m.participant_a_department_id = t.department_id OR m.participant_b_department_id = t.department_id)
               AND m.sport_id = t.sport_id
               AND m.status IN ('scheduled', 'ongoing')`,
            [teamId]
        );
        if (active[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a team that has scheduled or ongoing matches.',
            });
        }

        // Unlink players first
        await pool.execute('UPDATE players SET team_id = NULL WHERE team_id = ?', [teamId]);
        await pool.execute('DELETE FROM teams WHERE id = ?', [teamId]);

        await logActivity(req.user.id, 'TEAM_DELETED', 'team', teamId, `Team deleted: ID ${teamId}`);

        return res.json({ success: true, message: 'Team deleted successfully.' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getSingles,
    getOne,
    create,
    update,
    addMember,
    removeMember,
    updatePlayerStatus,
    submitRoster,
    remove,
};