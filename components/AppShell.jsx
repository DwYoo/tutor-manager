'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';

const NAV = [
  { id: 'dashboard', l: '대시보드' },
  { id: 'schedule', l: '캘린더' },
  { id: 'students', l: '학생 관리' },
  { id: 'tuition', l: '수업료 관리' },
];

const NAV_ICONS = {
  dashboard: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>,
  schedule: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  students: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  tuition: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
};

const ShellCtx = createContext(null);
export const useShell = () => useContext(ShellCtx);

export default function AppShell({ children }) {
  const { user, signOut } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return <Login />;

  const page = pathname.startsWith('/students') ? 'students' : (pathname.split('/')[1] || 'dashboard');

  const menuBtn = (
    <button
      aria-label="메뉴 열기"
      onClick={() => setSideOpen(true)}
      style={{
        width: 44, height: 44, borderRadius: 10, border: '2px solid #E7E5E4',
        background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, position: 'relative', zIndex: 30,
      }}
      className="menu-toggle"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );

  const navigate = useCallback((id) => {
    router.push('/' + id);
    setSideOpen(false);
  }, [router]);

  return (
    <ShellCtx.Provider value={{ menuBtn }}>
      <div className="app-root" style={{ display: 'flex', height: '100vh', background: '#FAFAF9', overflow: 'hidden' }}>
        {/* Desktop sidebar */}
        <div style={{ display: 'none' }} className="desktop-sidebar">
          <Sidebar
            nav={NAV} page={page}
            onNav={navigate}
            onClose={() => {}} isDesktop
            user={user} onSignOut={signOut}
          />
        </div>

        {/* Mobile sidebar overlay */}
        {sideOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.3)', animation: 'fadeOverlay .15s ease' }}
              onClick={() => setSideOpen(false)}
              aria-hidden="true"
            />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, boxShadow: '4px 0 24px rgba(0,0,0,.1)', animation: 'slideInRight .2s ease' }}>
              <Sidebar
                nav={NAV} page={page}
                onNav={navigate}
                onClose={() => setSideOpen(false)}
                user={user} onSignOut={signOut}
              />
            </div>
          </>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <div style={{ animation: 'fadeIn .3s ease', paddingBottom: 64 }} className="main-content-area">
            {children}
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <nav aria-label="메인 내비게이션" className="mobile-nav" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: '#FFFFFF', borderTop: '1px solid #E7E5E4',
          display: 'none', justifyContent: 'space-around', alignItems: 'center',
          paddingTop: 4, paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => navigate(n.id)}
                aria-current={active ? 'page' : undefined}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, border: 'none', background: 'none', cursor: 'pointer', padding: '6px 12px', color: active ? '#2563EB' : '#A8A29E', fontFamily: 'inherit', minWidth: 56 }}>
                {NAV_ICONS[n.id]?.(active)}
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{n.l}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </ShellCtx.Provider>
  );
}
