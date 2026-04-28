const router = require('express').Router();
const lbc = require('../controllers/leaderboardController');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/', lbc.getLeaderboard);
router.get('/by-sport', lbc.getBySport);
router.get('/champion', lbc.calculateChampion);


router.post('/recalculate', authenticate, authorize('admin'), lbc.recalculate);

module.exports = router;