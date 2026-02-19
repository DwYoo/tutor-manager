'use client';
import { useEffect, useRef, useCallback } from 'react';
import { C } from '@/components/Colors';

/**
 * Accessible Modal component with focus trapping and aria attributes.
 *
 * @param {boolean} open - Whether the modal is visible
 * @param {Function} onClose - Called when the modal should close
 * @param {string} [title] - Modal title
 * @param {boolean} [bottomSheet] - Mobile bottom sheet mode
 * @param {number} [maxWidth=480] - Max width in pixels
 * @param {React.ReactNode} [footer] - Footer content
 * @param {Object} [style] - Additional styles for the content container
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  bottomSheet,
  maxWidth = 480,
  footer,
  style: extraStyle,
}) {
  const contentRef = useRef(null);

  // ESC key handler
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Focus trap
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
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.35)',
        display: 'flex',
        alignItems: bottomSheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        animation: 'fadeIn .15s ease',
      }}
    >
      <div
        ref={contentRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: C.sf,
          borderRadius: bottomSheet ? '16px 16px 0 0' : 16,
          width: '100%',
          maxWidth,
          padding: bottomSheet
            ? '20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)'
            : 24,
          boxShadow: '0 20px 60px rgba(0,0,0,.15)',
          maxHeight: bottomSheet ? '90vh' : '85vh',
          overflowY: 'auto',
          ...extraStyle,
        }}
      >
        {title && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16,
          }}>
            <h2 id="modal-title" style={{ fontSize: 17, fontWeight: 700, color: C.tp, margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="닫기"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.tt, fontSize: 18, display: 'flex',
                minHeight: 36, minWidth: 36, alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              ✕
            </button>
          </div>
        )}
        {children}
        {footer && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
