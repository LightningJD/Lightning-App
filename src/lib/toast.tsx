/**
 * Toast Notification Utilities for Lightning App
 *
 * Wrapper around react-hot-toast with custom styling
 */

import toast from 'react-hot-toast';

/**
 * Show success toast
 * @param {string} message - Success message to display
 * @param {Object} options - Additional toast options
 */
export const showSuccess = (message: string, options: any = {}) => {
  return toast.success(message, {
    duration: 4000,
    position: 'top-center',
    style: {
      background: '#10b981',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
    ...options,
  });
};

/**
 * Show error toast
 * @param {string} message - Error message to display
 * @param {Object} options - Additional toast options
 */
export const showError = (message: string, options: any = {}) => {
  return toast.error(message, {
    duration: 5000,
    position: 'top-center',
    style: {
      background: '#ef4444',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
    ...options,
  });
};

/**
 * Show loading toast
 * @param {string} message - Loading message to display
 * @param {Object} options - Additional toast options
 * @returns {string} Toast ID for updating later
 */
export const showLoading = (message: string, options: any = {}) => {
  return toast.loading(message, {
    position: 'top-center',
    style: {
      background: '#3b82f6',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    },
    ...options,
  });
};

/**
 * Show info toast
 * @param {string} message - Info message to display
 * @param {Object} options - Additional toast options
 */
export const showInfo = (message: string, options: any = {}) => {
  return toast(message, {
    duration: 4000,
    position: 'top-center',
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
    },
    ...options,
  });
};

/**
 * Show error with retry button
 * @param {string} message - Error message
 * @param {Function} onRetry - Function to call when retry is clicked
 */
export const showErrorWithRetry = (message: string, onRetry: () => void) => {
  return toast.error(
    (t) => (
      <div className="flex items-center gap-3">
        <span className="flex-1">{message}</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onRetry();
          }}
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    ),
    {
      duration: 7000,
      position: 'top-center',
      style: {
        background: '#ef4444',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
        maxWidth: '500px',
      },
    }
  );
};

/**
 * Update loading toast to success
 * @param {string} toastId - ID of loading toast
 * @param {string} message - Success message
 */
export const updateToSuccess = (toastId: string, message: string) => {
  toast.success(message, {
    id: toastId,
    duration: 3000,
  });
};

/**
 * Update loading toast to error
 * @param {string} toastId - ID of loading toast
 * @param {string} message - Error message
 */
export const updateToError = (toastId: string, message: string) => {
  toast.error(message, {
    id: toastId,
    duration: 4000,
  });
};

/**
 * Dismiss a specific toast
 * @param {string} toastId - ID of toast to dismiss
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAll = () => {
  toast.dismiss();
};

/**
 * Show network error toast
 */
export const showNetworkError = () => {
  return showError('No internet connection. Please check your network and try again.');
};

/**
 * Show generic error toast
 */
export const showGenericError = () => {
  return showError('Something went wrong. Please try again.');
};

/**
 * Handle async operation with toast feedback
 * @param {Function} operation - Async function to execute
 * @param {Object} messages - Toast messages { loading, success, error }
 * @returns {Promise} Result of operation
 */
export const withToast = async (operation: () => Promise<any>, messages: { loading?: string; success?: string; error?: string } = {}) => {
  const {
    loading = 'Processing...',
    success = 'Success!',
    error = 'Something went wrong',
  } = messages;

  const toastId = showLoading(loading);

  try {
    const result = await operation();
    updateToSuccess(toastId, success);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : error;
    updateToError(toastId, errorMessage);
    throw err;
  }
};

// Export default toast for advanced usage
export default toast;
