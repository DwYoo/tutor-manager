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
const STATUS = [
  { id: 'paid', l: '완납', c: '#16A34A', bg: '#F0FDF4' },
  { id: 'partial', l: '일부납', c: '#F59E0B', bg: '#FFFBEB' },
  { id: 'unpaid', l: '미납', c: '#DC2626', bg: '#FEF2F2' },
]

export default function Students({ onDetail, menuBtn }) {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', grade: '', subject: '', school: '', phone: '', parent_name: '', parent_phone: '', fee: '' })

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('created_at')
    setStudents(data || [])
    setLoading(false)
  }

  const addStudent = async () => {
    if (!form.name.trim()) return
    const { error } = await supabase.from('students').insert({
      ...form,
      fee: parseInt(form.fee) || 0,
      color_index: students.length % 8,
      fee_status: 'unpaid',
    })
    if (!error) {
      setForm({ name: '', grade: '', subject: '', school: '', phone: '', parent_name: '', parent_phone: '', fee: '' })
      setShowAdd(false)
      fetchStudents()
    }
  }

  const deleteStudent = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('students').delete().eq('id', id)
    fetchStudents()
  }

  const filtered = students.filter(s =>
    s.name?.includes(search) || s.subject?.includes(search) || s.school?.includes(search)
  )

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-tt text-sm">불러오는 중...</div></div>

  return (
    <div className="p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          {menuBtn}
          <h1 className="text-lg md:text-xl font-bold text-tp">학생 관리</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 sm:w-[200px] px-3.5 py-2 rounded-lg border border-bd text-[13px] text-tp outline-none"
            placeholder="검색..."
          />
          <button
            onClick={() => setShowAdd(true)}
            className="bg-pr text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer whitespace-nowrap"
          >
            + 추가
          </button>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-sf rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-bold text-tp">학생 추가</h2>
              <button onClick={() => setShowAdd(false)} className="text-tt bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { k: 'name', l: '이름', ph: '학생 이름' },
                { k: 'grade', l: '학년', ph: '예: 고2' },
                { k: 'subject', l: '과목', ph: '예: 수학' },
                { k: 'school', l: '학교', ph: '학교명' },
                { k: 'phone', l: '연락처', ph: '010-0000-0000' },
                { k: 'parent_name', l: '학부모 이름', ph: '학부모 성함' },
                { k: 'parent_phone', l: '학부모 연락처', ph: '010-0000-0000' },
                { k: 'fee', l: '월 수업료', ph: '예: 400000' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-medium text-tt mb-1.5">{f.l}</label>
                  <input
                    value={form[f.k]}
                    onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-bd text-sm text-tp outline-none"
                    placeholder={f.ph}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 mt-5 justify-end">
              <button onClick={() => setShowAdd(false)} className="bg-sfh text-ts border border-bd rounded-lg px-5 py-2.5 text-[13px] cursor-pointer">취소</button>
              <button onClick={addStudent} className="bg-pr text-white border-none rounded-lg px-6 py-2.5 text-[13px] font-semibold cursor-pointer">추가</button>
            </div>
          </div>
        </div>
      )}

      {/* Student cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filtered.map(s => {
          const col = SC[s.color_index % 8]
          const st = STATUS.find(x => x.id === s.fee_status) || STATUS[2]
          return (
            <div
              key={s.id}
              className="bg-sf border border-bd rounded-[14px] p-5 cursor-pointer hover:bg-sfh transition-colors"
              style={{ borderTop: `3px solid ${col.b}` }}
            >
              <div onClick={() => onDetail(s)}>
                <div className="flex items-center gap-3 mb-3.5">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-base font-bold"
                    style={{ background: col.bg, color: col.t }}
                  >
                    {s.name[0]}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-tp">{s.name}</div>
                    <div className="flex gap-1 mt-0.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px]" style={{ background: col.bg, color: col.t }}>{s.subject}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-[5px] bg-sfh text-ts">{s.grade}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-ts">
                  <span>다음: {s.next_class || '-'}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px]" style={{ background: st.bg, color: st.c }}>{st.l}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 text-xs" style={{ borderTop: '1px solid #F0EFED' }}>
                  <span className="text-ts">{s.school}</span>
                  <span className="font-semibold text-tp">₩{(s.fee || 0).toLocaleString()}/월</span>
                </div>
              </div>
              <div className="mt-2 pt-2 flex justify-end" style={{ borderTop: '1px solid #F0EFED' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteStudent(s.id) }}
                  className="text-[11px] text-tt bg-transparent border-none cursor-pointer hover:text-dn"
                >
                  삭제
                </button>
              </div>
            </div>
          )
        })}

        {/* Add card */}
        <div
          onClick={() => setShowAdd(true)}
          className="bg-sf border-2 border-dashed border-bd rounded-[14px] p-5 cursor-pointer flex flex-col items-center justify-center min-h-[160px] text-tt hover:bg-sfh transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <div className="mt-2 text-[13px]">학생 추가</div>
        </div>
      </div>
    </div>
  )
}