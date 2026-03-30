'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { C, STATUS } from '@/components/Colors';
import { p2, lessonOnDate } from '@/lib/utils';
import { exportTuitionCSV } from '@/lib/export';
import { useShell } from '@/components/AppShell';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { SkeletonCard } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { escapeHtml } from '@/lib/sanitize';
import { validateFiles, RECEIPT_MIMES } from '@/lib/fileValidation';
import { getStudentCycles, getExpectedCycleDates, formatCycleDate } from '@/lib/cycleUtils';
import { useLessonCount } from '@/hooks/useLessonCount';
const IcL=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>);
const IcR=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>);
const CustomTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>{d.month}</div><div style={{fontSize:16,fontWeight:700,color:C.ac}}>₩{payload[0].value.toLocaleString()}</div></div>);};

export default function Tuition(){
  const{menuBtn}=useShell();
  const tog=menuBtn;
  const{user}=useAuth();
  const confirm=useConfirm();
  const toast=useToast();
  const now=new Date();
  const[curMonth,setCurMonth]=useState(now.getFullYear()+"-"+p2(now.getMonth()+1));
  const[students,setStudents]=useState([]);
  const[tuitions,setTuitions]=useState([]);
  const[lessons,setLessons]=useState([]);
  const[loading,setLoading]=useState(true);
  const[editId,setEditId]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[memoPopup,setMemoPopup]=useState(null);
  const[memoText,setMemoText]=useState('');
  const[memoSaving,setMemoSaving]=useState(false);
  const[receiptData,setReceiptData]=useState(null);
  const[rcptForm,setRcptForm]=useState({});
  const[rcptFiles,setRcptFiles]=useState([]);
  const[rcptUploading,setRcptUploading]=useState(false);
  const[rcptDragOver,setRcptDragOver]=useState(false);
  const[sealImg,setSealImg]=useState(()=>{try{return localStorage.getItem('rcpt-seal')||'';}catch{return '';}});
  const[showSignPad,setShowSignPad]=useState(false);
  const signCanvasRef=useRef(null);
  const signDrawing=useRef(false);
  const[sealLoading,setSealLoading]=useState(false);
  const[hiddenStudents,setHiddenStudents]=useState(()=>{try{return JSON.parse(localStorage.getItem('tuition-hidden')||'{}');}catch{return{};}});
  const[showHidden,setShowHidden]=useState(false);
  const[isMobile,setIsMobile]=useState(false);
  const[viewMode,setViewMode]=useState(()=>{try{return localStorage.getItem('tuition-view-mode')||'cycle';}catch{return'cycle';}});
  const[cycleOffset,setCycleOffset]=useState(0);
  useEffect(()=>{const ck=()=>setIsMobile(window.innerWidth<640);ck();window.addEventListener("resize",ck);return()=>window.removeEventListener("resize",ck);},[]);

  // Sync seal image & tutor name from Supabase Storage (cross-device)
  const uploadSealToStorage=async(dataUrl)=>{
    if(!user?.id||!dataUrl)return;
    try{
      const res=await fetch(dataUrl);
      const blob=await res.blob();
      const path=`${user.id}/seal/current.png`;
      await supabase.storage.from('receipts').remove([path]);
      await supabase.storage.from('receipts').upload(path,blob,{contentType:'image/png'});
    }catch(e){console.error('Seal upload error:',e);}
  };
  const uploadTutorNameToStorage=async(name)=>{
    if(!user?.id)return;
    try{
      const path=`${user.id}/seal/tutor-name.txt`;
      const blob=new Blob([name],{type:'text/plain'});
      await supabase.storage.from('receipts').remove([path]);
      if(name)await supabase.storage.from('receipts').upload(path,blob,{contentType:'text/plain'});
    }catch(e){console.error('Tutor name upload error:',e);}
  };
  useEffect(()=>{
    if(!user?.id)return;
    let cancelled=false;
    (async()=>{
      setSealLoading(true);
      try{
        const sealPath=`${user.id}/seal/current.png`;
        const namePath=`${user.id}/seal/tutor-name.txt`;
        const[sealRes,nameRes]=await Promise.all([
          supabase.storage.from('receipts').download(sealPath),
          supabase.storage.from('receipts').download(namePath),
        ]);
        if(cancelled)return;
        // Tutor name
        if(!nameRes.error&&nameRes.data){
          const txt=await nameRes.data.text();
          if(!cancelled&&txt){try{localStorage.setItem('rcpt-tutor',txt);}catch{}}
        }
        // Seal image
        if(sealRes.error){setSealLoading(false);return;}
        const reader=new FileReader();
        reader.onload=(ev)=>{
          if(cancelled)return;
          const dataUrl=ev.target?.result;
          if(dataUrl){setSealImg(dataUrl);try{localStorage.setItem('rcpt-seal',dataUrl);}catch{}}
          setSealLoading(false);
        };
        reader.onerror=()=>{if(!cancelled)setSealLoading(false);};
        reader.readAsDataURL(sealRes.data);
      }catch{if(!cancelled)setSealLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[user?.id]);

  // Close receipt modal on ESC
  useEffect(()=>{
    const onKey=(e)=>{if(e.key==='Escape')setReceiptData(null);};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[]);

  const year=+curMonth.split("-")[0],month=+curMonth.split("-")[1];
  const prevM=()=>{const m=month===1?12:month-1;const y=month===1?year-1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});setShowHidden(false);};
  const nextM=()=>{const m=month===12?1:month+1;const y=month===12?year+1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});setShowHidden(false);};
  const isMonthlyMode=viewMode==='monthly';

  const[fetchError,setFetchError]=useState(false);
  const[saving,setSaving]=useState(false);
  const fetchData=useCallback(async()=>{
    setLoading(true);setFetchError(false);
    try{
      const[sRes,tRes,lRes,rfRes]=await Promise.all([
        supabase.from('students').select('id,name,subject,grade,school,color_index,archived,sort_order,fee_per_class,fee_status,birth_date,created_at,sessions_per_cycle').order('created_at'),
        supabase.from('tuition').select('*'),
        supabase.from('lessons').select('id,student_id,date,start_hour,start_min,duration,status,is_recurring,recurring_day,recurring_end_date,recurring_exceptions'),
        supabase.from('receipt_files').select('*').order('created_at',{ascending:false}),
      ]);
      if(sRes.error||tRes.error||lRes.error||rfRes.error){setFetchError(true);setLoading(false);return;}
      setStudents(sRes.data||[]);setTuitions(tRes.data||[]);setLessons(lRes.data||[]);setRcptFiles(rfRes.data||[]);
    }catch{setFetchError(true);}
    setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  /* Count lessons for student in month — memoized via useLessonCount hook */
  const countLessonsHook=useLessonCount(lessons,year,month);
  const countLessons=(sid,yr,mo)=>{
    // If the requested year/month matches current view, use the memoized hook
    if(yr===year&&mo===month)return countLessonsHook(sid);
    // Fallback for different months (rare - only for carryover checks)
    const dim=new Date(yr,mo,0).getDate();
    let cnt=0;
    for(let d=1;d<=dim;d++){
      const dt=new Date(yr,mo-1,d);
      cnt+=lessons.filter(l=>l.student_id===sid&&l.status!=='cancelled'&&lessonOnDate(l,dt)).length;
    }
    return cnt;
  };

  /* Auto status */
  const autoStatus=(amt,due)=>amt>=due?"paid":amt>0?"partial":"unpaid";

  /* Build month records (보관 학생: 해당 월 활동이 있으면 포함) */
  const activeStudents=students.filter(s=>!s.archived).sort((a,b)=>(a.sort_order??Infinity)-(b.sort_order??Infinity));
  const archivedWithActivity=students.filter(s=>{
    if(!s.archived)return false;
    const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);
    const lc=countLessons(s.id,year,month);
    if(lc>0)return true;
    if(rec){
      const af=(s.fee_per_class||0)*lc;
      const co=rec.carryover||0;
      const fm=!!(rec.fee_manual&&rec.fee_override!=null);
      const td=fm?rec.fee_override:(af+co);
      if(af!==0||td!==0||(rec.amount||0)!==0)return true;
    }
    return false;
  }).sort((a,b)=>(a.sort_order??Infinity)-(b.sort_order??Infinity));
  const allStudents=[...activeStudents,...archivedWithActivity];
  /* Student numbers: sort_order 기반 (보관=유지, 순서변경=반영, 삭제=당겨짐) */
  const stuNumMap={};[...students].sort((a,b)=>{const sa=a.sort_order??Infinity,sb=b.sort_order??Infinity;if(sa!==sb)return sa-sb;if(!!a.archived!==!!b.archived)return a.archived?1:-1;const ca=new Date(a.created_at).getTime(),cb=new Date(b.created_at).getTime();return ca!==cb?ca-cb:(a.id<b.id?-1:1);}).forEach((s,i)=>{stuNumMap[s.id]=i+1;});

  /* 8-session cycle computations */
  const studentCyclesMap=useMemo(()=>{const map={};for(const s of allStudents){map[s.id]=getStudentCycles(lessons,s.id,s.sessions_per_cycle??8);}return map;},[students,lessons]);
  const todayStr=new Date().toISOString().slice(0,10);
  const maxCycleOffset=useMemo(()=>allStudents.reduce((mx,s)=>{const cycles=studentCyclesMap[s.id]||[];const activeCycles=cycles.filter(c=>c.startDate&&c.startDate<=todayStr);const latest=activeCycles.length>0?activeCycles[activeCycles.length-1].cycleNumber:0;return Math.max(mx,Math.max(0,latest-1));},0),[allStudents,studentCyclesMap,todayStr]);
  useEffect(()=>{if(cycleOffset>maxCycleOffset)setCycleOffset(maxCycleOffset);},[cycleOffset,maxCycleOffset]);
  const cycleRecs=allStudents.map(s=>{const spc=s.sessions_per_cycle??8;const isHiatus=spc===0;const cycles=studentCyclesMap[s.id]||[];const activeCycles=cycles.filter(c=>c.startDate&&c.startDate<=todayStr);const latestCycleNum=activeCycles.length>0?activeCycles[activeCycles.length-1].cycleNumber:0;const targetCycleNum=cycleOffset===0?Math.max(1,latestCycleNum):Math.max(0,latestCycleNum-cycleOffset);const cycleInfo=targetCycleNum>0?cycles.find(c=>c.cycleNumber===targetCycleNum):null;const cyclePeriodKey=targetCycleNum>0?`cyc-${String(targetCycleNum).padStart(2,'0')}`:null;const rec=cyclePeriodKey?tuitions.find(t=>t.student_id===s.id&&t.month===cyclePeriodKey):null;
    /* 실제 완료된 수업 수 (오늘 이전, 해당 기수 범위 내) */
    const cycleStart=cycleInfo?.startDate;const cycleEnd=cycleInfo?.endDate;const pastSessionsInCycle=cycleStart?lessons.filter(l=>l.student_id===s.id&&l.status!=='cancelled'&&l.status!=='makeup'&&(l.date||'')>=cycleStart&&(l.date||'')<=todayStr&&(!cycleEnd||(l.date||'')<=cycleEnd)).length:0;
    const hasReachedCycle=pastSessionsInCycle>0;
    /* 요금 기준: 기수 전체(spc), 수동 override 가능 */
    const classesOverridden=rec?.classes_override!=null;const autoLessonCnt=spc;const lessonCnt=classesOverridden?rec.classes_override:autoLessonCnt;const autoFee=(s.fee_per_class||0)*lessonCnt;const tuitionFeeManual=rec?.tuition_fee_override!=null;const displayFee=tuitionFeeManual?rec.tuition_fee_override:autoFee;const carryover=rec?.carryover||0;const autoTotalDue=displayFee+carryover;const totalDueManual=!!(rec&&rec.fee_manual&&rec.fee_override!=null);const totalDue=totalDueManual?rec.fee_override:autoTotalDue;const paidAmount=rec?.amount||0;const status=autoStatus(paidAmount,totalDue);const{expectedStart,expectedEnd}=cycleInfo&&cycleInfo.isComplete?{expectedStart:null,expectedEnd:null}:getExpectedCycleDates(lessons,s.id,spc);return{student:s,record:rec||{student_id:s.id,month:cyclePeriodKey||'',period_type:'cycle',cycle_number:targetCycleNum,status:'unpaid',amount:0,carryover:0,memo:''},cycleInfo,cyclePeriodKey,targetCycleNum,hasReachedCycle,sessionsPerCycle:spc,isHiatus,pastSessionsInCycle,expectedStart,expectedEnd,autoLessonCnt,lessonCnt,classesOverridden,autoFee,carryover,autoTotalDue,totalDue,displayFee,paidAmount,status,tuitionFeeManual,totalDueManual,hasSavedTotalDueOverride:!!(rec&&rec.fee_override!=null),isArchived:!!s.archived};});

  const monthRecs=allStudents.map(s=>{
    const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);
    const autoLessonCnt=countLessons(s.id,year,month);
    const lessonCnt=(rec&&rec.classes_override!=null)?rec.classes_override:autoLessonCnt;
    const classesOverridden=(rec&&rec.classes_override!=null);
    const autoFee=(s.fee_per_class||0)*lessonCnt;
    const tuitionFeeManual=rec?.tuition_fee_override!=null;
    const displayFee=tuitionFeeManual?rec.tuition_fee_override:autoFee;
    const carryover=rec?.carryover||0;
    const autoTotalDue=displayFee+carryover;
    const totalDueManual=!!(rec&&rec.fee_manual&&rec.fee_override!=null);
    const totalDue=totalDueManual?rec.fee_override:autoTotalDue;
    const paidAmount=rec?.amount||0;
    const status=autoStatus(paidAmount,totalDue);
    return{student:s,record:rec||{student_id:s.id,month:curMonth,status:"unpaid",amount:0,carryover:0,memo:""},autoLessonCnt,lessonCnt,classesOverridden,autoFee,carryover,autoTotalDue,totalDue,displayFee,paidAmount,status,tuitionFeeManual,totalDueManual,hasSavedTotalDueOverride:!!(rec&&rec.fee_override!=null),isArchived:!!s.archived};
  });

  const displayRecs=isMonthlyMode?monthRecs:cycleRecs;
  /* In cycle mode, align summary totals with displayed rows */
  const statsRecs=isMonthlyMode?monthRecs:cycleRecs.filter(r=>cycleOffset===0||r.targetCycleNum>0);
  const totalFee=statsRecs.reduce((a,r)=>a+r.totalDue,0);
  const totalPaid=statsRecs.reduce((a,r)=>a+r.paidAmount,0);
  const totalUnpaid=statsRecs.reduce((a,r)=>r.status!=="paid"?a+Math.max(0,r.totalDue-r.paidAmount):a,0);
  const collectRate=totalFee>0?Math.max(0,Math.round((totalFee-totalUnpaid)/totalFee*100)):0;

  /* Hide/show students per period */
  const getCurPeriodHideKey=()=>isMonthlyMode?curMonth:`cycle-offset-${cycleOffset}`;
  const toggleHideStudent=(sid)=>{const k=getCurPeriodHideKey();setHiddenStudents(prev=>{const h=prev[k]||[];const n=h.includes(sid)?{...prev,[k]:h.filter(x=>x!==sid)}:{...prev,[k]:[...h,sid]};try{localStorage.setItem('tuition-hidden',JSON.stringify(n));}catch{}return n;});};
  const curHidden=hiddenStudents[getCurPeriodHideKey()]||[];
  const visibleRecs=showHidden?monthRecs:monthRecs.filter(r=>!curHidden.includes(r.student.id));
  const hiddenCount=monthRecs.filter(r=>curHidden.includes(r.student.id)).length;
  const visibleCycleRecs=(showHidden?cycleRecs:cycleRecs.filter(r=>!curHidden.includes(r.student.id))).filter(r=>cycleOffset===0||r.targetCycleNum>0);
  const hiddenCycleCount=cycleRecs.filter(r=>curHidden.includes(r.student.id)).length;

  /* Monthly chart (last 6 months ending at curMonth) */
  const monthlyChart=Array.from({length:6},(_,i)=>{
    const d=new Date(year,month-6+i,1);
    const mk=d.getFullYear()+"-"+p2(d.getMonth()+1);
    const sum=tuitions.filter(t=>t.month===mk).reduce((a,t)=>a+(t.amount||0),0);
    return{month:(d.getMonth()+1)+"월",income:sum};
  });
  /* Cycle chart: relative offsets (5기 전 → 현재) */
  const cycleChart=Array.from({length:6},(_,i)=>{
    const offset=5-i;
    const label=offset===0?'현재':`${offset}기 전`;
    const sum=allStudents.reduce((total,s)=>{
      const cycles=studentCyclesMap[s.id]||[];
      const activeCycles=cycles.filter(c=>c.startDate&&c.startDate<=todayStr);
      const latest=activeCycles.length>0?activeCycles[activeCycles.length-1].cycleNumber:0;
      const targetNum=Math.max(0,latest-offset);
      if(!targetNum)return total;
      const pk=`cyc-${String(targetNum).padStart(2,'0')}`;
      const rec=tuitions.find(t=>t.student_id===s.id&&t.month===pk);
      return total+(rec?.amount||0);
    },0);
    return{month:label,income:sum};
  });

  /* CRUD */
  const startEdit=(r)=>{
    setEditId(r.record.id||r.student.id);
    setEditForm({
      totalDue:r.totalDue,
      carryover:r.carryover,
      amount:r.paidAmount,
      status:autoStatus(r.paidAmount,r.totalDue),
      memo:r.record.memo||"",
      fee_per_class:r.student.fee_per_class||0,
      tuitionFee:r.displayFee,
      paid_date:r.record.paid_date||"",
      cash_receipt_issued:!!r.record.cash_receipt_issued,
      classesOverride:r.classesOverridden?String(r.lessonCnt):"",
      tuitionFeeManual:r.tuitionFeeManual,
      totalDueManual:r.totalDueManual,
      _cyclePeriodKey:r.cyclePeriodKey||null,
      _cycleNumber:r.targetCycleNum||null,
      sessions_per_cycle:r.student.sessions_per_cycle??8,
    });
  };
  const cancelEdit=()=>{setEditId(null);setEditForm({});};

  const saveEdit=async(studentId,autoLessonCnt)=>{
    if(saving)return;setSaving(true);
    try{
      const tuitionFeeVal=parseInt(editForm.tuitionFee)||0;
      const totalDueVal=parseInt(editForm.totalDue)||0;
      const carryoverVal=parseInt(editForm.carryover)||0;
      const editedFeePerClass=parseInt(editForm.fee_per_class)||0;
      const classesOv=editForm.classesOverride!==""?parseInt(editForm.classesOverride):null;
      const effectiveLessons=(classesOv!=null)?classesOv:autoLessonCnt;
      const autoFee=editedFeePerClass*effectiveLessons;
      const isTuitionFeeManual=(tuitionFeeVal!==autoFee);
      const effectiveFee=isTuitionFeeManual?tuitionFeeVal:autoFee;
      const autoTotalDue=effectiveFee+carryoverVal;
      const isTotalDueManual=(totalDueVal!==autoTotalDue);
      const periodKey=isMonthlyMode?curMonth:editForm._cyclePeriodKey;
      const pPayload=isMonthlyMode?{period_type:'monthly'}:{period_type:'cycle',cycle_number:editForm._cycleNumber};
      if(!periodKey){setSaving(false);return;}
      const existing=tuitions.find(t=>t.student_id===studentId&&t.month===periodKey);
      const payload={
        student_id:studentId,month:periodKey,...pPayload,
        status:editForm.status,
        amount:parseInt(editForm.amount)||0,
        carryover:carryoverVal,
        tuition_fee_override:isTuitionFeeManual?tuitionFeeVal:null,
        fee_override:isTotalDueManual?totalDueVal:null,
        fee_manual:isTotalDueManual,
        classes_override:(classesOv!=null&&classesOv!==autoLessonCnt)?classesOv:null,
        memo:editForm.memo,
        paid_date:editForm.paid_date||null,
        cash_receipt_issued:!!editForm.cash_receipt_issued,
        classes:autoLessonCnt,
        user_id:user.id,
      };
      let ok=false;
      if(existing){
        const{error}=await supabase.from('tuition').update(payload).eq('id',existing.id);
        if(error){toast?.('저장에 실패했습니다: '+error.message,'error');return;}
        setTuitions(p=>p.map(t=>t.id===existing.id?{...t,...payload}:t));ok=true;
      }else{
        const{data,error}=await supabase.from('tuition').insert(payload).select().single();
        if(error){toast?.('저장에 실패했습니다: '+error.message,'error');return;}
        if(data){setTuitions(p=>[...p,data]);ok=true;}
      }
      if(ok){
        const feePerClass=editedFeePerClass;
        const rawSpc=parseInt(editForm.sessions_per_cycle);const spc=!isNaN(rawSpc)?rawSpc:8;
        await supabase.from('students').update({fee_status:editForm.status,fee_per_class:feePerClass,sessions_per_cycle:spc}).eq('id',studentId);
        setStudents(p=>p.map(s=>s.id===studentId?{...s,fee_status:editForm.status,fee_per_class:feePerClass,sessions_per_cycle:spc}:s));
        setEditId(null);setEditForm({});
      }
    }finally{setSaving(false);}
  };

  /* 학생별 cycle period key/payload 획득 헬퍼 */
  const getCyclePeriodInfo=(studentId)=>{
    if(isMonthlyMode)return{key:curMonth,payload:{period_type:'monthly'}};
    const r=cycleRecs.find(cr=>cr.student.id===studentId);
    if(!r?.cyclePeriodKey)return null;
    return{key:r.cyclePeriodKey,payload:{period_type:'cycle',cycle_number:r.targetCycleNum}};
  };

  // Toggle cash receipt issued
  const toggleCashReceipt=async(studentId)=>{
    const pi=getCyclePeriodInfo(studentId);
    if(!pi)return;
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===pi.key);
    const newVal=existing?!existing.cash_receipt_issued:true;
    if(existing){
      await supabase.from('tuition').update({cash_receipt_issued:newVal}).eq('id',existing.id);
      setTuitions(p=>p.map(t=>t.id===existing.id?{...t,cash_receipt_issued:newVal}:t));
    }else{
      const{data}=await supabase.from('tuition').insert({student_id:studentId,month:pi.key,...pi.payload,cash_receipt_issued:newVal,status:'unpaid',amount:0,carryover:0,user_id:user.id}).select().single();
      if(data)setTuitions(p=>[...p,data]);
    }
  };

  // 수업료 자동↔수동 토글
  const toggleTuitionFeeMode=async(studentId)=>{
    const pi=getCyclePeriodInfo(studentId);
    if(!pi)return;
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===pi.key);
    if(!existing)return;
    const update={tuition_fee_override:existing.tuition_fee_override!=null?null:existing.tuition_fee_override};
    const{error}=await supabase.from('tuition').update(update).eq('id',existing.id);
    if(error)return;
    setTuitions(p=>p.map(t=>t.id===existing.id?{...t,...update}:t));
  };
  // 청구액 자동↔수동 토글 (이전 수동값 보존)
  const toggleTotalDueMode=async(studentId)=>{
    const pi=getCyclePeriodInfo(studentId);
    if(!pi)return;
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===pi.key);
    if(!existing)return;
    const newManual=!existing.fee_manual;
    const update={fee_manual:newManual};
    if(!newManual)update.fee_override=existing.fee_override;
    const{error}=await supabase.from('tuition').update(update).eq('id',existing.id);
    if(error)return;
    setTuitions(p=>p.map(t=>t.id===existing.id?{...t,...update}:t));
  };
  const toggleClassesMode=async(studentId)=>{
    const pi=getCyclePeriodInfo(studentId);
    if(!pi)return;
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===pi.key);
    if(!existing)return;
    const r=cycleRecs.find(cr=>cr.student.id===studentId);
    const newVal=existing.classes_override!=null?null:(isMonthlyMode?countLessons(studentId,year,month):(r?.cycleInfo?.sessionCount||0));
    const{error}=await supabase.from('tuition').update({classes_override:newVal}).eq('id',existing.id);
    if(error)return;
    setTuitions(p=>p.map(t=>t.id===existing.id?{...t,classes_override:newVal}:t));
  };

  /* Receipt */
  const openReceipt=(r,idx)=>{
    const pd=r.record.paid_date;
    const d=pd?new Date(pd+'T00:00:00'):new Date();
    setReceiptData(r);
    const stuNo=p2(stuNumMap[r.student.id]||((idx??0)+1));
    const cn=r.targetCycleNum||1;
    const serialNo=isMonthlyMode?`${String(year).slice(-2)}${p2(month)}-${stuNo}`:`C${String(cn).padStart(2,'0')}-${stuNo}`;
    const period=isMonthlyMode?`${year}년 ${month}월`:`${cn}기 (${formatCycleDate(r.cycleInfo?.startDate)}~${formatCycleDate(r.cycleInfo?.endDate)})`;
    setRcptForm({
      serialNo,period,
      regNo:p2(stuNumMap[r.student.id]||((idx??0)+1)),
      name:r.student.name||'',birthDate:r.student.birth_date||'',subject:r.student.subject||'',
      tuitionFee:String(r.paidAmount||0),
      etcLabel1:'',etcAmt1:'',etcLabel2:'',etcAmt2:'',
      tutorName:(()=>{try{return localStorage.getItem('rcpt-tutor')||'';}catch{return '';}})(),
      issueYear:String(d.getFullYear()),issueMonth:String(d.getMonth()+1),issueDay:String(d.getDate()),
    });
  };
  const printReceipt=()=>{
    const f=rcptForm;
    try{if(f.tutorName){localStorage.setItem('rcpt-tutor',f.tutorName);uploadTutorNameToStorage(f.tutorName);}}catch{}
    const tFee=parseInt(f.tuitionFee)||0;
    const e1=parseInt(f.etcAmt1)||0;
    const e2=parseInt(f.etcAmt2)||0;
    const total=tFee+e1+e2;
    // 생년월일 6자리 변환 (YYYY-MM-DD → YYMMDD)
    const bd6=(()=>{const b=f.birthDate||'';const m=b.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return m[1].slice(2)+m[2]+m[3];return b.replace(/-/g,'').slice(-6);})();
    const cs='border:1px solid #000;padding:5px 7px;font-size:10px;';
    const h=escapeHtml; // shorthand for escapeHtml
    const makeR=(title)=>`<div style="width:88mm;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
<div>
<div style="border:3px double #000;padding:7px 10px;text-align:center;font-size:14px;font-weight:bold;letter-spacing:3px;margin-bottom:10px;">${h(title)}</div>
<table style="width:100%;border-collapse:collapse;" cellpadding="0">
<tr><td style="${cs}" colspan="2">일련번호 : ${h(f.serialNo)}</td><td style="${cs}" colspan="2">연월(분기) : ${h(f.period)}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;width:32px;" rowspan="2">납부자</td><td style="${cs}">등록번호 : ${h(f.regNo)}</td><td style="${cs}" colspan="2">성명 : ${h(f.name)}</td></tr>
<tr><td style="${cs}">생년월일 : ${h(bd6)}</td><td style="${cs}" colspan="2">교습과목 : ${h(f.subject)}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;width:32px;" rowspan="4">납부<br>명세</td><td style="${cs}text-align:center;vertical-align:middle;width:72px;" rowspan="2">교습비</td><td style="${cs}text-align:center;font-weight:bold;" colspan="2">기타경비</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;">항목</td><td style="${cs}text-align:center;font-weight:bold;">금액</td></tr>
<tr><td style="${cs}text-align:center;vertical-align:middle;font-weight:bold;" rowspan="2">${tFee>0?h(tFee.toLocaleString()+'원'):''}</td><td style="${cs}">${h(f.etcLabel1)}</td><td style="${cs}">${e1>0?h(e1.toLocaleString()+'원'):''}</td></tr>
<tr><td style="${cs}">${h(f.etcLabel2)}</td><td style="${cs}">${e2>0?h(e2.toLocaleString()+'원'):''}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;">합계</td><td style="${cs}text-align:center;font-weight:bold;" colspan="3">${total>0?h(total.toLocaleString()+'원'):''}</td></tr>
</table>
<p style="text-align:center;margin:16px 0 4px;font-size:11px;font-weight:bold;">위와 같이 영수하였음을 증명합니다.</p>
<p style="font-size:8px;color:#555;margin:3px 0 12px;">※ 본 서식 외 교육감이 지정한 영수증을 사용할 수 있습니다.</p>
<p style="text-align:right;margin:16px 4px 0;font-size:11px;">${h(f.issueYear)}년 &nbsp;&nbsp; ${h(f.issueMonth)}월 &nbsp;&nbsp; ${h(f.issueDay)}일</p>
<table style="width:100%;margin-top:20px;font-size:11px;border-collapse:collapse;">
<tr><td style="vertical-align:bottom;padding:4px 0;">학원설립·운영자<br>또는 교습자</td><td style="text-align:right;vertical-align:bottom;padding:4px 0;"><span style="font-size:13px;font-weight:bold;letter-spacing:2px;">${h(f.tutorName)}</span>&nbsp;&nbsp;${sealImg?`<img src="${h(sealImg)}" style="height:44px;width:44px;object-fit:contain;vertical-align:middle;"/>`:' (서명 또는 인)'}</td></tr>
</table>
</div>
<div style="text-align:right;font-size:7px;color:#999;margin-top:auto;padding-top:8px;">210mm×297mm[일반용지 70g/㎡(재활용품)]</div>
</div>`;
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>교습비등 영수증</title>
<style>
@page{size:210mm 297mm;margin:12mm 10mm;}
*{margin:0;padding:0;box-sizing:border-box;}
body{margin:0;padding:0;font-family:'Batang','NanumMyeongjo','Noto Serif KR',serif;font-size:10px;color:#000;width:210mm;height:297mm;overflow:hidden;}
.rcpt-wrap{display:flex;gap:10mm;width:100%;height:100%;padding:12mm 10mm;box-sizing:border-box;justify-content:center;}
@media print{body{padding:0;width:auto;height:auto;overflow:hidden;}.rcpt-wrap{padding:0;height:273mm;}}
</style></head><body>
<div class="rcpt-wrap">${makeR('교습비등 영수증 원부')}${makeR('교습비등 영수증')}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},400);}<\/script>
</body></html>`;
    const w=window.open('','_blank','width=794,height=1123');
    if(w){w.document.write(html);w.document.close();}
  };

  /* Receipt file storage */
  const uploadRcptFiles=async(fileList)=>{
    if(!fileList?.length)return;
    setRcptUploading(true);
    let ok=0,fail=0;
    try{
      for(const file of fileList){
        const path=`${user.id}/${curMonth}/${Date.now()}_${file.name}`;
        const{error:upErr}=await supabase.storage.from('receipts').upload(path,file);
        if(upErr){console.error('Storage upload error:',upErr);fail++;continue;}
        const{data,error:dbErr}=await supabase.from('receipt_files').insert({user_id:user.id,month:curMonth,file_name:file.name,file_path:path,file_size:file.size,mime_type:file.type||'application/pdf'}).select().single();
        if(dbErr){console.error('DB insert error:',dbErr);await supabase.storage.from('receipts').remove([path]);fail++;continue;}
        if(data)setRcptFiles(p=>[data,...p]);
        ok++;
      }
    }finally{setRcptUploading(false);}
    if(fail>0)toast?.(`${fail}개 파일 업로드 실패`,'error');
    else if(ok>0)toast?.(`${ok}개 파일 업로드 완료`);
  };
  const uploadRcptFile=async(e)=>{await uploadRcptFiles(e.target.files);e.target.value='';};
  const deleteRcptFile=async(f)=>{
    if(!await confirm(`"${f.file_name}" 파일을 삭제하시겠습니까?`,{danger:true,confirmText:'삭제'}))return;
    await supabase.storage.from('receipts').remove([f.file_path]);
    await supabase.from('receipt_files').delete().eq('id',f.id);
    setRcptFiles(p=>p.filter(x=>x.id!==f.id));
  };
  const downloadRcptFile=async(f)=>{
    const{data}=await supabase.storage.from('receipts').createSignedUrl(f.file_path,60);
    if(data?.signedUrl)window.open(data.signedUrl,'_blank');
  };
  const curMonthFiles=rcptFiles.filter(f=>f.month===curMonth);
  const rcptMonths=[...new Set(rcptFiles.map(f=>f.month))].sort().reverse();

  if(loading)return(
  <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{width:160,height:28,borderRadius:8,background:"linear-gradient(90deg, #F5F5F4 25%, #F0EFED 50%, #F5F5F4 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
    </div>
    <SkeletonCard lines={6}/>
    <div style={{marginTop:16}}><SkeletonCard lines={4}/></div>
  </div>
);
  if(fetchError)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:14,color:C.dn}}>데이터를 불러오지 못했습니다</div><button onClick={fetchData} style={{padding:"8px 20px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,color:C.tp,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>다시 시도</button></div>);

  const eis={padding:"4px 6px",borderRadius:6,border:"1px solid "+C.bd,fontSize:12,fontFamily:"inherit"};
  const rls={display:"block",fontSize:11,fontWeight:500,color:C.tt,marginBottom:3};
  const ris={width:"100%",padding:"7px 10px",borderRadius:6,border:"1px solid "+C.bd,fontSize:13,fontFamily:"inherit",color:C.tp,background:C.sf,outline:"none",boxSizing:"border-box"};

  return(
    <div className="tui-container" style={{padding:isMobile?16:28}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>{tog}<h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.tp}}>수업료 관리</h1></div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {isMonthlyMode?(
            <>
              <button className="nb" onClick={prevM}><IcL/></button>
              <span style={{fontSize:15,fontWeight:600,color:C.tp,minWidth:110,textAlign:"center"}}>{year}년 {month}월</span>
              <button className="nb" onClick={nextM}><IcR/></button>
            </>
          ):(
            <>
              <button className="nb" onClick={()=>{setCycleOffset(o=>Math.min(maxCycleOffset,o+1));setEditId(null);setEditForm({});setShowHidden(false);}} disabled={cycleOffset>=maxCycleOffset} style={{opacity:cycleOffset>=maxCycleOffset?.3:1}}><IcL/></button>
              <span style={{fontSize:15,fontWeight:600,color:C.tp,minWidth:110,textAlign:"center"}}>{cycleOffset===0?"현재 주기":`${cycleOffset}기 전`}</span>
              <button className="nb" onClick={()=>{setCycleOffset(o=>Math.max(0,o-1));setEditId(null);setEditForm({});setShowHidden(false);}} disabled={cycleOffset===0} style={{opacity:cycleOffset===0?.3:1}}><IcR/></button>
            </>
          )}
          <button onClick={()=>{const label=isMonthlyMode?`${year}년 ${month}월`:(cycleOffset===0?"현재 주기":`${cycleOffset}기 전`);exportTuitionCSV(statsRecs,label);toast?.('CSV 파일이 다운로드되었습니다');}} style={{marginLeft:8,padding:"6px 14px",borderRadius:8,border:"1px solid "+C.bd,background:C.sf,color:C.ts,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>CSV 내보내기</button>
        </div>
      </div>
      {/* Mode toggle */}
      <div style={{display:"flex",background:C.sfh,borderRadius:10,padding:3,marginBottom:20,width:"fit-content",border:"1px solid "+C.bd}}>
        <button onClick={()=>{setViewMode('cycle');try{localStorage.setItem('tuition-view-mode','cycle');}catch{}setCycleOffset(0);setEditId(null);setEditForm({});}} style={{padding:"6px 20px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",background:!isMonthlyMode?C.sf:"none",color:!isMonthlyMode?C.tp:C.tt,boxShadow:!isMonthlyMode?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>회차별</button>
        <button onClick={()=>{setViewMode('monthly');try{localStorage.setItem('tuition-view-mode','monthly');}catch{}setEditId(null);setEditForm({});}} style={{padding:"6px 20px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",background:isMonthlyMode?C.sf:"none",color:isMonthlyMode?C.tp:C.tt,boxShadow:isMonthlyMode?"0 1px 4px rgba(0,0,0,.08)":"none",transition:"all .15s"}}>월 단위</button>
      </div>

      {/* Stats */}
      <div className="tu-stats" style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fill,minmax(140px,1fr))",gap:isMobile?10:14,marginBottom:isMobile?16:24}}>
        <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>총 청구액</div><div style={{fontSize:20,fontWeight:700,color:C.tp}}>₩{totalFee.toLocaleString()}</div></div>
        <div style={{background:C.sb,border:"1px solid #BBF7D0",borderRadius:14,padding:18}}><div style={{fontSize:12,color:C.su,marginBottom:4}}>납부 완료</div><div style={{fontSize:20,fontWeight:700,color:C.su}}>₩{totalPaid.toLocaleString()}</div></div>
        <div style={{background:totalUnpaid>0?C.db:C.sb,border:"1px solid "+(totalUnpaid>0?"#FECACA":"#BBF7D0"),borderRadius:14,padding:18}}><div style={{fontSize:12,color:totalUnpaid>0?C.dn:C.su,marginBottom:4}}>미수금</div><div style={{fontSize:20,fontWeight:700,color:totalUnpaid>0?C.dn:C.su}}>₩{totalUnpaid.toLocaleString()}</div></div>
        <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>수납률</div><div style={{fontSize:20,fontWeight:700,color:collectRate>=90?C.su:C.wn}}>{collectRate}%</div><div style={{height:5,background:C.bl,borderRadius:3,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:collectRate+"%",background:collectRate>=90?C.su:C.wn,borderRadius:3}}/></div></div>
      </div>

      {/* 8회차 탭 첫 사용 안내 */}
      {!isMonthlyMode&&tuitions.filter(t=>t.period_type==='cycle').length===0&&(
        <div style={{background:"#EFF6FF",border:"1px solid #93C5FD",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:12,color:"#1D4ED8"}}>
          💡 회차별 납부 기록은 월 단위 납부 기록과 별개입니다. 각 학생의 현재 진행 주기를 확인 후 수정 버튼으로 납부 내역을 처음 입력해주세요.
        </div>
      )}
      {/* Cash receipt alert */}
      {(()=>{const missed=displayRecs.filter(r=>!r.record.cash_receipt_issued&&r.paidAmount>0);return missed.length>0?(
        <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:12,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18,lineHeight:1,flexShrink:0}}>&#9888;&#65039;</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:4}}>현금영수증 미발행 ({missed.length}건)</div>
            <div style={{fontSize:12,color:"#A16207",lineHeight:1.6}}>{missed.map((r,i)=><span key={r.student.id}>{i>0?", ":""}<strong>{r.student.name}</strong></span>)} — 납부 확인되었으나 현금영수증이 아직 발행되지 않았습니다.</div>
          </div>
        </div>
      ):null;})()}

      {/* Main grid */}
      <div className="tu-grid" style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 280px",gap:isMobile?14:20}}>
        {/* Table */}
        <div className="table-scroll" style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,overflow:"auto",WebkitOverflowScrolling:"touch"}}>
          {(()=>{const hc=isMonthlyMode?hiddenCount:hiddenCycleCount;return hc>0&&<div style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid "+C.bl,background:C.sfh}}><span style={{fontSize:11,color:C.tt}}>{hc}명 숨김</span><button onClick={()=>setShowHidden(!showHidden)} style={{fontSize:11,color:C.ac,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline",padding:0}}>{showHidden?"숨김 적용":"모두 표시"}</button></div>;})()}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+C.bd}}>
              {["학생","회당단가","횟수","수업료","이월","청구액","납부","상태","입금일","현금영수증","메모",""].map((h,i)=>(<th key={i} style={{padding:"12px",paddingLeft:i===0?"30px":"12px",textAlign:h==="현금영수증"?"center":"left",fontSize:11,fontWeight:600,color:C.tt,background:C.sfh,whiteSpace:"nowrap"}}>{h}</th>))}
            </tr></thead>
            <tbody>
              {(isMonthlyMode?visibleRecs:visibleCycleRecs).map((r,idx)=>{
                const{student:s,record:rec}=r;
                const st=STATUS.find(x=>x.id===r.status)||STATUS[2];
                const isEditing=editId===(rec.id||s.id);
                return(
                  <tr key={s.id} className="tr" style={{borderBottom:"1px solid "+C.bl,opacity:curHidden.includes(s.id)?0.45:1}}>
                    <td style={{padding:"10px 12px",fontWeight:600,color:C.tp}}><div style={{display:"flex",alignItems:"center",gap:5}}>{!isEditing&&<button onClick={()=>toggleHideStudent(s.id)} style={{width:16,height:16,background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:15,lineHeight:1,fontWeight:300,fontFamily:"system-ui,sans-serif",color:curHidden.includes(s.id)?"#93C5FD":"#FCA5A5",opacity:0.7,transition:"opacity .15s",borderRadius:4}} title={curHidden.includes(s.id)?"학생 표시":"학생 숨기기"} aria-label={curHidden.includes(s.id)?"학생 표시":"학생 숨기기"}>{curHidden.includes(s.id)?"+":"−"}</button>}<span style={{color:r.isArchived?C.ts:C.tp}}>{s.name}</span>{r.isArchived&&<span style={{fontSize:11,color:C.tt,background:C.sfh,padding:"1px 4px",borderRadius:3}}>보관</span>}{!isMonthlyMode&&(r.isHiatus?<span style={{fontSize:10,fontWeight:600,color:"#6B7280",background:"#F3F4F6",padding:"1px 6px",borderRadius:4,whiteSpace:"nowrap"}}>휴강</span>:r.cycleInfo?<span style={{fontSize:10,color:C.tt,whiteSpace:"nowrap"}}>{formatCycleDate(r.cycleInfo.startDate)}~{r.cycleInfo.endDate?formatCycleDate(r.cycleInfo.endDate):"진행중"}</span>:r.expectedStart?<span style={{fontSize:10,color:C.tt,whiteSpace:"nowrap"}}>{formatCycleDate(r.expectedStart)}~{r.expectedEnd?formatCycleDate(r.expectedEnd)+"(예정)":"미확정"}</span>:null)}</div></td>
                    <td style={{padding:"10px 12px",color:C.ts}}>
                      {isEditing?<input type="number" value={editForm.fee_per_class} onChange={e=>{const fpc=e.target.value;const cls=editForm.classesOverride!==""?parseInt(editForm.classesOverride)||0:r.autoLessonCnt;const newFee=(parseInt(fpc)||0)*cls;const carry=parseInt(editForm.carryover)||0;const newTotal=newFee+carry;const a=parseInt(editForm.amount)||0;setEditForm(p=>({...p,fee_per_class:fpc,tuitionFee:newFee,totalDue:newTotal,status:autoStatus(a,newTotal)}));}} style={{...eis,width:80}}/>:
                      <>₩{(s.fee_per_class||0).toLocaleString()}</>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" value={editForm.classesOverride!==""?editForm.classesOverride:r.autoLessonCnt} onChange={e=>{const cv=e.target.value;const cls=parseInt(cv)||0;const fpc=parseInt(editForm.fee_per_class)||0;const newFee=fpc*cls;const carry=parseInt(editForm.carryover)||0;const newTotal=newFee+carry;const a=parseInt(editForm.amount)||0;setEditForm(p=>({...p,classesOverride:cv,tuitionFee:newFee,totalDue:newTotal,status:autoStatus(a,newTotal)}));}} style={{...eis,width:50}}/><span style={{fontSize:11}}>회</span></div>{!isMonthlyMode&&<div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10,color:C.tt}}>기준</span><input type="number" value={editForm.sessions_per_cycle} onChange={e=>setEditForm(p=>({...p,sessions_per_cycle:e.target.value}))} style={{...eis,width:40}}/><span style={{fontSize:10,color:C.tt}}>회차</span></div>}</div>:
                      !isMonthlyMode&&!r.hasReachedCycle?(r.isHiatus?<span style={{fontSize:11,color:"#6B7280"}}>-</span>:<div style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}><span style={{fontWeight:600}}>0회</span><span style={{fontSize:10,color:C.tt}}>/{r.sessionsPerCycle}회</span></div>):
                      <div style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}><span style={{fontWeight:600}}>{isMonthlyMode?r.lessonCnt:r.pastSessionsInCycle}회</span>{!isMonthlyMode&&<span style={{fontSize:10,color:C.tt}}>/{r.sessionsPerCycle}회</span>}{r.classesOverridden?<button onClick={()=>toggleClassesMode(s.id)} style={{fontSize:11,color:"#e67e22",cursor:"pointer",background:"none",padding:"1px 4px",borderRadius:3,border:"1px solid #e67e22",fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",lineHeight:"normal"}}>수동</button>:(isMonthlyMode?<span style={{fontSize:11,color:C.ac,background:C.as,padding:"1px 4px",borderRadius:3,fontWeight:600,whiteSpace:"nowrap",lineHeight:"normal"}}>자동</span>:null)}</div>}
                    </td>
                    <td style={{padding:"10px 12px",fontWeight:500,color:C.tp}}>
                      {isEditing?<input type="number" value={editForm.tuitionFee} onChange={e=>{const tf=e.target.value;const carry=parseInt(editForm.carryover)||0;setEditForm(p=>({...p,tuitionFee:tf,totalDue:(parseInt(tf)||0)+carry}));}} style={{...eis,width:90}}/>:
                      <div style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}><span style={{fontWeight:500}}>₩{r.displayFee.toLocaleString()}</span>{r.tuitionFeeManual?<button onClick={()=>toggleTuitionFeeMode(s.id)} style={{fontSize:11,color:"#e67e22",cursor:"pointer",background:"none",padding:"1px 4px",borderRadius:3,border:"1px solid #e67e22",fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",lineHeight:"normal"}} title="클릭하면 자동계산으로 전환">수동</button>:<span style={{fontSize:11,color:C.ac,background:C.as,padding:"1px 4px",borderRadius:3,fontWeight:600,whiteSpace:"nowrap",lineHeight:"normal"}}>자동</span>}</div>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<input type="number" value={editForm.carryover} onChange={e=>setEditForm(p=>({...p,carryover:e.target.value}))} style={{...eis,width:80}}/>:
                      r.carryover!==0?<><span style={{color:r.carryover>0?C.dn:C.ac,fontWeight:600}}>{r.carryover>0?"+":"−"}₩{Math.abs(r.carryover).toLocaleString()}</span><div style={{fontSize:11,color:r.carryover>0?C.dn:C.ac}}>{r.carryover>0?"미납이월":"선납"}</div></>:<span style={{color:C.tt}}>-</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?(
                        <input type="number" value={editForm.totalDue} onChange={e=>{const td=e.target.value;const t=parseInt(td)||0;const a=parseInt(editForm.amount)||0;setEditForm(p=>({...p,totalDue:td,status:autoStatus(a,t)}));}} style={{...eis,width:100}}/>
                      ):(
                        <div style={{display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                          <span style={{fontWeight:700,color:C.tp}}>₩{r.totalDue.toLocaleString()}</span>
                          {r.totalDueManual?<button onClick={()=>toggleTotalDueMode(s.id)} style={{fontSize:11,color:"#e67e22",cursor:"pointer",background:"none",padding:"2px 6px",borderRadius:4,border:"1px solid #e67e22",fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",lineHeight:"normal"}} title="클릭하면 자동계산으로 전환">수동</button>:r.hasSavedTotalDueOverride?<button onClick={()=>toggleTotalDueMode(s.id)} style={{fontSize:11,color:C.ac,cursor:"pointer",background:C.as,padding:"2px 6px",borderRadius:4,border:"none",fontWeight:600,fontFamily:"inherit",whiteSpace:"nowrap",lineHeight:"normal"}} title="클릭하면 이전 수동값으로 전환">자동</button>:<span style={{fontSize:11,color:C.ac,background:C.as,padding:"2px 6px",borderRadius:4,fontWeight:600,whiteSpace:"nowrap",lineHeight:"normal"}}>자동</span>}
                        </div>
                      )}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<input type="number" value={editForm.amount} onChange={e=>{const amt=e.target.value;const a=parseInt(amt)||0;const t=parseInt(editForm.totalDue)||0;setEditForm(p=>({...p,amount:amt,status:autoStatus(a,t)}));}} style={{...eis,width:90}}/>:
                      <span style={{fontWeight:600,color:r.status==="paid"?C.su:r.status==="partial"?C.wn:C.tt}}>₩{r.paidAmount.toLocaleString()}</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<select value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value}))} style={{...eis,fontSize:11}}>{STATUS.map(x=>(<option key={x.id} value={x.id}>{x.l}</option>))}</select>:
                      <span style={{background:st.bg,color:st.c,padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600,letterSpacing:"-0.3px",whiteSpace:"nowrap"}}>{st.l}</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<input type="date" value={editForm.paid_date||''} onChange={e=>setEditForm(p=>({...p,paid_date:e.target.value}))} style={{...eis,width:120,fontSize:11}}/>:
                      rec.paid_date?<span style={{fontSize:11,color:C.ts}}>{rec.paid_date}</span>:<span style={{fontSize:11,color:C.tt}}>-</span>}
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}>
                      {isEditing?<input type="checkbox" checked={!!editForm.cash_receipt_issued} onChange={e=>setEditForm(p=>({...p,cash_receipt_issued:e.target.checked}))} style={{width:16,height:16,cursor:"pointer",accentColor:C.pr}}/>:
                      <span onClick={()=>toggleCashReceipt(s.id)} style={{fontSize:13,cursor:"pointer"}}>{rec.cash_receipt_issued?"\u2705":"\u2B1C"}</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<input value={editForm.memo} onChange={e=>setEditForm(p=>({...p,memo:e.target.value}))} style={{...eis,width:80,fontSize:11}} placeholder="메모"/>:
                      rec.memo?<span onClick={()=>{setMemoPopup({name:s.name,studentId:s.id});setMemoText(rec.memo);}} style={{fontSize:11,color:C.tt,background:C.sfh,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>💬</span>:null}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?(
                        <div style={{display:"flex",gap:4}}>
                          <button disabled={saving} onClick={()=>saveEdit(s.id,r.autoLessonCnt)} style={{background:saving?"#999":C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>{saving?"저장 중...":"저장"}</button>
                          <button onClick={cancelEdit} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                        </div>
                      ):(<div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>startEdit(r)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:11,fontFamily:"inherit"}}>수정</button><button onClick={()=>openReceipt(r,idx)} style={{background:C.as,border:"1px solid "+C.ac,borderRadius:5,cursor:"pointer",color:C.ac,fontSize:11,fontWeight:600,padding:"3px 8px",fontFamily:"inherit"}}>영수증</button></div>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {allStudents.length===0&&<div style={{textAlign:"center",padding:30,color:C.tt,fontSize:13}}>학생을 먼저 추가해주세요</div>}
        </div>

        {/* Right sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:13,fontWeight:600,color:C.tp}}>{isMonthlyMode?"월별 수입":"기수별 수입"}</div><div style={{fontSize:11,color:C.tt}}>단위: 만원</div></div>
            <div style={{overflow:"hidden"}}><ResponsiveContainer width="100%" height={160}><BarChart data={isMonthlyMode?monthlyChart:cycleChart} margin={{top:5,right:5,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.bl} vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false} tickFormatter={v=>Math.round(v/10000)}/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="income" fill={C.ac} radius={[5,5,0,0]} barSize={20}/></BarChart></ResponsiveContainer></div>
          </div>
          <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tp,marginBottom:12}}>미납 현황</div>
            {statsRecs.filter(r=>r.status!=="paid").map(r=>{
              const st=STATUS.find(x=>x.id===r.status)||STATUS[2];
              const owed=Math.max(0,r.totalDue-r.paidAmount);
              return(<div key={r.student.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+C.bl}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.tp}}>{r.student.name}</span>{!isMonthlyMode&&r.targetCycleNum>0&&<span style={{fontSize:10,color:C.tt}}>{r.targetCycleNum}기</span>}<span style={{background:st.bg,color:st.c,padding:"1px 5px",borderRadius:4,fontSize:11,fontWeight:600}}>{st.l}</span></div>
                <span style={{fontSize:12,fontWeight:600,color:st.c}}>₩{owed.toLocaleString()}</span>
              </div>);
            })}
            {statsRecs.filter(r=>r.status!=="paid").length===0&&<div style={{textAlign:"center",padding:16,color:C.su,fontSize:12}}>전원 완납!</div>}
          </div>

          {/* Receipt file storage */}
          <div style={{background:C.sf,border:"2px "+(rcptDragOver?"dashed "+C.ac:"solid "+C.bd),borderRadius:14,padding:18,transition:"border .15s"}}
            onDragOver={e=>{e.preventDefault();e.stopPropagation();setRcptDragOver(true);}}
            onDragEnter={e=>{e.preventDefault();e.stopPropagation();setRcptDragOver(true);}}
            onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(!e.currentTarget.contains(e.relatedTarget))setRcptDragOver(false);}}
            onDrop={e=>{e.preventDefault();e.stopPropagation();setRcptDragOver(false);const dt=e.dataTransfer;if(dt?.files?.length){const{validFiles,errors}=validateFiles([...dt.files],{allowedMimes:RECEIPT_MIMES});if(validFiles.length)uploadRcptFiles(validFiles);if(errors.length)toast?.(errors[0],'error');if(!validFiles.length&&!errors.length)toast?.('PDF, JPG, PNG 파일만 업로드 가능합니다','error');}}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tp}}>영수증 보관함</div>
              <label style={{background:C.as,color:C.ac,border:"1px solid "+C.ac,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:rcptUploading?"not-allowed":"pointer",fontFamily:"inherit",opacity:rcptUploading?.5:1}}>
                {rcptUploading?"업로드 중...":"+"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={uploadRcptFile} style={{display:"none"}} disabled={rcptUploading}/>
              </label>
            </div>
            {rcptDragOver?<div style={{textAlign:"center",padding:24,color:C.ac,fontSize:12,fontWeight:500}}>파일을 놓아주세요</div>:<>
            <div style={{fontSize:11,color:C.tt,marginBottom:8}}>{month}월 파일 ({curMonthFiles.length})</div>
            {curMonthFiles.length===0?<div style={{textAlign:"center",padding:16,color:C.tt,fontSize:11}}>파일을 드래그하거나 + 버튼으로 추가</div>:
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflow:"auto"}}>
              {curMonthFiles.map(f=>(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:C.sfh,borderRadius:8,fontSize:11}}>
                  <span style={{color:C.ac,fontSize:14,flexShrink:0}}>{f.mime_type?.includes('pdf')?'\uD83D\uDCC4':'\uD83D\uDDBC\uFE0F'}</span>
                  <span onClick={()=>downloadRcptFile(f)} style={{flex:1,color:C.tp,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={f.file_name}>{f.file_name}</span>
                  <span style={{color:C.tt,fontSize:11,flexShrink:0}}>{f.file_size?Math.round(f.file_size/1024)+'KB':''}</span>
                  <button onClick={()=>deleteRcptFile(f)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:12,padding:0,fontFamily:"inherit"}}>✕</button>
                </div>
              ))}
            </div>}
            {rcptMonths.length>1&&(<>
              <div style={{fontSize:11,color:C.tt,marginTop:14,marginBottom:6,borderTop:"1px solid "+C.bd,paddingTop:10}}>지난달 영수증</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {rcptMonths.filter(m=>m!==curMonth).slice(0,6).map(m=>{
                  const cnt=rcptFiles.filter(f=>f.month===m).length;
                  const[yy,mm]=m.split('-');
                  return(<div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:11}}>
                    <span style={{color:C.tp,fontWeight:500}}>{yy}년 {+mm}월</span>
                    <span style={{color:C.ts}}>{cnt}개 파일</span>
                  </div>);
                })}
              </div>
            </>)}
          </>}
          </div>
        </div>
      </div>

      {/* Memo popup */}
      {memoPopup&&(
        <div onClick={()=>setMemoPopup(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.sf,borderRadius:14,padding:24,minWidth:280,maxWidth:400,width:"100%",boxShadow:"0 8px 30px rgba(0,0,0,.12)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tp}}>{memoPopup.name} 메모</div>
              <button onClick={()=>setMemoPopup(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.tt,fontFamily:"inherit",padding:4}}>✕</button>
            </div>
            <textarea value={memoText} onChange={e=>setMemoText(e.target.value)} style={{width:"100%",minHeight:100,padding:12,borderRadius:8,border:"1px solid "+C.bd,fontSize:13,color:C.tp,background:C.sfh,outline:"none",fontFamily:"inherit",lineHeight:1.6,resize:"vertical",boxSizing:"border-box"}} placeholder="메모를 입력하세요"/>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
              <button onClick={()=>setMemoPopup(null)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:8,padding:"8px 16px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
              <button disabled={memoSaving} onClick={async()=>{
                setMemoSaving(true);
                try{
                  const mpi=getCyclePeriodInfo(memoPopup.studentId);
                  const mpk=mpi?.key;
                  if(!mpk){setMemoPopup(null);return;}
                  const existing=tuitions.find(t=>t.student_id===memoPopup.studentId&&t.month===mpk);
                  if(existing){
                    await supabase.from('tuition').update({memo:memoText}).eq('id',existing.id);
                    setTuitions(p=>p.map(t=>t.id===existing.id?{...t,memo:memoText}:t));
                  }else{
                    const{data}=await supabase.from('tuition').insert({student_id:memoPopup.studentId,month:mpk,...mpi.payload,memo:memoText,status:'unpaid',amount:0,carryover:0,user_id:user.id}).select().single();
                    if(data)setTuitions(p=>[...p,data]);
                  }
                  setMemoPopup(null);
                }finally{setMemoSaving(false);}
              }} style={{background:memoSaving?"#999":C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:memoSaving?"not-allowed":"pointer",fontFamily:"inherit"}}>{memoSaving?"저장 중...":"저장"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {receiptData&&(
        <div onClick={()=>setReceiptData(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.sf,borderRadius:isMobile?0:14,padding:isMobile?20:28,width:"100%",maxWidth:isMobile?"100vw":500,maxHeight:isMobile?"100vh":"90vh",height:isMobile?"100vh":"auto",overflow:"auto",boxShadow:isMobile?"none":"0 8px 30px rgba(0,0,0,.12)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontSize:17,fontWeight:700,color:C.tp,margin:0}}>교습비 영수증 발행</h2>
              <button onClick={()=>setReceiptData(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.tt,fontFamily:"inherit"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div><label style={rls}>일련번호</label><input value={rcptForm.serialNo||''} onChange={e=>setRcptForm(p=>({...p,serialNo:e.target.value}))} style={ris} placeholder="001"/></div>
              <div><label style={rls}>연월(분기)</label><input value={rcptForm.period||''} onChange={e=>setRcptForm(p=>({...p,period:e.target.value}))} style={ris}/></div>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.tt,marginBottom:8,borderBottom:"1px solid "+C.bd,paddingBottom:4}}>납부자 정보</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div><label style={rls}>성명</label><input value={rcptForm.name||''} onChange={e=>setRcptForm(p=>({...p,name:e.target.value}))} style={ris}/></div>
              <div><label style={rls}>교습과목</label><input value={rcptForm.subject||''} onChange={e=>setRcptForm(p=>({...p,subject:e.target.value}))} style={ris}/></div>
              <div><label style={rls}>등록번호</label><input value={rcptForm.regNo||''} onChange={e=>setRcptForm(p=>({...p,regNo:e.target.value}))} style={ris}/></div>
              <div><label style={rls}>생년월일</label><input value={rcptForm.birthDate||''} onChange={e=>setRcptForm(p=>({...p,birthDate:e.target.value}))} style={ris} placeholder="선택사항"/></div>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.tt,marginBottom:8,borderBottom:"1px solid "+C.bd,paddingBottom:4}}>납부 명세</div>
            <div style={{marginBottom:12}}>
              <label style={rls}>교습비</label>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <input type="number" value={rcptForm.tuitionFee||''} onChange={e=>setRcptForm(p=>({...p,tuitionFee:e.target.value}))} style={{...ris,flex:1}}/>
                <span style={{fontSize:12,color:C.tt,flexShrink:0}}>원</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              <div><label style={rls}>기타경비 1 항목</label><input value={rcptForm.etcLabel1||''} onChange={e=>setRcptForm(p=>({...p,etcLabel1:e.target.value}))} style={ris} placeholder="예: 교재비"/></div>
              <div><label style={rls}>기타경비 1 금액</label><div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={rcptForm.etcAmt1||''} onChange={e=>setRcptForm(p=>({...p,etcAmt1:e.target.value}))} style={{...ris,flex:1}}/><span style={{fontSize:12,color:C.tt,flexShrink:0}}>원</span></div></div>
              <div><label style={rls}>기타경비 2 항목</label><input value={rcptForm.etcLabel2||''} onChange={e=>setRcptForm(p=>({...p,etcLabel2:e.target.value}))} style={ris} placeholder="선택사항"/></div>
              <div><label style={rls}>기타경비 2 금액</label><div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={rcptForm.etcAmt2||''} onChange={e=>setRcptForm(p=>({...p,etcAmt2:e.target.value}))} style={{...ris,flex:1}}/><span style={{fontSize:12,color:C.tt,flexShrink:0}}>원</span></div></div>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.tt,marginBottom:8,borderBottom:"1px solid "+C.bd,paddingBottom:4}}>발행 정보</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={rls}>년</label><input value={rcptForm.issueYear||''} onChange={e=>setRcptForm(p=>({...p,issueYear:e.target.value}))} style={ris}/></div>
              <div><label style={rls}>월</label><input value={rcptForm.issueMonth||''} onChange={e=>setRcptForm(p=>({...p,issueMonth:e.target.value}))} style={ris}/></div>
              <div><label style={rls}>일</label><input value={rcptForm.issueDay||''} onChange={e=>setRcptForm(p=>({...p,issueDay:e.target.value}))} style={ris}/></div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={rls}>교습자 / 학원명</label>
              <input value={rcptForm.tutorName||''} onChange={e=>setRcptForm(p=>({...p,tutorName:e.target.value}))} style={ris} placeholder="이름 또는 학원명 (자동 저장)"/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={rls}>인감 / 서명</label>
              {sealLoading?<div style={{fontSize:11,color:C.tt}}>인감 불러오는 중...</div>:sealImg?<div style={{display:"flex",alignItems:"center",gap:10}}>
                <img src={sealImg} style={{width:48,height:48,objectFit:"contain",border:"1px solid "+C.bd,borderRadius:6,padding:2,background:"#fff"}} alt="인감"/>
                <button onClick={()=>{setSealImg('');try{localStorage.removeItem('rcpt-seal');}catch{}if(user?.id){supabase.storage.from('receipts').remove([`${user.id}/seal/current.png`]).catch(()=>{});}}} style={{background:"none",border:"1px solid "+C.bd,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>삭제</button>
                <span style={{fontSize:11,color:C.tt}}>자동 적용 중</span>
              </div>:showSignPad?<div>
                <canvas ref={el=>{signCanvasRef.current=el;if(el&&!el._init){el._init=true;const ctx=el.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,el.width,el.height);ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
                  const getPos=(e)=>{const r=el.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};};
                  const onDown=(e)=>{e.preventDefault();signDrawing.current=true;const p=getPos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};
                  const onMove=(e)=>{if(!signDrawing.current)return;e.preventDefault();const p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();};
                  const onUp=()=>{signDrawing.current=false;};
                  el.addEventListener('mousedown',onDown);el.addEventListener('mousemove',onMove);el.addEventListener('mouseup',onUp);el.addEventListener('mouseleave',onUp);
                  el.addEventListener('touchstart',onDown,{passive:false});el.addEventListener('touchmove',onMove,{passive:false});el.addEventListener('touchend',onUp);}}}
                  width={240} height={100} style={{border:"1px solid "+C.bd,borderRadius:8,cursor:"crosshair",background:"#fff",display:"block",touchAction:"none"}}/>
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>{const el=signCanvasRef.current;if(!el)return;const ctx=el.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,el.width,el.height);}} style={{background:C.sfh,border:"1px solid "+C.bd,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>지우기</button>
                  <button onClick={()=>{const el=signCanvasRef.current;if(!el)return;const d=el.toDataURL('image/png');setSealImg(d);try{localStorage.setItem('rcpt-seal',d);}catch{}uploadSealToStorage(d);setShowSignPad(false);}} style={{background:C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                  <button onClick={()=>setShowSignPad(false)} style={{background:"none",border:"1px solid "+C.bd,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>취소</button>
                </div>
              </div>:<div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>setShowSignPad(true)} style={{background:C.sfh,border:"1px solid "+C.bd,borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",color:C.tp,fontFamily:"inherit"}}>서명 그리기</button>
                <label style={{background:C.sfh,border:"1px solid "+C.bd,borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",color:C.tp,fontFamily:"inherit"}}>
                  이미지 등록
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{const d=ev.target?.result;if(d){setSealImg(d);try{localStorage.setItem('rcpt-seal',d);}catch{}uploadSealToStorage(d);}};reader.readAsDataURL(file);e.target.value='';}}/>
                </label>
                <span style={{fontSize:11,color:C.tt}}>한 번 등록하면 자동 적용</span>
              </div>}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
              <button onClick={()=>setReceiptData(null)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>닫기</button>
              <button onClick={printReceipt} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>인쇄</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
