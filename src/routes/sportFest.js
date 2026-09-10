const router = require('express').Router();
const sfc = require('../controllers/sportFestController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', sfc.getAll);
router.get('/active', sfc.getActive);
router.get('/:id', sfc.getOne);
router.get('/:id/summary', sfc.getSummary);
router.get('/:id/bonus-points', sfc.getBonusPoints);

router.use(authenticate);
router.post('/', authorize('admin', 'sgo_president'), sfc.create);
router.post('/start-new-season', authorize('admin', 'sgo_president'), sfc.startNewSeason);
router.put('/:id', authorize('admin', 'sgo_president'), sfc.update);
router.post('/:id/tournaments', authorize('admin', 'sgo_president'), sfc.addTournament);
router.delete('/:id/tournaments/:tournamentId', authorize('admin', 'sgo_president'), sfc.removeTournament);
router.post('/:id/declare-champion', authorize('admin'), sfc.declareChampion);
router.post('/:id/bonus-points', authorize('admin', 'sgo_president'), sfc.addBonusPoints);
router.delete('/:id/bonus-points/:bonusId', authorize('admin', 'sgo_president'), sfc.removeBonusPoints);
router.delete('/:id', authorize('admin'), sfc.remove);

module.exports = router;