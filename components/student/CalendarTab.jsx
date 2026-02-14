import { useState } from 'react';
import { C, p2, fd, IcBack } from './constants';

export default function CalendarTab({ lessons, col, student: s, onLessonOpen }) {
  const [calMonth, setCalMonth] = useState(new Date());
  const cy = calMonth.getFullYear(), cm = calMonth.getMonth();
  const lst = new Date(cy, cm + 1, 0);
  const sDow = (new Date(cy, cm, 1).getDay() + 6) % 7, dim = lst.getDate();
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setCalMonth(new Date(cy, cm - 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.ts, fontSize: 16, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}><IcBack /></button>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, minWidth: 110, textAlign: "center" }}>{cy}년 {cm + 1}월</h3>
          <button onClick={() => setCalMonth(new Date(cy, cm + 1, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.ts, fontSize: 16, padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center", transform: "rotate(180deg)" }}><IcBack /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: C.tt }}>이번 달 {mTotal}회 수업</span>
          <button onClick={() => setCalMonth(new Date())} style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid " + C.bd, background: C.sf, fontSize: 12, cursor: "pointer", color: C.ts, fontFamily: "inherit" }}>이번 달</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {DK.map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 500, color: i >= 5 ? C.ac : C.tt, padding: "6px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {cells.map((c, i) => {
          const date = c.cur ? new Date(cy, cm, c.d) : null;
          const isToday = c.cur && td.getFullYear() === cy && td.getMonth() === cm && td.getDate() === c.d;
          const dl = date ? gLD(date) : [];
          const isSat = i % 7 === 5, isSun = i % 7 === 6;
          return (
            <div key={i} onClick={() => { if (dl.length === 1 && date) onLessonOpen(dl[0], fd(date)); }} style={{ textAlign: "center", padding: "6px 2px", minHeight: 52, borderRadius: 8, background: isToday ? C.as : "transparent", cursor: dl.length === 1 ? "pointer" : "default", opacity: c.cur ? 1 : .3 }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, width: isToday ? 28 : undefined, height: isToday ? 28 : undefined, lineHeight: isToday ? "28px" : undefined, borderRadius: "50%", background: isToday ? C.ac : "transparent", color: isToday ? "#fff" : isSun ? "#DC2626" : isSat ? C.ac : C.tp, display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>{c.d}</div>
              {dl.length > 0 && (<div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 4 }}>
                {dl.slice(0, 3).map((_, j) => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: col.b }} />)}
                {dl.length > 3 && <span style={{ fontSize: 8, color: C.tt }}>+{dl.length - 3}</span>}
              </div>)}
            </div>
          );
        })}
      </div>
    </div>
    {(() => {
      const upcoming = [];
      for (let d = 1; d <= dim; d++) { const dt = new Date(cy, cm, d); const dl = gLD(dt); dl.forEach(l => upcoming.push({ ...l, _d: fd(dt) })); }
      if (!upcoming.length) return null;
      return (<div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 10 }}>{cm + 1}월 수업 목록</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {upcoming.map((l, i) => { const isOrig = !l.is_recurring || l.date === l._d; return (
            <div key={l.id + "-" + l._d + "-" + i} onClick={() => onLessonOpen(l, l._d)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.sf, border: "1px solid " + C.bd, borderRadius: 10, cursor: "pointer", borderLeft: "3px solid " + col.b }} className="hcard">
              <span style={{ fontSize: 12, color: C.tt, minWidth: 70 }}>{l._d}</span>
              <span style={{ fontSize: 12, color: C.ts }}>{p2(l.start_hour)}:{p2(l.start_min)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.tp, flex: 1 }}>{isOrig ? (l.topic || l.subject || "-") : (l.subject || "-")}</span>
              <span style={{ fontSize: 11, color: C.tt }}>{l.duration}분</span>
              {isOrig && (l.homework || []).length > 0 && <span style={{ fontSize: 10, background: C.wb, color: C.wn, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>숙제 {(l.homework || []).length}</span>}
            </div>
          ); })}
        </div>
      </div>);
    })()}
  </div>);
}
