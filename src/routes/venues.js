const router = require('express').Router();
const venueCtrl = require('../controllers/venueController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', venueCtrl.getAll);
router.get('/:id', venueCtrl.getOne);
router.get('/:id/schedule', venueCtrl.getSchedule);

router.use(authenticate);

router.post('/', authorize('admin', 'sgo_president'), venueCtrl.create);
router.put('/:id', authorize('admin', 'sgo_president'), venueCtrl.update);
router.delete('/:id', authorize('admin', 'sgo_president'), venueCtrl.remove);

module.exports = router;