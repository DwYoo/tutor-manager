import { describe, it, expect } from 'vitest';
import { lessonOnDate, fd, p2, m2s, s5, sdy, gwd } from '@/lib/utils';

describe('p2 (zero-pad)', () => {
  it('1자리 숫자를 2자리로 패딩', () => {
    expect(p2(5)).toBe('05');
    expect(p2(0)).toBe('00');
  });
  it('2자리 숫자는 그대로', () => {
    expect(p2(12)).toBe('12');
    expect(p2(99)).toBe('99');
  });
});

describe('fd (formatDate)', () => {
  it('YYYY-MM-DD 형식으로 변환', () => {
    expect(fd(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(fd(new Date(2025, 11, 31))).toBe('2025-12-31');
  });
});

describe('m2s (minutes to time string)', () => {
  it('분을 HH:MM 형식으로 변환', () => {
    expect(m2s(90)).toBe('01:30');
    expect(m2s(0)).toBe('00:00');
    expect(m2s(600)).toBe('10:00');
    expect(m2s(1439)).toBe('23:59');
  });
});

describe('s5 (snap to nearest 5)', () => {
  it('5분 단위로 반올림', () => {
    expect(s5(7)).toBe(5);
    expect(s5(8)).toBe(10);
    expect(s5(0)).toBe(0);
    expect(s5(62)).toBe(60);
  });
});

describe('sdy (same day)', () => {
  it('같은 날이면 true', () => {
    expect(sdy(new Date(2025, 2, 10), new Date(2025, 2, 10))).toBe(true);
  });
  it('다른 날이면 false', () => {
    expect(sdy(new Date(2025, 2, 10), new Date(2025, 2, 11))).toBe(false);
  });
  it('같은 날 다른 시간이면 true', () => {
    const a = new Date(2025, 2, 10, 9, 0);
    const b = new Date(2025, 2, 10, 18, 30);
    expect(sdy(a, b)).toBe(true);
  });
});

describe('gwd (get week dates)', () => {
  it('월~일 7일 배열 반환', () => {
    const wk = gwd(new Date(2025, 2, 12)); // Wednesday
    expect(wk).toHaveLength(7);
    expect(wk[0].getDay()).toBe(1); // Monday
    expect(wk[6].getDay()).toBe(0); // Sunday
  });
  it('일요일 입력 시에도 해당 주의 월요일부터', () => {
    const wk = gwd(new Date(2025, 2, 16)); // Sunday
    expect(wk).toHaveLength(7);
    expect(wk[0].getDay()).toBe(1); // Monday
    expect(fd(wk[0])).toBe('2025-03-10');
  });
});

describe('lessonOnDate', () => {
  it('단일 수업이 해당 날짜에 매칭', () => {
    const lesson = { date: '2025-03-10', is_recurring: false };
    expect(lessonOnDate(lesson, new Date(2025, 2, 10))).toBe(true);
  });

  it('단일 수업이 다른 날짜에 매칭 안됨', () => {
    const lesson = { date: '2025-03-10', is_recurring: false };
    expect(lessonOnDate(lesson, new Date(2025, 2, 11))).toBe(false);
  });

  it('반복 수업이 같은 요일에 매칭 (월요일)', () => {
    const lesson = { date: '2025-03-10', is_recurring: true, recurring_day: 1 };
    // 2025-03-17 is also Monday
    expect(lessonOnDate(lesson, new Date(2025, 2, 17))).toBe(true);
  });

  it('반복 수업이 다른 요일에 매칭 안됨', () => {
    const lesson = { date: '2025-03-10', is_recurring: true, recurring_day: 1 };
    // Tuesday
    expect(lessonOnDate(lesson, new Date(2025, 2, 18))).toBe(false);
  });

  it('반복 수업이 시작일 이전에 매칭 안됨', () => {
    const lesson = { date: '2025-03-10', is_recurring: true, recurring_day: 1 };
    // 2025-03-03 is Monday but before start date
    expect(lessonOnDate(lesson, new Date(2025, 2, 3))).toBe(false);
  });

  it('반복 수업 종료일 이후 매칭 안됨', () => {
    const lesson = {
      date: '2025-03-10',
      is_recurring: true,
      recurring_day: 1,
      recurring_end_date: '2025-03-20'
    };
    // 2025-03-24 is Monday but after end date
    expect(lessonOnDate(lesson, new Date(2025, 2, 24))).toBe(false);
  });

  it('반복 수업 예외일에 매칭 안됨', () => {
    const lesson = {
      date: '2025-03-10',
      is_recurring: true,
      recurring_day: 1,
      recurring_exceptions: ['2025-03-17']
    };
    expect(lessonOnDate(lesson, new Date(2025, 2, 17))).toBe(false);
  });

  it('반복 수업 예외일이 아닌 날은 정상 매칭', () => {
    const lesson = {
      date: '2025-03-10',
      is_recurring: true,
      recurring_day: 1,
      recurring_exceptions: ['2025-03-17']
    };
    // 2025-03-24 is Monday and not in exceptions
    expect(lessonOnDate(lesson, new Date(2025, 2, 24))).toBe(true);
  });

  it('반복 수업 시작일 당일에 매칭', () => {
    const lesson = { date: '2025-03-10', is_recurring: true, recurring_day: 1 };
    expect(lessonOnDate(lesson, new Date(2025, 2, 10))).toBe(true);
  });

  it('일요일 반복 수업 (recurring_day=7)', () => {
    const lesson = { date: '2025-03-09', is_recurring: true, recurring_day: 7 };
    // 2025-03-16 is Sunday
    expect(lessonOnDate(lesson, new Date(2025, 2, 16))).toBe(true);
  });
});
