const router = require('express').Router();
const lbc = require('../controllers/leaderboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', lbc.getLeaderboard);
router.get('/departments', lbc.getDepartmentRanking);
router.get('/medals', lbc.getMedalTally);
router.get('/by-sport', lbc.getBySport);
router.get('/top-scorers', lbc.getTopScorers);
router.get('/winning-teams', lbc.getWinningTeams);
router.get('/champions', lbc.getChampionTeams);
router.get('/overall-champion', lbc.getOverallChampion);
router.get('/department-mvp/:departmentId', lbc.getDepartmentMVP);
router.get('/overall-mvp', lbc.getOverallMVP);
router.get('/tournament-champions', lbc.getTournamentChampions);
router.get('/live', lbc.getLiveLeaderboard);
router.get('/activity', lbc.getActivityFeed);

router.post('/recalculate', authenticate, authorize('admin', 'sgo_president'), lbc.recalculate);

module.exports = router;