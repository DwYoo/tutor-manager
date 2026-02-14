'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HomeworkTab({ homework, lessons, onRefresh }) {
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const avgHw = homework.length
    ? Math.round(homework.reduce((a, h) => a + (h.completion_pct || 0), 0) / homework.length)
    : 0

  const updateHw = async (id, key, val) => {
    await supabase.from('homework').update({ [key]: val }).eq('id', id)
    onRefresh()
  }

  const completed = homework.filter(h => h.completion_pct === 100).length
  const inProgress = homework.filter(h => h.completion_pct > 0 && h.completion_pct < 100).length
  const notStarted = homework.filter(h => h.completion_pct === 0).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h3 className="text-base font-bold text-tp">숙제 현황</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-ts cursor-pointer select-none">
            <input type="checkbox" checked={onlyIncomplete} onChange={e => setOnlyIncomplete(e.target.checked)} className="cursor-pointer" />
            미완료만
          </label>
          <span className="bg-sb text-su text-[11px] font-semibold px-2.5 py-1 rounded-md">완료 {completed}</span>
          <span className="bg-wb text-wn text-[11px] font-semibold px-2.5 py-1 rounded-md">진행 {inProgress}</span>
          <span className="bg-db text-dn text-[11px] font-semibold px-2.5 py-1 rounded-md">미시작 {notStarted}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="bg-sf border border-bd rounded-xl p-4 text-center">
          <div className="text-[11px] text-tt">평균 완성도</div>
          <div className={`text-2xl font-bold ${avgHw >= 80 ? 'text-su' : avgHw >= 50 ? 'text-wn' : 'text-dn'}`}>{avgHw}%</div>
        </div>
        <div className="bg-sf border border-bd rounded-xl p-4 text-center">
          <div className="text-[11px] text-tt">미완료</div>
          <div className="text-2xl font-bold text-wn">{homework.filter(h => h.completion_pct < 100).length}개</div>
        </div>
      </div>

      {homework.length === 0 ? (
        <div className="bg-sf border border-bd rounded-[14px] p-10 text-center text-tt text-sm">
          아직 숙제가 없습니다. 수업 상세에서 숙제를 추가할 수 있습니다.
        </div>
      ) : (
        <div>
          {lessons.filter(l => {
            if (!l.homework || l.homework.length === 0) return false
            if (onlyIncomplete) return l.homework.some(h => (h.completion_pct || 0) < 100)
            return true
          }).map(l => {
            const hwList = onlyIncomplete ? l.homework.filter(h => (h.completion_pct || 0) < 100) : l.homework
            return (
            <div key={l.id} className="mb-5">
              <div className="text-xs text-tt mb-2.5">
                {l.date} · <span className="font-semibold text-tp">{l.topic || l.subject}</span>
              </div>
              {hwList.map(h => {
                const pc = h.completion_pct >= 100 ? '#16A34A' : h.completion_pct > 30 ? '#F59E0B' : h.completion_pct > 0 ? '#EA580C' : '#DC2626'
                const pcBg = h.completion_pct >= 100 ? '#F0FDF4' : h.completion_pct > 30 ? '#FFFBEB' : h.completion_pct > 0 ? '#FFF7ED' : '#FEF2F2'
                return (
                  <div key={h.id} className="bg-sf border border-bd rounded-[10px] p-3.5 mb-2">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-tp">{h.title}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md" style={{ background: pcBg, color: pc }}>{h.completion_pct}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={h.completion_pct}
                      onChange={e => updateHw(h.id, 'completion_pct', +e.target.value)}
                      className="w-full mb-2 cursor-pointer"
                      style={{ accentColor: pc }}
                    />
                    <input
                      value={h.note || ''}
                      onChange={e => updateHw(h.id, 'note', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-bd text-xs outline-none"
                      placeholder="메모..."
                    />
                  </div>
                )
              })}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}