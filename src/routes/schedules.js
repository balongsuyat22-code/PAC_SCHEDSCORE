const router = require('express').Router();
const schc = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/today', schc.getToday);
router.get('/', schc.getAll);

router.use(authenticate);

router.post('/', authorize('admin', 'sgo_president'), schc.create);
router.put('/:id', authorize('admin', 'sgo_president'), schc.update);
router.delete('/:id', authorize('admin', 'sgo_president'), schc.remove);

module.exports = router;