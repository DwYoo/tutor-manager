import { useState } from 'react';
import { C, ls, is } from './constants';

export default function ReportTab({ reports, isParent, onAdd, onDelete }) {
  const [showNew, setShowNew] = useState(false);
  const [nT, setNT] = useState("");
  const [nB, setNB] = useState("");
  const [nS, setNS] = useState(false);

  const handleAdd = async () => {
    if (!nT.trim()) return;
    await onAdd(nT, nB, nS);
    setNT(""); setNB(""); setNS(false); setShowNew(false);
  };

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>수업 기록</h3>
      {!isParent && <button onClick={() => setShowNew(!showNew)} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>+ 새 기록</button>}
    </div>
    {showNew && !isParent && (<div style={{ background: C.sf, border: "2px solid " + C.ac, borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ marginBottom: 10 }}><label style={ls}>제목</label><input value={nT} onChange={e => setNT(e.target.value)} style={is} placeholder="예: 3월 2주차 학습 정리" /></div>
      <div style={{ marginBottom: 10 }}><label style={ls}>내용</label><textarea value={nB} onChange={e => setNB(e.target.value)} style={{ ...is, height: 120, resize: "vertical" }} placeholder="수업 내용, 학생 상태, 다음 계획 등을 자유롭게 기록하세요..." /></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.ts, cursor: "pointer" }}><input type="checkbox" checked={nS} onChange={e => setNS(e.target.checked)} />학부모 공유</label>
        <div style={{ display: "flex", gap: 8 }}><button onClick={() => setShowNew(false)} style={{ background: C.sfh, color: C.ts, border: "1px solid " + C.bd, borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>취소</button><button onClick={handleAdd} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>저장</button></div>
      </div>
    </div>)}
    {reports.length === 0 ? (<div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}><div style={{ fontSize: 14 }}>기록이 없습니다</div><div style={{ fontSize: 12, marginTop: 4, color: C.tt }}>수업 후 학생의 진행 상황을 기록해보세요</div></div>) : (
      <div style={{ position: "relative", paddingLeft: 20 }}>
        <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 2, background: C.bl }} />
        {reports.filter(r => isParent ? r.is_shared : true).map((r, i) => (<div key={r.id} style={{ position: "relative", marginBottom: 16 }}>
          <div style={{ position: "absolute", left: -20 + 1, top: 6, width: 10, height: 10, borderRadius: "50%", background: i === 0 ? C.ac : C.bd }} />
          <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 18, borderLeft: i === 0 ? "3px solid " + C.ac : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>{r.title}</span>{r.is_shared ? <span style={{ background: C.as, color: C.ac, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600 }}>공유됨</span> : <span style={{ background: C.sfh, color: C.tt, padding: "2px 8px", borderRadius: 5, fontSize: 10 }}>비공개</span>}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: C.tt }}>{r.date}</span>
                {!isParent && <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", color: C.tt, cursor: "pointer", fontSize: 11, fontFamily: "inherit", padding: "2px 4px" }} title="삭제">✕</button>}
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.ts, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{r.body}</div>
          </div>
        </div>))}
      </div>
    )}
  </div>);
}
