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
import { Plus, X, Archive, ChevronLeft } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
  const stuNumMap={};[...students].sort((a,b)=>{const sa=a.sort_order??Infinity,sb=b.sort_order??Infinity;if(sa!==sb)return sa-sb;if(!!a.archived!==!!b.archived)return a.archived?1:-1;const ca=new Date(a.created_at).getTime(),cb=new Date(b.created_at).getTime();return ca!==cb?ca-cb:(a.id<b.id?-1:1);}).forEach((s,i)=>{stuNumMap[s.id]=i+1;});
  const filtered=(showArchived?archivedStudents:activeStudents).filter(s=>(s.name||'').includes(search)||(s.subject||'').includes(search)||(s.school||'').includes(search));

  const canDrag=!showArchived&&!search;
  const dragFi=dragId?filtered.findIndex(x=>x.id===dragId):-1;
  const noDrop=dropIdx!=null&&(dropIdx===dragFi||dropIdx===dragFi+1);
  const onDS=(e,id)=>{setDragId(id);e.dataTransfer.effectAllowed='move';};
  const onDO=(e,idx)=>{e.preventDefault();const r=e.currentTarget.getBoundingClientRect();const ni=e.clientX<r.left+r.width/2?idx:idx+1;if(ni!==dropIdx)setDropIdx(ni);};
  const onDR=async(e)=>{e.preventDefault();const fid=dragId,di=dropIdx;setDragId(null);setDropIdx(null);if(!fid||di==null)return;const list=[...activeStudents];const fi=list.findIndex(s=>s.id===fid);if(fi<0)return;const[mv]=list.splice(fi,1);const ai=di>fi?di-1:di;list.splice(ai,0,mv);if(list.every((s,i)=>s.id===activeStudents[i].id))return;const reordered=list.map((s,i)=>({...s,sort_order:i}));setStudents(prev=>[...reordered,...prev.filter(s=>!!s.archived)]);try{const updates=reordered.map((s,i)=>supabase.from('students').update({sort_order:i}).eq('id',s.id));const results=await Promise.all(updates);const failed=results.some(r=>r.error);if(failed){toast?.('순서 저장에 실패했습니다','error');fetchStudents();}else{toast?.('순서가 저장되었습니다');}}catch{toast?.('순서 저장에 실패했습니다','error');fetchStudents();}};
  const onDE=()=>{setDragId(null);setDropIdx(null);};

  if(loading)return(<div className="min-h-screen bg-bg flex items-center justify-center"><div className="text-tt text-sm">불러오는 중...</div></div>);
  if(fetchError&&!students.length)return(<div className="min-h-screen bg-bg flex items-center justify-center flex-col gap-3"><div className="text-sm text-dn">데이터를 불러오지 못했습니다</div><Button variant="secondary" onClick={()=>{setLoading(true);fetchStudents();}}>다시 시도</Button></div>);

  return(
    <div className="stu-container p-7">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {tog}
          {showArchived&&<button onClick={()=>setShowArchived(false)} className="bg-transparent border-none cursor-pointer text-ts flex items-center p-0"><ChevronLeft size={18}/></button>}
          <h1 className="text-xl font-bold text-tp">{showArchived?"보관된 학생":"학생 관리"}</h1>
          <span className="bg-sfh text-ts py-0.5 px-2.5 rounded-md text-xs">{(showArchived?archivedStudents:activeStudents).length}명</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0 justify-end">
          {!showArchived&&archivedStudents.length>0&&<button onClick={()=>setShowArchived(true)} className="flex items-center gap-1.5 bg-sfh text-ts border border-bd rounded-lg py-2 px-3 text-xs cursor-pointer font-[inherit] whitespace-nowrap hover:bg-bd transition-colors"><Archive size={14}/> 보관함 ({archivedStudents.length})</button>}
          <input value={search} onChange={e=>setSearch(e.target.value)} className="stu-search py-2 px-3.5 rounded-lg border border-bd text-[13px] text-tp outline-none flex-1 min-w-0 font-[inherit] focus:border-ac transition-colors" style={{width:200}} placeholder="검색..."/>
          {!showArchived&&<Button onClick={openAdd} icon={<Plus size={16}/>}>학생 추가</Button>}
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
              {isBusy&&<div className="absolute inset-0 rounded-[14px] z-10 flex items-center justify-center" style={{background:"rgba(255,255,255,.6)",pointerEvents:"auto"}}><div className="text-xs text-ts font-medium">처리 중...</div></div>}
              {showL&&<div className="absolute rounded-sm z-5" style={{left:-9,top:4,bottom:4,width:3,background:C.ac,boxShadow:`0 0 8px ${C.ac}`}}/>}
              {showR&&<div className="absolute rounded-sm z-5" style={{right:-9,top:4,bottom:4,width:3,background:C.ac,boxShadow:`0 0 8px ${C.ac}`}}/>}
              <div className="flex items-center gap-3 mb-3.5">
                <div className="flex items-center justify-center rounded-[10px] text-base font-bold shrink-0" style={{width:40,height:40,background:col.bg,color:col.t}}>{(s.name||"?")[0]}</div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-tp"><span className="text-tt font-normal text-[11px] mr-1">{stuNumMap[s.id]}</span>{s.name}</div>
                  <div className="flex gap-1 mt-0.5">
                    <span className="py-0.5 px-2 rounded-[5px] text-[11px] font-semibold" style={{background:col.bg,color:col.t}}>{s.subject}</span>
                    <span className="bg-sfh text-ts py-0.5 px-2 rounded-[5px] text-[11px]">{s.grade}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-ts">
                {(()=>{const nc=getNextClass(s.id);return nc?<div><div>다음: {nc.time}</div>{nc.topic&&<div className="text-[11px] text-tp font-medium mt-0.5">{nc.topic}</div>}</div>:<span className="text-tt">예정된 수업 없음</span>;})()}
              </div>
              <div className="flex-1 mt-2 pt-2 border-t border-bl text-xs">
                {s.school&&<span className="text-ts">{s.school}</span>}
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-bl">
                {s.archived
                  ?<button onClick={e=>restoreStudent(s.id,e)} className="bg-transparent border-none cursor-pointer text-ac text-[11px] font-semibold font-[inherit]">복원</button>
                  :<><button onClick={e=>openEdit(s,e)} className="bg-transparent border-none cursor-pointer text-tt text-[11px] font-[inherit] hover:text-tp transition-colors">수정</button><button onClick={e=>archiveStudent(s.id,e)} className="bg-transparent border-none cursor-pointer text-tt text-[11px] font-[inherit] hover:text-tp transition-colors">보관</button></>
                }
                <button onClick={e=>deleteStudent(s.id,e)} className="bg-transparent border-none cursor-pointer text-tt text-[11px] font-[inherit] hover:text-dn transition-colors">삭제</button>
              </div>
            </div>
          );
        })}

        {showArchived&&filtered.length===0&&<div className="col-span-full text-center p-10 text-tt text-sm">보관된 학생이 없습니다</div>}

        {/* Add card */}
        {!showArchived&&<div onClick={openAdd} className="bg-sf border-2 border-dashed border-bd rounded-[14px] p-5 cursor-pointer flex flex-col items-center justify-center text-tt hcard" style={{minHeight:160}}>
          <Plus size={16}/>
          <div className="mt-2 text-[13px]">학생 추가</div>
        </div>}
      </div>

      {/* Add/Edit Modal */}
      {showAdd&&(
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{background:"rgba(0,0,0,.35)"}} onClick={()=>{setShowAdd(false);setEditStu(null);}}>
          <div onClick={e=>e.stopPropagation()} className="detail-modal bg-sf rounded-2xl w-full p-7 shadow-xl overflow-auto" style={{maxWidth:440,maxHeight:"90vh"}}>
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-bold text-tp">{editStu?"학생 수정":"학생 추가"}</h2>
              <button onClick={()=>{setShowAdd(false);setEditStu(null);}} aria-label="닫기" className="bg-transparent border-none cursor-pointer text-tt flex hover:text-tp transition-colors"><X size={18}/></button>
            </div>
            <div className="flex flex-col gap-3">
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
              ].map(f=>(<Input key={f.k} label={f.l} type={f.type||'text'} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}/>))}
            </div>
            <div className="flex gap-2.5 mt-5 justify-end">
              <Button variant="secondary" onClick={()=>{setShowAdd(false);setEditStu(null);}}>취소</Button>
              <Button disabled={saving} onClick={saveStudent} loading={saving} loadingText={editStu?"저장 중...":"추가 중..."}>{editStu?"저장":"추가"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
