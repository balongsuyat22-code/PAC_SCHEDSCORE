const express = require('express');
const router = express.Router();
const matchCtrl = require('../controllers/matchController');
const { authenticate, authorize } = require('../middleware/auth');

// —— Public / static paths FIRST (never after /:id) ——
router.get('/live', matchCtrl.getLive);
router.get('/mvps', matchCtrl.getMVPs);
router.get('/ffa/:tournamentId', matchCtrl.getFFAResults);

router.get('/officers', authenticate, authorize('sgo_president', 'admin'), matchCtrl.getAvailableOfficers);
router.get('/my-assignments', authenticate, authorize('sgo_officer'), matchCtrl.getMyAssignments);
router.get(
    '/players/department/:departmentId',
    authenticate,
    authorize('sgo_officer', 'sgo_president', 'admin'),
    matchCtrl.getPlayersByDepartment
);

router.get('/', matchCtrl.getAll);

// —— Param routes with extra segments before bare /:id ——
router.get('/:id/scoreboard', matchCtrl.getScoreboard);
router.get('/:id/watchers', matchCtrl.getWatchers);
router.get(
    '/:id/score-history',
    authenticate,
    authorize('admin', 'sgo_president', 'sgo_officer'),
    matchCtrl.getScoreHistory
);
router.get(
    '/:id/players',
    authenticate,
    authorize('sgo_officer', 'sgo_president', 'admin'),
    matchCtrl.getMatchPlayers
);

router.get('/:id', matchCtrl.getOne);

// —— Mutations (auth required) ——
router.use(authenticate);

router.post(
    '/ffa/:tournamentId/results',
    authorize('sgo_officer', 'sgo_president', 'admin'),
    matchCtrl.saveFFAResults
);
router.post(
    '/ffa/:matchId/complete',
    authorize('sgo_officer', 'sgo_president', 'admin'),
    matchCtrl.completeFFAMatch
);

router.put('/:id/schedule', authorize('sgo_president', 'admin'), matchCtrl.schedule);
router.patch('/:id/schedule', authorize('sgo_president', 'admin'), matchCtrl.schedule);
router.patch('/:id/start', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.startMatch);
router.put('/:id/score', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.updateScore);
router.post('/:id/complete', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.completeMatch);

module.exports = router;