const router = require('express').Router();
const sc = require('../controllers/sportsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', sc.getAll);
router.get('/:id', sc.getOne);
router.get('/:id/tournaments', sc.getTournaments);
router.post('/', authenticate, authorize('admin'), sc.create);
router.put('/:id', authenticate, authorize('admin'), sc.update);
router.delete('/:id', authenticate, authorize('admin'), sc.remove);

module.exports = router;