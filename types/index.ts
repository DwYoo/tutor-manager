/**
 * Central type exports.
 *
 * Usage:
 *   import type { Student, Lesson, TuitionRecord, Score } from '@/types';
 */

export type { Student, SharePermissions, StudentFormData } from './student';
export type { Lesson, LessonViewModel, HomeworkItem, FileRecord, LessonFormData, LessonStatus } from './lesson';
export type { TuitionRecord, ReceiptFile, ReceiptFormData, PaymentStatus } from './tuition';
export type { Score, WrongAnswer, Textbook, Report, StudyPlan } from './score';
