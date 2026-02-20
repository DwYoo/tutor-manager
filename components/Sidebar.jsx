'use client';
import { LayoutGrid, Calendar, Users, DollarSign, LogOut, X } from 'lucide-react';
import { C } from '@/components/Colors';

const ICONS = {
  dashboard: LayoutGrid,
  schedule: Calendar,
  students: Users,
  tuition: DollarSign,
};

export default function Sidebar({ nav, page, onNav, onClose, isDesktop, user, onSignOut }) {
  return (
    <div className="flex flex-col h-full shrink-0" style={{ width: 240, background: C.sf, borderRight: '1px solid ' + C.bd }}>
      {/* Logo */}
      <div className="border-b border-bl" style={{ padding: '24px 20px 20px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl shadow-md" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
              <span className="text-white text-lg font-extrabold">T</span>
            </div>
            <div>
              <div className="text-base font-extrabold text-tp" style={{ letterSpacing: '-0.3px' }}>과외 매니저</div>
              <div className="text-[11px] text-tt mt-px">선생님 포털</div>
            </div>
          </div>
          {!isDesktop && (
            <button onClick={onClose} aria-label="사이드바 닫기" className="bg-transparent border-none cursor-pointer text-tt flex p-1 rounded-lg hover:bg-sfh transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5" style={{ padding: '16px 12px' }}>
        <div className="text-[10px] font-semibold text-tt uppercase tracking-wider" style={{ padding: '4px 16px 8px' }}>메뉴</div>
        {nav.map(function (n) {
          var active = page === n.id || (page === 'student-detail' && n.id === 'students');
          var Icon = ICONS[n.id];
          return (
            <button key={n.id} className={'sb-item' + (active ? ' active' : '')} onClick={function () { onNav(n.id); }}>
              {Icon && <Icon size={20} strokeWidth={1.8} />}
              <span>{n.l}</span>
              {active && <div className="ml-auto rounded-full bg-ac" style={{ width: 6, height: 6 }} />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-bl p-3">
        <button className="sb-item" style={{ color: C.tt }} onClick={onSignOut}>
          <LogOut size={20} strokeWidth={1.8} />
          <span>로그아웃</span>
        </button>
        {user && (
          <div className="mt-3 bg-sfh rounded-xl" style={{ padding: '12px 16px' }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                <span className="text-white text-[11px] font-bold">{(user.email || '?')[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-tp truncate max-w-[140px]">{(user.user_metadata && user.user_metadata.full_name) || (user.email ? user.email.split('@')[0] : '') || '선생님'}</div>
                <div className="text-[10px] text-tt truncate max-w-[140px]">{user.email || ''}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
