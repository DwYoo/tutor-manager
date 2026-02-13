'use client'

export default function PlanTab() {
  return (
    <div>
      <h3 className="text-base font-bold text-tp mb-4">학습 계획</h3>
      <div className="bg-sf border border-bd rounded-[14px] p-5 mb-4">
        <div className="text-sm font-semibold text-ac mb-2.5">🧭 학업 전략</div>
        <div className="text-[13px] text-ts leading-7">
          단기: 3월 모의고사 90점+. 미적분 마무리 후 기출 전환. 취약 주 1회 보충.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="rounded-[14px] p-4 bg-sb border border-[#BBF7D0]">
          <div className="text-[13px] font-semibold text-su mb-1.5">💪 강점</div>
          <div className="text-xs text-[#166534]">논리적 사고력, 서술형</div>
        </div>
        <div className="rounded-[14px] p-4 bg-db border border-[#FECACA]">
          <div className="text-[13px] font-semibold text-dn mb-1.5">🔧 보완점</div>
          <div className="text-xs text-[#991B1B]">계산 실수, 시간 관리</div>
        </div>
      </div>
      <div className="bg-sf border border-bd rounded-[14px] p-5">
        <div className="text-sm font-semibold text-tp mb-2.5">🎯 로드맵</div>
        {['3월: 미적분 완성', '4월: 확률과통계', '5~6월: 기출 집중', '7~8월: 취약 보강'].map((r, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full border-2 border-ac ${i === 0 ? 'bg-ac' : 'bg-al'}`} />
            <span className={`text-[13px] ${i === 0 ? 'text-tp font-semibold' : 'text-ts'}`}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  )
}