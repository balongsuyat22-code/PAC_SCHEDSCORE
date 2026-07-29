// socket/index.js - Socket.IO Setup and Event Handlers
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { getActiveSportFestId } = require('../utils/season');

module.exports = (io) => {
    // Store active rooms and match watchers
    const matchRooms = new Map();
    const tournamentRooms = new Map();
    const userSessions = new Map();

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        // ── AUTHENTICATION ──
        socket.on('authenticate', async (token) => {
            try {
                const decoded = jwt.verify(token, jwtConfig.secret);

                // Store user data in socket
                socket.userId = decoded.id;
                socket.userRole = decoded.role;
                socket.userUuid = decoded.uuid;

                // Store session
                userSessions.set(socket.id, {
                    userId: decoded.id,
                    role: decoded.role,
                    joinedAt: new Date()
                });

                socket.emit('authenticated', { success: true });
                console.log(`User ${decoded.id} authenticated on socket ${socket.id}`);
            } catch (err) {
                socket.emit('authenticated', { success: false, message: 'Invalid token' });
                // Don't disconnect - allow visitor access without auth
            }
        });

        // ── JOIN MATCH ROOM (for live scoring) ──
        socket.on('joinMatch', async (matchId) => {
            matchId = parseInt(matchId);
            const roomName = `match_${matchId}`;

            // Leave previous match rooms
            if (socket.matchRooms) {
                socket.matchRooms.forEach(room => {
                    if (room.startsWith('match_')) {
                        socket.leave(room);
                    }
                });
            }

            socket.join(roomName);
            if (!socket.matchRooms) socket.matchRooms = new Set();
            socket.matchRooms.add(roomName);

            // Track watchers
            if (!matchRooms.has(matchId)) {
                matchRooms.set(matchId, new Set());
            }
            matchRooms.get(matchId).add(socket.id);

            // Send current match state
            try {
                const [match] = await pool.execute(
                    `SELECT m.*,
                  DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                  DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                  da.name AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                  db.name AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                  s.name AS sport_name, s.scoring_type, s.sets_to_win,
                  t.name AS tournament_name,
                  v.name AS venue_name,
                  CONCAT(ref_user.first_name, ' ', ref_user.last_name) AS referee_name,
                  (SELECT COALESCE(SUM(score_a),0) FROM match_scores WHERE match_id = m.id) AS total_a,
                  (SELECT COALESCE(SUM(score_b),0) FROM match_scores WHERE match_id = m.id) AS total_b,
                  (SELECT COUNT(*) FROM match_scores WHERE match_id = m.id AND score_a > score_b) AS sets_won_a,
                  (SELECT COUNT(*) FROM match_scores WHERE match_id = m.id AND score_b > score_a) AS sets_won_b
           FROM matches m
           LEFT JOIN departments da ON m.participant_a_department_id = da.id
           LEFT JOIN departments db ON m.participant_b_department_id = db.id
           LEFT JOIN sports s ON m.sport_id = s.id
           LEFT JOIN tournaments t ON m.tournament_id = t.id
           LEFT JOIN venues v ON m.venue_id = v.id
           LEFT JOIN users ref_user ON m.referee_id = ref_user.id
           WHERE m.id = ?`,
                    [matchId]
                );

                const [scores] = await pool.execute(
                    'SELECT * FROM match_scores WHERE match_id = ? ORDER BY period ASC',
                    [matchId]
                );

                const [result] = await pool.execute(
                    'SELECT * FROM match_results WHERE match_id = ?',
                    [matchId]
                );

                socket.emit('match:state', {
                    match: match[0] || null,
                    scores,
                    result: result[0] || null,
                    watchers: matchRooms.get(matchId)?.size || 0
                });
            } catch (err) {
                console.error('Error fetching match state:', err);
                socket.emit('match:state', { error: 'Failed to load match data' });
            }

            console.log(`Socket ${socket.id} joined match ${matchId}`);
        });

        // ── LEAVE MATCH ROOM ──
        socket.on('leaveMatch', (matchId) => {
            matchId = parseInt(matchId);
            const roomName = `match_${matchId}`;
            socket.leave(roomName);
            if (socket.matchRooms) {
                socket.matchRooms.delete(roomName);
            }
            if (matchRooms.has(matchId)) {
                matchRooms.get(matchId).delete(socket.id);
                if (matchRooms.get(matchId).size === 0) {
                    matchRooms.delete(matchId);
                }
            }
        });

        // ── JOIN TOURNAMENT ROOM (for bracket updates) ──
        socket.on('joinTournament', (tournamentId) => {
            tournamentId = parseInt(tournamentId);
            const roomName = `tournament_${tournamentId}`;
            socket.join(roomName);
            if (!socket.tournamentRooms) socket.tournamentRooms = new Set();
            socket.tournamentRooms.add(roomName);

            if (!tournamentRooms.has(tournamentId)) {
                tournamentRooms.set(tournamentId, new Set());
            }
            tournamentRooms.get(tournamentId).add(socket.id);

            console.log(`Socket ${socket.id} joined tournament ${tournamentId}`);
        });

        socket.on('leaveTournament', (tournamentId) => {
            tournamentId = parseInt(tournamentId);
            const roomName = `tournament_${tournamentId}`;
            socket.leave(roomName);
            if (socket.tournamentRooms) {
                socket.tournamentRooms.delete(roomName);
            }
            if (tournamentRooms.has(tournamentId)) {
                tournamentRooms.get(tournamentId).delete(socket.id);
                if (tournamentRooms.get(tournamentId).size === 0) {
                    tournamentRooms.delete(tournamentId);
                }
            }
        });

        // ── JOIN LEADERBOARD (global updates) ──
        socket.on('joinLeaderboard', () => {
            socket.join('leaderboard');
            console.log(`Socket ${socket.id} joined leaderboard`);
        });

        socket.on('leaveLeaderboard', () => {
            socket.leave('leaderboard');
        });

        // ── REQUEST LIVE MATCHES LIST ──
        socket.on('getLiveMatches', async () => {
            try {
                const [matches] = await pool.execute(
                    `SELECT m.id, m.tournament_id, m.status, m.started_at,
                  DATE_FORMAT(m.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                  DATE_FORMAT(m.scheduled_time, '%H:%i') AS scheduled_time,
                  da.id AS dept_a_id, da.name AS dept_a_name, da.color AS dept_a_color, da.logo_url AS dept_a_logo,
                  db.id AS dept_b_id, db.name AS dept_b_name, db.color AS dept_b_color, db.logo_url AS dept_b_logo,
                  s.name AS sport_name,
                  t.name AS tournament_name,
                  (SELECT COALESCE(SUM(score_a),0) FROM match_scores WHERE match_id = m.id) AS total_a,
                  (SELECT COALESCE(SUM(score_b),0) FROM match_scores WHERE match_id = m.id) AS total_b
           FROM matches m
           LEFT JOIN departments da ON m.participant_a_department_id = da.id
           LEFT JOIN departments db ON m.participant_b_department_id = db.id
           LEFT JOIN sports s ON m.sport_id = s.id
           LEFT JOIN tournaments t ON m.tournament_id = t.id
           WHERE m.status IN ('ongoing', 'scheduled')
           ORDER BY m.status DESC, m.started_at DESC, m.scheduled_date ASC`
                );
                socket.emit('live:matches', matches);
            } catch (err) {
                console.error('Error fetching live matches:', err);
                socket.emit('live:matches', []);
            }
        });

        // ── REQUEST LEADERBOARD ──
        socket.on('getLeaderboard', async () => {
            try {
                const sportFestId = await getActiveSportFestId();

                const [rows] = await pool.execute(
                    `SELECT d.id, d.name, d.code, d.color, d.logo_url, d.short_name,
                  COALESCE(ds.total_points, 0) AS total_points,
                  COALESCE(ds.gold_medals, 0) AS gold_medals,
                  COALESCE(ds.silver_medals, 0) AS silver_medals,
                  COALESCE(ds.bronze_medals, 0) AS bronze_medals,
                  COALESCE(ds.total_participations, 0) AS total_participations,
                  COALESCE(ds.tournaments_entered, 0) AS tournaments_entered,
                  RANK() OVER (ORDER BY COALESCE(ds.total_points, 0) DESC, COALESCE(ds.gold_medals, 0) DESC, COALESCE(ds.silver_medals, 0) DESC) AS rank
           FROM departments d
           LEFT JOIN department_scores ds ON d.id = ds.department_id AND ds.sport_fest_id <=> ?
           WHERE d.is_active = 1
           ORDER BY total_points DESC, gold_medals DESC, silver_medals DESC`,
                    [sportFestId]
                );
                socket.emit('leaderboard:data', rows);
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
                socket.emit('leaderboard:data', []);
            }
        });

        // ── REQUEST MATCH SCORE HISTORY ──
        socket.on('getScoreHistory', async (matchId) => {
            try {
                const [scores] = await pool.execute(
                    `SELECT ms.*,
                  CONCAT(u.first_name, ' ', u.last_name) AS updated_by_name
           FROM match_scores ms
           LEFT JOIN users u ON ms.updated_by = u.id
           WHERE ms.match_id = ?
           ORDER BY ms.period ASC, ms.updated_at DESC`,
                    [matchId]
                );
                socket.emit('score:history', scores);
            } catch (err) {
                console.error('Error fetching score history:', err);
                socket.emit('score:history', []);
            }
        });

        // ── PING (keep-alive) ──
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        // ── DISCONNECT ──
        socket.on('disconnect', () => {
            // Clean up match rooms
            if (socket.matchRooms) {
                socket.matchRooms.forEach(room => {
                    const matchId = parseInt(room.split('_')[1]);
                    if (matchRooms.has(matchId)) {
                        matchRooms.get(matchId).delete(socket.id);
                        if (matchRooms.get(matchId).size === 0) {
                            matchRooms.delete(matchId);
                        }
                    }
                });
            }

            // Clean up tournament rooms
            if (socket.tournamentRooms) {
                socket.tournamentRooms.forEach(room => {
                    const tournamentId = parseInt(room.split('_')[1]);
                    if (tournamentRooms.has(tournamentId)) {
                        tournamentRooms.get(tournamentId).delete(socket.id);
                        if (tournamentRooms.get(tournamentId).size === 0) {
                            tournamentRooms.delete(tournamentId);
                        }
                    }
                });
            }

            userSessions.delete(socket.id);
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    // ── HELPER: Broadcast to match room ──
    const emitToMatch = (matchId, event, data) => {
        io.to(`match_${matchId}`).emit(event, data);
    };

    // ── HELPER: Broadcast to tournament room ──
    const emitToTournament = (tournamentId, event, data) => {
        io.to(`tournament_${tournamentId}`).emit(event, data);
    };

    // ── HELPER: Broadcast to leaderboard ──
    const emitToLeaderboard = (event, data) => {
        io.to('leaderboard').emit(event, data);
    };

    // ── HELPER: Broadcast to all connected clients ──
    const emitToAll = (event, data) => {
        io.emit(event, data);
    };

    // Return helpers for use in controllers
    return {
        emitToMatch,
        emitToTournament,
        emitToLeaderboard,
        emitToAll,
        getMatchWatchers: (matchId) => matchRooms.get(matchId)?.size || 0,
        getTournamentWatchers: (tournamentId) => tournamentRooms.get(tournamentId)?.size || 0,
        getConnectedUsers: () => userSessions.size,
        io
    };
};