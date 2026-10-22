const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { getActiveSportFestId } = require('../utils/season');

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
            // no season filter
        } else if (season_id) {
            query += ' AND t.sport_fest_id = ?';
            params.push(season_id);
        } else {
            const activeId = await getActiveSportFestId();
            if (activeId) {
                query += ' AND t.sport_fest_id = ?';
                params.push(activeId);
            }
        }

        if (callerRole === 'dean_adviser') {
            query += ' AND t.department_id = ?';
            params.push(req.user.department_id);
        }

        if (sport_id) {
            query += ' AND t.sport_id = ?';
            params.push(sport_id);
        }
        if (department_id) {
            query += ' AND t.department_id = ?';
            params.push(department_id);
        }
        if (gender) {
            query += ' AND t.gender = ?';
            params.push(gender);
        }

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
        if (activeId) {
            query += ' AND p.sport_fest_id = ?';
            params.push(activeId);
        }

        if (req.user.role === 'dean_adviser') {
            query += ' AND p.department_id = ?';
            params.push(req.user.department_id);
        } else if (department_id) {
            query += ' AND p.department_id = ?';
            params.push(department_id);
        }

        if (sport_id) {
            query += ' AND p.sport_id = ?';
            params.push(sport_id);
        }

        query += ' ORDER BY p.status DESC, p.created_at ASC';

        const [rows] = await pool.execute(query, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

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

        const effectiveDeptId =
            req.user.role === 'dean_adviser' ? req.user.department_id : parseInt(department_id, 10);

        if (req.user.role === 'dean_adviser' && effectiveDeptId !== parseInt(department_id, 10)) {
            return res.status(403).json({
                success: false,
                message: 'You can only create teams for your own department.',
            });
        }

        const [existingTeams] = await pool.execute(
            'SELECT gender FROM teams WHERE department_id = ? AND sport_id = ? AND sport_fest_id = ?',
            [effectiveDeptId, sport_id, sportFestId]
        );
        const existingGenders = existingTeams.map((t) => t.gender.toLowerCase());
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

        await logActivity(
            req.user.id,
            'TEAM_CREATED',
            'team',
            result.insertId,
            `Team created: ${name} (${gender})`
        );

        return res.status(201).json({
            success: true,
            message: 'Team created successfully.',
            data: { id: result.insertId },
        });
    } catch (err) {
        next(err);
    }
};

