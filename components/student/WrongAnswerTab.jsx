'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function WrongAnswerTab({ wrongs, studentId, onRefresh }) {
  const [form, setForm] = useState({ book: '', chapter: '', problem_num: '', reason: '', note: '' })
  const [filter, setFilter] = useState('')

  const addWrong = async () => {
    if (!form.problem_num.trim()) return
    await supabase.from('wrong_answers').insert({ student_id: studentId, ...form })
    setForm(f => ({ ...f, problem_num: '', reason: '', note: '' }))
    onRefresh()
  }

  const delWrong = async (id) => {
    await supabase.from('wrong_answers').delete().eq('id', id)
    onRefresh()
  }

  const books = [...new Set(wrongs.map(w => w.book).filter(Boolean))]
  const filtered = filter ? wrongs.filter(w => w.book === filter) : wrongs

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="text-base font-bold text-tp">오답 노트</h3>
        <span className="bg-db text-dn px-3 py-1 rounded-md text-xs font-semibold">총 {wrongs.length}문항</span>
      </div>

      {/* Add form */}
      <div className="bg-sf border-2 border-dashed border-bd rounded-xl p-3.5 mb-4">
        <div className="text-xs font-semibold text-tp mb-2">빠른 추가</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={form.book} onChange={e => setForm(p => ({ ...p, book: e.target.value }))}
            className="px-2.5 py-1.5 rounded-lg border border-bd text-xs outline-none" placeholder="교재명" />
          <input value={form.chapter} onChange={e => setForm(p => ({ ...p, chapter: e.target.value }))}
            className="px-2.5 py-1.5 rounded-lg border border-bd text-xs outline-none" placeholder="단원" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr_1fr_60px] gap-2">
          <input value={form.problem_num} onChange={e => setForm(p => ({ ...p, problem_num: e.target.value }))}
            className="px-2.5 py-1.5 rounded-lg border border-bd text-xs outline-none" placeholder="문제번호" />
          <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            className="px-2.5 py-1.5 rounded-lg border border-bd text-xs outline-none" placeholder="오답 사유" />
          <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
            className="px-2.5 py-1.5 rounded-lg border border-bd text-xs outline-none" placeholder="메모"
            onKeyDown={e => { if (e.key === 'Enter') addWrong() }} />
          <button onClick={addWrong} className="bg-pr text-white border-none rounded-lg text-[11px] font-semibold cursor-pointer">추가</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1 rounded-lg text-[11px] cursor-pointer border ${!filter ? 'bg-as border-ac text-ac font-semibold' : 'bg-sfh border-bd text-ts'}`}>
          전체 ({wrongs.length})
        </button>
        {books.map(b => (
          <button key={b} onClick={() => setFilter(filter === b ? '' : b)}
            className={`px-3 py-1 rounded-lg text-[11px] cursor-pointer border ${filter === b ? 'bg-as border-ac text-ac font-semibold' : 'bg-sfh border-bd text-ts'}`}>
            {b} ({wrongs.filter(w => w.book === b).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-sf border border-bd rounded-xl overflow-hidden">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b border-bd">
              {['교재', '단원', '문제', '사유', '메모', ''].map((h, i) => (
                <th key={i} className="p-2 text-left text-[10px] font-semibold text-tt bg-sfh">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id} style={{ borderBottom: '1px solid #F0EFED' }}>
                <td className="p-2 text-ts">{w.book}</td>
                <td className="p-2 text-ts">{w.chapter}</td>
                <td className="p-2 font-semibold text-dn">{w.problem_num}</td>
                <td className="p-2 text-tp">{w.reason}</td>
                <td className="p-2 text-ts text-[11px]">{w.note || '-'}</td>
                <td className="p-2 w-[30px]">
                  <button onClick={() => delWrong(w.id)} className="bg-transparent border-none cursor-pointer text-tt text-[11px] hover:text-dn">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center p-6 text-tt text-[13px]">오답 기록이 없습니다</div>}
      </div>
    </div>
  )
}