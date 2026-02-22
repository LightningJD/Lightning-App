import React from 'react';

interface ModalOverlayProps {
  /** Close handler — called on backdrop click and Escape key */
  onClose: () => void;
  /** Night mode toggle */
  nightMode: boolean;
  /** Children rendered inside the modal card */
  children: React.ReactNode;
  /** Max width class (e.g. "max-w-lg", "max-w-2xl"). Defaults to "max-w-2xl" */
  maxWidth?: string;
  /** Max height class. Defaults to "max-h-[85vh]" */
  maxHeight?: string;
  /** Z-index class. Defaults to "z-50" */
  zIndex?: string;
  /** Extra classes for the modal card */
  cardClassName?: string;
  /** ARIA label ID for the dialog */
  ariaLabelledBy?: string;
  /** Whether to use gradient background (ReportContent/BlockedUsers style) */
  useGradientBg?: boolean;
}

/**
 * Shared modal overlay with backdrop, centering, accessibility, and night mode.
 * Replaces the duplicated backdrop + container pattern across 10+ dialog components.
 */
export default function ModalOverlay({
  onClose,
  nightMode,
  children,
  maxWidth = 'max-w-2xl',
  maxHeight = 'max-h-[85vh]',
  zIndex = 'z-50',
  cardClassName,
  ariaLabelledBy,
  useGradientBg = false,
}: ModalOverlayProps) {
  const bgClass = useGradientBg
    ? nightMode
      ? 'bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10'
      : 'bg-white border border-slate-200'
    : nightMode
      ? 'bg-[#0a0a0a]'
      : 'bg-white';

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${zIndex} animate-in fade-in duration-200 w-full cursor-default`}
      />

      {/* Dialog container */}
      <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 pointer-events-none`}>
        <dialog
          open
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
          className={`w-full ${maxWidth} ${maxHeight} rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col ${bgClass} ${cardClassName || ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </dialog>
      </div>
    </>
  );
}