const update = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id, 10);
        const { name, department_id, sport_id, gender, coach_name, logo_url } = req.body;

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const [existingTeams] = await pool.execute(
            'SELECT gender FROM teams WHERE department_id = ? AND sport_id = ? AND id != ? AND sport_fest_id = ?',
            [department_id, sport_id, teamId, team[0].sport_fest_id]
        );
        const existingGenders = existingTeams.map((t) => t.gender.toLowerCase());
        const newGender = gender.toLowerCase();

        if (newGender === 'mixed' && (existingGenders.includes('men') || existingGenders.includes('women'))) {
            return res.status(400).json({
                success: false,
                message: 'Cannot switch to Mixed — Men/Women teams exist this season.',
            });
        }
        if ((newGender === 'men' || newGender === 'women') && existingGenders.includes('mixed')) {
            return res.status(400).json({
                success: false,
                message: `Cannot switch to ${gender} — a Mixed team exists this season.`,
            });
        }
        if (existingGenders.includes(newGender)) {
            return res.status(400).json({
                success: false,
                message: `A ${gender} team already exists for this sport this season.`,
            });
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

const addMember = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id, 10);
        const { player_id } = req.body;

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const [player] = await pool.execute(
            'SELECT department_id, sport_fest_id FROM players WHERE id = ?',
            [player_id]
        );
        if (!player.length) {
            return res.status(404).json({ success: false, message: 'Player not found.' });
        }
        if (player[0].department_id !== team[0].department_id) {
            return res.status(400).json({
                success: false,
                message: 'Player must be from the same department as the team.',
            });
        }
        if (player[0].sport_fest_id !== team[0].sport_fest_id) {
            return res.status(400).json({
                success: false,
                message: 'Player and team belong to different seasons.',
            });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [lockedTeam] = await conn.execute(
                `SELECT t.id, s.max_players
                 FROM teams t JOIN sports s ON s.id = t.sport_id
                 WHERE t.id = ? FOR UPDATE`,
                [teamId]
            );
            if (!lockedTeam.length) {
                await conn.rollback();
                return res.status(404).json({ success: false, message: 'Team not found.' });
            }
            const [[{ approved_count: approvedCount }]] = await conn.execute(
                `SELECT COUNT(*) AS approved_count
                 FROM players WHERE team_id = ? AND status = 'approved'`,
                [teamId]
            );
            if (lockedTeam[0].max_players != null && approvedCount >= lockedTeam[0].max_players) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Team is at max capacity (${lockedTeam[0].max_players} approved players).`,
                });
            }
            const [claim] = await conn.execute(
                'UPDATE players SET team_id = ?, updated_at = NOW() WHERE id = ?',
                [teamId, player_id]
            );
            if (!claim.affectedRows) {
                await conn.rollback();
                return res.status(404).json({ success: false, message: 'Player not found.' });
            }
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        return res.json({ success: true, message: 'Player added to team.' });
    } catch (err) {
        next(err);
    }
};

const removeMember = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id, 10);
        const playerId = parseInt(req.params.playerId, 10);

        const [team] = await pool.execute('SELECT department_id FROM teams WHERE id = ?', [teamId]);
        if (!team.length) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        await pool.execute(
            'UPDATE players SET team_id = NULL, updated_at = NOW() WHERE id = ? AND team_id = ?',
            [playerId, teamId]
        );
        return res.json({ success: true, message: 'Player removed from team.' });
    } catch (err) {
        next(err);
    }
};

const updatePlayerStatus = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id, 10);
        const playerId = parseInt(req.params.playerId, 10);
        const { status } = req.body;

        const VALID = ['approved', 'rejected', 'pending'];
        if (!VALID.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${VALID.join(', ')}`,
            });
        }

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        if (status === 'approved') {
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                const [lockedTeam] = await conn.execute(
                    `SELECT t.id, s.max_players
                     FROM teams t JOIN sports s ON s.id = t.sport_id
                     WHERE t.id = ? FOR UPDATE`,
                    [teamId]
                );
                if (!lockedTeam.length) {
                    await conn.rollback();
                    return res.status(404).json({ success: false, message: 'Team not found.' });
                }
                const [member] = await conn.execute(
                    `SELECT id, status FROM players
                     WHERE id = ? AND team_id = ? FOR UPDATE`,
                    [playerId, teamId]
                );
                if (!member.length) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot approve a player who is not on this team.',
                    });
                }
                const [[{ approved_count: approvedCount }]] = await conn.execute(
                    `SELECT COUNT(*) AS approved_count
                     FROM players WHERE team_id = ? AND status = 'approved'`,
                    [teamId]
                );
                if (member[0].status !== 'approved'
                    && lockedTeam[0].max_players != null
                    && approvedCount >= lockedTeam[0].max_players) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Cannot approve. Max roster limit reached (${lockedTeam[0].max_players} approved players).`,
                    });
                }
                await conn.execute(
                    `UPDATE players SET status = 'approved', updated_at = NOW()
                     WHERE id = ? AND team_id = ?`,
                    [playerId, teamId]
                );
                await conn.commit();
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }
            return res.json({ success: true, message: 'Player marked as approved.' });
        }

        await pool.execute(
            'UPDATE players SET status = ?, updated_at = NOW() WHERE id = ? AND team_id = ?',
            [status, playerId, teamId]
        );
        return res.json({ success: true, message: `Player marked as ${status}.` });
    } catch (err) {
        next(err);
    }
};

const submitRoster = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id, 10);

        const [team] = await pool.execute('SELECT * FROM teams WHERE id = ?', [teamId]);
        if (!team.length) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }

        if (req.user.role === 'dean_adviser' && team[0].department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const [sport] = await pool.execute('SELECT min_players, max_players FROM sports WHERE id = ?', [
            team[0].sport_id,
        ]);
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

        await pool.execute('UPDATE teams SET roster_submitted = 1, updated_at = NOW() WHERE id = ?', [
            teamId,
        ]);

        await logActivity(
            req.user.id,
            'ROSTER_SUBMITTED',
            'team',
            teamId,
            `Roster submitted for team ID ${teamId}`
        );

        return res.json({ success: true, message: 'Team roster submitted successfully.' });
    } catch (err) {
        next(err);
    }
};

/**
 * Safer delete:
 * - Block if department is in a draft/registration/ongoing tournament for this sport.
 * - Block if there are scheduled/ongoing matches for this department + sport.
 * Matches are department-scoped (no team_id), so this is the tightest safe check.
 */
const remove = async (req, res, next) => {
    try {
        const teamId = parseInt(req.params.id, 10);

        const [teams] = await pool.execute(
            'SELECT id, name, department_id, sport_id, sport_fest_id FROM teams WHERE id = ?',
            [teamId]
        );
        if (!teams.length) {
            return res.status(404).json({ success: false, message: 'Team not found.' });
        }
        const team = teams[0];

        if (req.user.role === 'dean_adviser' && team.department_id !== req.user.department_id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const [activeTourneys] = await pool.execute(
            `SELECT COUNT(*) AS count
             FROM tournament_participants tp
             JOIN tournaments t ON t.id = tp.tournament_id
             WHERE tp.department_id = ?
               AND t.sport_id = ?
               AND t.status IN ('draft', 'registration', 'ongoing')`,
            [team.department_id, team.sport_id]
        );
        if (Number(activeTourneys[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete this team — its department is still in a draft, registration, or ongoing tournament for this sport. Remove them from the tournament or finalize it first.',
            });
        }

        const [activeMatches] = await pool.execute(
            `SELECT COUNT(*) AS count
             FROM matches m
             WHERE m.sport_id = ?
               AND (m.participant_a_department_id = ? OR m.participant_b_department_id = ?)
               AND m.status IN ('scheduled', 'ongoing')`,
            [team.sport_id, team.department_id, team.department_id]
        );
        if (Number(activeMatches[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete this team — there are scheduled or ongoing matches for this department and sport.',
            });
        }

        await pool.execute('UPDATE players SET team_id = NULL, updated_at = NOW() WHERE team_id = ?', [
            teamId,
        ]);
        await pool.execute('DELETE FROM teams WHERE id = ?', [teamId]);

        await logActivity(
            req.user.id,
            'TEAM_DELETED',
            'team',
            teamId,
            `Team deleted: ${team.name} (ID ${teamId})`
        );

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