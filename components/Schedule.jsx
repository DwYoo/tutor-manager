'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import LessonDetailModal from './student/LessonDetailModal';

const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
const DK=["월","화","수","목","금","토","일"];
const p2=n=>String(n).padStart(2,"0");
const fd=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const m2s=m=>`${p2(Math.floor(m/60))}:${p2(m%60)}`;
const s5=m=>Math.round(m/5)*5;
const sdy=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const gwd=base=>{const d=new Date(base),dy=d.getDay(),df=dy===0?-6:1-dy,m=new Date(d);m.setDate(d.getDate()+df);return Array.from({length:7},(_,i)=>{const t=new Date(m);t.setDate(m.getDate()+i);return t;});};
const ls={display:"block",fontSize:12,fontWeight:500,color:C.tt,marginBottom:6};
const is={width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.bd}`,fontSize:14,color:C.tp,background:C.sf,outline:"none",fontFamily:"inherit"};
const SHT=20,SMN=15;

const IcL=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcR=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IcP=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcX=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Add/Edit Modal ── */
function SchModal({les,students,onSave,onDel,onStopRec,onClose}){
  const ed=!!les?.id;
  const[f,sF]=useState({student_id:les?.student_id||students[0]?.id||"",date:les?.date||fd(new Date()),start_hour:les?.start_hour??14,start_min:les?.start_min??0,duration:les?.duration||90,subject:les?.subject||students[0]?.subject||"수학",topic:les?.topic||"",is_recurring:les?.is_recurring||false});
  const u=(k,v)=>sF(p=>({...p,[k]:v}));
  const go=()=>{const dw=new Date(f.date).getDay();onSave({...f,recurring_day:f.is_recurring?(dw===0?7:dw):null,id:les?.id||undefined});};
  return(<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.35)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.sf,borderRadius:16,width:"100%",maxWidth:440,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:C.tp}}>{ed?"수업 수정":"수업 추가"}</h2><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,display:"flex"}}><IcX/></button></div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={ls}>학생</label><select value={f.student_id} onChange={e=>{const st=students.find(x=>x.id===e.target.value);u("student_id",e.target.value);if(st)u("subject",st.subject);}} style={is}>{students.map(st=>(<option key={st.id} value={st.id}>{st.name} ({st.subject})</option>))}</select></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={ls}>날짜</label><input type="date" value={f.date} onChange={e=>u("date",e.target.value)} style={is}/></div>
          <div><label style={ls}>과목</label><input value={f.subject} onChange={e=>u("subject",e.target.value)} style={is}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div><label style={ls}>시작(시)</label><select value={f.start_hour} onChange={e=>u("start_hour",+e.target.value)} style={is}>{Array.from({length:24},(_,i)=>i).map(h=>(<option key={h} value={h}>{p2(h)}</option>))}</select></div>
          <div><label style={ls}>시작(분)</label><select value={f.start_min} onChange={e=>u("start_min",+e.target.value)} style={is}>{[0,5,10,15,20,25,30,35,40,45,50,55].map(m=>(<option key={m} value={m}>{p2(m)}</option>))}</select></div>
          <div><label style={ls}>수업시간(분)</label><input type="number" value={f.duration} onChange={e=>u("duration",+e.target.value)} style={is} step="5"/></div>
        </div>
        <div><label style={ls}>수업 주제</label><input value={f.topic} onChange={e=>u("topic",e.target.value)} style={is} placeholder="수업 주제..."/></div>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.ts,cursor:"pointer"}}><input type="checkbox" checked={f.is_recurring} onChange={e=>u("is_recurring",e.target.checked)}/>매주 반복</label>
      </div>
      <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:6}}>{ed&&!les.is_recurring&&<button onClick={()=>onDel(les.id)} style={{background:C.db,color:C.dn,border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>삭제</button>}{ed&&les.is_recurring&&<button onClick={()=>onStopRec(les.id)} style={{background:C.wb,color:"#92400E",border:"none",borderRadius:8,padding:"10px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>반복 해제</button>}{ed&&les.is_recurring&&<button onClick={()=>onDel(les.id)} style={{background:C.db,color:C.dn,border:"none",borderRadius:8,padding:"10px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>모든 반복 삭제</button>}</div>
        <div style={{display:"flex",gap:10}}><button onClick={onClose} style={{background:C.sfh,color:C.ts,border:`1px solid ${C.bd}`,borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>취소</button><button onClick={go} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{ed?"저장":"추가"}</button></div>
      </div>
    </div>
  </div>);
}

/* ── Main Schedule ── */
export default function Schedule({menuBtn}){
  const tog=menuBtn;
  const{user}=useAuth();
  const[cur,setCur]=useState(new Date());
  const[lessons,setLessons]=useState([]);
  const[students,setStudents]=useState([]);
  const[loading,setLoading]=useState(true);
  const[mOpen,setMO]=useState(false);const[eLes,setEL]=useState(null);const[dLes,setDL]=useState(null);
  const[stH,setStH]=useState(9);const[enH,setEnH]=useState(22);
  const[dcState,setDC]=useState(null);
  const gridRef=useRef(null);const dragRef=useRef(null);const movedRef=useRef(false);
  const today=new Date();const wk=gwd(cur);
  const hrs=Array.from({length:enH-stH},(_,i)=>i+stH);const tH=(enH-stH)*4*SHT;

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const[sRes,lRes]=await Promise.all([
      supabase.from('students').select('*').order('created_at'),
      supabase.from('lessons').select('*, homework(*), files(*)').order('date'),
    ]);
    setStudents(sRes.data||[]);
    setLessons(lRes.data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  const nW=d=>{const t=new Date(cur);t.setDate(t.getDate()+d*7);setCur(t);};
  const gL=date=>{const ds=fd(date),dw=date.getDay()===0?7:date.getDay();return lessons.filter(l=>{if(l.date===ds)return true;if(l.is_recurring&&l.recurring_day===dw)return date>=new Date(l.date);return false;});};
  const gCo=sid=>{const st=students.find(x=>x.id===sid);return SC[(st?.color_index||0)%8];};
  const getStu=sid=>students.find(x=>x.id===sid);

  /* CRUD */
  const save=async(f)=>{
    if(eLes?.id){
      // Update
      const{error}=await supabase.from('lessons').update({student_id:f.student_id,date:f.date,start_hour:f.start_hour,start_min:f.start_min,duration:f.duration,subject:f.subject,topic:f.topic,is_recurring:f.is_recurring,recurring_day:f.recurring_day}).eq('id',eLes.id);
      if(!error)setLessons(p=>p.map(l=>l.id===eLes.id?{...l,...f}:l));
    }else{
      // Insert
      const{data,error}=await supabase.from('lessons').insert({student_id:f.student_id,date:f.date,start_hour:f.start_hour,start_min:f.start_min,duration:f.duration,subject:f.subject,topic:f.topic,is_recurring:f.is_recurring,recurring_day:f.recurring_day,user_id:user.id}).select('*, homework(*), files(*)').single();
      if(!error&&data)setLessons(p=>[...p,data]);
    }
    setMO(false);setEL(null);
  };
  const del=async(id)=>{
    await supabase.from('lessons').delete().eq('id',id);
    setLessons(p=>p.filter(l=>l.id!==id));
    setMO(false);setEL(null);
  };
  const updDetail=async(id,data)=>{
    const u={};
    if(data.top!==undefined)u.topic=data.top;
    if(data.content!==undefined)u.content=data.content;
    if(data.feedback!==undefined)u.feedback=data.feedback;
    if(data.tMemo!==undefined)u.private_memo=data.tMemo;
    if(data.planShared!==undefined)u.plan_shared=data.planShared;
    if(data.planPrivate!==undefined)u.plan_private=data.planPrivate;
    if(Object.keys(u).length)await supabase.from('lessons').update(u).eq('id',id);
    setLessons(p=>p.map(l=>l.id===id?{...l,...u,homework:data.hw||l.homework,files:data.files||l.files}:l));
  };

  /* Drag helpers */
  const y2m=y=>stH*60+Math.round(y/SHT)*SMN;
  const x2d=(x,r)=>{const cw=(r.width-60)/7;return Math.max(0,Math.min(6,Math.floor((x-60)/cw)));};

  const onLD=(e,l)=>{
    if(e.button!==0){e.stopPropagation();return;}e.preventDefault();e.stopPropagation();
    const g=gridRef.current;if(!g)return;const r=g.getBoundingClientRect(),y=e.clientY-r.top+g.scrollTop;
    const cm=y2m(y),lm=l.start_hour*60+l.start_min,off=cm-lm;movedRef.current=false;
    dragRef.current={t:"m",id:l.id,off,r};
    const mv=ev=>{movedRef.current=true;const gy=ev.clientY-r.top+g.scrollTop,gx=ev.clientX-r.left;const raw=y2m(gy)-off,sn=s5(raw);const nh=Math.floor(sn/60),nm=sn%60;const di=x2d(gx,r),nd=fd(wk[di]),dw=wk[di].getDay();
      setLessons(p=>p.map(x=>x.id===l.id?{...x,start_hour:Math.max(0,Math.min(23,nh)),start_min:Math.max(0,nm),date:nd,recurring_day:x.is_recurring?(dw===0?7:dw):x.recurring_day}:x));};
    const up=async()=>{const did=movedRef.current;dragRef.current=null;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);
      if(!did){
        // Click → open detail
        const lesData=lessons.find(x=>x.id===l.id);if(lesData)setDL({...lesData,sh:lesData.start_hour,sm:lesData.start_min,dur:lesData.duration,sub:lesData.subject,top:lesData.topic,rep:lesData.is_recurring,tMemo:lesData.private_memo||"",hw:lesData.homework||[],files:lesData.files||[]});
      }else{
        // Save dragged position
        const moved=lessons.find(x=>x.id===l.id);
        if(moved)await supabase.from('lessons').update({start_hour:moved.start_hour,start_min:moved.start_min,date:moved.date,recurring_day:moved.recurring_day}).eq('id',l.id);
      }
    };
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };

  const onRC=(e,l)=>{e.preventDefault();e.stopPropagation();setEL(l);setMO(true);};
  const stopRec=async(id)=>{await supabase.from('lessons').update({is_recurring:false,recurring_day:null}).eq('id',id);setLessons(p=>p.map(l=>l.id===id?{...l,is_recurring:false,recurring_day:null}:l));setMO(false);setEL(null);};

  const onGD=(e,di)=>{
    if(dragRef.current)return;const g=gridRef.current;if(!g)return;const r=g.getBoundingClientRect(),hOff=e.currentTarget.getBoundingClientRect().top-r.top+g.scrollTop,y=e.clientY-r.top+g.scrollTop-hOff;
    const anc=s5(y2m(y));movedRef.current=false;dragRef.current={t:"c",di,anc,hOff};setDC({di,s:anc,e:anc+SMN});
    const mv=ev=>{movedRef.current=true;const dc=dragRef.current;if(!dc||dc.t!=="c")return;const gy=ev.clientY-r.top+g.scrollTop-dc.hOff,cm=s5(y2m(gy));setDC({di:dc.di,s:Math.min(dc.anc,cm),e:Math.max(dc.anc,cm)+SMN});};
    const up=()=>{const dc=dragRef.current;dragRef.current=null;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);
      setDC(prev=>{const st=prev||{s:dc?.anc||0,e:(dc?.anc||0)+SMN};if(st.e-st.s>=SMN){const h=Math.floor(st.s/60),m=st.s%60,dur=st.e-st.s;setEL({date:fd(wk[dc.di]),start_hour:h,start_min:m,duration:dur,subject:"수학",topic:"",is_recurring:false});setMO(true);}return null;});
    };
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);

  return(
    <div style={{minHeight:"100vh",background:C.bg}}>
      <style>{`.lb{cursor:grab;transition:box-shadow .12s,transform .1s;}.lb:hover{box-shadow:0 4px 12px rgba(0,0,0,.12);transform:scale(1.02);}.nb{transition:all .1s;cursor:pointer;border:none;background:none;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:8px;color:${C.ts};}.nb:hover{background:${C.sfh};}`}</style>

      {/* Header */}
      <div style={{background:C.sf,borderBottom:`1px solid ${C.bd}`,padding:"16px 24px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>{tog}<h2 style={{fontSize:18,fontWeight:700,color:C.tp}}>수업 일정</h2><span style={{fontSize:13,color:C.ts}}>{wk[0].getMonth()+1}/{wk[0].getDate()} ~ {wk[6].getMonth()+1}/{wk[6].getDate()}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button className="nb" onClick={()=>nW(-1)}><IcL/></button>
            <button onClick={()=>setCur(new Date())} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,fontSize:12,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>오늘</button>
            <button className="nb" onClick={()=>nW(1)}><IcR/></button>
            <button onClick={()=>{setEL(null);setMO(true);}} style={{display:"flex",alignItems:"center",gap:4,background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><IcP/> 수업 추가</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
          {students.slice(0,6).map(st=>{const c=SC[(st.color_index||0)%8];return(<div key={st.id} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 8px",borderRadius:6,background:c.bg,fontSize:11,fontWeight:500,color:c.t}}><div style={{width:7,height:7,borderRadius:"50%",background:c.b}}/>{st.name}</div>);})}
          <span style={{fontSize:10,color:C.tt,background:C.sfh,padding:"3px 8px",borderRadius:4}}>좌클릭: 상세 · 우클릭: 수정 · 드래그: 이동/생성</span>
          <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto",fontSize:11,color:C.ts}}>
            <select value={stH} onChange={e=>{const v=+e.target.value;setStH(v);if(v>=enH)setEnH(v+1);}} style={{padding:"2px 4px",borderRadius:4,border:`1px solid ${C.bd}`,fontSize:11,color:C.ts,background:C.sf,fontFamily:"inherit",cursor:"pointer"}}>{Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
            <span>~</span>
            <select value={enH} onChange={e=>setEnH(+e.target.value)} style={{padding:"2px 4px",borderRadius:4,border:`1px solid ${C.bd}`,fontSize:11,color:C.ts,background:C.sf,fontFamily:"inherit",cursor:"pointer"}}>{Array.from({length:24-stH},(_,i)=>i+stH+1).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
          </div>
        </div>
      </div>

      {/* Weekly grid */}
      <div ref={gridRef} style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 120px)",userSelect:"none"}}>
        <div style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",minWidth:800}}>
          {/* Header row */}
          <div style={{borderBottom:`1px solid ${C.bd}`,borderRight:`1px solid ${C.bl}`,background:C.sf,position:"sticky",top:0,zIndex:12}}/>
          {wk.map((d,i)=>{const it=sdy(d,today);return(
            <div key={i} style={{padding:"10px 8px",textAlign:"center",borderBottom:`1px solid ${C.bd}`,borderRight:i<6?`1px solid ${C.bl}`:"none",background:it?C.as:C.sf,position:"sticky",top:0,zIndex:12}}>
              <div style={{fontSize:12,color:it?C.ac:C.tt,fontWeight:500}}>{DK[i]}</div>
              <div style={{fontSize:18,fontWeight:700,marginTop:2,width:it?30:undefined,height:it?30:undefined,borderRadius:"50%",background:it?C.ac:"transparent",color:it?"#fff":C.tp,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{d.getDate()}</div>
            </div>);})}

          {/* Time column */}
          <div style={{borderRight:`1px solid ${C.bl}`}}>
            {hrs.map(h=>(<div key={h} style={{height:SHT*4,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"2px 8px 0 0",fontSize:11,color:C.tt,fontWeight:500,borderBottom:`1px solid ${C.bl}`}}>{p2(h)}:00</div>))}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"2px 8px 0 0",fontSize:11,color:C.tt,fontWeight:500}}>{p2(enH)}:00</div>
          </div>

          {/* Day columns */}
          {wk.map((date,di)=>{
            const dl=gL(date),it=sdy(date,today);
            return(
              <div key={di} style={{position:"relative",height:tH,borderRight:di<6?`1px solid ${C.bl}`:"none",background:it?"rgba(37,99,235,.015)":"transparent"}} onMouseDown={e=>onGD(e,di)}>
                {hrs.map((h,i)=>(<div key={h} style={{position:"absolute",top:i*SHT*4,left:0,right:0,height:SHT*4,borderBottom:`1px solid ${C.bl}`}}><div style={{position:"absolute",top:SHT*2-1,left:0,right:0,height:1,background:C.bl,opacity:.5}}/></div>))}
                {dcState&&dcState.di===di&&(
                  <div style={{position:"absolute",top:((dcState.s-stH*60)/SMN)*SHT,left:2,right:2,height:Math.max(((dcState.e-dcState.s)/SMN)*SHT,SHT),background:C.al,border:`2px dashed ${C.ac}`,borderRadius:8,opacity:.7,zIndex:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.ac,fontWeight:600,pointerEvents:"none",flexDirection:"column"}}><span>{m2s(dcState.s)} ~ {m2s(dcState.e)}</span><span>({dcState.e-dcState.s}분)</span></div>
                )}
                {dl.map(l=>{const co=gCo(l.student_id);const st=getStu(l.student_id);const tp=((l.start_hour*60+l.start_min)-stH*60)/SMN*SHT;const hp=Math.max(l.duration/SMN*SHT,SHT);
                  return(
                    <div key={l.id} className="lb" onMouseDown={e=>onLD(e,l)} onContextMenu={e=>onRC(e,l)} style={{position:"absolute",top:tp,left:3,right:3,height:hp-2,borderRadius:8,background:co.bg,borderLeft:`3px solid ${co.b}`,padding:"4px 8px",overflow:"hidden",zIndex:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11,fontWeight:600,color:co.t}}>{st?.name||""}</span>{(l.homework||[]).length>0&&<span style={{fontSize:9,background:co.t,color:co.bg,borderRadius:4,padding:"0 4px",fontWeight:600}}>{(l.homework||[]).length}</span>}</div>
                      {hp>32&&<div style={{fontSize:10,color:co.t,opacity:.7,marginTop:1}}>{l.topic||""}</div>}
                      {hp>48&&<div style={{fontSize:10,color:co.t,opacity:.6,marginTop:1}}>{p2(l.start_hour)}:{p2(l.start_min)} · {l.duration}분</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {mOpen&&<SchModal les={eLes} students={students} onSave={save} onDel={del} onStopRec={stopRec} onClose={()=>{setMO(false);setEL(null);}}/>}
      {dLes&&<LessonDetailModal les={dLes} student={getStu(dLes.student_id)} onUpdate={updDetail} onClose={()=>setDL(null)}/>}
    </div>
  );
}