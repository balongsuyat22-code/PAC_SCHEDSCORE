const router = require('express').Router();

const venueCtrl = require('../controllers/venueController');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/', venueCtrl.getAll);
router.get('/:id', venueCtrl.getOne);
router.get('/:id/schedule', venueCtrl.getSchedule);


router.post('/', authenticate, authorize('admin'), venueCtrl.create);
router.put('/:id', authenticate, authorize('admin'), venueCtrl.update);
router.delete('/:id', authenticate, authorize('admin'), venueCtrl.remove);

module.exports = router;
