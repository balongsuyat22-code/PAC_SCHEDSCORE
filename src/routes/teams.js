const express = require('express');
const router = express.Router();
const tmc = require('../controllers/teamController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', tmc.getAll);
router.get('/singles', authenticate, authorize('admin', 'dean_adviser'), tmc.getSingles);

router.get('/:id', tmc.getOne);

router.use(authenticate);

router.post('/', authorize('admin', 'dean_adviser'), tmc.create);
router.put('/:id', authorize('admin', 'dean_adviser'), tmc.update);
router.post('/:id/members', authorize('admin', 'dean_adviser'), tmc.addMember);
router.delete('/:id/members/:playerId', authorize('admin', 'dean_adviser'), tmc.removeMember);
router.patch('/:id/members/:playerId/status', authorize('admin', 'dean_adviser'), tmc.updatePlayerStatus);
router.post('/:id/submit-roster', authorize('admin', 'dean_adviser'), tmc.submitRoster);
router.delete('/:id', authorize('admin'), tmc.remove);

module.exports = router;