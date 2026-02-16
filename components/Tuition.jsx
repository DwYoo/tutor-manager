'use client';
import { useState, useEffect, useCallback } from 'react';
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
  const[receiptData,setReceiptData]=useState(null);
  const[rcptForm,setRcptForm]=useState({});

  const year=+curMonth.split("-")[0],month=+curMonth.split("-")[1];
  const prevM=()=>{const m=month===1?12:month-1;const y=month===1?year-1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});};
  const nextM=()=>{const m=month===12?1:month+1;const y=month===12?year+1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});};

  const[fetchError,setFetchError]=useState(false);
  const[saving,setSaving]=useState(false);
  const fetchData=useCallback(async()=>{
    setLoading(true);setFetchError(false);
    try{
      const[sRes,tRes,lRes]=await Promise.all([
        supabase.from('students').select('*').order('created_at'),
        supabase.from('tuition').select('*'),
        supabase.from('lessons').select('*'),
      ]);
      if(sRes.error||tRes.error||lRes.error){setFetchError(true);setLoading(false);return;}
      setStudents(sRes.data||[]);setTuitions(tRes.data||[]);setLessons(lRes.data||[]);
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

  /* Build month records (archived 학생 제외) */
  const activeStudents=students.filter(s=>!s.archived);
  const monthRecs=activeStudents.map(s=>{
    const rec=tuitions.find(t=>t.student_id===s.id&&t.month===curMonth);
    const lessonCnt=countLessons(s.id,year,month);
    const autoFee=(s.fee_per_class||0)*lessonCnt;
    const carryover=rec?.carryover||0;
    const autoTotalDue=autoFee+carryover;
    // fee_override가 있으면 청구액 수동값, 없으면 자동계산(수업료+이월)
    const totalDue=(rec&&rec.fee_override!=null)?rec.fee_override:autoTotalDue;
    const paidAmount=rec?.amount||0;
    const status=autoStatus(paidAmount,totalDue);
    const isOverridden=(rec&&rec.fee_override!=null);
    return{student:s,record:rec||{student_id:s.id,month:curMonth,status:"unpaid",amount:0,carryover:0,memo:""},lessonCnt,autoFee,carryover,autoTotalDue,totalDue,paidAmount,status,isOverridden};
  });

  const totalFee=monthRecs.reduce((a,r)=>a+r.totalDue,0);
  const totalPaid=monthRecs.reduce((a,r)=>a+r.paidAmount,0);
  const totalUnpaid=monthRecs.reduce((a,r)=>r.status!=="paid"?a+Math.max(0,r.totalDue-r.paidAmount):a,0);
  const collectRate=totalFee>0?Math.max(0,Math.round((totalFee-totalUnpaid)/totalFee*100)):0;

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
      tuitionFee:r.autoFee,
    });
  };
  const cancelEdit=()=>{setEditId(null);setEditForm({});};

  const saveEdit=async(studentId,lessonCnt)=>{
    if(saving)return;setSaving(true);
    try{
      const totalDueVal=parseInt(editForm.totalDue)||0;
      const carryoverVal=parseInt(editForm.carryover)||0;
      const editedFeePerClass=parseInt(editForm.fee_per_class)||0;
      const editedAutoFee=editedFeePerClass*lessonCnt;
      const editedTuitionFee=parseInt(editForm.tuitionFee)||0;
      const effectiveAutoFee=(editedTuitionFee!==editedAutoFee)?editedTuitionFee:editedAutoFee;
      const feeOverride=(totalDueVal!==(effectiveAutoFee+carryoverVal))?totalDueVal:null;
      const existing=tuitions.find(t=>t.student_id===studentId&&t.month===curMonth);
      const payload={
        student_id:studentId,month:curMonth,
        status:editForm.status,
        amount:parseInt(editForm.amount)||0,
        carryover:parseInt(editForm.carryover)||0,
        fee_override:feeOverride,
        memo:editForm.memo,
        paid_date:editForm.paid_date||null,
        classes:countLessons(studentId,year,month),
        user_id:user.id,
      };
      if(existing){
        await supabase.from('tuition').update(payload).eq('id',existing.id);
        setTuitions(p=>p.map(t=>t.id===existing.id?{...t,...payload}:t));
      }else{
        const{data,error}=await supabase.from('tuition').insert(payload).select().single();
        if(!error&&data)setTuitions(p=>[...p,data]);
      }
      const feePerClass=parseInt(editForm.fee_per_class)||0;
      await supabase.from('students').update({fee_status:editForm.status,fee_per_class:feePerClass}).eq('id',studentId);
      setStudents(p=>p.map(s=>s.id===studentId?{...s,fee_status:editForm.status,fee_per_class:feePerClass}:s));
      setEditId(null);setEditForm({});
    }finally{setSaving(false);}
  };

  // Reset override (되돌리기)
  const resetFee=async(studentId)=>{
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===curMonth);
    if(existing){
      await supabase.from('tuition').update({fee_override:null}).eq('id',existing.id);
      setTuitions(p=>p.map(t=>t.id===existing.id?{...t,fee_override:null}:t));
    }
  };

  /* Receipt */
  const openReceipt=(r)=>{
    const d=new Date();
    setReceiptData(r);
    setRcptForm({
      serialNo:'',period:`${year}년 ${month}월`,regNo:'',
      name:r.student.name||'',birthDate:'',subject:r.student.subject||'',
      tuitionFee:String(r.autoFee||0),
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
    const cs='border:1px solid #000;padding:6px 8px;font-size:11px;';
    const makeR=(title)=>`<div style="flex:1;width:0;display:flex;flex-direction:column;justify-content:space-between;height:100%;">
<div>
<div style="border:3px double #000;padding:8px 10px;text-align:center;font-size:16px;font-weight:bold;letter-spacing:4px;margin-bottom:12px;">${title}</div>
<table style="width:100%;border-collapse:collapse;" cellpadding="0">
<tr><td style="${cs}" colspan="2">일련번호 : ${f.serialNo||''}</td><td style="${cs}" colspan="2">연월(분기) : ${f.period||''}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;width:36px;" rowspan="2">납부자</td><td style="${cs}">등록번호 : ${f.regNo||''}</td><td style="${cs}" colspan="2">성명 : ${f.name||''}</td></tr>
<tr><td style="${cs}">생년월일 : ${f.birthDate||''}</td><td style="${cs}" colspan="2">교습과목 : ${f.subject||''}</td></tr>
<tr><td style="${cs}text-align:center;font-weight:bold;width:36px;" rowspan="3">납부<br>명세</td><td style="${cs}text-align:center;vertical-align:middle;width:80px;" rowspan="3">교습비<br><br><b style="font-size:13px;">${tFee>0?tFee.toLocaleString()+'원':''}</b></td><td style="${cs}text-align:center;font-weight:bold;" colspan="2">기타경비</td></tr>
<tr><td style="${cs}">${f.etcLabel1||''}</td><td style="${cs}">${e1>0?e1.toLocaleString()+'원':''}</td></tr>
<tr><td style="${cs}">${f.etcLabel2||''}</td><td style="${cs}">${e2>0?e2.toLocaleString()+'원':''}</td></tr>
</table>
<p style="text-align:center;margin:20px 0 6px;font-size:12px;font-weight:bold;">위와 같이 영수하였음을 증명합니다.</p>
<p style="font-size:9px;color:#555;margin:4px 0 16px;">※ 본 서식 외 교육감이 지정한 영수증을 사용할 수 있습니다.</p>
<p style="text-align:right;margin:20px 6px 0;font-size:12px;">${f.issueYear||''}년 &nbsp;&nbsp; ${f.issueMonth||''}월 &nbsp;&nbsp; ${f.issueDay||''}일</p>
<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;">
<span>학원설립·운영자 또는 교습자</span>
<span>${f.tutorName||''} &nbsp;&nbsp;&nbsp;(서명 또는 인)</span>
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

      {/* Main grid */}
      <div className="tu-grid" style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:20}}>
        {/* Table */}
        <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{borderBottom:"1px solid "+C.bd}}>
              {["학생","회당단가","횟수","수업료","이월","청구액","납부","상태","메모",""].map((h,i)=>(<th key={i} style={{padding:"12px",textAlign:"left",fontSize:11,fontWeight:600,color:C.tt,background:C.sfh,whiteSpace:"nowrap"}}>{h}</th>))}
            </tr></thead>
            <tbody>
              {monthRecs.map(r=>{
                const{student:s,record:rec}=r;
                const st=STATUS.find(x=>x.id===r.status)||STATUS[2];
                const isEditing=editId===(rec.id||s.id);
                return(
                  <tr key={s.id} className="tr" style={{borderBottom:"1px solid "+C.bl}}>
                    <td style={{padding:"10px 12px",fontWeight:600,color:C.tp}}>{s.name}</td>
                    <td style={{padding:"10px 12px",color:C.ts}}>
                      {isEditing?<input type="number" value={editForm.fee_per_class} onChange={e=>setEditForm(p=>({...p,fee_per_class:e.target.value}))} style={{...eis,width:80}}/>:
                      <>₩{(s.fee_per_class||0).toLocaleString()}</>}
                    </td>
                    <td style={{padding:"10px 12px",fontWeight:600}}>{r.lessonCnt}회</td>
                    <td style={{padding:"10px 12px",fontWeight:500,color:C.tp}}>
                      {isEditing?<input type="number" value={editForm.tuitionFee} onChange={e=>{const tf=e.target.value;const carry=parseInt(editForm.carryover)||0;setEditForm(p=>({...p,tuitionFee:tf,totalDue:(parseInt(tf)||0)+carry}));}} style={{...eis,width:90}}/>:
                      <>₩{r.autoFee.toLocaleString()}</>}
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
                          {r.isOverridden&&<button onClick={()=>resetFee(s.id)} style={{marginLeft:6,fontSize:9,color:"#e67e22",cursor:"pointer",background:"none",padding:"2px 6px",borderRadius:4,border:"1px solid #e67e22",fontWeight:600,fontFamily:"inherit"}} title="클릭하면 자동계산으로 되돌립니다">수동</button>}
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
                      {isEditing?<input value={editForm.memo} onChange={e=>setEditForm(p=>({...p,memo:e.target.value}))} style={{...eis,width:80,fontSize:11}} placeholder="메모"/>:
                      rec.memo?<span onClick={()=>setMemoPopup({name:s.name,memo:rec.memo})} style={{fontSize:10,color:C.tt,background:C.sfh,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>💬</span>:null}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {isEditing?(
                        <div style={{display:"flex",gap:4}}>
                          <button disabled={saving} onClick={()=>saveEdit(s.id,r.lessonCnt)} style={{background:saving?"#999":C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>{saving?"저장 중...":"저장"}</button>
                          <button onClick={cancelEdit} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:6,padding:"4px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                        </div>
                      ):(<div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>startEdit(r)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:11,fontFamily:"inherit"}}>수정</button><button onClick={()=>openReceipt(r)} style={{background:C.as,border:"1px solid "+C.ac,borderRadius:5,cursor:"pointer",color:C.ac,fontSize:10,fontWeight:600,padding:"3px 8px",fontFamily:"inherit"}}>영수증</button></div>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeStudents.length===0&&<div style={{textAlign:"center",padding:30,color:C.tt,fontSize:13}}>학생을 먼저 추가해주세요</div>}
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
        </div>
      </div>

      {/* Memo popup */}
      {memoPopup&&(
        <div onClick={()=>setMemoPopup(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.sf,borderRadius:14,padding:24,minWidth:280,maxWidth:400,boxShadow:"0 8px 30px rgba(0,0,0,.12)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tp}}>{memoPopup.name} 메모</div>
              <button onClick={()=>setMemoPopup(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.tt,fontFamily:"inherit",padding:4}}>✕</button>
            </div>
            <div style={{fontSize:13,color:C.ts,lineHeight:1.6,whiteSpace:"pre-wrap",background:C.sfh,borderRadius:8,padding:14}}>{memoPopup.memo}</div>
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
              <div><label style={rls}>등록번호</label><input value={rcptForm.regNo||''} onChange={e=>setRcptForm(p=>({...p,regNo:e.target.value}))} style={ris} placeholder="선택사항"/></div>
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
            <div style={{marginBottom:24}}>
              <label style={rls}>교습자 / 학원명</label>
              <input value={rcptForm.tutorName||''} onChange={e=>setRcptForm(p=>({...p,tutorName:e.target.value}))} style={ris} placeholder="이름 또는 학원명 (자동 저장)"/>
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