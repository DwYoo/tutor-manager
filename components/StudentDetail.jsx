'use client';
import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import LessonDetailModal from './student/LessonDetailModal';
import { useToast } from '@/components/Toast';

const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
const REASON_COLORS=["#2563EB","#DC2626","#F59E0B","#16A34A","#8B5CF6","#EC4899","#06B6D4","#F97316"];
const p2=n=>String(n).padStart(2,"0");
const fd=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
const m2s=m=>`${p2(Math.floor(m/60))}:${p2(m%60)}`;
const bk=(e,val,set,df)=>{if(e.nativeEvent?.isComposing||e.isComposing)return;const ta=e.target,pos=ta.selectionStart;if(e.key==='*'){const ls=val.lastIndexOf('\n',pos-1)+1;if(val.substring(ls,pos).trim()===''){e.preventDefault();const nv=val.substring(0,ls)+'• '+val.substring(pos);set(nv);df?.();requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=ls+2;});}}if(e.key==='Enter'){const lines=val.substring(0,pos).split('\n'),cl=lines[lines.length-1];if(cl.startsWith('• ')){e.preventDefault();if(cl.trim()==='•'){const ls=pos-cl.length;const nv=val.substring(0,ls)+val.substring(pos);set(nv);df?.();requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=ls;});}else{const nv=val.substring(0,pos)+'\n• '+val.substring(pos);set(nv);df?.();requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=pos+3;});}}}};
const ls={display:"block",fontSize:12,fontWeight:500,color:C.tt,marginBottom:6};
const is={width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid "+C.bd,fontSize:14,color:C.tp,background:C.sf,outline:"none",fontFamily:"inherit"};
const IcBack=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>);
const CustomTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>{d.label||d.date}</div>{d.score!=null&&<div style={{fontSize:16,fontWeight:700,color:C.ac}}>{d.score}점</div>}{d.grade!=null&&<div style={{fontSize:d.score!=null?13:16,fontWeight:700,color:"#8B5CF6"}}>{d.grade}등급</div>}</div>);};
const ReasonTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"8px 12px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:11,color:C.tt,marginBottom:2}}>{d.name}</div><div style={{fontSize:14,fontWeight:700,color:d.fill||C.ac}}>{d.count}문항</div></div>);};

