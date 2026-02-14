'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import LessonDetailModal from './student/LessonDetailModal';

const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
const REASON_COLORS=["#2563EB","#DC2626","#F59E0B","#16A34A","#8B5CF6","#EC4899","#06B6D4","#F97316"];
const p2=n=>String(n).padStart(2,"0");
const fd=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
const m2s=m=>`${p2(Math.floor(m/60))}:${p2(m%60)}`;
const ls={display:"block",fontSize:12,fontWeight:500,color:C.tt,marginBottom:6};
const is={width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid "+C.bd,fontSize:14,color:C.tp,background:C.sf,outline:"none",fontFamily:"inherit"};
const IcBack=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>);
const CustomTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>{d.label||d.date}</div><div style={{fontSize:16,fontWeight:700,color:C.ac}}>{d.score}점</div></div>);};
const ReasonTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"8px 12px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:11,color:C.tt,marginBottom:2}}>{d.name}</div><div style={{fontSize:14,fontWeight:700,color:d.fill||C.ac}}>{d.count}문항</div></div>);};

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
  const [lesDetailData,setLesDetailData]=useState(null);
  const [showNew,setShowNew]=useState(false);
  const [nT,setNT]=useState("");const [nB,setNB]=useState("");const [nS,setNS]=useState(false);
  const [wForm,setWForm]=useState({book:"",chapter:"",problem_num:"",reason:"",note:""});
  const [wFilter,setWFilter]=useState("");const [wPage,setWPage]=useState(0);const [wExpanded,setWExpanded]=useState({});
  const PER_PAGE=20;
  const [showAddScore,setShowAddScore]=useState(false);
  const [scoreForm,setScoreForm]=useState({date:"",score:"",label:""});
  const [reasonBook,setReasonBook]=useState("");
  const [chapterBook,setChapterBook]=useState("");
  const [planStrategy,setPlanStrategy]=useState("");
  const [planStrength,setPlanStrength]=useState("");
  const [planWeakness,setPlanWeakness]=useState("");
  const [planComment,setPlanComment]=useState("");
  const [planComments,setPlanComments]=useState([]);
  const [planSaving,setPlanSaving]=useState(false);
  const [editingComment,setEditingComment]=useState(null);
  const [editCommentText,setEditCommentText]=useState("");
  const [fileDrag,setFileDrag]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [standaloneFiles,setStandaloneFiles]=useState([]);

  // Tabs: 리포트를 수업 안 "기록" 서브탭으로, 계획 제거, 분석에서 리포트 제거
  const mainTabs=[
    {id:"class",l:"수업",subs:[{id:"timeline",l:"타임라인"},{id:"calendar",l:"일정"},{id:"notes",l:"레포트"}]},
    {id:"study",l:"학습관리",subs:[{id:"homework",l:"숙제"},{id:"wrong",l:"오답관리"}]},
    {id:"analysis",l:"분석",subs:[{id:"scores",l:"성적"},{id:"plan",l:"계획"}]},
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
    // Load plan fields from student
    setPlanStrategy(s.plan_strategy||"");
    setPlanStrength(s.plan_strength||"");
    setPlanWeakness(s.plan_weakness||"");
    // Fetch standalone files (not linked to lessons)
    const{data:sf}=await supabase.from('files').select('*').eq('student_id',s.id).is('lesson_id',null).order('created_at',{ascending:false});
    setStandaloneFiles(sf||[]);
    setLoading(false);
  },[s.id]);
  useEffect(()=>{fetchAll();},[fetchAll]);

  const allFiles=lessons.flatMap(l=>(l.files||[]).map(f=>({...f,lesDate:l.date,lesTopic:l.topic||l.subject})));
  const wBooks=[...new Set(wrongs.map(w=>w.book).filter(Boolean))];
  const filteredW=wFilter?wrongs.filter(w=>w.book===wFilter):wrongs;
  const totalWPages=Math.max(1,Math.ceil(filteredW.length/PER_PAGE));
  const pagedW=filteredW.slice(wPage*PER_PAGE,(wPage+1)*PER_PAGE);

  // Reason & chapter stats (independent book filters)
  const reasonSource=reasonBook?wrongs.filter(w=>w.book===reasonBook):wrongs;
  const reasonMap={};
  reasonSource.forEach(w=>{const r=w.reason||"미분류";reasonMap[r]=(reasonMap[r]||0)+1;});
  const reasonData=Object.entries(reasonMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([reason,count],i)=>({name:reason,count,fill:REASON_COLORS[i%REASON_COLORS.length]}));
  const chapterSource=chapterBook?wrongs.filter(w=>w.book===chapterBook):wrongs;
  const chapterMap={};
  chapterSource.forEach(w=>{const c=w.chapter||"미분류";chapterMap[c]=(chapterMap[c]||0)+1;});
  const chapterData=Object.entries(chapterMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count],i)=>({name,count,fill:REASON_COLORS[i%REASON_COLORS.length]}));

  const updHw=async(hwId,key,val)=>{await supabase.from('homework').update({[key]:val}).eq('id',hwId);setLessons(prev=>prev.map(l=>({...l,homework:(l.homework||[]).map(h=>h.id===hwId?{...h,[key]:val}:h)})));};
  const addWrong=async()=>{if(!wForm.problem_num.trim())return;const{data,error}=await supabase.from('wrong_answers').insert({student_id:s.id,...wForm,user_id:user.id}).select().single();if(!error&&data){setWrongs(p=>[data,...p]);setWForm(f=>({...f,problem_num:"",reason:"",note:""}));setWPage(0);}};
  const delWrong=async(id)=>{await supabase.from('wrong_answers').delete().eq('id',id);setWrongs(p=>p.filter(w=>w.id!==id));};
  const addRp=async()=>{if(!nT.trim())return;const{data,error}=await supabase.from('reports').insert({student_id:s.id,title:nT,body:nB,is_shared:nS,date:fd(new Date()),user_id:user.id}).select().single();if(!error&&data){setReports(p=>[data,...p]);setNT("");setNB("");setNS(false);setShowNew(false);}};
  const addScore=async()=>{if(!scoreForm.score)return;const{data,error}=await supabase.from('scores').insert({student_id:s.id,date:scoreForm.date,score:parseInt(scoreForm.score),label:scoreForm.label,user_id:user.id}).select().single();if(!error&&data){setScores(p=>[...p,data]);setScoreForm({date:"",score:"",label:""});setShowAddScore(false);}};
  const savePlanFields=async()=>{setPlanSaving(true);await supabase.from('students').update({plan_strategy:planStrategy,plan_strength:planStrength,plan_weakness:planWeakness}).eq('id',s.id);setPlanSaving(false);};
  const addPlanComment=async()=>{if(!planComment.trim())return;const{data,error}=await supabase.from('reports').insert({student_id:s.id,title:"",body:planComment,type:"plan",date:fd(new Date()),user_id:user.id}).select().single();if(!error&&data){setPlanComments(p=>[data,...p]);setPlanComment("");}};
  const updatePlanComment=async(id)=>{if(!editCommentText.trim())return;await supabase.from('reports').update({body:editCommentText}).eq('id',id);setPlanComments(p=>p.map(c=>c.id===id?{...c,body:editCommentText}:c));setEditingComment(null);setEditCommentText("");};
  const handleFileDrop=async(e)=>{e.preventDefault();setFileDrag(false);const files=e.dataTransfer?e.dataTransfer.files:e.target.files;if(!files||!files.length)return;setUploading(true);
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
  const delFile=async(id)=>{await supabase.from('files').delete().eq('id',id);setStandaloneFiles(p=>p.filter(f=>f.id!==id));};
  const updLesDetail=async(id,data)=>{
    const u={};if(data.top!==undefined)u.topic=data.top;if(data.content!==undefined)u.content=data.content;if(data.feedback!==undefined)u.feedback=data.feedback;if(data.tMemo!==undefined)u.private_memo=data.tMemo;if(data.planShared!==undefined)u.plan_shared=data.planShared;if(data.planPrivate!==undefined)u.plan_private=data.planPrivate;
    if(Object.keys(u).length)await supabase.from('lessons').update(u).eq('id',id);
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
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.ts,cursor:"pointer"}}><input type="checkbox" checked={isParent} onChange={e=>setIsParent(e.target.checked)}/>학부모 뷰</label>
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
        {subTab==="timeline"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp}}>수업 타임라인</h3>
            <span style={{fontSize:12,color:C.tt}}>총 {lessons.length}회</span>
          </div>
          {lessons.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>수업 기록이 없습니다</div></div>):(
            <div style={{position:"relative",paddingLeft:28}}>
              <div style={{position:"absolute",left:7,top:16,bottom:16,width:2,background:C.bl}}/>
              {lessons.map((l,i)=>{
                const hw=l.homework||[],hwDone=hw.filter(h=>(h.completion_pct||0)>=100).length,hwTotal=hw.length;
                const em=l.start_hour*60+l.start_min+l.duration;
                const hasSections=l.content||l.feedback||hwTotal>0||l.plan_shared;
                return(
                  <div key={l.id} style={{position:"relative",marginBottom:16}}>
                    <div style={{position:"absolute",left:-28+3,top:18,width:10,height:10,borderRadius:"50%",background:i===0?col.b:C.bd,border:"2px solid "+C.sf,zIndex:1}}/>
                    <div onClick={()=>setLesDetailData(l)} style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,overflow:"hidden",cursor:"pointer",borderLeft:"3px solid "+col.b}} className="hcard">
                      {/* Header */}
                      <div style={{padding:"16px 20px "+(hasSections?"12px":"16px")}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:C.tt,marginBottom:4}}>{l.date} {p2(l.start_hour)}:{p2(l.start_min)} ~ {m2s(em)} ({l.duration}분)</div>
                            <div style={{fontSize:16,fontWeight:700,color:C.tp}}>{l.topic||l.subject||"-"}</div>
                          </div>
                          <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
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
                          <div style={{fontSize:13,color:C.ts,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{l.content}</div>
                        </div>)}
                        {l.feedback&&(<div style={{background:C.as,borderRadius:10,padding:"10px 14px"}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.ac,marginBottom:4}}>피드백</div>
                          <div style={{fontSize:13,color:C.ts,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{l.feedback}</div>
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
                          <div style={{fontSize:13,color:C.ts,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{l.plan_shared}</div>
                        </div>)}
                      </div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>)}

        {/* CALENDAR - placeholder */}
        {subTab==="calendar"&&(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>일정 캘린더 (준비 중)</div></div>)}

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
          const avgP=tHw>0?Math.round(aHw.reduce((a,h)=>a+(h.completion_pct||0),0)/tHw):0;
          const avgC=avgP>=80?C.su:avgP>=40?C.wn:C.dn;
          return(<div>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp,marginBottom:16}}>숙제 현황</h3>
            {/* Summary stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
              <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:700,color:C.tp}}>{tHw}</div>
                <div style={{fontSize:11,color:C.tt,marginTop:2}}>전체 숙제</div>
              </div>
              <div style={{background:C.sb,border:"1px solid #BBF7D0",borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:700,color:C.su}}>{dHw}</div>
                <div style={{fontSize:11,color:C.su,marginTop:2}}>완료</div>
              </div>
              <div style={{background:C.wb,border:"1px solid #FDE68A",borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:700,color:C.wn}}>{pHw}</div>
                <div style={{fontSize:11,color:C.wn,marginTop:2}}>진행중</div>
              </div>
              <div style={{background:C.as,border:"1px solid "+C.al,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:700,color:avgC}}>{avgP}%</div>
                <div style={{fontSize:11,color:C.ac,marginTop:2}}>평균 완성도</div>
              </div>
            </div>
            {/* Grouped by lesson */}
            {lessons.filter(l=>(l.homework||[]).length>0).length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>숙제가 없습니다</div></div>):(
              lessons.filter(l=>(l.homework||[]).length>0).map(l=>{
                const lhw=l.homework||[],lDone=lhw.filter(h=>(h.completion_pct||0)>=100).length;
                return(<div key={l.id} style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:col.b}}/>
                      <span style={{fontSize:13,fontWeight:600,color:C.tp}}>{l.date}</span>
                      <span style={{fontSize:12,color:C.ts}}>{l.topic||l.subject}</span>
                    </div>
                    <span style={{fontSize:11,color:lDone===lhw.length?C.su:C.tt,fontWeight:500}}>{lDone}/{lhw.length} 완료</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {lhw.map(h=>{
                      const pct=h.completion_pct||0;
                      const pc=pct>=100?C.su:pct>=50?C.wn:C.dn;
                      const pb=pct>=100?C.sb:pct>=50?C.wb:C.db;
                      const sl=pct>=100?"완료":pct>0?"진행중":"미시작";
                      return(
                        <div key={h.id} style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:12,padding:"14px 18px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <span style={{fontSize:14,fontWeight:600,color:C.tp}}>{h.title||"숙제"}</span>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:10,background:pb,color:pc,padding:"2px 8px",borderRadius:5,fontWeight:600}}>{sl}</span>
                              {!isParent&&<input type="range" min="0" max="100" step="10" value={pct} onChange={e=>updHw(h.id,"completion_pct",parseInt(e.target.value))} style={{width:80,accentColor:pc,cursor:"pointer"}}/>}
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{flex:1,height:6,background:C.bl,borderRadius:3,overflow:"hidden"}}>
                              <div style={{height:"100%",width:pct+"%",background:pc,borderRadius:3,transition:"width .3s"}}/>
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
                  <button onClick={()=>setChapterBook("")} style={{padding:"2px 8px",borderRadius:5,border:"1px solid "+(!chapterBook?C.ac:C.bd),background:!chapterBook?C.as:"transparent",fontSize:9,fontWeight:!chapterBook?600:400,color:!chapterBook?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>전체</button>
                  {wBooks.map(b=>(<button key={b} onClick={()=>setChapterBook(chapterBook===b?"":b)} style={{padding:"2px 8px",borderRadius:5,border:"1px solid "+(chapterBook===b?C.ac:C.bd),background:chapterBook===b?C.as:"transparent",fontSize:9,fontWeight:chapterBook===b?600:400,color:chapterBook===b?C.ac:C.ts,cursor:"pointer",fontFamily:"inherit"}}>{b}</button>))}
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
          !wFilter?(wBooks.map(book=>{const items=wrongs.filter(w=>w.book===book);const exp=wExpanded[book]!==false;return(
            <div key={book} style={{marginBottom:12}}>
              <div onClick={()=>setWExpanded(p=>({...p,[book]:!exp}))} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.sfh,borderRadius:10,cursor:"pointer",marginBottom:exp?8:0}}>
                <span style={{fontSize:13,fontWeight:600,color:C.tp}}>{book} <span style={{fontWeight:400,color:C.tt}}>({items.length})</span></span>
                <span style={{fontSize:12,color:C.tt}}>{exp?"▲":"▼"}</span>
              </div>
              {exp&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr>{["단원","번호","사유","메모",""].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:"left",color:C.tt,fontWeight:500,borderBottom:"1px solid "+C.bd}}>{h}</th>))}</tr></thead>
                <tbody>{items.map(w=>(<tr key={w.id} style={{borderBottom:"1px solid "+C.bl}}>
                  <td style={{padding:"8px 10px",color:C.ts}}>{w.chapter}</td>
                  <td style={{padding:"8px 10px",fontWeight:600,color:C.tp}}>{w.problem_num}</td>
                  <td style={{padding:"8px 10px"}}><span style={{background:C.wb,color:C.wn,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:600}}>{w.reason||"-"}</span></td>
                  <td style={{padding:"8px 10px",color:C.ts,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.note||"-"}</td>
                  <td style={{padding:"8px 10px"}}>{!isParent&&<button onClick={()=>delWrong(w.id)} style={{background:"none",border:"none",color:C.tt,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>삭제</button>}</td>
                </tr>))}</tbody>
              </table>}
            </div>);})):(
            <div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr>{["단원","번호","사유","메모",""].map((h,i)=>(<th key={i} style={{padding:"8px 10px",textAlign:"left",color:C.tt,fontWeight:500,borderBottom:"1px solid "+C.bd}}>{h}</th>))}</tr></thead>
                <tbody>{pagedW.map(w=>(<tr key={w.id} style={{borderBottom:"1px solid "+C.bl}}>
                  <td style={{padding:"8px 10px",color:C.ts}}>{w.chapter}</td>
                  <td style={{padding:"8px 10px",fontWeight:600,color:C.tp}}>{w.problem_num}</td>
                  <td style={{padding:"8px 10px"}}><span style={{background:C.wb,color:C.wn,padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:600}}>{w.reason||"-"}</span></td>
                  <td style={{padding:"8px 10px",color:C.ts}}>{w.note||"-"}</td>
                  <td style={{padding:"8px 10px"}}>{!isParent&&<button onClick={()=>delWrong(w.id)} style={{background:"none",border:"none",color:C.tt,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>삭제</button>}</td>
                </tr>))}</tbody>
              </table>
              {pagedW.length===0&&<div style={{textAlign:"center",padding:24,color:C.tt,fontSize:13}}>오답 기록이 없습니다</div>}
              {totalWPages>1&&(<div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:12}}>
                <button onClick={()=>setWPage(p=>Math.max(0,p-1))} disabled={wPage===0} style={{padding:"4px 12px",border:"1px solid "+C.bd,borderRadius:6,fontSize:11,background:C.sf,cursor:wPage===0?"default":"pointer",opacity:wPage===0?.4:1,fontFamily:"inherit"}}>← 이전</button>
                <span style={{fontSize:12,color:C.ts}}>{wPage+1} / {totalWPages}</span>
                <button onClick={()=>setWPage(p=>Math.min(totalWPages-1,p+1))} disabled={wPage>=totalWPages-1} style={{padding:"4px 12px",border:"1px solid "+C.bd,borderRadius:6,fontSize:11,background:C.sf,cursor:wPage>=totalWPages-1?"default":"pointer",opacity:wPage>=totalWPages-1?.4:1,fontFamily:"inherit"}}>다음 →</button>
              </div>)}
            </div>
          )}
        </div>)}

        {/* SCORES */}
        {subTab==="scores"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:16,fontWeight:700,color:C.tp}}>성적 추이</h3>
            {!isParent&&<button onClick={()=>setShowAddScore(!showAddScore)} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ 성적 추가</button>}
          </div>
          {showAddScore&&!isParent&&(<div style={{background:C.sf,border:"2px solid "+C.ac,borderRadius:14,padding:16,marginBottom:16,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div><label style={ls}>날짜</label><input type="date" value={scoreForm.date} onChange={e=>setScoreForm(p=>({...p,date:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px",width:140}}/></div>
            <div><label style={ls}>시험명</label><input value={scoreForm.label} onChange={e=>setScoreForm(p=>({...p,label:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px",width:140}} placeholder="예: 3월 모의고사"/></div>
            <div><label style={ls}>점수</label><input type="number" value={scoreForm.score} onChange={e=>setScoreForm(p=>({...p,score:e.target.value}))} style={{...is,fontSize:12,padding:"6px 10px",width:80}} placeholder="100"/></div>
            <button onClick={addScore} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
          </div>)}
          {scores.length===0?(<div style={{textAlign:"center",padding:40,color:C.tt,background:C.sf,border:"1px solid "+C.bd,borderRadius:14}}><div style={{fontSize:14}}>성적 데이터가 없습니다</div></div>):(
            <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:20}}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={scores} margin={{top:10,right:10,left:-10,bottom:0}}>
                  <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.ac} stopOpacity={0.15}/><stop offset="95%" stopColor={C.ac} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bl} vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tick={{fontSize:10,fill:C.tt}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="score" stroke={C.ac} fill="url(#scoreGrad)" strokeWidth={2.5} dot={{r:4,fill:C.ac}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>)}

        {/* PLAN */}
        {subTab==="plan"&&(<div>
          <h3 style={{fontSize:16,fontWeight:700,color:C.tp,marginBottom:16}}>학습 계획</h3>

          {/* Editable plan fields */}
          <div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:14,padding:20,marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:C.ac,marginBottom:10}}>🧭 학업 전략</div>
            <textarea value={planStrategy} onChange={e=>setPlanStrategy(e.target.value)} style={{...is,height:80,resize:"vertical",fontSize:13,lineHeight:1.7}} placeholder="학생의 전반적인 학습 방향과 전략을 작성하세요..." disabled={isParent}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{background:C.sb,border:"1px solid #BBF7D0",borderRadius:14,padding:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.su,marginBottom:8}}>💪 강점</div>
              <textarea value={planStrength} onChange={e=>setPlanStrength(e.target.value)} style={{...is,height:60,resize:"vertical",fontSize:12,background:"transparent",border:"1px solid #BBF7D0"}} placeholder="강점 기록..." disabled={isParent}/>
            </div>
            <div style={{background:C.db,border:"1px solid #FECACA",borderRadius:14,padding:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.dn,marginBottom:8}}>🔧 보완점</div>
              <textarea value={planWeakness} onChange={e=>setPlanWeakness(e.target.value)} style={{...is,height:60,resize:"vertical",fontSize:12,background:"transparent",border:"1px solid #FECACA"}} placeholder="보완점 기록..." disabled={isParent}/>
            </div>
          </div>
          {!isParent&&<div style={{textAlign:"right",marginBottom:20}}>
            <button onClick={savePlanFields} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:planSaving?.6:1}}>{planSaving?"저장 중...":"계획 저장"}</button>
          </div>}

          {/* Timeline comments */}
          <div style={{borderTop:"1px solid "+C.bd,paddingTop:20}}>
            <div style={{fontSize:14,fontWeight:600,color:C.tp,marginBottom:14}}>기록</div>

            {/* New comment input */}
            {!isParent&&(<div style={{display:"flex",gap:8,marginBottom:16}}>
              <textarea value={planComment} onChange={e=>setPlanComment(e.target.value)} style={{...is,height:50,resize:"none",fontSize:12,flex:1}} placeholder="진행 상황, 피드백, 계획 변경 등을 기록하세요..."/>
              <button onClick={addPlanComment} style={{background:C.pr,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",alignSelf:"flex-end",flexShrink:0}}>등록</button>
            </div>)}

            {/* Comment timeline */}
            {planComments.length===0?(<div style={{textAlign:"center",padding:24,color:C.tt,fontSize:12}}>아직 기록이 없습니다</div>):(
              <div style={{position:"relative",paddingLeft:20}}>
                <div style={{position:"absolute",left:5,top:4,bottom:4,width:2,background:C.bl}}/>
                {planComments.map((c,i)=>(<div key={c.id} style={{position:"relative",marginBottom:12}}>
                  <div style={{position:"absolute",left:-20+1,top:4,width:8,height:8,borderRadius:"50%",background:i===0?C.ac:C.bd}}/>
                  <div style={{background:C.sfh,borderRadius:10,padding:"10px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:11,color:C.tt}}>{c.date}</span>
                      {!isParent&&editingComment!==c.id&&<button onClick={()=>{setEditingComment(c.id);setEditCommentText(c.body);}} style={{background:"none",border:"none",fontSize:10,color:C.ac,cursor:"pointer",fontFamily:"inherit"}}>수정</button>}
                    </div>
                    {editingComment===c.id?(<div>
                      <textarea value={editCommentText} onChange={e=>setEditCommentText(e.target.value)} style={{...is,height:50,resize:"none",fontSize:12,marginBottom:6}}/>
                      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                        <button onClick={()=>setEditingComment(null)} style={{background:C.sfh,color:C.ts,border:"1px solid "+C.bd,borderRadius:6,padding:"4px 10px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
                        <button onClick={()=>updatePlanComment(c.id)} style={{background:C.pr,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>저장</button>
                      </div>
                    </div>):(<div style={{fontSize:13,color:C.tp,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{c.body}</div>)}
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