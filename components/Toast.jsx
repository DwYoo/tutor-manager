'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const Ctx = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((msg, type = 'success') => {
    const id = ++_id;
    setToasts(p => [...p.slice(-4), { id, msg, type }]);
    timers.current[id] = setTimeout(() => remove(id), 3000);
    return id;
  }, [remove]);

  useEffect(() => {
    return () => Object.values(timers.current).forEach(clearTimeout);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: 'max(72px, calc(env(safe-area-inset-bottom) + 68px))', left: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8, pointerEvents: 'none' }} className="toast-container">
        {toasts.map(t => (
          <div key={t.id} role="alert" aria-live="polite" onClick={() => remove(t.id)} style={{
            pointerEvents: 'auto', cursor: 'pointer',
            padding: '12px 18px', borderRadius: 10, width: '100%',
            background: t.type === 'error' ? '#FEF2F2' : t.type === 'info' ? '#EFF6FF' : '#F0FDF4',
            border: `1px solid ${t.type === 'error' ? '#FECACA' : t.type === 'info' ? '#BFDBFE' : '#BBF7D0'}`,
            color: t.type === 'error' ? '#DC2626' : t.type === 'info' ? '#2563EB' : '#16A34A',
            fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,.08)',
            animation: 'toastIn .2s ease',
          }}>
            <span style={{ marginRight: 8 }} aria-hidden="true">{t.type === 'error' ? '✕' : t.type === 'info' ? 'ℹ' : '✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
