/**
 * Utility functions for session-based payment cycle calculations.
 * Each student has independent cycles based on their completed lesson sequence.
 * Cycle size is configurable per student (sessions_per_cycle, default 8).
 */

export const CYCLE_START_DATE = '2026-04-01';

export function getStudentCycles(lessons, studentId, sessionsPerCycle = 8) {
  const sorted = lessons
    .filter(l => l.student_id === studentId && l.status !== 'cancelled' && l.status !== 'makeup' && (l.date || '') >= CYCLE_START_DATE)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const cycles = [];
  for (let i = 0; i < sorted.length; i += sessionsPerCycle) {
    const chunk = sorted.slice(i, i + sessionsPerCycle);
    cycles.push({
      cycleNumber: Math.floor(i / sessionsPerCycle) + 1,
      startDate: chunk[0].date,
      endDate: chunk.length === sessionsPerCycle ? chunk[chunk.length - 1].date : null,
      sessionCount: chunk.length,
      isComplete: chunk.length === sessionsPerCycle,
    });
  }
  return cycles;
}

// Returns expected start/end dates for a student's current incomplete (or not-yet-started) cycle.
export function getExpectedCycleDates(lessons, studentId, sessionsPerCycle = 8) {
  const sorted = lessons
    .filter(l => l.student_id === studentId && l.status !== 'cancelled' && l.status !== 'makeup' && (l.date || '') >= CYCLE_START_DATE)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return {
    expectedStart: sorted[0]?.date || null,
    expectedEnd: sorted[sessionsPerCycle - 1]?.date || null,
  };
}

export function formatCycleDate(date) {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length < 3) return date;
  return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
}
