import React, { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';

/**
 * Cloudinary Image Upload Component
 *
 * Uses Cloudinary Upload Widget for advanced features:
 * - Automatic image compression
 * - Image cropping/editing
 * - Multiple upload sources (camera, file, URL, etc.)
 * - Progress tracking
 *
 * Setup Instructions:
 * 1. Sign up at https://cloudinary.com (free tier)
 * 2. Get your Cloud Name from dashboard
 * 3. Create an Upload Preset:
 *    - Go to Settings → Upload
 *    - Scroll to "Upload presets"
 *    - Click "Add upload preset"
 *    - Set signing mode to "Unsigned"
 *    - Add transformations (optional):
 *      - Crop: Limit dimensions to 500x500
 *      - Quality: Auto
 *      - Format: Auto
 * 4. Add to .env.local:
 *    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
 */

const ImageUpload = ({ onUploadSuccess, currentImage, nightMode, buttonText = 'Upload Photo' }) => {
  const cloudinaryRef = useRef();
  const widgetRef = useRef();

  useEffect(() => {
    // Load Cloudinary widget script
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        cloudinaryRef.current = window.cloudinary;
      };
    } else {
      cloudinaryRef.current = window.cloudinary;
    }
  }, []);

  const openUploadWidget = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error('Cloudinary credentials missing. Please add to .env.local:');
      console.error('VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.error('VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset');
      alert('Image upload not configured. Please contact support.');
      return;
    }

    if (!cloudinaryRef.current) {
      console.error('Cloudinary widget not loaded yet');
      return;
    }

    // Create upload widget
    widgetRef.current = cloudinaryRef.current.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        sources: ['local', 'camera', 'url'], // Allow file upload, camera, and URL
        multiple: false, // Only allow one image
        cropping: true, // Enable cropping
        croppingAspectRatio: 1, // Square aspect ratio for profile pictures
        croppingShowDimensions: true,
        folder: 'lightning-profile-pics', // Organize uploads in a folder
        clientAllowedFormats: ['jpg', 'png', 'jpeg', 'webp'], // Allowed formats
        maxFileSize: 5000000, // 5MB max file size
        maxImageWidth: 1000, // Resize large images
        maxImageHeight: 1000,
        theme: nightMode ? 'dark' : 'white', // Match app theme
        styles: {
          palette: {
            window: nightMode ? '#0a0a0a' : '#FFFFFF',
            windowBorder: nightMode ? '#1a1a1a' : '#E5E7EB',
            tabIcon: '#3B82F6',
            menuIcons: '#3B82F6',
            textDark: nightMode ? '#FFFFFF' : '#000000',
            textLight: nightMode ? '#9CA3AF' : '#6B7280',
            link: '#3B82F6',
            action: '#3B82F6',
            inactiveTabIcon: nightMode ? '#6B7280' : '#9CA3AF',
            error: '#EF4444',
            inProgress: '#3B82F6',
            complete: '#10B981',
            sourceBg: nightMode ? '#1a1a1a' : '#F9FAFB'
          }
        },
        text: {
          'en': {
            'or': 'or',
            'menu': {
              'files': 'Upload from device',
              'camera': 'Take a photo',
              'url': 'Upload from URL'
            },
            'crop': {
              'title': 'Crop your profile picture',
              'crop_btn': 'Crop & Upload'
            }
          }
        }
      },
      (error, result) => {
        if (error) {
          console.error('Upload error:', error);
          return;
        }

        if (result.event === 'success') {
          console.log('Upload successful!', result.info);
          const imageUrl = result.info.secure_url;

          // Call success callback
          if (onUploadSuccess) {
            onUploadSuccess(imageUrl);
          }
        }

        if (result.event === 'close') {
          console.log('Upload widget closed');
        }
      }
    );

    // Open the widget
    widgetRef.current.open();
  };

  return (
    <button
      onClick={openUploadWidget}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 border ${
        nightMode
          ? 'bg-white/5 hover:bg-white/10 text-slate-100 border-white/10'
          : 'text-black shadow-md border-white/30'
      }`}
      style={
        nightMode
          ? {}
          : {
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)'
            }
      }
      onMouseEnter={(e) =>
        !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')
      }
      onMouseLeave={(e) =>
        !nightMode && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')
      }
    >
      <Camera className="w-4 h-4" />
      {buttonText}
    </button>
  );
};

export default ImageUpload;
