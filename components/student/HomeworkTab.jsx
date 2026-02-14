import { useState } from 'react';
import { C } from './constants';

export default function HomeworkTab({ lessons, col, isParent, onUpdateHw, onDeleteHw }) {
  const [hwFilter, setHwFilter] = useState(null);

  const aHw = lessons.flatMap(l => (l.homework || []).map(h => ({ ...h, _ld: l.date, _lt: l.topic || l.subject })));
  const tHw = aHw.length, dHw = aHw.filter(h => (h.completion_pct || 0) >= 100).length;
  const pHw = aHw.filter(h => { const p = h.completion_pct || 0; return p > 0 && p < 100; }).length;
  const nHw = aHw.filter(h => (h.completion_pct || 0) === 0).length;

  return (<div>
    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, marginBottom: 16 }}>숙제 현황</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
      <div onClick={() => setHwFilter(null)} style={{ background: hwFilter === null ? C.sfh : C.sf, border: hwFilter === null ? "2px solid " + C.tp : "1px solid " + C.bd, borderRadius: 12, padding: "14px 16px", textAlign: "center", cursor: "pointer", opacity: hwFilter === null ? 1 : .5, transition: "all .15s" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.tp }}>{tHw}</div><div style={{ fontSize: 11, color: C.tt, marginTop: 2 }}>전체</div>
      </div>
      <div onClick={() => setHwFilter(hwFilter === "done" ? null : "done")} style={{ background: C.sb, border: hwFilter === "done" ? "2px solid " + C.su : "1px solid #BBF7D0", borderRadius: 12, padding: "14px 16px", textAlign: "center", cursor: "pointer", opacity: hwFilter && hwFilter !== "done" ? .5 : 1, transition: "all .15s" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.su }}>{dHw}</div><div style={{ fontSize: 11, color: C.su, marginTop: 2 }}>완료</div>
      </div>
      <div onClick={() => setHwFilter(hwFilter === "progress" ? null : "progress")} style={{ background: C.wb, border: hwFilter === "progress" ? "2px solid " + C.wn : "1px solid #FDE68A", borderRadius: 12, padding: "14px 16px", textAlign: "center", cursor: "pointer", opacity: hwFilter && hwFilter !== "progress" ? .5 : 1, transition: "all .15s" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.wn }}>{pHw}</div><div style={{ fontSize: 11, color: C.wn, marginTop: 2 }}>진행중</div>
      </div>
      <div onClick={() => setHwFilter(hwFilter === "notStarted" ? null : "notStarted")} style={{ background: C.db, border: hwFilter === "notStarted" ? "2px solid " + C.dn : "1px solid #FECACA", borderRadius: 12, padding: "14px 16px", textAlign: "center", cursor: "pointer", opacity: hwFilter && hwFilter !== "notStarted" ? .5 : 1, transition: "all .15s" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.dn }}>{nHw}</div><div style={{ fontSize: 11, color: C.dn, marginTop: 2 }}>미시작</div>
      </div>
    </div>
    {lessons.filter(l => (l.homework || []).length > 0).length === 0 ? (<div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}><div style={{ fontSize: 14 }}>숙제가 없습니다</div></div>) : (
      lessons.filter(l => { const hw = l.homework || []; if (hw.length === 0) return false; if (!hwFilter) return true; return hw.some(h => { const p = h.completion_pct || 0; if (hwFilter === "done") return p >= 100; if (hwFilter === "progress") return p > 0 && p < 100; return p === 0; }); }).map(l => {
        const lhwAll = l.homework || [], lhw = hwFilter ? lhwAll.filter(h => { const p = h.completion_pct || 0; if (hwFilter === "done") return p >= 100; if (hwFilter === "progress") return p > 0 && p < 100; return p === 0; }) : lhwAll, lDone = lhwAll.filter(h => (h.completion_pct || 0) >= 100).length;
        return (<div key={l.id} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: col.b }} /><span style={{ fontSize: 13, fontWeight: 600, color: C.tp }}>{l.date}</span><span style={{ fontSize: 12, color: C.ts }}>{l.topic || l.subject}</span></div>
            <span style={{ fontSize: 11, color: lDone === lhwAll.length ? C.su : C.tt, fontWeight: 500 }}>{lDone}/{lhwAll.length} 완료</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lhw.map(h => {
              const pct = h.completion_pct || 0, pc = pct >= 100 ? C.su : pct > 30 ? C.wn : pct > 0 ? "#EA580C" : C.dn, pb = pct >= 100 ? C.sb : pct > 30 ? C.wb : pct > 0 ? "#FFF7ED" : C.db, sl = pct >= 100 ? "완료" : pct > 0 ? "진행중" : "미시작";
              const barDrag = e => { if (isParent) return; e.preventDefault(); const bar = e.currentTarget; const calc = ev => { const r = bar.getBoundingClientRect(); const v = Math.max(0, Math.min(100, Math.round((ev.clientX - r.left) / r.width * 10) * 10)); onUpdateHw(h.id, "completion_pct", v); }; calc(e); const mv = ev => calc(ev); const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); }; window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); };
              return (<div key={h.id} style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <input value={h.title || ""} onChange={e => onUpdateHw(h.id, "title", e.target.value)} style={{ fontSize: 14, fontWeight: 600, color: C.tp, border: "none", outline: "none", background: "transparent", padding: 0, fontFamily: "inherit", minWidth: 0, flex: 1 }} placeholder="숙제" disabled={isParent} />
                  <span style={{ fontSize: 10, background: pb, color: pc, padding: "2px 8px", borderRadius: 5, fontWeight: 600 }}>{sl}</span>
                  {!isParent && <button onClick={() => onDeleteHw(h.id)} style={{ background: "none", border: "none", color: C.tt, cursor: "pointer", fontSize: 11, fontFamily: "inherit", marginLeft: 6, padding: "2px 4px", flexShrink: 0 }} title="삭제">✕</button>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div onMouseDown={barDrag} style={{ flex: 1, height: 10, background: C.bl, borderRadius: 5, cursor: isParent ? "default" : "pointer", position: "relative" }}>
                    <div style={{ height: "100%", width: pct + "%", minWidth: pct > 0 ? 12 : 0, background: pc, borderRadius: 5, transition: "width .15s", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", top: "50%", left: pct + "%", transform: "translate(-50%,-50%)", width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "3px solid " + pc, boxShadow: "0 1px 4px rgba(0,0,0,.15)", pointerEvents: "none", transition: "left .15s" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: pc, minWidth: 36, textAlign: "right" }}>{pct}%</span>
                </div>
                {h.note && <div style={{ fontSize: 12, color: C.ts, marginTop: 8, paddingTop: 8, borderTop: "1px solid " + C.bl }}>{h.note}</div>}
              </div>);
            })}
          </div>
        </div>);
      })
    )}
  </div>);
}
