export * from "./platforms";
export * from "./roles";

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
