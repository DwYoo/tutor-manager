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
  const[loading,setLoading]=useState(true);
  const[weekOff,setWeekOff]=useState(0);

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const[sRes,lRes,tRes]=await Promise.all([
      supabase.from('students').select('*').order('created_at'),
      supabase.from('lessons').select('*').order('date'),
      supabase.from('tuition').select('*'),
    ]);
    setStudents(sRes.data||[]);setLessons(lRes.data||[]);setTuitions(tRes.data||[]);setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  /* ── Derived data ── */
  const today=new Date();const todayStr=fd(today);
  const todayDw=today.getDay()===0?7:today.getDay();
  const wkBase=new Date(today);wkBase.setDate(today.getDate()+weekOff*7);
  const wk=gwd(wkBase);
  const curMonth=`${today.getFullYear()}-${p2(today.getMonth()+1)}`;
  const year=today.getFullYear(),month=today.getMonth()+1;

  // Helper: does this lesson occur on this date?
  const lessonOnDate=(l,date)=>{
    const ds=fd(date),dw=date.getDay()===0?7:date.getDay();
    if(l.date===ds)return true;
    if(l.is_recurring&&l.recurring_day===dw)return date>=new Date(l.date);
    return false;
  };

  // Today's classes
  const todayClasses=lessons.filter(l=>lessonOnDate(l,today))
    .sort((a,b)=>(a.start_hour*60+a.start_min)-(b.start_hour*60+b.start_min));

  // Week classes by day
  const weekData=wk.map((d,i)=>{
    const cnt=lessons.filter(l=>lessonOnDate(l,d)).length;
    return{day:DKS[i],c:cnt};
  });
  const weekTotal=weekData.reduce((a,d)=>a+d.c,0);
  const thisWeekTotal=weekOff===0?weekTotal:gwd(today).reduce((a,d)=>a+lessons.filter(l=>lessonOnDate(l,d)).length,0);
  const todayIdx=weekOff===0?(today.getDay()===0?6:today.getDay()-1):-1;

  // ── Fee calculation: same as Tuition (fee_per_class × lessons this month) ──
  const countMonthLessons=(sid)=>{
    const dim=new Date(year,month,0).getDate();
    let cnt=0;
    for(let d=1;d<=dim;d++){
      const dt=new Date(year,month-1,d);
      cnt+=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,dt)).length;
    }
    return cnt;
  };

  const monthRecs=students.map(s=>{
    const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);
    const lessonCnt=countMonthLessons(s.id);
    const calcFee=(s.fee_per_class||0)*lessonCnt;
    const carryover=rec?.carryover||0;
    const totalDue=calcFee+carryover;
    const paidAmount=rec?.amount||0;
    const status=rec?.status||"unpaid";
    return{student:s,totalDue,paidAmount,status};
  });

  const totalFee=monthRecs.reduce((a,r)=>a+r.totalDue,0);
  const totalPaid=monthRecs.reduce((a,r)=>a+r.paidAmount,0);
  const unpaidRecs=monthRecs.filter(r=>r.status!=="paid");
  const unpaidAmount=Math.max(0,totalFee-totalPaid);

  // ── Next class per student (from actual lessons) ──
  const getNextClass=(sid)=>{
    // Check today and next 14 days
    for(let offset=0;offset<14;offset++){
      const d=new Date(today);d.setDate(today.getDate()+offset);
      const sLessons=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,d));
      for(const l of sLessons){
        const lesMin=l.start_hour*60+l.start_min;
        // If today, only future lessons
        if(offset===0&&lesMin<=today.getHours()*60+today.getMinutes())continue;
        const dayLabel=DK[d.getDay()];
        return `${dayLabel} ${p2(l.start_hour)}:${p2(l.start_min)}`;
      }
    }
    return "-";
  };

  const getStu=sid=>students.find(x=>x.id===sid);
  const getCol=sid=>{const s=getStu(sid);return SC[(s?.color_index||0)%8];};

  const stats=[
    {l:"전체 학생",v:String(students.length),sub:"관리 중",c:C.ac,click:()=>onNav("students")},
    {l:"이번 주 수업",v:String(thisWeekTotal),sub:`오늘 ${todayClasses.length}`,c:C.su,click:()=>onNav("schedule")},
    {l:"월 수입",v:totalFee>0?`₩${Math.round(totalFee/10000)}만`:"₩0",sub:"이번 달",c:C.wn,click:()=>onNav("tuition")},
    {l:"미수금",v:unpaidAmount>0?`₩${Math.round(unpaidAmount/10000)}만`:"₩0",sub:`${unpaidRecs.length}명`,c:C.dn,click:()=>onNav("tuition")},
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
          <p style={{fontSize:14,color:C.ts,marginTop:4}}>오늘의 수업과 학생 현황을 확인하세요.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28}}>
        {stats.map((s,i)=>(<div key={i} onClick={s.click} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20,cursor:"pointer"}} className="hcard"><div style={{fontSize:12,color:C.tt,marginBottom:6}}>{s.l}</div><div style={{fontSize:24,fontWeight:700,color:C.tp}}>{s.v}</div><div style={{fontSize:11,color:s.c,marginTop:4}}>{s.sub}</div></div>))}
      </div>

      {/* Main grid */}
      <div className="dash-main" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
        {/* Left column */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Today's classes */}
          <div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600,color:C.tp}}>오늘 수업</h3>
              <button onClick={()=>onNav("schedule")} style={{fontSize:11,color:C.ac,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>전체 일정 →</button>
            </div>
            {todayClasses.length===0?(
              <div style={{textAlign:"center",padding:30,color:C.tt}}><div style={{fontSize:14}}>오늘 예정된 수업이 없습니다</div></div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {todayClasses.map(l=>{const stu=getStu(l.student_id);const co=getCol(l.student_id);const em=l.start_hour*60+l.start_min+l.duration;return(
                  <div key={l.id} onClick={()=>stu&&onDetail(stu)} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",borderRadius:10,border:`1px solid ${C.bl}`,borderLeft:`4px solid ${co.b}`,cursor:"pointer"}} className="hcard">
                    <div style={{fontSize:13,color:C.tt,fontWeight:500,minWidth:100}}>{p2(l.start_hour)}:{p2(l.start_min)}~{p2(Math.floor(em/60))}:{p2(em%60)}</div>
                    <div style={{width:32,height:32,borderRadius:8,background:co.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:co.t}}>{(stu?.name||"?")[0]}</div>
                    <div><div style={{fontSize:14,fontWeight:600,color:C.tp}}>{stu?.name||"-"}</div><div style={{fontSize:12,color:C.ts}}>{l.subject} · {l.topic||"-"}</div></div>
                  </div>);})}
              </div>
            )}
          </div>

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
              {students.map((s,i)=>{const col=SC[(s.color_index||0)%8];const nc=getNextClass(s.id);return(
                <div key={s.id} onClick={()=>onDetail(s)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px",borderBottom:i<students.length-1?`1px solid ${C.bl}`:"none",cursor:"pointer",borderRadius:6}} className="hcard">
                  <div style={{width:28,height:28,borderRadius:7,background:col.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:col.t}}>{(s.name||"?")[0]}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:C.tp}}>{s.name}</div><div style={{fontSize:11,color:C.tt}}>{s.subject} · {s.grade}</div></div>
                  <span style={{fontSize:11,color:C.tt}}>{nc}</span>
                </div>);})}
              {students.length===0&&<div style={{textAlign:"center",padding:20,color:C.tt,fontSize:13}}>학생을 추가해보세요</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}