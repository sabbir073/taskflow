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

export interface TaskFormData {
  title: string;
  description: string;
  platform_id: number;
  task_type_id: number;
  task_data: Record<string, string>;
  images: string[];
  urls: string[];
  proof_type: import("./database").ProofType;
  point_budget: number;
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
}

export interface ProofSubmissionData {
  proof_urls: string[];
  proof_screenshots: string[];
  proof_notes?: string;
}

export interface GroupFormData {
  name: string;
  description: string;
  category: string;
  privacy: import("./database").GroupPrivacy;
  max_members: number;
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
