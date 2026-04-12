// ===== Enum Types =====

export type UserRole = "super_admin" | "admin" | "group_leader" | "user";
export type UserStatus = "active" | "suspended" | "banned";
export type TaskStatus = "draft" | "pending" | "in_progress" | "submitted" | "approved" | "rejected";
export type TaskPriority = "low" | "medium" | "high";
export type GroupPrivacy = "public" | "private";
export type RecurringType = "daily" | "weekly" | "monthly";
export type ProofType = "url" | "screenshot" | "both";
export type AssignmentStatus = "pending" | "in_progress" | "submitted" | "approved" | "rejected";
export type AssignmentTarget = "all_users" | "group" | "individual";
export type GroupMemberRole = "leader" | "member";

export type NotificationType =
  | "task_assigned"
  | "task_approved"
  | "task_rejected"
  | "points_earned"
  | "badge_earned"
  | "group_invited"
  | "group_joined"
  | "system";

export type PointsAction =
  | "task_completed"
  | "task_rejected"
  | "daily_login"
  | "streak_bonus"
  | "milestone"
  | "referral"
  | "badge_earned"
  | "penalty";

// ===== Row Types =====

export interface User {
  id: string;
  name: string | null;
  email: string;
  email_verified: string | null;
  image: string | null;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  status: UserStatus;
  is_approved: boolean;
  phone: string | null;
  total_points: number;
  tasks_completed: number;
  current_streak: number;
  longest_streak: number;
  last_active_at: string | null;
  social_links: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: number;
  name: string;
  slug: string;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface TaskType {
  id: number;
  platform_id: number;
  name: string;
  slug: string;
  description: string | null;
  required_fields: TaskTypeField[];
  proof_type: ProofType;
  default_points: number;
  is_active: boolean;
  created_at: string;
}

export interface TaskTypeField {
  name: string;
  label: string;
  type: "text" | "url" | "textarea" | "number";
  required: boolean;
  placeholder?: string;
}

export interface Group {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  privacy: GroupPrivacy;
  leader_id: string;
  max_members: number;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  platform_id: number;
  task_type_id: number;
  task_data: Record<string, string>;
  images: string[];
  urls: string[];
  proof_type: ProofType;
  points: number;
  point_budget: number;
  points_per_completion: number;
  points_spent: number;
  approval_status: "approved" | "pending_approval" | "rejected_by_admin";
  priority: TaskPriority;
  deadline: string | null;
  status: TaskStatus;
  target_type: AssignmentTarget;
  target_group_id: number | null;
  target_user_id: string | null;
  is_recurring: boolean;
  recurring_type: RecurringType | null;
  recurring_end_date: string | null;
  max_completions: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: string;
  status: AssignmentStatus;
  proof_urls: string[];
  proof_screenshots: string[];
  proof_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  points_awarded: number | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface PointsHistory {
  id: number;
  user_id: string;
  amount: number;
  action: PointsAction;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Badge {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  criteria: BadgeCriteria;
  is_active: boolean;
  created_at: string;
}

export interface BadgeCriteria {
  type: string;
  threshold: number;
  description: string;
}

export interface UserBadge {
  id: number;
  user_id: string;
  badge_id: number;
  earned_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: unknown;
  category: string;
  updated_at: string;
}

export interface LandingContent {
  id: number;
  section_key: string;
  content: Record<string, unknown>;
  is_active: boolean;
  display_order: number;
  updated_at: string;
}

// ===== Insert Types =====

export type UserInsert = Omit<User, "id" | "created_at" | "updated_at">;
export type ProfileInsert = Omit<Profile, "id" | "created_at" | "updated_at">;
export type GroupInsert = Omit<Group, "id" | "created_at" | "updated_at">;
export type TaskInsert = Omit<Task, "id" | "created_at" | "updated_at">;
export type TaskAssignmentInsert = Omit<TaskAssignment, "id" | "created_at" | "updated_at">;
export type NotificationInsert = Omit<Notification, "id" | "created_at">;
export type PointsHistoryInsert = Omit<PointsHistory, "id" | "created_at">;

// ===== Joined/Extended Types =====

export interface UserWithProfile extends User {
  profile: Profile;
}

export interface TaskWithDetails extends Task {
  platform: Platform;
  task_type: TaskType;
  creator: Pick<User, "id" | "name" | "image">;
  _count?: {
    assignments: number;
    completed: number;
    pending_review: number;
  };
}

export interface TaskAssignmentWithDetails extends TaskAssignment {
  task: TaskWithDetails;
  user: Pick<User, "id" | "name" | "email" | "image">;
  reviewer?: Pick<User, "id" | "name"> | null;
}

export interface GroupWithDetails extends Group {
  leader: Pick<User, "id" | "name" | "image">;
  _count?: {
    members: number;
  };
}

export interface GroupMemberWithProfile extends GroupMember {
  user: Pick<User, "id" | "name" | "email" | "image">;
  profile: Pick<Profile, "total_points" | "tasks_completed" | "role">;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  image: string | null;
  total_points: number;
  tasks_completed: number;
  current_streak: number;
}

export interface Plan {
  id: number;
  name: string;
  price: number;
  period: string;
  description: string | null;
  features: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface UserSubscription {
  id: number;
  user_id: string;
  plan_id: number;
  starts_at: string;
  expires_at: string | null;
  status: string;
  created_at: string;
}
