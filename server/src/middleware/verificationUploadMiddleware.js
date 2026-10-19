const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 8, fields: 24 },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error('Upload JPG, PNG, GIF, WebP, or PDF files only');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

module.exports = upload;
