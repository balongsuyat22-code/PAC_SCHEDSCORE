const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed.',
            errors: errors.array().map((e) => e.msg),
        });
    }
    next();
};

const validateRegister = [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 chars'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('first_name').trim().notEmpty().withMessage('First name required'),
    body('last_name').trim().notEmpty().withMessage('Last name required'),
    body('role').notEmpty().withMessage('Role required'),
];

const validateLogin = [
    body('password').notEmpty().withMessage('Password required'),
    body().custom((_, { req }) => {
        const id = (req.body.login || req.body.email || req.body.username || '').trim();
        if (!id) throw new Error('Email/Username is required.');
        return true;
    }),
];

function authorizeAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
}

router.post('/login', validateLogin, handleValidation, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.put('/me', ctrl.updateProfile);
router.put('/change-password', ctrl.changePassword);

router.post('/register', authorizeAdmin, validateRegister, handleValidation, ctrl.register);
router.put('/reset-password/:userId', authorizeAdmin, ctrl.resetPassword);

module.exports = router;