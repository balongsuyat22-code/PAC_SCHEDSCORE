const router = require('express').Router();
const nc = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', nc.list);

router.patch('/read-all', nc.markAllRead);
router.patch('/:id/read', nc.markRead);

router.delete('/:id', nc.remove);

router.post(
    '/broadcast',
    authorize('admin', 'sgo_president'),
    nc.broadcast
);

module.exports = router;