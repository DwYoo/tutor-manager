'use client'

import { useState } from 'react'
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

const p2 = n => String(n).padStart(2, '0')

export default function LessonDetailModal({ lesson, student, isParent, onClose, onRefresh }) {
  const col = SC[student.color_index % 8]
  const l = lesson
  const em = (l.start_hour || 0) * 60 + (l.start_min || 0) + (l.duration || 0)

  const [tab, setTab] = useState('content')
  const [topic, setTopic] = useState(l.topic || '')
  const [content, setContent] = useState(l.content || '')
  const [feedback, setFeedback] = useState(l.feedback || '')
  const [privateMemo, setPrivateMemo] = useState(l.private_memo || '')
  const [planShared, setPlanShared] = useState(l.plan_shared || '')
  const [planPrivate, setPlanPrivate] = useState(l.plan_private || '')
  const [dirty, setDirty] = useState(false)

  // Homework
  const [hw, setHw] = useState(l.homework || [])
  const [newHw, setNewHw] = useState('')

  const markDirty = () => setDirty(true)

  const doSave = async () => {
    await supabase.from('lessons').update({
      topic, content, feedback, private_memo: privateMemo,
      plan_shared: planShared, plan_private: planPrivate,
    }).eq('id', l.id)
    setDirty(false)
    onRefresh()
  }

  const addHw = async () => {
    if (!newHw.trim()) return
    await supabase.from('homework').insert({ lesson_id: l.id, title: newHw, completion_pct: 0 })
    setNewHw('')
    onRefresh()
    const { data } = await supabase.from('homework').select('*').eq('lesson_id', l.id)
    setHw(data || [])
  }

  const delHw = async (id) => {
    await supabase.from('homework').delete().eq('id', id)
    setHw(hw.filter(h => h.id !== id))
    onRefresh()
  }

  const updHw = async (id, key, val) => {
    await supabase.from('homework').update({ [key]: val }).eq('id', id)
    setHw(hw.map(h => h.id === id ? { ...h, [key]: val } : h))
  }

  const deleteLesson = async () => {
    if (!confirm('이 수업 기록을 삭제하시겠습니까?')) return
    await supabase.from('lessons').delete().eq('id', l.id)
    onClose()
    onRefresh()
  }

  const tabs = [
    { id: 'content', l: '수업 내용' },
    { id: 'feedback', l: '피드백' },
    { id: 'hw', l: '숙제' },
    { id: 'plan', l: '계획' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-sf rounded-2xl w-full max-w-[560px] max-h-[90vh] flex flex-col shadow-xl overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 shrink-0">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: col.b }} />
                <h2 className="text-lg font-bold text-tp">{student.name}</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md" style={{ background: col.bg, color: col.t }}>{l.subject}</span>
              </div>
              <input
                value={topic}
                onChange={e => { setTopic(e.target.value); markDirty() }}
                className="border-none outline-none text-sm font-medium text-tp bg-transparent p-0 w-full"
                style={{ borderBottom: '1px dashed #E7E5E4' }}
                placeholder="수업 주제 입력..."
              />
            </div>
            <button onClick={onClose} className="text-tt bg-transparent border-none cursor-pointer ml-3 shrink-0 flex">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-ts mb-4">
            <span>{p2(l.start_hour || 0)}:{p2(l.start_min || 0)} ~ {p2(Math.floor(em / 60))}:{p2(em % 60)} ({l.duration}분)</span>
            <span className="text-xs text-tt">{l.date}</span>
          </div>
          <div className="flex gap-0 border-b border-bd">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3.5 py-2 text-xs cursor-pointer border-none bg-transparent -mb-px
                  ${tab === t.id ? 'text-ac font-semibold' : 'text-tt'}`}
                style={{ borderBottom: tab === t.id ? '2px solid #2563EB' : '2px solid transparent' }}>
                {t.l}
                {t.id === 'hw' && hw.length > 0 && (
                  <span className="ml-1 bg-ac text-white rounded-full px-1.5 py-px text-[10px]">{hw.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {tab === 'content' && (
            <div>
              <label className="block text-xs font-medium text-tt mb-1.5">수업 내용</label>
              <textarea value={content} onChange={e => { setContent(e.target.value); markDirty() }}
                className="w-full px-3 py-2.5 rounded-lg border border-bd text-sm outline-none resize-y min-h-[200px] leading-relaxed"
                placeholder="오늘 수업에서 다룬 내용..." />
            </div>
          )}

          {tab === 'feedback' && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-medium text-tt mb-1">
                  학생 피드백 <span className="text-ac font-normal">(공개)</span>
                </label>
                <div className="bg-as border border-al rounded-lg px-3 py-1.5 text-[11px] text-ac mb-2">학생과 학부모에게 공유됩니다.</div>
                <textarea value={feedback} onChange={e => { setFeedback(e.target.value); markDirty() }}
                  className="w-full px-3 py-2.5 rounded-lg border border-bd text-sm outline-none resize-y min-h-[120px] leading-relaxed"
                  placeholder="학생 이해도, 태도, 개선점..." />
              </div>
              {!isParent && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <label className="text-xs font-medium text-tt">선생님 메모 <span className="text-dn font-semibold">(비공개)</span></label>
                  </div>
                  <div className="bg-wb border border-[#FDE68A] rounded-lg px-3 py-1.5 text-[11px] text-[#92400E] mb-2">선생님만 볼 수 있습니다.</div>
                  <textarea value={privateMemo} onChange={e => { setPrivateMemo(e.target.value); markDirty() }}
                    className="w-full px-3 py-2.5 rounded-lg border border-bd text-sm outline-none resize-y min-h-[100px] leading-relaxed"
                    placeholder="다음 수업 준비, 학생 특이사항..." />
                </div>
              )}
            </div>
          )}

          {tab === 'hw' && (
            <div>
              <div className="flex gap-2 mb-5">
                <input value={newHw} onChange={e => setNewHw(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addHw() }}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-bd text-sm outline-none"
                  placeholder="숙제 제목 입력 후 Enter..." />
                <button onClick={addHw} className="bg-pr text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer whitespace-nowrap">추가</button>
              </div>
              {hw.length === 0 ? (
                <div className="text-center p-10 text-tt text-sm">아직 숙제가 없습니다</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {hw.map((h, i) => {
                    const pc = h.completion_pct >= 80 ? '#16A34A' : h.completion_pct >= 50 ? '#F59E0B' : '#DC2626'
                    const pbg = h.completion_pct >= 80 ? '#F0FDF4' : h.completion_pct >= 50 ? '#FFFBEB' : '#FEF2F2'
                    return (
                      <div key={h.id} className="border border-bd rounded-xl p-4">
                        <div className="flex justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-tt font-semibold bg-sfh rounded-md px-2 py-0.5">#{i + 1}</span>
                            <span className="text-sm font-semibold text-tp">{h.title}</span>
                          </div>
                          <button onClick={() => delHw(h.id)} className="bg-transparent border-none cursor-pointer text-tt p-1">✕</button>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs text-tt">완성도</span>
                            <span className="text-[13px] font-bold px-2 py-0.5 rounded-md" style={{ color: pc, background: pbg }}>{h.completion_pct}%</span>
                          </div>
                          <input type="range" min="0" max="100" step="5" value={h.completion_pct}
                            onChange={e => updHw(h.id, 'completion_pct', +e.target.value)}
                            className="w-full cursor-pointer" style={{ accentColor: pc }} />
                        </div>
                        <input value={h.note || ''} onChange={e => updHw(h.id, 'note', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-bd text-[13px] outline-none"
                          placeholder="숙제 관련 메모..." />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'plan' && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-ac mb-1">공유용 수업 계획</label>
                <div className="bg-as border border-al rounded-lg px-3 py-1.5 text-[11px] text-ac mb-2">학생/학부모 공유</div>
                <textarea value={planShared} onChange={e => { setPlanShared(e.target.value); markDirty() }}
                  className="w-full px-3 py-2.5 rounded-lg border border-bd text-sm outline-none resize-y min-h-[100px] leading-relaxed"
                  placeholder="다음 수업 예고, 준비물..." />
              </div>
              {!isParent && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    <label className="text-xs font-medium text-tt">선생님 전용 <span className="text-dn font-semibold">(비공개)</span></label>
                  </div>
                  <textarea value={planPrivate} onChange={e => { setPlanPrivate(e.target.value); markDirty() }}
                    className="w-full px-3 py-2.5 rounded-lg border border-bd text-sm outline-none resize-y min-h-[100px] leading-relaxed"
                    placeholder="수업 전략, 난이도 조절..." />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-bd flex justify-between items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={deleteLesson} className="bg-db text-dn border-none rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer">삭제</button>
            {dirty && <span className="text-xs text-wn">● 변경사항 있음</span>}
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="bg-sfh text-ts border border-bd rounded-lg px-5 py-2 text-[13px] cursor-pointer">닫기</button>
            <button onClick={doSave}
              className={`text-white border-none rounded-lg px-6 py-2 text-[13px] font-semibold cursor-pointer ${dirty ? 'bg-ac' : 'bg-pr'}`}>
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}