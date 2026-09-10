const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tournamentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/:id/bracket', ctrl.getBracket);

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.get('/:id/participants', authenticate, ctrl.getParticipants);
router.get('/:id/eligibility', authenticate, ctrl.getEligibility);
router.get('/:id/points-config', authenticate, authorize('sgo_president', 'admin'), ctrl.getPointsConfig);

router.post('/', authenticate, authorize('sgo_president', 'admin'), ctrl.create);
router.put('/:id', authenticate, authorize('sgo_president', 'admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('sgo_president', 'admin'), ctrl.remove);

router.post('/:id/participants', authenticate, authorize('sgo_president', 'admin'), ctrl.addParticipants);
router.delete('/:id/participants/:departmentId', authenticate, authorize('sgo_president', 'admin'), ctrl.removeParticipant);
router.post('/:id/generate', authenticate, authorize('sgo_president', 'admin'), ctrl.generateBracket);
router.post('/:id/generate-bracket', authenticate, authorize('sgo_president', 'admin'), ctrl.generateBracket);
router.patch('/:id/matches/:matchId/exhibition', authenticate, authorize('sgo_president', 'admin'), ctrl.placeExhibition);
router.post('/:id/promote-knockout', authenticate, authorize('sgo_president', 'admin'), ctrl.promoteKnockout);
router.post('/:id/schedule-round-robin', authenticate, authorize('sgo_president', 'admin'), ctrl.scheduleRoundRobin);
router.post('/:id/finalize', authenticate, authorize('sgo_president', 'admin'), ctrl.finalizeTournament);
router.post('/:id/schedule-auto', authenticate, authorize('sgo_president', 'admin'), ctrl.scheduleRoundRobin);
router.post('/:id/ensure-tbd-rounds', authenticate, authorize('sgo_president', 'admin'), ctrl.ensureTbdRounds);


module.exports = router;