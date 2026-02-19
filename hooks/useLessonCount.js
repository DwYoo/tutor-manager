'use client';
import { useMemo } from 'react';
import { lessonOnDate } from '@/lib/utils';

/**
 * Shared hook for counting lessons per student per month.
 * Replaces the duplicated O(days * lessons) countLessons logic in Dashboard and Tuition.
 *
 * Pre-computes a Map for O(1) lookups instead of recalculating on every render.
 *
 * @param {Array} lessons - All lessons
 * @param {number} year - Year to count for
 * @param {number} month - Month to count for (1-indexed)
 * @returns {Function} countLessons(studentId) - Returns count for the given student
 */
export function useLessonCount(lessons, year, month) {
  const countMap = useMemo(() => {
    const map = new Map();
    if (!lessons?.length) return map;

    const daysInMonth = new Date(year, month, 0).getDate();

    // Build per-student counts
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month - 1, d);
      for (const l of lessons) {
        if (l.status === 'cancelled') continue;
        if (!lessonOnDate(l, dt)) continue;
        const sid = l.student_id;
        map.set(sid, (map.get(sid) || 0) + 1);
      }
    }

    return map;
  }, [lessons, year, month]);

  return (studentId) => countMap.get(studentId) || 0;
}
