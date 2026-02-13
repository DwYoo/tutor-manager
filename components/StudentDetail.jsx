'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TimelineTab from './student/TimelineTab'
import CalendarTab from './student/CalendarTab'
import HomeworkTab from './student/HomeworkTab'
import WrongAnswerTab from './student/WrongAnswerTab'
import ScoresTab from './student/ScoresTab'
import PlanTab from './student/PlanTab'
import ReportTab from './student/ReportTab'
import FilesTab from './student/FilesTab'
import LessonDetailModal from './student/LessonDetailModal'

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

const MAIN_TABS = [
  { id: 'class', l: '수업', subs: [{ id: 'timeline', l: '타임라인' }, { id: 'calendar', l: '일정' }] },
  { id: 'study', l: '학습관리', subs: [{ id: 'homework', l: '숙제' }, { id: 'wrong', l: '오답노트' }] },
  { id: 'analysis', l: '분석', subs: [{ id: 'scores', l: '성적' }, { id: 'plan', l: '계획' }, { id: 'report', l: '리포트' }] },
  { id: 'archive', l: '자료실', subs: [{ id: 'files', l: '자료' }] },
]

export default function StudentDetail({ student, onBack, menuBtn }) {
  const s = student
  if (!s) return null
  const col = SC[s.color_index % 8]

  const [mainTab, setMainTab] = useState('class')
  const [subTab, setSubTab] = useState('timeline')
  const [isParent, setIsParent] = useState(false)

  // Data states
  const [lessons, setLessons] = useState([])
  const [homework, setHomework] = useState([])
  const [scores, setScores] = useState([])
  const [wrongs, setWrongs] = useState([])
  const [reports, setReports] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  // Lesson detail modal
  const [selectedLesson, setSelectedLesson] = useState(null)

  useEffect(() => {
    fetchAll()
  }, [s.id])

  const fetchAll = async () => {
    setLoading(true)
    const [lesRes, wrongRes, scoreRes, reportRes] = await Promise.all([
      supabase.from('lessons').select('*, homework(*), files(*)').eq('student_id', s.id).order('date', { ascending: false }),
      supabase.from('wrong_answers').select('*').eq('student_id', s.id).order('created_at', { ascending: false }),
      supabase.from('scores').select('*').eq('student_id', s.id).order('created_at', { ascending: true }),
      supabase.from('reports').select('*').eq('student_id', s.id).order('date', { ascending: false }),
    ])
    setLessons(lesRes.data || [])
    setWrongs(wrongRes.data || [])
    setScores(scoreRes.data || [])
    setReports(reportRes.data || [])

    // Flatten homework and files from lessons
    const allLessons = lesRes.data || []
    setHomework(allLessons.flatMap(l => (l.homework || []).map(h => ({ ...h, lesson_date: l.date, lesson_topic: l.topic }))))
    setFiles(allLessons.flatMap(l => (l.files || []).map(f => ({ ...f, lesson_date: l.date, lesson_topic: l.topic }))))
    setLoading(false)
  }

  const curMain = MAIN_TABS.find(m => m.id === mainTab)
  const switchMain = (id) => {
    setMainTab(id)
    const m = MAIN_TABS.find(x => x.id === id)
    if (m) setSubTab(m.subs[0].id)
  }

  const avgHw = homework.length
    ? Math.round(homework.reduce((a, h) => a + (h.completion_pct || 0), 0) / homework.length)
    : 0

  const latestScore = scores.length ? scores[scores.length - 1].score : '-'

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-tt text-sm">불러오는 중...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <div className="bg-sf border-b border-bd px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {menuBtn}
          <button onClick={onBack} className="text-ts bg-transparent border-none cursor-pointer flex items-center p-2 rounded-lg hover:bg-sfh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="text-[15px] font-semibold text-tp">학생 상세</span>
          {isParent && <span className="bg-al text-ac px-2.5 py-0.5 rounded-md text-[11px] font-semibold">학부모</span>}
        </div>
        <div className="flex bg-sfh rounded-lg p-0.5">
          {['선생님', '학부모'].map((v, i) => (
            <button
              key={v}
              onClick={() => setIsParent(!!i)}
              className={`px-3 py-1 rounded-md text-xs cursor-pointer border-none transition-all
                ${isParent === !!i ? 'bg-sf text-tp font-semibold shadow-sm' : 'bg-transparent text-tt font-normal'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Profile banner */}
      <div className="bg-sf border-b border-bd px-4 md:px-7 py-4 md:py-5">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5">
          <div
            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-lg md:text-[22px] font-bold shrink-0"
            style={{ background: col.bg, color: col.t }}
          >
            {s.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-tp">{s.name}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md" style={{ background: col.bg, color: col.t }}>{s.subject}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-sfh text-ts">{s.grade}</span>
            </div>
            {!isParent && (
              <div className="text-xs text-ts flex flex-wrap gap-x-4 gap-y-1">
                <span>{s.school}</span>
                <span>{s.phone}</span>
                <span className="hidden md:inline">{s.parent_phone}</span>
                <span>₩{(s.fee || 0).toLocaleString()}/월</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap w-full md:w-auto">
            {[
              { l: '최근점수', v: latestScore + (latestScore !== '-' ? '점' : '') },
              { l: '숙제평균', v: avgHw + '%' },
              { l: '다음수업', v: s.next_class || '-' },
              { l: '총수업', v: lessons.length + '회' },
            ].map((x, i) => (
              <div key={i} className="flex-1 md:flex-none bg-sfh rounded-lg px-3 py-2 text-center min-w-[70px]">
                <div className="text-[10px] text-tt">{x.l}</div>
                <div className="text-sm font-bold text-tp">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="bg-sf border-b border-bd px-4 md:px-7 flex gap-0 overflow-x-auto scrollbar-hide">
        {MAIN_TABS.map(m => (
          <button
            key={m.id}
            onClick={() => switchMain(m.id)}
            className={`px-4 md:px-5 py-3 text-[13px] cursor-pointer border-none bg-transparent whitespace-nowrap transition-colors
              ${mainTab === m.id ? 'text-ac font-bold border-b-2 border-ac' : 'text-tt font-normal border-b-2 border-transparent'}`}
            style={{ borderBottom: mainTab === m.id ? '2px solid #2563EB' : '2px solid transparent' }}
          >
            {m.l}
          </button>
        ))}
      </div>

      {/* Sub tabs */}
      {curMain && curMain.subs.length > 1 && (
        <div className="bg-sf border-b border-bl px-4 md:px-7 flex gap-0 overflow-x-auto scrollbar-hide">
          {curMain.subs.map(st => (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`px-3 md:px-4 py-2 text-xs cursor-pointer border-none bg-transparent whitespace-nowrap
                ${subTab === st.id ? 'text-ac font-semibold' : 'text-tt font-normal'}`}
              style={{ borderBottom: subTab === st.id ? '1.5px solid #2563EB' : '1.5px solid transparent' }}
            >
              {st.l}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4 md:p-6 max-w-[900px] mx-auto animate-fadeIn">
        {subTab === 'timeline' && (
          <TimelineTab
            lessons={lessons}
            isParent={isParent}
            onLessonClick={setSelectedLesson}
            studentId={s.id}
            onRefresh={fetchAll}
          />
        )}
        {subTab === 'calendar' && <CalendarTab lessons={lessons} student={s} col={col} />}
        {subTab === 'homework' && <HomeworkTab homework={homework} lessons={lessons} onRefresh={fetchAll} />}
        {subTab === 'wrong' && <WrongAnswerTab wrongs={wrongs} studentId={s.id} onRefresh={fetchAll} />}
        {subTab === 'scores' && <ScoresTab scores={scores} studentId={s.id} onRefresh={fetchAll} />}
        {subTab === 'plan' && <PlanTab />}
        {subTab === 'report' && <ReportTab reports={reports} studentId={s.id} isParent={isParent} onRefresh={fetchAll} />}
        {subTab === 'files' && <FilesTab files={files} />}
      </div>

      {/* Lesson detail modal */}
      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          student={s}
          isParent={isParent}
          onClose={() => setSelectedLesson(null)}
          onRefresh={fetchAll}
        />
      )}
    </div>
  )
}