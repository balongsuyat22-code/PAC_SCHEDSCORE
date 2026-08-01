const express = require('express');
const router = express.Router();
const matchCtrl = require('../controllers/matchController');
const { authenticate, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════════
// PUBLIC (no auth) — used by visitor live scores / schedule
// ═══════════════════════════════════════════════════════════
router.get('/live', matchCtrl.getLive);
router.get('/mvps', matchCtrl.getMVPs);
router.get('/ffa/:tournamentId', matchCtrl.getFFAResults);  // or keep restricted if FFA is internal-only

// ─────────────────────────────────────────────────────────────
// IMPORTANT: every literal (non-":id") path must be declared
// BEFORE '/:id'. Express matches routes in registration order,
// not by specificity — '/:id' happily matches a single path
// segment like "officers" or "my-assignments" as if it were an
// id, so those routes must come first or they get swallowed by
// getOne() and return a false "Match not found." 404.
//
// '/officers' and '/my-assignments' need auth, but they're now
// ahead of router.use(authenticate) below — so authenticate/
// authorize are attached directly on these two routes instead.
// ─────────────────────────────────────────────────────────────
router.get('/officers', authenticate, authorize('sgo_president', 'admin'), matchCtrl.getAvailableOfficers);
router.get('/my-assignments', authenticate, authorize('sgo_officer'), matchCtrl.getMyAssignments);

router.get('/', matchCtrl.getAll);
router.get('/:id', matchCtrl.getOne);
router.get('/:id/scoreboard', matchCtrl.getScoreboard);
router.get('/:id/watchers', matchCtrl.getWatchers);

// ═══════════════════════════════════════════════════════════
// AUTHENTICATED from here down
// ═══════════════════════════════════════════════════════════
router.use(authenticate);

router.get('/players/department/:departmentId', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.getPlayersByDepartment);
router.post('/ffa/:tournamentId/results', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.saveFFAResults);
router.post('/ffa/:matchId/complete', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.completeFFAMatch);

router.get('/:id/score-history', authorize('admin', 'sgo_president', 'sgo_officer'), matchCtrl.getScoreHistory);
router.get('/:id/players', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.getMatchPlayers);

router.put('/:id/schedule', authorize('sgo_president', 'admin'), matchCtrl.schedule);
router.patch('/:id/start', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.startMatch);
router.put('/:id/score', authorize('sgo_officer', 'admin'), matchCtrl.updateScore);
router.post('/:id/complete', authorize('sgo_officer', 'sgo_president', 'admin'), matchCtrl.completeMatch);

module.exports = router;