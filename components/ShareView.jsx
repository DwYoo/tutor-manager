'use client';
import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
const REASON_COLORS=["#2563EB","#DC2626","#F59E0B","#16A34A","#8B5CF6","#EC4899","#06B6D4","#F97316"];
const p2=n=>String(n).padStart(2,"0");
const m2s=m=>`${p2(Math.floor(m/60))}:${p2(m%60)}`;
const ScoreTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>{d.label||d.date}</div><div style={{fontSize:16,fontWeight:700,color:C.ac}}>{d.score}점</div></div>);};

export default function ShareView({ token }) {
  const [s, setS] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [scores, setScores] = useState([]);
  const [wrongs, setWrongs] = useState([]);
  const [reports, setReports] = useState([]);
  const [planComments, setPlanComments] = useState([]);
  const [standaloneFiles, setStandaloneFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("lessons");
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [showHwDetail, setShowHwDetail] = useState(false);
  const [showWrongList, setShowWrongList] = useState(false);
  const [chartMode, setChartMode] = useState("grade");
  const [wExpanded, setWExpanded] = useState({});

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: stu, error: e } = await supabase.from('students').select('*').eq('share_token', token).single();
      if (e || !stu) { setError('not_found'); setLoading(false); return; }
      setS(stu);
      const [a, b, c, d, f] = await Promise.all([
        supabase.from('lessons').select('*, homework(*)').eq('student_id', stu.id).order('date', { ascending: false }),
        supabase.from('scores').select('*').eq('student_id', stu.id).order('created_at'),
        supabase.from('wrong_answers').select('*').eq('student_id', stu.id).order('created_at', { ascending: false }),
        supabase.from('reports').select('*').eq('student_id', stu.id).order('date', { ascending: false }),
        supabase.from('files').select('*').eq('student_id', stu.id).is('lesson_id', null).order('created_at', { ascending: false }),
      ]);
      setLessons(a.data || []);
      setScores(b.data || []);
      setWrongs(c.data || []);
      const allReps = d.data || [];
      setReports(allReps.filter(r => r.type !== 'plan'));
      setPlanComments(allReps.filter(r => r.type === 'plan'));
      setStandaloneFiles(f.data || []);
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

  // Score stats
  const scoreData = scores.map(sc => ({ date: sc.date, score: sc.score, grade: sc.grade, label: sc.label }));
  const latestScore = scores.length ? scores[scores.length - 1].score : null;
  const bestScore = scores.length ? Math.max(...scores.map(x => x.score)) : null;
  const avgScore = scores.length ? Math.round(scores.reduce((a, x) => a + x.score, 0) / scores.length) : null;

  // Grade stats
  const gradeEntries = scores.filter(x => x.grade != null);
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
    { id: "lessons", l: "수업이력", count: pastLessons.length },
    { id: "study", l: "학습관리", count: allHw.length + wrongs.length },
    { id: "analysis", l: "학습 분석", count: scores.length },
    { id: "files", l: "자료실", count: lessonFiles.length + standaloneFiles.length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.sf, borderBottom: "1px solid " + C.bd, padding: "24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: col.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: col.t, flexShrink: 0 }}>{(s.name || "?")[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.tp }}>{s.name}</div>
              <div style={{ fontSize: 13, color: C.ts }}>{s.subject} · {s.grade}{s.school ? " · " + s.school : ""}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.sf, borderBottom: "1px solid " + C.bd, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", gap: 0, overflowX: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 20px", border: "none", borderBottom: tab === t.id ? "2px solid " + C.ac : "2px solid transparent", background: "none", fontSize: 14, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {t.l}{t.count > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: tab === t.id ? C.ac : C.tt }}>({t.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 20px 60px" }}>

        {/* Recent Report (always visible at top) */}
        {(() => {
          const allReports = [...planComments, ...reports].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
          const recentReport = allReports[0];
          return recentReport ? (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>최근 학습 리포트</h3>
              <div style={{ background: "linear-gradient(135deg, " + C.as + " 0%, " + C.sf + " 100%)", border: "2px solid " + C.ac, borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.tp }}>{recentReport.title || "리포트"}</span>
                  <span style={{ fontSize: 12, color: C.tt }}>{recentReport.date}</span>
                </div>
                <div style={{ fontSize: 14, color: C.tp, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{recentReport.body}</div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Upcoming Lessons (월간뷰) */}
        {upcomingLessons.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>예정 수업</h3>
            <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, overflow: "hidden" }}>
              {upcomingLessons.slice(0, 5).map((l, idx) => {
                const sh = l.start_hour, sm = l.start_min, dur = l.duration;
                const em = sh * 60 + sm + dur;
                const dateObj = new Date(l.date + "T00:00:00");
                const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][dateObj.getDay()];
                return (
                  <div key={l.id} style={{ padding: "14px 18px", borderBottom: idx < upcomingLessons.length - 1 && idx < 4 ? "1px solid " + C.bl : "none" }}>
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
            {upcomingLessons.length > 5 && (
              <div style={{ marginTop: 8, fontSize: 12, color: C.tt, textAlign: "center" }}>외 {upcomingLessons.length - 5}건 더</div>
            )}
          </div>
        )}

        {/* === 수업이력 === */}
        {tab === "lessons" && (<div>
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
                    <div onClick={() => setExpandedLesson(open ? null : l.id)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                      <div style={{ padding: "0 20px 16px", borderTop: "1px solid " + C.bl }}>
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
                          {hw.map(h => (
                            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                              <div style={{ width: 60, height: 6, borderRadius: 3, background: C.bl, overflow: "hidden", flexShrink: 0 }}>
                                <div style={{ width: (h.completion_pct || 0) + "%", height: "100%", borderRadius: 3, background: (h.completion_pct || 0) >= 100 ? C.su : C.ac }} />
                              </div>
                              <span style={{ fontSize: 12, color: C.tp, flex: 1 }}>{h.title}</span>
                              <span style={{ fontSize: 11, color: (h.completion_pct || 0) >= 100 ? C.su : C.ts, fontWeight: 600 }}>{h.completion_pct || 0}%</span>
                            </div>
                          ))}
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

        {/* === 학습관리 === */}
        {tab === "study" && (<div>
          {/* Homework section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, margin: 0 }}>숙제 현황</h3>
            {allHw.length > 0 && (
              <button onClick={() => setShowHwDetail(!showHwDetail)} style={{ padding: "4px 12px", border: "1px solid " + C.bd, borderRadius: 8, background: C.sf, fontSize: 11, color: C.ts, cursor: "pointer", fontFamily: "inherit" }}>
                {showHwDetail ? "상세 숨김" : "상세 보기"}
              </button>
            )}
          </div>
          {allHw.length === 0 ? <Empty text="숙제 기록이 없습니다" /> : (<>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: showHwDetail ? 16 : 28 }}>
              <StatCard label="완료율" value={hwAvg + "%"} color={C.ac} />
              <StatCard label="완료" value={hwDone + "건"} color={C.su} />
              <StatCard label="진행중" value={hwInProg + "건"} color={C.wn} />
              <StatCard label="미시작" value={hwNotStarted + "건"} color={C.tt} />
            </div>
            {showHwDetail && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {allHw.map(h => (
                  <div key={h.id} style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.tp }}>{h.title}</div>
                      <div style={{ fontSize: 11, color: C.tt }}>{h.lesDate} · {h.lesSub}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <div style={{ width: 60, height: 6, borderRadius: 3, background: C.bl, overflow: "hidden" }}>
                        <div style={{ width: (h.completion_pct || 0) + "%", height: "100%", borderRadius: 3, background: (h.completion_pct || 0) >= 100 ? C.su : C.ac }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: (h.completion_pct || 0) >= 100 ? C.su : C.ts, width: 32, textAlign: "right" }}>{h.completion_pct || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>)}

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
              <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, marginBottom: showWrongList ? 16 : 28 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 12 }}>오답 유형 분포</div>
                <div style={{ height: 180 }}>
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
                          <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 10, overflow: "hidden" }}>
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
        </div>)}

        {/* === 분석 === */}
        {tab === "analysis" && (<div>
          {/* SWOT */}
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 12 }}>학습 오버뷰</h3>
          <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ac, marginBottom: 10 }}>🧭 학업 전략</div>
            <div style={{ fontSize: 13, color: s.plan_strategy ? C.tp : C.tt, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{s.plan_strategy || "아직 작성된 전략이 없습니다"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                  <StatCard label="최근 등급" value={latestGrade != null ? latestGrade + "등급" : "-"} color="#8B5CF6" />
                  <StatCard label="최고 등급" value={bestGrade != null ? bestGrade + "등급" : "-"} color={C.su} />
                  <StatCard label="평균 등급" value={avgGrade != null ? avgGrade + "등급" : "-"} color={C.ts} />
                </div>
                <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20 }}>
                  <div style={{ height: 200 }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                  <StatCard label="최근" value={latestScore + "점"} color={C.ac} />
                  <StatCard label="최고" value={bestScore + "점"} color={C.su} />
                  <StatCard label="평균" value={avgScore + "점"} color={C.ts} />
                </div>
                <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20 }}>
                  <div style={{ height: 200 }}>
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
            const allReports = [...planComments, ...reports].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
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
