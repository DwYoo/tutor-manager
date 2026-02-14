'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import LessonDetailModal from './student/LessonDetailModal';

const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
const LSTATUS={scheduled:{l:"예정",c:"#78716C",bg:"#F5F5F4"},completed:{l:"완료",c:"#16A34A",bg:"#F0FDF4"},cancelled:{l:"취소",c:"#DC2626",bg:"#FEF2F2"},makeup:{l:"보강",c:"#2563EB",bg:"#DBEAFE"}};
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
const IcT=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e25555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

/* ── Add/Edit Modal ── */
function SchModal({les,students,onSave,onDel,onDelSingle,onDelFuture,onClose,checkConflict}){
  const ed=!!les?.id;
  const isCopy=les?._status==='makeup';
  const[f,sF]=useState({student_id:les?.student_id||students[0]?.id||"",date:les?.date||fd(new Date()),start_hour:les?.start_hour??14,start_min:les?.start_min??0,duration:les?.duration||90,subject:les?.subject||students[0]?.subject||"수학",topic:les?.topic||"",is_recurring:les?.is_recurring||false});
  const u=(k,v)=>sF(p=>({...p,[k]:v}));
  const go=()=>{const dw=new Date(f.date).getDay();onSave({...f,recurring_day:f.is_recurring?(dw===0?7:dw):null,id:les?.id||undefined});};
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  const conflict=checkConflict?.(f.date,f.start_hour,f.start_min,f.duration,les?.id);
  const conflictStu=conflict?students.find(s=>s.id===conflict.student_id):null;
  return(<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.35)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.sf,borderRadius:16,width:"100%",maxWidth:440,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:C.tp}}>{ed?"수업 수정":isCopy?"보강 추가":"수업 추가"}</h2><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,display:"flex"}}><IcX/></button></div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={ls}>학생</label><select value={f.student_id} onChange={e=>{const st=students.find(x=>x.id===e.target.value);u("student_id",e.target.value);if(st)u("subject",st.subject);}} style={is}>{students.map(st=>(<option key={st.id} value={st.id}>{st.name} ({st.subject})</option>))}</select></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={ls}>날짜</label><input type="date" value={f.date} onChange={e=>u("date",e.target.value)} style={is}/></div>
          <div><label style={ls}>과목</label><input value={f.subject} onChange={e=>u("subject",e.target.value)} style={is}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div><label style={ls}>시작(시)</label><select value={f.start_hour} onChange={e=>u("start_hour",+e.target.value)} style={is}>{Array.from({length:24},(_,i)=>i).map(h=>(<option key={h} value={h}>{p2(h)}</option>))}</select></div>
          <div><label style={ls}>시작(분)</label><select value={f.start_min} onChange={e=>u("start_min",+e.target.value)} style={is}>{[0,5,10,15,20,25,30,35,40,45,50,55].map(m=>(<option key={m} value={m}>{p2(m)}</option>))}</select></div>
          <div><label style={ls}>수업시간(분)</label><input type="number" value={f.duration} onChange={e=>u("duration",+e.target.value)} style={is} step="5"/><div style={{display:"flex",gap:4,marginTop:4}}>{[60,90,120].map(v=><button key={v} type="button" onClick={()=>u("duration",v)} style={{flex:1,padding:"4px 0",borderRadius:6,border:`1px solid ${f.duration===v?C.ac:C.bd}`,background:f.duration===v?C.al:"transparent",color:f.duration===v?C.ac:C.ts,fontSize:11,fontWeight:f.duration===v?700:500,cursor:"pointer",fontFamily:"inherit"}}>{v}분</button>)}</div></div>
        </div>
        <div><label style={ls}>수업 주제</label><input value={f.topic} onChange={e=>u("topic",e.target.value)} style={is} placeholder="수업 주제..."/></div>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.ts,cursor:"pointer"}}><input type="checkbox" checked={f.is_recurring} onChange={e=>u("is_recurring",e.target.checked)}/>매주 반복</label>
        {conflict&&<div style={{background:C.db,border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",fontSize:12,color:C.dn,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14}}>&#9888;</span>
          <span>{conflictStu?.name||"다른 수업"}과 시간이 겹칩니다 ({p2(conflict.start_hour)}:{p2(conflict.start_min)}~{m2s(conflict.start_hour*60+conflict.start_min+conflict.duration)})</span>
        </div>}
      </div>
      <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:6}}>{ed&&!les.is_recurring&&<button onClick={()=>onDel(les.id)} style={{background:C.db,color:C.dn,border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>삭제</button>}{ed&&les.is_recurring&&<button onClick={()=>onDelSingle(les.id,les._viewDate||les.date)} title="이 수업만 삭제" style={{background:"none",color:C.tt,border:`1px solid ${C.bd}`,borderRadius:8,padding:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><IcT/></button>}{ed&&les.is_recurring&&<button onClick={()=>onDelFuture(les.id,les._viewDate||les.date)} style={{background:C.db,color:C.dn,border:"none",borderRadius:8,padding:"10px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>이후 반복 삭제</button>}</div>
        <div style={{display:"flex",gap:10}}><button onClick={onClose} style={{background:C.sfh,color:C.ts,border:`1px solid ${C.bd}`,borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>취소</button><button onClick={go} style={{background:conflict?C.wn:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{ed?"저장":isCopy?"보강 추가":"추가"}</button></div>
      </div>
    </div>
  </div>);
}

/* ── Main Schedule ── */
export default function Schedule({menuBtn}){
  const tog=menuBtn;
  const{user}=useAuth();
  const[cur,setCur]=useState(new Date());
  const[viewMode,setVM]=useState('week');
  const[lessons,setLessons]=useState([]);
  const[students,setStudents]=useState([]);
  const[loading,setLoading]=useState(true);
  const[mOpen,setMO]=useState(false);const[eLes,setEL]=useState(null);const[dLes,setDL]=useState(null);
  const[stH,setStH]=useState(()=>{try{const v=localStorage.getItem('sch_stH');return v?+v:9;}catch{return 9;}});
  const[enH,setEnH]=useState(()=>{try{const v=localStorage.getItem('sch_enH');return v?+v:22;}catch{return 22;}});
  const[dcState,setDC]=useState(null);
  const[ctxMenu,setCtx]=useState(null);
  const[slideDir,setSlide]=useState(null);
  const[animKey,setAnim]=useState(0);
  const[hiddenStu,setHidden]=useState(new Set());
  const gridRef=useRef(null);const dragRef=useRef(null);const movedRef=useRef(false);const swipeRef=useRef(null);
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

  const nW=d=>{setSlide(d>0?'r':'l');setAnim(k=>k+1);if(viewMode==='month'){const t=new Date(cur);t.setMonth(t.getMonth()+d);setCur(t);}else{const t=new Date(cur);t.setDate(t.getDate()+d*7);setCur(t);}};
  const gL=date=>{const ds=fd(date),dw=date.getDay()===0?7:date.getDay();return lessons.filter(l=>{const ld=(l.date||"").slice(0,10);if(l.is_recurring&&l.recurring_exceptions&&l.recurring_exceptions.includes(ds))return false;if(ld===ds)return true;if(l.is_recurring&&+l.recurring_day===dw){if(ds<ld)return false;if(l.recurring_end_date&&ds>=(l.recurring_end_date+"").slice(0,10))return false;return true;}return false;});};

  const gCo=sid=>{const st=students.find(x=>x.id===sid);return SC[(st?.color_index||0)%8];};
  const getStu=sid=>students.find(x=>x.id===sid);
  const toggleStu=sid=>setHidden(p=>{const n=new Set(p);n.has(sid)?n.delete(sid):n.add(sid);return n;});
  const gMonthDays=()=>{const y=cur.getFullYear(),m=cur.getMonth();const first=new Date(y,m,1);const startDow=first.getDay()===0?6:first.getDay()-1;const dim=new Date(y,m+1,0).getDate();const days=[];for(let i=-startDow;i<42;i++){const d=new Date(y,m,1+i);days.push(d);if(i>=dim-1+startDow&&days.length%7===0)break;}return days;};

  /* Conflict detection */
  const checkConflict=(dateStr,sh,sm,dur,excludeId)=>{
    const d=new Date(dateStr+'T00:00:00'),dw=d.getDay()===0?7:d.getDay();
    const dl=lessons.filter(x=>{
      if(x.id===excludeId||x.status==='cancelled')return false;
      if(x.is_recurring&&x.recurring_exceptions&&x.recurring_exceptions.includes(dateStr))return false;
      if(x.date===dateStr)return true;
      if(x.is_recurring&&x.recurring_day===dw){if(dateStr<x.date)return false;if(x.recurring_end_date&&dateStr>=x.recurring_end_date)return false;return true;}
      return false;
    });
    const s1=sh*60+sm,e1=s1+dur;
    return dl.find(x=>{const s2=x.start_hour*60+x.start_min,e2=s2+x.duration;return s1<e2&&e1>s2;});
  };

  /* Status update */
  const updStatus=async(status)=>{
    if(!ctxMenu)return;
    const{l,vd}=ctxMenu;
    let targetId=l.id;
    if(l.is_recurring&&l.date!==fd(vd)){
      const mat=await materialize(l,fd(vd));
      if(!mat)return;
      targetId=mat.id;
    }
    await supabase.from('lessons').update({status}).eq('id',targetId);
    setLessons(p=>p.map(x=>x.id===targetId?{...x,status}:x));
    setCtx(null);
  };

  /* Copy lesson (makeup) */
  const copyLesson=()=>{
    if(!ctxMenu)return;
    const l=ctxMenu.l;
    setEL({student_id:l.student_id,date:fd(new Date()),start_hour:l.start_hour,start_min:l.start_min,duration:l.duration,subject:l.subject,topic:"",is_recurring:false,_status:'makeup'});
    setMO(true);setCtx(null);
  };

  /* CRUD */
  const save=async(f)=>{
    const cf=checkConflict(f.date,f.start_hour,f.start_min,f.duration,eLes?.id);
    if(cf){const sn=getStu(cf.student_id);if(!confirm((sn?.name||'다른 수업')+'과 시간이 겹칩니다. 계속하시겠습니까?'))return;}
    if(eLes?.id){
      // Update
      const{error}=await supabase.from('lessons').update({student_id:f.student_id,date:f.date,start_hour:f.start_hour,start_min:f.start_min,duration:f.duration,subject:f.subject,topic:f.topic,is_recurring:f.is_recurring,recurring_day:f.recurring_day}).eq('id',eLes.id);
      if(!error)setLessons(p=>p.map(l=>l.id===eLes.id?{...l,...f}:l));
    }else{
      // Insert
      const{data,error}=await supabase.from('lessons').insert({student_id:f.student_id,date:f.date,start_hour:f.start_hour,start_min:f.start_min,duration:f.duration,subject:f.subject,topic:f.topic,is_recurring:f.is_recurring,recurring_day:f.recurring_day,status:eLes?._status||'scheduled',user_id:user.id}).select('*, homework(*), files(*)').single();
      if(!error&&data)setLessons(p=>[...p,data]);
    }
    setMO(false);setEL(null);
  };
  const del=async(id)=>{
    await supabase.from('lessons').delete().eq('id',id);
    setLessons(p=>p.filter(l=>l.id!==id));
    setMO(false);setEL(null);setCtx(null);
  };
  const delFuture=async(id,viewDate)=>{
    const les=lessons.find(l=>l.id===id);
    if(!les||les.date===viewDate){setLessons(p=>p.filter(l=>l.id!==id));setMO(false);setEL(null);setCtx(null);await supabase.from('lessons').delete().eq('id',id);}
    else{setLessons(p=>p.map(l=>l.id===id?{...l,recurring_end_date:viewDate}:l));setMO(false);setEL(null);setCtx(null);await supabase.from('lessons').update({recurring_end_date:viewDate}).eq('id',id);}
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
    // Sync homework to DB
    const les=lessons.find(l=>l.id===id);
    const oldHw=les?.homework||[],newHw=data.hw||[];
    const oldIds=new Set(oldHw.map(h=>h.id));
    const toDel=oldHw.filter(h=>!newHw.some(n=>n.id===h.id));
    const toIns=newHw.filter(h=>!oldIds.has(h.id));
    const toUpd=newHw.filter(h=>oldIds.has(h.id));
    if(toDel.length)await supabase.from('homework').delete().in('id',toDel.map(h=>h.id));
    let ins=[];
    if(toIns.length){const{data:d}=await supabase.from('homework').insert(toIns.map(h=>({lesson_id:id,title:h.title,completion_pct:h.completion_pct||0,note:h.note||""}))).select();ins=d||[];}
    for(const h of toUpd)await supabase.from('homework').update({title:h.title,completion_pct:h.completion_pct||0,note:h.note||""}).eq('id',h.id);
    const finalHw=[...toUpd,...ins];
    setLessons(p=>p.map(l=>l.id===id?{...l,...u,homework:finalHw,files:data.files||l.files}:l));
  };

  /* Drag helpers */
  const y2m=y=>stH*60+Math.round(y/SHT)*SMN;
  const x2d=(x,r)=>{const cw=(r.width-60)/7;return Math.max(0,Math.min(6,Math.floor((x-60)/cw)));};

  const materialize=async(l,viewDate)=>{
    const{data,error}=await supabase.from('lessons').insert({student_id:l.student_id,date:viewDate,start_hour:l.start_hour,start_min:l.start_min,duration:l.duration,subject:l.subject,topic:"",is_recurring:false,recurring_day:null,user_id:user.id}).select('*, homework(*), files(*)').single();
    if(error||!data)return null;
    const prev=Array.isArray(l.recurring_exceptions)?l.recurring_exceptions:[];const exc=[...prev,viewDate];
    const{error:e2}=await supabase.from('lessons').update({recurring_exceptions:exc}).eq('id',l.id);
    setLessons(p=>[...p.map(x=>x.id===l.id?{...x,recurring_exceptions:exc}:x),data]);
    return data;
  };
  const openDetail=async(lesData,viewDate)=>{
    let d=lesData;
    if(lesData.is_recurring&&lesData.date!==viewDate){d=await materialize(lesData,viewDate);if(!d)return;}
    setDL({...d,sh:d.start_hour,sm:d.start_min,dur:d.duration,sub:d.subject,top:d.topic,rep:d.is_recurring,tMemo:d.private_memo||"",hw:d.homework||[],files:d.files||[]});
  };
  const onLD=(e,l,vd)=>{
    if(e.button!==0){e.stopPropagation();return;}e.preventDefault();e.stopPropagation();
    const g=gridRef.current;if(!g)return;const r=g.getBoundingClientRect(),y=e.clientY-r.top+g.scrollTop;
    const cm=y2m(y),lm=l.start_hour*60+l.start_min,off=cm-lm;movedRef.current=false;
    const viewDate=fd(vd);
    dragRef.current={t:"m",id:l.id,off,r};let lastPos=null;
    const origPos={date:l.date,start_hour:l.start_hour,start_min:l.start_min,recurring_day:l.recurring_day};
    const mv=ev=>{movedRef.current=true;const gy=ev.clientY-r.top+g.scrollTop,gx=ev.clientX-r.left;const raw=y2m(gy)-off,sn=s5(raw);const nh=Math.floor(sn/60),nm=sn%60;const di=x2d(gx,r),nd=fd(wk[di]),dw=wk[di].getDay();
      lastPos={start_hour:Math.max(0,Math.min(23,nh)),start_min:Math.max(0,nm),date:nd,recurring_day:l.is_recurring?(dw===0?7:dw):l.recurring_day};
      setLessons(p=>p.map(x=>x.id===l.id?{...x,...lastPos}:x));};
    const up=async()=>{const did=movedRef.current;dragRef.current=null;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);
      if(!did){
        const lesData=lessons.find(x=>x.id===l.id);if(lesData)await openDetail(lesData,viewDate);
      }else if(lastPos){
        const cf=checkConflict(lastPos.date,lastPos.start_hour,lastPos.start_min,l.duration,l.id);
        if(cf){setLessons(p=>p.map(x=>x.id===l.id?{...x,...origPos}:x));return;}
        await supabase.from('lessons').update(lastPos).eq('id',l.id);
      }
    };
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };

  const onRC=(e,l,vd)=>{e.preventDefault();e.stopPropagation();setCtx({x:e.clientX,y:e.clientY,l,vd});};
  const delSingle=async(id,viewDate)=>{const les=lessons.find(l=>l.id===id);if(!les){setMO(false);setEL(null);setCtx(null);return;}const prev=Array.isArray(les.recurring_exceptions)?les.recurring_exceptions:[];const exc=[...prev,viewDate];setLessons(p=>p.map(l=>l.id===id?{...l,recurring_exceptions:exc}:l));setMO(false);setEL(null);setCtx(null);await supabase.from('lessons').update({recurring_exceptions:exc}).eq('id',id);};

  const onGD=(e,di)=>{
    if(dragRef.current)return;const g=gridRef.current;if(!g)return;const r=g.getBoundingClientRect(),hOff=e.currentTarget.getBoundingClientRect().top-r.top+g.scrollTop,y=e.clientY-r.top+g.scrollTop-hOff;
    const anc=s5(y2m(y));movedRef.current=false;dragRef.current={t:"c",di,anc,hOff};setDC({di,s:anc,e:anc+SMN});
    const mv=ev=>{movedRef.current=true;const dc=dragRef.current;if(!dc||dc.t!=="c")return;const gy=ev.clientY-r.top+g.scrollTop-dc.hOff,cm=s5(y2m(gy));setDC({di:dc.di,s:Math.min(dc.anc,cm),e:Math.max(dc.anc,cm)+SMN});};
    const up=()=>{const dc=dragRef.current;dragRef.current=null;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);
      setDC(prev=>{const st=prev||{s:dc?.anc||0,e:(dc?.anc||0)+SMN};if(st.e-st.s>=SMN){const h=Math.floor(st.s/60),m=st.s%60,dur=st.e-st.s;setEL({date:fd(wk[dc.di]),start_hour:h,start_min:m,duration:dur,subject:"수학",topic:"",is_recurring:false});setMO(true);}return null;});
    };
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };

  /* Swipe & wheel navigation */
  const onTS=e=>{if(e.touches.length===1)swipeRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};};
  const onTE=e=>{if(!swipeRef.current)return;const dx=e.changedTouches[0].clientX-swipeRef.current.x,dy=e.changedTouches[0].clientY-swipeRef.current.y,dt=Date.now()-swipeRef.current.t;swipeRef.current=null;if(Math.abs(dx)>25&&Math.abs(dx)>Math.abs(dy)&&dt<600)nW(dx<0?1:-1);};
  const wheelAcc=useRef(0);const wheelTimer=useRef(null);
  const onWh=e=>{if(Math.abs(e.deltaX)<Math.abs(e.deltaY))return;e.preventDefault();wheelAcc.current+=e.deltaX;clearTimeout(wheelTimer.current);wheelTimer.current=setTimeout(()=>{if(Math.abs(wheelAcc.current)>30)nW(wheelAcc.current>0?1:-1);wheelAcc.current=0;},150);};
  useEffect(()=>{const g=gridRef.current;if(!g)return;g.addEventListener('wheel',onWh,{passive:false});return()=>g.removeEventListener('wheel',onWh);},[cur]);

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);

  const cms={padding:"7px 12px",fontSize:12,cursor:"pointer",borderRadius:6,color:C.tp,background:"transparent",border:"none",width:"100%",textAlign:"left",fontFamily:"inherit"};

  return(
    <div style={{minHeight:"100vh",background:C.bg}} onClick={()=>ctxMenu&&setCtx(null)}>
      <style>{`.lb{cursor:grab;transition:box-shadow .12s,transform .1s;}.lb:hover{box-shadow:0 4px 12px rgba(0,0,0,.12);transform:scale(1.02);}.nb{transition:all .1s;cursor:pointer;border:none;background:none;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:8px;color:${C.ts};}.nb:hover{background:${C.sfh};}.cm-i{transition:background .1s;}.cm-i:hover{background:${C.sfh};}@keyframes wkR{from{transform:translateX(50px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes wkL{from{transform:translateX(-50px);opacity:0}to{transform:translateX(0);opacity:1}}.wk-r{animation:wkR .2s ease-out}.wk-l{animation:wkL .2s ease-out}`}</style>

      {/* Header */}
      <div style={{background:C.sf,borderBottom:`1px solid ${C.bd}`,padding:"16px 24px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>{tog}<h2 style={{fontSize:18,fontWeight:700,color:C.tp}}>수업 일정</h2><span style={{fontSize:13,color:C.ts}}>{viewMode==='month'?`${cur.getFullYear()}년 ${cur.getMonth()+1}월`:`${wk[0].getMonth()+1}/${wk[0].getDate()} ~ ${wk[6].getMonth()+1}/${wk[6].getDate()}`}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button className="nb" onClick={()=>nW(-1)}><IcL/></button>
            <button onClick={()=>setCur(new Date())} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,fontSize:12,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>오늘</button>
            <button className="nb" onClick={()=>nW(1)}><IcR/></button>
            <div style={{display:"flex",border:`1px solid ${C.bd}`,borderRadius:8,overflow:"hidden",marginLeft:4}}>
              <button onClick={()=>setVM('week')} style={{padding:"5px 10px",fontSize:11,fontWeight:viewMode==='week'?700:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:viewMode==='week'?C.pr:'transparent',color:viewMode==='week'?'#fff':C.ts}}>주간</button>
              <button onClick={()=>setVM('month')} style={{padding:"5px 10px",fontSize:11,fontWeight:viewMode==='month'?700:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:viewMode==='month'?C.pr:'transparent',color:viewMode==='month'?'#fff':C.ts,borderLeft:`1px solid ${C.bd}`}}>월간</button>
            </div>
            <button onClick={()=>{setEL(null);setMO(true);}} style={{display:"flex",alignItems:"center",gap:4,background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><IcP/> 수업 추가</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
          {students.map(st=>{const c=SC[(st.color_index||0)%8];const hide=hiddenStu.has(st.id);return(<div key={st.id} onClick={()=>toggleStu(st.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 8px",borderRadius:6,background:hide?C.sfh:c.bg,fontSize:11,fontWeight:500,color:hide?C.tt:c.t,cursor:"pointer",opacity:hide?.5:1,transition:"all .15s"}}><div style={{width:7,height:7,borderRadius:"50%",background:hide?C.tt:c.b}}/>{st.name}{hide&&<span style={{fontSize:9}}>✕</span>}</div>);})}
          <span style={{fontSize:10,color:C.tt,background:C.sfh,padding:"3px 8px",borderRadius:4}}>{viewMode==='month'?'클릭: 해당 주간으로 이동':'좌클릭: 상세 · 우클릭: 메뉴 · 드래그: 이동/생성'}</span>
          {hiddenStu.size>0&&<button onClick={()=>setHidden(new Set())} style={{fontSize:10,color:C.ac,background:C.al,border:`1px solid ${C.ac}`,borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>전체 보기</button>}
          {viewMode==='week'&&<div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto",fontSize:11,color:C.ts}}>
            <select value={stH} onChange={e=>{const v=+e.target.value;setStH(v);localStorage.setItem('sch_stH',v);if(v>=enH){setEnH(v+1);localStorage.setItem('sch_enH',v+1);}}} style={{padding:"2px 4px",borderRadius:4,border:`1px solid ${C.bd}`,fontSize:11,color:C.ts,background:C.sf,fontFamily:"inherit",cursor:"pointer"}}>{Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
            <span>~</span>
            <select value={enH} onChange={e=>{const v=+e.target.value;setEnH(v);localStorage.setItem('sch_enH',v);}} style={{padding:"2px 4px",borderRadius:4,border:`1px solid ${C.bd}`,fontSize:11,color:C.ts,background:C.sf,fontFamily:"inherit",cursor:"pointer"}}>{Array.from({length:24-stH},(_,i)=>i+stH+1).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
          </div>}
        </div>
      </div>

      {/* Monthly grid */}
      {viewMode==='month'&&(()=>{const mDays=gMonthDays();const cm=cur.getMonth();return(
        <div key={animKey} className={slideDir==='r'?'wk-r':slideDir==='l'?'wk-l':''} style={{padding:"0 24px 24px"}} onTouchStart={onTS} onTouchEnd={onTE}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:0,border:`1px solid ${C.bd}`,borderRadius:12,overflow:"hidden",background:C.sf}}>
            {DK.map(d=><div key={d} style={{padding:"8px 0",textAlign:"center",fontSize:12,fontWeight:600,color:C.tt,background:C.sfh,borderBottom:`1px solid ${C.bd}`}}>{d}</div>)}
            {mDays.map((d,i)=>{const isM=d.getMonth()===cm;const it=sdy(d,today);const dl=gL(d).filter(l=>!hiddenStu.has(l.student_id));const cnt=dl.filter(l=>l.status!=='cancelled').length;const canCnt=dl.filter(l=>l.status==='cancelled').length;
              return(<div key={i} onClick={()=>{setCur(d);setVM('week');}} style={{minHeight:90,padding:6,borderRight:(i%7<6)?`1px solid ${C.bl}`:"none",borderBottom:`1px solid ${C.bl}`,background:it?C.as:isM?"transparent":"#FAFAF8",cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background=it?C.as:C.sfh} onMouseLeave={e=>e.currentTarget.style.background=it?C.as:isM?"transparent":"#FAFAF8"}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:it?700:isM?500:400,color:it?C.ac:isM?C.tp:C.tt,width:it?24:undefined,height:it?24:undefined,borderRadius:"50%",background:it?C.ac:"transparent",color:it?"#fff":isM?C.tp:C.tt,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{d.getDate()}</span>
                  {cnt>0&&<span style={{fontSize:10,fontWeight:600,color:C.ac,background:C.al,borderRadius:4,padding:"1px 5px"}}>{cnt}건</span>}
                </div>
                {isM&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {dl.slice(0,3).map(l=>{const co=gCo(l.student_id);const st=getStu(l.student_id);const isCan=l.status==='cancelled';return(
                    <div key={l.id} style={{fontSize:10,padding:"1px 4px",borderRadius:4,background:isCan?C.sfh:co.bg,color:isCan?C.tt:co.t,fontWeight:500,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",opacity:isCan?.5:1,textDecoration:isCan?'line-through':'none'}}>{p2(l.start_hour)}:{p2(l.start_min)} {st?.name||""}</div>);
                  })}
                  {dl.length>3&&<div style={{fontSize:9,color:C.tt,paddingLeft:4}}>+{dl.length-3}건</div>}
                </div>}
              </div>);
            })}
          </div>
        </div>);
      })()}

      {/* Weekly grid */}
      {viewMode==='week'&&<div ref={gridRef} style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 120px)",userSelect:"none"}} onTouchStart={onTS} onTouchEnd={onTE}>
        <div key={animKey} className={slideDir==='r'?'wk-r':slideDir==='l'?'wk-l':''} style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",minWidth:800}}>
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
            const dl=gL(date).filter(l=>!hiddenStu.has(l.student_id)),it=sdy(date,today);
            return(
              <div key={di} style={{position:"relative",height:tH,borderRight:di<6?`1px solid ${C.bl}`:"none",background:it?"rgba(37,99,235,.015)":"transparent"}} onMouseDown={e=>onGD(e,di)}>
                {hrs.map((h,i)=>(<div key={h} style={{position:"absolute",top:i*SHT*4,left:0,right:0,height:SHT*4,borderBottom:`1px solid ${C.bl}`}}><div style={{position:"absolute",top:SHT*2-1,left:0,right:0,height:1,background:C.bl,opacity:.5}}/></div>))}
                {dcState&&dcState.di===di&&(
                  <div style={{position:"absolute",top:((dcState.s-stH*60)/SMN)*SHT,left:2,right:2,height:Math.max(((dcState.e-dcState.s)/SMN)*SHT,SHT),background:C.al,border:`2px dashed ${C.ac}`,borderRadius:8,opacity:.7,zIndex:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.ac,fontWeight:600,pointerEvents:"none",flexDirection:"column"}}><span>{m2s(dcState.s)} ~ {m2s(dcState.e)}</span><span>({dcState.e-dcState.s}분)</span></div>
                )}
                {dl.map(l=>{const co=gCo(l.student_id);const st=getStu(l.student_id);const tp=((l.start_hour*60+l.start_min)-stH*60)/SMN*SHT;const hp=Math.max(l.duration/SMN*SHT,SHT);
                  const isOrig=!l.is_recurring||l.date===fd(date);
                  const lSt=l.status||'scheduled';const isCan=lSt==='cancelled';
                  return(
                    <div key={l.id} className="lb" onMouseDown={e=>onLD(e,l,date)} onContextMenu={e=>onRC(e,l,date)} style={{position:"absolute",top:tp,left:3,right:3,height:hp-2,borderRadius:8,background:isCan?C.sfh:co.bg,borderLeft:`3px solid ${isCan?C.bd:co.b}`,padding:"4px 8px",overflow:"hidden",zIndex:3,opacity:isCan?.45:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontSize:11,fontWeight:600,color:isCan?C.tt:co.t,textDecoration:isCan?'line-through':'none'}}>{st?.name||""}</span>
                        {lSt!=='scheduled'&&<span style={{fontSize:8,fontWeight:700,color:LSTATUS[lSt]?.c,background:LSTATUS[lSt]?.bg,borderRadius:3,padding:"1px 4px",lineHeight:"14px"}}>{LSTATUS[lSt]?.l}</span>}
                        {isOrig&&(l.homework||[]).length>0&&<span style={{fontSize:9,background:co.t,color:co.bg,borderRadius:4,padding:"0 4px",fontWeight:600}}>{(l.homework||[]).length}</span>}
                      </div>
                      {hp>32&&<div style={{fontSize:10,color:isCan?C.tt:co.t,opacity:.7,marginTop:1,textDecoration:isCan?'line-through':'none'}}>{isOrig?(l.topic||""):(l.subject||"")}</div>}
                      {hp>48&&<div style={{fontSize:10,color:isCan?C.tt:co.t,opacity:.6,marginTop:1}}>{p2(l.start_hour)}:{p2(l.start_min)} · {l.duration}분</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>}

      {/* Context Menu */}
      {ctxMenu&&<>
        <div style={{position:"fixed",inset:0,zIndex:50}} onClick={()=>setCtx(null)} onContextMenu={e=>{e.preventDefault();setCtx(null);}}/>
        <div style={{position:"fixed",left:Math.min(ctxMenu.x,window.innerWidth-180),top:Math.min(ctxMenu.y,window.innerHeight-280),zIndex:51,background:C.sf,border:`1px solid ${C.bd}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.12)",padding:6,minWidth:160}} onClick={e=>e.stopPropagation()}>
          <button className="cm-i" style={cms} onClick={()=>{setEL({...ctxMenu.l,_viewDate:fd(ctxMenu.vd)});setMO(true);setCtx(null);}}>
            <span style={{marginRight:8}}>&#9998;</span>수정
          </button>
          <button className="cm-i" style={cms} onClick={copyLesson}>
            <span style={{marginRight:8}}>&#128203;</span>복사
          </button>
          <div style={{height:1,background:C.bd,margin:"4px 0"}}/>
          <div style={{padding:"6px 8px",fontSize:10,color:C.tt,fontWeight:600}}>상태 변경</div>
          <div style={{display:"flex",gap:4,padding:"2px 8px 8px"}}>
            {Object.entries(LSTATUS).map(([k,v])=>{
              const cur=(ctxMenu.l.status||'scheduled')===k;
              return(<button key={k} onClick={()=>updStatus(k)} style={{fontSize:10,fontWeight:cur?700:500,color:cur?v.c:C.ts,background:cur?v.bg:'transparent',border:`1px solid ${cur?v.c:C.bd}`,borderRadius:5,padding:"3px 7px",cursor:"pointer",fontFamily:"inherit"}}>{v.l}</button>);
            })}
          </div>
          <div style={{height:1,background:C.bd,margin:"4px 0"}}/>
          {ctxMenu.l.is_recurring?<>
            <button className="cm-i" style={{...cms,color:C.dn}} onClick={()=>{delSingle(ctxMenu.l.id,fd(ctxMenu.vd));}}>
              <span style={{marginRight:8}}>&#128465;</span>이 수업만 삭제
            </button>
            <button className="cm-i" style={{...cms,color:C.dn}} onClick={()=>{delFuture(ctxMenu.l.id,fd(ctxMenu.vd));}}>
              <span style={{marginRight:8}}>&#128465;</span>이후 반복 삭제
            </button>
          </>:<button className="cm-i" style={{...cms,color:C.dn}} onClick={()=>{del(ctxMenu.l.id);}}>
            <span style={{marginRight:8}}>&#128465;</span>삭제
          </button>}
        </div>
      </>}

      {mOpen&&<SchModal les={eLes} students={students} onSave={save} onDel={del} onDelSingle={delSingle} onDelFuture={delFuture} onClose={()=>{setMO(false);setEL(null);}} checkConflict={checkConflict}/>}
      {dLes&&<LessonDetailModal les={dLes} student={getStu(dLes.student_id)} onUpdate={updDetail} onClose={()=>setDL(null)}/>}
    </div>
  );
}
