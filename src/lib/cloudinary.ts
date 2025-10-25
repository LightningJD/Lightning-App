/**
 * Cloudinary Upload Utilities for Lightning App
 *
 * Handles image uploads to Cloudinary with automatic optimization
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload image to Cloudinary
 * @param {File} file - Image file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with secure_url
 */
export const uploadImage = async (file, options = {}) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    console.error('❌ Cloudinary not configured. Check .env.local file.');
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

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
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
      console.error('❌ Cloudinary upload error:', error);
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload profile picture (optimized for avatars)
 * @param {File} file - Image file
 * @returns {Promise<string>} - Image URL
 */
export const uploadProfilePicture = async (file) => {
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
export const uploadGroupAvatar = async (file) => {
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
export const uploadMessageImage = async (file) => {
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
export const getOptimizedUrl = (url, options = {}) => {
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
export const deleteImage = async (publicId) => {
  console.warn('⚠️ Image deletion requires server-side API. Image will remain in Cloudinary.');
  // TODO: Implement server-side deletion with API secret
  return false;
};

// Export configuration checker
export const isCloudinaryConfigured = () => {
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
