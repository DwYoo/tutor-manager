/** Shared utility functions used across components */

/** Pad number to 2 digits */
export const p2 = n => String(n).padStart(2, "0");

/** Format Date to YYYY-MM-DD */
export const fd = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Minutes to HH:MM string */
export const m2s = m => `${p2(Math.floor(m / 60))}:${p2(m % 60)}`;

/** Day-of-week labels (Sun-first) */
export const DK = ["일", "월", "화", "수", "목", "금", "토"];

/** Day-of-week labels (Mon-first) */
export const DKS = ["월", "화", "수", "목", "금", "토", "일"];

/** Get week dates (Mon~Sun) from a base date */
export const gwd = base => {
  const d = new Date(base), dy = d.getDay(), df = dy === 0 ? -6 : 1 - dy, m = new Date(d);
  m.setDate(d.getDate() + df);
  return Array.from({ length: 7 }, (_, i) => { const t = new Date(m); t.setDate(m.getDate() + i); return t; });
};

/** Snap minutes to nearest 5 */
export const s5 = m => Math.round(m / 5) * 5;

/** Check if two dates are the same day */
export const sdy = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Insert text into a textarea using execCommand for proper undo support */
export const insertViaExec = (ta, text, selStart, selEnd) => {
  ta.focus();
  ta.setSelectionRange(selStart, selEnd);
  document.execCommand('insertText', false, text);
};

/** Bullet-key handler for textareas (* → bullet, Enter continues bullets) */
export const bk = (e, val, set, df) => {
  if (e.nativeEvent?.isComposing || e.isComposing) return;
  const ta = e.target, pos = ta.selectionStart;
  if (e.key === '*') {
    const ls = val.lastIndexOf('\n', pos - 1) + 1;
    if (val.substring(ls, pos).trim() === '') {
      e.preventDefault();
      insertViaExec(ta, '• ', ls, pos);
      set(ta.value); df?.();
    }
  }
  if (e.key === 'Enter') {
    const lines = val.substring(0, pos).split('\n'), cl = lines[lines.length - 1];
    if (cl.startsWith('• ')) {
      e.preventDefault();
      if (cl.trim() === '•') {
        const ls = pos - cl.length;
        insertViaExec(ta, '', ls, pos);
        set(ta.value); df?.();
      } else {
        insertViaExec(ta, '\n• ', pos, pos);
        set(ta.value); df?.();
      }
    }
  }
};

/** Check if a lesson falls on a given date (handles recurring) */
export const lessonOnDate = (l, date) => {
  const ds = fd(date), dw = date.getDay() === 0 ? 7 : date.getDay();
  const ld = (l.date || "").slice(0, 10);
  if (l.is_recurring && l.recurring_exceptions && l.recurring_exceptions.includes(ds)) return false;
  if (ld === ds) return true;
  if (l.is_recurring && +l.recurring_day === dw) {
    if (ds < ld) return false;
    if (l.recurring_end_date && ds >= (l.recurring_end_date + "").slice(0, 10)) return false;
    return true;
  }
  return false;
};

/** Pre-aggregate lesson counts per student for a given year/month.
 *  Returns { [student_id]: number } */
export const buildLessonCountMap = (lessons, year, month) => {
  const map = {};
  const dim = new Date(year, month, 0).getDate();
  const monthPrefix = year + "-" + p2(month);
  // Separate one-off vs recurring for efficiency
  const oneOff = [];
  const recurring = [];
  for (const l of lessons) {
    if (l.status === 'cancelled') continue;
    if (l.is_recurring) recurring.push(l);
    else oneOff.push(l);
  }
  // Count one-off lessons that fall in this month
  for (const l of oneOff) {
    const ld = (l.date || "").slice(0, 10);
    if (ld.startsWith(monthPrefix)) {
      map[l.student_id] = (map[l.student_id] || 0) + 1;
    }
  }
  // Count recurring lessons day by day (only iterate recurring ones)
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, month - 1, d);
    const ds = fd(date);
    const dw = date.getDay() === 0 ? 7 : date.getDay();
    for (const l of recurring) {
      const ld = (l.date || "").slice(0, 10);
      // Check exceptions
      if (l.recurring_exceptions && l.recurring_exceptions.includes(ds)) continue;
      // Exact date match (the recurring lesson's own date)
      if (ld === ds) {
        map[l.student_id] = (map[l.student_id] || 0) + 1;
        continue;
      }
      // Recurring day match
      if (+l.recurring_day === dw) {
        if (ds < ld) continue;
        if (l.recurring_end_date && ds >= (l.recurring_end_date + "").slice(0, 10)) continue;
        map[l.student_id] = (map[l.student_id] || 0) + 1;
      }
    }
  }
  return map;
};
