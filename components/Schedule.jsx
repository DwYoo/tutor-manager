'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import LessonDetailModal from './student/LessonDetailModal';
import { useToast } from '@/components/Toast';
import { C, SC } from '@/components/Colors';
import { p2, fd, m2s, DKS as DK, gwd, s5, sdy, lessonOnDate } from '@/lib/utils';
import { syncHomework } from '@/lib/homework';
import { useShell } from '@/components/AppShell';
import { useConfirm } from '@/components/ui/ConfirmDialog';
const LSTATUS={scheduled:{l:"예정",c:"#78716C",bg:"#F5F5F4"},in_progress:{l:"진행중",c:"#EA580C",bg:"#FFF7ED"},completed:{l:"완료",c:"#16A34A",bg:"#F0FDF4"},cancelled:{l:"취소",c:"#DC2626",bg:"#FEF2F2"},makeup:{l:"보강",c:"#2563EB",bg:"#DBEAFE"}};
const ls={display:"block",fontSize:12,fontWeight:500,color:C.tt,marginBottom:6};
const is={width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.bd}`,fontSize:14,color:C.tp,background:C.sf,outline:"none",fontFamily:"inherit"};
const SHT=20,SMN=15;

const IcL=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcR=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IcP=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcX=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcT=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e25555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

/* ── Add/Edit Modal ── */
function SchModal({les,students,onSave,onClose,checkConflict,durPresets,isMobile}){
  const ed=!!les?.id;
  const PERSONAL_ID="__personal__";
  const isPersonal=v=>!v||v===PERSONAL_ID;
  const[f,sF]=useState({student_id:les?.student_id||(les?.student_id===null?PERSONAL_ID:students[0]?.id||""),date:les?.date||fd(new Date()),start_hour:les?.start_hour??14,start_min:les?.start_min??0,duration:les?.duration||90,subject:les?.subject||(les?.student_id===null?"":students[0]?.subject||"수학"),topic:les?.topic||"",is_recurring:les?.is_recurring||false});
  const u=(k,v)=>sF(p=>({...p,[k]:v}));
  const go=()=>{const dw=new Date(f.date).getDay();const sid=isPersonal(f.student_id)?null:f.student_id;onSave({...f,student_id:sid,recurring_day:f.is_recurring?(dw===0?7:dw):null,id:les?.id||undefined});};
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  const conflict=!isPersonal(f.student_id)&&checkConflict?.(f.date,f.start_hour,f.start_min,f.duration,les?.id);
  const conflictStu=conflict?students.find(s=>s.id===conflict.student_id):null;
  const isPers=isPersonal(f.student_id);
  const[stuOpen,setStuOpen]=useState(false);
  const stuRef=useRef(null);
  useEffect(()=>{if(!stuOpen)return;const h=e=>{if(stuRef.current&&!stuRef.current.contains(e.target))setStuOpen(false);};document.addEventListener("mousedown",h);document.addEventListener("touchstart",h);return()=>{document.removeEventListener("mousedown",h);document.removeEventListener("touchstart",h);};},[stuOpen]);
  const selStu=students.find(x=>x.id===f.student_id);
  const stuLabel=isPers?"개인 일정":selStu?`${selStu.name} (${selStu.subject})`:"학생 선택";
  const stuColor=isPers?{b:"#9CA3AF",bg:"#F3F4F6",t:"#6B7280"}:selStu?SC[(selStu.color_index||0)%8]:null;
  return(<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",background:"rgba(0,0,0,.35)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} className="detail-modal" style={{background:C.sf,borderRadius:isMobile?"16px 16px 0 0":16,width:"100%",maxWidth:480,padding:isMobile?"20px 20px calc(env(safe-area-inset-bottom,0px) + 20px)":28,boxShadow:"0 20px 60px rgba(0,0,0,.15)",maxHeight:isMobile?"90vh":"none",overflowY:isMobile?"auto":"visible"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:C.tp}}>{isPers?(ed?"일정 수정":"일정 추가"):(ed?"수업 수정":"수업 추가")}</h2><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,display:"flex",minHeight:44,minWidth:44,alignItems:"center",justifyContent:"center"}}><IcX/></button></div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div ref={stuRef} style={{position:"relative"}}><label style={ls}>학생</label>
          <div onClick={()=>setStuOpen(!stuOpen)} style={{...is,cursor:"pointer",display:"flex",alignItems:"center",gap:8,minHeight:44}}>
            {stuColor&&<div style={{width:8,height:8,borderRadius:"50%",background:stuColor.b,flexShrink:0}}/>}
            <span style={{flex:1,color:isPers?"#9CA3AF":C.tp}}>{stuLabel}</span>
            <span style={{fontSize:10,color:C.tt,transform:stuOpen?"rotate(180deg)":"none",transition:"transform .15s"}}>&#9660;</span>
          </div>
          {stuOpen&&<div style={{position:isMobile?"fixed":"absolute",left:isMobile?0:0,right:isMobile?0:0,bottom:isMobile?0:"auto",top:isMobile?"auto":"100%",zIndex:110,background:C.sf,border:isMobile?"none":`1px solid ${C.bd}`,borderRadius:isMobile?"16px 16px 0 0":10,boxShadow:"0 8px 24px rgba(0,0,0,.15)",maxHeight:isMobile?"60vh":280,overflowY:"auto",marginTop:isMobile?0:4,padding:isMobile?"12px 0 calc(env(safe-area-inset-bottom,0px) + 12px)":0}}>
            {isMobile&&<div style={{width:36,height:4,borderRadius:2,background:C.bd,margin:"4px auto 8px"}}/>}
            <div onClick={()=>{u("student_id",PERSONAL_ID);u("subject","");setStuOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:isPers?C.sfh:"transparent",borderBottom:`1px solid ${C.bl}`}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:"#9CA3AF"}}/>
              <span style={{fontSize:14,fontWeight:isPers?700:500,color:"#9CA3AF"}}>개인 일정</span>
              {isPers&&<span style={{marginLeft:"auto",fontSize:12,color:C.ac}}>&#10003;</span>}
            </div>
            <div style={{borderBottom:`1px solid ${C.bd}`,margin:"0"}}/>
            {students.map(st=>{const c=SC[(st.color_index||0)%8];const sel=f.student_id===st.id;return(
              <div key={st.id} onClick={()=>{u("student_id",st.id);u("subject",st.subject);setStuOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:sel?c.bg:"transparent"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:c.b}}/>
                <span style={{fontSize:14,fontWeight:sel?700:500,color:sel?c.t:C.tp}}>{st.name}</span>
                <span style={{fontSize:12,color:C.tt}}>({st.subject})</span>
                {sel&&<span style={{marginLeft:"auto",fontSize:12,color:c.t}}>&#10003;</span>}
              </div>);
            })}
          </div>}
          {stuOpen&&isMobile&&<div style={{position:"fixed",inset:0,zIndex:109,background:"rgba(0,0,0,.3)"}} onClick={()=>setStuOpen(false)}/>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
          <div><label style={ls}>날짜</label><input type="date" value={f.date} onChange={e=>u("date",e.target.value)} style={{...is,minHeight:44}}/></div>
          <div><label style={ls}>{isPers?"제목":"과목"}</label><input value={f.subject} onChange={e=>u("subject",e.target.value)} style={{...is,minHeight:44}} placeholder={isPers?"일정 제목...":""}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10}}>
          <div><label style={ls}>시작(시)</label><select value={f.start_hour} onChange={e=>u("start_hour",+e.target.value)} style={{...is,minHeight:44}}>{Array.from({length:24},(_,i)=>i).map(h=>(<option key={h} value={h}>{p2(h)}</option>))}</select></div>
          <div><label style={ls}>시작(분)</label><select value={f.start_min} onChange={e=>u("start_min",+e.target.value)} style={{...is,minHeight:44}}>{[0,5,10,15,20,25,30,35,40,45,50,55].map(m=>(<option key={m} value={m}>{p2(m)}</option>))}</select></div>
          <div style={isMobile?{gridColumn:"1 / -1"}:{}}><label style={ls}>{isPers?"시간(분)":"수업시간(분)"}</label><input type="number" value={f.duration} onChange={e=>u("duration",+e.target.value)} style={{...is,minHeight:44}} step="5"/><div style={{display:"flex",gap:4,marginTop:4}}>{durPresets.map(v=><button key={v} type="button" onClick={()=>u("duration",v)} style={{flex:1,padding:"4px 0",borderRadius:6,border:`1px solid ${f.duration===v?C.ac:C.bd}`,background:f.duration===v?C.al:"transparent",color:f.duration===v?C.ac:C.ts,fontSize:11,fontWeight:f.duration===v?700:500,cursor:"pointer",fontFamily:"inherit",minHeight:44}}>{v}분</button>)}</div></div>
        </div>
        <div><label style={ls}>{isPers?"메모":"수업 주제"}</label><input value={f.topic} onChange={e=>u("topic",e.target.value)} style={{...is,minHeight:44}} placeholder={isPers?"메모...":"수업 주제..."}/></div>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.ts,cursor:"pointer"}}><input type="checkbox" checked={f.is_recurring} onChange={e=>u("is_recurring",e.target.checked)}/>매주 반복</label>
        {conflict&&<div style={{background:C.db,border:"1px solid #FECACA",borderRadius:8,padding:"8px 12px",fontSize:12,color:C.dn,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14}}>&#9888;</span>
          <span>{conflictStu?.name||"다른 수업"}과 시간이 겹칩니다 ({p2(conflict.start_hour)}:{p2(conflict.start_min)}~{m2s(conflict.start_hour*60+conflict.start_min+conflict.duration)})</span>
        </div>}
      </div>
      <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{background:C.sfh,color:C.ts,border:`1px solid ${C.bd}`,borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit",minHeight:44}}>취소</button><button onClick={go} style={{background:conflict?C.wn:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",minHeight:44}}>{ed?"저장":"추가"}</button>
      </div>
    </div>
  </div>);
}

/* ── Main Schedule ── */
export default function Schedule(){
  const{menuBtn}=useShell();
  const tog=menuBtn;
  const{user}=useAuth();
  const toast=useToast();
  const confirm=useConfirm();
  const[cur,setCur]=useState(new Date());
  const[viewMode,setVM]=useState(()=>{try{const v=localStorage.getItem('sch_viewMode');return v||'week';}catch{return 'week';}});
  const[lessons,setLessons]=useState([]);
  const[students,setStudents]=useState([]);
  const[textbooks,setTextbooks]=useState([]);
  const[loading,setLoading]=useState(true);
  const[mOpen,setMO]=useState(false);const[eLes,setEL]=useState(null);const[dLes,setDL]=useState(null);
  const[stH,setStH]=useState(()=>{try{const v=localStorage.getItem('sch_stH');return v?+v:9;}catch{return 9;}});
  const[enH,setEnH]=useState(()=>{try{const v=localStorage.getItem('sch_enH');return v?+v:22;}catch{return 22;}});
  const[dcState,setDC]=useState(null);
  const[ctxMenu,setCtx]=useState(null);
  const[slideDir,setSlide]=useState(null);
  const[animKey,setAnim]=useState(0);
  const[activeStu,setActive]=useState(null);
  const[durPresets,setDP]=useState(()=>{try{const v=localStorage.getItem('sch_durPresets');return v?JSON.parse(v):[120,150,180];}catch{return [120,150,180];}});
  const[dpEdit,setDPE]=useState(false);const[compact,setCompact]=useState(false);
  const[isMobile,setIsMobile]=useState(false);
  const undoStack=useRef([]);const[undoToast,setUndoToast]=useState(null);const undoToastTimer=useRef(null);
  const[mobileDay,setMobileDay]=useState(()=>{const d=new Date().getDay();return d===0?6:d-1;});
  const[mTimeSet,setMTS]=useState(false);
  const gridRef=useRef(null);const dragRef=useRef(null);const movedRef=useRef(false);const swipeRef=useRef(null);
  const lpRef=useRef(null);const lpStartRef=useRef(null);const lpFired=useRef(false);
  const mDragRef=useRef(null);const[mDC,setMDC]=useState(null);
  const today=new Date();const wk=gwd(cur);
  const hrs=Array.from({length:enH-stH},(_,i)=>i+stH);const tH=(enH-stH)*4*SHT;

  const changeViewMode=(mode)=>{setVM(mode);try{localStorage.setItem('sch_viewMode',mode);}catch{}};

  const[fetchError,setFetchError]=useState(false);
  const fetchData=useCallback(async()=>{
    setLoading(true);setFetchError(false);
    try{
      const[sRes,lRes,tbRes]=await Promise.all([
        supabase.from('students').select('id,name,subject,grade,school,color_index,archived,sort_order,created_at').order('created_at'),
        supabase.from('lessons').select('id,student_id,date,start_hour,start_min,duration,subject,topic,status,content,feedback,private_memo,plan_shared,plan_private,is_recurring,recurring_day,recurring_end_date,recurring_exceptions,user_id,homework(id,title,completion_pct,lesson_id),files(id,file_name,file_type,file_url,lesson_id)').order('date'),
        supabase.from('textbooks').select('id,student_id,title').order('created_at',{ascending:false}).then(r=>r,()=>({data:[],error:null})),
      ]);
      if(sRes.error||lRes.error){setFetchError(true);setLoading(false);return;}
      setStudents(sRes.data||[]);
      setLessons(lRes.data||[]);
      setTextbooks(tbRes.data||[]);
    }catch{setFetchError(true);}
    setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);
  useEffect(()=>{const mq=window.matchMedia('(max-width:768px)');const handler=e=>{setIsMobile(e.matches);if(e.matches)setCompact(true);};handler(mq);mq.addEventListener('change',handler);return()=>mq.removeEventListener('change',handler);},[]);

  const pushUndo=(action,label)=>{undoStack.current=[...undoStack.current.slice(-19),{action,label}];};
  const showUndoToast=(msg)=>{clearTimeout(undoToastTimer.current);setUndoToast(msg);undoToastTimer.current=setTimeout(()=>setUndoToast(null),3000);};
  const doUndo=useCallback(async()=>{
    if(!undoStack.current.length)return;
    const{action,label}=undoStack.current.pop();
    try{await action();showUndoToast(`되돌림: ${label}`);}catch{showUndoToast('되돌리기 실패');}
  },[]);
  useEffect(()=>{
    const h=e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;e.preventDefault();doUndo();}};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[doUndo]);

  const nW=d=>{setSlide(d>0?'r':'l');setAnim(k=>k+1);if(viewMode==='month'){const t=new Date(cur);t.setMonth(t.getMonth()+d);setCur(t);}else{const t=new Date(cur);t.setDate(t.getDate()+d*7);setCur(t);}};
  const gL=date=>lessons.filter(l=>lessonOnDate(l,date));

  const PERS_CO={b:"#9CA3AF",bg:"rgba(156,163,175,.15)",t:"#6B7280"};
  const gCo=sid=>{if(!sid)return PERS_CO;const st=students.find(x=>x.id===sid);return SC[(st?.color_index||0)%8];};
  const getStu=sid=>{if(!sid)return null;return students.find(x=>x.id===sid);};
  const toggleStu=sid=>setActive(p=>p===sid?null:sid);
  const todayStr=fd(today);
  const[tick,setTick]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setTick(t=>t+1),60000);return()=>clearInterval(iv);},[]);
  const effSt=(l,vd)=>{const s=l.status||'scheduled';if(s!=='scheduled')return s;const d=vd||l.date;const now=new Date();const nowStr=fd(now);if(d===nowStr){const sm=l.start_hour*60+l.start_min,em=sm+l.duration,cm=now.getHours()*60+now.getMinutes();if(cm>=sm&&cm<em)return'in_progress';if(cm>=em)return'completed';}return d<todayStr?'completed':'scheduled';};
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
    const oldStatus=lessons.find(x=>x.id===targetId)?.status||'scheduled';
    const st=getStu(l.student_id);
    await supabase.from('lessons').update({status}).eq('id',targetId);
    setLessons(p=>p.map(x=>x.id===targetId?{...x,status}:x));
    pushUndo(async()=>{await supabase.from('lessons').update({status:oldStatus}).eq('id',targetId);setLessons(p=>p.map(x=>x.id===targetId?{...x,status:oldStatus}:x));},`${st?.name||''} 상태 변경`);
    setCtx(null);
  };

  /* Copy lesson */
  const copyLesson=()=>{
    if(!ctxMenu)return;
    const l=ctxMenu.l;
    setEL({student_id:l.student_id,date:fd(new Date()),start_hour:l.start_hour,start_min:l.start_min,duration:l.duration,subject:l.subject,topic:"",is_recurring:false});
    setMO(true);setCtx(null);
  };

  /* CRUD */
  const save=async(f)=>{
    const isPers=!f.student_id;
    if(!isPers){const cf=checkConflict(f.date,f.start_hour,f.start_min,f.duration,eLes?.id);
    if(cf){const sn=getStu(cf.student_id);if(!await confirm((sn?.name||'다른 수업')+'과 시간이 겹칩니다. 계속하시겠습니까?'))return;}}
    const st=isPers?null:getStu(f.student_id);
    if(eLes?.id){
      // Update
      const old=lessons.find(l=>l.id===eLes.id);
      const oldData=old?{student_id:old.student_id,date:old.date,start_hour:old.start_hour,start_min:old.start_min,duration:old.duration,subject:old.subject,topic:old.topic,is_recurring:old.is_recurring,recurring_day:old.recurring_day}:{};
      const{error}=await supabase.from('lessons').update({student_id:f.student_id,date:f.date,start_hour:f.start_hour,start_min:f.start_min,duration:f.duration,subject:f.subject,topic:f.topic,is_recurring:f.is_recurring,recurring_day:f.recurring_day}).eq('id',eLes.id);
      if(!error){setLessons(p=>p.map(l=>l.id===eLes.id?{...l,...f}:l));const eid=eLes.id;pushUndo(async()=>{await supabase.from('lessons').update(oldData).eq('id',eid);setLessons(p=>p.map(l=>l.id===eid?{...l,...oldData}:l));},`${isPers?'일정':st?.name||''} ${isPers?'':'수업 '}수정`);}
    }else{
      // Insert
      const ins={student_id:f.student_id||null,date:f.date,start_hour:f.start_hour,start_min:f.start_min,duration:f.duration,subject:f.subject,topic:f.topic,is_recurring:f.is_recurring,recurring_day:f.recurring_day,status:eLes?._status||'scheduled',user_id:user.id};
      const{data,error}=await supabase.from('lessons').insert(ins).select('*, homework(*), files(*)').single();
      if(!error&&data){setLessons(p=>[...p,data]);const nid=data.id;pushUndo(async()=>{await supabase.from('lessons').delete().eq('id',nid);setLessons(p=>p.filter(l=>l.id!==nid));},`${isPers?'일정':st?.name||''} ${isPers?'':'수업 '}추가`);}
    }
    setMO(false);setEL(null);
  };
  const del=async(id)=>{
    const old=lessons.find(l=>l.id===id);const st=old?getStu(old.student_id):null;
    const{error}=await supabase.from('lessons').delete().eq('id',id);
    if(error){toast?.('수업 삭제에 실패했습니다','error');return;}
    setLessons(p=>p.filter(l=>l.id!==id));
    if(old){pushUndo(async()=>{const{student_id,date,start_hour,start_min,duration,subject,topic,is_recurring,recurring_day,status:os,content,feedback,private_memo,plan_shared,plan_private}=old;const{data}=await supabase.from('lessons').insert({student_id,date,start_hour,start_min,duration,subject,topic,is_recurring,recurring_day,status:os||'scheduled',content,feedback,private_memo,plan_shared,plan_private,user_id:user.id}).select('*, homework(*), files(*)').single();if(data)setLessons(p=>[...p,data]);},`${st?.name||''} 수업 삭제`);}
    setMO(false);setEL(null);setCtx(null);
  };
  const delFuture=async(id,viewDate)=>{
    const les=lessons.find(l=>l.id===id);const st=les?getStu(les.student_id):null;
    if(!les||les.date===viewDate){
      const{error}=await supabase.from('lessons').delete().eq('id',id);
      if(error){toast?.('수업 삭제에 실패했습니다','error');return;}
      setLessons(p=>p.filter(l=>l.id!==id));setMO(false);setEL(null);setCtx(null);
      if(les){pushUndo(async()=>{const{student_id,date,start_hour,start_min,duration,subject,topic,is_recurring,recurring_day,status:os,recurring_end_date}=les;const{data}=await supabase.from('lessons').insert({student_id,date,start_hour,start_min,duration,subject,topic,is_recurring,recurring_day,recurring_end_date,status:os||'scheduled',user_id:user.id}).select('*, homework(*), files(*)').single();if(data)setLessons(p=>[...p,data]);},`${st?.name||''} 반복수업 삭제`);}
    }else{
      const oldEnd=les.recurring_end_date;
      const{error}=await supabase.from('lessons').update({recurring_end_date:viewDate}).eq('id',id);
      if(error){toast?.('수업 수정에 실패했습니다','error');return;}
      setLessons(p=>p.map(l=>l.id===id?{...l,recurring_end_date:viewDate}:l));setMO(false);setEL(null);setCtx(null);
      pushUndo(async()=>{await supabase.from('lessons').update({recurring_end_date:oldEnd||null}).eq('id',id);setLessons(p=>p.map(l=>l.id===id?{...l,recurring_end_date:oldEnd||null}:l));},`${st?.name||''} 이후 반복 삭제`);
    }
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
    const les=lessons.find(l=>l.id===id);
    const{finalHw}=await syncHomework(id, les?.homework||[], data.hw||[]);
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
    let rafId=null;
    const mv=ev=>{movedRef.current=true;if(rafId)return;rafId=requestAnimationFrame(()=>{rafId=null;const gy=ev.clientY-r.top+g.scrollTop,gx=ev.clientX-r.left;const raw=y2m(gy)-off,sn=s5(raw);const nh=Math.floor(sn/60),nm=sn%60;const di=x2d(gx,r),nd=fd(wk[di]),dw=wk[di].getDay();
      lastPos={start_hour:Math.max(0,Math.min(23,nh)),start_min:Math.max(0,nm),date:nd,recurring_day:l.is_recurring?(dw===0?7:dw):l.recurring_day};
      setLessons(p=>p.map(x=>x.id===l.id?{...x,...lastPos}:x));});};
    const up=async()=>{const did=movedRef.current;dragRef.current=null;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);
      if(!did){
        const lesData=lessons.find(x=>x.id===l.id);if(lesData){if(!lesData.student_id){setEL({...lesData,student_id:null});setMO(true);}else{await openDetail(lesData,viewDate);}}
      }else if(lastPos){
        const cf=checkConflict(lastPos.date,lastPos.start_hour,lastPos.start_min,l.duration,l.id);
        if(cf){setLessons(p=>p.map(x=>x.id===l.id?{...x,...origPos}:x));return;}
        await supabase.from('lessons').update(lastPos).eq('id',l.id);
        const lid=l.id,op={...origPos};const st=getStu(l.student_id);
        pushUndo(async()=>{await supabase.from('lessons').update(op).eq('id',lid);setLessons(p=>p.map(x=>x.id===lid?{...x,...op}:x));},`${st?.name||''} 수업 이동`);
      }
    };
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };

  const onRC=(e,l,vd)=>{e.preventDefault();e.stopPropagation();setCtx({x:e.clientX,y:e.clientY,l,vd});};
  const delSingle=async(id,viewDate)=>{const les=lessons.find(l=>l.id===id);if(!les){setMO(false);setEL(null);setCtx(null);return;}const st=getStu(les.student_id);const prev=Array.isArray(les.recurring_exceptions)?les.recurring_exceptions:[];const exc=[...prev,viewDate];const{error}=await supabase.from('lessons').update({recurring_exceptions:exc}).eq('id',id);if(error){toast?.('수업 삭제에 실패했습니다','error');return;}setLessons(p=>p.map(l=>l.id===id?{...l,recurring_exceptions:exc}:l));setMO(false);setEL(null);setCtx(null);pushUndo(async()=>{await supabase.from('lessons').update({recurring_exceptions:prev}).eq('id',id);setLessons(p=>p.map(l=>l.id===id?{...l,recurring_exceptions:prev}:l));},`${st?.name||''} 이 수업 삭제`);};

  const onGD=(e,di)=>{
    if(dragRef.current)return;const g=gridRef.current;if(!g)return;const r=g.getBoundingClientRect(),hOff=e.currentTarget.getBoundingClientRect().top-r.top+g.scrollTop,y=e.clientY-r.top+g.scrollTop-hOff;
    const anc=s5(y2m(y));movedRef.current=false;dragRef.current={t:"c",di,anc,hOff};setDC({di,s:anc,e:anc+SMN});
    let rafId2=null;
    const mv=ev=>{movedRef.current=true;if(rafId2)return;rafId2=requestAnimationFrame(()=>{rafId2=null;const dc=dragRef.current;if(!dc||dc.t!=="c")return;const gy=ev.clientY-r.top+g.scrollTop-dc.hOff,cm=s5(y2m(gy));setDC({di:dc.di,s:Math.min(dc.anc,cm),e:Math.max(dc.anc,cm)+SMN});});};
    const up=()=>{const dc=dragRef.current;dragRef.current=null;window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);
      setDC(prev=>{const st=prev||{s:dc?.anc||0,e:(dc?.anc||0)+SMN};if(st.e-st.s>=SMN){const h=Math.floor(st.s/60),m=st.s%60,dur=st.e-st.s;setEL({date:fd(wk[dc.di]),start_hour:h,start_min:m,duration:dur,subject:"수학",topic:"",is_recurring:false});setMO(true);}return null;});
    };
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  };

  /* Swipe & wheel navigation */
  const onTS=e=>{if(e.touches.length===1)swipeRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};};
  const onTE=e=>{if(!swipeRef.current)return;const dx=e.changedTouches[0].clientX-swipeRef.current.x,dy=e.changedTouches[0].clientY-swipeRef.current.y,dt=Date.now()-swipeRef.current.t;swipeRef.current=null;if(Math.abs(dx)>25&&Math.abs(dx)>Math.abs(dy)&&dt<600){if(isMobile&&viewMode==='week'){const dir=dx<0?1:-1;const next=mobileDay+dir;if(next<0){nW(-1);setMobileDay(6);}else if(next>6){nW(1);setMobileDay(0);}else{setSlide(dir>0?'r':'l');setAnim(k=>k+1);setMobileDay(next);}}else{nW(dx<0?1:-1);}}};
  const wheelAcc=useRef(0);const wheelTimer=useRef(null);
  const onWh=e=>{if(Math.abs(e.deltaX)<Math.abs(e.deltaY))return;e.preventDefault();wheelAcc.current+=e.deltaX;clearTimeout(wheelTimer.current);wheelTimer.current=setTimeout(()=>{if(Math.abs(wheelAcc.current)>30)nW(wheelAcc.current>0?1:-1);wheelAcc.current=0;},50);};
  useEffect(()=>{const g=gridRef.current;if(!g)return;g.addEventListener('wheel',onWh,{passive:false});return()=>{g.removeEventListener('wheel',onWh);clearTimeout(wheelTimer.current);clearTimeout(lpRef.current);};},[cur]);
  // Auto-scroll to current time on mount
  const scrolledRef=useRef(false);
  useEffect(()=>{if(scrolledRef.current||!gridRef.current||loading)return;scrolledRef.current=true;const nowM=new Date().getHours()*60+new Date().getMinutes();const stM=stH*60;if(nowM>stM){const tp=((nowM-stM)/SMN)*SHT;gridRef.current.scrollTop=Math.max(0,tp-100);};},[loading]);

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);
  if(fetchError)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:14,color:C.dn}}>데이터를 불러오지 못했습니다</div><button onClick={fetchData} style={{padding:"8px 20px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,color:C.tp,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>다시 시도</button></div>);

  const cms={padding:"7px 12px",fontSize:12,cursor:"pointer",borderRadius:6,color:C.tp,background:"transparent",border:"none",width:"100%",textAlign:"left",fontFamily:"inherit"};

  return(
    <div className="sch-container" style={{minHeight:"100vh",background:C.bg,padding:28}} onClick={()=>ctxMenu&&setCtx(null)}>
      <style>{`.lb{cursor:grab;transition:box-shadow .12s,transform .1s;}.lb:hover{box-shadow:0 4px 12px rgba(0,0,0,.12);transform:scale(1.02);}.nb{transition:all .1s;cursor:pointer;border:none;background:none;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:8px;color:${C.ts};min-height:44px;min-width:44px;}.nb:hover{background:${C.sfh};}.cm-i{transition:background .1s;min-height:44px;}.cm-i:hover{background:${C.sfh};}@keyframes wkR{from{transform:translateX(50px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes wkL{from{transform:translateX(-50px);opacity:0}to{transform:translateX(0);opacity:1}}.wk-r{animation:wkR .2s ease-out}.wk-l{animation:wkL .2s ease-out}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@media(hover:hover){.mc-cell:hover{background:${C.sfh}!important;}}.mc-cell:active{background:${C.sfh}!important;}@media(max-width:768px){.sch-container{padding:12px!important;}.sch-header{padding:12px 14px!important;}.sch-header-title{font-size:15px!important;}.sch-header-sub{font-size:11px!important;}.sch-filter-row{display:none!important;}.sch-dur-btn{min-height:44px;min-width:44px;}select,input[type="date"],input[type="number"]{min-height:44px;}.sch-week-grid>div{min-width:0!important;}}`}</style>

      {/* Header */}
      <div className="sch-header" style={{background:C.sf,borderBottom:`1px solid ${C.bd}`,padding:"16px 24px",position:"sticky",top:0,zIndex:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>{tog}<h2 className="sch-header-title" style={{fontSize:18,fontWeight:700,color:C.tp}}>수업 일정</h2><span className="sch-header-sub" style={{fontSize:13,color:C.ts}}>{viewMode==='month'?`${cur.getFullYear()}년 ${cur.getMonth()+1}월`:`${wk[0].getMonth()+1}/${wk[0].getDate()} ~ ${wk[6].getMonth()+1}/${wk[6].getDate()}`}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button className="nb" onClick={()=>nW(-1)}><IcL/></button>
            <button onClick={()=>{setCur(new Date());const d=new Date().getDay();setMobileDay(d===0?6:d-1);}} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,fontSize:12,cursor:"pointer",color:C.ts,fontFamily:"inherit",minHeight:44}}>오늘</button>
            <button className="nb" onClick={()=>nW(1)}><IcR/></button>
            <div style={{display:"flex",border:`1px solid ${C.bd}`,borderRadius:8,overflow:"hidden",marginLeft:4}}>
              <button onClick={()=>changeViewMode('week')} style={{padding:"5px 10px",fontSize:11,fontWeight:viewMode==='week'?700:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:viewMode==='week'?C.pr:'transparent',color:viewMode==='week'?'#fff':C.ts,minHeight:44}}>주간</button>
              <button onClick={()=>changeViewMode('month')} style={{padding:"5px 10px",fontSize:11,fontWeight:viewMode==='month'?700:500,border:"none",cursor:"pointer",fontFamily:"inherit",background:viewMode==='month'?C.pr:'transparent',color:viewMode==='month'?'#fff':C.ts,borderLeft:`1px solid ${C.bd}`,minHeight:44}}>월간</button>
            </div>
            {viewMode==='month'&&<button onClick={()=>setCompact(!compact)} style={{padding:"5px 10px",fontSize:11,fontWeight:500,border:`1px solid ${C.bd}`,cursor:"pointer",fontFamily:"inherit",background:compact?C.al:'transparent',color:compact?C.ac:C.ts,borderRadius:8,minHeight:44}}>{compact?"확대":"축소"}</button>}
            <button onClick={()=>{setEL(null);setMO(true);}} style={{display:"flex",alignItems:"center",gap:4,background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",minHeight:44}}><IcP/> 수업 추가</button>
          </div>
        </div>
        <div className="sch-filter-row" style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
          {students.filter(st=>!st.archived).map(st=>{const c=SC[(st.color_index||0)%8];const dim=activeStu&&activeStu!==st.id;const sel=activeStu===st.id;return(<div key={st.id} onClick={()=>toggleStu(st.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 8px",borderRadius:6,background:dim?C.sfh:c.bg,fontSize:11,fontWeight:sel?700:500,color:dim?C.tt:c.t,cursor:"pointer",opacity:dim?.4:1,transition:"all .15s",border:sel?`1.5px solid ${c.b}`:"1.5px solid transparent",minHeight:44}}><div style={{width:7,height:7,borderRadius:"50%",background:dim?C.tt:c.b}}/>{st.name}</div>);})}
          <span style={{fontSize:10,color:C.tt,background:C.sfh,padding:"3px 8px",borderRadius:4}}>{viewMode==='month'?'클릭: 해당 주간으로 이동':'좌클릭: 상세 · 우클릭: 메뉴 · 드래그: 이동/생성'}</span>
          {activeStu&&<button onClick={()=>setActive(null)} style={{fontSize:10,color:C.ac,background:C.al,border:`1px solid ${C.ac}`,borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:"inherit",fontWeight:600,minHeight:44}}>전체 보기</button>}
          {viewMode==='week'&&<div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto",fontSize:11,color:C.ts}}>
            <select value={stH} onChange={e=>{const v=+e.target.value;setStH(v);localStorage.setItem('sch_stH',v);if(v>=enH){setEnH(v+1);localStorage.setItem('sch_enH',v+1);}}} style={{padding:"2px 4px",borderRadius:4,border:`1px solid ${C.bd}`,fontSize:11,color:C.ts,background:C.sf,fontFamily:"inherit",cursor:"pointer",minHeight:44}}>{Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
            <span>~</span>
            <select value={enH} onChange={e=>{const v=+e.target.value;setEnH(v);localStorage.setItem('sch_enH',v);}} style={{padding:"2px 4px",borderRadius:4,border:`1px solid ${C.bd}`,fontSize:11,color:C.ts,background:C.sf,fontFamily:"inherit",cursor:"pointer",minHeight:44}}>{Array.from({length:24-stH},(_,i)=>i+stH+1).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
          </div>}
          <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:viewMode==='week'?0:"auto",fontSize:11,color:C.ts,position:"relative"}}>
            <span style={{color:C.tt,fontSize:10}}>프리셋:</span>
            {!dpEdit?<>{durPresets.map(v=><span key={v} style={{background:C.sfh,borderRadius:4,padding:"2px 5px",fontSize:10}}>{v}분</span>)}<button onClick={()=>setDPE(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:C.ac,fontFamily:"inherit",padding:"2px 4px"}}>편집</button></>
            :<>{durPresets.map((v,i)=><input key={i} type="number" value={v} onChange={e=>{const n=[...durPresets];n[i]=Math.max(5,+e.target.value||0);setDP(n);}} style={{width:44,padding:"2px 4px",borderRadius:4,border:`1px solid ${C.bd}`,fontSize:10,color:C.ts,background:C.sf,fontFamily:"inherit",textAlign:"center"}} step="5"/>)}<button onClick={()=>{localStorage.setItem('sch_durPresets',JSON.stringify(durPresets));setDPE(false);}} style={{background:C.pr,color:"#fff",border:"none",borderRadius:4,padding:"2px 6px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>저장</button></>}
          </div>
        </div>
      </div>

      {/* Monthly grid */}
      {viewMode==='month'&&(()=>{const mDays=gMonthDays();const cm=cur.getMonth();return(
        <div key={animKey} className={slideDir==='r'?'wk-r':slideDir==='l'?'wk-l':''} style={{padding:"0 24px 24px"}} onTouchStart={onTS} onTouchEnd={onTE}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:0,border:`1px solid ${C.bd}`,borderRadius:12,overflow:"hidden",background:C.sf}}>
            {DK.map(d=><div key={d} style={{padding:"8px 0",textAlign:"center",fontSize:12,fontWeight:600,color:C.tt,background:C.sfh,borderBottom:`1px solid ${C.bd}`}}>{d}</div>)}
            {mDays.map((d,i)=>{const isM=d.getMonth()===cm;const it=sdy(d,today);const ds=fd(d);const dl=gL(d).filter(l=>l.student_id);const cnt=dl.filter(l=>effSt(l,ds)!=='cancelled'&&(!activeStu||l.student_id===activeStu)).length;
              return(<div key={i} className="mc-cell" onClick={()=>{setCur(d);changeViewMode('week');if(isMobile){const dw=d.getDay();setMobileDay(dw===0?6:dw-1);}}} style={{minHeight:compact?44:90,padding:compact?4:6,borderRight:(i%7<6)?`1px solid ${C.bl}`:"none",borderBottom:`1px solid ${C.bl}`,background:it?C.as:isM?"transparent":"#FAFAF8",cursor:"pointer",transition:"background .1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:it?700:isM?500:400,color:it?C.ac:isM?C.tp:C.tt,width:it?24:undefined,height:it?24:undefined,borderRadius:"50%",background:it?C.ac:"transparent",color:it?"#fff":isM?C.tp:C.tt,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{d.getDate()}</span>
                  {cnt>0&&<span style={{fontSize:10,fontWeight:600,color:C.ac,background:C.al,borderRadius:4,padding:"1px 5px"}}>{cnt}건</span>}
                </div>
                {isM&&!compact&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {dl.sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min)).slice(0,3).map(l=>{const co=gCo(l.student_id);const st=getStu(l.student_id);const ls=effSt(l,ds);const isCan=ls==='cancelled';const dim=activeStu&&l.student_id!==activeStu;return(
                    <div key={l.id} style={{fontSize:10,padding:"1px 4px",borderRadius:4,background:isCan||dim?C.sfh:co.bg,color:isCan||dim?C.tt:co.t,fontWeight:500,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",opacity:isCan?.5:dim?.3:1,textDecoration:isCan?'line-through':'none'}}>{p2(l.start_hour)}:{p2(l.start_min)} {st?.name||""}{ls==='completed'?' ✓':''}</div>);
                  })}
                  {dl.length>3&&<div style={{fontSize:9,color:C.tt,paddingLeft:4}}>+{dl.length-3}건</div>}
                </div>}
                {isM&&compact&&cnt>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:2}}>{dl.filter(l=>(!activeStu||l.student_id===activeStu)&&effSt(l,ds)!=='cancelled').slice(0,4).map((l,idx)=>{const co=gCo(l.student_id);return <div key={l.id+'-'+idx} style={{width:6,height:6,borderRadius:"50%",background:co.b}}/>;})}{dl.filter(l=>(!activeStu||l.student_id===activeStu)&&effSt(l,ds)!=='cancelled').length>4&&<span style={{fontSize:8,color:C.tt}}>+</span>}</div>}
              </div>);
            })}
          </div>
        </div>);
      })()}

      {/* Weekly grid */}
      {viewMode==='week'&&!isMobile&&<div ref={gridRef} className="sch-week-grid" style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 120px)",userSelect:"none",WebkitOverflowScrolling:"touch"}} onTouchStart={onTS} onTouchEnd={onTE}>
        <div key={animKey} className={slideDir==='r'?'wk-r':slideDir==='l'?'wk-l':''} style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",minWidth:800}}>
          {/* Header row */}
          <div style={{borderBottom:`1px solid ${C.bd}`,borderRight:`1px solid ${C.bl}`,background:C.sf,position:"sticky",top:0,zIndex:12}}/>
          {wk.map((d,i)=>{const it=sdy(d,today);return(
            <div key={i} style={{padding:"10px 8px",textAlign:"center",borderBottom:`1px solid ${C.bd}`,borderRight:i<6?`1px solid ${C.bl}`:"none",background:it?C.as:C.sf,position:"sticky",top:0,zIndex:12}}>
              <div style={{fontSize:12,color:it?C.ac:C.tt,fontWeight:500}}>{DK[i]}</div>
              <div style={{fontSize:18,fontWeight:700,marginTop:2,width:it?30:undefined,height:it?30:undefined,borderRadius:"50%",background:it?C.ac:"transparent",color:it?"#fff":C.tp,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{d.getDate()}</div>
            </div>);})}

          {/* Time column */}
          <div style={{borderRight:`1px solid ${C.bl}`,position:"relative"}}>
            {hrs.map(h=>(<div key={h} style={{height:SHT*4,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"2px 8px 0 0",fontSize:11,color:C.tt,fontWeight:500,borderBottom:`1px solid ${C.bl}`}}>{p2(h)}:00</div>))}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"2px 8px 0 0",fontSize:11,color:C.tt,fontWeight:500}}>{p2(enH)}:00</div>
            {(()=>{const nowM=new Date().getHours()*60+new Date().getMinutes();const stM=stH*60,enM=enH*60;if(nowM>=stM&&nowM<=enM){const tp=((nowM-stM)/SMN)*SHT;return(<div style={{position:"absolute",top:tp,right:4,transform:"translateY(-50%)",fontSize:9,fontWeight:700,color:C.ac,opacity:.7,pointerEvents:"none"}}>{p2(Math.floor(nowM/60))}:{p2(nowM%60)}</div>);}return null;})()}
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
                {dl.map(l=>{const isPers=!l.student_id;const co=gCo(l.student_id);const st=getStu(l.student_id);const tp=((l.start_hour*60+l.start_min)-stH*60)/SMN*SHT;const hp=Math.max(l.duration/SMN*SHT,SHT);
                  const isOrig=!l.is_recurring||l.date===fd(date);
                  const lSt=effSt(l,fd(date));const isCan=lSt==='cancelled';const dim=activeStu&&l.student_id&&l.student_id!==activeStu;
                  return(
                    <div key={l.id} className="lb" onMouseDown={e=>onLD(e,l,date)} onContextMenu={e=>onRC(e,l,date)} style={{position:"absolute",top:tp,left:3,right:3,height:hp-2,borderRadius:8,background:isPers?"rgba(156,163,175,.12)":isCan||dim?C.sfh:co.bg,borderLeft:`3px solid ${isPers?"#9CA3AF":isCan||dim?C.bd:co.b}`,padding:"4px 8px",overflow:"hidden",zIndex:isPers?2:dim?1:3,opacity:isPers?.6:isCan?.45:dim?.25:1,transition:"opacity .15s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontSize:11,fontWeight:600,color:isPers?"#6B7280":isCan?C.tt:co.t,textDecoration:isCan?'line-through':'none'}}>{isPers?(l.subject||l.topic||"개인 일정"):st?.name||""}</span>
                        {!isPers&&<span style={{fontSize:8,fontWeight:700,color:LSTATUS[lSt]?.c,background:LSTATUS[lSt]?.bg,borderRadius:3,padding:"1px 4px",lineHeight:"14px"}}>{LSTATUS[lSt]?.l}</span>}
                        {!isPers&&isOrig&&(l.homework||[]).length>0&&<span style={{fontSize:9,background:co.t,color:co.bg,borderRadius:4,padding:"0 4px",fontWeight:600}}>{(l.homework||[]).length}</span>}
                      </div>
                      {hp>32&&<div style={{fontSize:10,color:isPers?"#9CA3AF":isCan?C.tt:co.t,opacity:.7,marginTop:1,textDecoration:isCan?'line-through':'none'}}>{isPers?(l.topic||""):(isOrig?(l.topic||""):(l.subject||""))}</div>}
                      {hp>48&&<div style={{fontSize:10,color:isPers?"#9CA3AF":isCan?C.tt:co.t,opacity:.6,marginTop:1}}>{p2(l.start_hour)}:{p2(l.start_min)} · {l.duration}분</div>}
                    </div>
                  );
                })}
                {/* Current time indicator */}
                {it&&(()=>{const nowM=new Date().getHours()*60+new Date().getMinutes();const stM=stH*60,enM=enH*60;if(nowM>=stM&&nowM<=enM){const tp=((nowM-stM)/SMN)*SHT;return(<div style={{position:"absolute",top:tp-0.5,left:0,right:0,zIndex:10,pointerEvents:"none",height:1,background:C.ac,opacity:.45}}/>);}return null;})()}
              </div>
            );
          })}
        </div>
      </div>}

      {/* Mobile weekly view — day selector + single day column */}
      {viewMode==='week'&&isMobile&&(()=>{
        const selDate=wk[mobileDay];const selDl=gL(selDate);const selIt=sdy(selDate,today);const vd=fd(selDate);
        return(
        <div onTouchStart={onTS} onTouchEnd={onTE}>
          {/* Day selector pills */}
          <div style={{display:"flex",gap:4,padding:"8px 4px",overflowX:"auto",WebkitOverflowScrolling:"touch",position:"sticky",top:0,zIndex:15,background:C.bg}}>
            {wk.map((d,i)=>{const it=sdy(d,today);const sel=i===mobileDay;const cnt=gL(d).filter(l=>l.student_id&&effSt(l,fd(d))!=='cancelled'&&(!activeStu||l.student_id===activeStu)).length;
              return(
              <button key={i} onClick={()=>{setSlide(i>mobileDay?'r':'l');setAnim(k=>k+1);setMobileDay(i);}} style={{flex:1,minWidth:44,padding:"8px 4px",borderRadius:12,border:sel?`2px solid ${C.ac}`:`1px solid ${it?C.ac:C.bd}`,background:sel?C.as:it?"rgba(37,99,235,.05)":C.sf,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontFamily:"inherit",transition:"all .15s"}}>
                <span style={{fontSize:11,fontWeight:sel?700:500,color:sel?C.ac:it?C.ac:C.tt}}>{DK[i]}</span>
                <span style={{fontSize:16,fontWeight:700,color:sel?C.ac:C.tp,...(it&&!sel?{width:26,height:26,borderRadius:"50%",background:C.ac,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14}:{})}}>{d.getDate()}</span>
                {cnt>0&&<span style={{fontSize:9,fontWeight:600,color:sel?C.ac:C.ts,background:sel?C.al:C.sfh,borderRadius:4,padding:"1px 5px"}}>{cnt}건</span>}
              </button>);
            })}
          </div>

          {/* Mobile student filter + settings */}
          <div style={{display:"flex",alignItems:"center",padding:"4px 4px 8px",gap:6}}>
            <div style={{flex:1,display:"flex",gap:6,overflowX:"auto",WebkitOverflowScrolling:"touch",minWidth:0}}>
              {students.filter(st=>!st.archived).map(st=>{const c=SC[(st.color_index||0)%8];const dim=activeStu&&activeStu!==st.id;const sel=activeStu===st.id;return(
                <button key={st.id} onClick={()=>toggleStu(st.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:6,background:dim?C.sfh:c.bg,fontSize:10,fontWeight:sel?700:500,color:dim?C.tt:c.t,cursor:"pointer",opacity:dim?.4:1,border:sel?`1.5px solid ${c.b}`:"1.5px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}><div style={{width:6,height:6,borderRadius:"50%",background:dim?C.tt:c.b}}/>{st.name}</button>);
              })}
              {activeStu&&<button onClick={()=>setActive(null)} style={{fontSize:10,color:C.ac,background:C.al,border:`1px solid ${C.ac}`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit",fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>전체</button>}
            </div>
            <button onClick={()=>setMTS(!mTimeSet)} style={{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:8,border:`1px solid ${mTimeSet?C.ac:C.bd}`,background:mTimeSet?C.as:"transparent",cursor:"pointer",flexShrink:0,color:mTimeSet?C.ac:C.ts,fontSize:14,fontFamily:"inherit"}}>&#9881;</button>
          </div>
          {mTimeSet&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px 10px",background:C.sfh,borderRadius:10,margin:"0 4px 8px"}}>
            <span style={{fontSize:11,color:C.ts,flexShrink:0}}>시간대</span>
            <select value={stH} onChange={e=>{const v=+e.target.value;setStH(v);localStorage.setItem('sch_stH',v);if(v>=enH){setEnH(v+1);localStorage.setItem('sch_enH',v+1);}}} style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${C.bd}`,fontSize:12,color:C.ts,background:C.sf,fontFamily:"inherit",minHeight:36}}>{Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
            <span style={{fontSize:12,color:C.tt}}>~</span>
            <select value={enH} onChange={e=>{const v=+e.target.value;setEnH(v);localStorage.setItem('sch_enH',v);}} style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${C.bd}`,fontSize:12,color:C.ts,background:C.sf,fontFamily:"inherit",minHeight:36}}>{Array.from({length:24-stH},(_,i)=>i+stH+1).map(h=><option key={h} value={h}>{p2(h)}:00</option>)}</select>
          </div>}

          {/* Single day time grid */}
          <div ref={gridRef} key={animKey} className={slideDir==='r'?'wk-r':slideDir==='l'?'wk-l':''} style={{overflowY:"auto",maxHeight:"calc(100vh - 200px)",WebkitOverflowScrolling:"touch"}}>
            <div style={{display:"grid",gridTemplateColumns:"44px 1fr"}}>
              {/* Time labels */}
              <div style={{borderRight:`1px solid ${C.bl}`}}>
                {hrs.map(h=>(<div key={h} style={{height:SHT*4,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"2px 6px 0 0",fontSize:10,color:C.tt,fontWeight:500,borderBottom:`1px solid ${C.bl}`}}>{p2(h)}</div>))}
              </div>
              {/* Day column — tap empty area to add lesson (mobile: no drag) */}
              <div
                onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();const y=e.clientY-r.top;const raw=stH*60+Math.round(y/SHT)*SMN;const anc=s5(raw);const h=Math.floor(anc/60),mn=anc%60;setEL({date:vd,start_hour:Math.max(0,Math.min(23,h)),start_min:Math.max(0,mn),duration:durPresets[0]||90,subject:"",topic:"",is_recurring:false});setMO(true);}}
                style={{position:"relative",height:tH,background:selIt?"rgba(37,99,235,.02)":"transparent",touchAction:"auto"}}>
                {hrs.map((h,i)=>(<div key={h} style={{position:"absolute",top:i*SHT*4,left:0,right:0,height:SHT*4,borderBottom:`1px solid ${C.bl}`,pointerEvents:"none"}}><div style={{position:"absolute",top:SHT*2-1,left:0,right:0,height:1,background:C.bl,opacity:.5}}/></div>))}
                {selDl.map(l=>{const isPers=!l.student_id;const co=gCo(l.student_id);const st=getStu(l.student_id);const tp=((l.start_hour*60+l.start_min)-stH*60)/SMN*SHT;const hp=Math.max(l.duration/SMN*SHT,SHT);
                  const isOrig=!l.is_recurring||l.date===fd(selDate);
                  const lSt=effSt(l,fd(selDate));const isCan=lSt==='cancelled';const dim=activeStu&&l.student_id&&l.student_id!==activeStu;
                  return(
                    <div key={l.id}
                      onTouchStart={e=>{lpFired.current=false;const t=e.touches[0];lpStartRef.current={x:t.clientX,y:t.clientY};lpRef.current=setTimeout(()=>{lpFired.current=true;if(navigator.vibrate)navigator.vibrate(30);setCtx({l,vd:selDate,mobile:true});},500);}}
                      onTouchMove={e=>{if(!lpStartRef.current)return;const t=e.touches[0];if(Math.abs(t.clientX-lpStartRef.current.x)>10||Math.abs(t.clientY-lpStartRef.current.y)>10){clearTimeout(lpRef.current);lpRef.current=null;}}}
                      onTouchEnd={()=>{clearTimeout(lpRef.current);lpRef.current=null;}}
                      onClick={e=>{e.stopPropagation();if(lpFired.current){lpFired.current=false;return;}if(isPers){setEL({...l,student_id:null});setMO(true);}else{openDetail(l,vd);}}}
                      style={{position:"absolute",top:tp,left:4,right:4,height:hp-2,borderRadius:10,background:isPers?"rgba(156,163,175,.12)":isCan||dim?C.sfh:co.bg,borderLeft:`4px solid ${isPers?"#9CA3AF":isCan||dim?C.bd:co.b}`,padding:"6px 10px",overflow:"hidden",zIndex:isPers?2:dim?1:3,opacity:isPers?.6:isCan?.45:dim?.25:1,cursor:"pointer",transition:"opacity .15s",WebkitUserSelect:"none",userSelect:"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13,fontWeight:600,color:isPers?"#6B7280":isCan?C.tt:co.t,textDecoration:isCan?'line-through':'none'}}>{isPers?(l.subject||l.topic||"개인 일정"):st?.name||""}</span>
                        {!isPers&&<span style={{fontSize:9,fontWeight:700,color:LSTATUS[lSt]?.c,background:LSTATUS[lSt]?.bg,borderRadius:3,padding:"1px 5px",lineHeight:"16px"}}>{LSTATUS[lSt]?.l}</span>}
                        {!isPers&&isOrig&&(l.homework||[]).length>0&&<span style={{fontSize:10,background:co.t,color:co.bg,borderRadius:4,padding:"0 5px",fontWeight:600}}>{(l.homework||[]).length}</span>}
                      </div>
                      <div style={{fontSize:11,color:isPers?"#9CA3AF":isCan?C.tt:co.t,opacity:.7,marginTop:2,textDecoration:isCan?'line-through':'none'}}>{isPers?(l.topic||""):(isOrig?(l.topic||l.subject||""):(l.subject||""))}</div>
                      <div style={{fontSize:11,color:isPers?"#9CA3AF":isCan?C.tt:co.t,opacity:.6,marginTop:1}}>{p2(l.start_hour)}:{p2(l.start_min)} ~ {m2s(l.start_hour*60+l.start_min+l.duration)} ({l.duration}분)</div>
                    </div>
                  );
                })}
                {/* Current time indicator (mobile) */}
                {selIt&&(()=>{const nowM=new Date().getHours()*60+new Date().getMinutes();const stM=stH*60,enM=enH*60;if(nowM>=stM&&nowM<=enM){const tp=((nowM-stM)/SMN)*SHT;return(<div style={{position:"absolute",top:tp-0.5,left:0,right:0,zIndex:10,pointerEvents:"none",height:1,background:C.ac,opacity:.45}}/>);}return null;})()}
              </div>
            </div>
          </div>
        </div>);
      })()}

      {/* Context Menu — Desktop: positioned dropdown */}
      {ctxMenu&&!isMobile&&<>
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
              const cur=effSt(ctxMenu.l,fd(ctxMenu.vd))===k;
              return(<button key={k} onClick={()=>updStatus(k)} style={{fontSize:10,fontWeight:cur?700:500,color:cur?v.c:C.ts,background:cur?v.bg:'transparent',border:`1px solid ${cur?v.c:C.bd}`,borderRadius:5,padding:"3px 7px",cursor:"pointer",fontFamily:"inherit",minHeight:44}}>{v.l}</button>);
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

      {/* Context Menu — Mobile: bottom sheet */}
      {ctxMenu&&isMobile&&(()=>{const isPers=!ctxMenu.l.student_id;const co=gCo(ctxMenu.l.student_id);const st=getStu(ctxMenu.l.student_id);const mbs={display:"flex",alignItems:"center",gap:10,padding:"14px 16px",fontSize:14,color:C.tp,background:"none",border:"none",width:"100%",textAlign:"left",fontFamily:"inherit",cursor:"pointer",borderRadius:10,minHeight:48};return(<>
        <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,.3)"}} onClick={()=>setCtx(null)}/>
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:51,background:C.sf,borderRadius:"16px 16px 0 0",padding:"12px 16px calc(env(safe-area-inset-bottom,0px) + 16px)",boxShadow:"0 -4px 24px rgba(0,0,0,.12)",animation:"slideUp .2s ease-out"}} onClick={e=>e.stopPropagation()}>
          <div style={{width:36,height:4,borderRadius:2,background:C.bd,margin:"0 auto 16px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"0 4px"}}>
            <div style={{width:36,height:36,borderRadius:9,background:isPers?"#F3F4F6":co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:isPers?"#6B7280":co.t}}>{isPers?"P":(st?.name||"?")[0]}</div>
            <div><div style={{fontSize:15,fontWeight:600,color:C.tp}}>{isPers?"개인 일정":st?.name}</div><div style={{fontSize:12,color:C.ts}}>{ctxMenu.l.subject||"일정"} · {p2(ctxMenu.l.start_hour)}:{p2(ctxMenu.l.start_min)} · {ctxMenu.l.duration}분</div></div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {!isPers&&<button style={mbs} onClick={()=>{openDetail(ctxMenu.l,fd(ctxMenu.vd));setCtx(null);}}><span style={{fontSize:18}}>&#128196;</span>상세 보기</button>}
            <button style={mbs} onClick={()=>{setEL({...ctxMenu.l,_viewDate:fd(ctxMenu.vd),student_id:ctxMenu.l.student_id});setMO(true);setCtx(null);}}><span style={{fontSize:18}}>&#9998;</span>수정</button>
            {!isPers&&<button style={mbs} onClick={copyLesson}><span style={{fontSize:18}}>&#128203;</span>복사</button>}
          </div>
          <div style={{height:1,background:C.bd,margin:"8px 0"}}/>
          <div style={{padding:"8px 4px 4px",fontSize:12,color:C.tt,fontWeight:600}}>상태 변경</div>
          <div style={{display:"flex",gap:6,padding:"8px 4px 12px",flexWrap:"wrap"}}>
            {Object.entries(LSTATUS).map(([k,v])=>{const cur=effSt(ctxMenu.l,fd(ctxMenu.vd))===k;return(<button key={k} onClick={()=>updStatus(k)} style={{fontSize:12,fontWeight:cur?700:500,color:cur?v.c:C.ts,background:cur?v.bg:'transparent',border:`1.5px solid ${cur?v.c:C.bd}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontFamily:"inherit",minHeight:44}}>{v.l}</button>);})}
          </div>
          <div style={{height:1,background:C.bd,margin:"4px 0"}}/>
          <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:4}}>
            {ctxMenu.l.is_recurring?<>
              <button style={{...mbs,color:C.dn}} onClick={()=>{delSingle(ctxMenu.l.id,fd(ctxMenu.vd));}}><span style={{fontSize:18}}>&#128465;</span>이 수업만 삭제</button>
              <button style={{...mbs,color:C.dn}} onClick={()=>{delFuture(ctxMenu.l.id,fd(ctxMenu.vd));}}><span style={{fontSize:18}}>&#128465;</span>이후 반복 삭제</button>
            </>:<button style={{...mbs,color:C.dn}} onClick={()=>{del(ctxMenu.l.id);}}><span style={{fontSize:18}}>&#128465;</span>삭제</button>}
          </div>
          <button onClick={()=>setCtx(null)} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"14px 0",marginTop:8,fontSize:14,fontWeight:600,color:C.ts,background:C.sfh,border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",minHeight:48}}>닫기</button>
        </div>
      </>);})()}

      {mOpen&&<SchModal les={eLes} students={students} onSave={save} onClose={()=>{setMO(false);setEL(null);}} checkConflict={checkConflict} durPresets={durPresets} isMobile={isMobile}/>}
      {dLes&&<LessonDetailModal les={dLes} student={getStu(dLes.student_id)} textbooks={textbooks.filter(t=>t.student_id===dLes.student_id)} onUpdate={updDetail} onClose={()=>setDL(null)}/>}
      {undoToast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:200,background:C.pr,color:"#fff",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:500,boxShadow:"0 4px 16px rgba(0,0,0,.2)",display:"flex",alignItems:"center",gap:10,fontFamily:"inherit",animation:"slideUp .2s ease-out"}}>
        <span>{undoToast}</span>
        {undoStack.current.length>0&&<button onClick={doUndo} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",padding:"4px 10px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>다시 되돌리기</button>}
      </div>}
    </div>
  );
}
