const express = require('express');
const router = express.Router();
const { getLiveLeaderboard, getActivityFeed } = require('../controllers/leaderboardController');
const matchController = require('../controllers/matchController');
const departmentController = require('../controllers/departmentController');
const { getBracket } = require('../controllers/tournamentController');

router.get('/leaderboard', getLiveLeaderboard);
router.get('/activity', getActivityFeed);
router.get('/matches/live', matchController.getLive);
router.get('/matches/:id/scoreboard', matchController.getScoreboard);
router.get('/departments', departmentController.getAll);
router.get('/departments/:id', departmentController.getOne);
router.get('/tournaments/:id/bracket', getBracket);

module.exports = router;