'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { C, STATUS } from '@/components/Colors';
import { p2 } from '@/lib/utils';
const IcL=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>);
const IcR=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>);
const CustomTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>{d.month}</div><div style={{fontSize:16,fontWeight:700,color:C.ac}}>₩{payload[0].value.toLocaleString()}</div></div>);};

export default function Tuition({menuBtn}){
  const tog=menuBtn;
  const{user}=useAuth();
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
  const[hiddenStudents,setHiddenStudents]=useState(()=>{try{return JSON.parse(localStorage.getItem('tuition-hidden')||'{}');}catch{return{};}});
  const[showHidden,setShowHidden]=useState(false);

  const year=+curMonth.split("-")[0],month=+curMonth.split("-")[1];
  const prevM=()=>{const m=month===1?12:month-1;const y=month===1?year-1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});};
  const nextM=()=>{const m=month===12?1:month+1;const y=month===12?year+1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});};

  const[fetchError,setFetchError]=useState(false);
  const[saving,setSaving]=useState(false);
  const fetchData=useCallback(async()=>{
    setLoading(true);setFetchError(false);
    try{
      const[sRes,tRes,lRes,rfRes]=await Promise.all([
        supabase.from('students').select('*').order('created_at'),
        supabase.from('tuition').select('*'),
        supabase.from('lessons').select('*'),
        supabase.from('receipt_files').select('*').order('created_at',{ascending:false}),
      ]);
      if(sRes.error||tRes.error||lRes.error||rfRes.error){setFetchError(true);setLoading(false);return;}
      setStudents(sRes.data||[]);setTuitions(tRes.data||[]);setLessons(lRes.data||[]);setRcptFiles(rfRes.data||[]);
    }catch{setFetchError(true);}
    setLoading(false);
  },[]);
  useEffect(()=>{fetchData();},[fetchData]);

  /* Count lessons for student in month */
  const countLessons=(sid,yr,mo)=>{
    const dim=new Date(yr,mo,0).getDate();
    let cnt=0;
    for(let d=1;d<=dim;d++){
      const ds=yr+"-"+p2(mo)+"-"+p2(d);
      const dw=new Date(yr,mo-1,d).getDay();
      const dwN=dw===0?7:dw;
      cnt+=lessons.filter(l=>{
        if(l.student_id!==sid)return false;
        if(l.status==='cancelled')return false;
        const ld=(l.date||"").slice(0,10);
        if(l.is_recurring&&l.recurring_exceptions&&l.recurring_exceptions.includes(ds))return false;
        if(ld===ds)return true;
        if(l.is_recurring&&+l.recurring_day===dwN){
          if(ds<ld)return false;
          if(l.recurring_end_date&&ds>=(l.recurring_end_date+"").slice(0,10))return false;
          return true;
        }
        return false;
      }).length;
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
  const monthRecs=allStudents.map(s=>{
    const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);
    const autoLessonCnt=countLessons(s.id,year,month);
    const lessonCnt=(rec&&rec.classes_override!=null)?rec.classes_override:autoLessonCnt;
    const classesOverridden=(rec&&rec.classes_override!=null);
    const autoFee=(s.fee_per_class||0)*lessonCnt;
    const carryover=rec?.carryover||0;
    const autoTotalDue=autoFee+carryover;
    const feeManual=!!(rec&&rec.fee_manual&&rec.fee_override!=null);
    const totalDue=feeManual?rec.fee_override:autoTotalDue;
    const displayFee=feeManual?(totalDue-carryover):autoFee;
    const paidAmount=rec?.amount||0;
    const status=autoStatus(paidAmount,totalDue);
    return{student:s,record:rec||{student_id:s.id,month:curMonth,status:"unpaid",amount:0,carryover:0,memo:""},autoLessonCnt,lessonCnt,classesOverridden,autoFee,carryover,autoTotalDue,totalDue,displayFee,paidAmount,status,feeManual,hasSavedOverride:!!(rec&&rec.fee_override!=null),isArchived:!!s.archived};
  });

  const totalFee=monthRecs.reduce((a,r)=>a+r.totalDue,0);
  const totalPaid=monthRecs.reduce((a,r)=>a+r.paidAmount,0);
  const totalUnpaid=monthRecs.reduce((a,r)=>r.status!=="paid"?a+Math.max(0,r.totalDue-r.paidAmount):a,0);
  const collectRate=totalFee>0?Math.max(0,Math.round((totalFee-totalUnpaid)/totalFee*100)):0;

  /* Hide/show students per month */
  const toggleHideStudent=(sid)=>{setHiddenStudents(prev=>{const h=prev[curMonth]||[];const n=h.includes(sid)?{...prev,[curMonth]:h.filter(x=>x!==sid)}:{...prev,[curMonth]:[...h,sid]};try{localStorage.setItem('tuition-hidden',JSON.stringify(n));}catch{}return n;});};
  const curHidden=hiddenStudents[curMonth]||[];
  const visibleRecs=showHidden?monthRecs:monthRecs.filter(r=>!curHidden.includes(r.student.id));
  const hiddenCount=monthRecs.filter(r=>curHidden.includes(r.student.id)).length;

  /* Monthly chart (last 6 months ending at curMonth) */
  const monthlyChart=Array.from({length:6},(_,i)=>{
    const d=new Date(year,month-6+i,1);
    const mk=d.getFullYear()+"-"+p2(d.getMonth()+1);
    const sum=tuitions.filter(t=>t.month===mk).reduce((a,t)=>a+(t.amount||0),0);
    return{month:(d.getMonth()+1)+"월",income:sum};
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
      feeManual:r.feeManual,
    });
  };
  const cancelEdit=()=>{setEditId(null);setEditForm({});};

  const saveEdit=async(studentId,autoLessonCnt)=>{
    if(saving)return;setSaving(true);
    try{
      const totalDueVal=parseInt(editForm.totalDue)||0;
      const carryoverVal=parseInt(editForm.carryover)||0;
      const editedFeePerClass=parseInt(editForm.fee_per_class)||0;
      const classesOv=editForm.classesOverride!==""?parseInt(editForm.classesOverride):null;
      const effectiveLessons=(classesOv!=null)?classesOv:autoLessonCnt;
      const autoTotalDue=editedFeePerClass*effectiveLessons+carryoverVal;
      const isManual=(totalDueVal!==autoTotalDue);
      const feeOverride=isManual?totalDueVal:(editForm.feeManual?totalDueVal:null);
      const existing=tuitions.find(t=>t.student_id===studentId&&t.month===curMonth);
      const payload={
        student_id:studentId,month:curMonth,
        status:editForm.status,
        amount:parseInt(editForm.amount)||0,
        carryover:carryoverVal,
        fee_override:feeOverride,
        fee_manual:isManual,
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
        await supabase.from('students').update({fee_status:editForm.status,fee_per_class:feePerClass}).eq('id',studentId);
        setStudents(p=>p.map(s=>s.id===studentId?{...s,fee_status:editForm.status,fee_per_class:feePerClass}:s));
        setEditId(null);setEditForm({});
      }
    }finally{setSaving(false);}
  };

  // Toggle cash receipt issued
  const toggleCashReceipt=async(studentId)=>{
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===curMonth);
    const newVal=existing?!existing.cash_receipt_issued:true;
    if(existing){
      await supabase.from('tuition').update({cash_receipt_issued:newVal}).eq('id',existing.id);
      setTuitions(p=>p.map(t=>t.id===existing.id?{...t,cash_receipt_issued:newVal}:t));
    }else{
      const{data}=await supabase.from('tuition').insert({student_id:studentId,month:curMonth,cash_receipt_issued:newVal,status:'unpaid',amount:0,carryover:0,user_id:user.id}).select().single();
      if(data)setTuitions(p=>[...p,data]);
    }
  };

  // 자동↔수동 토글 (이전 수동값 보존)
  const toggleFeeMode=async(studentId)=>{
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===curMonth);
    if(!existing)return;
    const newManual=!existing.fee_manual;
    const update={fee_manual:newManual};
    if(!newManual)update.fee_override=existing.fee_override; // 수동값 보존
    const{error}=await supabase.from('tuition').update(update).eq('id',existing.id);
    if(error)return;
    setTuitions(p=>p.map(t=>t.id===existing.id?{...t,...update}:t));
  };
  const toggleClassesMode=async(studentId)=>{
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===curMonth);
    if(!existing)return;
    const newVal=existing.classes_override!=null?null:countLessons(studentId,year,month);
    const{error}=await supabase.from('tuition').update({classes_override:newVal}).eq('id',existing.id);
    if(error)return;
    setTuitions(p=>p.map(t=>t.id===existing.id?{...t,classes_override:newVal}:t));
  };

  /* Receipt */
  const openReceipt=(r,idx)=>{
    const d=new Date();
    setReceiptData(r);
    setRcptForm({
      serialNo:`${String(year).slice(-2)}${p2(month)}-${p2(stuNumMap[r.student.id]||((idx??0)+1))}`,period:`${year}년 ${month}월`,
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
    try{if(f.tutorName)localStorage.setItem('rcpt-tutor',f.tutorName);}catch{}
    const tFee=parseInt(f.tuitionFee)||0;
    const e1=parseInt(f.etcAmt1)||0;
    const e2=parseInt(f.etcAmt2)||0;
    const total=tFee+e1+e2;
    const cs='border:1px solid #000;padding:6px 8px;font-size:11px;';
    const makeR=(title)=>`<div style="flex:1;width:0;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
<div>
<div style="border:3px double #000;padding:8px 10px;text-align:center;font-size:16px;font-weight:bold;letter-spacing:4px;margin-bottom:12px;">${title}</div>
<table style="width:100%;border-collapse:collapse;" cellpadding="0">
<tr><td style="${cs}" colspan="2">일련번호 : ${f.serialNo||''}</td><td style="${cs}" colspan="2">연월(분기) : ${f.period||''}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;width:36px;" rowspan="2">납부자</td><td style="${cs}">등록번호 : ${f.regNo||''}</td><td style="${cs}" colspan="2">성명 : ${f.name||''}</td></tr>
<tr><td style="${cs}">생년월일 : ${f.birthDate||''}</td><td style="${cs}" colspan="2">교습과목 : ${f.subject||''}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;width:36px;" rowspan="4">납부<br>명세</td><td style="${cs}text-align:center;vertical-align:middle;width:80px;" rowspan="4">교습비<br><br><b style="font-size:13px;">${tFee>0?tFee.toLocaleString()+'원':''}</b></td><td style="${cs}text-align:center;font-weight:bold;" colspan="2">기타경비</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;">항목</td><td style="${cs}text-align:center;font-weight:bold;">금액</td></tr>
<tr><td style="${cs}">${f.etcLabel1||''}</td><td style="${cs}">${e1>0?e1.toLocaleString()+'원':''}</td></tr>
<tr><td style="${cs}">${f.etcLabel2||''}</td><td style="${cs}">${e2>0?e2.toLocaleString()+'원':''}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;">합계</td><td style="${cs}text-align:center;font-weight:bold;" colspan="3">${total>0?total.toLocaleString()+'원':''}</td></tr>
</table>
<p style="text-align:center;margin:20px 0 6px;font-size:12px;font-weight:bold;">위와 같이 영수하였음을 증명합니다.</p>
<p style="font-size:9px;color:#555;margin:4px 0 16px;">※ 본 서식 외 교육감이 지정한 영수증을 사용할 수 있습니다.</p>
<p style="text-align:right;margin:20px 6px 0;font-size:12px;">${f.issueYear||''}년 &nbsp;&nbsp; ${f.issueMonth||''}월 &nbsp;&nbsp; ${f.issueDay||''}일</p>
<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;">
<span>학원설립·운영자 또는 교습자</span>
<span style="display:inline-flex;align-items:center;gap:6px;">${f.tutorName||''}${sealImg?`<img src="${sealImg}" style="height:40px;width:40px;object-fit:contain;vertical-align:middle;"/>`:' &nbsp;&nbsp;&nbsp;(서명 또는 인)'}</span>
</div>
</div>
<div style="text-align:right;font-size:8px;color:#999;margin-top:12px;">210mm×297mm[일반용지 70g/㎡(재활용품)]</div>
</div>`;
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>교습비등 영수증</title>
<style>
@page{size:210mm 297mm;margin:15mm 12mm;}
*{margin:0;padding:0;box-sizing:border-box;}
body{margin:0;padding:0;font-family:'Batang','NanumMyeongjo','Noto Serif KR',serif;font-size:11px;color:#000;width:210mm;height:297mm;}
.rcpt-wrap{display:flex;gap:16px;width:100%;height:100%;padding:15mm 12mm;box-sizing:border-box;}
@media print{body{padding:0;width:auto;height:auto;}.rcpt-wrap{padding:0;height:267mm;}}
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
    if(!confirm(`"${f.file_name}" 파일을 삭제하시겠습니까?`))return;
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

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);
  if(fetchError)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:14,color:C.dn}}>데이터를 불러오지 못했습니다</div><button onClick={fetchData} style={{padding:"8px 20px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,color:C.tp,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>다시 시도</button></div>);

  const eis={padding:"4px 6px",borderRadius:6,border:"1px solid "+C.bd,fontSize:12,fontFamily:"inherit"};
  const rls={display:"block",fontSize:11,fontWeight:500,color:C.tt,marginBottom:3};
  const ris={width:"100%",padding:"7px 10px",borderRadius:6,border:"1px solid "+C.bd,fontSize:13,fontFamily:"inherit",color:C.tp,background:C.sf,outline:"none",boxSizing:"border-box"};

  return(
    <div className="tui-container" style={{padding:28}}>
      <style>{".tr{transition:all .1s;}.tr:hover{background:"+C.sfh+"!important;}\n.nb{transition:all .1s;cursor:pointer;border:none;background:none;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:8px;color:"+C.ts+";min-width:44px;min-height:44px;}.nb:hover{background:"+C.sfh+";}\n@media(max-width:768px){.tui-container{padding:16px!important;}.tu-grid{grid-template-columns:1fr!important;}.tu-stats{grid-template-columns:repeat(2,1fr)!important;}}"}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>{tog}<h1 style={{fontSize:20,fontWeight:700,color:C.tp}}>수업료 관리</h1></div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <button className="nb" onClick={prevM}><IcL/></button>
          <span style={{fontSize:15,fontWeight:600,color:C.tp,minWidth:110,textAlign:"center"}}>{year}년 {month}월</span>
          <button className="nb" onClick={nextM}><IcR/></button>
        </div>
      </div>

      {/* Stats */}
      <div className="tu-stats" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:14,marginBottom:24}}>
        <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>총 청구액</div><div style={{fontSize:20,fontWeight:700,color:C.tp}}>₩{totalFee.toLocaleString()}</div></div>
        <div style={{background:C.sb,border:"1px solid #BBF7D0",borderRadius:14,padding:18}}><div style={{fontSize:12,color:C.su,marginBottom:4}}>납부 완료</div><div style={{fontSize:20,fontWeight:700,color:C.su}}>₩{totalPaid.toLocaleString()}</div></div>
        <div style={{background:totalUnpaid>0?C.db:C.sb,border:"1px solid "+(totalUnpaid>0?"#FECACA":"#BBF7D0"),borderRadius:14,padding:18}}><div style={{fontSize:12,color:totalUnpaid>0?C.dn:C.su,marginBottom:4}}>미수금</div><div style={{fontSize:20,fontWeight:700,color:totalUnpaid>0?C.dn:C.su}}>₩{totalUnpaid.toLocaleString()}</div></div>
        <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>수납률</div><div style={{fontSize:20,fontWeight:700,color:collectRate>=90?C.su:C.wn}}>{collectRate}%</div><div style={{height:5,background:C.bl,borderRadius:3,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:collectRate+"%",background:collectRate>=90?C.su:C.wn,borderRadius:3}}/></div></div>
      </div>

      {/* Cash receipt alert */}
      {(()=>{const missed=monthRecs.filter(r=>{const rec=r.record;return !rec.cash_receipt_issued&&(r.paidAmount>0||rec.paid_date);});return missed.length>0?(
        <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:12,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18,lineHeight:1,flexShrink:0}}>&#9888;&#65039;</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:4}}>현금영수증 미발행 ({missed.length}건)</div>
            <div style={{fontSize:12,color:"#A16207",lineHeight:1.6}}>{missed.map((r,i)=><span key={r.student.id}>{i>0?", ":""}<strong>{r.student.name}</strong></span>)} — 납부 확인되었으나 현금영수증이 아직 발행되지 않았습니다.</div>
          </div>
        </div>
      ):null;})()}

      {/* Main grid */}
      <div className="tu-grid" style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:20}}>
        {/* Table */}
        <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,overflow:"auto"}}>
          {hiddenCount>0&&<div style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid "+C.bl,background:C.sfh}}><span style={{fontSize:11,color:C.tt}}>{hiddenCount}명 숨김</span><button onClick={()=>setShowHidden(!showHidden)} style={{fontSize:10,color:C.ac,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline",padding:0}}>{showHidden?"숨김 적용":"모두 표시"}</button></div>}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+C.bd}}>
              {["학생","회당단가","횟수","수업료","이월","청구액","납부","상태","입금일","현금영수증","메모",""].map((h,i)=>(<th key={i} style={{padding:"12px",paddingLeft:i===0?"30px":"12px",textAlign:h==="현금영수증"?"center":"left",fontSize:11,fontWeight:600,color:C.tt,background:C.sfh,whiteSpace:"nowrap"}}>{h}</th>))}
            </tr></thead>
            <tbody>
              {visibleRecs.map((r,idx)=>{
                const{student:s,record:rec}=r;
                const st=STATUS.find(x=>x.id===r.status)||STATUS[2];
                const isEditing=editId===(rec.id||s.id);
                return(
                  <tr key={s.id} className="tr" style={{borderBottom:"1px solid "+C.bl,opacity:curHidden.includes(s.id)?0.45:1}}>
                    <td style={{padding:"10px 12px",fontWeight:600,color:C.tp}}><div style={{display:"flex",alignItems:"center",gap:4}}>{!isEditing&&<button onClick={()=>toggleHideStudent(s.id)} style={{width:16,height:16,fontSize:11,lineHeight:"14px",textAlign:"center",color:curHidden.includes(s.id)?C.ac:C.tt,background:"none",border:"1.5px solid "+(curHidden.includes(s.id)?C.ac:C.bd),borderRadius:"50%",cursor:"pointer",padding:0,fontFamily:"monospace",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center"}} title={curHidden.includes(s.id)?"다시 표시":"숨기기"}>{curHidden.includes(s.id)?"+":"−"}</button>}<span style={{color:r.isArchived?C.ts:C.tp}}>{s.name}</span>{r.isArchived&&<span style={{fontSize:8,color:C.tt,background:C.sfh,padding:"1px 4px",borderRadius:3}}>보관</span>}</div></td>
                    <td style={{padding:"10px 12px",color:C.ts}}>
                      {isEditing?<input type="number" value={editForm.fee_per_class} onChange={e=>{const fpc=e.target.value;const cls=editForm.classesOverride!==""?parseInt(editForm.classesOverride)||0:r.autoLessonCnt;const newFee=(parseInt(fpc)||0)*cls;const carry=parseInt(editForm.carryover)||0;const newTotal=newFee+carry;const a=parseInt(editForm.amount)||0;setEditForm(p=>({...p,fee_per_class:fpc,tuitionFee:newFee,totalDue:newTotal,status:autoStatus(a,newTotal)}));}} style={{...eis,width:80}}/>:
                      <>₩{(s.fee_per_class||0).toLocaleString()}</>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<div style={{display:"flex",alignItems:"center",gap:4}}><input type="number" value={editForm.classesOverride!==""?editForm.classesOverride:r.autoLessonCnt} onChange={e=>{const cv=e.target.value;const cls=parseInt(cv)||0;const fpc=parseInt(editForm.fee_per_class)||0;const newFee=fpc*cls;const carry=parseInt(editForm.carryover)||0;const newTotal=newFee+carry;const a=parseInt(editForm.amount)||0;setEditForm(p=>({...p,classesOverride:cv,tuitionFee:newFee,totalDue:newTotal,status:autoStatus(a,newTotal)}));}} style={{...eis,width:50}}/><span style={{fontSize:10}}>회</span></div>:
                      <div><span style={{fontWeight:600}}>{r.lessonCnt}회</span>{r.classesOverridden?<button onClick={()=>toggleClassesMode(s.id)} style={{marginLeft:4,fontSize:8,color:"#e67e22",cursor:"pointer",background:"none",padding:"1px 4px",borderRadius:3,border:"1px solid #e67e22",fontWeight:600,fontFamily:"inherit"}}>수동</button>:<span style={{marginLeft:4,fontSize:8,color:C.ac,background:C.as,padding:"1px 4px",borderRadius:3,fontWeight:600}}>자동</span>}</div>}
                    </td>
                    <td style={{padding:"10px 12px",fontWeight:500,color:C.tp}}>
                      {isEditing?<input type="number" value={editForm.tuitionFee} onChange={e=>{const tf=e.target.value;const carry=parseInt(editForm.carryover)||0;setEditForm(p=>({...p,tuitionFee:tf,totalDue:(parseInt(tf)||0)+carry}));}} style={{...eis,width:90}}/>:
                      <div><span style={{fontWeight:500}}>₩{r.displayFee.toLocaleString()}</span>{r.feeManual?<button onClick={()=>toggleFeeMode(s.id)} style={{marginLeft:4,fontSize:8,color:"#e67e22",cursor:"pointer",background:"none",padding:"1px 4px",borderRadius:3,border:"1px solid #e67e22",fontWeight:600,fontFamily:"inherit"}} title="클릭하면 자동계산으로 전환">수동</button>:r.hasSavedOverride?<button onClick={()=>toggleFeeMode(s.id)} style={{marginLeft:4,fontSize:8,color:C.ac,cursor:"pointer",background:C.as,padding:"1px 4px",borderRadius:3,border:"none",fontWeight:600,fontFamily:"inherit"}} title="클릭하면 이전 수동값으로 전환">자동</button>:<span style={{marginLeft:4,fontSize:8,color:C.ac,background:C.as,padding:"1px 4px",borderRadius:3,fontWeight:600}}>자동</span>}</div>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<input type="number" value={editForm.carryover} onChange={e=>setEditForm(p=>({...p,carryover:e.target.value}))} style={{...eis,width:80}}/>:
                      r.carryover!==0?<><span style={{color:r.carryover>0?C.dn:C.ac,fontWeight:600}}>{r.carryover>0?"+":"−"}₩{Math.abs(r.carryover).toLocaleString()}</span><div style={{fontSize:9,color:r.carryover>0?C.dn:C.ac}}>{r.carryover>0?"미납이월":"선납"}</div></>:<span style={{color:C.tt}}>-</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?(
                        <input type="number" value={editForm.totalDue} onChange={e=>{const td=e.target.value;const t=parseInt(td)||0;const a=parseInt(editForm.amount)||0;setEditForm(p=>({...p,totalDue:td,status:autoStatus(a,t)}));}} style={{...eis,width:100}}/>
                      ):(
                        <div>
                          <span style={{fontWeight:700,color:C.tp}}>₩{r.totalDue.toLocaleString()}</span>
                          {r.feeManual?<button onClick={()=>toggleFeeMode(s.id)} style={{marginLeft:6,fontSize:9,color:"#e67e22",cursor:"pointer",background:"none",padding:"2px 6px",borderRadius:4,border:"1px solid #e67e22",fontWeight:600,fontFamily:"inherit"}} title="클릭하면 자동계산으로 전환">수동</button>:r.hasSavedOverride?<button onClick={()=>toggleFeeMode(s.id)} style={{marginLeft:6,fontSize:9,color:C.ac,cursor:"pointer",background:C.as,padding:"2px 6px",borderRadius:4,border:"none",fontWeight:600,fontFamily:"inherit"}} title="클릭하면 이전 수동값으로 전환">자동</button>:<span style={{marginLeft:6,fontSize:9,color:C.ac,background:C.as,padding:"2px 6px",borderRadius:4,fontWeight:600}}>자동</span>}
                        </div>
                      )}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<input type="number" value={editForm.amount} onChange={e=>{const amt=e.target.value;const a=parseInt(amt)||0;const t=parseInt(editForm.totalDue)||0;setEditForm(p=>({...p,amount:amt,status:autoStatus(a,t)}));}} style={{...eis,width:90}}/>:
                      <span style={{fontWeight:600,color:r.status==="paid"?C.su:r.status==="partial"?C.wn:C.tt}}>₩{r.paidAmount.toLocaleString()}</span>}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?<select value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value}))} style={{...eis,fontSize:11}}>{STATUS.map(x=>(<option key={x.id} value={x.id}>{x.l}</option>))}</select>:
                      <span style={{background:st.bg,color:st.c,padding:"6px 12px",borderRadius:5,fontSize:10,fontWeight:600,display:"inline-block",minHeight:44,lineHeight:"32px",boxSizing:"border-box"}}>{st.l}</span>}
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
                      rec.memo?<span onClick={()=>{setMemoPopup({name:s.name,studentId:s.id});setMemoText(rec.memo);}} style={{fontSize:10,color:C.tt,background:C.sfh,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>💬</span>:null}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?(
                        <div style={{display:"flex",gap:4}}>
                          <button disabled={saving} onClick={()=>saveEdit(s.id,r.autoLessonCnt)} style={{background:saving?"#999":C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>{saving?"저장 중...":"저장"}</button>
                          <button onClick={cancelEdit} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:6,padding:"4px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                        </div>
                      ):(<div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>startEdit(r)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:11,fontFamily:"inherit"}}>수정</button><button onClick={()=>openReceipt(r,idx)} style={{background:C.as,border:"1px solid "+C.ac,borderRadius:5,cursor:"pointer",color:C.ac,fontSize:10,fontWeight:600,padding:"3px 8px",fontFamily:"inherit"}}>영수증</button></div>)}
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:13,fontWeight:600,color:C.tp}}>월별 수입</div><div style={{fontSize:10,color:C.tt}}>단위: 만원</div></div>
            <div style={{overflow:"hidden"}}><ResponsiveContainer width="100%" height={160}><BarChart data={monthlyChart} margin={{top:5,right:5,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={C.bl} vertical={false}/><XAxis dataKey="month" tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false} tickFormatter={v=>Math.round(v/10000)}/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="income" fill={C.ac} radius={[5,5,0,0]} barSize={20}/></BarChart></ResponsiveContainer></div>
          </div>
          <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tp,marginBottom:12}}>미납 현황</div>
            {monthRecs.filter(r=>r.status!=="paid").map(r=>{
              const st=STATUS.find(x=>x.id===r.status)||STATUS[2];
              const owed=Math.max(0,r.totalDue-r.paidAmount);
              return(<div key={r.student.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+C.bl}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:600,color:C.tp}}>{r.student.name}</span><span style={{background:st.bg,color:st.c,padding:"1px 5px",borderRadius:4,fontSize:9,fontWeight:600}}>{st.l}</span></div>
                <span style={{fontSize:12,fontWeight:600,color:st.c}}>₩{owed.toLocaleString()}</span>
              </div>);
            })}
            {monthRecs.filter(r=>r.status!=="paid").length===0&&<div style={{textAlign:"center",padding:16,color:C.su,fontSize:12}}>전원 완납!</div>}
          </div>

          {/* Receipt file storage */}
          <div style={{background:C.sf,border:"2px "+(rcptDragOver?"dashed "+C.ac:"solid "+C.bd),borderRadius:14,padding:18,transition:"border .15s"}}
            onDragOver={e=>{e.preventDefault();e.stopPropagation();setRcptDragOver(true);}}
            onDragEnter={e=>{e.preventDefault();e.stopPropagation();setRcptDragOver(true);}}
            onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(!e.currentTarget.contains(e.relatedTarget))setRcptDragOver(false);}}
            onDrop={e=>{e.preventDefault();e.stopPropagation();setRcptDragOver(false);const dt=e.dataTransfer;if(dt?.files?.length){const allowed=['.pdf','.jpg','.jpeg','.png'];const valid=[...dt.files].filter(f=>allowed.some(ext=>f.name.toLowerCase().endsWith(ext)));if(valid.length)uploadRcptFiles(valid);else toast?.('PDF, JPG, PNG 파일만 업로드 가능합니다','error');}}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tp}}>영수증 보관함</div>
              <label style={{background:C.as,color:C.ac,border:"1px solid "+C.ac,borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:rcptUploading?"not-allowed":"pointer",fontFamily:"inherit",opacity:rcptUploading?.5:1}}>
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
                  <span style={{color:C.tt,fontSize:9,flexShrink:0}}>{f.file_size?Math.round(f.file_size/1024)+'KB':''}</span>
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
                  const existing=tuitions.find(t=>t.student_id===memoPopup.studentId&&t.month===curMonth);
                  if(existing){
                    await supabase.from('tuition').update({memo:memoText}).eq('id',existing.id);
                    setTuitions(p=>p.map(t=>t.id===existing.id?{...t,memo:memoText}:t));
                  }else{
                    const{data}=await supabase.from('tuition').insert({student_id:memoPopup.studentId,month:curMonth,memo:memoText,status:'unpaid',amount:0,carryover:0,user_id:user.id}).select().single();
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
          <div onClick={e=>e.stopPropagation()} style={{background:C.sf,borderRadius:14,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflow:"auto",boxShadow:"0 8px 30px rgba(0,0,0,.12)"}}>
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
              {sealImg?<div style={{display:"flex",alignItems:"center",gap:10}}>
                <img src={sealImg} style={{width:48,height:48,objectFit:"contain",border:"1px solid "+C.bd,borderRadius:6,padding:2,background:"#fff"}} alt="인감"/>
                <button onClick={()=>{setSealImg('');try{localStorage.removeItem('rcpt-seal');}catch{}}} style={{background:"none",border:"1px solid "+C.bd,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>삭제</button>
                <span style={{fontSize:10,color:C.tt}}>자동 적용 중</span>
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
                  <button onClick={()=>{const el=signCanvasRef.current;if(!el)return;const d=el.toDataURL('image/png');setSealImg(d);try{localStorage.setItem('rcpt-seal',d);}catch{}setShowSignPad(false);}} style={{background:C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                  <button onClick={()=>setShowSignPad(false)} style={{background:"none",border:"1px solid "+C.bd,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>취소</button>
                </div>
              </div>:<div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>setShowSignPad(true)} style={{background:C.sfh,border:"1px solid "+C.bd,borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",color:C.tp,fontFamily:"inherit"}}>서명 그리기</button>
                <label style={{background:C.sfh,border:"1px solid "+C.bd,borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",color:C.tp,fontFamily:"inherit"}}>
                  이미지 등록
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{const d=ev.target?.result;if(d){setSealImg(d);try{localStorage.setItem('rcpt-seal',d);}catch{}}};reader.readAsDataURL(file);e.target.value='';}}/>
                </label>
                <span style={{fontSize:10,color:C.tt}}>한 번 등록하면 자동 적용</span>
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