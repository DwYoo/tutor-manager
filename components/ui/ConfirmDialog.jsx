'use client';
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { C } from '@/components/Colors';

const ConfirmCtx = createContext(null);

/**
 * Custom confirm dialog to replace native confirm().
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm('삭제하시겠습니까?');
 *   if (ok) { ... }
 *
 *   // With options:
 *   const ok = await confirm('삭제하시겠습니까?', {
 *     confirmText: '삭제',
 *     cancelText: '취소',
 *     danger: true,
 *     description: '이 작업은 되돌릴 수 없습니다.',
 *   });
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, ...options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState(null);
  }, []);

  useEffect(() => {
    if (!state) return;
    const h = (e) => {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [state, handleCancel, handleConfirm]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn .15s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.sf, borderRadius: 16,
              padding: 24, width: '100%', maxWidth: 360,
              boxShadow: '0 20px 60px rgba(0,0,0,.15)',
            }}
          >
            <div
              id="confirm-title"
              style={{
                fontSize: 15, fontWeight: 700, color: C.tp,
                marginBottom: state.description ? 8 : 20,
                lineHeight: 1.5,
              }}
            >
              {state.message}
            </div>
            {state.description && (
              <div style={{
                fontSize: 13, color: C.ts, lineHeight: 1.6,
                marginBottom: 20,
              }}>
                {state.description}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={handleCancel}
                style={{
                  background: C.sfh, color: C.ts,
                  border: '1px solid ' + C.bd,
                  borderRadius: 8, padding: '8px 16px',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: 500,
                }}
              >
                {state.cancelText || '취소'}
              </button>
              <button
                onClick={handleConfirm}
                autoFocus
                style={{
                  background: state.danger ? C.dn : C.pr,
                  color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {state.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    // Fallback to native confirm if provider not found
    return (message) => Promise.resolve(window.confirm(message));
  }
  return ctx;
}
