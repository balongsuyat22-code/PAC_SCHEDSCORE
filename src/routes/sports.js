const express = require('express');
const router = express.Router();
const sc = require('../controllers/sportsController');
const { authenticate, authorize } = require('../middleware/auth');

// Public / all-roles reads
router.get('/', sc.getAll);
router.get('/:id/tournaments', sc.getTournaments);
router.get('/:id', sc.getOne);

// Protected writes
router.use(authenticate);

router.post('/', authorize('admin', 'sgo_president'), sc.create);
router.put('/:id', authorize('admin', 'sgo_president'), sc.update);
router.delete('/:id', authorize('admin', 'sgo_president'), sc.remove);

module.exports = router;