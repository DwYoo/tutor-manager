'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import LessonDetailModal from './student/LessonDetailModal';
import TimelineTab from './student/TimelineTab';
import CalendarTab from './student/CalendarTab';
import ReportTab from './student/ReportTab';
import HomeworkTab from './student/HomeworkTab';
import WrongAnswerTab from './student/WrongAnswerTab';
import ScoresTab from './student/ScoresTab';
import PlanTab from './student/PlanTab';
import FilesTab from './student/FilesTab';
import { C, SC, fd, IcBack } from './student/constants';

export default function StudentDetail({ student, onBack, menuBtn }) {
  const{user}=useAuth();
  const s = student;
  if (!s) return null;
  const tog = menuBtn;
  const col = SC[(typeof s.color_index==='number'?s.color_index:s.name?s.name.charCodeAt(0):0)%8]||SC[0];

  const [mainTab,setMainTab]=useState("class");
  const [subTab,setSubTab]=useState("timeline");
  const [isParent,setIsParent]=useState(false);
  const [loading,setLoading]=useState(true);
  const [lessons,setLessons]=useState([]);
  const [scores,setScores]=useState([]);
  const [wrongs,setWrongs]=useState([]);
  const [reports,setReports]=useState([]);
  const [planComments,setPlanComments]=useState([]);
  const [lesDetailData,setLesDetailData]=useState(null);
  const [standaloneFiles,setStandaloneFiles]=useState([]);
  const [uploading,setUploading]=useState(false);
  const [shareToken,setShareToken]=useState(s.share_token||null);
  const [shareCopied,setShareCopied]=useState(false);

  // Plan fields
  const [planStrategy,setPlanStrategy]=useState("");
  const [planStrength,setPlanStrength]=useState("");
  const [planWeakness,setPlanWeakness]=useState("");
  const [planOpportunity,setPlanOpportunity]=useState("");
  const [planThreat,setPlanThreat]=useState("");

  const mainTabs=[
    {id:"class",l:"수업",subs:[{id:"timeline",l:"타임라인"},{id:"calendar",l:"일정"}]},
    {id:"study",l:"학습관리",subs:[{id:"homework",l:"숙제"},{id:"wrong",l:"오답관리"}]},
    {id:"analysis",l:"분석",subs:[{id:"plan",l:"오버뷰"},{id:"scores",l:"성적"}]},
    {id:"archive",l:"자료실",subs:[{id:"files",l:"자료"}]}
  ];
  const curMain=mainTabs.find(m=>m.id===mainTab);
  const switchMain=(id)=>{setMainTab(id);const m=mainTabs.find(x=>x.id===id);if(m)setSubTab(m.subs[0].id);};

  const fetchAll=useCallback(async()=>{
    if(!s.id)return;setLoading(true);
    const [a,b,c,d]=await Promise.all([
      supabase.from('lessons').select('*, homework(*), files(*)').eq('student_id',s.id).order('date',{ascending:false}),
      supabase.from('scores').select('*').eq('student_id',s.id).order('created_at'),
      supabase.from('wrong_answers').select('*').eq('student_id',s.id).order('created_at',{ascending:false}),
      supabase.from('reports').select('*').eq('student_id',s.id).order('date',{ascending:false}),
    ]);
    setLessons(a.data||[]);setScores(b.data||[]);setWrongs(c.data||[]);
    const allReps=d.data||[];
    setReports(allReps.filter(r=>r.type!=='plan'));
    setPlanComments(allReps.filter(r=>r.type==='plan'));
    setPlanStrategy(s.plan_strategy||"");
    setPlanStrength(s.plan_strength||"");
    setPlanWeakness(s.plan_weakness||"");
    setPlanOpportunity(s.plan_opportunity||"");
    setPlanThreat(s.plan_threat||"");
    const{data:sf}=await supabase.from('files').select('*').eq('student_id',s.id).is('lesson_id',null).order('created_at',{ascending:false});
    setStandaloneFiles(sf||[]);
    setLoading(false);
  },[s.id]);
  useEffect(()=>{fetchAll();},[fetchAll]);

  const allFiles=lessons.flatMap(l=>(l.files||[]).map(f=>({...f,lesDate:l.date,lesTopic:l.topic||l.subject})));

  // --- Handlers ---
  const updHw=async(hwId,key,val)=>{await supabase.from('homework').update({[key]:val}).eq('id',hwId);setLessons(prev=>prev.map(l=>({...l,homework:(l.homework||[]).map(h=>h.id===hwId?{...h,[key]:val}:h)})));};
  const delHw=async(hwId)=>{if(!confirm("이 숙제를 삭제할까요?"))return;await supabase.from('homework').delete().eq('id',hwId);setLessons(prev=>prev.map(l=>({...l,homework:(l.homework||[]).filter(h=>h.id!==hwId)})));};

  const materialize=async(l,viewDate)=>{
    const{data,error}=await supabase.from('lessons').insert({student_id:l.student_id,date:viewDate,start_hour:l.start_hour,start_min:l.start_min,duration:l.duration,subject:l.subject,topic:"",is_recurring:false,recurring_day:null,user_id:user.id}).select('*, homework(*), files(*)').single();
    if(error||!data)return null;
    const exc=[...(l.recurring_exceptions||[]),viewDate];
    await supabase.from('lessons').update({recurring_exceptions:exc}).eq('id',l.id);
    setLessons(p=>[...p.map(x=>x.id===l.id?{...x,recurring_exceptions:exc}:x),data]);
    return data;
  };
  const openLesson=async(l,viewDate)=>{
    if(l.is_recurring&&l.date!==viewDate){const d=await materialize(l,viewDate);if(d)setLesDetailData(d);}
    else setLesDetailData(l);
  };

  // Wrong answers
  const wTimers=useRef({});
  const addWrong=async(wForm)=>{const nums=wForm.problem_num.split(',').map(n=>n.trim()).filter(Boolean);if(!nums.length)return;const rows=nums.map(n=>({student_id:s.id,book:wForm.book,chapter:wForm.chapter,problem_num:n,reason:wForm.reason,note:wForm.note,user_id:user.id}));const{data,error}=await supabase.from('wrong_answers').insert(rows).select();if(!error&&data)setWrongs(p=>[...data,...p]);};
  const delWrong=async(id)=>{if(!confirm("이 오답을 삭제할까요?"))return;await supabase.from('wrong_answers').delete().eq('id',id);setWrongs(p=>p.filter(w=>w.id!==id));};
  const updWrong=(id,key,val)=>{setWrongs(p=>p.map(w=>w.id===id?{...w,[key]:val}:w));const tk=id+key;clearTimeout(wTimers.current[tk]);wTimers.current[tk]=setTimeout(async()=>{await supabase.from('wrong_answers').update({[key]:val}).eq('id',id);},500);};

  // Reports
  const addRp=async(title,body,isShared)=>{const{data,error}=await supabase.from('reports').insert({student_id:s.id,title,body,is_shared:isShared,date:fd(new Date()),user_id:user.id}).select().single();if(!error&&data)setReports(p=>[data,...p]);};
  const delRp=async(id)=>{if(!confirm("이 기록을 삭제할까요?"))return;await supabase.from('reports').delete().eq('id',id);setReports(p=>p.filter(r=>r.id!==id));};

  // Scores
  const addScore=async(form)=>{const{data,error}=await supabase.from('scores').insert({student_id:s.id,date:form.date,score:parseInt(form.score),label:form.label,user_id:user.id}).select().single();if(!error&&data)setScores(p=>[...p,data]);};
  const delScore=async(id)=>{await supabase.from('scores').delete().eq('id',id);setScores(p=>p.filter(x=>x.id!==id));};
  const editSaveScore=async(id,form)=>{const{error}=await supabase.from('scores').update({date:form.date,score:parseInt(form.score),label:form.label}).eq('id',id);if(!error)setScores(p=>p.map(x=>x.id===id?{...x,date:form.date,score:parseInt(form.score),label:form.label}:x));};

  // Plan
  const savePlanFields=async(fields)=>{
    try{
      const full={plan_strategy:fields.strategy,plan_strength:fields.strength,plan_weakness:fields.weakness,plan_opportunity:fields.opportunity,plan_threat:fields.threat};
      const{error}=await supabase.from('students').update(full).eq('id',s.id);
      if(error){
        const{error:e2}=await supabase.from('students').update({plan_strategy:fields.strategy,plan_strength:fields.strength,plan_weakness:fields.weakness}).eq('id',s.id);
        if(e2){alert("저장 실패: "+e2.message);return;}
      }
      setPlanStrategy(fields.strategy);setPlanStrength(fields.strength);setPlanWeakness(fields.weakness);setPlanOpportunity(fields.opportunity);setPlanThreat(fields.threat);
    }catch(e){alert("저장 중 오류: "+e.message);}
  };
  const addPlanReport=async(title,body,isShared)=>{
    try{
      const row={student_id:s.id,title,body,is_shared:isShared,type:"plan",date:fd(new Date()),user_id:user.id};
      const{data,error}=await supabase.from('reports').insert(row).select().single();
      if(error){alert("리포트 저장 실패: "+error.message);return;}
      if(data)setPlanComments(p=>[data,...p]);
    }catch(e){alert("리포트 저장 중 오류: "+e.message);}
  };
  const updatePlanComment=async(id,title,body,isShared)=>{
    const{error}=await supabase.from('reports').update({title,body,is_shared:isShared}).eq('id',id);
    if(error){alert("수정 실패: "+error.message);return;}
    setPlanComments(p=>p.map(c=>c.id===id?{...c,title,body,is_shared:isShared}:c));
  };
  const deletePlanReport=async(id)=>{if(!confirm("이 리포트를 삭제할까요?"))return;await supabase.from('reports').delete().eq('id',id);setPlanComments(p=>p.filter(c=>c.id!==id));};

  // Files
  const handleFileDrop=async(files)=>{if(!files||!files.length)return;setUploading(true);
    for(const file of files){
      const ext=file.name.split('.').pop().toLowerCase();
      const ftype=["pdf"].includes(ext)?"pdf":["jpg","jpeg","png","gif","webp"].includes(ext)?"img":"file";
      const path=`students/${s.id}/${Date.now()}_${file.name}`;
      const{error:upErr}=await supabase.storage.from('files').upload(path,file);
      if(upErr){console.error(upErr);continue;}
      const{data:urlData}=supabase.storage.from('files').getPublicUrl(path);
      const{data,error}=await supabase.from('files').insert({student_id:s.id,file_name:file.name,file_type:ftype,file_url:urlData.publicUrl,user_id:user.id}).select().single();
      if(!error&&data)setStandaloneFiles(p=>[data,...p]);
    }
    setUploading(false);
  };
  const delFile=async(id)=>{if(!confirm("이 파일을 삭제할까요?"))return;await supabase.from('files').delete().eq('id',id);setStandaloneFiles(p=>p.filter(f=>f.id!==id));};
  const renameFile=async(id,name)=>{await supabase.from('files').update({file_name:name}).eq('id',id);setStandaloneFiles(p=>p.map(f=>f.id===id?{...f,file_name:name}:f));};

  const copyShareLink=async()=>{
    let tk=shareToken;
    if(!tk){tk=crypto.randomUUID();const{error}=await supabase.from('students').update({share_token:tk}).eq('id',s.id);if(error){alert("공유 링크 생성 실패: "+error.message);return;}setShareToken(tk);}
    const url=window.location.origin+"/share/"+tk;
    try{await navigator.clipboard.writeText(url);setShareCopied(true);setTimeout(()=>setShareCopied(false),2000);}catch{prompt("링크를 복사하세요:",url);}
  };

  const updLesDetail=async(id,data)=>{
    const u={};if(data.top!==undefined)u.topic=data.top;if(data.content!==undefined)u.content=data.content;if(data.feedback!==undefined)u.feedback=data.feedback;if(data.tMemo!==undefined)u.private_memo=data.tMemo;if(data.planShared!==undefined)u.plan_shared=data.planShared;if(data.planPrivate!==undefined)u.plan_private=data.planPrivate;
    if(Object.keys(u).length)await supabase.from('lessons').update(u).eq('id',id);
    const les=lessons.find(l=>l.id===id);
    const oldHw=les?.homework||[],newHw=data.hw||[];
    const oldIds=new Set(oldHw.map(h=>h.id));
    const toDel=oldHw.filter(h=>!newHw.some(n=>n.id===h.id));
    const toIns=newHw.filter(h=>!oldIds.has(h.id));
    const toUpd=newHw.filter(h=>oldIds.has(h.id));
    if(toDel.length)await supabase.from('homework').delete().in('id',toDel.map(h=>h.id));
    let ins=[];
    if(toIns.length){const{data:d}=await supabase.from('homework').insert(toIns.map(h=>({lesson_id:id,title:h.title,completion_pct:h.completion_pct||0,note:h.note||""}))).select();ins=d||[];}
    for(const h of toUpd)await supabase.from('homework').update({title:h.title,completion_pct:h.completion_pct||0,note:h.note||""}).eq('id',h.id);
    const finalHw=[...toUpd,...ins];
    setLesDetailData(p=>p?{...p,...data,homework:finalHw}:p);
    setLessons(p=>p.map(l=>l.id===id?{...l,...u,homework:finalHw,files:data.files||l.files}:l));
  };

  if(loading)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.tt,fontSize:14}}>불러오는 중...</div></div>);

  return(
    <div style={{padding:28}}>
      <style>{".hcard{transition:all .12s;cursor:pointer;}.hcard:hover{background:"+C.sfh+"!important;}\n@media(max-width:768px){.sd-header{flex-direction:column!important;align-items:flex-start!important;}}"}</style>

      {/* Header */}
      <div className="sd-header" style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {tog}
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,display:"flex",padding:4}}><IcBack/></button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14,flex:1}}>
          <div style={{width:48,height:48,borderRadius:14,background:col.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:col.t}}>{(s.name||"?")[0]}</div>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:C.tp}}>{s.name}</div>
            <div style={{fontSize:13,color:C.ts}}>{s.subject} · {s.grade}{s.school?" · "+s.school:""}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={copyShareLink} style={{background:shareCopied?C.sb:C.as,color:shareCopied?C.su:C.ac,border:"1px solid "+(shareCopied?"#BBF7D0":C.al),borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s"}}>{shareCopied?"링크 복사됨":"공유 링크"}</button>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.ts,cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={isParent} onChange={e=>setIsParent(e.target.checked)}/>학부모 뷰</label>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{display:"flex",gap:4,marginBottom:4,borderBottom:"1px solid "+C.bd,paddingBottom:0}}>
        {mainTabs.map(m=>(<button key={m.id} onClick={()=>switchMain(m.id)} style={{padding:"10px 20px",border:"none",borderBottom:mainTab===m.id?"2px solid "+C.ac:"2px solid transparent",background:"none",fontSize:14,fontWeight:mainTab===m.id?600:400,color:mainTab===m.id?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>{m.l}</button>))}
      </div>
      {/* Sub tabs */}
      {curMain&&curMain.subs.length>1&&(<div style={{display:"flex",gap:4,marginBottom:20,paddingTop:8}}>
        {curMain.subs.map(sb=>(<button key={sb.id} onClick={()=>setSubTab(sb.id)} style={{padding:"6px 16px",borderRadius:8,border:"1px solid "+(subTab===sb.id?C.ac:C.bd),background:subTab===sb.id?C.as:"transparent",fontSize:12,fontWeight:subTab===sb.id?600:400,color:subTab===sb.id?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>{sb.l}</button>))}
      </div>)}

      <div style={{marginTop:curMain&&curMain.subs.length<=1?20:0}}>
        {subTab==="timeline"&&<TimelineTab lessons={lessons} col={col} student={s} isParent={isParent} onLessonClick={l=>setLesDetailData(l)}/>}
        {subTab==="calendar"&&<CalendarTab lessons={lessons} col={col} student={s} onLessonOpen={openLesson}/>}
        {subTab==="notes"&&<ReportTab reports={reports} isParent={isParent} onAdd={addRp} onDelete={delRp}/>}
        {subTab==="homework"&&<HomeworkTab lessons={lessons} col={col} isParent={isParent} onUpdateHw={updHw} onDeleteHw={delHw}/>}
        {subTab==="wrong"&&<WrongAnswerTab wrongs={wrongs} isParent={isParent} onAdd={addWrong} onDelete={delWrong} onUpdate={updWrong}/>}
        {subTab==="scores"&&<ScoresTab scores={scores} isParent={isParent} onAdd={addScore} onDelete={delScore} onEditSave={editSaveScore}/>}
        {subTab==="plan"&&<PlanTab student={s} isParent={isParent} planFields={{strategy:planStrategy,strength:planStrength,weakness:planWeakness,opportunity:planOpportunity,threat:planThreat}} planComments={planComments} onSavePlan={savePlanFields} onAddReport={addPlanReport} onUpdateComment={updatePlanComment} onDeleteReport={deletePlanReport}/>}
        {subTab==="files"&&<FilesTab allFiles={allFiles} standaloneFiles={standaloneFiles} isParent={isParent} onFileDrop={handleFileDrop} uploading={uploading} onDelete={delFile} onRename={renameFile}/>}
      </div>
      {lesDetailData&&<LessonDetailModal les={lesDetailData} student={s} onUpdate={updLesDetail} onClose={()=>setLesDetailData(null)}/>}
    </div>
  );
}
