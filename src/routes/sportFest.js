const router = require('express').Router();
const sfc = require('../controllers/sportFestController');
const { authenticate, authorize } = require('../middleware/auth');

// NOTE: '/active' must stay above '/:id' or Express will treat "active" as an id.
router.get('/', sfc.getAll);
router.get('/active', sfc.getActive);
router.get('/:id', sfc.getOne);
router.get('/:id/summary', sfc.getSummary);

router.use(authenticate);
router.post('/', authorize('admin'), sfc.create);
router.post('/start-new-season', authorize('admin'), sfc.startNewSeason);
router.put('/:id', authorize('admin'), sfc.update);
router.post('/:id/tournaments', authorize('admin'), sfc.addTournament);
router.delete('/:id/tournaments/:tournamentId', authorize('admin'), sfc.removeTournament);
router.post('/:id/declare-champion', authorize('admin'), sfc.declareChampion);

module.exports = router;