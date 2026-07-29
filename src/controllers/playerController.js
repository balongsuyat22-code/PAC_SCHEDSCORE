/**
 * PLAYER CONTROLLER
 * Players are DATA RECORDS (not user accounts) managed by dean_adviser.
 *
 * Who does what:
 *   dean_adviser  → registerPlayer, editPlayerInfo, removePlayer, viewRegisteredPlayers,
 *                   checkEligibility, approveRegistration (within their dept),
 *                   importPlayerList, validateRegistration
 *   admin         → full access; approveRegistration globally; deletePlayer
 *   sgo_president → read-only: view approved players for bracket seeding
 *   sgo_officer   → read-only: view approved players for scoring/MVP selection
 *   visitor       → read-only: approved players only (public leaderboard context)
 *
 * SEASON NOTE: players now carry a sport_fest_id stamped at registration
 * time (utils/season.js). All "current roster" endpoints below default to
 * the active season so archived seasons' rosters don't clutter today's
 * lists. Pass ?season_id=<id> to look at a specific past season instead.
 */

const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { getActiveSportFestId } = require('../utils/season');

// ---------------------------------------------------------------------------
// REGISTER PLAYER  (Dean/Adviser registers on behalf of their department)
// POST /api/players
// Body: { first_name, last_name, gender, department_id, sport_id, team_id,
//         jersey_number, position, image_url }
// Protected: dean_adviser (own dept) | admin
// ---------------------------------------------------------------------------
const registerPlayer = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const {
            first_name, last_name, gender,
            department_id, sport_id, team_id,
            jersey_number, position, image_url,
        } = req.body;

        if (!first_name || !last_name || !gender || !department_id || !sport_id) {
            return res.status(400).json({
                success: false,
                message: 'first_name, last_name, gender, department_id, and sport_id are required.',
            });
        }

        // Dean/Adviser can only register players for their own department
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

        // Prevent duplicate: same name + dept + sport, WITHIN THIS SEASON.
        // (Scoped by season so a player who played last year can register again.)
        const [duplicate] = await conn.execute(
            `SELECT id FROM players
             WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
               AND department_id = ? AND sport_id = ? AND sport_fest_id = ?`,
            [first_name.trim(), last_name.trim(), department_id, sport_id, sportFestId]
        );
        if (duplicate.length) {
            await conn.rollback();
            return res.status(409).json({
                success: false,
                message: 'A player with this name is already registered for this sport in this department this season.',
            });
        }

        const [result] = await conn.execute(
            `INSERT INTO players
             (first_name, last_name, gender, image_url, department_id,
              sport_id, team_id, jersey_number, position, status, registered_by, sport_fest_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [
                first_name.trim(),
                last_name.trim(),
                gender,
                image_url || null,
                department_id,
                sport_id,
                team_id || null,
                jersey_number || null,
                position || null,
                req.user.id,
                sportFestId,
            ]
        );

        await conn.commit();

        await logActivity(
            req.user.id,
            'PLAYER_REGISTERED',
            'player',
            result.insertId,
            `Player registered: ${first_name} ${last_name} (pending approval)`
        );

        return res.status(201).json({
            success: true,
            message: 'Player registered successfully. Waiting for approval.',
            data: { id: result.insertId },
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// ---------------------------------------------------------------------------
// GET ALL PLAYERS
// GET /api/players
// Query: department_id, sport_id, team_id, status, gender, search, season_id
// Protected: all roles (visitors see approved only)
// Defaults to the ACTIVE season. Pass ?season_id=<id> for an archived one,
// or ?season_id=all to see every season at once.
// ---------------------------------------------------------------------------
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
            // no season filter — show every season
        } else if (season_id) {
            query += ' AND p.sport_fest_id = ?';
            params.push(season_id);
        } else {
            const activeId = await getActiveSportFestId();
            if (activeId) { query += ' AND p.sport_fest_id = ?'; params.push(activeId); }
        }

        // Visitors and unauthenticated: approved only
        if (!callerRole || callerRole === 'visitor') {
            query += " AND p.status = 'approved'";
        } else if (callerRole === 'dean_adviser') {
            // Dean sees their department only
            query += ' AND p.department_id = ?';
            params.push(req.user.department_id);
        } else {
            // Admin / sgo_president / sgo_officer: respect filters
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

// ---------------------------------------------------------------------------
// GET PENDING PLAYERS  (for approval queue) — active season only
// GET /api/players/pending
// Protected: admin | dean_adviser (own dept)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET APPROVED PLAYERS  (public-friendly endpoint) — active season only
// GET /api/players/approved
// Protected: all roles including visitor
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET REJECTED PLAYERS — active season only
// GET /api/players/rejected
// Protected: admin | dean_adviser (own dept)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET ONE PLAYER
// GET /api/players/:id
// Protected: all authenticated roles
// ---------------------------------------------------------------------------
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

        // Dean/Adviser can only view players from their dept
        if (req.user.role === 'dean_adviser' && rows[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        return res.json({ success: true, data: rows[0] });

    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// GET PLAYERS BY SPORT — active season only
// GET /api/players/by-sport/:sportId
// Protected: all authenticated roles
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET PLAYERS BY DEPARTMENT  (for MVP selection in match scoring) — active season
// GET /api/players/by-department/:departmentId
// Protected: sgo_officer | sgo_president | admin
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET TEAM PLAYERS
// GET /api/players/by-team/:teamId
// Protected: all authenticated roles
// (No season filter needed — a team belongs to exactly one season already,
// so its players are inherently scoped correctly.)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// UPDATE PLAYER INFO  (Dean/Adviser edits their own player; admin edits any)
// PUT /api/players/:id
// Body: { first_name, last_name, gender, jersey_number, position, team_id, image_url }
// Protected: dean_adviser (own dept) | admin
// ---------------------------------------------------------------------------
const updatePlayer = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const playerId = parseInt(req.params.id);
        const { first_name, last_name, gender, jersey_number, position, team_id, image_url } = req.body;

        // Verify player exists and check dept restriction
        const [existing] = await conn.execute(
            'SELECT id, department_id, status FROM players WHERE id = ?',
            [playerId]
        );
        if (!existing.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }

        if (req.user.role === 'dean_adviser' && existing[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'You can only edit players in your department.' });
        }

        await conn.beginTransaction();

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

        await conn.commit();

        await logActivity(req.user.id, 'PLAYER_UPDATED', 'player', playerId, `Player updated: ID ${playerId}`);

        return res.json({ success: true, message: 'Player updated successfully.' });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// ---------------------------------------------------------------------------
// APPROVE / REJECT PLAYER  (Updates registration status)
// PATCH /api/players/:id/status
// Body: { status: 'approved' | 'rejected', reason? }
// Protected: dean_adviser (own dept, for pre-check) | admin (final approval)
// ---------------------------------------------------------------------------
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

        // On approval, enforce max player limit per sport
        if (status === 'approved') {
            if (player.team_id) {
                const [limitRes] = await pool.execute(
                    `SELECT s.max_players,
                            (SELECT COUNT(*) FROM players WHERE team_id = ? AND status = 'approved') AS current_approved
                     FROM teams t
                     JOIN sports s ON t.sport_id = s.id
                     WHERE t.id = ?`,
                    [player.team_id, player.team_id]
                );
                if (limitRes.length && limitRes[0].current_approved >= limitRes[0].max_players) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot approve. Team is already at the maximum roster limit of ${limitRes[0].max_players}.`,
                    });
                }
            }
        }

        await pool.execute(
            'UPDATE players SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
            [status, reason || null, playerId]
        );

        const action = status === 'approved' ? 'PLAYER_APPROVED' : status === 'rejected' ? 'PLAYER_REJECTED' : 'PLAYER_PENDING';
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

