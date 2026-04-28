const router = require('express').Router();
const tc = require('../controllers/tournamentController');
const { authenticate, authorize } = require('../middleware/auth');
const matchController = require('../controllers/matchController');

router.get('/ffa-results/:tournamentId', matchController.getFFAResultsForTournament);
router.post('/ffa-results/:tournamentId', authenticate, matchController.saveFFAResults);


router.get('/', tc.getAll);
router.get('/:id', tc.getOne);
router.get('/:id/bracket', tc.getBracket);
router.get('/:id/standings', tc.getStandings);

router.post('/', authenticate, authorize('admin'), tc.create);
router.put('/:id', authenticate, authorize('admin'), tc.update);
router.post('/:id/participants', authenticate, authorize('admin'), tc.addParticipant);
router.delete('/participants/:id', authenticate, authorize('admin'), tc.removeParticipant);
router.post('/:id/generate-bracket', authenticate, authorize('admin'), tc.generateMatches);
router.post('/:id/promote-knockout', authenticate, authorize('admin'), tc.promoteKnockout);
router.post('/:id/finalize', authenticate, authorize('admin'), tc.finalize);

router.post('/:id/participants/dq', async (req, res) => {
    const { department_id, reason } = req.body;
    await pool.execute(
        `UPDATE tournament_participants SET status = 'disqualified', notes = ? WHERE tournament_id = ? AND department_id = ?`,
        [reason, req.params.id, department_id]
    );
    res.json({ success: true });
});

router.post('/:id/participants/undq', async (req, res) => {
    const { department_id } = req.body;
    await pool.execute(
        `UPDATE tournament_participants SET status = 'active', notes = NULL WHERE tournament_id = ? AND department_id = ?`,
        [req.params.id, department_id]
    );
    res.json({ success: true });
});
module.exports = router;