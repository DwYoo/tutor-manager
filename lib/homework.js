import { supabase } from '@/lib/supabase';

/**
 * 숙제 목록을 DB와 동기화 (삭제/추가/수정)
 * @param {string} lessonId - 수업 ID
 * @param {Array} oldHw - 기존 숙제 목록 (DB 상태)
 * @param {Array} newHw - 새 숙제 목록 (UI 상태)
 * @returns {{ finalHw: Array, error: string|null }}
 */
export async function syncHomework(lessonId, oldHw, newHw) {
  const oldIds = new Set(oldHw.map(h => h.id));
  const toDel = oldHw.filter(h => !newHw.some(n => n.id === h.id));
  const toIns = newHw.filter(h => !oldIds.has(h.id));
  const toUpd = newHw.filter(h => oldIds.has(h.id));

  if (toDel.length) {
    const { error } = await supabase.from('homework').delete().in('id', toDel.map(h => h.id));
    if (error) return { finalHw: oldHw, error: '숙제 삭제 실패: ' + error.message };
  }

  let inserted = [];
  if (toIns.length) {
    const { data, error } = await supabase
      .from('homework')
      .insert(toIns.map(h => ({
        lesson_id: lessonId,
        title: h.title,
        completion_pct: h.completion_pct || 0,
        note: h.note || ""
      })))
      .select();
    if (error) return { finalHw: [...oldHw.filter(h => newHw.some(n => n.id === h.id))], error: '숙제 추가 실패: ' + error.message };
    inserted = data || [];
  }

  const updated = [];
  for (const h of toUpd) {
    const { error } = await supabase
      .from('homework')
      .update({ title: h.title, completion_pct: h.completion_pct || 0, note: h.note || "" })
      .eq('id', h.id);
    if (error) return { finalHw: [...updated, ...toUpd.filter(x => !updated.some(u => u.id === x.id)), ...inserted], error: '숙제 수정 실패: ' + error.message };
    updated.push(h);
  }

  return { finalHw: [...toUpd, ...inserted], error: null };
}
