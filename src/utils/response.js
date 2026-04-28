const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
    return res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });
};

const paginate = (data, total, page, limit) => ({
    data,
    pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
    },
});

module.exports = { sendSuccess, sendError, paginate };