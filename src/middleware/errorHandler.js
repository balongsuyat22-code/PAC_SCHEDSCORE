const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Duplicate entry. Record already exists.' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
    }
    if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

const notFound = (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};

module.exports = { errorHandler, notFound };