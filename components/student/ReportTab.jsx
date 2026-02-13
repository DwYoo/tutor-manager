'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReportTab({ reports, studentId, isParent, onRefresh }) {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', is_shared: false })

  const addReport = async () => {
    if (!form.title.trim()) return
    await supabase.from('reports').insert({ student_id: studentId, ...form })
    setForm({ title: '', body: '', is_shared: false })
    setShowNew(false)
    onRefresh()
  }

  const visibleReports = isParent ? reports.filter(r => r.is_shared) : reports

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2">
        <h3 className="text-base font-bold text-tp">학습 리포트</h3>
        {!isParent && (
          <button onClick={() => setShowNew(!showNew)}
            className="bg-pr text-white border-none rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer shrink-0">
            + 새 리포트
          </button>
        )}
      </div>

      {showNew && !isParent && (
        <div className="bg-sf border-2 border-ac rounded-[14px] p-5 mb-4">
          <div className="mb-3">
            <label className="block text-xs font-medium text-tt mb-1.5">제목</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="리포트 제목..." />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-tt mb-1.5">내용</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none resize-y min-h-[100px]" placeholder="리포트 내용..." />
          </div>
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-1.5 text-xs text-ts cursor-pointer">
              <input type="checkbox" checked={form.is_shared} onChange={e => setForm(p => ({ ...p, is_shared: e.target.checked }))} />
              학부모 공유
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="bg-sfh text-ts border border-bd rounded-lg px-3.5 py-2 text-xs cursor-pointer">취소</button>
              <button onClick={addReport} className="bg-pr text-white border-none rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer">저장</button>
            </div>
          </div>
        </div>
      )}

      {visibleReports.length === 0 ? (
        <div className="bg-sf border border-bd rounded-[14px] p-10 text-center text-tt text-sm">리포트가 없습니다.</div>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-bl" />
          {visibleReports.map((r, i) => (
            <div key={r.id} className="relative mb-4">
              <div className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-ac' : 'bg-bd'}`} />
              <div className="bg-sf border border-bd rounded-[14px] p-4" style={i === 0 ? { borderLeft: '3px solid #2563EB' } : {}}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-tp">{r.title}</span>
                    {r.is_shared
                      ? <span className="bg-as text-ac px-2 py-0.5 rounded-[5px] text-[10px] font-semibold">공유됨</span>
                      : <span className="bg-sfh text-tt px-2 py-0.5 rounded-[5px] text-[10px]">비공개</span>
                    }
                  </div>
                  <span className="text-xs text-tt shrink-0">{r.date}</span>
                </div>
                <div className="text-[13px] text-ts leading-7">{r.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}