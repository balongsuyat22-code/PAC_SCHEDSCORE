const router = require('express').Router();
const venueCtrl = require('../controllers/venueController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', venueCtrl.getAll);
router.get('/:id', venueCtrl.getOne);
router.get('/:id/schedule', venueCtrl.getSchedule);

router.use(authenticate);

// NOTE: added 'sgo_president' — Venue Management (assignVenue) is an
// explicit SGO President function/page, so it needs write access here,
// not just admin.
router.post('/', authorize('admin', 'sgo_president'), venueCtrl.create);
router.put('/:id', authorize('admin', 'sgo_president'), venueCtrl.update);
router.delete('/:id', authorize('admin', 'sgo_president'), venueCtrl.remove);

module.exports = router;