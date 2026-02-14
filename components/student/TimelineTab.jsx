'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const p2 = n => String(n).padStart(2, '0')

export default function TimelineTab({ lessons, isParent, onLessonClick, studentId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ date: '', start_hour: 14, start_min: 0, duration: 90, subject: '', topic: '' })

  const addLesson = async () => {
    if (!form.date || !form.subject) return
    const { error } = await supabase.from('lessons').insert({
      student_id: studentId,
      date: form.date,
      start_hour: parseInt(form.start_hour),
      start_min: parseInt(form.start_min),
      duration: parseInt(form.duration),
      subject: form.subject,
      topic: form.topic,
    })
    if (!error) {
      setForm({ date: '', start_hour: 14, start_min: 0, duration: 90, subject: '', topic: '' })
      setShowAdd(false)
      onRefresh()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-tp">수업 타임라인</h3>
        {!isParent && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-pr text-white border-none rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            + 수업 추가
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-sf border-2 border-ac rounded-[14px] p-5 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-tt mb-1">날짜</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-tt mb-1">과목</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="수학" />
            </div>
            <div>
              <label className="block text-xs font-medium text-tt mb-1">주제</label>
              <input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="수업 주제" />
            </div>
            <div>
              <label className="block text-xs font-medium text-tt mb-1">시작(시)</label>
              <select value={form.start_hour} onChange={e => setForm(p => ({ ...p, start_hour: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{p2(i)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-tt mb-1">시작(분)</label>
              <select value={form.start_min} onChange={e => setForm(p => ({ ...p, start_min: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none">
                {[0, 10, 15, 20, 30, 40, 45, 50].map(m => <option key={m} value={m}>{p2(m)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-tt mb-1">시간(분)</label>
              <input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" step="5" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="bg-sfh text-ts border border-bd rounded-lg px-4 py-2 text-xs cursor-pointer">취소</button>
            <button onClick={addLesson} className="bg-pr text-white border-none rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer">추가</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {lessons.length === 0 ? (
        <div className="bg-sf border border-bd rounded-[14px] p-10 text-center text-tt">
          <div className="text-base mb-2">아직 수업 기록이 없습니다</div>
          <div className="text-sm">위의 '수업 추가' 버튼으로 시작하세요.</div>
        </div>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-bl" />
          {lessons.map((l, i) => {
            const hwCount = l.homework?.length || 0
            const em = (l.start_hour || 0) * 60 + (l.start_min || 0) + (l.duration || 0)
            return (
              <div key={l.id} className="relative mb-5">
                <div className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-ac' : 'bg-bd'}`} />
                <div
                  onClick={() => onLessonClick(l)}
                  className="bg-sf border border-bd rounded-[10px] p-4 cursor-pointer hover:bg-sfh transition-colors"
                  style={i === 0 ? { borderLeft: '3px solid #2563EB' } : {}}
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-tp">{l.topic || '(주제 없음)'}</span>
                    <span className="text-xs text-tt">{l.date}</span>
                  </div>
                  {l.content && <div className="text-[13px] text-ts leading-relaxed mb-1.5">{l.content}</div>}
                  {l.feedback && <div className="text-xs text-ac mb-1">💬 {l.feedback}</div>}
                  {!isParent && l.private_memo && (
                    <div className="bg-wb rounded-md px-2.5 py-1.5 text-[11px] text-[#92400E] mt-1">🔒 {l.private_memo}</div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-tt">
                      {p2(l.start_hour || 0)}:{p2(l.start_min || 0)} ~ {p2(Math.floor(em / 60))}:{p2(em % 60)} ({l.duration}분)
                    </span>
                    {hwCount > 0 && (
                      <span className="text-[10px] bg-ac text-white px-2 py-0.5 rounded-full font-semibold">숙제 {hwCount}</span>
                    )}
                  </div>
                  {l.homework && l.homework.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {l.homework.map(h => {
                        const pc = h.completion_pct >= 100 ? '#16A34A' : h.completion_pct > 30 ? '#F59E0B' : h.completion_pct > 0 ? '#EA580C' : '#DC2626'
                        const bg = h.completion_pct >= 100 ? '#F0FDF4' : h.completion_pct > 30 ? '#FFFBEB' : h.completion_pct > 0 ? '#FFF7ED' : '#FEF2F2'
                        return (
                          <span key={h.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-[5px]" style={{ background: bg, color: pc }}>
                            {h.title} {h.completion_pct}%
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <div className="text-[11px] text-ac mt-1.5 opacity-70">클릭하여 상세 →</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}