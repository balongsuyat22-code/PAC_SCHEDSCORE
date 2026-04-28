const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

// Match routes
router.get('/', matchController.getAll);
router.get('/live', matchController.getLive);
router.get('/referees', matchController.getReferees);

// FFA routes
router.get('/ffa-results/:tournamentId', matchController.getFFAResultsForTournament);
router.get('/:tournamentId/ffa-results', matchController.getFFAResultsForTournament);
router.post('/:tournamentId/ffa-save-results', matchController.saveFFAResults);
router.post('/:matchId/complete-ffa', matchController.completeFFAMatch);

// Player routes (for MVP selection)
router.get('/players/department/:department_id', matchController.getPlayersByDepartment);

// ⭐ MVP ROUTE - MAKE SURE THIS IS HERE ⭐
router.get('/mvps', matchController.getMVPs);

// Individual match routes - ORDER MATTERS! Put specific routes before generic ones
router.get('/:id', matchController.getOne);
router.get('/:id/scoreboard', matchController.getScoreboard);
router.patch('/:id/schedule', matchController.schedule);
router.patch('/:id/start', matchController.startMatch);
router.put('/:id/scores', matchController.updateScore);
router.post('/:id/complete', matchController.completeMatch);

module.exports = router;