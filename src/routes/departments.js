const express = require('express');
const router = express.Router();
const dc = require('../controllers/departmentController');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/', dc.getAll);
router.get('/:id', dc.getOne);


router.use(authenticate);

router.get('/:id/scores', dc.getScores);
router.get('/:id/players', dc.getPlayers);
router.post('/', upload.single('logo'), authorize('admin'), dc.create);
router.put('/:id', upload.single('logo'), authorize('admin'), dc.update);
router.delete('/:id', authorize('admin'), dc.remove);
module.exports = router;