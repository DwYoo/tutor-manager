import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { C, ls, is, CustomTooltip } from './constants';

export default function ScoresTab({ scores, isParent, onAdd, onDelete, onEditSave }) {
  const [showAddScore, setShowAddScore] = useState(false);
  const [scoreForm, setScoreForm] = useState({ date: "", score: "", label: "" });
  const [editScore, setEditScore] = useState(null);
  const [editScoreForm, setEditScoreForm] = useState({ date: "", score: "", label: "" });

  useEffect(() => { if (!editScore) return; const h = e => { if (e.key === "Escape") setEditScore(null); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [editScore]);

  const handleAdd = async () => {
    if (!scoreForm.score) return;
    await onAdd(scoreForm);
    setScoreForm({ date: "", score: "", label: "" }); setShowAddScore(false);
  };
  const openEditScore = (sc) => { setEditScore(sc); setEditScoreForm({ date: sc.date || "", score: String(sc.score), label: sc.label || "" }); };
  const handleEditSave = async () => {
    if (!editScore || !editScoreForm.score) return;
    await onEditSave(editScore.id, editScoreForm);
    setEditScore(null);
  };

  const sorted = [...scores].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const chartData = sorted.map(sc => { const d = sc.date ? new Date(sc.date) : null; return { ...sc, monthLabel: d ? `${d.getMonth() + 1}월` : sc.label }; });
  const recent = sorted.length ? sorted[sorted.length - 1].score : 0;
  const maxSc = sorted.length ? Math.max(...sorted.map(x => x.score)) : 0;
  const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yearScores = sorted.filter(sc => sc.date && new Date(sc.date) >= oneYearAgo);
  const avgSc = yearScores.length ? Math.round(yearScores.reduce((a, x) => a + x.score, 0) / yearScores.length) : 0;
  const trendDiff = sorted.length >= 2 ? sorted[sorted.length - 1].score - sorted[0].score : 0;
  const trendMonths = sorted.length >= 2 ? (() => { const f = new Date(sorted[0].date), l = new Date(sorted[sorted.length - 1].date); return Math.max(1, Math.round((l - f) / (1000 * 60 * 60 * 24 * 30))); })() : 0;
  const minY = sorted.length ? Math.max(0, Math.floor((Math.min(...sorted.map(x => x.score)) - 10) / 10) * 10) : 0;

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp, margin: 0 }}>성적 추이</h3>
        {sorted.length >= 2 && <span style={{ fontSize: 11, fontWeight: 600, color: trendDiff >= 0 ? C.su : C.dn, background: trendDiff >= 0 ? C.sb : C.db, padding: "3px 10px", borderRadius: 6 }}>{trendDiff >= 0 ? "+" : ""}{trendDiff}점 ({trendMonths}개월)</span>}
      </div>
      {!isParent && <button onClick={() => setShowAddScore(!showAddScore)} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>+ 성적 추가</button>}
    </div>
    {showAddScore && !isParent && (<div style={{ background: C.sf, border: "2px solid " + C.ac, borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div><label style={ls}>날짜</label><input type="date" value={scoreForm.date} onChange={e => setScoreForm(p => ({ ...p, date: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px", width: 140 }} /></div>
      <div><label style={ls}>시험명</label><input value={scoreForm.label} onChange={e => setScoreForm(p => ({ ...p, label: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px", width: 140 }} placeholder="예: 3월 모의고사" /></div>
      <div><label style={ls}>점수</label><input type="number" value={scoreForm.score} onChange={e => setScoreForm(p => ({ ...p, score: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px", width: 80 }} placeholder="100" /></div>
      <button onClick={handleAdd} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>저장</button>
    </div>)}
    {scores.length === 0 ? (<div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}><div style={{ fontSize: 14 }}>성적 데이터가 없습니다</div></div>) : (<>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.tt, marginBottom: 4 }}>최근 점수</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ac }}>{recent}점</div>
        </div>
        <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.tt, marginBottom: 4 }}>최고 점수</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.su }}>{maxSc}점</div>
        </div>
        <div style={{ background: "#F5F5F4", borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.tt, marginBottom: 4 }}>평균 점수 <span style={{ fontSize: 10, color: C.tt }}>(1년)</span></div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ts }}>{avgSc}점</div>
        </div>
      </div>
      <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.ac} stopOpacity={0.15} /><stop offset="95%" stopColor={C.ac} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.bl} vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: C.tt }} axisLine={false} tickLine={false} />
            <YAxis domain={[minY, 100]} tick={{ fontSize: 10, fill: C.tt }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="score" stroke={C.ac} fill="url(#scoreGrad)" strokeWidth={2.5} dot={{ r: 5, fill: C.ac, stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: C.tp, marginBottom: 12 }}>시험 기록</h4>
        {[...sorted].reverse().map((sc, i) => {
          const d = sc.date ? new Date(sc.date) : null;
          const mLabel = d ? `${d.getMonth() + 1}월` : "";
          const barColor = sc.score >= 85 ? C.su : sc.score >= 70 ? C.wn : C.dn;
          return (<div key={sc.id} style={{ display: "flex", alignItems: "center", padding: "10px 4px", cursor: isParent ? undefined : "pointer", borderRadius: 8, transition: "background .15s" }} onClick={() => { if (!isParent) openEditScore(sc); }} onMouseEnter={e => { if (!isParent) e.currentTarget.style.background = C.sfh; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 80, flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.tp }}>{i === 0 ? "최근" : (sc.label || `${sorted.length - i}차`)}</span>
              <span style={{ fontSize: 12, color: C.tt }}>{mLabel}</span>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ width: 160, height: 4, background: C.bl, borderRadius: 2, overflow: "hidden", flexShrink: 0, marginRight: 12 }}>
              <div style={{ height: "100%", width: `${sc.score}%`, background: barColor, borderRadius: 2 }} />
            </div>
            <div style={{ minWidth: 36, textAlign: "right", fontSize: 16, fontWeight: 700, color: barColor }}>{sc.score}</div>
          </div>);
        })}
      </div>
    </>)}
    {editScore && !isParent && (<div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.35)" }} onClick={() => setEditScore(null)}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.sf, borderRadius: 16, width: "100%", maxWidth: 380, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, color: C.tp }}>성적 수정</h2><button onClick={() => setEditScore(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.tt, fontSize: 18 }}>✕</button></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={ls}>날짜</label><input type="date" value={editScoreForm.date} onChange={e => setEditScoreForm(p => ({ ...p, date: e.target.value }))} style={is} /></div>
          <div><label style={ls}>시험명</label><input value={editScoreForm.label} onChange={e => setEditScoreForm(p => ({ ...p, label: e.target.value }))} style={is} placeholder="예: 3월 모의고사" /></div>
          <div><label style={ls}>점수</label><input type="number" value={editScoreForm.score} onChange={e => setEditScoreForm(p => ({ ...p, score: e.target.value }))} style={is} placeholder="100" /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={() => { if (!confirm("이 성적을 삭제할까요?")) return; onDelete(editScore.id); setEditScore(null); }} style={{ background: C.db, color: C.dn, border: "1px solid #FECACA", borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginRight: "auto" }}>삭제</button>
          <button onClick={() => setEditScore(null)} style={{ background: C.sfh, color: C.ts, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
          <button onClick={handleEditSave} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>저장</button>
        </div>
      </div>
    </div>)}
  </div>);
}
