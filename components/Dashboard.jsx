'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
const DK=["일","월","화","수","목","금","토"];
const DKS=["월","화","수","목","금","토","일"];
const p2=n=>String(n).padStart(2,"0");
const fd=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const gwd=base=>{const d=new Date(base),dy=d.getDay(),df=dy===0?-6:1-dy,m=new Date(d);m.setDate(d.getDate()+df);return Array.from({length:7},(_,i)=>{const t=new Date(m);t.setDate(m.getDate()+i);return t;});};

export default function Dashboard({onNav,onDetail,menuBtn}){
  const tog=menuBtn;
  const[students,setStudents]=useState([]);
  const[lessons,setLessons]=useState([]);
  const[tuitions,setTuitions]=useState([]);
  const[scores,setScores]=useState([]);
  const[loading,setLoading]=useState(true);
  const[weekOff,setWeekOff]=useState(0);

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

  /* ── Derived data ── */
  const activeStudents=students.filter(s=>!s.archived);
  const today=new Date();
  const wkBase=new Date(today);wkBase.setDate(today.getDate()+weekOff*7);
  const wk=gwd(wkBase);
  const curMonth=`${today.getFullYear()}-${p2(today.getMonth()+1)}`;
  const year=today.getFullYear(),month=today.getMonth()+1;

  // Helper: does this lesson occur on this date?
  const lessonOnDate=(l,date)=>{
    const ds=fd(date),dw=date.getDay()===0?7:date.getDay();
    const ld=(l.date||"").slice(0,10);
    if(l.is_recurring&&l.recurring_exceptions&&l.recurring_exceptions.includes(ds))return false;
    if(ld===ds)return true;
    if(l.is_recurring&&+l.recurring_day===dw){
      if(ds<ld)return false;
      if(l.recurring_end_date&&ds>=(l.recurring_end_date+"").slice(0,10))return false;
      return true;
    }
    return false;
  };

  // Today's classes
  const todayClasses=lessons.filter(l=>lessonOnDate(l,today))
    .sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));

  // Upcoming classes (next 3 days)
  const upcomingDays=[];
  for(let i=1;i<=3;i++){
    const d=new Date(today);d.setDate(today.getDate()+i);
    const cls=lessons.filter(l=>lessonOnDate(l,d)).sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));
    if(cls.length>0)upcomingDays.push({date:d,dayLabel:`${DK[d.getDay()]}요일 (${p2(d.getMonth()+1)}/${p2(d.getDate())})`,classes:cls});
  }

  // Week classes by day
  const weekData=wk.map((d,i)=>{
    const cnt=lessons.filter(l=>lessonOnDate(l,d)).length;
    return{day:DKS[i],c:cnt};
  });
  const weekTotal=weekData.reduce((a,d)=>a+d.c,0);
  const thisWeekTotal=weekOff===0?weekTotal:gwd(today).reduce((a,d)=>a+lessons.filter(l=>lessonOnDate(l,d)).length,0);
  const todayIdx=weekOff===0?(today.getDay()===0?6:today.getDay()-1):-1;

  // ── Fee calculation: match Tuition tab logic (with fee_override) ──
  const countMonthLessons=(sid)=>{
    const dim=new Date(year,month,0).getDate();
    let cnt=0;
    for(let d=1;d<=dim;d++){
      const dt=new Date(year,month-1,d);
      cnt+=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,dt)).length;
    }
    return cnt;
  };

  const autoStatus=(amt,due)=>amt>=due?"paid":amt>0?"partial":"unpaid";

  const monthRecs=activeStudents.map(s=>{
    const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);
    const lessonCnt=countMonthLessons(s.id);
    const autoFee=(s.fee_per_class||0)*lessonCnt;
    const carryover=rec?.carryover||0;
    const autoTotalDue=autoFee+carryover;
    // fee_override 반영 (Tuition 탭과 동일 로직)
    const totalDue=(rec&&rec.fee_override!=null)?rec.fee_override:autoTotalDue;
    const paidAmount=rec?.amount||0;
    const status=autoStatus(paidAmount,totalDue);
    return{student:s,totalDue,paidAmount,status};
  });

  const totalFee=monthRecs.reduce((a,r)=>a+r.totalDue,0);
  const unpaidRecs=monthRecs.filter(r=>r.status!=="paid");
  const unpaidAmount=monthRecs.reduce((a,r)=>r.status!=="paid"?a+Math.max(0,r.totalDue-r.paidAmount):a,0);

  const getStu=sid=>students.find(x=>x.id===sid);
  const getCol=sid=>{const s=getStu(sid);return SC[(s?.color_index||0)%8];};

  // ── Next class per student ──
  const getNextClass=(sid)=>{
    for(let offset=0;offset<14;offset++){
      const d=new Date(today);d.setDate(today.getDate()+offset);
      const sLessons=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,d));
      for(const l of sLessons){
        const lesMin=l.start_hour*60+l.start_min;
        if(offset===0&&lesMin<=today.getHours()*60+today.getMinutes())continue;
        const dayLabel=DK[d.getDay()];
        return `${dayLabel} ${p2(l.start_hour)}:${p2(l.start_min)}`;
      }
    }
    return "-";
  };

  // ── 수업 준비: 다음 수업 컨텍스트 ──
  const getNextLessonPrep=()=>{
    for(let offset=0;offset<7;offset++){
      const d=new Date(today);d.setDate(today.getDate()+offset);
      const dayLessons=lessons.filter(l=>lessonOnDate(l,d))
        .sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));
      for(const l of dayLessons){
        const lesMin=l.start_hour*60+l.start_min;
        if(offset===0&&lesMin<=today.getHours()*60+today.getMinutes())continue;
        const stu=getStu(l.student_id);
        if(!stu||stu.archived)continue;
        // 이 학생의 최근 수업 (현재 수업 제외, 과거만)
        const pastLessons=lessons.filter(pl=>pl.student_id===l.student_id&&pl.id!==l.id&&(pl.date||"")<fd(d))
          .sort((a,b)=>(b.date||"").localeCompare(a.date||""));
        const last=pastLessons[0]||null;
        const lastHw=last?.homework||[];
        const hwTotal=lastHw.length;
        const hwDone=lastHw.filter(h=>(h.completion_pct||0)>=100).length;
        // 성적 추이
        const stuScores=scores.filter(sc=>sc.student_id===l.student_id)
          .sort((a,b)=>(a.date||"").localeCompare(b.date||""));
        let scoreTrend=null,lastScore=null;
        if(stuScores.length>=2){
          const cur=stuScores[stuScores.length-1].score,prev=stuScores[stuScores.length-2].score;
          scoreTrend=cur>prev?"up":cur<prev?"down":"same";
        }
        if(stuScores.length>0)lastScore=stuScores[stuScores.length-1];
        const dayLabel=offset===0?"오늘":offset===1?"내일":`${DK[d.getDay()]}요일`;
        return{lesson:l,student:stu,dayLabel,dateStr:`${p2(d.getMonth()+1)}/${p2(d.getDate())}`,last,hwTotal,hwDone,scoreTrend,lastScore};
      }
    }
    return null;
  };
  const nextPrep=getNextLessonPrep();

  // ── 기록 미완료: 최근 14일, 비반복 수업 중 content 비어있는 것 ──
  const unrecorded=lessons.filter(l=>{
    if(l.is_recurring)return false;
    const ld=new Date((l.date||"").slice(0,10));
    const diff=(today-ld)/(1000*60*60*24);
    if(diff<0||diff>14)return false;
    if(diff<1){const em=l.start_hour*60+l.start_min+l.duration;if(em>today.getHours()*60+today.getMinutes())return false;}
    return(!l.content||l.content.trim()==="");
  }).sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  // ── 학생 주의 신호 ──
  const studentAlerts=[];
  activeStudents.forEach(s=>{
    const al=[];
    // 숙제 미완료율 높음
    const stuHw=lessons.filter(l=>l.student_id===s.id).flatMap(l=>l.homework||[]);
    const recentHw=stuHw.slice(-10);
    if(recentHw.length>=2){
      const inc=recentHw.filter(h=>(h.completion_pct||0)<100).length;
      const rate=Math.round((1-inc/recentHw.length)*100);
      if(rate<50)al.push({type:"hw",label:`숙제 완료율 ${rate}%`,color:C.dn,bg:C.db});
    }
    // 성적 하락
    const stuScores=scores.filter(sc=>sc.student_id===s.id).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    if(stuScores.length>=2){
      const cur=stuScores[stuScores.length-1].score,prev=stuScores[stuScores.length-2].score;
      if(cur<prev)al.push({type:"score",label:`성적 하락 ${prev}→${cur}`,color:C.wn,bg:C.wb});
    }
    if(al.length>0)studentAlerts.push({student:s,alerts:al});
  });

  // ── Today's date formatted ──
  const todayLabel=`${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일 ${DK[today.getDay()]}요일`;

  const stats=[
    {l:"전체 학생",v:String(activeStudents.length),sub:"관리 중",c:C.ac,click:()=>onNav("students")},
    {l:"이번 주 수업",v:String(thisWeekTotal),sub:`오늘 ${todayClasses.length}`,c:C.su,click:()=>onNav("schedule")},
  ];

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);

  return(
    <div className="main-pad" style={{padding:28}}>
      <style>{`.hcard{transition:all .12s;cursor:pointer;}.hcard:hover{background:${C.sfh}!important;}
        @media(max-width:768px){.dash-stats{grid-template-columns:repeat(2,1fr)!important;}.dash-main{grid-template-columns:1fr!important;}.main-pad{padding:16px!important;}}
        @media(max-width:480px){.dash-stats{grid-template-columns:1fr 1fr!important;}.dash-stats>div{padding:14px!important;}}`}</style>

      {/* Header */}
      <div style={{marginBottom:28,display:"flex",alignItems:"center",gap:12}}>
        {tog}
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:C.tp}}>안녕하세요, 선생님 👋</h1>
          <p style={{fontSize:14,color:C.ts,marginTop:4}}>{todayLabel}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-stats" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,marginBottom:28}}>
        {stats.map((s,i)=>(<div key={i} onClick={s.click} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20,cursor:"pointer"}} className="hcard"><div style={{fontSize:12,color:C.tt,marginBottom:6}}>{s.l}</div><div style={{fontSize:24,fontWeight:700,color:C.tp}}>{s.v}</div><div style={{fontSize:11,color:s.c,marginTop:4}}>{s.sub}</div></div>))}
      </div>

      {/* Main grid */}
      <div className="dash-main" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
        {/* Left column */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* 수업 준비 카드 */}
          <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,color:C.tp}}>다음 수업 준비</h3>
              {nextPrep&&<span style={{fontSize:12,color:C.ac,fontWeight:600}}>{nextPrep.dayLabel} {p2(nextPrep.lesson.start_hour)}:{p2(nextPrep.lesson.start_min)}</span>}
            </div>
            {nextPrep?(()=>{
              const{lesson:nl,student:ns,last,hwTotal,hwDone,scoreTrend,lastScore}=nextPrep;
              const co=SC[(ns.color_index||0)%8];
              const em=nl.start_hour*60+nl.start_min+nl.duration;
              return(
                <div onClick={()=>onDetail(ns)} style={{cursor:"pointer",borderRadius:12,border:`1px solid ${C.bl}`,borderLeft:`4px solid ${co.b}`,padding:16}} className="hcard">
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                    <div style={{width:40,height:40,borderRadius:10,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:co.t}}>{(ns.name||"?")[0]}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:16,fontWeight:700,color:C.tp}}>{ns.name}</div>
                      <div style={{fontSize:12,color:C.ts}}>{nl.subject} · {p2(nl.start_hour)}:{p2(nl.start_min)}~{p2(Math.floor(em/60))}:{p2(em%60)}</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    <div style={{background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,color:C.tt,marginBottom:4}}>지난 수업</div>
                      <div style={{fontSize:12,fontWeight:600,color:C.tp}}>{last?.topic||last?.subject||"기록 없음"}</div>
                    </div>
                    <div style={{background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,color:C.tt,marginBottom:4}}>내준 숙제</div>
                      <div style={{fontSize:12,fontWeight:600,color:hwTotal===0?C.tt:C.tp}}>{hwTotal===0?"없음":`${hwTotal}건`}</div>
                    </div>
                    <div style={{background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,color:C.tt,marginBottom:4}}>최근 성적</div>
                      <div style={{fontSize:12,fontWeight:600,color:scoreTrend==="up"?C.su:scoreTrend==="down"?C.dn:C.tp}}>
                        {lastScore?`${lastScore.score}점 ${scoreTrend==="up"?"↑":scoreTrend==="down"?"↓":"→"}`:"기록 없음"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })():(
              <div style={{textAlign:"center",padding:30,color:C.tt}}><div style={{fontSize:14}}>예정된 수업이 없습니다</div></div>
            )}
          </div>

          {/* Upcoming classes (next 3 days) */}
          {upcomingDays.length>0&&(
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
            <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:16}}>빠른 작업</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[{l:"수업 추가",d:"새 수업 일정",bg:C.as,c:C.ac,p:"schedule"},{l:"학생 추가",d:"새 학생 등록",bg:C.sb,c:C.su,p:"students"},{l:"수업료 관리",d:"청구/확인",bg:C.wb,c:C.wn,p:"tuition"},{l:"일정 보기",d:"이번 주 일정",bg:C.db,c:C.dn,p:"schedule"}].map((a,i)=>(<button key={i} onClick={()=>onNav(a.p)} style={{background:a.bg,borderRadius:12,padding:16,border:"none",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}} className="hcard"><div style={{fontSize:14,fontWeight:600,color:a.c,marginBottom:4}}>{a.l}</div><div style={{fontSize:11,color:C.tt}}>{a.d}</div></button>))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* 기록 미완료 */}
          {unrecorded.length>0&&(
            <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
              <h3 style={{fontSize:15,fontWeight:600,color:C.tp,marginBottom:12}}>기록 미완료 <span style={{fontSize:12,fontWeight:500,color:C.wn,marginLeft:4}}>{unrecorded.length}건</span></h3>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {unrecorded.slice(0,5).map(l=>{const stu=getStu(l.student_id);const co=getCol(l.student_id);const ld=(l.date||"").slice(5,10).replace("-","/");return(
                  <div key={l.id} onClick={()=>stu&&onDetail(stu)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.bl}`,cursor:"pointer"}} className="hcard">
                    <div style={{width:22,height:22,borderRadius:6,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:co.t}}>{(stu?.name||"?")[0]}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.tp}}>{stu?.name||"-"}</div>
                      <div style={{fontSize:10,color:C.tt}}>{ld} · {l.subject}</div>
                    </div>
                    <span style={{fontSize:9,color:C.wn,background:C.wb,padding:"2px 6px",borderRadius:4,fontWeight:600}}>미기록</span>
                  </div>);})}
                {unrecorded.length>5&&<div style={{fontSize:11,color:C.tt,textAlign:"center",paddingTop:4}}>외 {unrecorded.length-5}건</div>}
              </div>
            </div>
          )}

          {/* 학생 주의 신호 */}
          {studentAlerts.length>0&&(
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
            </div>
          )}

          {/* Weekly chart */}
          <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,color:C.tp,margin:0}}>주간 수업</h3>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={()=>setWeekOff(w=>w-1)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.ts,fontFamily:"inherit"}}>◀</button>
                {weekOff!==0&&<button onClick={()=>setWeekOff(0)} style={{background:C.as,border:`1px solid ${C.ac}`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:11,color:C.ac,fontWeight:600,fontFamily:"inherit"}}>이번주</button>}
                <span style={{fontSize:11,color:C.ts,minWidth:90,textAlign:"center"}}>{`${p2(wk[0].getMonth()+1)}/${p2(wk[0].getDate())} ~ ${p2(wk[6].getMonth()+1)}/${p2(wk[6].getDate())}`}</span>
                <button onClick={()=>setWeekOff(w=>w+1)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.ts,fontFamily:"inherit"}}>▶</button>
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
          </div>

          {/* Student list */}
          <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h3 style={{fontSize:15,fontWeight:600,color:C.tp}}>학생 현황</h3>
              <button onClick={()=>onNav("students")} style={{fontSize:11,color:C.ac,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>전체보기 →</button>
            </div>
            <div style={{maxHeight:320,overflow:"auto"}}>
              {activeStudents.map((s,i)=>{const col=SC[(s.color_index||0)%8];const nc=getNextClass(s.id);return(
                <div key={s.id} onClick={()=>onDetail(s)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px",borderBottom:i<activeStudents.length-1?`1px solid ${C.bl}`:"none",cursor:"pointer",borderRadius:6}} className="hcard">
                  <div style={{width:28,height:28,borderRadius:7,background:col.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:col.t}}>{(s.name||"?")[0]}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:C.tp}}>{s.name}</div><div style={{fontSize:11,color:C.tt}}>{s.subject} · {s.grade}</div></div>
                  <span style={{fontSize:11,color:C.tt}}>{nc}</span>
                </div>);})}
              {activeStudents.length===0&&<div style={{textAlign:"center",padding:20,color:C.tt,fontSize:13}}>학생을 추가해보세요</div>}
            </div>
          </div>

          {/* 수업료 요약 */}
          <div onClick={()=>onNav("tuition")} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} className="hcard">
            <div><span style={{fontSize:11,color:C.tt}}>월 수입</span><span style={{fontSize:13,fontWeight:600,color:C.tp,marginLeft:8}}>{totalFee>0?`₩${totalFee.toLocaleString()}`:"₩0"}</span></div>
            <div style={{width:1,height:20,background:C.bd}}/>
            <div><span style={{fontSize:11,color:C.tt}}>미수금</span><span style={{fontSize:13,fontWeight:600,color:unpaidAmount>0?C.dn:C.su,marginLeft:8}}>{unpaidAmount>0?`₩${unpaidAmount.toLocaleString()}`:"₩0"}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
