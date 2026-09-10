const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');
const { emitToAll, emitToLeaderboard } = require('../utils/socketEmit')
const { notifyRoles } = require('./notificationController');


const getAll = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT sf.*,
                   d.name as champion_department_name,
                   d.color as champion_color,
                   COUNT(DISTINCT sft.tournament_id) as tournament_count,
                   (SELECT COUNT(*) FROM sport_fest_champions c WHERE c.sport_fest_id = sf.id) AS declared_champion_count
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            LEFT JOIN sport_fest_tournaments sft ON sf.id = sft.sport_fest_id
            GROUP BY sf.id
            ORDER BY sf.year DESC, sf.id DESC
        `);

        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getActive = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT sf.*, d.name as champion_name
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            WHERE sf.is_current = 1
            LIMIT 1
        `);

        if (!rows.length) {
            return res.json({ success: true, data: null });
        }

        const [champions] = await pool.execute(`
            SELECT c.division, c.department_id, d.name, d.color, d.logo_url,
                   c.total_points, c.gold_medals
            FROM sport_fest_champions c
            JOIN departments d ON d.id = c.department_id
            WHERE c.sport_fest_id = ?
            ORDER BY c.division
        `, [rows[0].id]);

        res.json({ success: true, data: { ...rows[0], champions } });
    } catch (err) {
        next(err);
    }
};


const getOne = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(`
            SELECT sf.*, d.name as champion_name
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            WHERE sf.id = ?
        `, [req.params.id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Sport Fest event not found' });
        }

        const [tournaments] = await pool.execute(`
            SELECT t.*, s.name as sport_name, s.category
            FROM sport_fest_tournaments sft
            JOIN tournaments t ON sft.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            WHERE sft.sport_fest_id = ?
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...rows[0],
                tournaments
            }
        });

    } catch (err) {
        next(err);
    }
};


const create = async (req, res, next) => {
    try {
        const { name, year, theme, start_date, end_date, description, champion_count } = req.body;
        const championCount = Math.min(2, Math.max(1, Number(champion_count) || 1));

        const [result] = await pool.execute(
            `INSERT INTO sport_fest_events 
             (name, year, theme, start_date, end_date, description, champion_count)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, year, theme, start_date, end_date, description || null, championCount]
        );

        await logActivity(
            req.user.id,
            'SPORTFEST_CREATED',
            'sport_fest',
            result.insertId,
            `Sport Fest created: ${name}`
        );
        await notifyRoles(['admin', 'sgo_president', 'dean_adviser', 'sgo_officer'], {
            type: 'sport_fest', severity: 'info', title: 'New Sport Fest created',
            message: `${name} (${year}) is now available for tournament planning.`,
            link: '/president/sport-fest', entity_type: 'sport_fest', entity_id: result.insertId,
            created_by: req.user.id,
        });

        res.status(201).json({
            success: true,
            message: 'Sport Fest event created',
            data: { id: result.insertId }
        });

    } catch (err) {
        next(err);
    }
};


const update = async (req, res, next) => {
    try {
        const { name, year, theme, start_date, end_date, description, status, champion_count } = req.body;
        const championCount = Math.min(2, Math.max(1, Number(champion_count) || 1));

        await pool.execute(
            `UPDATE sport_fest_events 
             SET name=?, year=?, theme=?, start_date=?, end_date=?, description=?, status=?, champion_count=?
             WHERE id=?`,
            [
                name,
                year,
                theme,
                start_date,
                end_date,
                description || null,
                status || 'upcoming',
                championCount,
                req.params.id
            ]
        );

        await notifyRoles(['admin', 'sgo_president', 'dean_adviser', 'sgo_officer'], {
            type: 'sport_fest', severity: 'info', title: 'Sport Fest updated',
            message: `${name} (${year}) was updated.`,
            link: '/president/sport-fest', entity_type: 'sport_fest', entity_id: req.params.id,
            created_by: req.user.id,
        });

        res.json({ success: true, message: 'Sport Fest event updated' });

    } catch (err) {
        next(err);
    }
};


