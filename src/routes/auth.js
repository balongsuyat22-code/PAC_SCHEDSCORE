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
];

const validateLogin = [
    body('email').notEmpty().withMessage('Email/username required'),
    body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', validateRegister, ctrl.register);
router.post('/login', validateLogin, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.getMe);
router.put('/profile', authenticate, ctrl.updateProfile);
router.put('/change-password', authenticate, ctrl.changePassword);

module.exports = router;