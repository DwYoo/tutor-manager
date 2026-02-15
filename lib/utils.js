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

/** Bullet-key handler for textareas (* → bullet, Enter continues bullets) */
export const bk = (e, val, set, df) => {
  if (e.nativeEvent?.isComposing || e.isComposing) return;
  const ta = e.target, pos = ta.selectionStart;
  if (e.key === '*') {
    const ls = val.lastIndexOf('\n', pos - 1) + 1;
    if (val.substring(ls, pos).trim() === '') {
      e.preventDefault();
      const nv = val.substring(0, ls) + '• ' + val.substring(pos);
      set(nv); df?.();
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = ls + 2; });
    }
  }
  if (e.key === 'Enter') {
    const lines = val.substring(0, pos).split('\n'), cl = lines[lines.length - 1];
    if (cl.startsWith('• ')) {
      e.preventDefault();
      if (cl.trim() === '•') {
        const ls = pos - cl.length;
        const nv = val.substring(0, ls) + val.substring(pos);
        set(nv); df?.();
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = ls; });
      } else {
        const nv = val.substring(0, pos) + '\n• ' + val.substring(pos);
        set(nv); df?.();
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = pos + 3; });
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
