const router = require('express').Router();
const rc = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// ---------------------------------------------------------------------------
// Dashboard (stat cards for SGO President / Admin)
// ---------------------------------------------------------------------------
router.get(
    '/dashboard',
    authorize('admin', 'sgo_president'),
    rc.getDashboard
);

// ---------------------------------------------------------------------------
// Operational reports (actionable issues)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Legacy / detail reports
// ---------------------------------------------------------------------------
router.get(
    '/match-history',
    authorize('admin', 'sgo_president', 'sgo_officer', 'dean_adviser'),
    rc.getMatchHistory
);

router.get(
    '/departments/:id',
    authorize('admin', 'dean_adviser'),
    rc.getDepartmentReport
);

router.get(
    '/tournaments/:id',
    authorize('admin', 'sgo_president'),
    rc.getTournamentReport
);

router.get(
    '/activity-log',
    authorize('admin'),
    rc.getActivityLog
);

module.exports = router;