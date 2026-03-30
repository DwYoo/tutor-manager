/**
 * Utility functions for 8-session payment cycle calculations.
 * Each student has independent cycles based on their completed lesson sequence.
 */

/**
 * Calculate all 8-session cycles for a student based on their lesson history.
 * Lessons are sorted chronologically; every 8 non-cancelled lessons form one cycle.
 *
 * @param {Array} lessons - All lessons (from DB)
 * @param {string} studentId - Student ID to calculate cycles for
 * @returns {Array<{cycleNumber, startDate, endDate, sessionCount, isComplete}>}
 */
export const CYCLE_START_DATE = '2026-04-01';

export function getStudentCycles(lessons, studentId) {
  const sorted = lessons
    .filter(l => l.student_id === studentId && l.status !== 'cancelled' && l.status !== 'makeup' && (l.date || '') >= CYCLE_START_DATE)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const cycles = [];
  for (let i = 0; i < sorted.length; i += 8) {
    const chunk = sorted.slice(i, i + 8);
    cycles.push({
      cycleNumber: Math.floor(i / 8) + 1,
      startDate: chunk[0].date,
      endDate: chunk.length === 8 ? chunk[7].date : null,
      sessionCount: chunk.length,
      isComplete: chunk.length === 8,
    });
  }
  return cycles;
}

/**
 * Format a YYYY-MM-DD date string to a short YY.MM.DD display format.
 * Returns empty string if date is null/undefined.
 *
 * @param {string|null} date - YYYY-MM-DD
 * @returns {string} YY.MM.DD
 */
// Returns expected start/end dates for a student's first (or current incomplete) cycle
// based on all scheduled sessions from CYCLE_START_DATE onwards.
export function getExpectedCycleDates(lessons, studentId) {
  const sorted = lessons
    .filter(l => l.student_id === studentId && l.status !== 'cancelled' && l.status !== 'makeup' && (l.date || '') >= CYCLE_START_DATE)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return {
    expectedStart: sorted[0]?.date || null,
    expectedEnd: sorted[7]?.date || null,
  };
}

export function formatCycleDate(date) {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length < 3) return date;
  return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
}
