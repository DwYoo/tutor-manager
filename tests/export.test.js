import { describe, it, expect } from 'vitest';
import { generateMonthlySummary } from '@/lib/export';

describe('generateMonthlySummary', () => {
  const baseLessons = [
    { date: '2026-02-03', subject: '수학', topic: '미적분', content: '미분 기초', homework: [{ id: '1', completion_pct: 100 }] },
    { date: '2026-02-10', subject: '수학', topic: '적분', content: '적분 기초', homework: [{ id: '2', completion_pct: 50 }] },
    { date: '2026-02-17', subject: '수학', topic: '미적분', content: '', homework: [] },
    { date: '2026-01-15', subject: '수학', topic: '함수', content: '함수 정리', homework: [] },
  ];
  const baseScores = [
    { date: '2026-02-05', score: 85 },
    { date: '2026-02-12', score: 90 },
  ];

  it('해당 월 수업만 카운트', () => {
    const r = generateMonthlySummary({ lessons: baseLessons, scores: baseScores, year: 2026, month: 2 });
    expect(r.totalClasses).toBe(3);
  });

  it('기록 완료 수업 카운트 (content가 비어있지 않은 것)', () => {
    const r = generateMonthlySummary({ lessons: baseLessons, scores: baseScores, year: 2026, month: 2 });
    expect(r.completedLessons).toBe(2);
  });

  it('고유 주제 추출', () => {
    const r = generateMonthlySummary({ lessons: baseLessons, scores: baseScores, year: 2026, month: 2 });
    expect(r.topics).toContain('미적분');
    expect(r.topics).toContain('적분');
    expect(r.topics.length).toBe(2);
  });

  it('월 평균 점수 계산', () => {
    const r = generateMonthlySummary({ lessons: baseLessons, scores: baseScores, year: 2026, month: 2 });
    expect(r.avgScore).toBe(88); // (85+90)/2
  });

  it('숙제 완료율 계산', () => {
    const hw = [
      { id: '1', completion_pct: 100, lesDate: '2026-02-03' },
      { id: '2', completion_pct: 50, lesDate: '2026-02-10' },
    ];
    const r = generateMonthlySummary({ lessons: baseLessons, scores: baseScores, homework: hw, year: 2026, month: 2 });
    expect(r.hwRate).toBe(50); // 1 out of 2 is 100%
  });

  it('수업이 없는 월은 0 반환', () => {
    const r = generateMonthlySummary({ lessons: baseLessons, scores: [], year: 2026, month: 5 });
    expect(r.totalClasses).toBe(0);
    expect(r.avgScore).toBeNull();
    expect(r.hwRate).toBeNull();
  });

  it('summary 텍스트 생성', () => {
    const r = generateMonthlySummary({ lessons: baseLessons, scores: baseScores, year: 2026, month: 2 });
    expect(r.summary).toContain('2026년 2월 학습 요약');
    expect(r.summary).toContain('총 수업: 3회');
    expect(r.summary).toContain('평균 점수: 88점');
  });
});
