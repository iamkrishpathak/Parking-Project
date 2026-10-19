const multer = require('multer');
const path = require('path');
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, PNG, GIF) and PDF files are allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 2 },
});

module.exports = upload;
