// // ─────────────────────────────────────────────
// //  middleware/upload.js  —  Secure Private Upload Middleware
// // ─────────────────────────────────────────────
// const multer = require('multer');
// const path   = require('path');
// const fs     = require('fs');

// const UPLOAD_DIR = path.join(__dirname, '../uploads');

// // Ensure private uploads directory exists
// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// // Private disk storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, UPLOAD_DIR);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     const cleanExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext) ? ext : '.pdf';
//     const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
//     cb(null, `doc-${uniqueSuffix}${cleanExt}`);
//   }
// });

// // MIME and extension verification
// const fileFilter = (req, file, cb) => {
//   const allowedExts = /^\.(pdf|jpe?g|png)$/i;
//   const allowedMimes = /^(application\/pdf|image\/(jpeg|png))$/i;

//   const ext = path.extname(file.originalname).toLowerCase();
//   const mime = file.mimetype;

//   if (allowedExts.test(ext) && allowedMimes.test(mime)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid document format. Only PDF, JPG, and PNG files under 5MB are accepted.'), false);
//   }
// };

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB maximum
//   fileFilter
// });

// module.exports = upload;





// new changes

 // ─────────────────────────────────────────────
 // middleware/upload.js
 // Secure Private Document Upload Middleware
 // ─────────────────────────────────────────────

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_FILES = {
  '.pdf': {
    mime: 'application/pdf'
  },
  '.jpg': {
    mime: 'image/jpeg'
  },
  '.jpeg': {
    mime: 'image/jpeg'
  },
  '.png': {
    mime: 'image/png'
  }
};


// ─────────────────────────────────────────────
// 1. CREATE PRIVATE UPLOAD DIRECTORY
// ─────────────────────────────────────────────

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, {
    recursive: true,
    mode: 0o700
  });
}


// ─────────────────────────────────────────────
// 2. DISK STORAGE CONFIGURATION
// ─────────────────────────────────────────────

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Never use the original filename as the stored filename.
    const uniqueSuffix =
      `${Date.now()}-${require('crypto').randomBytes(16).toString('hex')}`;

    cb(null, `doc-${uniqueSuffix}${ext}`);
  }

});


// ─────────────────────────────────────────────
// 3. FILE EXTENSION AND MIME VALIDATION
// ─────────────────────────────────────────────

const fileFilter = (req, file, cb) => {

  const ext = path.extname(file.originalname).toLowerCase();

  const allowedFile = ALLOWED_FILES[ext];

  if (!allowedFile) {
    return cb(
      new Error('Only PDF, JPG, JPEG and PNG documents are accepted.')
    );
  }

  if (file.mimetype !== allowedFile.mime) {
    return cb(
      new Error('The uploaded file has an invalid MIME type.')
    );
  }

  cb(null, true);
};


// ─────────────────────────────────────────────
// 4. MULTER CONFIGURATION
// ─────────────────────────────────────────────

const multerUpload = multer({

  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 20,
    parts: 25
  },

  fileFilter

});


// ─────────────────────────────────────────────
// 5. VERIFY ACTUAL FILE CONTENT
// ─────────────────────────────────────────────

const detectFileType = (buffer) => {

  // PDF signature: %PDF-
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString() === '%PDF-'
  ) {
    return {
      extension: '.pdf',
      mime: 'application/pdf'
    };
  }

  // JPEG signature: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[2] === 0xFF
  ) {
    return {
      extension: null,
      mime: 'image/jpeg'
    };
  }

  // PNG signature
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4E, 0x47,
    0x0D, 0x0A, 0x1A, 0x0A
  ]);

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(pngSignature)
  ) {
    return {
      extension: '.png',
      mime: 'image/png'
    };
  }

  return null;
};


// ─────────────────────────────────────────────
// 6. VERIFY UPLOADED FILE SIGNATURE
// ─────────────────────────────────────────────

const verifyUploadedFile = async (file) => {

  const handle = await fs.promises.open(file.path, 'r');

  let buffer;

  try {
    buffer = Buffer.alloc(8);

    const { bytesRead } = await handle.read(
      buffer,
      0,
      8,
      0
    );

    buffer = buffer.subarray(0, bytesRead);

  } finally {
    await handle.close();
  }

  const detected = detectFileType(buffer);

  if (!detected) {
    throw new Error(
      'The uploaded file does not contain a supported document signature.'
    );
  }

  const originalExtension =
    path.extname(file.originalname).toLowerCase();

  const expected = ALLOWED_FILES[originalExtension];

  if (!expected || expected.mime !== detected.mime) {
    throw new Error(
      'The uploaded file content does not match its file extension.'
    );
  }

  if (
    detected.extension &&
    originalExtension !== detected.extension
  ) {
    throw new Error(
      'The uploaded file extension does not match its actual format.'
    );
  }

  file.detectedMimeType = detected.mime;

  return true;
};


// ─────────────────────────────────────────────
// 7. SAFE FILE CLEANUP
// ─────────────────────────────────────────────

const removeFile = async (filePath) => {

  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Upload cleanup error:', err.message);
    }
  }

};


// ─────────────────────────────────────────────
// 8. CUSTOM SINGLE-FILE MIDDLEWARE
// ─────────────────────────────────────────────

const upload = {

  single(fieldName) {

    const multerSingle = multerUpload.single(fieldName);

    return (req, res, next) => {

      multerSingle(req, res, async (err) => {

        if (err) {

          if (err instanceof multer.MulterError) {

            const isTooLarge = err.code === 'LIMIT_FILE_SIZE';

            return res.status(isTooLarge ? 413 : 400).send(
              isTooLarge
                ? 'Document exceeds the maximum allowed size of 5 MB.'
                : 'Invalid document upload. Please check your file and try again.'
            );

          }

          return res.status(400).send(
            err.message || 'Invalid document upload.'
          );
        }

        if (!req.file) {
          return next();
        }

        try {

          await verifyUploadedFile(req.file);

          next();

        } catch (validationError) {

          await removeFile(req.file.path);

          console.error(
            'Document validation error:',
            validationError.message
          );

          return res.status(400).send(
            validationError.message
          );
        }

      });

    };

  }

};


// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

module.exports = upload;
