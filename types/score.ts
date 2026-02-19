/** Score and wrong answer types */

export interface Score {
  id: string;
  student_id: string;
  score?: number | null;
  grade?: number | null;
  date: string;
  label?: string;
  user_id: string;
  created_at: string;
}

export interface WrongAnswer {
  id: string;
  student_id: string;
  book: string;
  chapter?: string;
  problem_num: string;
  reason?: string;
  note?: string;
  user_id: string;
  created_at: string;
}

export interface Textbook {
  id: string;
  student_id: string;
  title: string;
  publisher?: string;
  subject?: string;
  chapters?: string[];
  user_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  student_id: string;
  title: string;
  body?: string;
  is_shared: boolean;
  type?: 'plan' | null;
  date: string;
  user_id: string;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  student_id: string;
  title: string;
  body?: string;
  is_shared: boolean;
  date: string;
  user_id: string;
  created_at: string;
}
