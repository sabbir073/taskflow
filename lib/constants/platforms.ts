export const PLATFORM_CONFIG = {
  pinterest: { name: "Pinterest", icon: "pin", color: "#E60023" },
  facebook: { name: "Facebook", icon: "facebook", color: "#1877F2" },
  twitter: { name: "Twitter/X", icon: "twitter", color: "#1DA1F2" },
  instagram: { name: "Instagram", icon: "instagram", color: "#E4405F" },
  youtube: { name: "YouTube", icon: "youtube", color: "#FF0000" },
  linkedin: { name: "LinkedIn", icon: "linkedin", color: "#0A66C2" },
  tiktok: { name: "TikTok", icon: "music", color: "#000000" },
  reddit: { name: "Reddit", icon: "message-circle", color: "#FF4500" },
  discord: { name: "Discord", icon: "message-square", color: "#5865F2" },
  telegram: { name: "Telegram", icon: "send", color: "#26A5E4" },
} as const;

export type PlatformSlug = keyof typeof PLATFORM_CONFIG;
