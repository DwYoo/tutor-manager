'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-sf border border-bd rounded-[10px] px-3.5 py-2.5 shadow-md">
      <div className="text-xs text-tt mb-1">{d.label || d.date}</div>
      <div className="text-base font-bold text-ac">{d.score}점</div>
    </div>
  )
}

export default function ScoresTab({ scores, studentId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ date: '', score: '', label: '' })

  const addScore = async () => {
    if (!form.score) return
    await supabase.from('scores').insert({ student_id: studentId, ...form, score: parseInt(form.score) })
    setForm({ date: '', score: '', label: '' })
    setShowAdd(false)
    onRefresh()
  }

  const latest = scores.length ? scores[scores.length - 1].score : 0
  const best = scores.length ? Math.max(...scores.map(x => x.score)) : 0
  const avg = scores.length ? Math.round(scores.reduce((a, x) => a + x.score, 0) / scores.length) : 0
  const change = scores.length >= 2 ? scores[scores.length - 1].score - scores[0].score : 0

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-bold text-tp">성적 추이</h3>
        <div className="flex items-center gap-2">
          {change !== 0 && (
            <span className={`text-sm font-bold ${change > 0 ? 'text-su' : 'text-dn'}`}>
              {change > 0 ? '+' : ''}{change}점
            </span>
          )}
          <button onClick={() => setShowAdd(!showAdd)}
            className="bg-pr text-white border-none rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer">
            + 성적 추가
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-sf border-2 border-ac rounded-[14px] p-4 mb-5">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-tt mb-1">시험명</label>
              <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="예: 중간고사" />
            </div>
            <div>
              <label className="block text-xs text-tt mb-1">날짜</label>
              <input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="예: 3월" />
            </div>
            <div>
              <label className="block text-xs text-tt mb-1">점수</label>
              <input type="number" value={form.score} onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="92" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="bg-sfh text-ts border border-bd rounded-lg px-4 py-2 text-xs cursor-pointer">취소</button>
            <button onClick={addScore} className="bg-pr text-white border-none rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer">추가</button>
          </div>
        </div>
      )}

      {/* Chart */}
      {scores.length > 0 && (
        <div className="bg-sf border border-bd rounded-[14px] p-4 mb-5">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EFED" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2.5} fill="url(#cg)"
                dot={{ r: 5, fill: '#FFFFFF', stroke: '#2563EB', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#2563EB' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {[
          { l: '최근 점수', v: latest + '점', c: '#2563EB', bg: '#EFF6FF' },
          { l: '최고 점수', v: best + '점', c: '#16A34A', bg: '#F0FDF4' },
          { l: '평균 점수', v: avg + '점', c: '#78716C', bg: '#F5F5F4' },
        ].map((x, i) => (
          <div key={i} className="rounded-xl p-4 text-center" style={{ background: x.bg }}>
            <div className="text-[11px] text-tt mb-1">{x.l}</div>
            <div className="text-lg md:text-[22px] font-bold" style={{ color: x.c }}>{x.v}</div>
          </div>
        ))}
      </div>

      {/* Score list */}
      {scores.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-tp mb-2.5">시험 기록</div>
          {[...scores].reverse().map((x, i) => (
            <div key={i} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg mb-1 hover:bg-sfh transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-semibold text-tp">{x.label || '-'}</span>
                <span className="text-xs text-tt">{x.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1 bg-bl rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm" style={{ width: x.score + '%', background: x.score >= 85 ? '#16A34A' : x.score >= 70 ? '#F59E0B' : '#DC2626' }} />
                </div>
                <span className={`text-[15px] font-bold min-w-[36px] text-right ${x.score >= 85 ? 'text-su' : x.score >= 70 ? 'text-wn' : 'text-dn'}`}>{x.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}