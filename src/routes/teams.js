const express = require('express');
const router = express.Router();
const tmc = require('../controllers/teamController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', tmc.getAll);

// NOTE: '/singles' MUST be registered before '/:id' below, otherwise Express
// matches "GET /teams/singles" against '/:id' (id="singles") first and
// tmc.getSingles is never reached. It carries its own auth middleware here
// (instead of relying on a later router.use(authenticate)) so that
// '/:id' can stay public, exactly as it was before.
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