const express = require('express');
const router = express.Router();
const sc = require('../controllers/sportsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', sc.getAll);
router.get('/:id', sc.getOne);
router.get('/:id/tournaments', sc.getTournaments);

router.use(authenticate);
router.post('/', authorize('admin'), sc.create);
router.put('/:id', authorize('admin'), sc.update);
router.delete('/:id', authorize('admin'), sc.remove);

module.exports = router;