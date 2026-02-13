'use client'

const DK = ['월', '화', '수', '목', '금', '토', '일']
const p2 = n => String(n).padStart(2, '0')

export default function CalendarTab({ lessons, student, col }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push({ d: null })
  for (let i = 1; i <= daysInMonth; i++) {
    const ds = `${year}-${p2(month + 1)}-${p2(i)}`
    const dayLessons = lessons.filter(l => l.date === ds)
    cells.push({ d: i, lessons: dayLessons })
  }
  const rem = 42 - cells.length
  for (let i = 0; i < rem; i++) cells.push({ d: null })

  return (
    <div>
      <h3 className="text-base font-bold text-tp mb-4">
        {student.name} 수업 일정 · {year}년 {month + 1}월
      </h3>
      <div className="bg-sf border border-bd rounded-[14px] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-bd">
          {DK.map(d => (
            <div key={d} className="p-2.5 text-center text-xs font-medium text-tt">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => (
            <div
              key={i}
              className="min-h-[52px] md:min-h-[72px] p-1 md:p-1.5"
              style={{
                borderBottom: '1px solid #F0EFED',
                borderRight: (i + 1) % 7 ? '1px solid #F0EFED' : 'none',
                opacity: c.d ? 1 : 0.3,
              }}
            >
              {c.d && (
                <div>
                  <div className={`text-[13px] mb-1 ${c.d === now.getDate() ? 'font-bold text-ac' : 'text-tp'}`}>{c.d}</div>
                  {c.lessons?.map(l => (
                    <div
                      key={l.id}
                      className="text-[9px] md:text-[10px] px-1 py-0.5 rounded font-medium mb-0.5 truncate"
                      style={{ background: col.bg, color: col.t }}
                    >
                      {p2(l.start_hour || 0)}:{p2(l.start_min || 0)} {l.topic || l.subject}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}