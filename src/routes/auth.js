const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const validateRegister = [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 chars'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').trim().notEmpty().withMessage('First name required'),
    body('last_name').trim().notEmpty().withMessage('Last name required'),
    body('role').notEmpty().withMessage('Role required'),
];

// Controller reads req.body.login || req.body.email || req.body.username
const validateLogin = [
    body('password').notEmpty().withMessage('Password required'),
];

router.post('/login', validateLogin, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.put('/me', ctrl.updateProfile);
router.put('/change-password', ctrl.changePassword);

// Admin-only
router.post('/register', authorizeAdmin, validateRegister, ctrl.register);
router.put('/reset-password/:userId', authorizeAdmin, ctrl.resetPassword);

// NOTE: '/debug-password' route removed — authController does not export
// a debugPassword handler, so this crashed the app at startup
// ("Router.get() requires a callback function but got a [object Undefined]").

function authorizeAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
}

module.exports = router;