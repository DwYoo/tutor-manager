'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LessonDetailModal from './student/LessonDetailModal'
import TeacherTodoTab from './TeacherTodoTab'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { SkeletonCard } from '@/components/ui'
import { C, SC } from '@/components/Colors'
import { p2, fd, DK, DKS, gwd, lessonOnDate } from '@/lib/utils'
import { syncHomework } from '@/lib/homework'
import { useShell } from '@/components/AppShell'
const BN={prep:"다음 수업 준비",upcoming:"다가오는 수업",unrecorded:"기록 미완료",alerts:"주의 학생",weekChart:"주간 수업",studentList:"학생 근황",tuition:"수업료 요약",lessonRate:"수업 이행률",classHours:"수업시간 요약"};
const DFL={left:["prep","upcoming","lessonRate"],right:["unrecorded","alerts","weekChart","classHours","tuition"],bottom:["studentList"],hidden:[]};

const DASH_TABS=[{id:'dashboard',label:'대시보드'},{id:'todo',label:'할 일'}];

export default function Dashboard(){
  const router=useRouter();
  const{menuBtn}=useShell();
  const tog=menuBtn;
  const[activeTab,setActiveTab]=useState('dashboard');
  const[students,setStudents]=useState([]);
  const[lessons,setLessons]=useState([]);
  const[tuitions,setTuitions]=useState([]);
  const[scores,setScores]=useState([]);
  const[textbooks,setTextbooks]=useState([]);
  const[loading,setLoading]=useState(true);
  const[weekOff,setWeekOff]=useState(0);
  const[dLes,setDLes]=useState(null);
  const[editMode,setEditMode]=useState(false);
  const[layout,setLayout]=useState(DFL);
  const[dragId,setDragId]=useState(null);
  const[dropTgt,setDropTgt]=useState(null);
  const[isMobile,setIsMobile]=useState(false);
  useEffect(()=>{const ck=()=>setIsMobile(window.innerWidth<640);ck();window.addEventListener("resize",ck);return()=>window.removeEventListener("resize",ck);},[]);

  const[fetchError,setFetchError]=useState(false);
  const fetchData=useCallback(async()=>{
    setLoading(true);setFetchError(false);
    try{
      const[sRes,lRes,tRes,scRes,tbRes]=await Promise.all([
        supabase.from('students').select('id,name,subject,grade,school,color_index,archived,sort_order,fee_per_class,fee_status,created_at').order('created_at'),
        supabase.from('lessons').select('id,student_id,date,start_hour,start_min,duration,subject,topic,status,content,feedback,private_memo,plan_shared,plan_private,is_recurring,recurring_day,recurring_end_date,recurring_exceptions,homework(id,title,completion_pct,lesson_id),files(id,file_name,file_type,file_url,lesson_id)').order('date'),
        supabase.from('tuition').select('student_id,month,amount,status,fee_override,fee_manual,classes_override,tuition_fee_override,carryover'),
        supabase.from('scores').select('id,student_id,score,grade,date,label').order('date'),
        supabase.from('textbooks').select('id,student_id,title').order('created_at',{ascending:false}).then(r=>r,()=>({data:[],error:null})),
      ]);
      if(sRes.error||lRes.error||tRes.error||scRes.error){setFetchError(true);setLoading(false);return;}
      setStudents(sRes.data||[]);setLessons(lRes.data||[]);setTuitions(tRes.data||[]);setScores(scRes.data||[]);setTextbooks(tbRes.data||[]);
    }catch{setFetchError(true);}
    setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  /* ── Layout persistence ── */
  useEffect(()=>{
    try{const s=localStorage.getItem('dash-layout');if(s){const p=JSON.parse(s);const all=new Set(Object.keys(BN));const has=new Set([...(p.left||[]),...(p.right||[]),...(p.bottom||[]),...(p.hidden||[])]);
    const miss=[...all].filter(b=>!has.has(b));if(miss.length)p.right=[...(p.right||[]),...miss];
    p.left=(p.left||[]).filter(b=>all.has(b));p.right=(p.right||[]).filter(b=>all.has(b));p.bottom=(p.bottom||[]).filter(b=>all.has(b));p.hidden=(p.hidden||[]).filter(b=>all.has(b));
    setLayout(p);}}catch{}
  },[]);
  const saveLay=l=>{setLayout(l);try{localStorage.setItem('dash-layout',JSON.stringify(l));}catch{}};
  const hideBlock=id=>{saveLay({left:layout.left.filter(b=>b!==id),right:layout.right.filter(b=>b!==id),bottom:(layout.bottom||[]).filter(b=>b!==id),hidden:[...(layout.hidden||[]),id]});};
  const BOTTOM_DEF=new Set(['studentList']);
  const restoreBlock=id=>{const col=BOTTOM_DEF.has(id)?'bottom':'right';saveLay({...layout,[col]:[...layout[col],id],hidden:(layout.hidden||[]).filter(b=>b!==id)});};
  const moveBlock=(id,toCol)=>{const nl={left:layout.left.filter(b=>b!==id),right:layout.right.filter(b=>b!==id),bottom:(layout.bottom||[]).filter(b=>b!==id),hidden:[...(layout.hidden||[])]};nl[toCol].push(id);saveLay(nl);};
  const doDrop=()=>{if(!dragId||!dropTgt)return;const nl={left:[...layout.left],right:[...layout.right],bottom:[...(layout.bottom||[])],hidden:[...(layout.hidden||[])]};nl.left=nl.left.filter(b=>b!==dragId);nl.right=nl.right.filter(b=>b!==dragId);nl.bottom=nl.bottom.filter(b=>b!==dragId);nl.hidden=nl.hidden.filter(b=>b!==dragId);nl[dropTgt.col].splice(dropTgt.idx,0,dragId);saveLay(nl);setDragId(null);setDropTgt(null);};

  const mkLes=l=>({...l,sh:l.start_hour,sm:l.start_min,dur:l.duration,sub:l.subject,top:l.topic,rep:l.is_recurring,tMemo:l.private_memo||"",hw:l.homework||[],files:l.files||[],planShared:l.plan_shared||"",planPrivate:l.plan_private||""});
  const updDetail=async(id,data)=>{
    const u={};
    if(data.top!==undefined)u.topic=data.top;if(data.content!==undefined)u.content=data.content;
    if(data.feedback!==undefined)u.feedback=data.feedback;if(data.tMemo!==undefined)u.private_memo=data.tMemo;
    if(data.planShared!==undefined)u.plan_shared=data.planShared;if(data.planPrivate!==undefined)u.plan_private=data.planPrivate;
    if(Object.keys(u).length)await supabase.from('lessons').update(u).eq('id',id);
    const les=lessons.find(l=>l.id===id);
    await syncHomework(id, les?.homework||[], data.hw||[]);
    fetchData();
  };

  /* ── Derived data ── */
  const activeStudents=students.filter(s=>!s.archived).sort((a,b)=>(a.sort_order??Infinity)-(b.sort_order??Infinity));
  const today=new Date();
  const wkBase=new Date(today);wkBase.setDate(today.getDate()+weekOff*7);
  const wk=gwd(wkBase);
  const curMonth=`${today.getFullYear()}-${p2(today.getMonth()+1)}`;
  const year=today.getFullYear(),month=today.getMonth()+1;


  const todayClasses=lessons.filter(l=>lessonOnDate(l,today)).sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));
  const upcomingDays=[];
  const nowMin=today.getHours()*60+today.getMinutes();
  for(let i=0;i<=3;i++){const d=new Date(today);d.setDate(today.getDate()+i);let cls=lessons.filter(l=>l.student_id!=null&&lessonOnDate(l,d)).sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));if(i===0)cls=cls.filter(l=>(l.start_hour*60+l.start_min)>nowMin);if(cls.length>0)upcomingDays.push({date:d,dayLabel:i===0?`오늘 (${p2(d.getMonth()+1)}/${p2(d.getDate())})`:`${DK[d.getDay()]}요일 (${p2(d.getMonth()+1)}/${p2(d.getDate())})`,classes:cls});}
  const weekData=wk.map((d,i)=>{const cnt=lessons.filter(l=>l.student_id!=null&&lessonOnDate(l,d)).length;return{day:DKS[i],c:cnt};});
  const todayIdx=weekOff===0?(today.getDay()===0?6:today.getDay()-1):-1;

  const countMonthLessons=(sid)=>{const dim=new Date(year,month,0).getDate();let cnt=0;for(let d=1;d<=dim;d++){const dt=new Date(year,month-1,d);cnt+=lessons.filter(l=>l.student_id===sid&&l.status!=='cancelled'&&lessonOnDate(l,dt)).length;}return cnt;};
  const autoStatus=(amt,due)=>amt>=due?"paid":amt>0?"partial":"unpaid";
  const monthRecs=activeStudents.map(s=>{const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);const autoLessonCnt=countMonthLessons(s.id);const lessonCnt=(rec&&rec.classes_override!=null)?rec.classes_override:autoLessonCnt;const autoFee=(s.fee_per_class||0)*lessonCnt;const tuitionFeeManual=rec?.tuition_fee_override!=null;const displayFee=tuitionFeeManual?rec.tuition_fee_override:autoFee;const carryover=rec?.carryover||0;const autoTotalDue=displayFee+carryover;const totalDueManual=!!(rec&&rec.fee_manual&&rec.fee_override!=null);const totalDue=totalDueManual?rec.fee_override:autoTotalDue;const paidAmount=rec?.amount||0;const status=autoStatus(paidAmount,totalDue);return{student:s,totalDue,paidAmount,status};});
  const totalFee=monthRecs.reduce((a,r)=>a+r.totalDue,0);
  const unpaidAmount=monthRecs.reduce((a,r)=>r.status!=="paid"?a+Math.max(0,r.totalDue-r.paidAmount):a,0);

  const getStu=sid=>students.find(x=>x.id===sid);
  const getCol=sid=>{const s=getStu(sid);return SC[(s?.color_index||0)%8];};

  const getNextClass=(sid)=>{for(let offset=0;offset<90;offset++){const d=new Date(today);d.setDate(today.getDate()+offset);const sLessons=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,d));for(const l of sLessons){const lesMin=l.start_hour*60+l.start_min;if(offset===0&&lesMin<=today.getHours()*60+today.getMinutes())continue;return`${DK[d.getDay()]} ${p2(l.start_hour)}:${p2(l.start_min)}`;}}return"-";};

  const getNextLessonPrep=()=>{for(let offset=0;offset<7;offset++){const d=new Date(today);d.setDate(today.getDate()+offset);const dayLessons=lessons.filter(l=>lessonOnDate(l,d)).sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));for(const l of dayLessons){const lesMin=l.start_hour*60+l.start_min;const endMin=lesMin+l.duration;const curMin=today.getHours()*60+today.getMinutes();const isInProgress=offset===0&&lesMin<=curMin&&endMin>curMin;if(offset===0&&!isInProgress&&lesMin<=curMin)continue;const stu=getStu(l.student_id);if(!stu||stu.archived)continue;const pastLessons=lessons.filter(pl=>pl.student_id===l.student_id&&pl.id!==l.id&&(pl.date||"")<fd(d)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));const last=pastLessons[0]||null;const lastHw=last?.homework||[];const hwTotal=lastHw.length;const hwDone=lastHw.filter(h=>(h.completion_pct||0)>=100).length;const stuScores=scores.filter(sc=>sc.student_id===l.student_id).sort((a,b)=>(a.date||"").localeCompare(b.date||""));let scoreTrend=null,lastScore=null;if(stuScores.length>=2){const cur=stuScores[stuScores.length-1].score,prev=stuScores[stuScores.length-2].score;scoreTrend=cur>prev?"up":cur<prev?"down":"same";}if(stuScores.length>0)lastScore=stuScores[stuScores.length-1];const dayLabel=isInProgress?"진행중":offset===0?"오늘":offset===1?"내일":`${DK[d.getDay()]}요일`;return{lesson:l,student:stu,dayLabel,dateStr:`${p2(d.getMonth()+1)}/${p2(d.getDate())}`,last,hwTotal,hwDone,scoreTrend,lastScore,isInProgress};}}return null;};
  const nextPrep=getNextLessonPrep();

  const unrecorded=lessons.filter(l=>{if(l.is_recurring)return false;const ld=new Date((l.date||"").slice(0,10));const diff=(today-ld)/(1000*60*60*24);if(diff<0||diff>14)return false;if(diff<1){const em=l.start_hour*60+l.start_min+l.duration;if(em>today.getHours()*60+today.getMinutes())return false;}return(!l.content||l.content.trim()==="");}).sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  const studentAlerts=[];
  activeStudents.forEach(s=>{const al=[];const stuHw=lessons.filter(l=>l.student_id===s.id).flatMap(l=>l.homework||[]);const recentHw=stuHw.slice(-10);if(recentHw.length>=2){const inc=recentHw.filter(h=>(h.completion_pct||0)<100).length;const rate=Math.round((1-inc/recentHw.length)*100);if(rate<50)al.push({type:"hw",label:`숙제 완료율 ${rate}%`,color:C.dn,bg:C.db});}const stuScores=scores.filter(sc=>sc.student_id===s.id).sort((a,b)=>(a.date||"").localeCompare(b.date||""));if(stuScores.length>=2){const cur=stuScores[stuScores.length-1].score,prev=stuScores[stuScores.length-2].score;if(cur<prev)al.push({type:"score",label:`성적 하락 ${prev}→${cur}`,color:C.wn,bg:C.wb});}if(al.length>0)studentAlerts.push({student:s,alerts:al});});

  const todayLabel=`${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일 ${DK[today.getDay()]}요일`;

  /* ── 수업 이행률 (월별 전체 / 완료 / 예정) ── */
  const lessonRateData=(()=>{
    const dim=new Date(year,month,0).getDate();
    const todayDate=today.getDate();
    let total=0,completed=0,upcoming=0;
    for(let d=1;d<=dim;d++){
      const dt=new Date(year,month-1,d);
      const dayLessons=lessons.filter(l=>l.student_id!=null&&l.status!=='cancelled'&&lessonOnDate(l,dt));
      total+=dayLessons.length;
      if(d>todayDate){
        upcoming+=dayLessons.length;
      }else{
        completed+=dayLessons.length;
      }
    }
    const perStudent=activeStudents.slice(0,8).map(st=>{
      let sch=0,comp=0;
      for(let d=1;d<=dim;d++){
        const dt=new Date(year,month-1,d);
        const dl=lessons.filter(l=>l.student_id===st.id&&l.status!=='cancelled'&&lessonOnDate(l,dt));
        sch+=dl.length;
        if(d<=todayDate) comp+=dl.length;
      }
      return{name:(st.name||'?').slice(0,4),scheduled:sch,completed:comp};
    }).filter(x=>x.scheduled>0);
    return{total,completed,upcoming,perStudent};
  })();

  /* ── 수업시간 요약 (주간/월간) ── */
  const classHoursData=(()=>{
    const dim=new Date(year,month,0).getDate();
    let monthMin=0;
    for(let d=1;d<=dim;d++){
      const dt=new Date(year,month-1,d);
      monthMin+=lessons.filter(l=>l.student_id!=null&&l.status!=='cancelled'&&lessonOnDate(l,dt)).reduce((a,l)=>a+(l.duration||0),0);
    }
    let weekMin=0;
    const thisWk=gwd(today);
    thisWk.forEach(d=>{
      weekMin+=lessons.filter(l=>l.student_id!=null&&l.status!=='cancelled'&&lessonOnDate(l,d)).reduce((a,l)=>a+(l.duration||0),0);
    });
    return{weekMin,weekH:Math.floor(weekMin/60),weekM:weekMin%60,monthMin,monthH:Math.floor(monthMin/60),monthM:monthMin%60};
  })();
  const RateTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,fontWeight:600,color:C.tp,marginBottom:4}}>{d.name}</div><div style={{fontSize:11,color:C.ac}}>예정 {d.scheduled}회</div><div style={{fontSize:11,color:C.su}}>완료 {d.completed}회</div></div>);};

  /* ── Block content by ID ── */
  const getBlockContent=(id)=>{
    switch(id){
    case 'prep': return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:600,color:C.tp}}>{nextPrep?.isInProgress?"진행중 수업":"다음 수업 준비"}</h3>
          {nextPrep&&<span style={{fontSize:12,color:nextPrep.isInProgress?"#EA580C":C.ac,fontWeight:600}}>{nextPrep.dayLabel} {p2(nextPrep.lesson.start_hour)}:{p2(nextPrep.lesson.start_min)}</span>}
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
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
              <div onClick={e=>{e.stopPropagation();if(last)setDLes(mkLes(last));}} style={{background:C.bg,borderRadius:8,padding:"10px 12px",cursor:last?"pointer":"default"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>지난 수업</div>
                <div style={{fontSize:12,fontWeight:600,color:C.tp}}>{last?.topic||last?.subject||"기록 없음"}</div>
              </div>
              <div onClick={e=>{e.stopPropagation();router.push('/students/'+ns.id+'?mainTab=study&subTab=homework');}} style={{background:C.bg,borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>내준 숙제</div>
                <div style={{fontSize:12,fontWeight:600,color:hwTotal===0?C.tt:C.tp}}>{hwTotal===0?"없음":`${hwTotal}건`}</div>
              </div>
              <div onClick={e=>{e.stopPropagation();router.push('/students/'+ns.id+'?mainTab=analysis&subTab=scores');}} style={{background:C.bg,borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>최근 성적</div>
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
      if(upcomingDays.length===0)return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:16}}>다가오는 수업</h3>
        <div style={{textAlign:"center",padding:"20px 0",color:"#A8A29E",fontSize:13}}>표시할 항목이 없습니다</div>
      </div>);
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:16}}>다가오는 수업</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {upcomingDays.map((day,di)=>(
            <div key={di}>
              <div style={{fontSize:12,fontWeight:600,color:C.ts,marginBottom:8}}>{day.dayLabel}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,overflowX:"auto",flexWrap:"nowrap",WebkitOverflowScrolling:"touch"}}>
                {day.classes.map(l=>{const stu=getStu(l.student_id);const co=getCol(l.student_id);return(
                  <div key={l.id} onClick={()=>stu&&router.push('/students/'+stu.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.bl}`,borderLeft:`3px solid ${co.b}`,cursor:"pointer",flexShrink:0}} className="hcard">
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
      if(unrecorded.length===0)return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:12}}>기록 미완료</h3>
        <div style={{textAlign:"center",padding:"20px 0",color:"#A8A29E",fontSize:13}}>표시할 항목이 없습니다</div>
      </div>);
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:12}}>기록 미완료 <span style={{fontSize:12,fontWeight:500,color:C.wn,marginLeft:4}}>{unrecorded.length}건</span></h3>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {unrecorded.slice(0,5).map(l=>{const stu=getStu(l.student_id);const co=getCol(l.student_id);const ld=(l.date||"").slice(5,10).replace("-","/");return(
            <div key={l.id} onClick={()=>setDLes(mkLes(l))} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.bl}`,cursor:"pointer"}} className="hcard">
              <div style={{width:22,height:22,borderRadius:6,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:co.t}}>{(stu?.name||"?")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tp}}>{stu?.name||"-"}</div>
                <div style={{fontSize:11,color:C.tt}}>{ld} · {l.subject}</div>
              </div>
              <span style={{fontSize:11,color:C.wn,background:C.wb,padding:"2px 6px",borderRadius:4,fontWeight:600}}>미기록</span>
            </div>);})}
          {unrecorded.length>5&&<div style={{fontSize:11,color:C.tt,textAlign:"center",paddingTop:4}}>외 {unrecorded.length-5}건</div>}
        </div>
      </div>);
    case 'alerts':
      if(studentAlerts.length===0)return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:12}}>주의가 필요한 학생</h3>
        <div style={{textAlign:"center",padding:"20px 0",color:"#A8A29E",fontSize:13}}>표시할 항목이 없습니다</div>
      </div>);
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:12}}>주의가 필요한 학생</h3>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {studentAlerts.slice(0,5).map(({student:s,alerts:al})=>{const co=SC[(s.color_index||0)%8];return(
            <div key={s.id} onClick={()=>router.push('/students/'+s.id)} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 10px",borderRadius:8,border:`1px solid ${C.bl}`,cursor:"pointer"}} className="hcard">
              <div style={{width:24,height:24,borderRadius:6,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:co.t,flexShrink:0,marginTop:1}}>{(s.name||"?")[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tp,marginBottom:4}}>{s.name}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {al.map((a,i)=><span key={i} style={{fontSize:11,color:a.color,background:a.bg,padding:"2px 6px",borderRadius:4,fontWeight:600}}>{a.label}</span>)}
                </div>
              </div>
            </div>);})}
          {studentAlerts.length>5&&<div style={{fontSize:11,color:C.tt,textAlign:"center",paddingTop:4}}>외 {studentAlerts.length-5}명</div>}
        </div>
      </div>);
    case 'weekChart': return(
      <div onClick={()=>{if(!editMode)router.push('/schedule');}} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20,cursor:"pointer"}} className="hcard">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:600,color:C.tp,margin:0}}>주간 수업</h3>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={e=>{e.stopPropagation();setWeekOff(w=>w-1);}} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.ts,fontFamily:"inherit"}}>◀</button>
            {weekOff!==0&&<button onClick={e=>{e.stopPropagation();setWeekOff(0);}} style={{background:C.as,border:`1px solid ${C.ac}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:11,color:C.ac,fontWeight:600,fontFamily:"inherit"}}>이번주</button>}
            <span style={{fontSize:11,color:C.ts,minWidth:90,textAlign:"center"}}>{`${p2(wk[0].getMonth()+1)}/${p2(wk[0].getDate())} ~ ${p2(wk[6].getMonth()+1)}/${p2(wk[6].getDate())}`}</span>
            <button onClick={e=>{e.stopPropagation();setWeekOff(w=>w+1);}} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.ts,fontFamily:"inherit"}}>▶</button>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100,padding:"0 8px",overflow:"hidden"}}>
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
        const allHw=lessons.filter(l=>l.student_id===s.id).flatMap(l=>l.homework||[]);
        const hwInc=allHw.filter(h=>(h.completion_pct||0)<100).length;
        const todayStr=fd(today);
        const recent=lessons.filter(l=>l.student_id===s.id&&(l.date||"")<=todayStr).sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0];
        const nc=getNextClass(s.id);
        return{s,hwInc,recent,nc};
      });
      return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontSize:15,fontWeight:600,color:C.tp}}>학생 근황</h3>
          <button onClick={()=>router.push('/students')} style={{fontSize:11,color:C.ac,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>전체보기 →</button>
        </div>
        {stuStat.length>0?(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {stuStat.map(({s,hwInc,recent,nc})=>{const co=SC[(s.color_index||0)%8];
            return(
            <div key={s.id} onClick={()=>router.push('/students/'+s.id)} style={{padding:12,borderRadius:10,border:`1px solid ${C.bl}`,cursor:"pointer"}} className="hcard">
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:28,height:28,borderRadius:7,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:co.t}}>{(s.name||"?")[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tp,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                  <div style={{fontSize:11,color:C.tt}}>{s.subject} · {nc}</div>
                </div>
              </div>
              {recent&&<div style={{fontSize:11,color:C.ts,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{recent.topic||recent.subject||"-"}</div>}
              {hwInc>0&&<span style={{fontSize:11,color:C.wn,background:C.wb,padding:"2px 6px",borderRadius:4,fontWeight:600}}>미완 숙제 {hwInc}건</span>}
            </div>);})}
        </div>):(
        <div style={{textAlign:"center",padding:20,color:C.tt,fontSize:13}}>학생을 추가해보세요</div>
        )}
      </div>);}
    case 'tuition': return(
      <div onClick={()=>router.push('/tuition')} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} className="hcard">
        <div><span style={{fontSize:11,color:C.tt}}>월 수입</span><span style={{fontSize:13,fontWeight:600,color:C.tp,marginLeft:8}}>{totalFee>0?`₩${totalFee.toLocaleString()}`:"₩0"}</span></div>
        <div style={{width:1,height:20,background:C.bd}}/>
        <div><span style={{fontSize:11,color:C.tt}}>미수금</span><span style={{fontSize:13,fontWeight:600,color:unpaidAmount>0?C.dn:C.su,marginLeft:8}}>{unpaidAmount>0?`₩${unpaidAmount.toLocaleString()}`:"₩0"}</span></div>
      </div>);
    case 'lessonRate': return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <div style={{marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:600,color:C.tp,margin:0}}>{month}월 수업 현황</h3>
        </div>
        <div style={{display:"flex",gap:16,marginBottom:14}}>
          <div style={{flex:1,background:C.as,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:11,color:C.ac,marginBottom:2}}>전체</div>
            <div style={{fontSize:18,fontWeight:700,color:C.ac}}>{lessonRateData.total}</div>
          </div>
          <div style={{flex:1,background:C.sb,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:11,color:C.su,marginBottom:2}}>완료</div>
            <div style={{fontSize:18,fontWeight:700,color:C.su}}>{lessonRateData.completed}</div>
          </div>
          <div style={{flex:1,background:C.as,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:11,color:C.ac,marginBottom:2}}>예정</div>
            <div style={{fontSize:18,fontWeight:700,color:C.ac}}>{lessonRateData.upcoming}</div>
          </div>
        </div>
        {lessonRateData.perStudent.length>0&&(
          <div style={{overflow:"hidden"}}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={lessonRateData.perStudent} margin={{top:5,right:5,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.bl} vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:C.tt}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.tt}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip content={<RateTooltip/>}/>
                <Bar dataKey="scheduled" fill={C.al} radius={[4,4,0,0]} barSize={14} name="예정"/>
                <Bar dataKey="completed" fill={C.su} radius={[4,4,0,0]} barSize={14} name="완료"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>);
    case 'classHours': return(
      <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:600,color:C.tp,margin:0,marginBottom:16}}>수업시간 요약</h3>
        <div style={{display:"flex",gap:14}}>
          <div style={{flex:1,background:"linear-gradient(135deg,"+C.as+" 0%,"+C.sf+" 100%)",border:"1px solid "+C.al,borderRadius:12,padding:16,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.ac,marginBottom:4,fontWeight:500}}>이번 주</div>
            <div style={{fontSize:22,fontWeight:700,color:C.ac}}>{classHoursData.weekH}<span style={{fontSize:13,fontWeight:500}}>시간</span></div>
            {classHoursData.weekM>0&&<div style={{fontSize:12,color:C.ts}}>{classHoursData.weekM}분</div>}
          </div>
          <div style={{flex:1,background:"linear-gradient(135deg,"+C.sb+" 0%,"+C.sf+" 100%)",border:"1px solid #BBF7D0",borderRadius:12,padding:16,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.su,marginBottom:4,fontWeight:500}}>{month}월 전체</div>
            <div style={{fontSize:22,fontWeight:700,color:C.su}}>{classHoursData.monthH}<span style={{fontSize:13,fontWeight:500}}>시간</span></div>
            {classHoursData.monthM>0&&<div style={{fontSize:12,color:C.ts}}>{classHoursData.monthM}분</div>}
          </div>
        </div>
      </div>);
    default: return null;
    }
  };

  /* ── Render block with edit-mode wrapper ── */
  const mbS={width:22,height:22,borderRadius:6,border:`1px solid ${C.bd}`,background:C.sf,color:C.ts,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'inherit',padding:0,lineHeight:'1'};
  const mbA={...mbS,border:`1px solid ${C.ac}`,background:C.as,color:C.ac};
  const renderBlock=(id,col,idx)=>{
    const content=getBlockContent(id);
    if(!content)return null;
    if(!editMode)return <div key={id}>{content}</div>;
    const isD=dragId===id;
    const showDrop=dropTgt&&dropTgt.col===col&&dropTgt.idx===idx;
    const moves=[];
    if(col!=='left')moves.push({label:'←',to:'left',tip:'왼쪽'});
    if(col!=='right')moves.push({label:'→',to:'right',tip:'오른쪽'});
    if(col!=='bottom')moves.push({label:'↔',to:'bottom',tip:'풀너비'});
    return(
      <div key={id}>
        {showDrop&&<div style={{height:3,background:C.ac,borderRadius:2,marginBottom:8}}/>}
        <div draggable onDragStart={e=>{setDragId(id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}}
          onDragEnd={()=>{setDragId(null);setDropTgt(null);}}
          onDragOver={e=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect();setDropTgt({col,idx:e.clientY<r.top+r.height/2?idx:idx+1});}}
          onDrop={e=>{e.preventDefault();doDrop();}}
          style={{position:'relative',opacity:isD?.3:1,transition:'opacity .15s',outline:`2px dashed ${C.bd}`,outlineOffset:3,borderRadius:16}}>
          <button onClick={()=>hideBlock(id)} style={{position:'absolute',top:-8,left:-8,zIndex:5,width:24,height:24,borderRadius:12,background:C.dn,color:'#fff',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,fontWeight:700,lineHeight:'1',boxShadow:'0 2px 6px rgba(0,0,0,.15)',fontFamily:'inherit',padding:0}}>−</button>
          <div style={{position:'absolute',top:-8,right:-4,zIndex:5,display:'flex',gap:3}}>
            {moves.map(m=><button key={m.to} title={m.tip} onClick={()=>moveBlock(id,m.to)} style={m.to==='bottom'?mbA:mbS}>{m.label}</button>)}
          </div>
          <div style={{pointerEvents:'none'}}>{content}</div>
        </div>
      </div>
    );
  };

  if(loading)return(
  <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 16px"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
      <div style={{width:180,height:28,borderRadius:8,background:"linear-gradient(90deg, #F5F5F4 25%, #F0EFED 50%, #F5F5F4 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16}}>
      <SkeletonCard lines={4}/>
      <SkeletonCard lines={3}/>
      <SkeletonCard lines={4}/>
      <SkeletonCard lines={2}/>
      <SkeletonCard lines={3}/>
      <SkeletonCard lines={2}/>
    </div>
  </div>
);
  if(fetchError)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:14,color:C.dn}}>데이터를 불러오지 못했습니다</div><button onClick={fetchData} style={{padding:"8px 20px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,color:C.tp,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>다시 시도</button></div>);

  return(
    <div className="main-pad dash-container" style={{padding:isMobile?16:28}}>
      {/* Header */}
      <div style={{marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        {tog}
        <div style={{flex:1}}>
          <h1 style={{fontSize:isMobile?18:22,fontWeight:700,color:C.tp}}>안녕하세요, 선생님 👋</h1>
          <p style={{fontSize:14,color:C.ts,marginTop:4}}>{todayLabel}{todayClasses.length>0?` · 오늘 수업 ${todayClasses.length}건`:""}</p>
        </div>
        {activeTab==='dashboard'&&<button onClick={()=>setEditMode(!editMode)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${editMode?C.ac:C.bd}`,background:editMode?C.as:C.sf,color:editMode?C.ac:C.ts,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>{editMode?"완료":"편집"}</button>}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,borderBottom:`1px solid ${C.bd}`,marginBottom:20}}>
        {DASH_TABS.map(t=>{const isA=activeTab===t.id;return(
          <button key={t.id} onClick={()=>{setActiveTab(t.id);if(t.id==='dashboard'){}}} style={{padding:"10px 20px",border:"none",borderBottom:isA?`2px solid ${C.ac}`:"2px solid transparent",background:"none",fontSize:14,fontWeight:isA?600:400,color:isA?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"color .15s,border-color .15s"}}>{t.label}</button>
        );})}
      </div>

      {/* Todo tab */}
      {activeTab==='todo'&&<TeacherTodoTab/>}

      {/* Dashboard tab content */}
      {activeTab==='dashboard'&&<>

      {/* Hidden blocks restore */}
      {editMode&&(layout.hidden||[]).length>0&&(
        <div style={{marginBottom:16,padding:14,borderRadius:12,border:`2px dashed ${C.bd}`,background:C.sfh}}>
          <div style={{fontSize:12,fontWeight:600,color:C.ts,marginBottom:8}}>숨긴 블록 (눌러서 다시 추가)</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {(layout.hidden||[]).map(id=>(
              <button key={id} onClick={()=>restoreBlock(id)} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.ac}`,background:C.as,color:C.ac,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontWeight:700,fontSize:16}}>+</span> {BN[id]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="dash-main" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:isMobile?14:20}}>
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
      {/* Bottom full-width */}
      {((layout.bottom||[]).length>0||editMode)&&(
        <div
          onDragOver={e=>{e.preventDefault();if(editMode&&!e.target.closest('[draggable]'))setDropTgt({col:'bottom',idx:(layout.bottom||[]).length});}}
          onDrop={e=>{e.preventDefault();doDrop();}}
          style={{marginTop:20,display:"flex",flexDirection:"column",gap:16,minHeight:editMode?60:'auto',
            ...(editMode&&(layout.bottom||[]).length===0?{border:`2px dashed ${C.bd}`,borderRadius:12,padding:16,alignItems:'center',justifyContent:'center'}:{})}}>
          {editMode&&(layout.bottom||[]).length===0&&<div style={{fontSize:12,color:C.tt}}>여기에 놓으면 풀너비</div>}
          {(layout.bottom||[]).map((id,idx)=>renderBlock(id,'bottom',idx))}
          {editMode&&dropTgt&&dropTgt.col==='bottom'&&dropTgt.idx>=(layout.bottom||[]).length&&<div style={{height:3,background:C.ac,borderRadius:2}}/>}
        </div>
      )}
      {dLes&&<LessonDetailModal les={dLes} student={getStu(dLes.student_id)} textbooks={textbooks.filter(tb=>tb.student_id===dLes.student_id)} onUpdate={updDetail} onClose={()=>setDLes(null)}/>}
      </>}
    </div>
  );
}
