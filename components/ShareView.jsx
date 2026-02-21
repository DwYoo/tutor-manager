'use client';
import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { C, SC } from '@/components/Colors';
import { p2, m2s, fd, lessonOnDate } from '@/lib/utils';
import { exportStudentReportPDF, generateMonthlySummary } from '@/lib/export';
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
  const [showHwDetail, setShowHwDetail] = useState(false);
  const [hwFilters, setHwFilters] = useState(new Set());
  const [showWrongList, setShowWrongList] = useState(false);
  const [showHwList, setShowHwList] = useState(false);
  const [chartMode, setChartMode] = useState("grade");
  const [wExpanded, setWExpanded] = useState({});
  const [calMonth, setCalMonth] = useState(new Date());
  const [perms, setPerms] = useState({homework_edit:false,homework_view:true,scores_view:true,lessons_view:true,wrong_view:true,files_view:true,reports_view:true,plans_view:true});
  const [hwSaving, setHwSaving] = useState(null);
  const hwTimers = useRef({});

  useEffect(() => {
    if (!token) return;
    (async () => {
      // RPC 함수로 토큰 기반 단건 조회 (RLS 보안 수정 반영)
      const { data, error: rpcErr } = await supabase.rpc('get_shared_student_data', { p_token: token });
      if (rpcErr) {
        // RPC 함수가 아직 배포되지 않은 경우 기존 방식으로 fallback
        console.warn('RPC fallback: get_shared_student_data not available, using direct queries');
        const { data: stu, error: e } = await supabase.from('students').select('id,name,subject,grade,school,color_index,share_token,share_permissions,share_token_expires_at,plan_strategy,plan_strength,plan_weakness,plan_opportunity,plan_threat,score_goal').eq('share_token', token).maybeSingle();
        if (e || !stu) { setError('not_found'); setLoading(false); return; }
        // Check token expiry
        if (stu.share_token_expires_at && new Date(stu.share_token_expires_at) < new Date()) { setError('not_found'); setLoading(false); return; }
        setS(stu);
        if (stu.share_permissions) setPerms(p => ({ ...p, ...stu.share_permissions }));
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
        // Strip private fields from lessons to prevent tutor-only notes from leaking
        setLessons((a.data || []).map(l => { const { private_memo, plan_private, ...safe } = l; return safe; }));
        setScores(b.data || []);
        setWrongs(c.data || []);
        const allReps = d.data || [];
        setReports(allReps.filter(r => r.type !== 'plan'));
        setPlanComments(allReps.filter(r => r.type === 'plan'));
        setStudyPlans(g.data || []);
        setStandaloneFiles(f.data || []);
        setTextbooks(tb.data || []);
        setLoading(false);
        return;
      }
      // RPC 성공: 단일 JSON 응답에서 데이터 추출
      if (!data || !data.student) { setError('not_found'); setLoading(false); return; }
      setS(data.student);
      if (data.student.share_permissions) setPerms(p => ({ ...p, ...data.student.share_permissions }));
      const allHw = data.homework || [];
      setLessons((data.lessons || []).map(l => ({
        ...l,
        homework: allHw.filter(h => h.lesson_id === l.id)
      })));
      setScores(data.scores || []);
      setWrongs(data.wrong_answers || []);
      const allReps = data.reports || [];
      setReports(allReps.filter(r => r.type !== 'plan'));
      setPlanComments(allReps.filter(r => r.type === 'plan'));
      setStudyPlans(data.study_plans || []);
      setStandaloneFiles(data.files || []);
      setTextbooks(data.textbooks || []);
      setLoading(false);
    })();
  }, [token]);

  const updateHwCompletion = useCallback((hwId, pct) => {
    // Optimistic: update local state immediately for smooth UX
    setLessons(prev => prev.map(l => ({
      ...l,
      homework: (l.homework || []).map(h => h.id === hwId ? { ...h, completion_pct: pct } : h)
    })));
    // Debounce the server call — only fire after 400ms of no changes
    clearTimeout(hwTimers.current[hwId]);
    hwTimers.current[hwId] = setTimeout(async () => {
      setHwSaving(hwId);
      try {
        await supabase.rpc('update_shared_homework', { p_token: token, p_homework_id: hwId, p_completion_pct: pct });
      } catch { /* ignore */ }
      setHwSaving(null);
    }, 400);
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
    perms.lessons_view !== false && { id: "lessons", l: "수업", count: 0, subs: [{ id: "history", l: "수업 이력" }, { id: "schedule", l: "수업 일정" }] },
    (perms.homework_view !== false || perms.wrong_view !== false) && { id: "study", l: "학습 관리", count: 0 },
    (perms.scores_view !== false || perms.reports_view !== false) && { id: "analysis", l: "학습 분석", count: 0 },
    perms.files_view !== false && { id: "files", l: "자료실", count: lessonFiles.length + standaloneFiles.length },
  ].filter(Boolean);

  return (
    <div className="share-container" style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.sf, borderBottom: "1px solid " + C.bd, padding: "24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: col.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: col.t, flexShrink: 0 }}>{(s.name || "?")[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.tp }}>{s.name}</div>
              <div style={{ fontSize: 13, color: C.ts }}>{s.subject} · {s.grade}{s.school ? " · " + s.school : ""}</div>
            </div>
            <button onClick={() => exportStudentReportPDF({ student: s, scores, lessons, wrongs })} style={{ background: C.sf, color: C.ts, border: "1px solid " + C.bd, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>PDF 리포트</button>
          </div>
        </div>
      </div>


      {/* Recent Report and Study Plan (above tabs) */}
      {(() => {
        const allReports = perms.reports_view !== false ? [...planComments, ...reports].filter(r => r.is_shared !== false).sort((a, b) => (b.date || "").localeCompare(a.date || "")) : [];
        const recentReport = allReports[0];
        const sharedPlans = perms.plans_view !== false ? studyPlans.filter(sp => sp.is_shared !== false).sort((a, b) => (b.date || "").localeCompare(a.date || "")) : [];
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
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.tp, marginBottom: 10 }}>지도 방향</h3>
                  <div style={{ background: "linear-gradient(135deg, #D1FAE5 0%, " + C.sf + " 100%)", border: "2px solid #16A34A", borderRadius: 14, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.tp }}>{recentPlan.title || "지도 방향"}</span>
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
          {subTab === "history" && (() => {
            const now = new Date();
            const isLessonDone = (l) => { const end = new Date(l.date + "T00:00:00"); end.setHours(l.start_hour, l.start_min + l.duration, 0, 0); return now >= end; };
            const isLessonInProgress = (l) => { const st = new Date(l.date + "T00:00:00"); st.setHours(l.start_hour, l.start_min, 0, 0); const end = new Date(l.date + "T00:00:00"); end.setHours(l.start_hour, l.start_min + l.duration, 0, 0); return now >= st && now < end; };
            const getLessonStatus = (l) => { const st = l.status || 'scheduled'; if (st !== 'scheduled') return st; if (isLessonInProgress(l)) return 'in_progress'; if (isLessonDone(l)) return 'completed'; return 'scheduled'; };
            const isDoneOrCompleted = (l) => isLessonDone(l) || l.status === 'completed';
            const doneLessons = lessons.filter(l => isDoneOrCompleted(l) && l.status !== 'cancelled').sort((a, b) => { if (a.date !== b.date) return b.date.localeCompare(a.date); return (b.start_hour * 60 + b.start_min) - (a.start_hour * 60 + a.start_min); });
            const upcomingLessons = lessons.filter(l => !isDoneOrCompleted(l) && l.status !== 'cancelled').sort((a, b) => { if (a.date !== b.date) return a.date.localeCompare(b.date); return (a.start_hour * 60 + a.start_min) - (b.start_hour * 60 + b.start_min); });
            const topCount = (upcomingLessons.length > 0 && isLessonInProgress(upcomingLessons[0])) ? 2 : 1;
            const topLessons = upcomingLessons.slice(0, topCount);
            const tlLessons = [...topLessons, ...doneLessons];
            const doneCount = doneLessons.length;
            return (<div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>수업 타임라인</h3>
                <span style={{ fontSize: 12, color: C.tt }}>총 {doneCount}회</span>
              </div>
              {tlLessons.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}>
                  <div style={{ fontSize: 14 }}>수업 기록이 없습니다</div>
                </div>
              ) : (
                <div style={{ position: "relative", paddingLeft: 28 }}>
                  <div style={{ position: "absolute", left: 7, top: 16, bottom: 16, width: 2, background: C.bl }} />
                  {tlLessons.map((l, i) => {
                    const isDone = isLessonDone(l);
                    const lSt = getLessonStatus(l);
                    const isIP = lSt === 'in_progress';
                    const isUp = lSt === 'scheduled';
                    const isFirstDone = isDone && (i === 0 || !isLessonDone(tlLessons[i - 1]));
                    const hw = l.homework || [], hwDoneC = hw.filter(h => (h.completion_pct || 0) >= 100).length, hwTotal = hw.length;
                    const em = l.start_hour * 60 + l.start_min + l.duration;
                    const hasSections = l.content || l.feedback || hwTotal > 0 || (l.plan_shared && !isDone);
                    return (
                      <div key={l.id} style={{ position: "relative", marginBottom: 16 }}>
                        <div style={{ position: "absolute", left: -28 + 3, top: 18, width: 10, height: 10, borderRadius: "50%", background: isIP ? "#EA580C" : isFirstDone ? col.b : isUp ? C.sf : C.bd, border: isUp && !isIP ? "2px solid " + C.bd : "2px solid " + C.sf, zIndex: 1, boxShadow: isIP ? "0 0 8px rgba(234,88,12,.5)" : "none" }} />
                        <div style={{ background: isIP ? "#FFF7ED" : isUp ? C.as : C.sf, border: "1px solid " + (isIP ? "#FDBA74" : isUp ? C.al : C.bd), borderRadius: 14, overflow: "hidden", borderLeft: "3px solid " + (isIP ? "#EA580C" : isUp ? C.ac : col.b) }}>
                          <div style={{ padding: "16px 20px " + (hasSections ? "12px" : "16px") }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: C.tt, marginBottom: 4 }}>{l.date} {p2(l.start_hour)}:{p2(l.start_min)} ~ {m2s(em)} ({l.duration}분)</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>{l.topic || l.subject || "-"}</div>
                              </div>
                              <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                {isIP && <span style={{ background: "#FFF7ED", color: "#EA580C", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>진행중</span>}
                                {isUp && <span style={{ background: C.ac, color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>예정</span>}
                                <span style={{ background: col.bg, color: col.t, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{l.subject || "-"}</span>
                                {hwTotal > 0 && <span style={{ fontSize: 11, background: hwDoneC === hwTotal ? C.sb : C.wb, color: hwDoneC === hwTotal ? C.su : C.wn, padding: "3px 8px", borderRadius: 5, fontWeight: 600 }}>숙제 {hwDoneC}/{hwTotal}</span>}
                                {l.content && <span style={{ fontSize: 11, background: C.sfh, color: C.ts, padding: "3px 8px", borderRadius: 5 }}>내용</span>}
                                {l.feedback && <span style={{ fontSize: 11, background: C.as, color: C.ac, padding: "3px 8px", borderRadius: 5 }}>피드백</span>}
                              </div>
                            </div>
                          </div>
                          {hasSections && (<div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                            {l.content && (<div style={{ background: C.sfh, borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.tt, marginBottom: 4 }}>수업 내용</div>
                              <div style={{ fontSize: 13, color: C.ts, lineHeight: 1.5, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{l.content}</div>
                            </div>)}
                            {l.feedback && (<div style={{ background: C.as, borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.ac, marginBottom: 4 }}>피드백</div>
                              <div style={{ fontSize: 13, color: C.ts, lineHeight: 1.5, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{l.feedback}</div>
                            </div>)}
                            {hwTotal > 0 && (<div style={{ background: C.sfh, borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.tt, marginBottom: 6 }}>숙제</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {hw.map(h => { const pct = h.completion_pct || 0; const done = pct >= 100; return (
                                  <span key={h.id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 500, background: done ? C.sb : pct >= 50 ? C.wb : C.db, color: done ? C.su : pct >= 50 ? C.wn : C.dn }}>{h.title} {pct}%</span>
                                ); })}
                              </div>
                            </div>)}
                            {l.plan_shared && !isDone && (<div style={{ background: C.wb, borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: C.wn, marginBottom: 4 }}>수업 계획</div>
                              <div style={{ fontSize: 13, color: C.ts, lineHeight: 1.5, whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{l.plan_shared}</div>
                            </div>)}
                          </div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>);
          })()}

          {/* 수업 일정 서브탭 */}
          {subTab === "schedule" && (<div>
            {(() => {
              const cy = calMonth.getFullYear(), cm = calMonth.getMonth();
              const fst = new Date(cy, cm, 1), lst = new Date(cy, cm + 1, 0);
              const sDow = (fst.getDay() + 6) % 7, dim = lst.getDate();
              const td = new Date();
              const cells = [];
              const pvL = new Date(cy, cm, 0).getDate();
              for (let i = sDow - 1; i >= 0; i--) cells.push({ d: pvL - i, cur: false });
              for (let d = 1; d <= dim; d++) cells.push({ d, cur: true });
              while (cells.length % 7 !== 0 || cells.length < 42) cells.push({ d: cells.length - sDow - dim + 1, cur: false });
              const gLD = date => { const ds = fd(date), dw = date.getDay() === 0 ? 7 : date.getDay(); return lessons.filter(l => { if (l.is_recurring && l.recurring_exceptions && l.recurring_exceptions.includes(ds)) return false; if (l.date === ds) return true; if (l.is_recurring && l.recurring_day === dw) { if (ds < l.date) return false; if (l.recurring_end_date && ds >= l.recurring_end_date) return false; return true; } return false; }); };
              const DK = ["월", "화", "수", "목", "금", "토", "일"];
              let mTotal = 0; for (let d = 1; d <= dim; d++) mTotal += gLD(new Date(cy, cm, d)).length;
              return (<div>
                <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20 }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => setCalMonth(new Date(cy, cm - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.ts, fontSize: 16, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, minWidth: 110, textAlign: "center" }}>{cy}년 {cm + 1}월</h3>
                      <button onClick={() => setCalMonth(new Date(cy, cm + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.ts, fontSize: 16, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center", transform: "rotate(180deg)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: C.tt }}>이번 달 {mTotal}회 수업</span>
                      <button onClick={() => setCalMonth(new Date())} style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid " + C.bd, background: C.sf, fontSize: 12, cursor: "pointer", color: C.ts, fontFamily: "inherit" }}>이번 달</button>
                    </div>
                  </div>
                  {/* Day headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
                    {DK.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 500, color: i >= 5 ? C.ac : C.tt, padding: "6px 0" }}>{d}</div>)}
                  </div>
                  {/* Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
                    {cells.map((c, i) => {
                      const date = c.cur ? new Date(cy, cm, c.d) : null;
                      const isToday = c.cur && td.getFullYear() === cy && td.getMonth() === cm && td.getDate() === c.d;
                      const dl = date ? gLD(date) : [];
                      const isSat = i % 7 === 5, isSun = i % 7 === 6;
                      return (
                        <div key={i} className="cal-cell" style={{ padding: "6px 4px", minHeight: 72, borderRadius: 8, opacity: c.cur ? 1 : .3, overflow: "hidden" }}>
                          <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? C.ac : isSun ? "#DC2626" : isSat ? C.ac : C.tp, marginBottom: 4 }}>{c.d}</div>
                          {dl.length > 0 && dl.map(l => (
                            <div key={l.id} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: col.bg, color: col.t }}>
                              {p2(l.start_hour || 0)}:{p2(l.start_min || 0)}<span className="cal-lesson-text"> {l.topic || l.subject}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Upcoming lessons list */}
                {(() => {
                  const upcoming = [];
                  for (let d = 1; d <= dim; d++) { const dt = new Date(cy, cm, d); const dl = gLD(dt); dl.forEach(l => upcoming.push({ ...l, _d: fd(dt) })); }
                  if (!upcoming.length) return null;
                  return (<div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 10 }}>{cm + 1}월 수업 목록</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {upcoming.map((l, i) => { const isOrig = !l.is_recurring || l.date === l._d; return (
                        <div key={l.id + "-" + l._d + "-" + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.sf, border: "1px solid " + C.bd, borderRadius: 10, borderLeft: "3px solid " + col.b }}>
                          <span style={{ fontSize: 12, color: C.tt, minWidth: 70 }}>{l._d}</span>
                          <span style={{ fontSize: 12, color: C.ts }}>{p2(l.start_hour)}:{p2(l.start_min)}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.tp, flex: 1 }}>{isOrig ? (l.topic || l.subject || "-") : (l.subject || "-")}</span>
                          <span style={{ fontSize: 11, color: C.tt }}>{l.duration}분</span>
                          {isOrig && (l.homework || []).length > 0 && <span style={{ fontSize: 11, background: C.wb, color: C.wn, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>숙제 {(l.homework || []).length}</span>}
                        </div>
                      ); })}
                    </div>
                  </div>);
                })()}
              </div>);
            })()}
          </div>)}
        </div>)}

        {/* === 학습 관리 === */}
        {tab === "study" && (<div>
          {/* Homework section */}
          {perms.homework_view !== false && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, margin: 0 }}>숙제 현황</h3>
              {allHw.length > 0 && (() => { const inc = allHw.length - hwDone; return inc > 0 ? <span style={{ fontSize: 13, fontWeight: 700, color: C.wn, background: C.wb, padding: "4px 12px", borderRadius: 8 }}>미완 숙제 {inc}건</span> : <span style={{ fontSize: 13, fontWeight: 700, color: C.su, background: C.sb, padding: "4px 12px", borderRadius: 8 }}>모두 완료</span>; })()}
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
                      <span style={{ fontSize: 12, fontWeight: 700, color: pc, background: pb, padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>{hwSaving === h.id ? "..." : pct + "%"}</span>
                    </div>
                    {perms.homework_edit ? (
                      <div onMouseDown={e => { e.preventDefault(); const bar = e.currentTarget; const calc = ev => { const r = bar.getBoundingClientRect(); const v = Math.max(0, Math.min(100, Math.round((ev.clientX - r.left) / r.width * 20) * 5)); updateHwCompletion(h.id, v); }; calc(e); const mv = ev => calc(ev); const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); }; window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); }}
                        onTouchStart={e => { const bar = e.currentTarget; const calc = ev => { const r = bar.getBoundingClientRect(); const cx = ev.touches?.[0]?.clientX ?? ev.changedTouches?.[0]?.clientX ?? 0; const v = Math.max(0, Math.min(100, Math.round((cx - r.left) / r.width * 20) * 5)); updateHwCompletion(h.id, v); }; calc(e); const mv = ev => { ev.preventDefault(); calc(ev); }; const up = () => { window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); }; window.addEventListener("touchmove", mv, { passive: false }); window.addEventListener("touchend", up); }}
                        style={{ width: "100%", height: 24, background: "transparent", cursor: "pointer", position: "relative", touchAction: "none", display: "flex", alignItems: "center" }}>
                        <div style={{ position: "absolute", left: 0, right: 0, height: 10, background: C.bl, borderRadius: 5 }} />
                        <div style={{ position: "absolute", left: 0, height: 10, width: pct + "%", minWidth: pct > 0 ? 8 : 0, background: pc, borderRadius: 5, pointerEvents: "none" }} />
                        <div style={{ position: "absolute", top: "50%", left: pct + "%", transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%", background: "#fff", border: "3px solid " + pc, boxShadow: "0 1px 4px rgba(0,0,0,.18)", pointerEvents: "none" }} />
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: 8, background: C.bl, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: pct + "%", minWidth: pct > 0 ? 8 : 0, height: "100%", borderRadius: 4, background: pc }} />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>}
            </>);
          })()}
          </>)}

          {/* Wrong answers section */}
          {perms.wrong_view !== false && (<>
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
                              <thead><tr>{["번호", "사유"].map((h) => (<th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.tt, fontWeight: 500, borderBottom: "1px solid " + C.bd }}>{h}</th>))}</tr></thead>
                              <tbody>{uCh.map(ch => {
                                const ck = bk + "::" + (ch || "__no_ch__");
                                const chExp = wExpanded[ck] !== false;
                                const chItems = items.filter(w => (w.chapter || "") === ch);
                                return (
                                  <Fragment key={ck}>
                                    <tr onClick={() => setWExpanded(p => ({ ...p, [ck]: !chExp }))} style={{ cursor: "pointer" }}>
                                      <td colSpan={2} style={{ padding: "7px 8px", background: C.bl, borderBottom: "1px solid " + C.bd }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ fontSize: 12, fontWeight: 500, color: ch ? C.ts : C.tt }}>{ch || "단원 미지정"}</span>
                                          <span style={{ fontSize: 11, color: C.tt }}>({chItems.length})</span>
                                          <span style={{ fontSize: 11, color: C.tt, marginLeft: "auto" }}>{chExp ? "▲" : "▼"}</span>
                                        </div>
                                      </td>
                                    </tr>
                                    {chExp && chItems.map(w => {
                                      const rc = reasonColorMap[w.reason || "미분류"] || "#888";
                                      return (
                                        <tr key={w.id} style={{ borderBottom: "1px solid " + C.bl }}>
                                          <td style={{ padding: "6px 10px", fontWeight: 600, color: C.tp, fontSize: 12 }}>{w.problem_num}</td>
                                          <td style={{ padding: "6px 10px" }}>{w.reason && <span style={{ background: rc + "20", color: rc, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600 }}>{w.reason}</span>}</td>
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
                        {tb.subject && <span style={{ fontSize: 11, background: "#EFF6FF", color: C.ac, padding: "2px 8px", borderRadius: 5, fontWeight: 600 }}>{tb.subject}</span>}
                      </div>
                      {tb.publisher && <div style={{ fontSize: 12, color: C.ts }}>{tb.publisher}</div>}
                    </div>
                    {wCnt > 0 && <span style={{ fontSize: 11, background: C.db, color: C.dn, padding: "2px 8px", borderRadius: 5, fontWeight: 600 }}>오답 {wCnt}</span>}
                  </div>
                );
              })}
            </div>
          </>)}
        </div>)}

        {/* === 분석 === */}
        {tab === "analysis" && (<div>
          {/* SWOT */}
          {perms.plans_view !== false && (<>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>학습 오버뷰</h3>
          {(()=>{const sp=studyPlans.filter(p=>p.is_shared!==false);if(!sp.length)return null;return(<div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.tp, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><span>🧭</span>지도 방향</div>
            <div style={{ position: "relative", paddingLeft: 20 }}>
              <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 2, background: C.bl }}/>
              {sp.map((p,i)=>(<div key={p.id} style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: -20+1, top: 6, width: 10, height: 10, borderRadius: "50%", background: i===0?C.ac:C.bd }}/>
                <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 16, borderLeft: i===0?"3px solid "+C.ac:"none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>{p.title || "지도 방향"}</span>
                    <span style={{ fontSize: 12, color: C.tt, flexShrink: 0, marginLeft: 8 }}>{p.date}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.ts, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{p.body}</div>
                </div>
              </div>))}
            </div>
          </div>);})()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginBottom: 24 }}>
            <SwotCard label="💪 강점 (S)" bg={C.sb} border="#BBF7D0" color={C.su} text={s.plan_strength} />
            <SwotCard label="🔧 약점 (W)" bg={C.db} border="#FECACA" color={C.dn} text={s.plan_weakness} />
            <SwotCard label="🚀 기회 (O)" bg="#EFF6FF" border="#BFDBFE" color={C.ac} text={s.plan_opportunity} />
            <SwotCard label="⚠️ 위협 (T)" bg={C.wb} border="#FDE68A" color="#B45309" text={s.plan_threat} />
          </div>
          </>)}

          {/* Scores */}
          {perms.scores_view !== false && (<>
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
          </>)}

          {/* Past Reports (below scores chart) */}
          {perms.reports_view !== false && (() => {
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
