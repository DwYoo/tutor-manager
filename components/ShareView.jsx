'use client';
import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { C, SC } from '@/components/Colors';
import { p2, m2s } from '@/lib/utils';
const REASON_COLORS=["#2563EB","#DC2626","#F59E0B","#16A34A","#8B5CF6","#EC4899","#06B6D4","#F97316"];
const ScoreTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>{d.label||d.date}</div><div style={{fontSize:16,fontWeight:700,color:C.ac}}>{d.score}점</div></div>);};

export default function ShareView({ token }) {
  const [s, setS] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [scores, setScores] = useState([]);
  const [wrongs, setWrongs] = useState([]);
  const [reports, setReports] = useState([]);
  const [planComments, setPlanComments] = useState([]);
  const [studyPlans, setStudyPlans] = useState([]);
  const [standaloneFiles, setStandaloneFiles] = useState([]);
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("lessons");
  const [subTab, setSubTab] = useState("history");
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [showHwDetail, setShowHwDetail] = useState(false);
  const [hwFilters, setHwFilters] = useState(new Set());
  const [showWrongList, setShowWrongList] = useState(false);
  const [showHwList, setShowHwList] = useState(false);
  const [chartMode, setChartMode] = useState("grade");
  const [wExpanded, setWExpanded] = useState({});
  const [calMonth, setCalMonth] = useState(new Date());

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: stu, error: e } = await supabase.from('students').select('*').eq('share_token', token).maybeSingle();
      if (e) {
        // RLS 정책으로 인한 접근 차단 또는 기타 오류
        console.error('Share link query error:', e.message, e.code);
        setError('not_found');
        setLoading(false);
        return;
      }
      if (!stu) { setError('not_found'); setLoading(false); return; }
      setS(stu);
      let a, b, c, d, f, g, tb;
      try {
        [a, b, c, d, f, g, tb] = await Promise.all([
          supabase.from('lessons').select('*, homework(*)').eq('student_id', stu.id).order('date', { ascending: false }),
          supabase.from('scores').select('*').eq('student_id', stu.id).order('created_at'),
          supabase.from('wrong_answers').select('*').eq('student_id', stu.id).order('created_at', { ascending: false }),
          supabase.from('reports').select('*').eq('student_id', stu.id).order('date', { ascending: false }),
          supabase.from('files').select('*').eq('student_id', stu.id).is('lesson_id', null).order('created_at', { ascending: false }),
          supabase.from('study_plans').select('*').eq('student_id', stu.id).order('date', { ascending: false }),
          supabase.from('textbooks').select('*').eq('student_id', stu.id).order('created_at', { ascending: false }).then(r => r, () => ({ data: [], error: null })),
        ]);
      } catch { setError('fetch_error'); setLoading(false); return; }
      if (a.error || b.error || c.error || d.error || f.error || g.error) { setError('fetch_error'); setLoading(false); return; }
      setLessons(a.data || []);
      setScores(b.data || []);
      setWrongs(c.data || []);
      const allReps = d.data || [];
      setReports(allReps.filter(r => r.type !== 'plan'));
      setPlanComments(allReps.filter(r => r.type === 'plan'));
      setStudyPlans(g.data || []);
      setStandaloneFiles(f.data || []);
      setTextbooks(tb.data || []);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.tt, fontSize: 14 }}>불러오는 중...</div>
    </div>
  );

  if (error === 'not_found') return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 48 }}>🔗</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.tp }}>유효하지 않은 링크입니다</div>
      <div style={{ fontSize: 14, color: C.ts }}>공유 링크가 만료되었거나 존재하지 않습니다</div>
    </div>
  );

  if (error === 'fetch_error') return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 14, color: "#DC2626" }}>데이터를 불러오지 못했습니다</div>
      <button onClick={() => { setError(null); setLoading(true); }} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #E7E5E4", background: "#FFFFFF", color: "#1A1A1A", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>다시 시도</button>
    </div>
  );

  if (!s) return null;
  const col = SC[(typeof s.color_index === 'number' ? s.color_index : (s.name ? s.name.charCodeAt(0) : 0)) % 8] || SC[0];

  // Filter lessons to only show past lessons (not future ones)
  const today = new Date().toISOString().split('T')[0];
  const pastLessons = lessons.filter(l => l.date <= today);
  const upcomingLessons = lessons.filter(l => l.date > today).sort((a, b) => a.date.localeCompare(b.date));

  // Homework aggregation (only from past lessons)
  const allHw = pastLessons.flatMap(l => (l.homework || []).map(h => ({ ...h, lesDate: l.date, lesSub: l.subject })));
  const hwDone = allHw.filter(h => (h.completion_pct || 0) >= 100).length;
  const hwInProg = allHw.filter(h => (h.completion_pct || 0) > 0 && (h.completion_pct || 0) < 100).length;
  const hwNotStarted = allHw.filter(h => (h.completion_pct || 0) === 0).length;
  const hwAvg = allHw.length ? Math.round(allHw.reduce((s, h) => s + (h.completion_pct || 0), 0) / allHw.length) : 0;

  // Score stats (sort by date first)
  const sortedScores = [...scores].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const scoreData = sortedScores.map(sc => ({ date: sc.date, score: sc.score, grade: sc.grade, label: sc.label }));
  const latestScore = sortedScores.length ? sortedScores[sortedScores.length - 1].score : null;
  const bestScore = sortedScores.length ? Math.max(...sortedScores.map(x => x.score)) : null;
  const avgScore = sortedScores.length ? Math.round(sortedScores.reduce((a, x) => a + x.score, 0) / sortedScores.length) : null;

  // Grade stats (sort by date first)
  const gradeEntries = sortedScores.filter(x => x.grade != null);
  const latestGrade = gradeEntries.length ? gradeEntries[gradeEntries.length - 1].grade : null;
  const bestGrade = gradeEntries.length ? Math.min(...gradeEntries.map(x => x.grade)) : null;
  const avgGrade = gradeEntries.length ? Math.round(gradeEntries.reduce((a, x) => a + x.grade, 0) / gradeEntries.length) : null;

  // Wrong answer reason stats
  const reasonMap = {};
  wrongs.forEach(w => { const r = w.reason || "미분류"; reasonMap[r] = (reasonMap[r] || 0) + 1; });
  const reasonData = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count], i) => ({ name, count, fill: REASON_COLORS[i % REASON_COLORS.length] }));

  // Group wrongs by book and chapter
  const wBooks = [...new Set(wrongs.map(w => w.book).filter(Boolean))];
  const reasonColorMap = {};
  Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).forEach(([r], i) => { reasonColorMap[r] = REASON_COLORS[i % REASON_COLORS.length]; });

  // All files (only from past lessons)
  const lessonFiles = pastLessons.flatMap(l => (l.files || []).map(f => ({ ...f, lesDate: l.date, lesTopic: l.topic || l.subject })));

  const tabs = [
    { id: "lessons", l: "수업", count: 0, subs: [{ id: "history", l: "수업 이력" }, { id: "schedule", l: "수업 일정" }] },
    { id: "study", l: "학습 관리", count: 0 },
    { id: "analysis", l: "학습 분석", count: 0 },
    { id: "files", l: "자료실", count: lessonFiles.length + standaloneFiles.length },
  ];

  return (
    <div className="share-container" style={{ minHeight: "100vh", background: C.bg }}>
      <style>{`@media(max-width:768px){.share-container{padding:0!important;} .share-container .sv-content{padding:16px 16px 60px!important;}} @media(max-width:640px){.sv-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;} .sv-tabs button{white-space:nowrap;flex-shrink:0;} .sv-wrong-table{overflow-x:auto;-webkit-overflow-scrolling:touch;} .sv-wrong-table table{min-width:400px;}}`}</style>
      {/* Header */}
      <div style={{ background: C.sf, borderBottom: "1px solid " + C.bd, padding: "24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: col.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: col.t, flexShrink: 0 }}>{(s.name || "?")[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.tp }}>{s.name}</div>
              <div style={{ fontSize: 13, color: C.ts }}>{s.subject} · {s.grade}{s.school ? " · " + s.school : ""}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Report and Study Plan (above tabs) */}
      {(() => {
        const allReports = [...planComments, ...reports].filter(r => r.is_shared !== false).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const recentReport = allReports[0];
        const sharedPlans = studyPlans.filter(sp => sp.is_shared !== false).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const recentPlan = sharedPlans[0];

        if (!recentReport && !recentPlan) return null;

        return (
          <div style={{ background: C.sf, borderBottom: "1px solid " + C.bd, padding: "20px 0" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", gap: 12, flexWrap: "wrap" }}>
              {recentReport && (
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.tp, marginBottom: 10 }}>학습 리포트</h3>
                  <div style={{ background: "linear-gradient(135deg, " + C.as + " 0%, " + C.sf + " 100%)", border: "2px solid " + C.ac, borderRadius: 14, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.tp }}>{recentReport.title || "리포트"}</span>
                      <span style={{ fontSize: 11, color: C.tt }}>{recentReport.date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.tp, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{recentReport.body}</div>
                  </div>
                </div>
              )}
              {recentPlan && (
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.tp, marginBottom: 10 }}>학습 계획</h3>
                  <div style={{ background: "linear-gradient(135deg, #D1FAE5 0%, " + C.sf + " 100%)", border: "2px solid #16A34A", borderRadius: 14, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.tp }}>{recentPlan.title || "학습 계획"}</span>
                      <span style={{ fontSize: 11, color: C.tt }}>{recentPlan.date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.tp, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{recentPlan.body}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div style={{ background: C.sf, borderBottom: "1px solid " + C.bd, position: "sticky", top: 0, zIndex: 10 }}>
        <div className="sv-tabs" style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", gap: 0, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.subs) setSubTab(t.subs[0].id); }} style={{ padding: "12px 20px", border: "none", borderBottom: tab === t.id ? "2px solid " + C.ac : "2px solid transparent", background: "none", fontSize: 14, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t.l}{t.count > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: tab === t.id ? C.ac : C.tt }}>({t.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs for lessons */}
      {tab === "lessons" && (
        <div style={{ background: C.bl, borderBottom: "1px solid " + C.bd }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", gap: 0 }}>
            {tabs.find(t => t.id === "lessons")?.subs?.map(st => (
              <button key={st.id} onClick={() => setSubTab(st.id)} style={{ padding: "10px 16px", border: "none", borderBottom: subTab === st.id ? "2px solid " + C.ac : "2px solid transparent", background: "none", fontSize: 13, fontWeight: subTab === st.id ? 600 : 400, color: subTab === st.id ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {st.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="sv-content" style={{ maxWidth: 720, margin: "0 auto", padding: "20px 20px 60px" }}>

        {/* === 수업 탭 === */}
        {tab === "lessons" && (<div>
          {/* 수업 이력 서브탭 */}
          {subTab === "history" && (<div>
            {pastLessons.length === 0 ? (
              <Empty text="수업 기록이 없습니다" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pastLessons.map(l => {
                const sh = l.start_hour, sm = l.start_min, dur = l.duration;
                const em = sh * 60 + sm + dur;
                const hw = l.homework || [];
                const open = expandedLesson === l.id;
                return (
                  <div key={l.id} style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, overflow: "hidden" }}>
                    <div onClick={() => setExpandedLesson(open ? null : l.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>{l.date}</div>
                        <div style={{ fontSize: 12, color: C.ts, marginTop: 2 }}>{m2s(sh * 60 + sm)}~{m2s(em)} · {l.subject}{l.topic ? " · " + l.topic : ""}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {hw.length > 0 && <span style={{ fontSize: 11, color: C.ac, background: C.as, padding: "2px 8px", borderRadius: 5 }}>숙제 {hw.length}</span>}
                        <span style={{ fontSize: 16, color: C.tt, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▾</span>
                      </div>
                    </div>
                    {open && (
                      <div style={{ padding: "0 16px 16px", borderTop: "1px solid " + C.bl }}>
                        {l.content && <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.tt, marginBottom: 4 }}>수업 내용</div>
                          <div style={{ fontSize: 13, color: C.tp, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{l.content}</div>
                        </div>}
                        {l.feedback && <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.tt, marginBottom: 4 }}>피드백</div>
                          <div style={{ fontSize: 13, color: C.tp, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{l.feedback}</div>
                        </div>}
                        {l.private_memo && <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.tt, marginBottom: 4 }}>메모</div>
                          <div style={{ fontSize: 13, color: C.ts, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{l.private_memo}</div>
                        </div>}
                        {l.plan_shared && <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.tt, marginBottom: 4 }}>수업 계획</div>
                          <div style={{ fontSize: 13, color: C.tp, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{l.plan_shared}</div>
                        </div>}
                        {hw.length > 0 && <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.tt, marginBottom: 6 }}>숙제</div>
                          {hw.map(h => {
                            const hpct = h.completion_pct || 0;
                            const hpc = hpct >= 100 ? C.su : hpct > 30 ? C.wn : hpct > 0 ? "#EA580C" : C.dn;
                            return (
                            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                              <div style={{ width: 60, height: 6, borderRadius: 3, background: C.bl, overflow: "hidden", flexShrink: 0 }}>
                                <div style={{ width: hpct + "%", height: "100%", borderRadius: 3, background: hpc }} />
                              </div>
                              <span style={{ fontSize: 12, color: C.tp, flex: 1 }}>{h.title}</span>
                              <span style={{ fontSize: 11, color: hpc, fontWeight: 600 }}>{hpct}%</span>
                            </div>
                            );
                          })}
                        </div>}
                        {(!l.content && !l.feedback && !l.private_memo && hw.length === 0) && (
                          <div style={{ padding: "12px 0", fontSize: 13, color: C.tt }}>상세 기록이 없습니다</div>
                        )}
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            )}
          </div>)}

          {/* 수업 일정 서브탭 */}
          {subTab === "schedule" && (<div>
            {/* Calendar View */}
            {(() => {
              const now = new Date();
              const year = calMonth.getFullYear();
              const month = calMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const startOffset = firstDay === 0 ? 6 : firstDay - 1;
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < startOffset; i++) cells.push({ d: null });
              for (let i = 1; i <= daysInMonth; i++) {
                const ds = `${year}-${p2(month + 1)}-${p2(i)}`;
                const dt = new Date(year, month, i);
                const dw = dt.getDay() === 0 ? 7 : dt.getDay();
                const dayLessons = lessons.filter(l => {
                  if (l.is_recurring && l.recurring_exceptions && l.recurring_exceptions.includes(ds)) return false;
                  if (l.date === ds) return true;
                  if (l.is_recurring && l.recurring_day === dw) {
                    if (ds < l.date) return false;
                    if (l.recurring_end_date && ds >= l.recurring_end_date) return false;
                    return true;
                  }
                  return false;
                });
                cells.push({ d: i, lessons: dayLessons, ds });
              }
              const rem = 42 - cells.length;
              for (let i = 0; i < rem; i++) cells.push({ d: null });

              // 해당 월의 모든 수업 (과거+미래)
              const monthStart = `${year}-${p2(month + 1)}-01`;
              const monthEnd = `${year}-${p2(month + 1)}-${p2(daysInMonth)}`;
              const monthLessons = lessons.filter(l => {
                if (l.date >= monthStart && l.date <= monthEnd) return true;
                if (l.is_recurring) {
                  // recurring lessons
                  if (l.recurring_end_date && l.recurring_end_date < monthStart) return false;
                  if (l.date > monthEnd) return false;
                  return true;
                }
                return false;
              }).sort((a, b) => a.date.localeCompare(b.date));

              return (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20 }}>
                    {/* Header with month navigation */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.ts, fontSize: 20, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}>‹</button>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, minWidth: 110, textAlign: "center" }}>{year}년 {month + 1}월</h3>
                        <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.ts, fontSize: 20, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}>›</button>
                      </div>
                      <button onClick={() => setCalMonth(new Date())} style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid " + C.bd, background: C.sf, fontSize: 12, cursor: "pointer", color: C.ts, fontFamily: "inherit" }}>이번 달</button>
                    </div>
                    {/* Day headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
                      {["월", "화", "수", "목", "금", "토", "일"].map(d => (
                        <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 500, color: C.tt, padding: "6px 0" }}>{d}</div>
                      ))}
                    </div>
                    {/* Calendar cells */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid " + C.bd, borderRadius: 8, overflow: "hidden" }}>
                      {cells.map((c, i) => (
                        <div
                          key={i}
                          className="cal-cell"
                          style={{
                            minHeight: 72,
                            padding: 6,
                            borderBottom: Math.floor(i / 7) < 5 ? "1px solid " + C.bl : "none",
                            borderRight: (i + 1) % 7 ? "1px solid " + C.bl : "none",
                            opacity: c.d ? 1 : 0.3,
                          }}
                        >
                          {c.d && (
                            <div>
                              <div style={{ fontSize: 13, marginBottom: 4, fontWeight: c.d === now.getDate() && year === now.getFullYear() && month === now.getMonth() ? 700 : 400, color: c.d === now.getDate() && year === now.getFullYear() && month === now.getMonth() ? C.ac : C.tp }}>{c.d}</div>
                              {c.lessons?.map(l => (
                                <div
                                  key={l.id}
                                  style={{
                                    fontSize: 9,
                                    padding: "2px 4px",
                                    borderRadius: 4,
                                    fontWeight: 500,
                                    marginBottom: 2,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    background: col.bg,
                                    color: col.t,
                                  }}
                                >
                                  {p2(l.start_hour || 0)}:{p2(l.start_min || 0)}<span className="cal-lesson-text"> {l.topic || l.subject}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 해당 월 수업 전체 리스트 */}
            {(() => {
              const year = calMonth.getFullYear();
              const month = calMonth.getMonth();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const monthStart = `${year}-${p2(month + 1)}-01`;
              const monthEnd = `${year}-${p2(month + 1)}-${p2(daysInMonth)}`;
              const monthLessons = lessons.filter(l => l.date >= monthStart && l.date <= monthEnd).sort((a, b) => a.date.localeCompare(b.date));

              return monthLessons.length > 0 ? (
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>{month + 1}월 수업</h3>
                  <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, overflow: "hidden" }}>
                    {monthLessons.map((l, idx) => {
                      const sh = l.start_hour, sm = l.start_min, dur = l.duration;
                      const em = sh * 60 + sm + dur;
                      const dateObj = new Date(l.date + "T00:00:00");
                      const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][dateObj.getDay()];
                      return (
                        <div key={l.id} style={{ padding: "14px 18px", borderBottom: idx < monthLessons.length - 1 ? "1px solid " + C.bl : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ textAlign: "center", flexShrink: 0 }}>
                              <div style={{ fontSize: 11, color: C.tt }}>{l.date.split('-')[1]}/{l.date.split('-')[2]}</div>
                              <div style={{ fontSize: 10, color: C.ts, marginTop: 2 }}>({dayOfWeek})</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.tp }}>{l.subject}{l.topic ? " · " + l.topic : ""}</div>
                              <div style={{ fontSize: 12, color: C.ts, marginTop: 2 }}>{m2s(sh * 60 + sm)}~{m2s(em)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}
          </div>)}
        </div>)}

        {/* === 학습 관리 === */}
        {tab === "study" && (<div>
          {/* Homework section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, margin: 0 }}>숙제 현황</h3>
              {allHw.length > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: hwAvg >= 100 ? C.su : hwAvg > 30 ? C.wn : hwAvg > 0 ? "#EA580C" : C.ts, background: hwAvg >= 100 ? C.sb : hwAvg > 30 ? C.wb : hwAvg > 0 ? "#FFF7ED" : C.sfh, padding: "4px 12px", borderRadius: 8 }}>완료율 {hwAvg}%</span>}
            </div>
            {allHw.length > 0 && (
              <button onClick={() => setShowHwList(!showHwList)} style={{ padding: "4px 12px", border: "1px solid " + C.bd, borderRadius: 8, background: C.sf, fontSize: 11, color: C.ts, cursor: "pointer", fontFamily: "inherit" }}>
                {showHwList ? "상세 숨김" : "상세 보기"}
              </button>
            )}
          </div>
          {allHw.length === 0 ? <Empty text="숙제 기록이 없습니다" /> : (() => {
            const toggleHwFilter = (key) => {
              setHwFilters(prev => {
                const next = new Set(prev);
                if (key === "all") {
                  // 전체 클릭 시: 이미 전체면 해제, 아니면 모든 필터 해제(=전체)
                  return new Set();
                }
                if (next.has(key)) next.delete(key); else next.add(key);
                return next;
              });
            };
            const isAllSelected = hwFilters.size === 0;
            const filteredHw = isAllSelected ? allHw : allHw.filter(h => {
              const pct = h.completion_pct || 0;
              if (hwFilters.has("done") && pct >= 100) return true;
              if (hwFilters.has("prog") && pct > 0 && pct < 100) return true;
              if (hwFilters.has("none") && pct === 0) return true;
              return false;
            });
            return (<>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginBottom: showHwList ? 16 : 28 }}>
                <FilterCard label="전체" value={allHw.length + "건"} color={C.tp} bg={C.sfh} active={isAllSelected} onClick={() => toggleHwFilter("all")} />
                <FilterCard label="완료" value={hwDone + "건"} color={C.su} bg={C.sb} active={hwFilters.has("done")} onClick={() => toggleHwFilter("done")} />
                <FilterCard label="진행중" value={hwInProg + "건"} color={C.wn} bg={C.wb} active={hwFilters.has("prog")} onClick={() => toggleHwFilter("prog")} />
                <FilterCard label="미시작" value={hwNotStarted + "건"} color={C.dn} bg={C.db} active={hwFilters.has("none")} onClick={() => toggleHwFilter("none")} />
              </div>
              {showHwList && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {filteredHw.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: C.tt, fontSize: 13 }}>해당하는 숙제가 없습니다</div>
                ) : filteredHw.map(h => {
                  const pct = h.completion_pct || 0;
                  const pc = pct >= 100 ? C.su : pct > 30 ? C.wn : pct > 0 ? "#EA580C" : C.dn;
                  const pb = pct >= 100 ? C.sb : pct > 30 ? C.wb : pct > 0 ? "#FFF7ED" : C.db;
                  const sl = pct >= 100 ? "완료" : pct > 0 ? "진행중" : "미시작";
                  return (
                  <div key={h.id} style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>{h.title}</div>
                        <div style={{ fontSize: 11, color: C.tt, marginTop: 2 }}>{h.lesDate} · {h.lesSub}</div>
                      </div>
                      <span style={{ fontSize: 10, background: pb, color: pc, padding: "2px 8px", borderRadius: 5, fontWeight: 600, flexShrink: 0 }}>{sl}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: C.bl, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: pct + "%", minWidth: pct > 0 ? 8 : 0, height: "100%", borderRadius: 4, background: pc, transition: "width .15s" }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: pc, minWidth: 36, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </div>
                  );
                })}
              </div>}
            </>);
          })()}

          {/* Wrong answers section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, margin: 0 }}>오답노트</h3>
            {wrongs.length > 0 && (
              <button onClick={() => setShowWrongList(!showWrongList)} style={{ padding: "4px 12px", border: "1px solid " + C.bd, borderRadius: 8, background: C.sf, fontSize: 11, color: C.ts, cursor: "pointer", fontFamily: "inherit" }}>
                {showWrongList ? "리스트 숨김" : "리스트 보기"}
              </button>
            )}
          </div>
          {wrongs.length === 0 ? <Empty text="오답 기록이 없습니다" /> : (<>
            {reasonData.length > 0 && (
              <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, marginBottom: showWrongList ? 16 : 28, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 12 }}>오답 유형 분포</div>
                <div style={{ height: 180, overflow: "hidden" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reasonData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: C.ts }} axisLine={false} tickLine={false} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (<div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 8, padding: "6px 10px", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}><span style={{ fontSize: 12, fontWeight: 600, color: d.fill }}>{d.count}문항</span></div>);
                      }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                        {reasonData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {showWrongList && (
              <div style={{ marginBottom: 28 }}>
                {[...wBooks, ...(wrongs.some(w => !w.book) ? [""] : [])].map(book => {
                  const bk = book || "__no_book__";
                  const items = [...wrongs.filter(w => book ? w.book === book : !w.book)].sort((a, b) => {
                    const ac = a.chapter || "", bc = b.chapter || "";
                    if (ac !== bc) return ac.localeCompare(bc, undefined, { numeric: true });
                    const an = parseInt(a.problem_num) || 0, bn = parseInt(b.problem_num) || 0;
                    return an - bn;
                  });
                  const exp = wExpanded[bk] !== false;
                  return (
                    <div key={bk} style={{ marginBottom: 12 }}>
                      <div onClick={() => setWExpanded(p => ({ ...p, [bk]: !exp }))} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.sfh, borderRadius: 10, cursor: "pointer", marginBottom: exp ? 8 : 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: book ? C.tp : C.tt }}>{book || "교재명 미지정"} <span style={{ fontWeight: 400, color: C.tt }}>({items.length})</span></span>
                        <span style={{ fontSize: 12, color: C.tt }}>{exp ? "▲" : "▼"}</span>
                      </div>
                      {exp && (() => {
                        const uCh = [];
                        const seen = new Set();
                        items.forEach(w => { const ch = w.chapter || ""; if (!seen.has(ch)) { seen.add(ch); uCh.push(ch); } });
                        return (
                          <div className="sv-wrong-table" style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 10, overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead><tr>{["번호", "사유", "메모"].map((h) => (<th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.tt, fontWeight: 500, borderBottom: "1px solid " + C.bd }}>{h}</th>))}</tr></thead>
                              <tbody>{uCh.map(ch => {
                                const ck = bk + "::" + (ch || "__no_ch__");
                                const chExp = wExpanded[ck] !== false;
                                const chItems = items.filter(w => (w.chapter || "") === ch);
                                return (
                                  <Fragment key={ck}>
                                    <tr onClick={() => setWExpanded(p => ({ ...p, [ck]: !chExp }))} style={{ cursor: "pointer" }}>
                                      <td colSpan={3} style={{ padding: "7px 8px", background: C.bl, borderBottom: "1px solid " + C.bd }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ fontSize: 12, fontWeight: 500, color: ch ? C.ts : C.tt }}>{ch || "단원 미지정"}</span>
                                          <span style={{ fontSize: 10, color: C.tt }}>({chItems.length})</span>
                                          <span style={{ fontSize: 10, color: C.tt, marginLeft: "auto" }}>{chExp ? "▲" : "▼"}</span>
                                        </div>
                                      </td>
                                    </tr>
                                    {chExp && chItems.map(w => {
                                      const rc = reasonColorMap[w.reason || "미분류"] || "#888";
                                      return (
                                        <tr key={w.id} style={{ borderBottom: "1px solid " + C.bl }}>
                                          <td style={{ padding: "6px 10px", fontWeight: 600, color: C.tp, fontSize: 12 }}>{w.problem_num}</td>
                                          <td style={{ padding: "6px 10px" }}>{w.reason && <span style={{ background: rc + "20", color: rc, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600 }}>{w.reason}</span>}</td>
                                          <td style={{ padding: "6px 10px", color: C.ts, fontSize: 12 }}>{w.note || "-"}</td>
                                        </tr>
                                      );
                                    })}
                                  </Fragment>
                                );
                              })}</tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </>)}

          {/* Textbooks section */}
          {textbooks.length > 0 && (<>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, margin: 0, marginBottom: 12 }}>사용 교재</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {textbooks.map(tb => {
                const wCnt = wrongs.filter(w => w.book === tb.title).length;
                return (
                  <div key={tb.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.sf, border: "1px solid " + C.bd, borderRadius: 10 }}>
                    <span style={{ fontSize: 18 }}>📚</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>{tb.title}</span>
                        {tb.subject && <span style={{ fontSize: 10, background: "#EFF6FF", color: C.ac, padding: "2px 8px", borderRadius: 5, fontWeight: 600 }}>{tb.subject}</span>}
                      </div>
                      {tb.publisher && <div style={{ fontSize: 12, color: C.ts }}>{tb.publisher}</div>}
                    </div>
                    {wCnt > 0 && <span style={{ fontSize: 10, background: C.db, color: C.dn, padding: "2px 8px", borderRadius: 5, fontWeight: 600 }}>오답 {wCnt}</span>}
                  </div>
                );
              })}
            </div>
          </>)}
        </div>)}

        {/* === 분석 === */}
        {tab === "analysis" && (<div>
          {/* SWOT */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>학습 오버뷰</h3>
          <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ac, marginBottom: 10 }}>🧭 학습 전략</div>
            <div style={{ fontSize: 13, color: s.plan_strategy ? C.tp : C.tt, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{s.plan_strategy || "아직 작성된 전략이 없습니다"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginBottom: 24 }}>
            <SwotCard label="💪 강점 (S)" bg={C.sb} border="#BBF7D0" color={C.su} text={s.plan_strength} />
            <SwotCard label="🔧 약점 (W)" bg={C.db} border="#FECACA" color={C.dn} text={s.plan_weakness} />
            <SwotCard label="🚀 기회 (O)" bg="#EFF6FF" border="#BFDBFE" color={C.ac} text={s.plan_opportunity} />
            <SwotCard label="⚠️ 위협 (T)" bg={C.wb} border="#FDE68A" color="#B45309" text={s.plan_threat} />
          </div>

          {/* Scores */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, margin: 0 }}>성적 추이</h3>
            {scores.length > 0 && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setChartMode("grade")} style={{ padding: "4px 12px", border: "1px solid " + (chartMode === "grade" ? "#8B5CF6" : C.bd), borderRadius: 8, background: chartMode === "grade" ? "#EDE9FE" : C.sf, fontSize: 11, fontWeight: chartMode === "grade" ? 600 : 400, color: chartMode === "grade" ? "#8B5CF6" : C.ts, cursor: "pointer", fontFamily: "inherit" }}>등급</button>
                <button onClick={() => setChartMode("score")} style={{ padding: "4px 12px", border: "1px solid " + (chartMode === "score" ? C.ac : C.bd), borderRadius: 8, background: chartMode === "score" ? C.as : C.sf, fontSize: 11, fontWeight: chartMode === "score" ? 600 : 400, color: chartMode === "score" ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit" }}>점수</button>
              </div>
            )}
          </div>
          {scores.length === 0 ? <Empty text="성적 기록이 없습니다" /> : (<>
            {chartMode === "grade" ? (
              gradeEntries.length === 0 ? <Empty text="등급 데이터가 없습니다" /> : (<>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginBottom: 16 }}>
                  <StatCard label="최근 등급" value={latestGrade != null ? latestGrade + "등급" : "-"} color="#8B5CF6" />
                  <StatCard label="최고 등급" value={bestGrade != null ? bestGrade + "등급" : "-"} color={C.su} />
                  <StatCard label="평균 등급" value={avgGrade != null ? avgGrade + "등급" : "-"} color={C.ts} />
                </div>
                <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, overflow: "hidden" }}>
                  <div style={{ height: 200, overflow: "hidden" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={gradeEntries.map(x => ({ date: x.date, grade: x.grade, label: x.label }))} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity={.15} /><stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient></defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.tt }} axisLine={false} tickLine={false} />
                        <YAxis domain={[1, 9]} reversed tick={{ fontSize: 10, fill: C.tt }} axisLine={false} tickLine={false} tickFormatter={v => v + "등급"} />
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (<div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}><div style={{ fontSize: 12, color: C.tt, marginBottom: 4 }}>{d.label || d.date}</div><div style={{ fontSize: 16, fontWeight: 700, color: "#8B5CF6" }}>{d.grade}등급</div></div>);
                        }} />
                        <Area type="monotone" dataKey="grade" stroke="#8B5CF6" strokeWidth={2} fill="url(#gg)" dot={{ r: 4, fill: "#8B5CF6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>)
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10, marginBottom: 16 }}>
                  <StatCard label="최근" value={latestScore + "점"} color={C.ac} />
                  <StatCard label="최고" value={bestScore + "점"} color={C.su} />
                  <StatCard label="평균" value={avgScore + "점"} color={C.ts} />
                </div>
                <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, overflow: "hidden" }}>
                  <div style={{ height: 200, overflow: "hidden" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scoreData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ac} stopOpacity={.15} /><stop offset="100%" stopColor={C.ac} stopOpacity={0} /></linearGradient></defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.tt }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: C.tt }} axisLine={false} tickLine={false} domain={['dataMin-5', 'dataMax+5']} />
                        <Tooltip content={<ScoreTooltip />} />
                        <Area type="monotone" dataKey="score" stroke={C.ac} strokeWidth={2} fill="url(#sg)" dot={{ r: 4, fill: C.ac, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </>)}

          {/* Past Reports (below scores chart) */}
          {(() => {
            const allReports = [...planComments, ...reports].filter(r => r.is_shared !== false).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
            const pastReports = allReports.slice(1); // All reports except the most recent one
            return pastReports.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>과거 학습 리포트</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {pastReports.map(r => (
                    <div key={r.id} style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>{r.title || "리포트"}</span>
                        <span style={{ fontSize: 12, color: C.tt }}>{r.date}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.ts, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{r.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>)}

        {/* === 자료실 === */}
        {tab === "files" && (<div>
          {lessonFiles.length === 0 && standaloneFiles.length === 0 ? <Empty text="파일이 없습니다" /> : (<>
            {standaloneFiles.length > 0 && (<div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>일반 자료</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {standaloneFiles.map(f => <FileRow key={f.id} f={f} />)}
              </div>
            </div>)}
            {lessonFiles.length > 0 && (<div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>수업 자료</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lessonFiles.map((f, i) => <FileRow key={f.id || i} f={f} showLesson />)}
              </div>
            </div>)}
          </>)}
        </div>)}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "#A8A29E", background: "#FFFFFF", border: "1px solid #E7E5E4", borderRadius: 14 }}>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E7E5E4", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#A8A29E", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function FilterCard({ label, value, color, bg, active, onClick }) {
  return (
    <div onClick={onClick} style={{ background: active ? (bg || color + "12") : "#FFFFFF", border: "2px solid " + (active ? color : "#E7E5E4"), borderRadius: 12, padding: "14px 16px", textAlign: "center", cursor: "pointer", transition: "all .15s" }}>
      <div style={{ fontSize: 11, color: active ? color : "#A8A29E", marginBottom: 4, fontWeight: active ? 600 : 400 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function SwotCard({ label, bg, border, color, text }) {
  return (
    <div style={{ background: bg, border: "1px solid " + border, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 12, color: text ? "#1A1A1A" : "#A8A29E", lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{text || "미작성"}</div>
    </div>
  );
}

function FileRow({ f, showLesson }) {
  const ext = (f.file_name || f.name || "").split('.').pop()?.toLowerCase();
  const icon = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", ppt: "📊", pptx: "📊", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️" }[ext] || "📎";
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E7E5E4", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{f.file_name || f.name}</div>
        {showLesson && f.lesDate && <div style={{ fontSize: 11, color: "#A8A29E" }}>{f.lesDate}{f.lesTopic ? " · " + f.lesTopic : ""}</div>}
      </div>
      {f.file_url && <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2563EB", textDecoration: "none", fontWeight: 500, flexShrink: 0 }}>열기</a>}
    </div>
  );
}
