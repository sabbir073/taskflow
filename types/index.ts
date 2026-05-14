export * from "./database";

// ===== API Response Types =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

// ===== Auth Types =====

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: import("./database").UserRole;
  status: import("./database").UserStatus;
  is_approved: boolean;
}

// ===== Form Data Types =====

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Per-item config the admin fills when creating a bundle task. One of these
// per checked task_type. The "legacy" single-task path uses items.length === 1.
export interface TaskBundleItemInput {
  task_type_id: number;
  points: number;
  proof_type: import("./database").ProofType;
  item_data: Record<string, string>;
  // Only meaningful for the watch-video task type. seconds.
  watch_duration_sec?: number | null;
}

export interface TaskFormData {
  title: string;
  description: string;
  ai_prompt?: string | null;
  platform_id: number;
  // Bundle items — 1..N entries. Replaces the legacy single task_type_id +
  // task_data + proof_type fields. We still set legacy mirrors server-side
  // from items[0] for back-compat with dashboards / leaderboards reading the
  // old columns directly.
  items: TaskBundleItemInput[];
  // Optional bonus credited only when EVERY item is approved.
  completion_bonus: number;
  images: string[];
  urls: string[];
  point_budget: number;
  // Mirror of (sum(items.points) + completion_bonus). Kept on the form so
  // the admin sees the per-completion cost line — server recomputes from
  // the items array on submit.
  points_per_completion: number;
  priority: import("./database").TaskPriority;
  deadline: string | null;
  status: "draft" | "pending";
  target_type: import("./database").AssignmentTarget;
  target_group_id: number | null;
  target_user_id: string | null;
  target_user_email?: string;
  is_recurring: boolean;
  recurring_type: import("./database").RecurringType | null;
  recurring_end_date: string | null;
  max_completions: number | null;
  // ---- legacy fields, kept optional during the bundle rollout ----
  // task_type_id / task_data / proof_type are derived from items[0] now,
  // but the edit form still reads them on first load to seed items[].
  task_type_id?: number;
  task_data?: Record<string, string>;
  proof_type?: import("./database").ProofType;
}

export interface ProofSubmissionData {
  proof_urls: string[];
  proof_screenshots: string[];
  proof_notes?: string;
}

export interface GroupFormData {
  name: string;
  description: string;
  rules?: string;
  category: string;
  privacy: import("./database").GroupPrivacy;
  max_members: number;
  avatar_url?: string | null;
  cover_url?: string | null;
}

export interface ProfileUpdateData {
  name: string;
  phone: string | null;
  social_links: Record<string, string>;
  avatar_url?: string;
}

// ===== Dashboard Stats =====

export interface AdminDashboardStats {
  totalTasks: number;
  pendingReviews: number;
  activeUsers: number;
  completionRate: number;
  tasksChange: number;
  reviewsChange: number;
  usersChange: number;
  rateChange: number;
}

export interface UserDashboardStats {
  myTasks: number;
  pendingTasks: number;
  totalPoints: number;
  currentRank: number;
}

// ===== Leaderboard =====

export type LeaderboardScope = "global" | "group" | "platform";
export type LeaderboardTimeFilter = "all_time" | "this_month" | "this_week" | "today";
