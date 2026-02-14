'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Login from '@/components/Login'
import Dashboard from '@/components/Dashboard'
import Schedule from '@/components/Schedule'
import Students from '@/components/Students'
import StudentDetail from '@/components/StudentDetail'
import Tuition from '@/components/Tuition'
import Sidebar from '@/components/Sidebar'

const NAV = [
  { id: 'dashboard', l: '대시보드' },
  { id: 'schedule', l: '캘린더' },
  { id: 'students', l: '학생 관리' },
  { id: 'tuition', l: '수업료' },
]

const NAV_ICONS = {
  dashboard: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>,
  schedule: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  students: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  tuition: (a) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a?2:1.5} strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
};

export default function Home() {
  const { user, signOut } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(false)
  const [detailStudent, setDetailStudent] = useState(null)
  const [detailTab, setDetailTab] = useState(null)

  // Not logged in → show Login
  if (!user) return <Login />

  const goDetail = (stu, tab) => { setDetailStudent(stu); setDetailTab(tab||null); setPage('student-detail') }
  const goBack = () => { setDetailStudent(null); setDetailTab(null); setPage('students') }

  const MenuButton = () => (
    <button
      onClick={() => setSideOpen(true)}
      style={{
        width: 44, height: 44, borderRadius: 10, border: '2px solid #E7E5E4',
        background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, position: 'relative', zIndex: 30,
      }}
      className="menu-toggle"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF9' }}>
      <style>{`
        @media(min-width:1024px){.menu-toggle{display:none!important;}.mobile-nav{display:none!important;}}
        @media(max-width:1023px){.mobile-nav{display:flex!important;}}
      `}</style>

      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar
          nav={NAV} page={page}
          onNav={(id) => { setPage(id); setDetailStudent(null) }}
          onClose={() => {}} isDesktop
          user={user} onSignOut={signOut}
        />
      </div>
      <style>{`@media(min-width:1024px){.desktop-sidebar{display:block!important;}}`}</style>

      {/* Mobile sidebar overlay */}
      {sideOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.3)' }} onClick={() => setSideOpen(false)} />
          <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 50, boxShadow: '4px 0 24px rgba(0,0,0,.1)' }}>
            <Sidebar
              nav={NAV} page={page}
              onNav={(id) => { setPage(id); setDetailStudent(null); setSideOpen(false) }}
              onClose={() => setSideOpen(false)}
              user={user} onSignOut={signOut}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ animation: 'fadeIn .3s ease', paddingBottom: 64 }} className="main-content-area">
          <style>{`@media(min-width:1024px){.main-content-area{padding-bottom:0!important;}}`}</style>
          {page === 'dashboard' && <Dashboard onNav={setPage} onDetail={goDetail} menuBtn={<MenuButton />} />}
          {page === 'schedule' && <Schedule menuBtn={<MenuButton />} />}
          {page === 'students' && <Students onDetail={goDetail} menuBtn={<MenuButton />} />}
          {page === 'student-detail' && <StudentDetail student={detailStudent} initialTab={detailTab} onBack={goBack} menuBtn={<MenuButton />} />}
          {page === 'tuition' && <Tuition menuBtn={<MenuButton />} />}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#FFFFFF', borderTop: '1px solid #E7E5E4',
        display: 'none', justifyContent: 'space-around', alignItems: 'center',
        paddingTop: 4, paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
      }}>
        {NAV.map(n => {
          const active = page === n.id || (page === 'student-detail' && n.id === 'students');
          return (
            <button key={n.id} onClick={() => { setPage(n.id); setDetailStudent(null); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, border: 'none', background: 'none', cursor: 'pointer', padding: '6px 12px', color: active ? '#2563EB' : '#A8A29E', fontFamily: 'inherit', minWidth: 56 }}>
              {NAV_ICONS[n.id]?.(active)}
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{n.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  )
}
