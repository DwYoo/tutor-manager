/** Lesson entity types */

export type LessonStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'makeup';

export interface Lesson {
  id: string;
  student_id: string | null; // null = personal event
  date: string; // YYYY-MM-DD
  start_hour: number;
  start_min: number;
  duration: number; // minutes
  subject: string;
  topic?: string;
  content?: string;
  feedback?: string;
  private_memo?: string;
  plan_shared?: string;
  plan_private?: string;
  status: LessonStatus;
  is_recurring: boolean;
  recurring_day?: number | null; // 1=Mon, 7=Sun
  recurring_end_date?: string | null;
  recurring_exceptions?: string[]; // dates to skip
  user_id: string;
  homework?: HomeworkItem[];
  files?: FileRecord[];
}

/** ViewModel for LessonDetailModal (with shorthand fields) */
export interface LessonViewModel extends Lesson {
  sh: number; // start_hour alias
  sm: number; // start_min alias
  dur: number; // duration alias
  sub: string; // subject alias
  top: string; // topic alias
  rep: boolean; // is_recurring alias
  tMemo: string; // private_memo alias
  hw: HomeworkItem[];
}

export interface HomeworkItem {
  id: string;
  lesson_id: string;
  title: string;
  completion_pct: number;
  sort_order?: number;
}

export interface FileRecord {
  id: string;
  student_id?: string;
  lesson_id?: string | null;
  file_name: string;
  file_type: 'pdf' | 'img' | 'file';
  file_url: string;
  user_id: string;
  created_at: string;
}

export interface LessonFormData {
  student_id: string | null;
  date: string;
  start_hour: number;
  start_min: number;
  duration: number;
  subject: string;
  topic?: string;
  is_recurring: boolean;
  recurring_day?: number | null;
}
