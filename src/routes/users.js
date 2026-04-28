const router = require('express').Router();
const uc = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/referees', authenticate, authorize('admin'), uc.getReferees);
router.get('/players', authenticate, uc.getPlayers);

router.get('/', authenticate, authorize('admin'), uc.getAll);
router.get('/:id', authenticate, authorize('admin'), uc.getOne);
router.post('/', authenticate, authorize('admin'), uc.create);
router.put('/:id', authenticate, authorize('admin'), uc.update);
router.delete('/:id', authenticate, authorize('admin'), uc.deactivate);

module.exports = router;