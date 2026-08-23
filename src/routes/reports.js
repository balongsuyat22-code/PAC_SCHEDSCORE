const router = require('express').Router();
const rc = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get(
    '/dashboard',
    authorize('admin', 'sgo_president'),
    rc.getDashboard
);

router.get(
    '/summary',
    authorize('admin', 'sgo_president', 'sgo_officer'),
    rc.getReportSummary
);

router.get(
    '/unfinalized-tournaments',
    authorize('admin', 'sgo_president'),
    rc.getUnfinalizedTournaments
);

router.get(
    '/overdue-matches',
    authorize('admin', 'sgo_president', 'sgo_officer'),
    rc.getOverdueMatches
);

router.get(
    '/stuck-ongoing',
    authorize('admin', 'sgo_president', 'sgo_officer'),
    rc.getStuckOngoing
);

router.get(
    '/missing-assignments',
    authorize('admin', 'sgo_president'),
    rc.getMissingAssignments
);

router.get(
    '/pending-matches',
    authorize('admin', 'sgo_president'),
    rc.getPendingMatches
);

router.get(
    '/match-history',
    authorize('admin', 'sgo_president', 'sgo_officer', 'dean_adviser'),
    rc.getMatchHistory
);

router.get(
    '/departments/:id',
    authorize('admin', 'dean_adviser', 'sgo_president'),
    rc.getDepartmentReport
);

router.get(
    '/tournaments/:id',
    authorize('admin', 'sgo_president'),
    rc.getTournamentReport
);

router.get(
    '/tournaments/:id/export',
    authorize('admin', 'sgo_president'),
    rc.getTournamentExport
);

router.get(
    '/activity-log',
    authorize('admin'),
    rc.getActivityLog
);
router.get('/reports/current-season/tournaments', auth, reportController.getCurrentSeasonTournaments);
router.get('/reports/sportfest/export', auth, reportController.getSportFestExport);
module.exports = router;