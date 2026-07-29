// utils/socketEmit.js - Socket.IO Helper Functions
let socketHelpers = null;

/**
 * Initialize socket helpers - call this after socket server is set up
 */
const initSocket = (helpers) => {
    socketHelpers = helpers;
};

/**
 * Emit event to match room
 */
const emitToMatch = (matchId, event, data) => {
    if (socketHelpers) {
        socketHelpers.emitToMatch(matchId, event, data);
    }
};

/**
 * Emit event to tournament room
 */
const emitToTournament = (tournamentId, event, data) => {
    if (socketHelpers) {
        socketHelpers.emitToTournament(tournamentId, event, data);
    }
};

/**
 * Emit event to leaderboard room (global)
 */
const emitToLeaderboard = (event, data) => {
    if (socketHelpers) {
        socketHelpers.emitToLeaderboard(event, data);
    }
};

/**
 * Emit event to all connected clients
 */
const emitToAll = (event, data) => {
    if (socketHelpers) {
        socketHelpers.emitToAll(event, data);
    }
};

/**
 * Get number of watchers for a match
 */
const getMatchWatchers = (matchId) => {
    if (socketHelpers) {
        return socketHelpers.getMatchWatchers(matchId);
    }
    return 0;
};

/**
 * Get number of watchers for a tournament
 */
const getTournamentWatchers = (tournamentId) => {
    if (socketHelpers) {
        return socketHelpers.getTournamentWatchers(tournamentId);
    }
    return 0;
};

/**
 * Get total connected users
 */
const getConnectedUsers = () => {
    if (socketHelpers) {
        return socketHelpers.getConnectedUsers();
    }
    return 0;
};

module.exports = {
    initSocket,
    emitToMatch,
    emitToTournament,
    emitToLeaderboard,
    emitToAll,
    getMatchWatchers,
    getTournamentWatchers,
    getConnectedUsers,
};