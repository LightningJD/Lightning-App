import { useState, useRef } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { uploadProfilePicture, isCloudinaryConfigured } from '../lib/cloudinary';
import { showError, showLoading, updateToSuccess, updateToError } from '../lib/toast';

interface ImageUploadButtonProps {
  onUploadComplete?: (imageUrl: string) => void;
  currentImage?: string | null;
  nightMode?: boolean;
  buttonText?: string;
}

/**
 * ImageUploadButton Component
 *
 * Handles image selection, preview, and upload to Cloudinary
 * Used for profile pictures, group avatars, etc.
 */
const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onUploadComplete,
  currentImage,
  nightMode = false,
  buttonText = "Upload Picture"
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showError('Please upload a JPG, PNG, GIF, or WebP image');
      setError('Invalid file type');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('Image too large. Please choose an image under 10MB');
      setError('File too large');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Start upload
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    // Check Cloudinary configuration
    if (!isCloudinaryConfigured()) {
      showError('Image upload not configured. Please check your environment variables.');
      setError('Not configured');
      console.error('❌ Cloudinary not configured. See docs/CLOUDINARY_SETUP.md');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    const toastId = showLoading('Uploading image...');

    try {
      // Simulate progress (Cloudinary doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload to Cloudinary
      const imageUrl = await uploadProfilePicture(file);

      // Complete progress
      clearInterval(progressInterval);
      setProgress(100);

      // Call parent callback with uploaded URL
      if (onUploadComplete) {
        onUploadComplete(imageUrl);
      }

      console.log('✅ Image uploaded:', imageUrl);
      updateToSuccess(toastId, 'Image uploaded successfully!');

      // Reset after 1 second
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 1000);

    } catch (err) {
      console.error('❌ Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image. Please try again.';
      updateToError(toastId, errorMessage);
      setError(errorMessage);
      setIsUploading(false);
      setProgress(0);
      setPreview(null);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          nightMode
            ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-100'
            : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700'
        }`}
      >
        {isUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Uploading... {progress}%
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            {buttonText}
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isUploading && (
        <div className={`h-2 rounded-full overflow-hidden ${nightMode ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Preview */}
      {preview && !isUploading && (
        <div className={`relative rounded-lg overflow-hidden border ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold">
            <Check className="w-3 h-3" />
            Uploaded
          </div>
        </div>
      )}

      {/* Current Image */}
      {currentImage && !preview && !isUploading && (
        <div className={`relative rounded-lg overflow-hidden border ${nightMode ? 'border-white/10' : 'border-slate-200'}`}>
          <img
            src={currentImage}
            alt="Current"
            className="w-full h-48 object-cover"
          />
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${nightMode ? 'from-black/70 to-transparent' : 'from-black/50 to-transparent'} p-2`}>
            <p className="text-white text-xs font-medium">Current Image</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-100 border border-red-300">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Help Text */}
      {!isUploading && !error && (
        <p className={`text-xs ${nightMode ? 'text-slate-100' : 'text-slate-500'}`}>
          Max 10MB • JPG, PNG, GIF, or WebP
        </p>
      )}
    </div>
  );
};

export default ImageUploadButton;
