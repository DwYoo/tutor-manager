'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { C, SC, STATUS } from '@/components/Colors';
import { p2, fd, DK, lessonOnDate } from '@/lib/utils';
import { useShell } from '@/components/AppShell';
import { useConfirm } from '@/components/ui/ConfirmDialog';
const ls={display:"block",fontSize:12,fontWeight:500,color:C.tt,marginBottom:6};
const is={width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.bd}`,fontSize:14,color:C.tp,background:C.sf,outline:"none",fontFamily:"inherit"};
const IcP=()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcX=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcA=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const IcBack=()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>;

export default function Students(){
  const router=useRouter();
  const{menuBtn}=useShell();
  const tog=menuBtn;
  const{user}=useAuth();
  const toast=useToast();
  const confirm=useConfirm();
  const[students,setStudents]=useState([]);
  const[lessons,setLessons]=useState([]);
  const[showArchived,setShowArchived]=useState(false);
  const[dragId,setDragId]=useState(null);
  const[dropIdx,setDropIdx]=useState(null);
  const[search,setSearch]=useState('');
  const[loading,setLoading]=useState(true);
  const[showAdd,setShowAdd]=useState(false);
  const[editStu,setEditStu]=useState(null);
  const[form,setForm]=useState({name:'',grade:'',subject:'',school:'',phone:'',parent_phone:'',fee:'',fee_per_class:'',birth_date:''});
  const[saving,setSaving]=useState(false);
  const[busyIds,setBusy]=useState(new Set());
  const markBusy=(id)=>setBusy(p=>{const n=new Set(p);n.add(id);return n;});
  const unBusy=(id)=>setBusy(p=>{const n=new Set(p);n.delete(id);return n;});

  const[fetchError,setFetchError]=useState(false);
  useEffect(()=>{fetchStudents();},[]);
  const fetchStudents=async()=>{setFetchError(false);try{const[sRes,lRes]=await Promise.all([supabase.from('students').select('*').order('created_at'),supabase.from('lessons').select('*').order('date')]);if(sRes.error||lRes.error){toast?.('데이터를 불러오지 못했습니다','error');setFetchError(true);}setStudents(sRes.data||[]);setLessons(lRes.data||[]);}catch{toast?.('데이터를 불러오지 못했습니다','error');setFetchError(true);}setLoading(false);};
  const getNextClass=(sid)=>{const now=new Date();for(let offset=0;offset<90;offset++){const d=new Date(now);d.setDate(now.getDate()+offset);const sLessons=lessons.filter(l=>l.student_id===sid&&lessonOnDate(l,d));for(const l of sLessons){const lm=l.start_hour*60+l.start_min;if(offset===0&&lm<=now.getHours()*60+now.getMinutes())continue;return {time:`${d.getMonth()+1}/${d.getDate()}(${DK[d.getDay()]}) ${p2(l.start_hour)}:${p2(l.start_min)}`,topic:l.topic||""};}}return null;};

  const openAdd=()=>{setEditStu(null);setForm({name:'',grade:'',subject:'',school:'',phone:'',parent_phone:'',fee:'',fee_per_class:'',birth_date:''});setShowAdd(true);};
  const openEdit=(s,e)=>{e.stopPropagation();setEditStu(s);setForm({name:s.name||'',grade:s.grade||'',subject:s.subject||'',school:s.school||'',phone:s.phone||'',parent_phone:s.parent_phone||'',fee:String(s.fee||''),fee_per_class:String(s.fee_per_class||''),birth_date:s.birth_date||''});setShowAdd(true);};

  const saveStudent=async()=>{
    if(!form.name.trim()||saving)return;setSaving(true);
    const full={...form,fee:parseInt(form.fee)||0,fee_per_class:parseInt(form.fee_per_class)||0};
    if(editStu){
      const{error}=await supabase.from('students').update(full).eq('id',editStu.id);
      if(error){toast?.('학생 정보 저장에 실패했습니다','error');setSaving(false);return;}
      toast?.('학생 정보가 저장되었습니다');fetchStudents();
    }else{
      const maxSort=students.reduce((m,s)=>Math.max(m,s.sort_order??-1),-1);
      const{error}=await supabase.from('students').insert({...full,color_index:students.length%8,fee_status:'unpaid',user_id:user.id,sort_order:maxSort+1});
      if(error){toast?.('학생 추가에 실패했습니다','error');setSaving(false);return;}
      toast?.('학생이 추가되었습니다');fetchStudents();
    }
    setShowAdd(false);setEditStu(null);setSaving(false);
  };

  const deleteStudent=async(id,e)=>{e.stopPropagation();if(!await confirm('정말 삭제하시겠습니까?',{danger:true,confirmText:'삭제',description:'학생의 모든 데이터가 삭제됩니다.'}))return;markBusy(id);const{error}=await supabase.from('students').delete().eq('id',id);unBusy(id);if(error){toast?.('삭제에 실패했습니다','error');return;}toast?.('학생이 삭제되었습니다');fetchStudents();};
  const archiveStudent=async(id,e)=>{e.stopPropagation();markBusy(id);const{error}=await supabase.from('students').update({archived:true}).eq('id',id);unBusy(id);if(error){toast?.('보관 처리에 실패했습니다','error');return;}toast?.('보관함으로 이동했습니다');fetchStudents();};
  const restoreStudent=async(id,e)=>{e.stopPropagation();markBusy(id);const{error}=await supabase.from('students').update({archived:false}).eq('id',id);unBusy(id);if(error){toast?.('복원에 실패했습니다','error');return;}toast?.('학생이 복원되었습니다');fetchStudents();};

  const activeStudents=students.filter(s=>!s.archived).sort((a,b)=>(a.sort_order??Infinity)-(b.sort_order??Infinity));
  const archivedStudents=students.filter(s=>!!s.archived);
  /* Student numbers: sort_order 기반 (보관=유지, 순서변경=반영, 삭제=당겨짐) */
  const stuNumMap={};[...students].sort((a,b)=>{const sa=a.sort_order??Infinity,sb=b.sort_order??Infinity;if(sa!==sb)return sa-sb;if(!!a.archived!==!!b.archived)return a.archived?1:-1;const ca=new Date(a.created_at).getTime(),cb=new Date(b.created_at).getTime();return ca!==cb?ca-cb:(a.id<b.id?-1:1);}).forEach((s,i)=>{stuNumMap[s.id]=i+1;});
  const filtered=(showArchived?archivedStudents:activeStudents).filter(s=>(s.name||'').includes(search)||(s.subject||'').includes(search)||(s.school||'').includes(search));

  const canDrag=!showArchived&&!search;
  const dragFi=dragId?filtered.findIndex(x=>x.id===dragId):-1;
  const noDrop=dropIdx!=null&&(dropIdx===dragFi||dropIdx===dragFi+1);
  const onDS=(e,id)=>{setDragId(id);e.dataTransfer.effectAllowed='move';};
  const onDO=(e,idx)=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect();const ni=e.clientX<r.left+r.width/2?idx:idx+1;if(ni!==dropIdx)setDropIdx(ni);};
  const onDR=async(e)=>{e.preventDefault();const fid=dragId,di=dropIdx;setDragId(null);setDropIdx(null);if(!fid||di==null)return;const list=[...activeStudents];const fi=list.findIndex(s=>s.id===fid);if(fi<0)return;const[mv]=list.splice(fi,1);const ai=di>fi?di-1:di;list.splice(ai,0,mv);if(list.every((s,i)=>s.id===activeStudents[i].id))return;const reordered=list.map((s,i)=>({...s,sort_order:i}));setStudents(prev=>[...reordered,...prev.filter(s=>!!s.archived)]);try{const updates=reordered.map((s,i)=>supabase.from('students').update({sort_order:i}).eq('id',s.id));const results=await Promise.all(updates);const failed=results.some(r=>r.error);if(failed){toast?.('순서 저장에 실패했습니다','error');fetchStudents();}else{toast?.('순서가 저장되었습니다');}}catch{toast?.('순서 저장에 실패했습니다','error');fetchStudents();}};
  const onDE=()=>{setDragId(null);setDropIdx(null);};

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);
  if(fetchError&&!students.length)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><div style={{fontSize:14,color:C.dn}}>데이터를 불러오지 못했습니다</div><button onClick={()=>{setLoading(true);fetchStudents();}} style={{padding:"8px 20px",borderRadius:8,border:`1px solid ${C.bd}`,background:C.sf,color:C.tp,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>다시 시도</button></div>);

  return(
    <div className="stu-container" style={{padding:28}}>
      <style>{`.hcard{transition:all .12s;}.hcard:hover{background:${C.sfh}!important;}
        @media(max-width:768px){.stu-container{padding:16px!important;}.stu-grid{grid-template-columns:1fr!important;}.stu-search{width:100%!important;}.hcard{padding:14px!important;min-height:120px;}}`}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {tog}
          {showArchived&&<button onClick={()=>setShowArchived(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.ts,display:"flex",alignItems:"center",padding:0}}><IcBack/></button>}
          <h1 style={{fontSize:20,fontWeight:700,color:C.tp}}>{showArchived?"보관된 학생":"학생 관리"}</h1>
          <span style={{background:C.sfh,color:C.ts,padding:"3px 10px",borderRadius:6,fontSize:12}}>{(showArchived?archivedStudents:activeStudents).length}명</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",flex:1,minWidth:0,justifyContent:"flex-end"}}>
          {!showArchived&&archivedStudents.length>0&&<button onClick={()=>setShowArchived(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.sfh,color:C.ts,border:`1px solid ${C.bd}`,borderRadius:8,padding:"8px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}><IcA/> 보관함 ({archivedStudents.length})</button>}
          <input value={search} onChange={e=>setSearch(e.target.value)} className="stu-search" style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.bd}`,fontSize:13,color:C.tp,outline:"none",width:200,flex:1,minWidth:0,fontFamily:"inherit"}} placeholder="검색..."/>
          {!showArchived&&<button onClick={openAdd} style={{display:"flex",alignItems:"center",gap:4,background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}><IcP/> 학생 추가</button>}
        </div>
      </div>

      {/* Student cards */}
      <div className="stu-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
        {filtered.map((s,idx)=>{
          const col=SC[(s.color_index||0)%8];
          const isDrag=dragId===s.id;
          const isBusy=busyIds.has(s.id);
          const showL=canDrag&&dragId&&!isDrag&&dropIdx===idx&&!noDrop;
          const showR=canDrag&&dragId&&!isDrag&&idx===filtered.length-1&&dropIdx===filtered.length&&!noDrop;
          return(
            <div key={s.id} onClick={()=>!isBusy&&router.push('/students/'+s.id)} draggable={canDrag&&!isBusy} onDragStart={e=>onDS(e,s.id)} onDragOver={e=>onDO(e,idx)} onDrop={onDR} onDragEnd={onDE} style={{position:"relative",display:"flex",flexDirection:"column",background:C.sf,border:`1px solid ${C.bd}`,borderRadius:14,padding:20,cursor:isBusy?"wait":canDrag?"grab":"pointer",borderTop:`3px solid ${col.b}`,opacity:isDrag?.4:isBusy?.5:1,transition:"opacity .15s",minHeight:120,pointerEvents:isBusy?"none":"auto"}} className="hcard">
              {isBusy&&<div style={{position:"absolute",inset:0,borderRadius:14,background:"rgba(255,255,255,.6)",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"auto"}}><div style={{fontSize:12,color:C.ts,fontWeight:500}}>처리 중...</div></div>}
              {showL&&<div style={{position:"absolute",left:-9,top:4,bottom:4,width:3,borderRadius:2,background:C.ac,boxShadow:`0 0 8px ${C.ac}`,zIndex:5}}/>}
              {showR&&<div style={{position:"absolute",right:-9,top:4,bottom:4,width:3,borderRadius:2,background:C.ac,boxShadow:`0 0 8px ${C.ac}`,zIndex:5}}/>}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:10,background:col.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:col.t}}>{(s.name||"?")[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:C.tp}}><span style={{color:C.tt,fontWeight:400,fontSize:11,marginRight:4}}>{stuNumMap[s.id]}</span>{s.name}</div>
                  <div style={{display:"flex",gap:4,marginTop:2}}>
                    <span style={{background:col.bg,color:col.t,padding:"2px 8px",borderRadius:5,fontSize:11,fontWeight:600}}>{s.subject}</span>
                    <span style={{background:C.sfh,color:C.ts,padding:"2px 8px",borderRadius:5,fontSize:11}}>{s.grade}</span>
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.ts}}>
                {(()=>{const nc=getNextClass(s.id);return nc?<div><div>다음: {nc.time}</div>{nc.topic&&<div style={{fontSize:11,color:C.tp,fontWeight:500,marginTop:2}}>{nc.topic}</div>}</div>:<span style={{color:C.tt}}>예정된 수업 없음</span>;})()}
              </div>
              <div style={{flex:1,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.bl}`,fontSize:12}}>
                {s.school&&<span style={{color:C.ts}}>{s.school}</span>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.bl}`}}>
                {s.archived
                  ?<button onClick={e=>restoreStudent(s.id,e)} style={{background:"none",border:"none",cursor:"pointer",color:C.ac,fontSize:11,fontWeight:600,fontFamily:"inherit"}}>복원</button>
                  :<><button onClick={e=>openEdit(s,e)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:11,fontFamily:"inherit"}}>수정</button><button onClick={e=>archiveStudent(s.id,e)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:11,fontFamily:"inherit"}}>보관</button></>
                }
                <button onClick={e=>deleteStudent(s.id,e)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:11,fontFamily:"inherit"}}>삭제</button>
              </div>
            </div>
          );
        })}

        {showArchived&&filtered.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:C.tt,fontSize:14}}>보관된 학생이 없습니다</div>}

        {/* Add card */}
        {!showArchived&&<div onClick={openAdd} style={{background:C.sf,border:`2px dashed ${C.bd}`,borderRadius:14,padding:20,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:160,color:C.tt}} className="hcard">
          <IcP/>
          <div style={{marginTop:8,fontSize:13}}>학생 추가</div>
        </div>}
      </div>

      {/* Add/Edit Modal */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.35)"}} onClick={()=>{setShowAdd(false);setEditStu(null);}}>
          <div onClick={e=>e.stopPropagation()} className="detail-modal" style={{background:C.sf,borderRadius:16,width:"100%",maxWidth:440,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,.15)",maxHeight:"90vh",overflow:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:700,color:C.tp}}>{editStu?"학생 수정":"학생 추가"}</h2>
              <button onClick={()=>{setShowAdd(false);setEditStu(null);}} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,display:"flex"}}><IcX/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                {k:'name',l:'이름',ph:'학생 이름'},
                {k:'grade',l:'학년',ph:'예: 고2'},
                {k:'birth_date',l:'생년월일',ph:'예: 2008-03-15',type:'date'},
                {k:'subject',l:'과목',ph:'예: 수학'},
                {k:'school',l:'학교',ph:'학교명'},
                {k:'phone',l:'연락처',ph:'010-0000-0000'},
                {k:'parent_phone',l:'학부모 연락처',ph:'010-0000-0000'},
                {k:'fee',l:'월 수업료 (참고용)',ph:'예: 400000'},
                {k:'fee_per_class',l:'수업당 단가',ph:'예: 50000'},
              ].map(f=>(<div key={f.k}><label style={ls}>{f.l}</label><input type={f.type||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={is} placeholder={f.ph}/></div>))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowAdd(false);setEditStu(null);}} style={{background:C.sfh,color:C.ts,border:`1px solid ${C.bd}`,borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
              <button disabled={saving} onClick={saveStudent} style={{background:saving?"#999":C.pr,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}>{saving?(editStu?"저장 중...":"추가 중..."):(editStu?"저장":"추가")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}