export default function StudentDetail({ student, onBack, menuBtn }) {
  const{user}=useAuth();
  const toast=useToast();
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
  const [lesDetailData,setLesDetailData]=useState(null);
  const [calMonth,setCalMonth]=useState(new Date());
  const [showNew,setShowNew]=useState(false);
  const [nT,setNT]=useState("");const [nB,setNB]=useState("");const [nS,setNS]=useState(false);
  const [wForm,setWForm]=useState({book:"",chapter:"",problem_num:"",reason:"",note:""});
  const [wFilter,setWFilter]=useState("");const [wPage,setWPage]=useState(0);const [wExpanded,setWExpanded]=useState({});
  const [hwFilter,setHwFilter]=useState(null);
  const PER_PAGE=20;
  const [showAddScore,setShowAddScore]=useState(false);
  const [scoreForm,setScoreForm]=useState({date:"",score:"",label:"",grade:""});
  const [scoreChartMode,setScoreChartMode]=useState("score");
  const [editScore,setEditScore]=useState(null);
  const [editScoreForm,setEditScoreForm]=useState({date:"",score:"",label:"",grade:""});
  useEffect(()=>{if(!editScore)return;const h=e=>{if(e.key==="Escape")setEditScore(null);};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[editScore]);
  const [reasonBook,setReasonBook]=useState("");
  const [chapterBook,setChapterBook]=useState("");
  const [planStrategy,setPlanStrategy]=useState("");
  const [planStrength,setPlanStrength]=useState("");
  const [planWeakness,setPlanWeakness]=useState("");
  const [planOpportunity,setPlanOpportunity]=useState("");
  const [planThreat,setPlanThreat]=useState("");
  const [planComments,setPlanComments]=useState([]);
  const [planSaving,setPlanSaving]=useState(false);
  const [scoreGoal,setScoreGoal]=useState(s.score_goal||"");
  const [planSaved,setPlanSaved]=useState(false);
  const [planEditing,setPlanEditing]=useState(false);
  const [editingComment,setEditingComment]=useState(null);
  const [editCommentText,setEditCommentText]=useState("");
  const [editCommentTitle,setEditCommentTitle]=useState("");
  const [editCommentShared,setEditCommentShared]=useState(false);
  const [showPlanReport,setShowPlanReport]=useState(false);
  const [planRpTitle,setPlanRpTitle]=useState("");
  const [planRpBody,setPlanRpBody]=useState("");
  const [planRpShared,setPlanRpShared]=useState(false);
  const [fileDrag,setFileDrag]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [standaloneFiles,setStandaloneFiles]=useState([]);
  const [shareToken,setShareToken]=useState(s.share_token||null);
  const [shareCopied,setShareCopied]=useState(false);

  // Tabs: 리포트를 수업 안 "기록" 서브탭으로, 계획 제거, 분석에서 리포트 제거
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
    if(a.error||b.error||c.error||d.error)toast?.('데이터를 불러오지 못했습니다','error');
    setLessons(a.data||[]);setScores(b.data||[]);setWrongs(c.data||[]);
    const allReps=d.data||[];
    setReports(allReps.filter(r=>r.type!=='plan'));
    setPlanComments(allReps.filter(r=>r.type==='plan'));
    // Load plan fields from student
    setPlanStrategy(s.plan_strategy||"");
    setPlanStrength(s.plan_strength||"");
    setPlanWeakness(s.plan_weakness||"");
    setPlanOpportunity(s.plan_opportunity||"");
    setPlanThreat(s.plan_threat||"");
    // Fetch standalone files (not linked to lessons)
    const{data:sf}=await supabase.from('files').select('*').eq('student_id',s.id).is('lesson_id',null).order('created_at',{ascending:false});
    setStandaloneFiles(sf||[]);
    setLoading(false);
  },[s.id]);
  useEffect(()=>{fetchAll();},[fetchAll]);

  const allFiles=lessons.flatMap(l=>(l.files||[]).map(f=>({...f,lesDate:l.date,lesTopic:l.topic||l.subject})));
  const wBooks=[...new Set(wrongs.map(w=>w.book).filter(Boolean))];
  const filteredW=(wFilter?wrongs.filter(w=>w.book===wFilter):wrongs).sort((a,b)=>{const ac=a.chapter||"",bc=b.chapter||"";if(ac!==bc)return ac.localeCompare(bc,undefined,{numeric:true});const an=parseInt(a.problem_num)||0,bn=parseInt(b.problem_num)||0;return an-bn;});
  const totalWPages=Math.max(1,Math.ceil(filteredW.length/PER_PAGE));
  const pagedW=filteredW.slice(wPage*PER_PAGE,(wPage+1)*PER_PAGE);

  // Reason & chapter stats (independent book filters)
  const reasonSource=reasonBook?wrongs.filter(w=>w.book===reasonBook):wrongs;
  const reasonMap={};
  reasonSource.forEach(w=>{const r=w.reason||"미분류";reasonMap[r]=(reasonMap[r]||0)+1;});
  const reasonData=Object.entries(reasonMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([reason,count],i)=>({name:reason,count,fill:REASON_COLORS[i%REASON_COLORS.length]}));
  const chapterBookSel=chapterBook||wBooks[0]||"";
  const chapterSource=chapterBookSel?wrongs.filter(w=>w.book===chapterBookSel):wrongs;
  const chapterMap={};
  chapterSource.forEach(w=>{const c=w.chapter||"미분류";chapterMap[c]=(chapterMap[c]||0)+1;});
  const chapterData=Object.entries(chapterMap).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).slice(0,8).map(([name,count],i)=>({name,count,fill:REASON_COLORS[i%REASON_COLORS.length]}));

  const _rmc={};wrongs.forEach(w=>{const r=w.reason||"미분류";_rmc[r]=(_rmc[r]||0)+1;});
  const reasonColorMap={};Object.entries(_rmc).sort((a,b)=>b[1]-a[1]).forEach(([r],i)=>{reasonColorMap[r]=REASON_COLORS[i%REASON_COLORS.length];});
  const _cmc={};wrongs.forEach(w=>{const c=w.chapter;if(c){_cmc[c]=(_cmc[c]||0)+1;}});
  const chapterColorMap={};Object.entries(_cmc).sort((a,b)=>b[1]-a[1]).forEach(([c],i)=>{chapterColorMap[c]=REASON_COLORS[i%REASON_COLORS.length];});

  const updHw=async(hwId,key,val)=>{await supabase.from('homework').update({[key]:val}).eq('id',hwId);setLessons(prev=>prev.map(l=>({...l,homework:(l.homework||[]).map(h=>h.id===hwId?{...h,[key]:val}:h)})));};
  const materialize=async(l,viewDate)=>{
    const{data,error}=await supabase.from('lessons').insert({student_id:l.student_id,date:viewDate,start_hour:l.start_hour,start_min:l.start_min,duration:l.duration,subject:l.subject,topic:"",is_recurring:false,recurring_day:null,user_id:user.id}).select('*, homework(*), files(*)').single();
    if(error||!data)return null;
    const prev=Array.isArray(l.recurring_exceptions)?l.recurring_exceptions:[];const exc=[...prev,viewDate];
    await supabase.from('lessons').update({recurring_exceptions:exc}).eq('id',l.id);
    setLessons(p=>[...p.map(x=>x.id===l.id?{...x,recurring_exceptions:exc}:x),data]);
    return data;
  };
  const openLesson=async(l,viewDate)=>{
    if(l.is_recurring&&l.date!==viewDate){const d=await materialize(l,viewDate);if(d)setLesDetailData(d);}
    else setLesDetailData(l);
  };
  const addWrong=async()=>{if(!wForm.problem_num.trim())return;const nums=wForm.problem_num.split(',').map(n=>n.trim()).filter(Boolean);if(!nums.length)return;const rows=nums.map(n=>({student_id:s.id,book:wForm.book,chapter:wForm.chapter,problem_num:n,reason:wForm.reason,note:wForm.note,user_id:user.id}));const{data,error}=await supabase.from('wrong_answers').insert(rows).select();if(error){toast?.('오답 추가에 실패했습니다','error');return;}if(data){setWrongs(p=>[...data,...p]);setWForm(f=>({...f,problem_num:"",reason:"",note:""}));setWPage(0);toast?.(`오답 ${data.length}건 추가됨`);}};
  const delWrong=async(id)=>{const{error}=await supabase.from('wrong_answers').delete().eq('id',id);if(error){toast?.('삭제에 실패했습니다','error');return;}setWrongs(p=>p.filter(w=>w.id!==id));};
  const wTimers=useRef({});
  const updWrong=(id,key,val)=>{setWrongs(p=>p.map(w=>w.id===id?{...w,[key]:val}:w));const tk=id+key;clearTimeout(wTimers.current[tk]);wTimers.current[tk]=setTimeout(async()=>{await supabase.from('wrong_answers').update({[key]:val}).eq('id',id);},500);};
  const addRp=async()=>{if(!nT.trim())return;const{data,error}=await supabase.from('reports').insert({student_id:s.id,title:nT,body:nB,is_shared:nS,date:fd(new Date()),user_id:user.id}).select().single();if(error){toast?.('레포트 저장에 실패했습니다','error');return;}if(data){setReports(p=>[data,...p]);setNT("");setNB("");setNS(false);setShowNew(false);toast?.('레포트가 등록되었습니다');}};
  const addScore=async()=>{if(!scoreForm.score&&!scoreForm.grade)return;const ins={student_id:s.id,date:scoreForm.date,label:scoreForm.label,user_id:user.id};if(scoreForm.score)ins.score=parseInt(scoreForm.score);if(scoreForm.grade)ins.grade=parseInt(scoreForm.grade);let{data,error}=await supabase.from('scores').insert(ins).select().single();if(error&&scoreForm.grade){const{grade,...insNoGrade}=ins;({data,error}=await supabase.from('scores').insert(insNoGrade).select().single());}if(error){toast?.('성적 추가에 실패했습니다','error');return;}if(data){if(scoreForm.grade&&!data.grade)data.grade=parseInt(scoreForm.grade);setScores(p=>[...p,data]);setScoreForm({date:"",score:"",label:"",grade:""});setShowAddScore(false);toast?.('성적이 추가되었습니다');}};
  const openEditScore=(sc)=>{setEditScore(sc);setEditScoreForm({date:sc.date||"",score:sc.score!=null?String(sc.score):"",label:sc.label||"",grade:sc.grade!=null?String(sc.grade):""});};
  const saveEditScore=async()=>{if(!editScore||(!editScoreForm.score&&!editScoreForm.grade))return;const upd={date:editScoreForm.date,label:editScoreForm.label,score:editScoreForm.score?parseInt(editScoreForm.score):null,grade:editScoreForm.grade?parseInt(editScoreForm.grade):null};let{error}=await supabase.from('scores').update(upd).eq('id',editScore.id);if(error&&upd.grade!==undefined){const{grade,...updNoGrade}=upd;({error}=await supabase.from('scores').update(updNoGrade).eq('id',editScore.id));}if(error){toast?.('성적 수정에 실패했습니다','error');return;}setScores(p=>p.map(x=>x.id===editScore.id?{...x,...upd}:x));setEditScore(null);toast?.('성적이 수정되었습니다');};
  const delScore=async(id)=>{await supabase.from('scores').delete().eq('id',id);setScores(p=>p.filter(x=>x.id!==id));setEditScore(null);};
  const saveScoreGoal=async(val)=>{const v=val===""?null:parseInt(val);setScoreGoal(val);await supabase.from('students').update({score_goal:v}).eq('id',s.id);};
  const savePlanFields=async()=>{
    setPlanSaving(true);setPlanSaved(false);
    try{
      const full={plan_strategy:planStrategy,plan_strength:planStrength,plan_weakness:planWeakness,plan_opportunity:planOpportunity,plan_threat:planThreat};
      const{error}=await supabase.from('students').update(full).eq('id',s.id);
      if(error){
        // Fallback: try without new columns
        const{error:e2}=await supabase.from('students').update({plan_strategy:planStrategy,plan_strength:planStrength,plan_weakness:planWeakness}).eq('id',s.id);
        if(e2){toast?.('계획 저장에 실패했습니다','error');setPlanSaving(false);return;}
      }
      setPlanEditing(false);toast?.('계획이 저장되었습니다');
    }catch(e){toast?.('계획 저장 중 오류가 발생했습니다','error');}
    setPlanSaving(false);
  };
  const addPlanReport=async()=>{
    if(!planRpTitle.trim()){toast?.('제목을 입력해주세요','error');return;}
    try{
      const row={student_id:s.id,title:planRpTitle,body:planRpBody,is_shared:planRpShared,type:"plan",date:fd(new Date()),user_id:user.id};
      const{data,error}=await supabase.from('reports').insert(row).select().single();
      if(error){toast?.('리포트 저장에 실패했습니다','error');return;}
      if(data){setPlanComments(p=>[data,...p]);setPlanRpTitle("");setPlanRpBody("");setPlanRpShared(false);setShowPlanReport(false);toast?.('리포트가 등록되었습니다');}
    }catch(e){toast?.('리포트 저장 중 오류가 발생했습니다','error');}
  };
  const updatePlanComment=async(id)=>{
    if(!editCommentTitle.trim()){toast?.('제목을 입력해주세요','error');return;}
    const{error}=await supabase.from('reports').update({title:editCommentTitle,body:editCommentText,is_shared:editCommentShared}).eq('id',id);
    if(error){toast?.('기록 수정에 실패했습니다','error');return;}
    setPlanComments(p=>p.map(c=>c.id===id?{...c,title:editCommentTitle,body:editCommentText,is_shared:editCommentShared}:c));setEditingComment(null);setEditCommentText("");setEditCommentTitle("");
  };
  const handleFileDrop=async(e)=>{e.preventDefault();setFileDrag(false);const files=e.dataTransfer?e.dataTransfer.files:e.target.files;if(!files||!files.length)return;setUploading(true);
    for(const file of files){
      const ext=file.name.split('.').pop().toLowerCase();
      const ftype=["pdf"].includes(ext)?"pdf":["jpg","jpeg","png","gif","webp"].includes(ext)?"img":"file";
      const path=`students/${s.id}/${Date.now()}_${file.name}`;
      const{error:upErr}=await supabase.storage.from('files').upload(path,file);
      if(upErr){toast?.(`${file.name} 업로드 실패`,'error');continue;}
      const{data:urlData}=supabase.storage.from('files').getPublicUrl(path);
      const{data,error}=await supabase.from('files').insert({student_id:s.id,file_name:file.name,file_type:ftype,file_url:urlData.publicUrl,user_id:user.id}).select().single();
      if(!error&&data)setStandaloneFiles(p=>[data,...p]);
    }
    setUploading(false);
  };
  const delFile=async(id)=>{const{error}=await supabase.from('files').delete().eq('id',id);if(error){toast?.('파일 삭제에 실패했습니다','error');return;}setStandaloneFiles(p=>p.filter(f=>f.id!==id));};
  const copyShareLink=async()=>{
    let tk=shareToken;
    if(!tk){tk=crypto.randomUUID();const{error}=await supabase.from('students').update({share_token:tk}).eq('id',s.id);if(error){toast?.('공유 링크 생성에 실패했습니다','error');return;}setShareToken(tk);}
    const url=window.location.origin+"/share/"+tk;
    try{await navigator.clipboard.writeText(url);setShareCopied(true);setTimeout(()=>setShareCopied(false),2000);}catch{prompt("링크를 복사하세요:",url);}
  };
  const updLesDetail=async(id,data)=>{
    const u={};if(data.top!==undefined)u.topic=data.top;if(data.content!==undefined)u.content=data.content;if(data.feedback!==undefined)u.feedback=data.feedback;if(data.tMemo!==undefined)u.private_memo=data.tMemo;if(data.planShared!==undefined)u.plan_shared=data.planShared;if(data.planPrivate!==undefined)u.plan_private=data.planPrivate;
    if(Object.keys(u).length){const{error}=await supabase.from('lessons').update(u).eq('id',id);if(error){toast?.('수업 정보 저장에 실패했습니다','error');return;}}
    // Sync homework to DB
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
    toast?.('수업 정보가 저장되었습니다');
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

        {/* TIMELINE */}
        {subTab==="timeline"&&(()=>{
          const now=new Date();
          const isLessonDone=(l)=>{const end=new Date(l.date+"T00:00:00");end.setHours(l.start_hour,l.start_min+l.duration,0,0);return now>=end;};
          const doneLessons=lessons.filter(l=>isLessonDone(l));
          const upcomingLessons=lessons.filter(l=>!isLessonDone(l));
          const nextOne=upcomingLessons.length?[upcomingLessons[upcomingLessons.length-1]]:[];
          const tlLessons=[...nextOne,...doneLessons];
          const doneCount=doneLessons.length;
          return(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp}}>수업 타임라인</h3>
            <span style={{fontSize:12,color:C.tt}}>총 {doneCount}회</span>
          </div>
          {tlLessons.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>수업 기록이 없습니다</div></div>):(
            <div style={{position:"relative",paddingLeft:28}}>
              <div style={{position:"absolute",left:7,top:16,bottom:16,width:2,background:C.bl}}/>
              {tlLessons.map((l,i)=>{
                const isDone=isLessonDone(l);
                const isFirstDone=isDone&&(i===0||!isLessonDone(tlLessons[i-1]));
                const hw=l.homework||[],hwDone=hw.filter(h=>(h.completion_pct||0)>=100).length,hwTotal=hw.length;
                const em=l.start_hour*60+l.start_min+l.duration;
                const hasSections=l.content||l.feedback||hwTotal>0||l.plan_shared;
                return(
                  <div key={l.id} style={{position:"relative",marginBottom:16}}>
                    <div style={{position:"absolute",left:-28+3,top:18,width:10,height:10,borderRadius:"50%",background:isFirstDone?col.b:!isDone?C.sf:C.bd,border:!isDone?"2px solid "+C.bd:"2px solid "+C.sf,zIndex:1}}/>
                    <div onClick={()=>setLesDetailData(l)} style={{background:!isDone?C.as:C.sf,border:"1px solid "+(!isDone?C.al:C.bd),borderRadius:14,overflow:"hidden",cursor:"pointer",borderLeft:"3px solid "+(!isDone?C.ac:col.b)}} className="hcard">
                      {/* Header */}
                      <div style={{padding:"16px 20px "+(hasSections?"12px":"16px")}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:C.tt,marginBottom:4}}>{l.date} {p2(l.start_hour)}:{p2(l.start_min)} ~ {m2s(em)} ({l.duration}분)</div>
                            <div style={{fontSize:16,fontWeight:700,color:C.tp}}>{l.topic||l.subject||"-"}</div>
                          </div>
                          <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                            {!isDone&&<span style={{background:C.ac,color:"#fff",padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600}}>예정</span>}
                            <span style={{background:col.bg,color:col.t,padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600}}>{l.subject||s.subject}</span>
                            {hwTotal>0&&<span style={{fontSize:10,background:hwDone===hwTotal?C.sb:C.wb,color:hwDone===hwTotal?C.su:C.wn,padding:"3px 8px",borderRadius:5,fontWeight:600}}>숙제 {hwDone}/{hwTotal}</span>}
                            {l.content&&<span style={{fontSize:10,background:C.sfh,color:C.ts,padding:"3px 8px",borderRadius:5}}>내용</span>}
                            {l.feedback&&<span style={{fontSize:10,background:C.as,color:C.ac,padding:"3px 8px",borderRadius:5}}>피드백</span>}
                          </div>
                        </div>
                      </div>
                      {/* Section previews */}
                      {hasSections&&(<div style={{padding:"0 20px 16px",display:"flex",flexDirection:"column",gap:8}}>
                        {l.content&&(<div style={{background:C.sfh,borderRadius:10,padding:"10px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.tt,marginBottom:4}}>수업 내용</div>
                          <div style={{fontSize:13,color:C.ts,lineHeight:1.5,whiteSpace:"pre-wrap",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{l.content}</div>
                        </div>)}
                        {l.feedback&&(<div style={{background:C.as,borderRadius:10,padding:"10px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.ac,marginBottom:4}}>피드백</div>
                          <div style={{fontSize:13,color:C.ts,lineHeight:1.5,whiteSpace:"pre-wrap",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{l.feedback}</div>
                        </div>)}
                        {hwTotal>0&&(<div style={{background:C.sfh,borderRadius:10,padding:"10px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.tt,marginBottom:6}}>숙제</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {hw.map(h=>{const pct=h.completion_pct||0;const done=pct>=100;return(
                              <span key={h.id} style={{fontSize:11,padding:"3px 10px",borderRadius:6,fontWeight:500,background:done?C.sb:pct>=50?C.wb:C.db,color:done?C.su:pct>=50?C.wn:C.dn}}>{h.title} {pct}%</span>
                            );})}
                          </div>
                        </div>)}
                        {l.plan_shared&&(<div style={{background:C.wb,borderRadius:10,padding:"10px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.wn,marginBottom:4}}>다음 수업 계획</div>
                          <div style={{fontSize:13,color:C.ts,lineHeight:1.5,whiteSpace:"pre-wrap",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{l.plan_shared}</div>
                        </div>)}
                      </div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>);})()}

        {/* CALENDAR */}
        {subTab==="calendar"&&(()=>{
          const cy=calMonth.getFullYear(),cm=calMonth.getMonth();
          const fst=new Date(cy,cm,1),lst=new Date(cy,cm+1,0);
          const sDow=(fst.getDay()+6)%7,dim=lst.getDate();
          const td=new Date();
          const cells=[];
          const pvL=new Date(cy,cm,0).getDate();
          for(let i=sDow-1;i>=0;i--)cells.push({d:pvL-i,cur:false});
          for(let d=1;d<=dim;d++)cells.push({d,cur:true});
          while(cells.length%7!==0||cells.length<42)cells.push({d:cells.length-sDow-dim+1,cur:false});
          const gLD=date=>{const ds=fd(date),dw=date.getDay()===0?7:date.getDay();return lessons.filter(l=>{if(l.is_recurring&&l.recurring_exceptions&&l.recurring_exceptions.includes(ds))return false;if(l.date===ds)return true;if(l.is_recurring&&l.recurring_day===dw){if(ds<l.date)return false;if(l.recurring_end_date&&ds>=l.recurring_end_date)return false;return true;}return false;});};
          const DK=["월","화","수","목","금","토","일"];
          // Count lessons this month
          let mTotal=0;for(let d=1;d<=dim;d++)mTotal+=gLD(new Date(cy,cm,d)).length;
          return(<div>
            <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:20}}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <button onClick={()=>setCalMonth(new Date(cy,cm-1,1))} style={{background:"none",border:"none",cursor:"pointer",color:C.ts,fontSize:16,padding:"4px 8px",borderRadius:6,display:"flex",alignItems:"center"}}><IcBack/></button>
                  <h3 style={{fontSize:16,fontWeight:700,color:C.tp,minWidth:110,textAlign:"center"}}>{cy}년 {cm+1}월</h3>
                  <button onClick={()=>setCalMonth(new Date(cy,cm+1,1))} style={{background:"none",border:"none",cursor:"pointer",color:C.ts,fontSize:16,padding:"4px 8px",borderRadius:6,display:"flex",alignItems:"center",transform:"rotate(180deg)"}}><IcBack/></button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:12,color:C.tt}}>이번 달 {mTotal}회 수업</span>
                  <button onClick={()=>setCalMonth(new Date())} style={{padding:"5px 14px",borderRadius:8,border:"1px solid "+C.bd,background:C.sf,fontSize:12,cursor:"pointer",color:C.ts,fontFamily:"inherit"}}>이번 달</button>
                </div>
              </div>
              {/* Day headers */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
                {DK.map((d,i)=><div key={d} style={{textAlign:"center",fontSize:12,fontWeight:500,color:i>=5?C.ac:C.tt,padding:"6px 0"}}>{d}</div>)}
              </div>
              {/* Grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
                {cells.map((c,i)=>{
                  const date=c.cur?new Date(cy,cm,c.d):null;
                  const isToday=c.cur&&td.getFullYear()===cy&&td.getMonth()===cm&&td.getDate()===c.d;
                  const dl=date?gLD(date):[];
                  const isSat=i%7===5,isSun=i%7===6;
                  return(
                    <div key={i} onClick={()=>{if(dl.length===1&&date)openLesson(dl[0],fd(date));}} style={{textAlign:"center",padding:"6px 2px",minHeight:52,borderRadius:8,background:isToday?C.as:"transparent",cursor:dl.length===1?"pointer":"default",opacity:c.cur?1:.3}}>
                      <div style={{fontSize:13,fontWeight:isToday?700:400,width:isToday?28:undefined,height:isToday?28:undefined,lineHeight:isToday?"28px":undefined,borderRadius:"50%",background:isToday?C.ac:"transparent",color:isToday?"#fff":isSun?"#DC2626":isSat?C.ac:C.tp,display:"inline-flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>{c.d}</div>
                      {dl.length>0&&(<div style={{display:"flex",gap:3,justifyContent:"center",marginTop:4}}>
                        {dl.slice(0,3).map((_,j)=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:col.b}}/>)}
                        {dl.length>3&&<span style={{fontSize:8,color:C.tt}}>+{dl.length-3}</span>}
                      </div>)}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Upcoming lessons list */}
            {(()=>{
              const upcoming=[];
              for(let d=1;d<=dim;d++){const dt=new Date(cy,cm,d);const dl=gLD(dt);dl.forEach(l=>upcoming.push({...l,_d:fd(dt)}));}
              if(!upcoming.length)return null;
              return(<div style={{marginTop:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tp,marginBottom:10}}>{cm+1}월 수업 목록</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {upcoming.map((l,i)=>{const isOrig=!l.is_recurring||l.date===l._d;return(
                    <div key={l.id+"-"+l._d+"-"+i} onClick={()=>openLesson(l,l._d)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.sf,border:"1px solid "+C.bd,borderRadius:10,cursor:"pointer",borderLeft:"3px solid "+col.b}} className="hcard">
                      <span style={{fontSize:12,color:C.tt,minWidth:70}}>{l._d}</span>
                      <span style={{fontSize:12,color:C.ts}}>{p2(l.start_hour)}:{p2(l.start_min)}</span>
                      <span style={{fontSize:13,fontWeight:600,color:C.tp,flex:1}}>{isOrig?(l.topic||l.subject||"-"):(l.subject||"-")}</span>
                      <span style={{fontSize:11,color:C.tt}}>{l.duration}분</span>
                      {isOrig&&(l.homework||[]).length>0&&<span style={{fontSize:10,background:C.wb,color:C.wn,padding:"2px 6px",borderRadius:4,fontWeight:600}}>숙제 {(l.homework||[]).length}</span>}
                    </div>
                  );})}
                </div>
              </div>);
            })()}
          </div>);
        })()}

        {/* NOTES (기록) - 리포트 타임라인 */}
        {subTab==="notes"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:8}}>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp}}>수업 기록</h3>
            {!isParent&&<button onClick={()=>setShowNew(!showNew)} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>+ 새 기록</button>}
          </div>
          {showNew&&!isParent&&(<div style={{background:C.sf,border:"2px solid "+C.ac,borderRadius:14,padding:20,marginBottom:16}}>
            <div style={{marginBottom:10}}><label style={ls}>제목</label><input value={nT} onChange={e=>setNT(e.target.value)} style={is} placeholder="예: 3월 2주차 학습 정리"/></div>
            <div style={{marginBottom:10}}><label style={ls}>내용</label><textarea value={nB} onChange={e=>setNB(e.target.value)} style={{...is,height:120,resize:"vertical"}} placeholder="수업 내용, 학생 상태, 다음 계획 등을 자유롭게 기록하세요..."/></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.ts,cursor:"pointer"}}><input type="checkbox" checked={nS} onChange={e=>setNS(e.target.checked)}/>학부모 공유</label>
              <div style={{display:"flex",gap:8}}><button onClick={()=>setShowNew(false)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>취소</button><button onClick={addRp} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button></div>
            </div>
          </div>)}
          {reports.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>기록이 없습니다</div><div style={{fontSize:12,marginTop:4,color:C.tt}}>수업 후 학생의 진행 상황을 기록해보세요</div></div>):(
            <div style={{position:"relative",paddingLeft:20}}>
              <div style={{position:"absolute",left:5,top:8,bottom:8,width:2,background:C.bl}}/>
              {reports.filter(r=>isParent?r.is_shared:true).map((r,i)=>(<div key={r.id} style={{position:"relative",marginBottom:16}}>
                <div style={{position:"absolute",left:-20+1,top:6,width:10,height:10,borderRadius:"50%",background:i===0?C.ac:C.bd}}/>
                <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18,borderLeft:i===0?"3px solid "+C.ac:"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><span style={{fontSize:14,fontWeight:600,color:C.tp}}>{r.title}</span>{r.is_shared?<span style={{background:C.as,color:C.ac,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:600}}>공유됨</span>:<span style={{background:C.sfh,color:C.tt,padding:"2px 8px",borderRadius:5,fontSize:10}}>비공개</span>}</div>
                    <span style={{fontSize:12,color:C.tt,flexShrink:0}}>{r.date}</span>
                  </div>
                  <div style={{fontSize:13,color:C.ts,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{r.body}</div>
                </div>
              </div>))}
            </div>
          )}
        </div>)}

        {/* HOMEWORK */}
        {subTab==="homework"&&(()=>{
          const aHw=lessons.flatMap(l=>(l.homework||[]).map(h=>({...h,_ld:l.date,_lt:l.topic||l.subject})));
          const tHw=aHw.length,dHw=aHw.filter(h=>(h.completion_pct||0)>=100).length;
          const pHw=aHw.filter(h=>{const p=h.completion_pct||0;return p>0&&p<100;}).length;
          const nHw=aHw.filter(h=>(h.completion_pct||0)===0).length;
          return(<div>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp,marginBottom:16}}>숙제 현황</h3>
            {/* Summary stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
              <div onClick={()=>setHwFilter(null)} style={{background:hwFilter===null?C.sfh:C.sf,border:hwFilter===null?"2px solid "+C.tp:"1px solid "+C.bd,borderRadius:12,padding:"14px 16px",textAlign:"center",cursor:"pointer",opacity:hwFilter===null?1:.5,transition:"all .15s"}}>
                <div style={{fontSize:22,fontWeight:700,color:C.tp}}>{tHw}</div>
                <div style={{fontSize:11,color:C.tt,marginTop:2}}>전체</div>
              </div>
              <div onClick={()=>setHwFilter(hwFilter==="done"?null:"done")} style={{background:C.sb,border:hwFilter==="done"?"2px solid "+C.su:"1px solid #BBF7D0",borderRadius:12,padding:"14px 16px",textAlign:"center",cursor:"pointer",opacity:hwFilter&&hwFilter!=="done"?.5:1,transition:"all .15s"}}>
                <div style={{fontSize:22,fontWeight:700,color:C.su}}>{dHw}</div>
                <div style={{fontSize:11,color:C.su,marginTop:2}}>완료</div>
              </div>
              <div onClick={()=>setHwFilter(hwFilter==="progress"?null:"progress")} style={{background:C.wb,border:hwFilter==="progress"?"2px solid "+C.wn:"1px solid #FDE68A",borderRadius:12,padding:"14px 16px",textAlign:"center",cursor:"pointer",opacity:hwFilter&&hwFilter!=="progress"?.5:1,transition:"all .15s"}}>
                <div style={{fontSize:22,fontWeight:700,color:C.wn}}>{pHw}</div>
                <div style={{fontSize:11,color:C.wn,marginTop:2}}>진행중</div>
              </div>
              <div onClick={()=>setHwFilter(hwFilter==="notStarted"?null:"notStarted")} style={{background:C.db,border:hwFilter==="notStarted"?"2px solid "+C.dn:"1px solid #FECACA",borderRadius:12,padding:"14px 16px",textAlign:"center",cursor:"pointer",opacity:hwFilter&&hwFilter!=="notStarted"?.5:1,transition:"all .15s"}}>
                <div style={{fontSize:22,fontWeight:700,color:C.dn}}>{nHw}</div>
                <div style={{fontSize:11,color:C.dn,marginTop:2}}>미시작</div>
              </div>
            </div>
            {/* Grouped by lesson */}
            {lessons.filter(l=>(l.homework||[]).length>0).length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>숙제가 없습니다</div></div>):(
              lessons.filter(l=>{const hw=l.homework||[];if(hw.length===0)return false;if(!hwFilter)return true;return hw.some(h=>{const p=h.completion_pct||0;if(hwFilter==="done")return p>=100;if(hwFilter==="progress")return p>0&&p<100;return p===0;});}).map(l=>{
                const lhwAll=l.homework||[],lhw=hwFilter?lhwAll.filter(h=>{const p=h.completion_pct||0;if(hwFilter==="done")return p>=100;if(hwFilter==="progress")return p>0&&p<100;return p===0;}):lhwAll,lDone=lhwAll.filter(h=>(h.completion_pct||0)>=100).length;
                return(<div key={l.id} style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:col.b}}/>
                      <span style={{fontSize:13,fontWeight:600,color:C.tp}}>{l.date}</span>
                      <span style={{fontSize:12,color:C.ts}}>{l.topic||l.subject}</span>
                    </div>
                    <span style={{fontSize:11,color:lDone===lhwAll.length?C.su:C.tt,fontWeight:500}}>{lDone}/{lhwAll.length} 완료</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {lhw.map(h=>{
                      const pct=h.completion_pct||0;
                      const pc=pct>=100?C.su:pct>30?C.wn:pct>0?"#EA580C":C.dn;
                      const pb=pct>=100?C.sb:pct>30?C.wb:pct>0?"#FFF7ED":C.db;
                      const sl=pct>=100?"완료":pct>0?"진행중":"미시작";
                      const barDrag=e=>{if(isParent)return;e.preventDefault();const bar=e.currentTarget;const calc=ev=>{const r=bar.getBoundingClientRect();const v=Math.max(0,Math.min(100,Math.round((ev.clientX-r.left)/r.width*10)*10));updHw(h.id,"completion_pct",v);};calc(e);const mv=ev=>calc(ev);const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);};
                      return(
                        <div key={h.id} style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:12,padding:"14px 18px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <input value={h.title||""} onChange={e=>updHw(h.id,"title",e.target.value)} style={{fontSize:14,fontWeight:600,color:C.tp,border:"none",outline:"none",background:"transparent",padding:0,fontFamily:"inherit",minWidth:0,flex:1}} placeholder="숙제" disabled={isParent}/>
                            <span style={{fontSize:10,background:pb,color:pc,padding:"2px 8px",borderRadius:5,fontWeight:600}}>{sl}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div onMouseDown={barDrag} style={{flex:1,height:10,background:C.bl,borderRadius:5,cursor:isParent?"default":"pointer",position:"relative"}}>
                              <div style={{height:"100%",width:pct+"%",minWidth:pct>0?12:0,background:pc,borderRadius:5,transition:"width .15s",pointerEvents:"none"}}/>
                              <div style={{position:"absolute",top:"50%",left:pct+"%",transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",background:"#fff",border:"3px solid "+pc,boxShadow:"0 1px 4px rgba(0,0,0,.15)",pointerEvents:"none",transition:"left .15s"}}/>
                            </div>
                            <span style={{fontSize:13,fontWeight:700,color:pc,minWidth:36,textAlign:"right"}}>{pct}%</span>
                          </div>
                          {h.note&&<div style={{fontSize:12,color:C.ts,marginTop:8,paddingTop:8,borderTop:"1px solid "+C.bl}}>{h.note}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>);
              })
            )}
          </div>);
        })()}

        {/* WRONG ANSWERS */}
        {subTab==="wrong"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp}}>오답 관리</h3>
            <span style={{background:C.db,color:C.dn,padding:"3px 12px",borderRadius:6,fontSize:12,fontWeight:600}}>총 {wrongs.length}문항</span>
          </div>

          {/* Stats charts */}
          {wrongs.length>0&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:12,padding:"14px 12px"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tp,marginBottom:6}}>오답 사유별</div>
                <div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>
                  <button onClick={()=>setReasonBook("")} style={{padding:"2px 8px",borderRadius:5,border:"1px solid "+(!reasonBook?C.ac:C.bd),background:!reasonBook?C.as:"transparent",fontSize:9,fontWeight:!reasonBook?600:400,color:!reasonBook?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>전체</button>
                  {wBooks.map(b=>(<button key={b} onClick={()=>setReasonBook(reasonBook===b?"":b)} style={{padding:"2px 8px",borderRadius:5,border:"1px solid "+(reasonBook===b?C.ac:C.bd),background:reasonBook===b?C.as:"transparent",fontSize:9,fontWeight:reasonBook===b?600:400,color:reasonBook===b?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>{b}</button>))}
                </div>
                {reasonData.length>0?(<ResponsiveContainer width="100%" height={120}>
                  <BarChart data={reasonData} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <XAxis dataKey="name" tick={{fontSize:9,fill:C.tt}} axisLine={false} tickLine={false} interval={0}/>
                    <YAxis tick={{fontSize:9,fill:C.tt}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip content={<ReasonTooltip/>}/>
                    <Bar dataKey="count" radius={[4,4,0,0]} barSize={14}>
                      {reasonData.map((d,i)=>(<Cell key={i} fill={d.fill}/>))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>):(<div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",color:C.tt,fontSize:11}}>데이터 없음</div>)}
              </div>
              <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:12,padding:"14px 12px"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tp,marginBottom:6}}>단원별 오답</div>
                <div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>
                  {wBooks.map(b=>(<button key={b} onClick={()=>setChapterBook(b)} style={{padding:"2px 8px",borderRadius:5,border:"1px solid "+(chapterBookSel===b?C.ac:C.bd),background:chapterBookSel===b?C.as:"transparent",fontSize:9,fontWeight:chapterBookSel===b?600:400,color:chapterBookSel===b?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>{b}</button>))}
                </div>
                {chapterData.length>0?(<ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chapterData} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <XAxis dataKey="name" tick={{fontSize:9,fill:C.tt}} axisLine={false} tickLine={false} interval={0}/>
                    <YAxis tick={{fontSize:9,fill:C.tt}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip content={<ReasonTooltip/>}/>
                    <Bar dataKey="count" radius={[4,4,0,0]} barSize={14}>
                      {chapterData.map((d,i)=>(<Cell key={i} fill={d.fill}/>))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>):(<div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",color:C.tt,fontSize:11}}>데이터 없음</div>)}
              </div>
          </div>)}

          {/* Add wrong */}
          {!isParent&&(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div style={{flex:"1 1 100px"}}><label style={ls}>교재</label><input value={wForm.book} onChange={e=>setWForm(p=>({...p,book:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px"}} placeholder="교재명"/></div>
              <div style={{flex:"1 1 80px"}}><label style={ls}>단원</label><input value={wForm.chapter} onChange={e=>setWForm(p=>({...p,chapter:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px"}} placeholder="단원"/></div>
              <div style={{flex:"0 0 60px"}}><label style={ls}>번호</label><input value={wForm.problem_num} onChange={e=>setWForm(p=>({...p,problem_num:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px"}} placeholder="#"/></div>
              <div style={{flex:"1 1 100px"}}><label style={ls}>오답 사유</label><input value={wForm.reason} onChange={e=>setWForm(p=>({...p,reason:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px"}} placeholder="오답 사유"/></div>
              <div style={{flex:"1 1 100px"}}><label style={ls}>메모</label><input value={wForm.note} onChange={e=>setWForm(p=>({...p,note:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px"}} placeholder="메모"/></div>
              <button onClick={addWrong} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0,alignSelf:"flex-end"}}>추가</button>
            </div>
          </div>)}

          {/* Filter by book */}
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            <button onClick={()=>{setWFilter("");setWPage(0);}} style={{background:!wFilter?C.as:C.sfh,border:"1px solid "+(!wFilter?C.ac:C.bd),borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:!wFilter?600:400,color:!wFilter?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>전체 ({wrongs.length})</button>
            {wBooks.map(b=>{const cnt=wrongs.filter(w=>w.book===b).length;return(<button key={b} onClick={()=>{setWFilter(wFilter===b?"":b);setWPage(0);}} style={{background:wFilter===b?C.as:C.sfh,border:"1px solid "+(wFilter===b?C.ac:C.bd),borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:wFilter===b?600:400,color:wFilter===b?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>{b} ({cnt})</button>);})}
          </div>

          {/* Wrong answers list */}
          {wrongs.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>오답 기록이 없습니다</div></div>):
          !wFilter?([...wBooks,...(wrongs.some(w=>!w.book)?[""]:[] )].map(book=>{const bk=book||"__no_book__";const items=[...wrongs.filter(w=>book?w.book===book:!w.book)].sort((a,b)=>{const ac=a.chapter||"",bc=b.chapter||"";if(ac!==bc)return ac.localeCompare(bc,undefined,{numeric:true});const an=parseInt(a.problem_num)||0,bn=parseInt(b.problem_num)||0;return an-bn;});const exp=wExpanded[bk]!==false;return(
            <div key={bk} style={{marginBottom:12}}>
              <div onClick={()=>setWExpanded(p=>({...p,[bk]:!exp}))} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.sfh,borderRadius:10,cursor:"pointer",marginBottom:exp?8:0}}>
                <span style={{fontSize:13,fontWeight:600,color:book?C.tp:C.tt}}>{book||"교재명 미지정"} <span style={{fontWeight:400,color:C.tt}}>({items.length})</span></span>
                <span style={{fontSize:12,color:C.tt}}>{exp?"▲":"▼"}</span>
              </div>
              {exp&&(()=>{const uCh=[];const seen=new Set();items.forEach(w=>{const ch=w.chapter||"";if(!seen.has(ch)){seen.add(ch);uCh.push(ch);}});return <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr>{["번호","사유","메모",""].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:"left",color:C.tt,fontWeight:500,borderBottom:"1px solid "+C.bd}}>{h}</th>))}</tr></thead>
                <tbody>{uCh.map(ch=>{const ck=bk+"::"+(ch||"__no_ch__");const chExp=wExpanded[ck]!==false;const chItems=items.filter(w=>(w.chapter||"")===ch);const cc=chapterColorMap[ch]||null;return(<Fragment key={ck}>
                  <tr onClick={()=>setWExpanded(p=>({...p,[ck]:!chExp}))} style={{cursor:"pointer"}}>
                    <td colSpan={4} style={{padding:"7px 8px",background:C.sf,borderBottom:"1px solid "+C.bd}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {cc&&<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:cc,flexShrink:0}}/>}
                        <span style={{fontSize:12,fontWeight:500,color:ch?C.ts:C.tt}}>{ch||"단원 미지정"}</span>
                        <span style={{fontSize:10,color:C.tt}}>({chItems.length})</span>
                        <span style={{fontSize:10,color:C.tt,marginLeft:"auto"}}>{chExp?"▲":"▼"}</span>
                      </div>
                    </td>
                  </tr>
                  {chExp&&chItems.map(w=>{const rc=reasonColorMap[w.reason||"미분류"]||"#888";return(<tr key={w.id} style={{borderBottom:"1px solid "+C.bl}}>
                  <td style={{padding:"6px 4px"}}>{isParent?<span style={{fontWeight:600,color:C.tp,fontSize:12,padding:"0 6px"}}>{w.problem_num}</span>:<input value={w.problem_num||""} onChange={e=>updWrong(w.id,"problem_num",e.target.value)} style={{border:"none",outline:"none",background:"transparent",fontWeight:600,color:C.tp,fontSize:12,fontFamily:"inherit",width:60,padding:"2px 6px"}}/>}</td>
                  <td style={{padding:"6px 4px"}}>{isParent?<span style={{background:rc+"20",color:rc,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:600}}>{w.reason||"-"}</span>:<input value={w.reason||""} onChange={e=>updWrong(w.id,"reason",e.target.value)} style={{border:"none",outline:"none",background:rc+"20",color:rc,fontSize:11,fontWeight:600,fontFamily:"inherit",borderRadius:5,padding:"2px 8px",width:"100%"}} placeholder="사유"/>}</td>
                  <td style={{padding:"6px 4px"}}>{isParent?<span style={{color:C.ts,fontSize:12,padding:"0 6px"}}>{w.note||"-"}</span>:<input value={w.note||""} onChange={e=>updWrong(w.id,"note",e.target.value)} style={{border:"none",outline:"none",background:"transparent",color:C.ts,fontSize:12,fontFamily:"inherit",width:"100%",padding:"2px 6px"}} placeholder="메모"/>}</td>
                  <td style={{padding:"6px 4px"}}>{!isParent&&<button onClick={()=>delWrong(w.id)} style={{background:"none",border:"none",color:C.tt,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>삭제</button>}</td>
                </tr>);})}
                </Fragment>);})}</tbody>
              </table>;})()}
            </div>);})):(
            <div>
              {(()=>{const fItems=filteredW;const uCh=[];const seen=new Set();fItems.forEach(w=>{const ch=w.chapter||"";if(!seen.has(ch)){seen.add(ch);uCh.push(ch);}});const fk=wFilter||"__filtered__";return fItems.length===0?<div style={{textAlign:"center",padding:24,color:C.tt,fontSize:13}}>오답 기록이 없습니다</div>:<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr>{["번호","사유","메모",""].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:"left",color:C.tt,fontWeight:500,borderBottom:"1px solid "+C.bd}}>{h}</th>))}</tr></thead>
                <tbody>{uCh.map(ch=>{const ck=fk+"::"+(ch||"__no_ch__");const chExp=wExpanded[ck]!==false;const chItems=fItems.filter(w=>(w.chapter||"")===ch);const cc=chapterColorMap[ch]||null;return(<Fragment key={ck}>
                  <tr onClick={()=>setWExpanded(p=>({...p,[ck]:!chExp}))} style={{cursor:"pointer"}}>
                    <td colSpan={4} style={{padding:"7px 8px",background:C.sf,borderBottom:"1px solid "+C.bd}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {cc&&<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:cc,flexShrink:0}}/>}
                        <span style={{fontSize:12,fontWeight:500,color:ch?C.ts:C.tt}}>{ch||"단원 미지정"}</span>
                        <span style={{fontSize:10,color:C.tt}}>({chItems.length})</span>
                        <span style={{fontSize:10,color:C.tt,marginLeft:"auto"}}>{chExp?"▲":"▼"}</span>
                      </div>
                    </td>
                  </tr>
                  {chExp&&chItems.map(w=>{const rc=reasonColorMap[w.reason||"미분류"]||"#888";return(<tr key={w.id} style={{borderBottom:"1px solid "+C.bl}}>
                  <td style={{padding:"6px 4px"}}>{isParent?<span style={{fontWeight:600,color:C.tp,fontSize:12,padding:"0 6px"}}>{w.problem_num}</span>:<input value={w.problem_num||""} onChange={e=>updWrong(w.id,"problem_num",e.target.value)} style={{border:"none",outline:"none",background:"transparent",fontWeight:600,color:C.tp,fontSize:12,fontFamily:"inherit",width:60,padding:"2px 6px"}}/>}</td>
                  <td style={{padding:"6px 4px"}}>{isParent?<span style={{background:rc+"20",color:rc,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:600}}>{w.reason||"-"}</span>:<input value={w.reason||""} onChange={e=>updWrong(w.id,"reason",e.target.value)} style={{border:"none",outline:"none",background:rc+"20",color:rc,fontSize:11,fontWeight:600,fontFamily:"inherit",borderRadius:5,padding:"2px 8px",width:"100%"}} placeholder="사유"/>}</td>
                  <td style={{padding:"6px 4px"}}>{isParent?<span style={{color:C.ts,fontSize:12,padding:"0 6px"}}>{w.note||"-"}</span>:<input value={w.note||""} onChange={e=>updWrong(w.id,"note",e.target.value)} style={{border:"none",outline:"none",background:"transparent",color:C.ts,fontSize:12,fontFamily:"inherit",width:"100%",padding:"2px 6px"}} placeholder="메모"/>}</td>
                  <td style={{padding:"6px 4px"}}>{!isParent&&<button onClick={()=>delWrong(w.id)} style={{background:"none",border:"none",color:C.tt,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>삭제</button>}</td>
                </tr>);})}
                </Fragment>);})}</tbody>
              </table>;})()}
            </div>
          )}
        </div>)}

        {/* SCORES */}
        {subTab==="scores"&&(()=>{
          const sorted=[...scores].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
          const chartData=sorted.filter(x=>x.score!=null).map(sc=>{const d=sc.date?new Date(sc.date):null;return{...sc,monthLabel:d?`${d.getMonth()+1}월`:sc.label};});
          // Score stats
          const scoreEntries=sorted.filter(x=>x.score!=null);
          const recent=scoreEntries.length?scoreEntries[scoreEntries.length-1].score:0;
          const maxSc=scoreEntries.length?Math.max(...scoreEntries.map(x=>x.score)):0;
          const oneYearAgo=new Date();oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);
          const yearScores=scoreEntries.filter(sc=>sc.date&&new Date(sc.date)>=oneYearAgo);
          const avgSc=yearScores.length?Math.round(yearScores.reduce((a,x)=>a+x.score,0)/yearScores.length):0;
          const trendDiff=scoreEntries.length>=2?scoreEntries[scoreEntries.length-1].score-scoreEntries[0].score:0;
          const trendMonths=scoreEntries.length>=2?(()=>{const f=new Date(scoreEntries[0].date),l=new Date(scoreEntries[scoreEntries.length-1].date);return Math.max(1,Math.round((l-f)/(1000*60*60*24*30)));})():0;
          const minY=scoreEntries.length?Math.max(0,Math.floor((Math.min(...scoreEntries.map(x=>x.score))-10)/10)*10):0;
          const goalNum=scoreGoal!==""?parseInt(scoreGoal):null;
          // Grade stats
          const gradeEntries=sorted.filter(x=>x.grade!=null);
          const gradeChartData=gradeEntries.map(sc=>{const d=sc.date?new Date(sc.date):null;return{...sc,monthLabel:d?`${d.getMonth()+1}월`:sc.label};});
          const recentGrade=gradeEntries.length?gradeEntries[gradeEntries.length-1].grade:null;
          const bestGrade=gradeEntries.length?Math.min(...gradeEntries.map(x=>x.grade)):null;
          const avgGrade=gradeEntries.length?(gradeEntries.reduce((a,x)=>a+x.grade,0)/gradeEntries.length).toFixed(1):null;
          const gradeTrendDiff=gradeEntries.length>=2?gradeEntries[gradeEntries.length-1].grade-gradeEntries[0].grade:0;
          const gradeColor=g=>g<=2?"#16A34A":g<=4?"#2563EB":g<=6?"#F59E0B":"#DC2626";
          const hasGrades=gradeEntries.length>0;
          const isGradeMode=scoreChartMode==="grade";
          return(<div>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <h3 style={{fontSize:16,fontWeight:700,color:C.tp,margin:0}}>성적 추이</h3>
              {!isGradeMode&&scoreEntries.length>=2&&<span style={{fontSize:11,fontWeight:600,color:trendDiff>=0?C.su:C.dn,background:trendDiff>=0?C.sb:C.db,padding:"3px 10px",borderRadius:6}}>{trendDiff>=0?"+":""}{trendDiff}점 ({trendMonths}개월)</span>}
              {isGradeMode&&gradeEntries.length>=2&&<span style={{fontSize:11,fontWeight:600,color:gradeTrendDiff<=0?C.su:C.dn,background:gradeTrendDiff<=0?C.sb:C.db,padding:"3px 10px",borderRadius:6}}>{gradeTrendDiff>0?"+":""}{gradeTrendDiff}등급</span>}
            </div>
            {!isParent&&<button onClick={()=>setShowAddScore(!showAddScore)} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ 성적 추가</button>}
          </div>
          {/* Add form */}
          {showAddScore&&!isParent&&(<div style={{background:C.sf,border:"2px solid "+C.ac,borderRadius:14,padding:16,marginBottom:16,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div><label style={ls}>날짜</label><input type="date" value={scoreForm.date} onChange={e=>setScoreForm(p=>({...p,date:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px",width:140}}/></div>
            <div><label style={ls}>시험명</label><input value={scoreForm.label} onChange={e=>setScoreForm(p=>({...p,label:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px",width:140}} placeholder="예: 3월 모의고사"/></div>
            <div><label style={ls}>점수</label><input type="number" value={scoreForm.score} onChange={e=>setScoreForm(p=>({...p,score:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px",width:80}} placeholder="100" min="0" max="100"/></div>
            <div><label style={ls}>등급</label><input type="number" value={scoreForm.grade} onChange={e=>setScoreForm(p=>({...p,grade:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px",width:60}} placeholder="1~9" min="1" max="9"/></div>
            <button onClick={addScore} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
          </div>)}
          {scores.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>성적 데이터가 없습니다</div></div>):(<>
            {/* Chart mode tabs */}
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              <button onClick={()=>setScoreChartMode("score")} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(!isGradeMode?C.ac:C.bd),background:!isGradeMode?C.as:"transparent",fontSize:11,fontWeight:!isGradeMode?600:400,color:!isGradeMode?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>점수</button>
              <button onClick={()=>setScoreChartMode("grade")} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(isGradeMode?"#8B5CF6":C.bd),background:isGradeMode?"#EDE9FE":"transparent",fontSize:11,fontWeight:isGradeMode?600:400,color:isGradeMode?"#8B5CF6":C.ts,cursor:"pointer",fontFamily:"inherit"}}>등급</button>
            </div>
            {/* Summary cards */}
            {!isGradeMode?(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              <div style={{background:"#EFF6FF",borderRadius:12,padding:"16px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>최근 점수</div>
                <div style={{fontSize:22,fontWeight:700,color:C.ac}}>{recent}점</div>
              </div>
              <div style={{background:"#F0FDF4",borderRadius:12,padding:"16px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>최고 점수</div>
                <div style={{fontSize:22,fontWeight:700,color:C.su}}>{maxSc}점</div>
              </div>
              <div style={{background:"#F5F5F4",borderRadius:12,padding:"16px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>평균 점수 <span style={{fontSize:10,color:C.tt}}>(1년)</span></div>
                <div style={{fontSize:22,fontWeight:700,color:C.ts}}>{avgSc}점</div>
              </div>
            </div>):(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              <div style={{background:"#EDE9FE",borderRadius:12,padding:"16px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>최근 등급</div>
                <div style={{fontSize:22,fontWeight:700,color:"#8B5CF6"}}>{recentGrade!=null?recentGrade+"등급":"-"}</div>
              </div>
              <div style={{background:"#F0FDF4",borderRadius:12,padding:"16px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>최고 등급</div>
                <div style={{fontSize:22,fontWeight:700,color:C.su}}>{bestGrade!=null?bestGrade+"등급":"-"}</div>
              </div>
              <div style={{background:"#F5F5F4",borderRadius:12,padding:"16px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.tt,marginBottom:4}}>평균 등급</div>
                <div style={{fontSize:22,fontWeight:700,color:C.ts}}>{avgGrade!=null?avgGrade+"등급":"-"}</div>
              </div>
            </div>)}
            {/* Chart */}
            <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:20,marginBottom:16}}>
              {!isGradeMode?(<>
                {!isParent&&<div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,marginBottom:12}}>
                  <span style={{fontSize:11,color:C.tt}}>목표</span>
                  <input type="number" value={scoreGoal} onChange={e=>saveScoreGoal(e.target.value)} style={{width:52,padding:"4px 8px",borderRadius:6,border:"1px solid "+C.bd,fontSize:12,color:C.tp,textAlign:"center",outline:"none",background:C.sf,fontFamily:"inherit"}} placeholder="—"/>
                  <span style={{fontSize:11,color:C.tt}}>점</span>
                </div>}
                {isParent&&goalNum&&<div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,marginBottom:12}}>
                  <span style={{fontSize:11,color:C.wn}}>목표 {goalNum}점</span>
                </div>}
                {chartData.length>0?<ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{top:10,right:10,left:-10,bottom:0}}>
                    <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.ac} stopOpacity={0.15}/><stop offset="95%" stopColor={C.ac} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bl} vertical={false}/>
                    <XAxis dataKey="monthLabel" tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[minY,100]} tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    {goalNum&&<ReferenceLine y={goalNum} stroke={C.wn} strokeDasharray="6 4" strokeWidth={1.5} label={{value:`목표 ${goalNum}`,position:"insideTopRight",fontSize:10,fill:C.wn,fontWeight:600}}/>}
                    <Area type="monotone" dataKey="score" stroke={C.ac} fill="url(#scoreGrad)" strokeWidth={2.5} dot={{r:5,fill:C.ac,stroke:"#fff",strokeWidth:2}}/>
                  </AreaChart>
                </ResponsiveContainer>:<div style={{textAlign:"center",padding:30,color:C.tt,fontSize:13}}>점수 데이터가 없습니다</div>}
              </>):(<>
                {gradeChartData.length>0?<ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={gradeChartData} margin={{top:10,right:10,left:-10,bottom:0}}>
                    <defs><linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bl} vertical={false}/>
                    <XAxis dataKey="monthLabel" tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[1,9]} reversed tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false} tickFormatter={v=>v+"등급"}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="grade" stroke="#8B5CF6" fill="url(#gradeGrad)" strokeWidth={2.5} dot={{r:5,fill:"#8B5CF6",stroke:"#fff",strokeWidth:2}}/>
                  </AreaChart>
                </ResponsiveContainer>:<div style={{textAlign:"center",padding:30,color:C.tt,fontSize:13}}>등급 데이터가 없습니다</div>}
              </>)}
            </div>
            {/* Test records */}
            <div>
              <h4 style={{fontSize:14,fontWeight:600,color:C.tp,marginBottom:12}}>시험 기록</h4>
              {[...sorted].reverse().map((sc,i)=>{
                const d=sc.date?new Date(sc.date):null;
                const mLabel=d?`${d.getMonth()+1}월`:"";
                const scoreBarColor=sc.score!=null?(sc.score>=85?C.su:sc.score>=70?C.wn:C.dn):C.tt;
                const grBarColor=sc.grade!=null?gradeColor(sc.grade):C.tt;
                return(<div key={sc.id} style={{display:"flex",alignItems:"center",padding:"10px 4px",cursor:isParent?undefined:"pointer",borderRadius:8,transition:"background .15s"}} onClick={()=>{if(!isParent)openEditScore(sc);}} onMouseEnter={e=>{if(!isParent)e.currentTarget.style.background=C.sfh;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                  <div style={{minWidth:80,flexShrink:0}}>
                    {i===0&&<div style={{fontSize:10,fontWeight:600,color:C.ac,marginBottom:2}}>최근</div>}
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                      <span style={{fontSize:14,fontWeight:700,color:C.tp}}>{sc.label||`${sorted.length-i}차`}</span>
                      <span style={{fontSize:12,color:C.tt}}>{mLabel}</span>
                    </div>
                  </div>
                  <div style={{flex:1}}/>
                  {sc.score!=null&&<><div style={{width:120,height:4,background:C.bl,borderRadius:2,overflow:"hidden",flexShrink:0,marginRight:8}}>
                    <div style={{height:"100%",width:`${sc.score}%`,background:scoreBarColor,borderRadius:2}}/>
                  </div>
                  <div style={{minWidth:36,textAlign:"right",fontSize:16,fontWeight:700,color:scoreBarColor}}>{sc.score}</div></>}
                  {sc.grade!=null&&<div style={{minWidth:44,textAlign:"right",fontSize:14,fontWeight:700,color:grBarColor,marginLeft:sc.score!=null?8:0}}>{sc.grade}등급</div>}
                </div>);
              })}
            </div>
          </>)}
          {/* Edit Score Modal */}
          {editScore&&!isParent&&(<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.35)"}} onClick={()=>setEditScore(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:C.sf,borderRadius:16,width:"100%",maxWidth:380,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:C.tp}}>성적 수정</h2><button onClick={()=>setEditScore(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.tt,fontSize:18}}>✕</button></div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><label style={ls}>날짜</label><input type="date" value={editScoreForm.date} onChange={e=>setEditScoreForm(p=>({...p,date:e.target.value}))} style={is}/></div>
                <div><label style={ls}>시험명</label><input value={editScoreForm.label} onChange={e=>setEditScoreForm(p=>({...p,label:e.target.value}))} style={is} placeholder="예: 3월 모의고사"/></div>
                <div style={{display:"flex",gap:12}}>
                  <div style={{flex:1}}><label style={ls}>점수</label><input type="number" value={editScoreForm.score} onChange={e=>setEditScoreForm(p=>({...p,score:e.target.value}))} style={is} placeholder="0~100" min="0" max="100"/></div>
                  <div style={{flex:1}}><label style={ls}>등급</label><input type="number" value={editScoreForm.grade} onChange={e=>setEditScoreForm(p=>({...p,grade:e.target.value}))} style={is} placeholder="1~9" min="1" max="9"/></div>
                </div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"space-between"}}>
                <button onClick={()=>delScore(editScore.id)} style={{background:C.db,color:C.dn,border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>삭제</button>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setEditScore(null)} style={{background:C.sfh,color:C.ts,border:`1px solid ${C.bd}`,borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                  <button onClick={saveEditScore} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                </div>
              </div>
            </div>
          </div>)}
        </div>);})()}

        {/* PLAN */}
        {subTab==="plan"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp}}>학습 오버뷰</h3>
            {!isParent&&!planEditing&&<button onClick={()=>setPlanEditing(true)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:8,padding:"6px 14px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>수정</button>}
          </div>

          {/* 학업 전략 + SWOT */}
          {planEditing?(<>
            {/* 편집 모드 */}
            <div style={{background:C.sf,border:"2px solid "+C.ac,borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.ac,marginBottom:10}}>🧭 학업 전략</div>
              <textarea value={planStrategy} onChange={e=>{setPlanStrategy(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}} onKeyDown={e=>bk(e,planStrategy,setPlanStrategy)} ref={el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}}} style={{...is,minHeight:80,resize:"none",fontSize:13,lineHeight:1.7,overflow:"hidden"}} placeholder="학생의 전반적인 학습 방향과 전략을 작성하세요..."/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div style={{background:C.sb,border:"1px solid #BBF7D0",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.su,marginBottom:8}}>💪 강점 (S)</div>
                <textarea value={planStrength} onChange={e=>{setPlanStrength(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}} onKeyDown={e=>bk(e,planStrength,setPlanStrength)} ref={el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}}} style={{...is,minHeight:60,resize:"none",fontSize:12,background:"transparent",border:"1px solid #BBF7D0",overflow:"hidden"}} placeholder="강점 기록..."/>
              </div>
              <div style={{background:C.db,border:"1px solid #FECACA",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.dn,marginBottom:8}}>🔧 약점 (W)</div>
                <textarea value={planWeakness} onChange={e=>{setPlanWeakness(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}} onKeyDown={e=>bk(e,planWeakness,setPlanWeakness)} ref={el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}}} style={{...is,minHeight:60,resize:"none",fontSize:12,background:"transparent",border:"1px solid #FECACA",overflow:"hidden"}} placeholder="약점 기록..."/>
              </div>
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.ac,marginBottom:8}}>🚀 기회 (O)</div>
                <textarea value={planOpportunity} onChange={e=>{setPlanOpportunity(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}} onKeyDown={e=>bk(e,planOpportunity,setPlanOpportunity)} ref={el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}}} style={{...is,minHeight:60,resize:"none",fontSize:12,background:"transparent",border:"1px solid #BFDBFE",overflow:"hidden"}} placeholder="기회 요인 기록..."/>
              </div>
              <div style={{background:C.wb,border:"1px solid #FDE68A",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"#B45309",marginBottom:8}}>⚠️ 위협 (T)</div>
                <textarea value={planThreat} onChange={e=>{setPlanThreat(e.target.value);e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}} onKeyDown={e=>bk(e,planThreat,setPlanThreat)} ref={el=>{if(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}}} style={{...is,minHeight:60,resize:"none",fontSize:12,background:"transparent",border:"1px solid #FDE68A",overflow:"hidden"}} placeholder="위협 요인 기록..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginBottom:20}}>
              <button onClick={()=>setPlanEditing(false)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:8,padding:"8px 16px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
              <button onClick={savePlanFields} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:planSaving?.6:1}}>{planSaving?"저장 중...":"저장"}</button>
            </div>
          </>):(<>
            {/* 읽기 모드 */}
            <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.ac,marginBottom:10}}>🧭 학업 전략</div>
              <div style={{fontSize:13,color:planStrategy?C.tp:C.tt,lineHeight:1.7,whiteSpace:"pre-wrap",minHeight:20}}>{planStrategy||"아직 작성된 전략이 없습니다"}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
              <div style={{background:C.sb,border:"1px solid #BBF7D0",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.su,marginBottom:8}}>💪 강점 (S)</div>
                <div style={{fontSize:12,color:planStrength?C.tp:C.tt,lineHeight:1.7,whiteSpace:"pre-wrap",minHeight:20}}>{planStrength||"미작성"}</div>
              </div>
              <div style={{background:C.db,border:"1px solid #FECACA",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.dn,marginBottom:8}}>🔧 약점 (W)</div>
                <div style={{fontSize:12,color:planWeakness?C.tp:C.tt,lineHeight:1.7,whiteSpace:"pre-wrap",minHeight:20}}>{planWeakness||"미작성"}</div>
              </div>
              <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:C.ac,marginBottom:8}}>🚀 기회 (O)</div>
                <div style={{fontSize:12,color:planOpportunity?C.tp:C.tt,lineHeight:1.7,whiteSpace:"pre-wrap",minHeight:20}}>{planOpportunity||"미작성"}</div>
              </div>
              <div style={{background:C.wb,border:"1px solid #FDE68A",borderRadius:14,padding:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"#B45309",marginBottom:8}}>⚠️ 위협 (T)</div>
                <div style={{fontSize:12,color:planThreat?C.tp:C.tt,lineHeight:1.7,whiteSpace:"pre-wrap",minHeight:20}}>{planThreat||"미작성"}</div>
              </div>
            </div>
          </>)}

          {/* 학습 리포트 */}
          <div style={{borderTop:"1px solid "+C.bd,paddingTop:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700,color:C.tp}}>학습 리포트</div>
              {!isParent&&<button onClick={()=>setShowPlanReport(!showPlanReport)} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>+ 새 리포트</button>}
            </div>

            {/* New report form */}
            {showPlanReport&&!isParent&&(<div style={{background:C.sf,border:"2px solid "+C.ac,borderRadius:14,padding:20,marginBottom:16}}>
              <div style={{marginBottom:10}}><label style={ls}>제목</label><input value={planRpTitle} onChange={e=>setPlanRpTitle(e.target.value)} style={is} placeholder="예: 2월 1~2주차 학습 리포트"/></div>
              <div style={{marginBottom:10}}><label style={ls}>내용</label><textarea value={planRpBody} onChange={e=>setPlanRpBody(e.target.value)} style={{...is,minHeight:120,resize:"vertical"}} placeholder="학습 진행 상황, 피드백, 계획 변경 등을 기록하세요..."/></div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.ts,cursor:"pointer"}}><input type="checkbox" checked={planRpShared} onChange={e=>setPlanRpShared(e.target.checked)}/>학부모 공유</label>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowPlanReport(false)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                  <button onClick={addPlanReport} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                </div>
              </div>
            </div>)}

            {/* Report timeline */}
            {planComments.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>아직 학습 리포트가 없습니다</div><div style={{fontSize:12,marginTop:4,color:C.tt}}>학생의 학습 진행 상황을 기록해보세요</div></div>):(
              <div style={{position:"relative",paddingLeft:20}}>
                <div style={{position:"absolute",left:5,top:8,bottom:8,width:2,background:C.bl}}/>
                {planComments.map((c,i)=>(<div key={c.id} style={{position:"relative",marginBottom:16}}>
                  <div style={{position:"absolute",left:-20+1,top:6,width:10,height:10,borderRadius:"50%",background:i===0?C.ac:C.bd}}/>
                  <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:18,borderLeft:i===0?"3px solid "+C.ac:"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:14,fontWeight:600,color:C.tp}}>{c.title||"리포트"}</span>
                        {c.is_shared?<span style={{background:C.as,color:C.ac,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:600}}>공유됨</span>:<span style={{background:C.sfh,color:C.tt,padding:"2px 8px",borderRadius:5,fontSize:10}}>비공개</span>}
                        {!isParent&&editingComment!==c.id&&<button onClick={()=>{setEditingComment(c.id);setEditCommentTitle(c.title||"");setEditCommentText(c.body||"");setEditCommentShared(!!c.is_shared);}} style={{background:"none",border:"none",fontSize:10,color:C.ac,cursor:"pointer",fontFamily:"inherit",padding:0}}>수정</button>}
                      </div>
                      <span style={{fontSize:12,color:C.tt,flexShrink:0}}>{c.date}</span>
                    </div>
                    {editingComment===c.id?(<div>
                      <div style={{marginBottom:8}}><label style={{...ls,marginBottom:4}}>제목</label><input value={editCommentTitle} onChange={e=>setEditCommentTitle(e.target.value)} style={{...is,fontSize:12}} placeholder="리포트 제목"/></div>
                      <div style={{marginBottom:8}}><label style={{...ls,marginBottom:4}}>내용</label><textarea value={editCommentText} onChange={e=>setEditCommentText(e.target.value)} style={{...is,minHeight:80,resize:"vertical",fontSize:12}}/></div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.ts,cursor:"pointer"}}><input type="checkbox" checked={editCommentShared} onChange={e=>setEditCommentShared(e.target.checked)}/>학부모 공유</label>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>setEditingComment(null)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:6,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                          <button onClick={()=>updatePlanComment(c.id)} style={{background:C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                        </div>
                      </div>
                    </div>):(<div style={{fontSize:13,color:C.ts,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{c.body}</div>)}
                  </div>
                </div>))}
              </div>
            )}
          </div>
        </div>)}

        {/* FILES */}
        {subTab==="files"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp}}>자료실</h3>
            <span style={{fontSize:12,color:C.tt}}>{allFiles.length+standaloneFiles.length}개 파일</span>
          </div>

          {/* Drop zone */}
          {!isParent&&(<div onDragOver={e=>{e.preventDefault();setFileDrag(true);}} onDragLeave={()=>setFileDrag(false)} onDrop={handleFileDrop}
            style={{border:"2px dashed "+(fileDrag?C.ac:C.bd),borderRadius:14,padding:uploading?20:24,textAlign:"center",marginBottom:16,background:fileDrag?C.as:C.sf,transition:"all .15s",cursor:"pointer",position:"relative"}}
            onClick={()=>{const inp=document.createElement('input');inp.type='file';inp.multiple=true;inp.onchange=e=>handleFileDrop(e);inp.click();}}>
            {uploading?(<div style={{color:C.ac,fontSize:13}}>업로드 중...</div>):(
              <div><div style={{fontSize:20,marginBottom:6}}>{fileDrag?"📥":"📎"}</div><div style={{fontSize:13,color:fileDrag?C.ac:C.ts}}>{fileDrag?"놓으면 업로드됩니다":"파일을 드래그하거나 클릭하여 추가"}</div></div>
            )}
          </div>)}

          {/* Standalone files */}
          {standaloneFiles.length>0&&(<div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tp,marginBottom:8}}>직접 추가한 자료</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {standaloneFiles.map(f=>{const icon=f.file_type==="pdf"?"📄":f.file_type==="img"?"🖼️":"📎";return(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.sf,border:"1px solid "+C.bd,borderRadius:10}}>
                  <span style={{fontSize:18}}>{icon}</span>
                  <span style={{fontSize:13,fontWeight:500,color:C.tp,flex:1}}>{f.file_name}</span>
                  <span style={{fontSize:10,color:C.tt,background:C.sfh,padding:"2px 8px",borderRadius:4}}>{f.file_type||"file"}</span>
                  {f.file_url&&<a href={f.file_url} target="_blank" rel="noreferrer" style={{fontSize:10,color:C.ac,textDecoration:"none"}}>열기</a>}
                  {!isParent&&<button onClick={()=>delFile(f.id)} style={{background:"none",border:"none",color:C.tt,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>삭제</button>}
                </div>);})}
            </div>
          </div>)}

          {/* Lesson-linked files */}
          {allFiles.length===0&&standaloneFiles.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:16,marginBottom:8}}>📂</div><div style={{fontSize:14}}>아직 등록된 자료가 없습니다</div></div>):
          allFiles.length>0&&(
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.tp,marginBottom:8}}>수업 자료</div>
              {[...new Set(allFiles.map(f=>f.lesTopic))].map(topic=>{const items=allFiles.filter(f=>f.lesTopic===topic);return(<div key={topic||"etc"} style={{marginBottom:16}}>
              <div style={{fontSize:12,color:C.ts,marginBottom:6,display:"flex",alignItems:"center",gap:8}}><span>{topic||"수업"}</span><span style={{fontSize:10,color:C.tt}}>({items[0]?.lesDate})</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>{items.map(f=>{const icon=(f.file_type||"")==="pdf"?"📄":(f.file_type||"")==="img"?"🖼️":"📎";return(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.sf,border:"1px solid "+C.bd,borderRadius:10}}>
                  <span style={{fontSize:18}}>{icon}</span><span style={{fontSize:13,fontWeight:500,color:C.tp,flex:1}}>{f.file_name||f.name}</span><span style={{fontSize:10,color:C.tt,background:C.sfh,padding:"2px 8px",borderRadius:4}}>{f.file_type||"file"}</span>
                </div>);})}</div>
            </div>);})}
            </div>
          )}
        </div>)}

      </div>
      {lesDetailData&&<LessonDetailModal les={lesDetailData} student={s} onUpdate={updLesDetail} onClose={()=>setLesDetailData(null)}/>}
    </div>
  );
}