const addTournament = async (req, res, next) => {
    try {
        const { tournament_id } = req.body;

        await pool.execute(
            `INSERT IGNORE INTO sport_fest_tournaments (sport_fest_id, tournament_id)
             VALUES (?, ?)`,
            [req.params.id, tournament_id]
        );

        res.json({ success: true, message: 'Tournament linked to Sport Fest' });

    } catch (err) {
        next(err);
    }
};


const removeTournament = async (req, res, next) => {
    try {
        await pool.execute(
            `DELETE FROM sport_fest_tournaments 
             WHERE sport_fest_id=? AND tournament_id=?`,
            [req.params.id, req.params.tournamentId]
        );

        res.json({ success: true, message: 'Tournament removed from Sport Fest' });

    } catch (err) {
        next(err);
    }
};


const declareChampion = async (req, res, next) => {
    try {
        const festId = req.params.id;

        const [[festConfig]] = await pool.execute(
            'SELECT champion_count FROM sport_fest_events WHERE id = ?',
            [festId]
        );
        const championCount = Math.min(2, Math.max(1, Number(festConfig?.champion_count) || 1));

        const [divisions] = await pool.execute(`
            SELECT DISTINCT d.division
            FROM departments d
            JOIN department_scores ds
              ON d.id = ds.department_id AND ds.sport_fest_id = ?
            WHERE d.is_active = 1
              AND d.is_exhibition = 0
              AND d.division IS NOT NULL
        `, [festId]);

        if (!divisions.length) {
            return res.status(400).json({ success: false, message: 'No eligible divisions found for this Sport Fest.' });
        }

        let selectedDivisions = divisions.slice(0, championCount);
        if (championCount === 1 && divisions.length > 1) {
            const [topDivision] = await pool.execute(`
                SELECT d.division
                FROM departments d
                LEFT JOIN department_scores ds
                  ON d.id = ds.department_id AND ds.sport_fest_id = ?
                WHERE d.is_active = 1 AND d.is_exhibition = 0 AND d.division IS NOT NULL
                ORDER BY COALESCE(ds.total_points, 0) DESC, COALESCE(ds.gold_medals, 0) DESC, d.name ASC
                LIMIT 1
            `, [festId]);
            selectedDivisions = topDivision.length ? topDivision : divisions.slice(0, 1);
        }

        const declared = [];
        for (const { division } of selectedDivisions) {
            const [rows] = await pool.execute(`
                SELECT d.id, d.name, d.color, d.logo_url,
                       COALESCE(ds.total_points, 0) AS total_points,
                       COALESCE(ds.gold_medals, 0) AS gold_medals
                FROM departments d
                LEFT JOIN department_scores ds
                  ON d.id = ds.department_id AND ds.sport_fest_id = ?
                WHERE d.is_active = 1
                  AND d.is_exhibition = 0
                  AND d.division = ?
                ORDER BY total_points DESC, gold_medals DESC, d.name ASC
                LIMIT 1
            `, [festId, division]);

            if (!rows.length) continue;
            const champion = rows[0];

            await pool.execute(`
                INSERT INTO sport_fest_champions
                    (sport_fest_id, division, department_id, total_points, gold_medals, declared_by)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    department_id = VALUES(department_id),
                    total_points = VALUES(total_points),
                    gold_medals = VALUES(gold_medals),
                    declared_by = VALUES(declared_by),
                    declared_at = NOW()
            `, [festId, division, champion.id, champion.total_points, champion.gold_medals, req.user.id]);

            declared.push({ division, ...champion });
        }

        await pool.execute(
            `UPDATE sport_fest_events
             SET champion_department_id = ?, status = 'completed'
             WHERE id = ?`,
            [declared[0]?.id || null, festId]
        );

        await logActivity(
            req.user.id,
            'CHAMPION_DECLARED',
            'sport_fest',
            festId,
            `Champions declared: ${declared.map((d) => `${d.division} - ${d.name}`).join(', ')}`
        );
        await notifyRoles(['admin', 'sgo_president', 'dean_adviser', 'sgo_officer'], {
            type: 'champion', severity: 'success', title: 'Sport Fest champion(s) declared',
            message: declared.map((d) => `${d.division}: ${d.name}`).join(' | '),
            link: '/live/standings', entity_type: 'sport_fest', entity_id: festId,
            created_by: req.user.id,
        });

        // One event for the whole declaration, even when two divisions
        // (e.g. Junior High + Senior High) are declared together — this used
        // to emit once per champion, which fired the celebration/confetti
        // twice in a row on the client for a two-champion Sport Fest.
        if (declared.length) {
            emitToAll('champion:declared', {
                sport_fest_id: Number(festId),
                champion: { ...declared[0] },
                champions: declared,
                message: declared.length > 1
                    ? `🏆 Division champions declared: ${declared.map((d) => `${d.name} (${d.division.replace('_', ' ')})`).join(' & ')}!`
                    : `🏆 ${declared[0].name} declared as ${declared[0].division.replace('_', ' ')} Champion!`,
            });
        }

        emitToLeaderboard('leaderboard:changed', {
            reason: 'champion_declared',
            sport_fest_id: parseInt(festId)
        });

        res.json({
            success: true,
            message: 'Champion(s) declared.',
            data: declared
        });

    } catch (err) {
        next(err);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const [fest] = await pool.execute(`
            SELECT sf.*, d.name as champion_name, d.color as champion_color
            FROM sport_fest_events sf
            LEFT JOIN departments d ON sf.champion_department_id = d.id
            WHERE sf.id = ?
        `, [req.params.id]);

        if (!fest.length) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const [leaderboard] = await pool.execute(`
            SELECT d.id, d.name, d.code, d.color,
                   d.division,
                   COALESCE(ds.total_points,0) as total_points,
                   COALESCE(ds.gold_medals,0) as gold,
                   COALESCE(ds.silver_medals,0) as silver,
                   COALESCE(ds.bronze_medals,0) as bronze
            FROM departments d
            LEFT JOIN department_scores ds
                ON d.id = ds.department_id AND ds.sport_fest_id = ?
                        WHERE d.is_active = 1
                            AND d.is_exhibition = 0
                            AND d.division IS NOT NULL
                        ORDER BY d.division, total_points DESC, gold DESC, d.name ASC
        `, [req.params.id]);

        const [exhibitionTeams] = await pool.execute(`
                        SELECT d.id, d.name, d.code, d.color,
                                     COALESCE(ds.total_points, 0) AS total_points,
                                     COALESCE(ds.gold_medals, 0) AS gold,
                                     COALESCE(ds.silver_medals, 0) AS silver,
                                     COALESCE(ds.bronze_medals, 0) AS bronze
                        FROM departments d
                        LEFT JOIN department_scores ds
                            ON d.id = ds.department_id AND ds.sport_fest_id = ?
                        WHERE d.is_active = 1 AND d.is_exhibition = 1
                        ORDER BY d.name
                `, [req.params.id]);

        const [champions] = await pool.execute(`
                        SELECT c.division, c.department_id, d.name, c.total_points, c.gold_medals, c.declared_at
                        FROM sport_fest_champions c
                        JOIN departments d ON d.id = c.department_id
                        WHERE c.sport_fest_id = ?
                        ORDER BY c.division
                `, [req.params.id]);

        const [tournamentSummary] = await pool.execute(`
            SELECT 
                s.name as sport_name,
                t.name as tournament_name,
                t.status,
                t.format,
                t.gender,
                winner.name as winner_department,
                (
                    SELECT COUNT(DISTINCT tp.department_id)
                    FROM tournament_participants tp
                    WHERE tp.tournament_id = t.id
                ) as departments_participated
            FROM sport_fest_tournaments sft
            JOIN tournaments t ON sft.tournament_id = t.id
            JOIN sports s ON t.sport_id = s.id
            LEFT JOIN tournament_results tr
                ON t.id = tr.tournament_id AND tr.\`rank\` = 1
            LEFT JOIN departments winner ON tr.department_id = winner.id
            WHERE sft.sport_fest_id = ?
            ORDER BY t.name
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                event: fest[0],
                leaderboard,
                exhibition_teams: exhibitionTeams,
                champions,
                tournaments: tournamentSummary
            }
        });

    } catch (err) {
        next(err);
    }
};

const startNewSeason = async (req, res, next) => {
    try {
        const { name, year, theme, start_date, end_date, description, champion_count } = req.body;
        const championCount = Math.min(2, Math.max(1, Number(champion_count) || 1));

        if (!name || !year) {
            return res.status(400).json({ success: false, message: 'Name and year are required' });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [current] = await conn.execute(
                `SELECT id, name FROM sport_fest_events WHERE is_current = 1 LIMIT 1`
            );

            if (current.length) {
                await conn.execute(
                    `UPDATE sport_fest_events 
                     SET is_current = 0, 
                         status = IF(status = 'completed', status, 'completed') 
                     WHERE id = ?`,
                    [current[0].id]
                );
            }

            const [result] = await conn.execute(
                `INSERT INTO sport_fest_events 
                 (name, year, theme, start_date, end_date, description, status, is_current, champion_count)
                 VALUES (?, ?, ?, ?, ?, ?, 'upcoming', 1, ?)`,
                [name, year, theme || null, start_date || null, end_date || null, description || null, championCount]
            );

            await conn.commit();

            await logActivity(
                req.user.id,
                'SEASON_STARTED',
                'sport_fest',
                result.insertId,
                `New season started: ${name} (${year})` +
                (current.length ? `, archived "${current[0].name}"` : '')
            );
            await notifyRoles(['admin', 'sgo_president', 'dean_adviser', 'sgo_officer'], {
                type: 'sport_fest', severity: 'info', title: 'New Sport Fest season started',
                message: `${name} (${year}) is now the active Sport Fest season.`,
                link: '/president/sport-fest', entity_type: 'sport_fest', entity_id: result.insertId,
                created_by: req.user.id,
            });

            res.status(201).json({
                success: true,
                message: current.length
                    ? `New season "${name}" started. "${current[0].name}" is now archived.`
                    : `New season "${name}" started.`,
                data: { id: result.insertId }
            });

        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

    } catch (err) {
        next(err);
    }
};


const remove = async (req, res, next) => {
    try {
        const festId = parseInt(req.params.id, 10);

        const [rows] = await pool.execute(
            'SELECT id, name, is_current, status FROM sport_fest_events WHERE id = ?',
            [festId]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Sport Fest event not found.' });
        }

        const fest = rows[0];

        if (Number(fest.is_current) === 1) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete the current season. Use "Start New Season" to archive it first, then delete the archived event if needed.',
            });
        }

        const [openTourneys] = await pool.execute(
            `SELECT COUNT(*) AS count
             FROM sport_fest_tournaments sft
             JOIN tournaments t ON t.id = sft.tournament_id
             WHERE sft.sport_fest_id = ?
               AND t.status IN ('draft', 'registration', 'ongoing')`,
            [festId]
        );
        if (Number(openTourneys[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete this Sport Fest — it still has draft, registration, or ongoing tournaments. Finalize or cancel them first.',
            });
        }

        const [openMatches] = await pool.execute(
            `SELECT COUNT(*) AS count
             FROM matches m
             JOIN sport_fest_tournaments sft ON sft.tournament_id = m.tournament_id
             WHERE sft.sport_fest_id = ?
               AND m.status IN ('pending', 'scheduled', 'ongoing')`,
            [festId]
        );
        if (Number(openMatches[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message:
                    'Cannot delete this Sport Fest — linked tournaments still have pending, scheduled, or ongoing matches. Complete or cancel those matches first.',
            });
        }

        await pool.execute(
            'DELETE FROM sport_fest_tournaments WHERE sport_fest_id = ?',
            [festId]
        );
        await pool.execute(
            'DELETE FROM sport_fest_events WHERE id = ?',
            [festId]
        );

        await logActivity(
            req.user.id,
            'SPORTFEST_DELETED',
            'sport_fest',
            festId,
            `Sport Fest deleted: ${fest.name}`
        );

        return res.json({
            success: true,
            message: `Sport Fest "${fest.name}" deleted.`,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAll,
    getActive,
    getOne,
    create,
    update,
    addTournament,
    removeTournament,
    declareChampion,
    getSummary,
    startNewSeason,
    remove,
};