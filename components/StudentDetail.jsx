'use client'

export default function StudentDetail({ student, onBack, menuBtn }) {
  if (!student) return null

  return (
    <div className="p-4 md:p-7">
      <div className="flex items-center gap-3 mb-6">
        {menuBtn}
        <button onClick={onBack} className="text-ts bg-transparent border-none cursor-pointer flex items-center gap-1 text-sm hover:text-tp">
          ← 뒤로
        </button>
        <h1 className="text-lg md:text-xl font-bold text-tp">{student.name}</h1>
      </div>
      <div className="bg-sf border border-bd rounded-[14px] p-10 text-center text-ts">
        <div className="text-4xl mb-4">👤</div>
        <div className="text-base font-semibold text-tp mb-2">학생 상세 (준비 중)</div>
        <div className="text-sm">타임라인, 숙제, 성적 등이 여기에 표시됩니다.</div>
      </div>
    </div>
  )
}