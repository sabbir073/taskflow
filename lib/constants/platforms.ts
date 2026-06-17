export const PLATFORM_CONFIG = {
  pinterest: { name: "Pinterest", icon: "pin", color: "#E60023" },
  facebook: { name: "Facebook", icon: "facebook", color: "#1877F2" },
  twitter: { name: "Twitter/X", icon: "twitter", color: "#1DA1F2" },
  threads: { name: "Threads", icon: "at-sign", color: "#000000" },
  instagram: { name: "Instagram", icon: "instagram", color: "#E4405F" },
  youtube: { name: "YouTube", icon: "youtube", color: "#FF0000" },
  linkedin: { name: "LinkedIn", icon: "linkedin", color: "#0A66C2" },
  tiktok: { name: "TikTok", icon: "music", color: "#000000" },
  reddit: { name: "Reddit", icon: "message-circle", color: "#FF4500" },
  quora: { name: "Quora", icon: "help-circle", color: "#B92B27" },
  discord: { name: "Discord", icon: "message-square", color: "#5865F2" },
  telegram: { name: "Telegram", icon: "send", color: "#26A5E4" },
  // Music streaming
  spotify: { name: "Spotify", icon: "music", color: "#1DB954" },
  tidal: { name: "TIDAL", icon: "music-2", color: "#000000" },
  deezer: { name: "Deezer", icon: "headphones", color: "#A238FF" },
  soundcloud: { name: "SoundCloud", icon: "cloud", color: "#FF5500" },
  bandcamp: { name: "Bandcamp", icon: "disc-3", color: "#629AA9" },
  // Business reviews
  google_business: { name: "Google Business", icon: "map-pin", color: "#4285F4" },
  yelp: { name: "Yelp", icon: "star", color: "#FF1A1A" },
  trustpilot: { name: "Trustpilot", icon: "shield-check", color: "#00B67A" },
  tripadvisor: { name: "Tripadvisor", icon: "compass", color: "#34E0A1" },
  bbb: { name: "BBB", icon: "building-2", color: "#003595" },
  g2: { name: "G2", icon: "trophy", color: "#FF492C" },
  capterra: { name: "Capterra", icon: "search", color: "#FF9D28" },
  sitejabber: { name: "Sitejabber", icon: "thumbs-up", color: "#23A455" },
  glassdoor: { name: "Glassdoor", icon: "briefcase", color: "#0CAA41" },
  facebook_reviews: { name: "Facebook Reviews", icon: "message-square-heart", color: "#1877F2" },
  // Local & other
  google_maps: { name: "Google Maps", icon: "map-pin", color: "#34A853" },
  website: { name: "Website", icon: "globe", color: "#6366F1" },
} as const;

export type PlatformSlug = keyof typeof PLATFORM_CONFIG;

// Task-type slugs that should open the MusicPlayLockModal (fullscreen lock
// overlay + countdown + tab-focus reset + auto-screenshot) instead of the
// generic proof form. Centralised here so the bundle UI doesn't sprinkle
// slug literals around.
export const MUSIC_STREAM_SLUGS: ReadonlySet<string> = new Set([
  "stream-track",
  "hifi-stream",
  "play-track",
  "stream-full-track",
]);

// Platform slugs whose music tasks support our lock-overlay player. Used to
// gate the MusicPlayLockModal at the platform level (so non-music platforms
// don't accidentally pick up the slug "play-track" if anyone ever adds it).
export const MUSIC_PLATFORM_SLUGS: ReadonlySet<string> = new Set([
  "spotify",
  "tidal",
  "deezer",
  "soundcloud",
  "bandcamp",
]);

// Per-platform vocabulary for the AI-check warning banner on /tasks/[id].
// Lists the reversible actions that workers commonly try to undo after
// submitting (unlike, unfollow, delete comment, delete share). The banner
// joins these into a sentence so the warning reads naturally for each
// platform instead of using a generic "undo the action" string.
export const REVERSAL_VOCAB: Record<string, string[]> = {
  instagram:       ["unlike a post", "unfollow", "delete a comment", "delete a share or story"],
  facebook:        ["unlike a post", "unfollow a page", "delete a comment", "delete a share"],
  twitter:         ["unlike a tweet", "unfollow", "delete a reply", "undo a retweet"],
  threads:         ["unlike a thread", "unfollow", "delete a reply"],
  youtube:         ["unlike a video", "unsubscribe", "delete a comment", "turn off the notification bell"],
  tiktok:          ["unlike a video", "unfollow", "delete a comment", "delete a share"],
  linkedin:        ["unreact to a post", "unfollow", "delete a comment", "remove a connection"],
  pinterest:       ["unsave a pin", "unfollow", "delete a comment"],
  reddit:          ["remove an upvote", "unfollow", "delete a comment", "delete a share"],
  quora:           ["unupvote an answer", "unfollow", "delete an answer or comment"],
  spotify:         ["remove a track from a playlist", "unfollow an artist", "unsave an album"],
  tidal:           ["unfavourite a track", "unfollow an artist", "remove from a playlist"],
  deezer:          ["unlove a track", "unfollow", "remove from a playlist"],
  soundcloud:      ["unlike a track", "unfollow", "delete a comment", "delete a repost"],
  bandcamp:        ["remove from your collection", "unfollow", "remove a fan-mark"],
  google_business: ["edit your review down", "delete your review", "unmark helpful"],
  google_maps:     ["delete your review", "remove a photo", "unmark helpful"],
  yelp:            ["delete your review", "remove a photo", "unmark useful"],
  trustpilot:      ["edit your review down", "delete your review"],
  tripadvisor:     ["delete your review", "remove a photo", "unmark helpful"],
  default:         ["undo the action", "remove your content", "delete your comment", "delete your share"],
};
