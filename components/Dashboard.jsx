'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import LessonDetailModal from './student/LessonDetailModal'

const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
const DK=["일","월","화","수","목","금","토"];
const DKS=["월","화","수","목","금","토","일"];
const p2=n=>String(n).padStart(2,"0");
const fd=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const gwd=base=>{const d=new Date(base),dy=d.getDay(),df=dy===0?-6:1-dy,m=new Date(d);m.setDate(d.getDate()+df);return Array.from({length:7},(_,i)=>{const t=new Date(m);t.setDate(m.getDate()+i);return t;});};
const BN={prep:"다음 수업 준비",upcoming:"다가오는 수업",unrecorded:"기록 미완료",alerts:"주의 학생",weekChart:"주간 수업",studentList:"학생 근황",tuition:"수업료 요약"};
const DFL={left:["prep","upcoming","studentList"],right:["unrecorded","alerts","weekChart","tuition"],hidden:[]};

export default function Dashboard({onNav,onDetail,menuBtn}){
  const tog=menuBtn;
  const[students,setStudents]=useState([]);
  const[lessons,setLessons]=useState([]);
  const[tuitions,setTuitions]=useState([]);
  const[scores,setScores]=useState([]);
  const[loading,setLoading]=useState(true);
  const[weekOff,setWeekOff]=useState(0);
  const[dLes,setDLes]=useState(null);
  const[editMode,setEditMode]=useState(false);
  const[layout,setLayout]=useState(DFL);
  const[dragId,setDragId]=useState(null);
  const[dropTgt,setDropTgt]=useState(null);

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const[sRes,lRes,tRes,scRes]=await Promise.all([
      supabase.from('students').select('*').order('created_at'),
      supabase.from('lessons').select('*, homework(*)').order('date'),
      supabase.from('tuition').select('*'),
      supabase.from('scores').select('*').order('date'),
    ]);
    setStudents(sRes.data||[]);setLessons(lRes.data||[]);setTuitions(tRes.data||[]);setScores(scRes.data||[]);setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  /* ── Layout persistence ── */
  useEffect(()=>{
    try{const s=localStorage.getItem('dash-layout');if(s){const p=JSON.parse(s);const all=new Set(Object.keys(BN));const has=new Set([...(p.left||[]),...(p.right||[]),...(p.hidden||[])]);
    const miss=[...all].filter(b=>!has.has(b));if(miss.length)p.right=[...(p.right||[]),...miss];
    p.left=(p.left||[]).filter(b=>all.has(b));p.right=(p.right||[]).filter(b=>all.has(b));p.hidden=(p.hidden||[]).filter(b=>all.has(b));setLayout(p);}}catch{}
  },[]);
  const saveLay=l=>{setLayout(l);try{localStorage.setItem('dash-layout',JSON.stringify(l));}catch{}};
  const hideBlock=id=>{saveLay({left:layout.left.filter(b=>b!==id),right:layout.right.filter(b=>b!==id),hidden:[...(layout.hidden||[]),id]});};
  const restoreBlock=id=>{saveLay({...layout,right:[...layout.right,id],hidden:(layout.hidden||[]).filter(b=>b!==id)});};
  const doDrop=()=>{if(!dragId||!dropTgt)return;const nl={left:[...layout.left],right:[...layout.right],hidden:[...(layout.hidden||[])]};nl.left=nl.left.filter(b=>b!==dragId);nl.right=nl.right.filter(b=>b!==dragId);nl.hidden=nl.hidden.filter(b=>b!==dragId);nl[dropTgt.col].splice(dropTgt.idx,0,dragId);saveLay(nl);setDragId(null);setDropTgt(null);};

  const mkLes=l=>({...l,sh:l.start_hour,sm:l.start_min,dur:l.duration,sub:l.subject,top:l.topic,rep:l.is_recurring,tMemo:l.private_memo||"",hw:l.homework||[],files:l.files||[]});
  const updDetail=async(id,data)=>{
    const u={};
    if(data.top!==undefined)u.topic=data.top;if(data.content!==undefined)u.content=data.content;
    if(data.feedback!==undefined)u.feedback=data.feedback;if(data.tMemo!==undefined)u.private_memo=data.tMemo;
    if(data.planShared!==undefined)u.plan_shared=data.planShared;if(data.planPrivate!==undefined)u.plan_private=data.planPrivate;
    if(Object.keys(u).length)await supabase.from('lessons').update(u).eq('id',id);
    const les=lessons.find(l=>l.id===id);const oldHw=les?.homework||[],newHw=data.hw||[];
    const toDel=oldHw.filter(h=>!newHw.some(n=>n.id===h.id));
    const toIns=newHw.filter(h=>!oldHw.some(o=>o.id===h.id));
    const toUpd=newHw.filter(h=>oldHw.some(o=>o.id===h.id));
    if(toDel.length)await supabase.from('homework').delete().in('id',toDel.map(h=>h.id));
    if(toIns.length)await supabase.from('homework').insert(toIns.map(h=>({lesson_id:id,title:h.title,completion_pct:h.completion_pct||0,note:h.note||""}))).select();
    for(const h of toUpd)await supabase.from('homework').update({title:h.title,completion_pct:h.completion_pct||0,note:h.note||""}).eq('id',h.id);
    fetchData();
  };

  /* ── Derived data ── */
  const activeStudents=students.filter(s=>!s.archived);
  const today=new Date();
  const wkBase=new Date(today);wkBase.setDate(today.getDate()+weekOff*7);
  const wk=gwd(wkBase);
  const curMonth=`${today.getFullYear()}-${p2(today.getMonth()+1)}`;
  const year=today.getFullYear(),month=today.getMonth()+1;

  const lessonOnDate=(l,date)=>{
    const ds=fd(date),dw=date.getDay()===0?7:date.getDay();
    const ld=(l.date||"").slice(0,10);
    if(l.is_recurring&&l.recurring_exceptions&&l.recurring_exceptions.includes(ds))return false;
    if(ld===ds)return true;
    if(l.is_recurring&&+l.recurring_day===dw){if(ds<ld)return false;if(l.recurring_end_date&&ds>=(l.recurring_end_date+"").slice(0,10))return false;return true;}
    return false;
  };

  const todayClasses=lessons.filter(l=>lessonOnDate(l,today)).sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));
  const upcomingDays=[];
  for(let i=1;i<=3;i++){const d=new Date(today);d.setDate(today.getDate()+i);const cls=lessons.filter(l=>lessonOnDate(l,d)).sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));if(cls.length>0)upcomingDays.push({date:d,dayLabel:`${DK[d.getDay()]}요일 (${p2(d.getMonth()+1)}/${p2(d.getDate())})`,classes:cls});}
  const weekData=wk.map((d,i)=>{const cnt=lessons.filter(l=>lessonOnDate(l,d)).length;return{day:DKS[i],c:cnt};});
  const todayIdx=weekOff===0?(today.getDay()===0?6:today.getDay()-1):-1;

  const countMonthLessons=(sid)=>{const dim=new Date(year,month,0).getDate();let cnt=0;for(let d=1;d<=dim;d++){const dt=new Date(year,month-1,d);cnt+=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,dt)).length;}return cnt;};
  const autoStatus=(amt,due)=>amt>=due?"paid":amt>0?"partial":"unpaid";
  const monthRecs=activeStudents.map(s=>{const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);const lessonCnt=countMonthLessons(s.id);const autoFee=(s.fee_per_class||0)*lessonCnt;const carryover=rec?.carryover||0;const autoTotalDue=autoFee+carryover;const totalDue=(rec&&rec.fee_override!=null)?rec.fee_override:autoTotalDue;const paidAmount=rec?.amount||0;const status=autoStatus(paidAmount,totalDue);return{student:s,totalDue,paidAmount,status};});
  const totalFee=monthRecs.reduce((a,r)=>a+r.totalDue,0);
  const unpaidAmount=monthRecs.reduce((a,r)=>r.status!=="paid"?a+Math.max(0,r.totalDue-r.paidAmount):a,0);

  const getStu=sid=>students.find(x=>x.id===sid);
  const getCol=sid=>{const s=getStu(sid);return SC[(s?.color_index||0)%8];};

  const getNextClass=(sid)=>{for(let offset=0;offset<14;offset++){const d=new Date(today);d.setDate(today.getDate()+offset);const sLessons=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,d));for(const l of sLessons){const lesMin=l.start_hour*60+l.start_min;if(offset===0&&lesMin<=today.getHours()*60+today.getMinutes())continue;return`${DK[d.getDay()]} ${p2(l.start_hour)}:${p2(l.start_min)}`;}}return"-";};

  const getNextLessonPrep=()=>{for(let offset=0;offset<7;offset++){const d=new Date(today);d.setDate(today.getDate()+offset);const dayLessons=lessons.filter(l=>lessonOnDate(l,d)).sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));for(const l of dayLessons){const lesMin=l.start_hour*60+l.start_min;if(offset===0&&lesMin<=today.getHours()*60+today.getMinutes())continue;const stu=getStu(l.student_id);if(!stu||stu.archived)continue;const pastLessons=lessons.filter(pl=>pl.student_id===l.student_id&&pl.id!==l.id&&(pl.date||"")<fd(d)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));const last=pastLessons[0]||null;const lastHw=last?.homework||[];const hwTotal=lastHw.length;const hwDone=lastHw.filter(h=>(h.completion_pct||0)>=100).length;const stuScores=scores.filter(sc=>sc.student_id===l.student_id).sort((a,b)=>(a.date||"").localeCompare(b.date||""));let scoreTrend=null,lastScore=null;if(stuScores.length>=2){const cur=stuScores[stuScores.length-1].score,prev=stuScores[stuScores.length-2].score;scoreTrend=cur>prev?"up":cur<prev?"down":"same";}if(stuScores.length>0)lastScore=stuScores[stuScores.length-1];const dayLabel=offset===0?"오늘":offset===1?"내일":`${DK[d.getDay()]}요일`;return{lesson:l,student:stu,dayLabel,dateStr:`${p2(d.getMonth()+1)}/${p2(d.getDate())}`,last,hwTotal,hwDone,scoreTrend,lastScore};}}return null;};
  const nextPrep=getNextLessonPrep();

  const unrecorded=lessons.filter(l=>{if(l.is_recurring)return false;const ld=new Date((l.date||"").slice(0,10));const diff=(today-ld)/(1000*60*60*24);if(diff<0||diff>14)return false;if(diff<1){const em=l.start_hour*60+l.start_min+l.duration;if(em>today.getHours()*60+today.getMinutes())return false;}return(!l.content||l.content.trim()==="");}).sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  const studentAlerts=[];
  activeStudents.forEach(s=>{const al=[];const stuHw=lessons.filter(l=>l.student_id===s.id).flatMap(l=>l.homework||[]);const recentHw=stuHw.slice(-10);if(recentHw.length>=2){const inc=recentHw.filter(h=>(h.completion_pct||0)<100).length;const rate=Math.round((1-inc/recentHw.length)*100);if(rate<50)al.push({type:"hw",label:`숙제 완료율 ${rate}%`,color:C.dn,bg:C.db});}const stuScores=scores.filter(sc=>sc.student_id===s.id).sort((a,b)=>(a.date||"").localeCompare(b.date||""));if(stuScores.length>=2){const cur=stuScores[stuScores.length-1].score,prev=stuScores[stuScores.length-2].score;if(cur<prev)al.push({type:"score",label:`성적 하락 ${prev}→${cur}`,color:C.wn,bg:C.wb});}if(al.length>0)studentAlerts.push({student:s,alerts:al});});

  const todayLabel=`${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일 ${DK[today.getDay()]}요일`;

  /* ── Block content by ID ── */
  const getBlockContent=(id)=>{
    switch(id){
    case 'prep': return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:600,color:C.tp}}>다음 수업 준비</h3>
          {nextPrep&&<span style={{fontSize:12,color:C.ac,fontWeight:600}}>{nextPrep.dayLabel} {p2(nextPrep.lesson.start_hour)}:{p2(nextPrep.lesson.start_min)}</span>}
        </div>
        {nextPrep?(()=>{const{lesson:nl,student:ns,last,hwTotal,hwDone,scoreTrend,lastScore}=nextPrep;const co=SC[(ns.color_index||0)%8];const em=nl.start_hour*60+nl.start_min+nl.duration;return(
          <div onClick={()=>setDLes(mkLes(nl))} style={{cursor:"pointer",borderRadius:12,border:`1px solid ${C.bl}`,borderLeft:`4px solid ${co.b}`,padding:16}} className="hcard">
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:10,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:co.t}}>{(ns.name||"?")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:700,color:C.tp}}>{ns.name}</div>
                <div style={{fontSize:12,color:C.ts}}>{nl.subject} · {p2(nl.start_hour)}:{p2(nl.start_min)}~{p2(Math.floor(em/60))}:{p2(em%60)}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div onClick={e=>{e.stopPropagation();if(last)setDLes(mkLes(last));}} style={{background:C.bg,borderRadius:8,padding:"10px 12px",cursor:last?"pointer":"default"}}>
                <div style={{fontSize:10,color:C.tt,marginBottom:4}}>지난 수업</div>
                <div style={{fontSize:12,fontWeight:600,color:C.tp}}>{last?.topic||last?.subject||"기록 없음"}</div>
              </div>
              <div onClick={e=>{e.stopPropagation();onDetail(ns,{mainTab:"study",subTab:"homework"});}} style={{background:C.bg,borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
                <div style={{fontSize:10,color:C.tt,marginBottom:4}}>내준 숙제</div>
                <div style={{fontSize:12,fontWeight:600,color:hwTotal===0?C.tt:C.tp}}>{hwTotal===0?"없음":`${hwTotal}건`}</div>
              </div>
              <div onClick={e=>{e.stopPropagation();onDetail(ns,{mainTab:"analysis",subTab:"scores"});}} style={{background:C.bg,borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
                <div style={{fontSize:10,color:C.tt,marginBottom:4}}>최근 성적</div>
                <div style={{fontSize:12,fontWeight:600,color:scoreTrend==="up"?C.su:scoreTrend==="down"?C.dn:C.tp}}>
                  {lastScore?`${lastScore.score}점 ${scoreTrend==="up"?"↑":scoreTrend==="down"?"↓":"→"}`:"기록 없음"}
                </div>
              </div>
            </div>
          </div>);})():(
          <div style={{textAlign:"center",padding:30,color:C.tt}}><div style={{fontSize:14}}>예정된 수업이 없습니다</div></div>
        )}
      </div>);
    case 'upcoming':
      if(upcomingDays.length===0)return null;
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:16}}>다가오는 수업</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {upcomingDays.map((day,di)=>(
            <div key={di}>
              <div style={{fontSize:12,fontWeight:600,color:C.ts,marginBottom:8}}>{day.dayLabel}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {day.classes.map(l=>{const stu=getStu(l.student_id);const co=getCol(l.student_id);return(
                  <div key={l.id} onClick={()=>stu&&onDetail(stu)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.bl}`,borderLeft:`3px solid ${co.b}`,cursor:"pointer"}} className="hcard">
                    <div style={{fontSize:12,color:C.tt,fontWeight:500,minWidth:44}}>{p2(l.start_hour)}:{p2(l.start_min)}</div>
                    <div style={{width:24,height:24,borderRadius:6,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:co.t}}>{(stu?.name||"?")[0]}</div>
                    <div style={{fontSize:13,fontWeight:500,color:C.tp}}>{stu?.name||"-"}</div>
                    <div style={{fontSize:11,color:C.ts}}>{l.subject}</div>
                  </div>);})}
              </div>
            </div>))}
        </div>
      </div>);
    case 'unrecorded':
      if(unrecorded.length===0)return null;
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:12}}>기록 미완료 <span style={{fontSize:12,fontWeight:500,color:C.wn,marginLeft:4}}>{unrecorded.length}건</span></h3>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {unrecorded.slice(0,5).map(l=>{const stu=getStu(l.student_id);const co=getCol(l.student_id);const ld=(l.date||"").slice(5,10).replace("-","/");return(
            <div key={l.id} onClick={()=>setDLes(mkLes(l))} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.bl}`,cursor:"pointer"}} className="hcard">
              <div style={{width:22,height:22,borderRadius:6,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:co.t}}>{(stu?.name||"?")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tp}}>{stu?.name||"-"}</div>
                <div style={{fontSize:10,color:C.tt}}>{ld} · {l.subject}</div>
              </div>
              <span style={{fontSize:9,color:C.wn,background:C.wb,padding:"2px 6px",borderRadius:4,fontWeight:600}}>미기록</span>
            </div>);})}
          {unrecorded.length>5&&<div style={{fontSize:11,color:C.tt,textAlign:"center",paddingTop:4}}>외 {unrecorded.length-5}건</div>}
        </div>
      </div>);
    case 'alerts':
      if(studentAlerts.length===0)return null;
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:12}}>주의가 필요한 학생</h3>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {studentAlerts.slice(0,5).map(({student:s,alerts:al})=>{const co=SC[(s.color_index||0)%8];return(
            <div key={s.id} onClick={()=>onDetail(s)} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 10px",borderRadius:8,border:`1px solid ${C.bl}`,cursor:"pointer"}} className="hcard">
              <div style={{width:24,height:24,borderRadius:6,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:co.t,flexShrink:0,marginTop:1}}>{(s.name||"?")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tp,marginBottom:4}}>{s.name}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {al.map((a,i)=><span key={i} style={{fontSize:9,color:a.color,background:a.bg,padding:"2px 6px",borderRadius:4,fontWeight:600}}>{a.label}</span>)}
                </div>
              </div>
            </div>);})}
          {studentAlerts.length>5&&<div style={{fontSize:11,color:C.tt,textAlign:"center",paddingTop:4}}>외 {studentAlerts.length-5}명</div>}
        </div>
      </div>);
    case 'weekChart': return(
      <div onClick={()=>{if(!editMode)onNav("schedule");}} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20,cursor:"pointer"}} className="hcard">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:600,color:C.tp,margin:0}}>주간 수업</h3>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={e=>{e.stopPropagation();setWeekOff(w=>w-1);}} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.ts,fontFamily:"inherit"}}>◀</button>
            {weekOff!==0&&<button onClick={e=>{e.stopPropagation();setWeekOff(0);}} style={{background:C.as,border:`1px solid ${C.ac}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:11,color:C.ac,fontWeight:600,fontFamily:"inherit"}}>이번주</button>}
            <span style={{fontSize:11,color:C.ts,minWidth:90,textAlign:"center"}}>{`${p2(wk[0].getMonth()+1)}/${p2(wk[0].getDate())} ~ ${p2(wk[6].getMonth()+1)}/${p2(wk[6].getDate())}`}</span>
            <button onClick={e=>{e.stopPropagation();setWeekOff(w=>w+1);}} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.ts,fontFamily:"inherit"}}>▶</button>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100,padding:"0 8px"}}>
          {weekData.map((d,i)=>{const maxC=Math.max(...weekData.map(x=>x.c),1);const h=d.c>0?(d.c/maxC)*100:4;const isT=i===todayIdx;return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
              <div style={{fontSize:11,fontWeight:600,color:C.tt}}>{d.c}</div>
              <div style={{width:"100%",height:`${h}%`,minHeight:4,background:isT?C.ac:C.bl,borderRadius:6}}/>
              <div style={{fontSize:12,fontWeight:isT?700:400,color:isT?C.ac:C.tt}}>{d.day}</div>
            </div>);})}
        </div>
      </div>);
    case 'studentList': {
      const stuStat=activeStudents.map(s=>{
        const hw=lessons.filter(l=>l.student_id===s.id).flatMap(l=>l.homework||[]).slice(-5);
        const hwR=hw.length>0?Math.round(hw.filter(h=>(h.completion_pct||0)>=100).length/hw.length*100):null;
        const recent=lessons.filter(l=>l.student_id===s.id).sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0];
        const nc=getNextClass(s.id);
        return{s,hwR,recent,nc};
      });
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontSize:15,fontWeight:600,color:C.tp}}>학생 근황</h3>
          <button onClick={()=>onNav("students")} style={{fontSize:11,color:C.ac,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>전체보기 →</button>
        </div>
        {stuStat.length>0?(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {stuStat.map(({s,hwR,recent,nc})=>{const co=SC[(s.color_index||0)%8];
            const hwC=hwR==null?{c:C.tt,b:C.bg}:hwR>=80?{c:C.su,b:C.sb}:hwR>=50?{c:C.wn,b:C.wb}:{c:C.dn,b:C.db};
            return(
            <div key={s.id} onClick={()=>onDetail(s)} style={{padding:12,borderRadius:10,border:`1px solid ${C.bl}`,cursor:"pointer"}} className="hcard">
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:28,height:28,borderRadius:7,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:co.t}}>{(s.name||"?")[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tp,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                  <div style={{fontSize:11,color:C.tt}}>{s.subject} · {nc}</div>
                </div>
              </div>
              {recent&&<div style={{fontSize:11,color:C.ts,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{recent.title||"제목 없음"}</div>}
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                <span style={{fontSize:9,color:hwC.c,background:hwC.b,padding:"2px 6px",borderRadius:4,fontWeight:600}}>숙제 {hwR!=null?`${hwR}%`:"-"}</span>
              </div>
            </div>);})}
        </div>):(
        <div style={{textAlign:"center",padding:20,color:C.tt,fontSize:13}}>학생을 추가해보세요</div>
        )}
      </div>);}
    case 'tuition': return(
      <div onClick={()=>onNav("tuition")} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} className="hcard">
        <div><span style={{fontSize:11,color:C.tt}}>월 수입</span><span style={{fontSize:13,fontWeight:600,color:C.tp,marginLeft:8}}>{totalFee>0?`₩${totalFee.toLocaleString()}`:"₩0"}</span></div>
        <div style={{width:1,height:20,background:C.bd}}/>
        <div><span style={{fontSize:11,color:C.tt}}>미수금</span><span style={{fontSize:13,fontWeight:600,color:unpaidAmount>0?C.dn:C.su,marginLeft:8}}>{unpaidAmount>0?`₩${unpaidAmount.toLocaleString()}`:"₩0"}</span></div>
      </div>);
    default: return null;
    }
  };

  /* ── Render block with edit-mode wrapper ── */
  const renderBlock=(id,col,idx)=>{
    const content=getBlockContent(id);
    if(!content)return null;
    if(!editMode)return <div key={id}>{content}</div>;
    const isD=dragId===id;
    const showDrop=dropTgt&&dropTgt.col===col&&dropTgt.idx===idx;
    return(
      <div key={id}>
        {showDrop&&<div style={{height:3,background:C.ac,borderRadius:2,marginBottom:8}}/>}
        <div draggable onDragStart={e=>{setDragId(id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}}
          onDragEnd={()=>{setDragId(null);setDropTgt(null);}}
          onDragOver={e=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect();setDropTgt({col,idx:e.clientY<r.top+r.height/2?idx:idx+1});}}
          onDrop={e=>{e.preventDefault();doDrop();}}
          style={{position:'relative',opacity:isD?.3:1,transition:'opacity .15s',outline:`2px dashed ${C.bd}`,outlineOffset:3,borderRadius:16}}>
          <button onClick={()=>hideBlock(id)} style={{position:'absolute',top:-8,left:-8,zIndex:5,width:24,height:24,borderRadius:12,background:C.dn,color:'#fff',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,fontWeight:700,lineHeight:'1',boxShadow:'0 2px 6px rgba(0,0,0,.15)',fontFamily:'inherit',padding:0}}>−</button>
          <div style={{pointerEvents:'none'}}>{content}</div>
        </div>
      </div>
    );
  };

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);

  return(
    <div className="main-pad" style={{padding:28}}>
      <style>{`.hcard{transition:all .12s;cursor:pointer;}.hcard:hover{background:${C.sfh}!important;}
        @media(max-width:768px){.dash-main{grid-template-columns:1fr!important;}.main-pad{padding:16px!important;}}`}</style>

      {/* Header */}
      <div style={{marginBottom:24,display:"flex",alignItems:"center",gap:12}}>
        {tog}
        <div style={{flex:1}}>
          <h1 style={{fontSize:22,fontWeight:700,color:C.tp}}>안녕하세요, 선생님 👋</h1>
          <p style={{fontSize:14,color:C.ts,marginTop:4}}>{todayLabel}{todayClasses.length>0?` · 오늘 수업 ${todayClasses.length}건`:""}</p>
        </div>
        <button onClick={()=>setEditMode(!editMode)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${editMode?C.ac:C.bd}`,background:editMode?C.as:C.sf,color:editMode?C.ac:C.ts,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>{editMode?"완료":"편집"}</button>
      </div>

      {/* Hidden blocks restore */}
      {editMode&&(layout.hidden||[]).length>0&&(
        <div style={{marginBottom:16,display:'flex',gap:8,flexWrap:'wrap'}}>
          {(layout.hidden||[]).map(id=>(
            <button key={id} onClick={()=>restoreBlock(id)} style={{padding:"6px 12px",borderRadius:8,border:`1px dashed ${C.bd}`,background:C.sfh,color:C.ts,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
              <span style={{color:C.su,fontWeight:700,fontSize:14}}>+</span> {BN[id]}
            </button>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="dash-main" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
        {['left','right'].map(col=>{
          const items=layout[col]||[];
          const showEndDrop=editMode&&dropTgt&&dropTgt.col===col&&dropTgt.idx>=items.length;
          return(
            <div key={col}
              onDragOver={e=>{e.preventDefault();if(editMode&&!e.target.closest('[draggable]'))setDropTgt({col,idx:items.length});}}
              onDrop={e=>{e.preventDefault();doDrop();}}
              style={{display:"flex",flexDirection:"column",gap:16,minHeight:editMode?100:'auto'}}>
              {items.map((id,idx)=>renderBlock(id,col,idx))}
              {showEndDrop&&<div style={{height:3,background:C.ac,borderRadius:2}}/>}
            </div>
          );
        })}
      </div>
      {dLes&&<LessonDetailModal les={dLes} student={getStu(dLes.student_id)} onUpdate={updDetail} onClose={()=>setDLes(null)}/>}
    </div>
  );
}
