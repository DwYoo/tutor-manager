'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { C, STATUS } from '@/components/Colors';
const p2=n=>String(n).padStart(2,"0");
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

  const year=+curMonth.split("-")[0],month=+curMonth.split("-")[1];
  const prevM=()=>{const m=month===1?12:month-1;const y=month===1?year-1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});};
  const nextM=()=>{const m=month===12?1:month+1;const y=month===12?year+1:year;setCurMonth(y+"-"+p2(m));setEditId(null);setEditForm({});};

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const[sRes,tRes,lRes]=await Promise.all([
      supabase.from('students').select('*').order('created_at'),
      supabase.from('tuition').select('*'),
      supabase.from('lessons').select('*'),
    ]);
    setStudents(sRes.data||[]);setTuitions(tRes.data||[]);setLessons(lRes.data||[]);setLoading(false);
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
    });
  };
  const cancelEdit=()=>{setEditId(null);setEditForm({});};

  const saveEdit=async(studentId,autoFee)=>{
    const totalDueVal=parseInt(editForm.totalDue)||0;
    const carryoverVal=parseInt(editForm.carryover)||0;
    // fee_override: 청구액이 자동계산(수업료+이월)과 다르면 수동값 저장
    const feeOverride=(totalDueVal!==(autoFee+carryoverVal))?totalDueVal:null;
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
    await supabase.from('students').update({fee_status:editForm.status}).eq('id',studentId);
    setStudents(p=>p.map(s=>s.id===studentId?{...s,fee_status:editForm.status}:s));
    setEditId(null);setEditForm({});
  };

  // Reset override (되돌리기)
  const resetFee=async(studentId)=>{
    const existing=tuitions.find(t=>t.student_id===studentId&&t.month===curMonth);
    if(existing){
      await supabase.from('tuition').update({fee_override:null}).eq('id',existing.id);
      setTuitions(p=>p.map(t=>t.id===existing.id?{...t,fee_override:null}:t));
    }
  };

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);

  const eis={padding:"4px 6px",borderRadius:6,border:"1px solid "+C.bd,fontSize:12,fontFamily:"inherit"};

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
                    <td style={{padding:"10px 12px",color:C.ts}}>₩{(s.fee_per_class||0).toLocaleString()}</td>
                    <td style={{padding:"10px 12px",fontWeight:600}}>{r.lessonCnt}회</td>
                    <td style={{padding:"10px 12px",fontWeight:500,color:C.tp}}>₩{r.autoFee.toLocaleString()}</td>
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
                          {r.isOverridden&&<span onClick={()=>resetFee(s.id)} style={{marginLeft:4,fontSize:9,color:C.ac,cursor:"pointer",background:C.al,padding:"1px 4px",borderRadius:3}} title="자동계산으로 되돌리기">수동</span>}
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
                          <button onClick={()=>saveEdit(s.id,r.autoFee)} style={{background:C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                          <button onClick={cancelEdit} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:6,padding:"4px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                        </div>
                      ):(<button onClick={()=>startEdit(r)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:11,fontFamily:"inherit"}}>수정</button>)}
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
    </div>
  );
}