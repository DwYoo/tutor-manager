'use client'

import { useState } from 'react'
import Dashboard from '@/components/Dashboard'
import Schedule from '@/components/Schedule'
import Students from '@/components/Students'
import StudentDetail from '@/components/StudentDetail'
import Tuition from '@/components/Tuition'
import Sidebar from '@/components/Sidebar'

const NAV = [
  { id: 'dashboard', l: '대시보드' },
  { id: 'schedule', l: '수업 일정' },
  { id: 'students', l: '학생 관리' },
  { id: 'tuition', l: '수업료' },
]

export default function Home() {
  const [page, setPage] = useState('dashboard')
  const [sideOpen, setSideOpen] = useState(false)
  const [detailStudent, setDetailStudent] = useState(null)

  const goDetail = (stu) => { setDetailStudent(stu); setPage('student-detail') }
  const goBack = () => { setDetailStudent(null); setPage('students') }

  const MenuButton = () => (
    <button
      onClick={() => setSideOpen(true)}
      className="w-11 h-11 rounded-[10px] border-2 border-bd bg-sf flex items-center justify-center shrink-0 cursor-pointer relative z-30 lg:hidden"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  )

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar - always visible on lg+ */}
      <div className="hidden lg:block">
        <Sidebar
          nav={NAV}
          page={page}
          onNav={(id) => { setPage(id); setDetailStudent(null) }}
          onClose={() => {}}
          isDesktop
        />
      </div>

      {/* Mobile sidebar - overlay */}
      {sideOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSideOpen(false)} />
          <div className="fixed left-0 top-0 z-50 lg:hidden shadow-xl">
            <Sidebar
              nav={NAV}
              page={page}
              onNav={(id) => { setPage(id); setDetailStudent(null); setSideOpen(false) }}
              onClose={() => setSideOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="animate-fadeIn">
          {page === 'dashboard' && <Dashboard onNav={setPage} onDetail={goDetail} menuBtn={<MenuButton />} />}
          {page === 'schedule' && <Schedule menuBtn={<MenuButton />} />}
          {page === 'students' && <Students onDetail={goDetail} menuBtn={<MenuButton />} />}
          {page === 'student-detail' && <StudentDetail student={detailStudent} onBack={goBack} menuBtn={<MenuButton />} />}
          {page === 'tuition' && <Tuition menuBtn={<MenuButton />} />}
        </div>
      </div>
    </div>
  )
}