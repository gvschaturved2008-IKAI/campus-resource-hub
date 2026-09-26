import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configure Cloudinary SDK using environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an in-memory buffer to Cloudinary using stream upload
 * 
 * @param {Buffer} buffer - File buffer from Multer memory storage
 * @param {Object} options - Upload options including original filename & folder
 * @returns {Promise<Object>} - Cloudinary upload result object
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Check if Cloudinary credentials are configured
    const hasConfig =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      !process.env.CLOUDINARY_CLOUD_NAME.includes('your_');

    if (!hasConfig) {
      console.warn(
        '⚠️ Cloudinary credentials are not fully configured in .env. Using mock upload fallback for development.'
      );
      // Clean mock fallback for local dev when credentials aren't provided yet
      const safeName = (options.originalFilename || 'document.pdf').replace(/\s+/g, '_');
      return resolve({
        secure_url: `https://res.cloudinary.com/demo/image/upload/sample.pdf`,
        public_id: `campus-resource-hub/${Date.now()}_${safeName}`,
        format: options.originalFilename ? options.originalFilename.split('.').pop() : 'pdf',
        bytes: buffer.length,
        resource_type: 'auto',
      });
    }

    const originalName = options.originalFilename || 'resource';
    const cleanName = originalName
      .substring(0, originalName.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'campus-resource-hub',
        resource_type: 'auto', // Auto handles PDF, Word, PPTX, images, etc.
        public_id: `${Date.now()}_${cleanName}`,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return reject(new Error(error.message || 'Failed to upload document to Cloudinary.'));
        }
        resolve(result);
      }
    );

    // Pipe the memory buffer into the upload stream
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

export default {
  cloudinary,
  uploadBufferToCloudinary,
};
