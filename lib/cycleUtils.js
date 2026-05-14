/**
 * Utility functions for session-based payment cycle calculations.
 * Each student has independent cycles based on their completed lesson sequence.
 * Cycle size is configurable per student (sessions_per_cycle, default 8).
 */

export const CYCLE_START_DATE = '2026-04-01';

export function getStudentCycles(lessons, studentId, sessionsPerCycle = 8, customStartDate = null) {
  if (!sessionsPerCycle) return [];

  const effectiveCustomStart = customStartDate && customStartDate > CYCLE_START_DATE ? customStartDate : null;

  const allSorted = lessons
    .filter(l => l.student_id === studentId && l.status !== 'cancelled' && l.status !== 'makeup' && (l.date || '') >= CYCLE_START_DATE)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const cycles = [];

  if (!effectiveCustomStart) {
    for (let i = 0; i < allSorted.length; i += sessionsPerCycle) {
      const chunk = allSorted.slice(i, i + sessionsPerCycle);
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

  // Custom start date: preserve historical complete cycles, then continue numbering for new cycles.
  // This keeps existing DB keys (cyc-01, cyc-02, ...) stable.
  const historical = allSorted.filter(l => l.date < effectiveCustomStart);
  const fresh = allSorted.filter(l => l.date >= effectiveCustomStart);

  let cycleNum = 0;

  // Only complete historical cycles are preserved (partial ones are treated as pre-history)
  const historicalCompleteCount = Math.floor(historical.length / sessionsPerCycle);
  for (let i = 0; i < historicalCompleteCount * sessionsPerCycle; i += sessionsPerCycle) {
    const chunk = historical.slice(i, i + sessionsPerCycle);
    cycleNum++;
    cycles.push({
      cycleNumber: cycleNum,
      startDate: chunk[0].date,
      endDate: chunk[chunk.length - 1].date,
      sessionCount: chunk.length,
      isComplete: true,
    });
  }

  // New cycles from customStartDate, numbered after historical ones
  for (let i = 0; i < fresh.length; i += sessionsPerCycle) {
    const chunk = fresh.slice(i, i + sessionsPerCycle);
    cycleNum++;
    cycles.push({
      cycleNumber: cycleNum,
      startDate: chunk[0].date,
      endDate: chunk.length === sessionsPerCycle ? chunk[chunk.length - 1].date : null,
      sessionCount: chunk.length,
      isComplete: chunk.length === sessionsPerCycle,
    });
  }

  return cycles;
}

// Returns expected start/end dates for a student's current incomplete (or not-yet-started) cycle.
export function getExpectedCycleDates(lessons, studentId, sessionsPerCycle = 8, customStartDate = null) {
  if (!sessionsPerCycle) return { expectedStart: null, expectedEnd: null };

  const effectiveCustomStart = customStartDate && customStartDate > CYCLE_START_DATE ? customStartDate : null;
  const startDate = effectiveCustomStart || CYCLE_START_DATE;

  const sorted = lessons
    .filter(l => l.student_id === studentId && l.status !== 'cancelled' && l.status !== 'makeup' && (l.date || '') >= startDate)
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
