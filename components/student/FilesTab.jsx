'use client'

export default function FilesTab({ files }) {
  if (files.length === 0) {
    return (
      <div>
        <h3 className="text-base font-bold text-tp mb-4">자료실</h3>
        <div className="bg-sf border border-bd rounded-[14px] p-10 text-center text-tt">
          <div className="text-base mb-2">📂</div>
          <div className="text-sm">아직 등록된 자료가 없습니다</div>
          <div className="text-xs mt-1">수업 상세 → 자료 탭에서 추가할 수 있습니다.</div>
        </div>
      </div>
    )
  }

  const topics = [...new Set(files.map(f => f.lesson_topic))]

  return (
    <div>
      <h3 className="text-base font-bold text-tp mb-4">자료실</h3>
      {topics.map(topic => {
        const items = files.filter(f => f.lesson_topic === topic)
        return (
          <div key={topic} className="mb-4">
            <div className="text-[13px] font-semibold text-tp mb-2 flex items-center gap-2">
              <span>{topic}</span>
              <span className="text-[10px] text-tt">({items[0]?.lesson_date})</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {items.map(f => {
                const icon = f.file_type === 'pdf' ? '📄' : f.file_type === 'img' ? '🖼️' : '📎'
                return (
                  <div key={f.id} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-sf border border-bd rounded-[10px]">
                    <span className="text-lg">{icon}</span>
                    <span className="text-[13px] font-medium text-tp flex-1">{f.file_name}</span>
                    <span className="text-[10px] text-tt bg-sfh px-2 py-0.5 rounded">{f.file_type}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}