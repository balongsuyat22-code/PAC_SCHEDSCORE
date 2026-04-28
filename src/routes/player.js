const express = require('express');
const router = express.Router();

const playerController = require('../controllers/playerController');

router.post('/register', playerController.registerPlayer);
router.put('/:id/status', playerController.updatePlayerStatus);
router.get('/team/:teamId', playerController.getTeamPlayers);
router.get('/singles', playerController.getSinglePlayers);
router.get('/approved', playerController.getApprovedPlayers);
router.get('/:id', playerController.getPlayerById);
router.get('/user/:userId', playerController.getPlayerByUserId);

module.exports = router;