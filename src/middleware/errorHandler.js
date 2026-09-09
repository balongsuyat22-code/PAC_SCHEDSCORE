const path = require('path');
const fs = require('fs');

const wantsHtml = (req) => {
    const accept = req.get('accept') || '';
    return !req.path.startsWith('/api') && accept.includes('text/html');
};

const sendErrorPage = (req, res, status, message, detail) => {
    if (!wantsHtml(req)) return false;
    const params = new URLSearchParams({
        code: String(status),
        ...(message ? { message: String(message) } : {}),
        ...(detail ? { detail: String(detail) } : {}),
    });
    const filePath = path.join(__dirname, '../frontend/errors/error.html');
    fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.status(status).send(`Error ${status}`);
        const bootstrap = `<script>window.__ERROR_QUERY__=${JSON.stringify(Object.fromEntries(params))};</script>`;
        const page = html.replace('<script>\n    const params = new URLSearchParams(location.search);', `${bootstrap}\n<script>\n    const params = new URLSearchParams();\n    Object.entries(window.__ERROR_QUERY__ || {}).forEach(([key, value]) => params.set(key, value));`);
        res.status(status)
            .set('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'")
            .type('html')
            .send(page);
    });
    return true;
};

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    if (err.code === 'ER_DUP_ENTRY') {
        if (req.originalUrl.startsWith('/api/departments')) {
            return res.status(409).json({
                success: false,
                message: 'A department with this name or code already exists.',
            });
        }
        if (sendErrorPage(req, res, 409, 'Duplicate entry', 'That record already exists.')) return;
        return res.status(409).json({ success: false, message: 'Duplicate entry. Record already exists.' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        if (sendErrorPage(req, res, 400, 'Invalid reference', 'A related record could not be found.')) return;
        return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
    }
    if (err.name === 'ValidationError') {
        if (sendErrorPage(req, res, 400, 'Invalid request', err.message)) return;
        return res.status(400).json({ success: false, message: err.message });
    }

    const status = err.status || 500;
    if (sendErrorPage(req, res, status, status >= 500 ? 'Something went wrong' : err.message)) return;
    res.status(status).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

const notFound = (req, res) => {
    if (sendErrorPage(req, res, 404, 'Page not found', `${req.method} ${req.path} was not found.`)) return;
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};

module.exports = { errorHandler, notFound };