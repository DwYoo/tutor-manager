'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible Modal component with focus trapping and aria attributes.
 *
 * @param {boolean} open - Whether the modal is visible
 * @param {Function} onClose - Called when the modal should close
 * @param {string} [title] - Modal title
 * @param {boolean} [bottomSheet] - Mobile bottom sheet mode
 * @param {number} [maxWidth=480] - Max width in pixels
 * @param {React.ReactNode} [footer] - Footer content
 * @param {string} [className]
 * @param {Object} [style] - Additional styles
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  bottomSheet,
  maxWidth = 480,
  footer,
  className = '',
  style: extraStyle,
}) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !contentRef.current) return;
    const el = contentRef.current;
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();

    const trap = (e) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    el.addEventListener('keydown', trap);
    return () => el.removeEventListener('keydown', trap);
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className={`fixed inset-0 z-[1000] flex animate-fadeIn ${
        bottomSheet ? 'items-end' : 'items-center'
      } justify-center`}
      style={{ background: 'rgba(0,0,0,.35)' }}
    >
      <div
        ref={contentRef}
        onClick={e => e.stopPropagation()}
        className={`bg-sf w-full overflow-y-auto shadow-xl ${className}`}
        style={{
          borderRadius: bottomSheet ? '16px 16px 0 0' : 16,
          maxWidth,
          padding: bottomSheet
            ? '20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)'
            : 24,
          maxHeight: bottomSheet ? '90vh' : '85vh',
          ...extraStyle,
        }}
      >
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 id="modal-title" className="text-[17px] font-bold text-tp m-0">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="bg-transparent border-none cursor-pointer text-tt flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg hover:bg-sfh transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
        {footer && (
          <div className="mt-4 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
