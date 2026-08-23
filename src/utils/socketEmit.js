let socketHelpers = null;

const initSocket = (helpers) => {
    socketHelpers = helpers;
};

const emitToMatch = (matchId, event, data) => {
    if (socketHelpers) socketHelpers.emitToMatch(matchId, event, data);
};

const emitToTournament = (tournamentId, event, data) => {
    if (socketHelpers) socketHelpers.emitToTournament(tournamentId, event, data);
};

const emitToLeaderboard = (event, data) => {
    if (socketHelpers) socketHelpers.emitToLeaderboard(event, data);
};

const emitToAll = (event, data) => {
    if (socketHelpers) socketHelpers.emitToAll(event, data);
};

const emitToUser = (userId, event, data) => {
    if (socketHelpers) socketHelpers.emitToUser(userId, event, data);
};

const emitToRole = (role, event, data) => {
    if (socketHelpers) socketHelpers.emitToRole(role, event, data);
};

const emitToDepartment = (departmentId, event, data) => {
    if (socketHelpers) socketHelpers.emitToDepartment(departmentId, event, data);
};

const emitNotification = (row) => {
    if (socketHelpers && socketHelpers.emitNotification) {
        socketHelpers.emitNotification(row);
    } else if (socketHelpers) {
        socketHelpers.emitToAll('notification:new', row);
    }
};

const getMatchWatchers = (matchId) => {
    if (socketHelpers) return socketHelpers.getMatchWatchers(matchId);
    return 0;
};

const getTournamentWatchers = (tournamentId) => {
    if (socketHelpers) return socketHelpers.getTournamentWatchers(tournamentId);
    return 0;
};

const getConnectedUsers = () => {
    if (socketHelpers) return socketHelpers.getConnectedUsers();
    return 0;
};

module.exports = {
    initSocket,
    emitToMatch,
    emitToTournament,
    emitToLeaderboard,
    emitToAll,
    emitToUser,
    emitToRole,
    emitToDepartment,
    emitNotification,
    getMatchWatchers,
    getTournamentWatchers,
    getConnectedUsers,
};