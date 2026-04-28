const router = require('express').Router();
const schc = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/today', schc.getToday);
router.get('/', authenticate, schc.getAll);
router.post('/', authenticate, authorize('admin'), schc.create);
router.put('/:id', authenticate, authorize('admin'), schc.update);
router.delete('/:id', authenticate, authorize('admin'), schc.remove);

module.exports = router;