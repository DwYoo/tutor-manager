'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';
import { LayoutGrid, Calendar, Users, DollarSign, Menu } from 'lucide-react';

const NAV = [
  { id: 'dashboard', l: '대시보드' },
  { id: 'schedule', l: '캘린더' },
  { id: 'students', l: '학생 관리' },
  { id: 'tuition', l: '수업료 관리' },
];

const NAV_ICONS = {
  dashboard: LayoutGrid,
  schedule: Calendar,
  students: Users,
  tuition: DollarSign,
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
      className="menu-toggle flex items-center justify-center shrink-0 relative z-30 bg-sf border-2 border-bd rounded-[10px] cursor-pointer hover:bg-sfh transition-colors"
      style={{ width: 44, height: 44 }}
    >
      <Menu size={20} className="text-ts" />
    </button>
  );

  const navigate = useCallback((id) => {
    router.push('/' + id);
    setSideOpen(false);
  }, [router]);

  return (
    <ShellCtx.Provider value={{ menuBtn }}>
      <div className="app-root flex h-screen bg-bg overflow-hidden">
        {/* Desktop sidebar */}
        <div className="desktop-sidebar hidden">
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
            <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,.3)' }} onClick={() => setSideOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 z-50 shadow-lg">
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
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="main-content-area animate-fadeIn pb-16">
            {children}
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <nav aria-label="메인 내비게이션" className="mobile-nav fixed bottom-0 left-0 right-0 z-30 bg-sf border-t border-bd hidden justify-around items-center" style={{ paddingTop: 4, paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
          {NAV.map(n => {
            const active = page === n.id;
            const Icon = NAV_ICONS[n.id];
            return (
              <button key={n.id} aria-label={n.l} onClick={() => navigate(n.id)}
                className="flex flex-col items-center gap-px border-none bg-transparent cursor-pointer font-[inherit]"
                style={{ padding: '6px 12px', color: active ? 'var(--color-ac)' : 'var(--color-tt)', minWidth: 56 }}>
                {Icon && <Icon size={22} strokeWidth={active ? 2 : 1.5} />}
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-normal'}`}>{n.l}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </ShellCtx.Provider>
  );
}
