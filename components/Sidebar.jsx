const IcDash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IcCal = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcStu = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
const IcFee = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
const IcSetting = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>

const ICONS = { dashboard: IcDash, schedule: IcCal, students: IcStu, tuition: IcFee }

export default function Sidebar({ nav, page, onNav, onClose, isDesktop }) {
  return (
    <div className="w-[220px] bg-sf border-r border-bd flex flex-col h-screen" style={{ position: isDesktop ? 'sticky' : 'relative', top: 0 }}>
      <div className="p-4 border-b border-bl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-ac flex items-center justify-center">
            <span className="text-white text-base font-bold">T</span>
          </div>
          <div>
            <div className="text-[15px] font-bold text-tp">과외 매니저</div>
            <div className="text-[10px] text-tt">선생님 포털</div>
          </div>
        </div>
        {!isDesktop && (
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-tt flex p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      <nav className="flex-1 p-2">
        {nav.map(n => {
          const active = page === n.id || (page === 'student-detail' && n.id === 'students')
          const Icon = ICONS[n.id]
          return (
            <button
              key={n.id}
              onClick={() => onNav(n.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] border-none text-[13px] cursor-pointer mb-0.5 transition-colors
                ${active ? 'bg-as text-ac font-semibold' : 'bg-transparent text-ts font-normal hover:bg-sfh'}`}
            >
              {Icon && <Icon />}
              {n.l}
            </button>
          )
        })}
      </nav>

      <div className="p-2 border-t border-bl">
        <button className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] border-none bg-transparent text-ts text-[13px] cursor-pointer hover:bg-sfh">
          <IcSetting />설정
        </button>
      </div>
    </div>
  )
}