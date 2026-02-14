// Shared constants and utilities for StudentDetail tabs
export const C={bg:"#FAFAF9",sf:"#FFFFFF",sfh:"#F5F5F4",bd:"#E7E5E4",bl:"#F0EFED",pr:"#1A1A1A",ac:"#2563EB",al:"#DBEAFE",as:"#EFF6FF",tp:"#1A1A1A",ts:"#78716C",tt:"#A8A29E",su:"#16A34A",sb:"#F0FDF4",dn:"#DC2626",db:"#FEF2F2",wn:"#F59E0B",wb:"#FFFBEB"};
export const SC=[{bg:"#DBEAFE",t:"#1E40AF",b:"#93C5FD"},{bg:"#FCE7F3",t:"#9D174D",b:"#F9A8D4"},{bg:"#D1FAE5",t:"#065F46",b:"#6EE7B7"},{bg:"#FEF3C7",t:"#92400E",b:"#FCD34D"},{bg:"#EDE9FE",t:"#5B21B6",b:"#C4B5FD"},{bg:"#FFE4E6",t:"#9F1239",b:"#FDA4AF"},{bg:"#CCFBF1",t:"#115E59",b:"#5EEAD4"},{bg:"#FEE2E2",t:"#991B1B",b:"#FCA5A5"}];
export const REASON_COLORS=["#2563EB","#DC2626","#F59E0B","#16A34A","#8B5CF6","#EC4899","#06B6D4","#F97316"];

export const p2=n=>String(n).padStart(2,"0");
export const fd=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
export const m2s=m=>`${p2(Math.floor(m/60))}:${p2(m%60)}`;
export const bk=(e,val,set,df)=>{if(e.nativeEvent?.isComposing||e.isComposing)return;const ta=e.target,pos=ta.selectionStart;if(e.key==='*'){const ls=val.lastIndexOf('\n',pos-1)+1;if(val.substring(ls,pos).trim()===''){e.preventDefault();const nv=val.substring(0,ls)+'• '+val.substring(pos);set(nv);df?.();requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=ls+2;});}}if(e.key==='Enter'){const lines=val.substring(0,pos).split('\n'),cl=lines[lines.length-1];if(cl.startsWith('• ')){e.preventDefault();if(cl.trim()==='•'){const ls=pos-cl.length;const nv=val.substring(0,ls)+val.substring(pos);set(nv);df?.();requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=ls;});}else{const nv=val.substring(0,pos)+'\n• '+val.substring(pos);set(nv);df?.();requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=pos+3;});}}}};

export const ls={display:"block",fontSize:12,fontWeight:500,color:C.tt,marginBottom:6};
export const is={width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid "+C.bd,fontSize:14,color:C.tp,background:C.sf,outline:"none",fontFamily:"inherit"};

export const IcBack=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>);

export const CustomTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:12,color:C.tt,marginBottom:4}}>{d.label||d.date}</div><div style={{fontSize:16,fontWeight:700,color:C.ac}}>{d.score}점</div></div>);};
export const ReasonTooltip=({active,payload})=>{if(!active||!payload?.length)return null;const d=payload[0].payload;return(<div style={{background:C.sf,border:"1px solid "+C.bd,borderRadius:10,padding:"8px 12px",boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}><div style={{fontSize:11,color:C.tt,marginBottom:2}}>{d.name}</div><div style={{fontSize:14,fontWeight:700,color:d.fill||C.ac}}>{d.count}문항</div></div>);};
