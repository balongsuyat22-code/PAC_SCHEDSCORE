const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const uploadDir = process.env.VERCEL === '1'
    ? path.join(os.tmpdir(), 'uploads', 'departments')
    : path.join(process.cwd(), 'uploads', 'departments');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname).toLowerCase());
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed.'));
    },
});

module.exports = upload;