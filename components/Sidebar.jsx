'use client';
import { C } from '@/components/Colors';

const IcDash=()=>(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>);
const IcCal=()=>(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
const IcStu=()=>(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>);
const IcFee=()=>(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>);
const IcLogout=()=>(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>);
const IcX=()=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);

const ICONS={dashboard:IcDash,schedule:IcCal,students:IcStu,tuition:IcFee};

export default function Sidebar({nav,page,onNav,onClose,isDesktop,user,onSignOut}){
  return(
    <div style={{width:240,background:C.sf,borderRight:"1px solid "+C.bd,display:"flex",flexDirection:"column",height:"100%",flexShrink:0}}>
      {/* Logo */}
      <div style={{padding:"24px 20px 20px",borderBottom:"1px solid "+C.bl}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg, "+C.ac+", #1D4ED8)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(37,99,235,.25)"}}>
              <span style={{color:"#fff",fontSize:18,fontWeight:800}}>T</span>
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.tp,letterSpacing:"-0.3px"}}>과외 매니저</div>
              <div style={{fontSize:11,color:C.tt,marginTop:1}}>선생님 포털</div>
            </div>
          </div>
          {!isDesktop && (
            <button onClick={onClose} aria-label="메뉴 닫기" style={{background:"none",border:"none",cursor:"pointer",color:C.tt,display:"flex",padding:13,borderRadius:10,minWidth:44,minHeight:44,alignItems:"center",justifyContent:"center"}}>
              <IcX/>
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="주 메뉴" style={{flex:1,padding:"16px 12px",display:"flex",flexDirection:"column",gap:2}}>
        <div style={{fontSize:11,fontWeight:600,color:C.tt,textTransform:"uppercase",letterSpacing:"0.5px",padding:"4px 16px 8px"}}>메뉴</div>
        {nav.map(function(n){
          var active=page===n.id||(page==="student-detail"&&n.id==="students");
          var Icon=ICONS[n.id];
          return(
            <button key={n.id} className={"sb-item"+(active?" active":"")} aria-current={active?"page":undefined} onClick={function(){onNav(n.id);}}>
              {Icon && <Icon/>}
              <span>{n.l}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: User profile first, then logout */}
      <div style={{padding:12,borderTop:"1px solid "+C.bl}}>
        {user && (
          <div style={{padding:"12px 16px",background:C.sfh,borderRadius:12,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg, #6366F1, #8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{color:"#fff",fontSize:11,fontWeight:700}}>{(user.email||"?")[0].toUpperCase()}</span>
              </div>
              <div style={{minWidth:0}}>
                <div title={(user.user_metadata&&user.user_metadata.full_name)||(user.email?user.email.split("@")[0]:"")||"선생님"} style={{fontSize:12,fontWeight:600,color:C.tp,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(user.user_metadata&&user.user_metadata.full_name)||(user.email?user.email.split("@")[0]:"")||"선생님"}</div>
                <div title={user.email||""} style={{fontSize:11,color:C.tt,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email||""}</div>
              </div>
            </div>
          </div>
        )}
        <button className="sb-item" style={{color:C.tt}} onClick={onSignOut}>
          <IcLogout/>
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
}
