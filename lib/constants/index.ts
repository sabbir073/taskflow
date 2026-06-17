export * from "./platforms";
export * from "./roles";

// Bundle category → display label. Shared between the admin Create form
// (where it drives the Category dropdown) and the worker task cards (where
// it renders as a small pill next to the platform badge). Source of truth
// for the `tasks.category` enum from migration 051.
export const CATEGORY_LABELS: Record<
  "engagement" | "creation" | "review" | "music" | "maps" | "other",
  string
> = {
  engagement: "Engagement",
  creation:   "Creation",
  review:     "Review",
  music:      "Music",
  maps:       "Maps",
  other:      "Other",
};

// Long-form labels used in the admin Create-form dropdown — kept separate
// from the compact-badge labels above so the worker grid stays terse.
export const CATEGORY_LABELS_LONG: Record<keyof typeof CATEGORY_LABELS, string> = {
  engagement: "Engagement — likes, comments, shares, follows",
  creation:   "Content Creation — posts, videos, articles",
  review:     "Reviews — ratings, written reviews",
  music:      "Music Streaming",
  maps:       "Local / Maps",
  other:      "Other",
};

// ============================================================================
// Task tier — derived label, NOT a schema column.
// Drives the chip in the top-left of each task card. Cutoffs per user spec:
//   ≥ 15 cr → Premium  (success/green)
//   8–14 cr → Medium   (primary/purple)
//   <  8 cr → Small    (warning/amber)
// `total` = points_per_completion + completion_bonus, which is what the
// worker actually earns for a full completion.
// ============================================================================
export type TaskTier = "Premium" | "Medium" | "Small";

export function getTaskTier(
  pointsPerCompletion: number,
  completionBonus: number
): TaskTier {
  const total = (pointsPerCompletion || 0) + (completionBonus || 0);
  if (total >= 15) return "Premium";
  if (total >= 8) return "Medium";
  return "Small";
}

export const TIER_BADGE_VARIANT: Record<TaskTier, "success" | "primary" | "warning"> = {
  Premium: "success",
  Medium:  "primary",
  Small:   "warning",
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// Points
export const DAILY_LOGIN_BONUS = 5;
export const STREAK_MULTIPLIER = 1.5;
export const MILESTONE_BONUSES: Record<number, number> = {
  10: 25,
  50: 50,
  100: 100,
  500: 250,
  1000: 500,
};
export const REJECTION_PENALTY = -5;
export const REJECTION_PENALTY_THRESHOLD = 3; // After 3 rejections on same task

// Auth
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const VERIFICATION_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
export const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Group
export const DEFAULT_MAX_GROUP_MEMBERS = 50;
export const GROUP_CATEGORIES = [
  "Marketing",
  "Content",
  "Sales",
  "Influencer",
  "Other",
] as const;
