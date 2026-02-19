/**
 * Shared lesson data transformation and helpers.
 * Replaces the duplicated mkLes() across Dashboard, Schedule, and StudentDetail.
 */

/**
 * Transform a lesson record from DB format to the format expected by LessonDetailModal.
 * @param {Object} l - Lesson from database
 * @returns {Object} Lesson with shorthand fields for LessonDetailModal
 */
export function toLessonViewModel(l) {
  return {
    ...l,
    sh: l.start_hour,
    sm: l.start_min,
    dur: l.duration,
    sub: l.subject,
    top: l.topic,
    rep: l.is_recurring,
    tMemo: l.private_memo || "",
    hw: l.homework || [],
    files: l.files || [],
    planShared: l.plan_shared || "",
    planPrivate: l.plan_private || "",
    content: l.content || "",
    feedback: l.feedback || "",
  };
}
