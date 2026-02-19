/** Tuition entity types */

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface TuitionRecord {
  id: string;
  student_id: string;
  month: string; // YYYY-MM format
  amount: number; // paid amount
  fee_override?: number | null;
  classes_override?: number | null;
  carryover?: number;
  status: PaymentStatus;
  paid_date?: string | null;
  cash_receipt?: boolean;
  memo?: string;
  user_id: string;
  created_at: string;
}

export interface ReceiptFile {
  id: string;
  month: string;
  file_name: string;
  file_url: string;
  user_id: string;
  created_at: string;
}

export interface ReceiptFormData {
  name: string;
  subject: string;
  serialNo: string;
  period: string;
  regNo: string;
  birthDate: string;
  tutorName: string;
  issueYear: string;
  issueMonth: string;
  issueDay: string;
  etcLabel1: string;
  etcLabel2: string;
  etcAmount1: number;
  etcAmount2: number;
  tutionFee: number;
}
