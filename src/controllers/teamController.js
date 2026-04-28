const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getAll = async (req, res, next) => {
    try {
        const { sport_id, department_id, player_gender } = req.query; // <--- ADD player_gender

        let query = `
            SELECT t.*,
                   d.name AS department_name,
                   d.color AS department_color,
                   s.name AS sport_name,
                   s.max_players,
                   s.icon AS sport_icon,
                   (SELECT COUNT(*) FROM players WHERE team_id = t.id AND status = 'approved') AS approved_count,
                   (SELECT COUNT(*) FROM players WHERE team_id = t.id) AS total_count
            FROM teams t
            JOIN departments d ON t.department_id = d.id
            LEFT JOIN sports s ON t.sport_id = s.id
            WHERE 1=1
        `;

        const params = [];
        if (sport_id) { query += ' AND t.sport_id = ?'; params.push(sport_id); }
        if (department_id) { query += ' AND t.department_id = ?'; params.push(department_id); }


        if (player_gender) {
            const genderMap = { 'Male': 'Men', 'Female': 'Women' };
            query += ' AND (t.gender = ? OR t.gender = "Mixed")';
            params.push(genderMap[player_gender]);
        }

        query += ' ORDER BY d.name, t.name';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getSingles = async (req, res, next) => {
    try {
        const [players] = await pool.execute(`
            SELECT p.*, d.name AS department_name, d.color AS department_color, s.name AS sport_name, s.icon AS sport_icon, s.max_players
            FROM players p
            JOIN departments d ON p.department_id = d.id
            JOIN sports s ON p.sport_id = s.id
            WHERE p.team_id IS NULL
            ORDER BY p.status DESC, p.created_at ASC
        `);
        res.json({ success: true, data: players });
    } catch (err) {
        next(err);
    }
};

const getOne = async (req, res, next) => {
    try {
        const [team] = await pool.execute(
            `SELECT t.*, d.name AS department_name, s.name AS sport_name, s.max_players 
             FROM teams t 
             JOIN departments d ON t.department_id = d.id 
             LEFT JOIN sports s ON t.sport_id = s.id
             WHERE t.id = ?`,
            [req.params.id]
        );

        if (!team.length) return res.status(404).json({ success: false, message: 'Team not found' });
        const [players] = await pool.execute(`SELECT * FROM players WHERE team_id = ? ORDER BY status DESC`, [req.params.id]);
        res.json({ success: true, data: { ...team[0], players } });
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
                message: 'Team name, Grade/Strand, Sport, and Gender are required'
            });
        }


        const [existingTeams] = await pool.execute(
            `SELECT gender FROM teams WHERE department_id = ? AND sport_id = ?`,
            [department_id, sport_id]
        );

        const existingGenders = existingTeams.map(t => t.gender.toLowerCase());
        const newGender = gender.toLowerCase();


        if (newGender === 'mixed' && (existingGenders.includes('men') || existingGenders.includes('women'))) {
            return res.status(400).json({
                success: false,
                message: `Cannot create a Mixed team because Men/Women teams already exist for this sport.`
            });
        }


        if ((newGender === 'men' || newGender === 'women') && existingGenders.includes('mixed')) {
            return res.status(400).json({
                success: false,
                message: `Cannot create a ${gender} team because a Mixed team already exists for this sport.`
            });
        }


        if (existingGenders.includes(newGender)) {
            return res.status(400).json({
                success: false,
                message: `A ${gender} team for this sport already exists in this Grade/Strand.`
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO teams (name, department_id, sport_id, gender, coach_name, logo_url) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, department_id, sport_id, gender, coach_name || null, logo_url || null]
        );

        await logActivity(req.user.id, 'TEAM_CREATED', 'team', result.insertId, `Team created: ${name} (${gender})`);
        res.status(201).json({ success: true, message: 'Team created successfully', data: { id: result.insertId } });
    } catch (err) {
        next(err);
    }
};


const update = async (req, res, next) => {
    try {
        const { name, department_id, sport_id, gender, coach_name, logo_url } = req.body;
        const teamId = req.params.id;


        const [existingTeams] = await pool.execute(
            `SELECT gender FROM teams WHERE department_id = ? AND sport_id = ? AND id != ?`,
            [department_id, sport_id, teamId]
        );

        const existingGenders = existingTeams.map(t => t.gender.toLowerCase());
        const newGender = gender.toLowerCase();

        if (newGender === 'mixed' && (existingGenders.includes('men') || existingGenders.includes('women'))) {
            return res.status(400).json({
                success: false,
                message: `Cannot switch to Mixed because Men/Women teams already exist for this sport.`
            });
        }

        if ((newGender === 'men' || newGender === 'women') && existingGenders.includes('mixed')) {
            return res.status(400).json({
                success: false,
                message: `Cannot switch to ${gender} because a Mixed team already exists for this sport.`
            });
        }

        if (existingGenders.includes(newGender)) {
            return res.status(400).json({
                success: false,
                message: `A ${gender} team for this sport already exists in this Grade/Strand.`
            });
        }

        await pool.execute(
            `UPDATE teams SET name=?, department_id=?, sport_id=?, gender=?, coach_name=?, logo_url=? WHERE id=?`,
            [name, department_id, sport_id, gender, coach_name || null, logo_url || null, teamId]
        );
        res.json({ success: true, message: 'Team updated successfully' });
    } catch (err) {
        next(err);
    }
};

const addMember = async (req, res, next) => {
    try {
        const { player_id } = req.body;
        await pool.execute(`UPDATE players SET team_id = ? WHERE id = ?`, [req.params.id, player_id]);
        res.json({ success: true, message: 'Player added to team' });
    } catch (err) {
        next(err);
    }
};

const removeMember = async (req, res, next) => {
    try {
        await pool.execute(`UPDATE players SET team_id = NULL WHERE id = ?`, [req.params.playerId]);
        res.json({ success: true, message: 'Player removed from team' });
    } catch (err) {
        next(err);
    }
};

const updatePlayerStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const playerId = req.params.playerId;

        if (status === 'approved') {
            const [playerRes] = await pool.execute('SELECT team_id, sport_id, department_id FROM players WHERE id = ?', [playerId]);
            const player = playerRes[0];

            if (!player) return res.status(404).json({ success: false, message: 'Player not found.' });

            if (player.team_id) {
                const [limitRes] = await pool.execute(`
                    SELECT s.max_players, (SELECT COUNT(*) FROM players WHERE team_id = ? AND status = 'approved') as current_approved
                    FROM teams t JOIN sports s ON t.sport_id = s.id WHERE t.id = ?
                `, [player.team_id, player.team_id]);

                if (limitRes[0].current_approved >= limitRes[0].max_players) {
                    return res.status(400).json({ success: false, message: `Cannot approve. Sport max team roster limit is ${limitRes[0].max_players}.` });
                }
            } else {
                const [limitRes] = await pool.execute(`
                    SELECT s.max_players, (SELECT COUNT(*) FROM players WHERE team_id IS NULL AND sport_id = ? AND department_id = ? AND status = 'approved') as current_approved
                    FROM sports s WHERE s.id = ?
                `, [player.sport_id, player.department_id, player.sport_id]);

                if (limitRes[0].current_approved >= limitRes[0].max_players) {
                    return res.status(400).json({ success: false, message: `Cannot approve. Max limit of ${limitRes[0].max_players} reached.` });
                }
            }
        }

        await pool.execute('UPDATE players SET status = ? WHERE id = ?', [status, playerId]);
        res.json({ success: true, message: `Player marked as ${status}` });
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
    updatePlayerStatus,
    addMember,
    removeMember
};