const express = require('express');
const router = express.Router();
const dc = require('../controllers/departmentController');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', dc.getAll);
router.get('/:id', dc.getOne);
router.get('/:id/scores', dc.getScores);

router.use(authenticate);

router.get('/:id/players', authorize('admin', 'dean_adviser', 'sgo_president', 'sgo_officer'), dc.getPlayers);

// Departments aren't role-scoped the way user accounts are, so sgo_president
// gets full CRUD here (matches the new president Departments page) — no
// extra guard needed in departmentController.js beyond what already exists
// (e.g. remove() already blocks deactivating a department mid-tournament).
router.post('/', upload.single('logo'), authorize('admin', 'sgo_president'), dc.create);
router.put('/:id', upload.single('logo'), authorize('admin', 'sgo_president'), dc.update);
router.delete('/:id', authorize('admin', 'sgo_president'), dc.remove);

module.exports = router;