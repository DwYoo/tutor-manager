'use client';
import { useState, useEffect, useRef } from 'react';
import { C, SC } from '@/components/Colors';
import { p2, m2s, bk, insertViaExec } from '@/lib/utils';
const ls={display:"block",fontSize:12,fontWeight:500,color:C.tt,marginBottom:6};
const is={width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.bd}`,fontSize:14,color:C.tp,background:C.sf,outline:"none",fontFamily:"inherit"};

const IcX=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcLock=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;

export default function LessonDetailModal({ les, student, textbooks = [], onUpdate, onClose }) {
  const col = SC[(student?.color_index ?? 0) % 8];
  const sh = les.sh ?? les.start_hour ?? 0, sm = les.sm ?? les.start_min ?? 0, dur = les.dur ?? les.duration ?? 0;
  const sub = les.sub ?? les.subject ?? "", rep = les.rep ?? les.is_recurring ?? false;
  const em = sh * 60 + sm + dur;
  const [tab, setTab] = useState("plan");
  const contentRef = useRef(null);
  const [topic, setTopic] = useState(les.top ?? les.topic ?? "");
  const [content, setContent] = useState(les.content || "");
  const [feedback, setFeedback] = useState(les.feedback || "");
  const [tMemo, setTMemo] = useState(les.tMemo ?? les.private_memo ?? "");
  const [hw, setHw] = useState((les.hw ?? les.homework ?? []).map((h, i) => h.id ? h : { ...h, id: h.id || Date.now() + i, note: h.note || "" }));
  const [planShared, setPlanShared] = useState(les.planShared ?? les.plan_shared ?? "");
  const [planPrivate, setPlanPrivate] = useState(les.planPrivate ?? les.plan_private ?? "");
  const [files, setFiles] = useState(les.files || []);
  const [newFileName, setNewFileName] = useState("");
  const [newHw, setNewHw] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const markDirty = () => setDirty(true);
  const [dragIdx, setDragIdx] = useState(null);
  const [hwDropIdx, setHwDropIdx] = useState(null);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);

  const addHw = () => { if (!newHw.trim()) return; setHw(p => [...p, { id: Date.now(), title: newHw, pct: 0, note: "" }]); setNewHw(""); markDirty(); };
  const delHw = id => { setHw(p => p.filter(h => h.id !== id)); markDirty(); };
  const updHw = (id, k, v) => { setHw(p => p.map(h => h.id === id ? { ...h, [k]: v } : h)); markDirty(); };
  const addFile = () => { if (!newFileName.trim()) return; setFiles(p => [...p, { id: Date.now(), name: newFileName, type: newFileName.split(".").pop() || "file" }]); setNewFileName(""); markDirty(); };
  const delFile = id => { setFiles(p => p.filter(f => f.id !== id)); markDirty(); };
  const doSave = async () => { if (saving) return; setSaving(true); try { await onUpdate(les.id, { top: topic, content, feedback, tMemo, hw, planPrivate, planShared, files }); setDirty(false); onClose(); } catch(e) { /* error handled by parent toast */ } finally { setSaving(false); } };

  const tabs = [{ id: "plan", l: "계획" }, { id: "content", l: "수업 내용" }, { id: "feedback", l: "피드백" }, { id: "hw", l: "숙제" }, { id: "files", l: "자료" }];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.35)" }} onClick={onClose}>
      <style>{`@media(max-width:640px){.ldm-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;} .ldm-tabs button{white-space:nowrap;flex-shrink:0;} .ldm-footer{position:sticky;bottom:0;background:white;padding:16px;border-top:1px solid #E7E5E4;} .ldm-textarea{min-height:120px!important;}}`}</style>
      <div onClick={e => e.stopPropagation()} className="detail-modal" style={{ background: C.sf, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.15)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "24px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: col.b }} />
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.tp }}>{student?.name}</h2>
                <span style={{ background: col.bg, color: col.t, padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{sub}</span>
              </div>
              <input value={topic} onChange={e => { setTopic(e.target.value); markDirty(); }} style={{ border: "none", outline: "none", fontSize: 14, fontWeight: 500, color: C.tp, background: "transparent", padding: "2px 0", width: "100%", borderBottom: "1px dashed " + C.bd, fontFamily: "inherit" }} placeholder="수업 주제 입력..." />
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.tt, display: "flex", marginLeft: 12, flexShrink: 0 }}><IcX /></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: C.ts, marginBottom: 16 }}>
            <span>{m2s(sh * 60 + sm)} ~ {m2s(em)} ({dur}분)</span>
            {rep && <span style={{ color: C.ac, fontSize: 12 }}>🔁 반복</span>}
          </div>
          {/* Tabs */}
          <div className="ldm-tabs" style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.bd}` }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", fontSize: 12, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? C.ac : C.tt, borderTop: "none", borderLeft: "none", borderRight: "none", borderBottom: tab === t.id ? `2px solid ${C.ac}` : "2px solid transparent", background: "none", cursor: "pointer", fontFamily: "inherit", marginBottom: -1 }}>
                {t.l}
                {t.id === "hw" && hw.length > 0 && <span style={{ marginLeft: 4, background: C.ac, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{hw.length}</span>}
                {t.id === "files" && files.length > 0 && <span style={{ marginLeft: 4, background: C.tt, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{files.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {tab === "content" && (
            <div>
              {textbooks.length>0&&(<div style={{marginBottom:12}}>
                <label style={ls}>교재</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {textbooks.map(tb=>(<button key={tb.id} onClick={()=>{const ta=contentRef.current;if(!ta)return;const pos=ta.selectionStart||content.length;const txt=`[${tb.title}] `;insertViaExec(ta,txt,pos,pos);setContent(ta.value);markDirty();}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid "+C.bd,background:C.sf,color:C.ts,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>📚 {tb.title}</button>))}
                </div>
              </div>)}
              <label style={ls}>수업 내용</label>
              <textarea ref={contentRef} className="ldm-textarea" value={content} onChange={e => { setContent(e.target.value); markDirty(); }} onKeyDown={e => bk(e, content, setContent, markDirty)} style={{ ...is, minHeight: 200, resize: "vertical", lineHeight: 1.6 }} placeholder="오늘 수업에서 다룬 내용..." />
            </div>
          )}

          {tab === "feedback" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={ls}>피드백 <span style={{ color: C.ac, fontWeight: 600 }}>(공유용)</span></label>
                <textarea className="ldm-textarea" value={feedback} onChange={e => { setFeedback(e.target.value); markDirty(); }} onKeyDown={e => bk(e, feedback, setFeedback, markDirty)} style={{ ...is, minHeight: 120, resize: "vertical", lineHeight: 1.6 }} placeholder="학생 이해도, 태도, 개선점..." />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <IcLock />
                  <label style={{ ...ls, marginBottom: 0 }}>선생님 메모 <span style={{ color: C.dn, fontWeight: 600 }}>(비공개)</span></label>
                </div>
                <textarea className="ldm-textarea" value={tMemo} onChange={e => { setTMemo(e.target.value); markDirty(); }} onKeyDown={e => bk(e, tMemo, setTMemo, markDirty)} style={{ ...is, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} placeholder="다음 수업 준비, 학생 특이사항..." />
              </div>
            </div>
          )}

          {tab === "hw" && (
            <div>
              {hw.length > 0 && (() => {
                const avgPct = Math.round(hw.reduce((s, h) => s + (h.completion_pct || 0), 0) / hw.length);
                const apc = avgPct >= 100 ? C.su : avgPct > 30 ? C.wn : avgPct > 0 ? "#EA580C" : C.dn;
                const apb = avgPct >= 100 ? C.sb : avgPct > 30 ? C.wb : avgPct > 0 ? "#FFF7ED" : C.db;
                return (
                  <div style={{ background: apb, border: "1px solid " + apc + "30", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: apc }}>평균 완료율</span>
                      <div style={{ width: 80, height: 6, borderRadius: 3, background: "rgba(0,0,0,.06)", overflow: "hidden" }}>
                        <div style={{ width: avgPct + "%", height: "100%", borderRadius: 3, background: apc, transition: "width .15s" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: apc }}>{avgPct}%</span>
                  </div>
                );
              })()}
              {textbooks.length>0&&(<div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:C.tt,alignSelf:"center",marginRight:4}}>교재:</span>
                {textbooks.map(tb=>(<button key={tb.id} onClick={()=>setNewHw(p=>(p?p+" ":"")+tb.title+" ")} style={{padding:"3px 8px",borderRadius:5,border:"1px solid "+C.bd,background:C.sf,fontSize:10,color:C.ts,cursor:"pointer",fontFamily:"inherit"}}>📚 {tb.title}</button>))}
              </div>)}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input value={newHw} onChange={e => setNewHw(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addHw(); }} style={{ ...is, flex: 1 }} placeholder="숙제 제목 입력 후 Enter..." />
                <button onClick={addHw} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>추가</button>
              </div>
              {hw.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.tt }}><div style={{ fontSize: 14 }}>아직 숙제가 없습니다</div></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {hw.map((h, i) => {
                    const pv=(h.completion_pct||0);const pc = pv >= 100 ? C.su : pv > 30 ? C.wn : pv > 0 ? "#EA580C" : C.dn;
                    const pbg = pv >= 100 ? C.sb : pv > 30 ? C.wb : pv > 0 ? "#FFF7ED" : C.db;
                    const isDrag=dragIdx===i,noHwD=hwDropIdx!=null&&(hwDropIdx===dragIdx||hwDropIdx===dragIdx+1);
                    const showT=dragIdx!=null&&!isDrag&&hwDropIdx===i&&!noHwD;
                    const showB=dragIdx!=null&&!isDrag&&i===hw.length-1&&hwDropIdx===hw.length&&!noHwD;
                    return (
                      <div key={h.id} draggable onDragStart={()=>setDragIdx(i)} onDragOver={e=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect();const ni=e.clientY<r.top+r.height/2?i:i+1;if(ni!==hwDropIdx)setHwDropIdx(ni);}} onDrop={()=>{const fi=dragIdx,di=hwDropIdx;setDragIdx(null);setHwDropIdx(null);if(fi==null||di==null)return;const n=[...hw];const[m]=n.splice(fi,1);const ai=di>fi?di-1:di;n.splice(ai,0,m);if(!n.every((x,j)=>x.id===hw[j].id)){setHw(n);markDirty();}}} onDragEnd={()=>{setDragIdx(null);setHwDropIdx(null);}} style={{ position:"relative", border: "1px solid " + C.bd, borderRadius: 12, padding: 16, opacity: isDrag?.4:1, transition:"opacity .15s", cursor:"grab" }}>
                        {showT&&<div style={{position:"absolute",left:0,right:0,top:-8,height:3,borderRadius:2,background:C.ac,boxShadow:`0 0 8px ${C.ac}`,zIndex:5}}/>}
                        {showB&&<div style={{position:"absolute",left:0,right:0,bottom:-8,height:3,borderRadius:2,background:C.ac,boxShadow:`0 0 8px ${C.ac}`,zIndex:5}}/>}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ fontSize: 14, color: C.tt, cursor: "grab", flexShrink: 0, userSelect: "none", minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>⠿</span>
                          <span style={{ fontSize: 12, color: C.tt, fontWeight: 600, background: C.sfh, borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>#{i + 1}</span>
                          <input value={h.title||""} onChange={e => { updHw(h.id, "title", e.target.value); }} style={{ fontSize: 14, fontWeight: 600, color: C.tp, border: "none", outline: "none", background: "transparent", padding: 0, fontFamily: "inherit", minWidth: 0, flex: 1 }} placeholder="숙제 제목..." />
                          <button onClick={() => delHw(h.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.tt, padding: 4, flexShrink: 0 }}>✕</button>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: C.tt }}>완성도</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: pc, background: pbg, padding: "2px 8px", borderRadius: 6 }}>{(h.completion_pct||0)}%</span>
                          </div>
                          <div onMouseDown={e=>{e.preventDefault();const bar=e.currentTarget;const calc=ev=>{const r=bar.getBoundingClientRect();const v=Math.max(0,Math.min(100,Math.round((ev.clientX-r.left)/r.width*20)*5));updHw(h.id,"completion_pct",v);};calc(e);const mv=ev=>calc(ev);const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);}} style={{ width: "100%", height: 10, background: C.bl, borderRadius: 5, cursor: "pointer", position: "relative" }}>
                            <div style={{ height: "100%", width: (h.completion_pct||0)+"%", background: pc, borderRadius: 5, transition: "width .15s", pointerEvents: "none" }}/>
                            <div style={{ position: "absolute", top: "50%", left: (h.completion_pct||0)+"%", transform: "translate(-50%,-50%)", width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "3px solid "+pc, boxShadow: "0 1px 4px rgba(0,0,0,.15)", pointerEvents: "none", transition: "left .15s" }}/>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: C.tt, display: "block", marginBottom: 4 }}>메모</label>
                          <input value={h.note || ""} onChange={e => updHw(h.id, "note", e.target.value)} style={{ ...is, fontSize: 13, padding: "7px 10px" }} placeholder="숙제 관련 메모..." />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "files" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input value={newFileName} onChange={e => setNewFileName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addFile(); }} style={{ ...is, flex: 1 }} placeholder="파일명 입력 (예: 연습문제.pdf)" />
                <button onClick={addFile} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>추가</button>
              </div>
              {files.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.tt }}><div style={{ fontSize: 14 }}>등록된 자료가 없습니다</div></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map(f => {
                    const icon = (f.file_type||f.type) === "pdf" ? "📄" : (f.file_type||f.type) === "img" ? "🖼️" : "📎";
                    return (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1px solid " + C.bd, borderRadius: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: C.tp }}>{(f.file_name||f.name)}</span>
                          <span style={{ fontSize: 10, color: C.tt, background: C.sfh, padding: "1px 6px", borderRadius: 4 }}>{(f.file_type||f.type)}</span>
                        </div>
                        <button onClick={() => delFile(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.tt, fontSize: 12 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 11, color: C.tt }}>* 자료실에 자동 반영됩니다.</div>
            </div>
          )}

          {tab === "plan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ ...ls, color: C.ac, fontWeight: 600 }}>수업 계획 <span style={{ fontWeight: 400 }}>(공유용)</span></label>
                <textarea className="ldm-textarea" value={planShared} onChange={e => { setPlanShared(e.target.value); markDirty(); }} onKeyDown={e => bk(e, planShared, setPlanShared, markDirty)} style={{ ...is, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} placeholder="수업 목표, 진도, 준비물..." />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <IcLock />
                  <label style={{ ...ls, marginBottom: 0 }}>선생님 전용 <span style={{ color: C.dn, fontWeight: 600 }}>(비공개)</span></label>
                </div>
                <textarea className="ldm-textarea" value={planPrivate} onChange={e => { setPlanPrivate(e.target.value); markDirty(); }} onKeyDown={e => bk(e, planPrivate, setPlanPrivate, markDirty)} style={{ ...is, minHeight: 100, resize: "vertical", lineHeight: 1.6 }} placeholder="수업 전략, 난이도 조절..." />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ldm-footer" style={{ padding: "16px 24px", borderTop: `1px solid ${C.bd}`, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          {dirty && <span style={{ fontSize: 12, color: C.wn, display: "flex", alignItems: "center", gap: 4, marginRight: "auto" }}>● 변경사항 있음</span>}
          <button onClick={onClose} style={{ background: C.sfh, color: C.ts, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>닫기</button>
          <button disabled={saving} onClick={doSave} style={{ background: saving ? "#999" : dirty ? C.ac : C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  );
}