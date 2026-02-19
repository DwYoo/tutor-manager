/** Student entity types */

export interface Student {
  id: string;
  name: string;
  subject: string;
  grade: string;
  school?: string;
  birth_date?: string;
  phone?: string;
  parent_phone?: string;
  color_index?: number;
  sort_order?: number;
  archived?: boolean;
  fee_per_class?: number;
  fee_status?: string;
  share_token?: string | null;
  share_token_expires_at?: string | null;
  share_permissions?: SharePermissions;
  // SWOT / Plan fields
  plan_strategy?: string;
  plan_strength?: string;
  plan_weakness?: string;
  plan_opportunity?: string;
  plan_threat?: string;
  plan_strategy_private?: string;
  plan_strength_private?: string;
  plan_weakness_private?: string;
  plan_opportunity_private?: string;
  plan_threat_private?: string;
  score_goal?: number | null;
  user_id: string;
  created_at: string;
}

export interface SharePermissions {
  homework_edit?: boolean;
  homework_view?: boolean;
  scores_view?: boolean;
  lessons_view?: boolean;
  wrong_view?: boolean;
  files_view?: boolean;
  reports_view?: boolean;
  plans_view?: boolean;
}

export interface StudentFormData {
  name: string;
  grade: string;
  birth_date?: string;
  subject: string;
  school?: string;
  phone?: string;
  parent_phone?: string;
  fee_per_class?: number;
}
