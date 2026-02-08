import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../../lib/cloudinary';
import { showError, showSuccess } from '../../lib/toast';

interface ServerBannerUploadProps {
  nightMode: boolean;
  currentBannerUrl?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

const ServerBannerUpload: React.FC<ServerBannerUploadProps> = ({
  nightMode,
  currentBannerUrl,
  onUpload,
  onRemove,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentBannerUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be under 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      const result = await uploadImage(file, {
        folder: 'lightning/banners',
      });

      onUpload(result.url);
      showSuccess('Banner uploaded!');
    } catch (error: any) {
      showError(error.message || 'Failed to upload banner');
      setPreview(currentBannerUrl || null);
    }
    setIsUploading(false);
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const nm = nightMode;

  return (
    <div className="space-y-3">
      <label className={`block text-sm font-semibold ${nm ? 'text-white/70' : 'text-black/70'}`}>
        <ImageIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
        Server Banner
      </label>

      {/* Preview / Upload area */}
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img
            src={preview}
            alt="Server banner"
            className="w-full h-32 object-cover"
            style={{ filter: isUploading ? 'brightness(0.5)' : 'none' }}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
            </div>
          )}
          {!isUploading && (
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Upload className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(239,68,68,0.7)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
            nm
              ? 'border-white/15 bg-white/5 hover:bg-white/8 text-white/40'
              : 'border-black/10 bg-black/3 hover:bg-black/5 text-black/40'
          }`}
        >
          <Upload className="w-5 h-5" />
          <span className="text-xs font-medium">Upload banner image</span>
          <span className={`text-[10px] ${nm ? 'text-white/20' : 'text-black/20'}`}>
            JPEG, PNG, WebP &bull; Max 5MB
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ServerBannerUpload;
