'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabase'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-sf border border-bd rounded-[10px] px-3.5 py-2.5 shadow-md">
      <div className="text-xs text-tt mb-1">{d.label || d.date}</div>
      {d.score != null && <div className="text-base font-bold text-ac">{d.score}점</div>}
      {d.grade != null && <div className={`font-bold ${d.score != null ? 'text-[13px]' : 'text-base'}`} style={{ color: '#8B5CF6' }}>{d.grade}등급</div>}
    </div>
  )
}

export default function ScoresTab({ scores, studentId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ date: '', score: '', label: '', grade: '' })
  const [editScore, setEditScore] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', score: '', label: '', grade: '' })
  const [chartMode, setChartMode] = useState('score')

  useEffect(() => {
    if (!editScore) return
    const h = e => { if (e.key === 'Escape') setEditScore(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [editScore])

  const addScore = async () => {
    if (!form.score && !form.grade) return
    const ins = { student_id: studentId, date: form.date, label: form.label }
    if (form.score) ins.score = parseInt(form.score)
    if (form.grade) ins.grade = parseInt(form.grade)
    await supabase.from('scores').insert(ins)
    setForm({ date: '', score: '', label: '', grade: '' })
    setShowAdd(false)
    onRefresh()
  }

  const openEdit = (sc) => {
    setEditScore(sc)
    setEditForm({ date: sc.date || '', score: sc.score != null ? String(sc.score) : '', label: sc.label || '', grade: sc.grade != null ? String(sc.grade) : '' })
  }
  const saveEdit = async () => {
    if (!editScore || (!editForm.score && !editForm.grade)) return
    const upd = { date: editForm.date, label: editForm.label, score: editForm.score ? parseInt(editForm.score) : null, grade: editForm.grade ? parseInt(editForm.grade) : null }
    await supabase.from('scores').update(upd).eq('id', editScore.id)
    setEditScore(null)
    onRefresh()
  }

  const isGradeMode = chartMode === 'grade'
  // Score stats
  const scoreEntries = scores.filter(x => x.score != null)
  const latest = scoreEntries.length ? scoreEntries[scoreEntries.length - 1].score : 0
  const best = scoreEntries.length ? Math.max(...scoreEntries.map(x => x.score)) : 0
  const avg = scoreEntries.length ? Math.round(scoreEntries.reduce((a, x) => a + x.score, 0) / scoreEntries.length) : 0
  const change = scoreEntries.length >= 2 ? scoreEntries[scoreEntries.length - 1].score - scoreEntries[0].score : 0
  // Grade stats
  const gradeEntries = scores.filter(x => x.grade != null)
  const latestGrade = gradeEntries.length ? gradeEntries[gradeEntries.length - 1].grade : null
  const bestGrade = gradeEntries.length ? Math.min(...gradeEntries.map(x => x.grade)) : null
  const avgGrade = gradeEntries.length ? (gradeEntries.reduce((a, x) => a + x.grade, 0) / gradeEntries.length).toFixed(1) : null
  const gradeChange = gradeEntries.length >= 2 ? gradeEntries[gradeEntries.length - 1].grade - gradeEntries[0].grade : 0
  const gradeColor = g => g <= 2 ? '#16A34A' : g <= 4 ? '#2563EB' : g <= 6 ? '#F59E0B' : '#DC2626'

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-bold text-tp">성적 추이</h3>
        <div className="flex items-center gap-2">
          {!isGradeMode && change !== 0 && (
            <span className={`text-sm font-bold ${change > 0 ? 'text-su' : 'text-dn'}`}>
              {change > 0 ? '+' : ''}{change}점
            </span>
          )}
          {isGradeMode && gradeChange !== 0 && (
            <span className={`text-sm font-bold ${gradeChange < 0 ? 'text-su' : 'text-dn'}`}>
              {gradeChange > 0 ? '+' : ''}{gradeChange}등급
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
          <div className="grid grid-cols-4 gap-3 mb-3">
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
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="92" min="0" max="100" />
            </div>
            <div>
              <label className="block text-xs text-tt mb-1">등급</label>
              <input type="number" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="1~9" min="1" max="9" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="bg-sfh text-ts border border-bd rounded-lg px-4 py-2 text-xs cursor-pointer">취소</button>
            <button onClick={addScore} className="bg-pr text-white border-none rounded-lg px-5 py-2 text-xs font-semibold cursor-pointer">추가</button>
          </div>
        </div>
      )}

      {/* Chart mode tabs */}
      {scores.length > 0 && (
        <div className="flex gap-1 mb-3">
          <button onClick={() => setChartMode('score')}
            className="px-3.5 py-1.5 rounded-lg text-[11px] cursor-pointer"
            style={{ border: `1px solid ${!isGradeMode ? '#2563EB' : '#E7E5E4'}`, background: !isGradeMode ? '#EFF6FF' : 'transparent', fontWeight: !isGradeMode ? 600 : 400, color: !isGradeMode ? '#2563EB' : '#78716C', fontFamily: 'inherit' }}>
            점수
          </button>
          <button onClick={() => setChartMode('grade')}
            className="px-3.5 py-1.5 rounded-lg text-[11px] cursor-pointer"
            style={{ border: `1px solid ${isGradeMode ? '#8B5CF6' : '#E7E5E4'}`, background: isGradeMode ? '#EDE9FE' : 'transparent', fontWeight: isGradeMode ? 600 : 400, color: isGradeMode ? '#8B5CF6' : '#78716C', fontFamily: 'inherit' }}>
            등급
          </button>
        </div>
      )}

      {/* Chart */}
      {scores.length > 0 && (
        <div className="bg-sf border border-bd rounded-[14px] p-4 mb-5">
          {!isGradeMode ? (
            scoreEntries.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={scoreEntries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            ) : <div className="text-center py-8 text-tt text-[13px]">점수 데이터가 없습니다</div>
          ) : (
            gradeEntries.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={gradeEntries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EFED" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 9]} reversed tick={{ fontSize: 12, fill: '#A8A29E' }} axisLine={false} tickLine={false} tickFormatter={v => v + '등급'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="grade" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#gg)"
                    dot={{ r: 5, fill: '#FFFFFF', stroke: '#8B5CF6', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#8B5CF6' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="text-center py-8 text-tt text-[13px]">등급 데이터가 없습니다</div>
          )}
        </div>
      )}

      {/* Stat cards */}
      {!isGradeMode ? (
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
      ) : (
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { l: '최근 등급', v: latestGrade != null ? latestGrade + '등급' : '-', c: '#8B5CF6', bg: '#EDE9FE' },
            { l: '최고 등급', v: bestGrade != null ? bestGrade + '등급' : '-', c: '#16A34A', bg: '#F0FDF4' },
            { l: '평균 등급', v: avgGrade != null ? avgGrade + '등급' : '-', c: '#78716C', bg: '#F5F5F4' },
          ].map((x, i) => (
            <div key={i} className="rounded-xl p-4 text-center" style={{ background: x.bg }}>
              <div className="text-[11px] text-tt mb-1">{x.l}</div>
              <div className="text-lg md:text-[22px] font-bold" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Score list */}
      {scores.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-tp mb-2.5">시험 기록</div>
          {[...scores].reverse().map((x, i) => {
            const scoreBarColor = x.score != null ? (x.score >= 85 ? '#16A34A' : x.score >= 70 ? '#F59E0B' : '#DC2626') : '#A8A29E'
            const grBarColor = x.grade != null ? gradeColor(x.grade) : '#A8A29E'
            return (
              <div key={i} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg mb-1 hover:bg-sfh transition-colors cursor-pointer" onClick={() => openEdit(x)}>
                <div className="flex items-center gap-2.5">
                  {i === 0 && <span className="text-[9px] font-semibold text-ac">최근</span>}
                  <span className="text-[13px] font-semibold text-tp">{x.label || '-'}</span>
                  <span className="text-xs text-tt">{x.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  {x.score != null && <>
                    <div className="w-20 h-1 bg-bl rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: x.score + '%', background: scoreBarColor }} />
                    </div>
                    <span className="text-[15px] font-bold min-w-[36px] text-right" style={{ color: scoreBarColor }}>{x.score}</span>
                  </>}
                  {x.grade != null && <span className="text-[13px] font-bold min-w-[40px] text-right" style={{ color: grBarColor, marginLeft: x.score != null ? 4 : 0 }}>{x.grade}등급</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Score Modal */}
      {editScore && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,.35)' }} onClick={() => setEditScore(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-sf rounded-2xl w-full max-w-[380px] p-7 shadow-xl">
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-bold text-tp">성적 수정</h2>
              <button onClick={() => setEditScore(null)} className="bg-transparent border-none cursor-pointer text-tt text-lg">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-tt mb-1">날짜</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-tt mb-1">시험명</label>
                <input value={editForm.label} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="예: 3월 모의고사" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-tt mb-1">점수</label>
                  <input type="number" value={editForm.score} onChange={e => setEditForm(p => ({ ...p, score: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="0~100" min="0" max="100" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-tt mb-1">등급</label>
                  <input type="number" value={editForm.grade} onChange={e => setEditForm(p => ({ ...p, grade: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-bd text-sm outline-none" placeholder="1~9" min="1" max="9" />
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5 justify-end">
              <button onClick={() => setEditScore(null)} className="bg-sfh text-ts border border-bd rounded-lg px-5 py-2.5 text-[13px] cursor-pointer">취소</button>
              <button onClick={saveEdit} className="bg-pr text-white border-none rounded-lg px-6 py-2.5 text-[13px] font-semibold cursor-pointer">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