// ---------------------------------------------------------------------------
// CHECK ELIGIBILITY  (validates a player against sport rules)
// GET /api/players/:id/eligibility
// Protected: dean_adviser | admin
// ---------------------------------------------------------------------------
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

        // Check for duplicate registration in same sport, same season
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

// ---------------------------------------------------------------------------
// IMPORT PLAYERS (bulk registration from a JSON array)
// POST /api/players/import
// Body: { players: [ { first_name, last_name, gender, sport_id, team_id?, jersey_number?, position? } ] }
// Protected: dean_adviser (own dept) | admin
// ---------------------------------------------------------------------------
const importPlayers = async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const { players } = req.body;
        const department_id = req.user.role === 'dean_adviser'
            ? req.user.department_id
            : req.body.department_id;

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

        const results = { inserted: 0, skipped: 0, errors: [] };

        for (const p of players) {
            if (!p.first_name || !p.last_name || !p.gender || !p.sport_id) {
                results.errors.push(`Skipped: missing fields for ${p.first_name || 'unknown'} ${p.last_name || ''}`);
                results.skipped++;
                continue;
            }

            // Check duplicate within this season
            const [dup] = await conn.execute(
                `SELECT id FROM players
                 WHERE LOWER(first_name)=LOWER(?) AND LOWER(last_name)=LOWER(?)
                   AND department_id=? AND sport_id=? AND sport_fest_id=?`,
                [p.first_name.trim(), p.last_name.trim(), department_id, p.sport_id, sportFestId]
            );
            if (dup.length) {
                results.skipped++;
                results.errors.push(`Duplicate skipped: ${p.first_name} ${p.last_name}`);
                continue;
            }

            await conn.execute(
                `INSERT INTO players
                 (first_name, last_name, gender, department_id, sport_id,
                  team_id, jersey_number, position, status, registered_by, sport_fest_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
                [
                    p.first_name.trim(), p.last_name.trim(), p.gender,
                    department_id, p.sport_id,
                    p.team_id || null, p.jersey_number || null, p.position || null,
                    req.user.id, sportFestId,
                ]
            );
            results.inserted++;
        }

        await conn.commit();

        await logActivity(
            req.user.id,
            'PLAYERS_IMPORTED',
            'player',
            null,
            `Bulk import: ${results.inserted} inserted, ${results.skipped} skipped`
        );

        return res.status(201).json({
            success: true,
            message: `Import complete: ${results.inserted} players added, ${results.skipped} skipped.`,
            data: results,
        });

    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

// ---------------------------------------------------------------------------
// DELETE PLAYER  (Hard delete — admin only)
// DELETE /api/players/:id
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// REMOVE PLAYER FROM TEAM  (dean_adviser own dept | admin)
// PATCH /api/players/:id/remove-from-team
// ---------------------------------------------------------------------------
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

module.exports = {
    registerPlayer,
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
    importPlayers,
    deletePlayer,
    removeFromTeam,
};