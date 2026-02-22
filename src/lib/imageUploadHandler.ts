/**
 * Shared image selection and validation logic for message image uploads.
 * Used by useMessages and useChannelMessages hooks.
 */
import { showError } from './toast';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Handles image file selection from an input element.
 * Validates file type and size, then calls the provided callbacks.
 */
export function handleImageFileSelect(
  e: React.ChangeEvent<HTMLInputElement>,
  onFile: (file: File) => void,
  onPreview: (preview: string) => void
): void {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    showError('Image must be under 10MB');
    return;
  }

  onFile(file);
  const reader = new FileReader();
  reader.onload = (ev) => onPreview(ev.target?.result as string);
  reader.readAsDataURL(file);
  e.target.value = '';
}
