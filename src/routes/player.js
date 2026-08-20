const express = require('express');
const router = express.Router();
const pc = require('../controllers/playerController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/approved', pc.getApprovedPlayers);
router.get('/by-sport/:sportId', pc.getPlayersBySport);
router.use(authenticate);

router.post('/', authorize('dean_adviser', 'admin'), pc.registerPlayer);
router.post('/import', authorize('dean_adviser', 'admin'), pc.importPlayers);

router.get('/', pc.getAllPlayers);
router.get('/pending', authorize('admin', 'dean_adviser'), pc.getPendingPlayers);
router.get('/rejected', authorize('admin', 'dean_adviser'), pc.getRejectedPlayers);
router.get('/check-duplicate', authorize('dean_adviser', 'admin'), pc.checkDuplicate); // NEW
router.get('/by-department/:departmentId', authorize('admin', 'sgo_president', 'sgo_officer'), pc.getPlayersByDepartment);
router.get('/by-team/:teamId', pc.getTeamPlayers);
router.get('/:id', pc.getPlayerById);
router.get('/:id/eligibility', authorize('dean_adviser', 'admin'), pc.checkEligibility);

router.put('/:id', authorize('dean_adviser', 'admin'), pc.updatePlayer);
router.patch('/:id/status', authorize('dean_adviser', 'admin'), pc.updatePlayerStatus);
router.patch('/:id/remove-from-team', authorize('dean_adviser', 'admin'), pc.removeFromTeam);
router.delete('/:id', authorize('admin'), pc.deletePlayer);

module.exports = router;