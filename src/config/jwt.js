require('dotenv').config();
const jwt = require('jsonwebtoken');

const defaultSecret = 'sportfest_secret_key_change_in_production';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
}

const config = {
    secret: process.env.JWT_SECRET || defaultSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

const generateToken = (payload) => {
    return jwt.sign(payload, config.secret, { expiresIn: config.expiresIn });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, config.secret, { expiresIn: config.refreshExpiresIn });
};

const verifyToken = (token) => {
    return jwt.verify(token, config.secret);
};

module.exports = {
    ...config,
    generateToken,
    generateRefreshToken,
    verifyToken
};