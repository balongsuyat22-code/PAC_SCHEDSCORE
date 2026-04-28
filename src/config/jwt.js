require('dotenv').config();
const jwt = require('jsonwebtoken');

const config = {
    secret: process.env.JWT_SECRET || 'sportfest_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

// Add this helper function
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