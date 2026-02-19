'use client';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { syncHomework } from '@/lib/homework';

/**
 * Shared hook for updating lesson details.
 * Eliminates the duplicated updDetail logic across Dashboard, Schedule, and StudentDetail.
 *
 * @param {Function} setLessons - State setter for lessons array
 * @param {Function} toast - Toast notification function
 * @param {Function} [onSuccess] - Optional callback after successful update
 * @returns {Function} updDetail(id, data) - Async function to update a lesson
 */
export function useLessonUpdate(lessons, setLessons, toast, onSuccess) {
  return useCallback(async (id, data) => {
    const u = {};
    if (data.top !== undefined) u.topic = data.top;
    if (data.content !== undefined) u.content = data.content;
    if (data.feedback !== undefined) u.feedback = data.feedback;
    if (data.tMemo !== undefined) u.private_memo = data.tMemo;
    if (data.planShared !== undefined) u.plan_shared = data.planShared;
    if (data.planPrivate !== undefined) u.plan_private = data.planPrivate;

    if (Object.keys(u).length) {
      const { error } = await supabase.from('lessons').update(u).eq('id', id);
      if (error) {
        toast?.('수업 정보 저장에 실패했습니다', 'error');
        return;
      }
    }

    const les = lessons.find(l => l.id === id);
    const { finalHw, error: hwErr } = await syncHomework(id, les?.homework || [], data.hw || []);
    if (hwErr) toast?.(hwErr, 'error');

    // Update local state
    setLessons(p => p.map(l =>
      l.id === id ? { ...l, ...u, homework: finalHw, files: data.files || l.files } : l
    ));

    toast?.('수업 정보가 저장되었습니다');
    onSuccess?.();
  }, [lessons, setLessons, toast, onSuccess]);
}
