const router = require('express').Router();
const rc = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/dashboard', authenticate, authorize('admin'), rc.getDashboard);
router.get('/match-history', authenticate, rc.getMatchHistory);
router.get('/department/:id', authenticate, rc.getDepartmentReport);
router.get('/tournament/:id', authenticate, rc.getTournamentReport);
router.get('/activity-log', authenticate, authorize('admin'), rc.getActivityLog);

module.exports = router;