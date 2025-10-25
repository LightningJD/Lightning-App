/**
 * Cloudinary Upload Utilities for Lightning App
 *
 * Handles image uploads to Cloudinary with automatic optimization
 */

import { logError, logWarning } from './errorLogging';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Rate limiting for uploads (prevent abuse)
const uploadAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_UPLOADS_PER_HOUR = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Check if user has exceeded upload rate limit
 */
const checkUploadRateLimit = (userId: string = 'anonymous'): void => {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(userId);

  if (!userAttempts || now > userAttempts.resetTime) {
    // First upload or window expired - reset counter
    uploadAttempts.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return;
  }

  if (userAttempts.count >= MAX_UPLOADS_PER_HOUR) {
    const minutesRemaining = Math.ceil((userAttempts.resetTime - now) / (60 * 1000));
    logWarning('Cloudinary Rate Limit', 'Upload rate limit exceeded', {
      userId,
      attempts: userAttempts.count,
      minutesRemaining
    });
    throw new Error(`Upload limit reached. Please try again in ${minutesRemaining} minutes.`);
  }

  // Increment counter
  userAttempts.count++;
  uploadAttempts.set(userId, userAttempts);
};

/**
 * Upload image to Cloudinary
 * @param {File} file - Image file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with secure_url
 */
export const uploadImage = async (file: File, options: {
  folder?: string;
  public_id?: string;
  transformation?: any;
  userId?: string; // For rate limiting
} = {}): Promise<{
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}> => {
  // Check rate limit first (before any processing)
  checkUploadRateLimit(options.userId);

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    logError('Cloudinary Upload', new Error('Cloudinary not configured'), {
      cloudName: !!CLOUD_NAME,
      uploadPreset: !!UPLOAD_PRESET
    });
    throw new Error('Cloudinary credentials missing. Please check your environment variables.');
  }

  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error('Image too large. Please choose an image under 10MB.');
  }

  // Minimum file size check (prevent 0-byte files and DoS)
  const MIN_SIZE = 100; // 100 bytes
  if (file.size < MIN_SIZE) {
    throw new Error('File is too small or corrupted.');
  }

  // Check file type (MIME type)
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
  }

  // Validate file extension (prevent MIME type spoofing)
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  if (!hasValidExtension) {
    throw new Error('Invalid file extension. Please use .jpg, .png, .gif, or .webp files.');
  }

  // Check for dangerous characters in filename
  const dangerousChars = /[<>:"\/\\|?*\x00-\x1F]/g;
  if (dangerousChars.test(file.name)) {
    throw new Error('File name contains invalid characters.');
  }

  // Prevent directory traversal attacks
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    throw new Error('Invalid file name.');
  }

  // Create form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);

  // Add optional parameters
  if (options.folder) {
    formData.append('folder', options.folder);
  }

  if (options.public_id) {
    formData.append('public_id', options.public_id);
  }

  // Don't send transformations with unsigned uploads
  // Transformations should be configured in the upload preset instead
  // if (options.transformation) {
  //   formData.append('transformation', JSON.stringify(options.transformation));
  // }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      logError('Cloudinary Upload', new Error('Upload failed'), {
        status: response.status,
        statusText: response.statusText,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();

    // Log successful upload (without sensitive data)
    if (import.meta.env.DEV) {
      console.log('✅ Image uploaded successfully:', {
        fileName: file.name,
        size: `${(file.size / 1024).toFixed(2)}KB`,
        format: data.format
      });
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (error) {
    logError('Cloudinary Upload', error, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder: options.folder
    });
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Upload failed');
  }
};

/**
 * Upload profile picture (optimized for avatars)
 * @param {File} file - Image file
 * @returns {Promise<string>} - Image URL
 */
export const uploadProfilePicture = async (file: File): Promise<string> => {
  const result = await uploadImage(file, {
    folder: 'lightning/avatars',
    transformation: {
      width: 800,
      height: 800,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto'
    }
  });

  return result.url;
};

/**
 * Upload group avatar
 * @param {File} file - Image file
 * @returns {Promise<string>} - Image URL
 */
export const uploadGroupAvatar = async (file: File): Promise<string> => {
  const result = await uploadImage(file, {
    folder: 'lightning/groups',
    transformation: {
      width: 600,
      height: 600,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto'
    }
  });

  return result.url;
};

/**
 * Upload message image (for group chats)
 * @param {File} file - Image file
 * @returns {Promise<string>} - Image URL
 */
export const uploadMessageImage = async (file: File): Promise<string> => {
  const result = await uploadImage(file, {
    folder: 'lightning/messages',
    transformation: {
      width: 1200,
      height: 1200,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto'
    }
  });

  return result.url;
};

/**
 * Get optimized image URL with transformations
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized URL
 */
export const getOptimizedUrl = (url: string, options: {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
  format?: string;
} = {}): string => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // Default transformations
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;

  // Insert transformations into URL
  const transformation = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  const optimizedUrl = url.replace('/upload/', `/upload/${transformation}/`);

  return optimizedUrl;
};

/**
 * Delete image from Cloudinary
 * Note: Requires API key/secret, should be done server-side
 * For now, images remain in Cloudinary (within free tier limits)
 * @param {string} publicId - Public ID of image to delete
 */
export const deleteImage = async (_publicId: string): Promise<boolean> => {
  console.warn('⚠️ Image deletion requires server-side API. Image will remain in Cloudinary.');
  // TODO: Implement server-side deletion with API secret
  return false;
};

// Export configuration checker
export const isCloudinaryConfigured = (): boolean => {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
};

export default {
  uploadImage,
  uploadProfilePicture,
  uploadGroupAvatar,
  uploadMessageImage,
  getOptimizedUrl,
  deleteImage,
  isCloudinaryConfigured
};
