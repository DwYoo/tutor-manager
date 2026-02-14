import { useState } from 'react';
import { C, bk, ls, is } from './constants';

export default function PlanTab({ student, isParent, planFields, planComments, onSavePlan, onAddReport, onUpdateComment, onDeleteReport }) {
  const [planEditing, setPlanEditing] = useState(false);
  const [planStrategy, setPlanStrategy] = useState(planFields.strategy || "");
  const [planStrength, setPlanStrength] = useState(planFields.strength || "");
  const [planWeakness, setPlanWeakness] = useState(planFields.weakness || "");
  const [planOpportunity, setPlanOpportunity] = useState(planFields.opportunity || "");
  const [planThreat, setPlanThreat] = useState(planFields.threat || "");
  const [planSaving, setPlanSaving] = useState(false);
  const [showPlanReport, setShowPlanReport] = useState(false);
  const [planRpTitle, setPlanRpTitle] = useState("");
  const [planRpBody, setPlanRpBody] = useState("");
  const [planRpShared, setPlanRpShared] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentTitle, setEditCommentTitle] = useState("");
  const [editCommentText, setEditCommentText] = useState("");
  const [editCommentShared, setEditCommentShared] = useState(false);

  const savePlanFields = async () => {
    setPlanSaving(true);
    await onSavePlan({ strategy: planStrategy, strength: planStrength, weakness: planWeakness, opportunity: planOpportunity, threat: planThreat });
    setPlanEditing(false);
    setPlanSaving(false);
  };
  const addPlanReport = async () => {
    if (!planRpTitle.trim()) { alert("제목을 입력해주세요."); return; }
    await onAddReport(planRpTitle, planRpBody, planRpShared);
    setPlanRpTitle(""); setPlanRpBody(""); setPlanRpShared(false); setShowPlanReport(false);
  };
  const handleUpdateComment = async (id) => {
    if (!editCommentTitle.trim()) { alert("제목을 입력해주세요."); return; }
    await onUpdateComment(id, editCommentTitle, editCommentText, editCommentShared);
    setEditingComment(null); setEditCommentText(""); setEditCommentTitle("");
  };

  const autoGrow = el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } };

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>학습 오버뷰</h3>
      {!isParent && !planEditing && <button onClick={() => setPlanEditing(true)} style={{ background: C.sfh, color: C.ts, border: "1px solid " + C.bd, borderRadius: 8, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>수정</button>}
    </div>

    {planEditing ? (<>
      <div style={{ background: C.sf, border: "2px solid " + C.ac, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ac, marginBottom: 10 }}>학업 전략</div>
        <textarea value={planStrategy} onChange={e => { setPlanStrategy(e.target.value); autoGrow(e.target); }} onKeyDown={e => bk(e, planStrategy, setPlanStrategy)} ref={autoGrow} style={{ ...is, minHeight: 80, resize: "none", fontSize: 13, lineHeight: 1.7, overflow: "hidden" }} placeholder="학생의 전반적인 학습 방향과 전략을 작성하세요..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: C.sb, border: "1px solid #BBF7D0", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.su, marginBottom: 8 }}>강점 (S)</div>
          <textarea value={planStrength} onChange={e => { setPlanStrength(e.target.value); autoGrow(e.target); }} onKeyDown={e => bk(e, planStrength, setPlanStrength)} ref={autoGrow} style={{ ...is, minHeight: 60, resize: "none", fontSize: 12, background: "transparent", border: "1px solid #BBF7D0", overflow: "hidden" }} placeholder="강점 기록..." />
        </div>
        <div style={{ background: C.db, border: "1px solid #FECACA", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.dn, marginBottom: 8 }}>약점 (W)</div>
          <textarea value={planWeakness} onChange={e => { setPlanWeakness(e.target.value); autoGrow(e.target); }} onKeyDown={e => bk(e, planWeakness, setPlanWeakness)} ref={autoGrow} style={{ ...is, minHeight: 60, resize: "none", fontSize: 12, background: "transparent", border: "1px solid #FECACA", overflow: "hidden" }} placeholder="약점 기록..." />
        </div>
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ac, marginBottom: 8 }}>기회 (O)</div>
          <textarea value={planOpportunity} onChange={e => { setPlanOpportunity(e.target.value); autoGrow(e.target); }} onKeyDown={e => bk(e, planOpportunity, setPlanOpportunity)} ref={autoGrow} style={{ ...is, minHeight: 60, resize: "none", fontSize: 12, background: "transparent", border: "1px solid #BFDBFE", overflow: "hidden" }} placeholder="기회 요인 기록..." />
        </div>
        <div style={{ background: C.wb, border: "1px solid #FDE68A", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#B45309", marginBottom: 8 }}>위협 (T)</div>
          <textarea value={planThreat} onChange={e => { setPlanThreat(e.target.value); autoGrow(e.target); }} onKeyDown={e => bk(e, planThreat, setPlanThreat)} ref={autoGrow} style={{ ...is, minHeight: 60, resize: "none", fontSize: 12, background: "transparent", border: "1px solid #FDE68A", overflow: "hidden" }} placeholder="위협 요인 기록..." />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 20 }}>
        <button onClick={() => setPlanEditing(false)} style={{ background: C.sfh, color: C.ts, border: "1px solid " + C.bd, borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
        <button onClick={savePlanFields} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: planSaving ? .6 : 1 }}>{planSaving ? "저장 중..." : "저장"}</button>
      </div>
    </>) : (<>
      <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ac, marginBottom: 10 }}>학업 전략</div>
        <div style={{ fontSize: 13, color: planStrategy ? C.tp : C.tt, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{planStrategy || "아직 작성된 전략이 없습니다"}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: C.sb, border: "1px solid #BBF7D0", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.su, marginBottom: 8 }}>강점 (S)</div>
          <div style={{ fontSize: 12, color: planStrength ? C.tp : C.tt, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{planStrength || "미작성"}</div>
        </div>
        <div style={{ background: C.db, border: "1px solid #FECACA", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.dn, marginBottom: 8 }}>약점 (W)</div>
          <div style={{ fontSize: 12, color: planWeakness ? C.tp : C.tt, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{planWeakness || "미작성"}</div>
        </div>
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ac, marginBottom: 8 }}>기회 (O)</div>
          <div style={{ fontSize: 12, color: planOpportunity ? C.tp : C.tt, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{planOpportunity || "미작성"}</div>
        </div>
        <div style={{ background: C.wb, border: "1px solid #FDE68A", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#B45309", marginBottom: 8 }}>위협 (T)</div>
          <div style={{ fontSize: 12, color: planThreat ? C.tp : C.tt, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 20 }}>{planThreat || "미작성"}</div>
        </div>
      </div>
    </>)}

    {/* 학습 리포트 */}
    <div style={{ borderTop: "1px solid " + C.bd, paddingTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>학습 리포트</div>
        {!isParent && <button onClick={() => setShowPlanReport(!showPlanReport)} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>+ 새 리포트</button>}
      </div>
      {showPlanReport && !isParent && (<div style={{ background: C.sf, border: "2px solid " + C.ac, borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 10 }}><label style={ls}>제목</label><input value={planRpTitle} onChange={e => setPlanRpTitle(e.target.value)} style={is} placeholder="예: 2월 1~2주차 학습 리포트" /></div>
        <div style={{ marginBottom: 10 }}><label style={ls}>내용</label><textarea value={planRpBody} onChange={e => setPlanRpBody(e.target.value)} style={{ ...is, minHeight: 120, resize: "vertical" }} placeholder="학습 진행 상황, 피드백, 계획 변경 등을 기록하세요..." /></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.ts, cursor: "pointer" }}><input type="checkbox" checked={planRpShared} onChange={e => setPlanRpShared(e.target.checked)} />학부모 공유</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowPlanReport(false)} style={{ background: C.sfh, color: C.ts, border: "1px solid " + C.bd, borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
            <button onClick={addPlanReport} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>저장</button>
          </div>
        </div>
      </div>)}

      {planComments.length === 0 ? (<div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}><div style={{ fontSize: 14 }}>아직 학습 리포트가 없습니다</div><div style={{ fontSize: 12, marginTop: 4, color: C.tt }}>학생의 학습 진행 상황을 기록해보세요</div></div>) : (
        <div style={{ position: "relative", paddingLeft: 20 }}>
          <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 2, background: C.bl }} />
          {planComments.map((c, i) => (<div key={c.id} style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ position: "absolute", left: -20 + 1, top: 6, width: 10, height: 10, borderRadius: "50%", background: i === 0 ? C.ac : C.bd }} />
            <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 18, borderLeft: i === 0 ? "3px solid " + C.ac : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.tp }}>{c.title || "리포트"}</span>
                  {c.is_shared ? <span style={{ background: C.as, color: C.ac, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600 }}>공유됨</span> : <span style={{ background: C.sfh, color: C.tt, padding: "2px 8px", borderRadius: 5, fontSize: 10 }}>비공개</span>}
                  {!isParent && editingComment !== c.id && <button onClick={() => { setEditingComment(c.id); setEditCommentTitle(c.title || ""); setEditCommentText(c.body || ""); setEditCommentShared(!!c.is_shared); }} style={{ background: "none", border: "none", fontSize: 10, color: C.ac, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>수정</button>}
                  {!isParent && editingComment !== c.id && <button onClick={() => onDeleteReport(c.id)} style={{ background: "none", border: "none", fontSize: 10, color: C.tt, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>삭제</button>}
                </div>
                <span style={{ fontSize: 12, color: C.tt, flexShrink: 0 }}>{c.date}</span>
              </div>
              {editingComment === c.id ? (<div>
                <div style={{ marginBottom: 8 }}><label style={{ ...ls, marginBottom: 4 }}>제목</label><input value={editCommentTitle} onChange={e => setEditCommentTitle(e.target.value)} style={{ ...is, fontSize: 12 }} placeholder="리포트 제목" /></div>
                <div style={{ marginBottom: 8 }}><label style={{ ...ls, marginBottom: 4 }}>내용</label><textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)} style={{ ...is, minHeight: 80, resize: "vertical", fontSize: 12 }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.ts, cursor: "pointer" }}><input type="checkbox" checked={editCommentShared} onChange={e => setEditCommentShared(e.target.checked)} />학부모 공유</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditingComment(null)} style={{ background: C.sfh, color: C.ts, border: "1px solid " + C.bd, borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
                    <button onClick={() => handleUpdateComment(c.id)} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>저장</button>
                  </div>
                </div>
              </div>) : (<div style={{ fontSize: 13, color: C.ts, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{c.body}</div>)}
            </div>
          </div>))}
        </div>
      )}
    </div>
  </div>);
}
