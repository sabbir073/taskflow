-- TaskFlow Enum Types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'group_leader', 'user');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE task_status AS ENUM ('draft', 'pending', 'in_progress', 'submitted', 'approved', 'rejected');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE group_privacy AS ENUM ('public', 'private');
CREATE TYPE recurring_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE proof_type AS ENUM ('url', 'screenshot', 'both');
CREATE TYPE assignment_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected');
CREATE TYPE assignment_target AS ENUM ('all_users', 'group', 'individual');
CREATE TYPE group_member_role AS ENUM ('leader', 'member');
CREATE TYPE notification_type AS ENUM (
  'task_assigned', 'task_approved', 'task_rejected', 'points_earned',
  'badge_earned', 'group_invited', 'group_joined', 'system'
);
CREATE TYPE points_action AS ENUM (
  'task_completed', 'task_rejected', 'daily_login', 'streak_bonus',
  'milestone', 'referral', 'badge_earned', 'penalty'
);
