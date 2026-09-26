import multer from 'multer';
import path from 'path';

/**
 * ============================================================================
 * MULTER MEMORY STORAGE CONFIGURATION
 * ============================================================================
 * 
 * Stores incoming file buffers directly in RAM instead of local disk.
 * This buffer is then streamed directly to Cloudinary SDK without requiring
 * temporary disk cleanup.
 */
const storage = multer.memoryStorage();

// Allowed file extensions & MIME types for study resources
const ALLOWED_EXTENSIONS = /pdf|docx|doc|pptx|ppt|jpeg|jpg|png|webp|txt/i;
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'text/plain',
];

const fileFilter = (req, file, cb) => {
  const extname = ALLOWED_EXTENSIONS.test(path.extname(file.originalname).toLowerCase());
  const mimetype = ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype.startsWith('image/');

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only PDF, DOCX, PPTX, and image files (JPG, PNG, WEBP) are supported.'
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max file size limit
  },
  fileFilter,
});

/**
 * Custom Multer Wrapper Middleware:
 * Catches Multer-specific errors (e.g. file too large, invalid format)
 * and formats consistent JSON error responses { success: false, message: '...' }
 */
export const handleSingleUpload = (fieldName = 'file') => {
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File upload error: File size exceeds the maximum limit of 20MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Error processing uploaded file.',
        });
      }
      next();
    });
  };
};

export default { upload, handleSingleUpload };
