'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const SC = [
  { bg: '#DBEAFE', t: '#1E40AF', b: '#93C5FD' },
  { bg: '#FCE7F3', t: '#9D174D', b: '#F9A8D4' },
  { bg: '#D1FAE5', t: '#065F46', b: '#6EE7B7' },
  { bg: '#FEF3C7', t: '#92400E', b: '#FCD34D' },
  { bg: '#EDE9FE', t: '#5B21B6', b: '#C4B5FD' },
  { bg: '#FFE4E6', t: '#9F1239', b: '#FDA4AF' },
  { bg: '#CCFBF1', t: '#115E59', b: '#5EEAD4' },
  { bg: '#FEE2E2', t: '#991B1B', b: '#FCA5A5' },
]

export default function Dashboard({ onNav, onDetail, menuBtn }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setStudents(data || [])
    setLoading(false)
  }

  const totalFee = students.reduce((a, s) => a + (s.fee || 0), 0)
  const unpaid = students.filter(s => s.fee_status === 'unpaid')
  const partial = students.filter(s => s.fee_status === 'partial')
  const unpaidAmount = [...unpaid, ...partial].reduce((a, s) => a + (s.fee || 0), 0)

  const stats = [
    { l: '전체 학생', v: students.length, sub: '관리 중', c: '#2563EB', click: () => onNav('students') },
    { l: '이번 주 수업', v: '-', sub: '집계 중', c: '#16A34A', click: () => onNav('schedule') },
    { l: '월 수입', v: `₩${Math.round(totalFee / 10000)}만`, sub: '이번 달', c: '#F59E0B', click: () => onNav('tuition') },
    { l: '미수금', v: `₩${Math.round(unpaidAmount / 10000)}만`, sub: `${unpaid.length + partial.length}명`, c: '#DC2626', click: () => onNav('tuition') },
  ]

  const weekData = [
    { day: '월', c: 3 }, { day: '화', c: 2 }, { day: '수', c: 3 },
    { day: '목', c: 3 }, { day: '금', c: 2 }, { day: '토', c: 1 }, { day: '일', c: 0 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-tt text-sm">불러오는 중...</div>
    </div>
  )

  return (
    <div className="p-4 md:p-7">
      {/* Header */}
      <div className="mb-7 flex items-center gap-3">
        {menuBtn}
        <div>
          <h1 className="text-xl md:text-[22px] font-bold text-tp">안녕하세요, 선생님 👋</h1>
          <p className="text-sm text-ts mt-1">오늘의 수업과 학생 현황을 확인하세요.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {stats.map((s, i) => (
          <div
            key={i}
            onClick={s.click}
            className="bg-sf border border-bd rounded-[14px] p-4 md:p-5 cursor-pointer hover:bg-sfh transition-colors"
          >
            <div className="text-xs text-tt mb-1.5">{s.l}</div>
            <div className="text-xl md:text-2xl font-bold text-tp">{s.v}</div>
            <div className="text-[11px] mt-1" style={{ color: s.c }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Quick actions */}
          <div className="bg-sf border border-bd rounded-[14px] p-5">
            <h3 className="text-[15px] font-semibold text-tp mb-4">빠른 작업</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { l: '수업 추가', d: '새 수업 일정', bg: '#EFF6FF', c: '#2563EB', p: 'schedule' },
                { l: '학생 추가', d: '새 학생 등록', bg: '#F0FDF4', c: '#16A34A', p: 'students' },
                { l: '수업료 관리', d: '청구/확인', bg: '#FFFBEB', c: '#F59E0B', p: 'tuition' },
                { l: '일정 보기', d: '이번 주 일정', bg: '#FEF2F2', c: '#DC2626', p: 'schedule' },
              ].map((a, i) => (
                <button
                  key={i}
                  onClick={() => onNav(a.p)}
                  className="rounded-xl p-4 border-none cursor-pointer text-left hover:opacity-80 transition-opacity"
                  style={{ background: a.bg }}
                >
                  <div className="text-sm font-semibold mb-1" style={{ color: a.c }}>{a.l}</div>
                  <div className="text-[11px] text-tt">{a.d}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Weekly chart */}
          <div className="bg-sf border border-bd rounded-[14px] p-5">
            <h3 className="text-[15px] font-semibold text-tp mb-4">주간 수업</h3>
            <div className="flex items-end gap-2 h-[100px] px-2">
              {weekData.map((d, i) => {
                const h = d.c > 0 ? (d.c / 5) * 100 : 4
                const isToday = i === new Date().getDay() - 1
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="text-[11px] font-semibold text-tt">{d.c}</div>
                    <div
                      className="w-full rounded-md"
                      style={{ height: `${h}%`, minHeight: 4, background: isToday ? '#2563EB' : '#F0EFED' }}
                    />
                    <div className={`text-xs ${isToday ? 'font-bold text-ac' : 'text-tt'}`}>{d.day}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Student list */}
          <div className="bg-sf border border-bd rounded-[14px] p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[15px] font-semibold text-tp">학생 현황</h3>
              <button onClick={() => onNav('students')} className="text-[11px] text-ac bg-transparent border-none cursor-pointer">
                전체보기 →
              </button>
            </div>
            <div className="max-h-[320px] overflow-auto">
              {students.map((s, i) => {
                const col = SC[s.color_index % 8]
                return (
                  <div
                    key={s.id}
                    onClick={() => onDetail(s)}
                    className="flex items-center gap-2.5 py-2 px-1 cursor-pointer rounded-md hover:bg-sfh transition-colors"
                    style={{ borderBottom: i < students.length - 1 ? '1px solid #F0EFED' : 'none' }}
                  >
                    <div
                      className="w-7 h-7 rounded-[7px] flex items-center justify-center text-xs font-bold"
                      style={{ background: col.bg, color: col.t }}
                    >
                      {s.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-tp">{s.name}</div>
                      <div className="text-[11px] text-tt">{s.subject} · {s.grade}</div>
                    </div>
                    <span className="text-[11px] text-tt">{s.next_class}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}