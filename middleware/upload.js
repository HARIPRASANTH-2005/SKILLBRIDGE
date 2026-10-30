// ─────────────────────────────────────────────
//  middleware/upload.js  —  Secure Private Upload Middleware
// ─────────────────────────────────────────────
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Ensure private uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Private disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.pdf';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `doc-${uniqueSuffix}${cleanExt}`);
  }
});

// MIME and extension verification
const fileFilter = (req, file, cb) => {
  const allowedExts = /^\.(pdf|jpe?g|png)$/i;
  const allowedMimes = /^(application\/pdf|image\/(jpeg|png))$/i;

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedExts.test(ext) && allowedMimes.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid document format. Only PDF, JPG, and PNG files under 5MB are accepted.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB maximum
  fileFilter
});

module.exports = upload;

