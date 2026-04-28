const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { pool } = require('../config/database');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, jwtConfig.secret);

        const [users] = await pool.execute(
            'SELECT id, uuid, username, email, role, first_name, last_name, department_id, is_active FROM users WHERE id = ?',
            [decoded.id]
        );

        if (!users.length || !users[0].is_active) {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        req.user = users[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${roles.join(', ')}`,
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };