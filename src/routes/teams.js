const express = require('express');
const router = express.Router();
const tmc = require('../controllers/teamController');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/', tmc.getAll);
router.use(authenticate);
router.get('/singles', tmc.getSingles);
router.put('/players/:playerId/status', tmc.updatePlayerStatus);


router.get('/:id', tmc.getOne);
router.post('/', authorize('admin'), tmc.create);
router.put('/:id', authorize('admin'), tmc.update);
router.post('/:id/members', authorize('admin'), tmc.addMember);
router.delete('/:id/members/:playerId', authorize('admin'), tmc.removeMember);

module.exports = router;