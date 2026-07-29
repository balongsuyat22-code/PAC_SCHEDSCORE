const router = require('express').Router();
const uc = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/officers', authorize('admin', 'sgo_president'), uc.getOfficers);
router.get('/deans', authorize('admin', 'sgo_president'), uc.getDeans);

router.get('/', authorize('admin', 'sgo_president'), uc.getAll);
router.get('/:id', uc.getOne); // controller itself restricts to admin or own record
router.get('/:id/logs', authorize('admin'), uc.getUserLogs);

router.post('/', authorize('admin'), uc.create);
router.put('/:id', authorize('admin'), uc.update);
router.patch('/:id/deactivate', authorize('admin'), uc.deactivate);
router.patch('/:id/activate', authorize('admin'), uc.activate);
router.delete('/:id', authorize('admin'), uc.remove);

module.exports = router;