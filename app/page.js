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
        @media(min-width:1024px){.menu-toggle{display:none!important;}}
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
        <div style={{ animation: 'fadeIn .3s ease' }}>
          {page === 'dashboard' && <Dashboard onNav={setPage} onDetail={goDetail} menuBtn={<MenuButton />} />}
          {page === 'schedule' && <Schedule menuBtn={<MenuButton />} />}
          {page === 'students' && <Students onDetail={goDetail} menuBtn={<MenuButton />} />}
          {page === 'student-detail' && <StudentDetail student={detailStudent} initialTab={detailTab} onBack={goBack} menuBtn={<MenuButton />} />}
          {page === 'tuition' && <Tuition menuBtn={<MenuButton />} />}
        </div>
      </div>
    </div>
  )
}