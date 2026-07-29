const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tournamentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.get('/:id/participants', authenticate, ctrl.getParticipants);
router.get('/:id/eligibility', authenticate, ctrl.getEligibility);
router.get('/:id/bracket', authenticate, ctrl.getBracket);

router.post('/', authenticate, authorize('sgo_president', 'admin'), ctrl.create);
router.put('/:id', authenticate, authorize('sgo_president', 'admin'), ctrl.update);
router.post('/:id/participants', authenticate, authorize('sgo_president', 'admin'), ctrl.addParticipants);
router.delete('/:id/participants/:departmentId', authenticate, authorize('sgo_president', 'admin'), ctrl.removeParticipant);
router.post('/:id/generate', authenticate, authorize('sgo_president', 'admin'), ctrl.generateBracket);
router.post('/:id/promote-knockout', authenticate, authorize('sgo_president', 'admin'), ctrl.promoteKnockout);
router.post('/:id/schedule-round-robin', authenticate, authorize('sgo_president', 'admin'), ctrl.scheduleRoundRobin);
router.post('/:id/finalize', authenticate, authorize('sgo_president', 'admin'), ctrl.finalizeTournament);

module.exports = router;