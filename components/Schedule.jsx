'use client'

export default function Schedule({ menuBtn }) {
  return (
    <div className="p-4 md:p-7">
      <div className="flex items-center gap-3 mb-6">
        {menuBtn}
        <h1 className="text-lg md:text-xl font-bold text-tp">수업 일정</h1>
      </div>
      <div className="bg-sf border border-bd rounded-[14px] p-10 text-center text-ts">
        <div className="text-4xl mb-4">📅</div>
        <div className="text-base font-semibold text-tp mb-2">수업 일정 (준비 중)</div>
        <div className="text-sm">주간 타임테이블이 여기에 표시됩니다.</div>
      </div>
    </div>
  )
}