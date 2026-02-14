import { C, p2, m2s } from './constants';

export default function TimelineTab({ lessons, col, student: s, isParent, onLessonClick }) {
  const now = new Date();
  const isLessonDone = (l) => { const end = new Date(l.date + "T00:00:00"); end.setHours(l.start_hour, l.start_min + l.duration, 0, 0); return now >= end; };
  const doneLessons = lessons.filter(l => isLessonDone(l));
  const upcomingLessons = lessons.filter(l => !isLessonDone(l));
  const nextOne = upcomingLessons.length ? [upcomingLessons[upcomingLessons.length - 1]] : [];
  const tlLessons = [...nextOne, ...doneLessons];
  const doneCount = doneLessons.length;

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>수업 타임라인</h3>
      <span style={{ fontSize: 12, color: C.tt }}>총 {doneCount}회</span>
    </div>
    {tlLessons.length === 0 ? (<div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}><div style={{ fontSize: 14 }}>수업 기록이 없습니다</div></div>) : (
      <div style={{ position: "relative", paddingLeft: 28 }}>
        <div style={{ position: "absolute", left: 7, top: 16, bottom: 16, width: 2, background: C.bl }} />
        {tlLessons.map((l, i) => {
          const isDone = isLessonDone(l);
          const isFirstDone = isDone && (i === 0 || !isLessonDone(tlLessons[i - 1]));
          const hw = l.homework || [], hwDone = hw.filter(h => (h.completion_pct || 0) >= 100).length, hwTotal = hw.length;
          const em = l.start_hour * 60 + l.start_min + l.duration;
          const hasSections = l.content || l.feedback || hwTotal > 0 || l.plan_shared;
          return (
            <div key={l.id} style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ position: "absolute", left: -28 + 3, top: 18, width: 10, height: 10, borderRadius: "50%", background: isFirstDone ? col.b : !isDone ? C.sf : C.bd, border: !isDone ? "2px solid " + C.bd : "2px solid " + C.sf, zIndex: 1 }} />
              <div onClick={() => onLessonClick(l)} style={{ background: !isDone ? C.as : C.sf, border: "1px solid " + (!isDone ? C.al : C.bd), borderRadius: 14, overflow: "hidden", cursor: "pointer", borderLeft: "3px solid " + (!isDone ? C.ac : col.b) }} className="hcard">
                <div style={{ padding: "16px 20px " + (hasSections ? "12px" : "16px") }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.tt, marginBottom: 4 }}>{l.date} {p2(l.start_hour)}:{p2(l.start_min)} ~ {m2s(em)} ({l.duration}분)</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>{l.topic || l.subject || "-"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {!isDone && <span style={{ background: C.ac, color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>예정</span>}
                      <span style={{ background: col.bg, color: col.t, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{l.subject || s.subject}</span>
                      {hwTotal > 0 && <span style={{ fontSize: 10, background: hwDone === hwTotal ? C.sb : C.wb, color: hwDone === hwTotal ? C.su : C.wn, padding: "3px 8px", borderRadius: 5, fontWeight: 600 }}>숙제 {hwDone}/{hwTotal}</span>}
                      {l.content && <span style={{ fontSize: 10, background: C.sfh, color: C.ts, padding: "3px 8px", borderRadius: 5 }}>내용</span>}
                      {l.feedback && <span style={{ fontSize: 10, background: C.as, color: C.ac, padding: "3px 8px", borderRadius: 5 }}>피드백</span>}
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
                      {hw.map(h => { const pct = h.completion_pct || 0; const done = pct >= 100; return (<span key={h.id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 500, background: done ? C.sb : pct >= 50 ? C.wb : C.db, color: done ? C.su : pct >= 50 ? C.wn : C.dn }}>{h.title} {pct}%</span>); })}
                    </div>
                  </div>)}
                  {l.plan_shared && (<div style={{ background: C.wb, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.wn, marginBottom: 4 }}>다음 수업 계획</div>
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
}
