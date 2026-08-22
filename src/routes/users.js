const router = require('express').Router();
const uc = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/officers', authorize('admin', 'sgo_president'), uc.getOfficers);
router.get('/deans', authorize('admin', 'sgo_president'), uc.getDeans);

router.get('/', authorize('admin', 'sgo_president'), uc.getAll);
router.get('/:id', uc.getOne); // controller itself restricts to admin, own record, or (for sgo_president) dean/officer records
router.get('/:id/logs', authorize('admin'), uc.getUserLogs);

// sgo_president is allowed on create/update/deactivate/activate — the
// controller (PRESIDENT_MANAGEABLE_ROLES / presidentRoleGuard in
// userController.js) is what actually stops a president from touching
// anything other than dean_adviser / sgo_officer accounts, so it's safe
// to widen the route itself rather than duplicate that role list here.
router.post('/', authorize('admin', 'sgo_president'), uc.create);
router.put('/:id', authorize('admin', 'sgo_president'), uc.update);
router.patch('/:id/deactivate', authorize('admin', 'sgo_president'), uc.deactivate);
router.patch('/:id/activate', authorize('admin', 'sgo_president'), uc.activate);

router.delete('/:id', authorize('admin'), uc.remove);

module.exports = router;