import {
  Heart, Bookmark, MessageCircle, Share2, UserPlus, Play, Music,
  Star, Camera, Plus, ListPlus, ThumbsUp, Mic2, MapPin,
  type LucideIcon,
} from "lucide-react";

// Maps a task_type slug to the lucide icon + TaskMOS-token tint used by the
// per-bundle action pills on the task cards. Slug-prefix driven so new
// task_types added in future migrations get a sensible default without code
// changes here. Tints come from existing theme tokens (bg-error / bg-primary /
// bg-accent / bg-warning / bg-success / bg-muted) so dark mode just works.

export interface TaskTypeIconStyle {
  Icon: LucideIcon;
  // Combined Tailwind class set for the pill: bg, text, and border.
  tint: string;
}

const FALLBACK: TaskTypeIconStyle = {
  Icon: ListPlus,
  tint: "bg-muted text-muted-foreground border-border/50",
};

// Order matters: the FIRST regex that matches wins. More specific patterns
// (like `playlist`) should come before generic ones (like `^add-`).
const PREFIX_MAP: ReadonlyArray<readonly [RegExp, TaskTypeIconStyle]> = [
  // Foundation — passive consumption
  [/^(watch-|stream-|hifi-stream|play-track|visit-page|scroll-to-end)/, {
    Icon: Play, tint: "bg-accent/10 text-accent border-accent/20",
  }],
  // Reactions
  [/^(like-|react-)/, {
    Icon: Heart, tint: "bg-error/10 text-error border-error/20",
  }],
  [/^upvote/, {
    Icon: ThumbsUp, tint: "bg-warning/10 text-warning border-warning/20",
  }],
  // Playlist-related (catch before generic `^add-` / `^save-`)
  [/playlist|include-track|share-playlist/, {
    Icon: Music, tint: "bg-accent/10 text-accent border-accent/20",
  }],
  // Save / collect
  [/^(save-|add-to-|bookmark-|pre-save-|mark-useful|mark-helpful)/, {
    Icon: Bookmark, tint: "bg-primary/10 text-primary border-primary/20",
  }],
  // Comment / reply / quote — text engagement
  [/^(comment(-|$)|reply-|leave-comment|leave-public-comment|comment-on-|quote-)/, {
    Icon: MessageCircle, tint: "bg-warning/10 text-warning border-warning/20",
  }],
  // Share / repost
  [/^(share-|retweet|repost-|forward-message|send-message|react-message)/, {
    Icon: Share2, tint: "bg-success/10 text-success border-success/20",
  }],
  // Follow / subscribe / connect
  [/^(follow-|subscribe|connect|join-|turn-on-bell)/, {
    Icon: UserPlus, tint: "bg-primary/15 text-primary border-primary/25",
  }],
  // Review-flow primaries
  [/^rate(-|$)/, {
    Icon: Star, tint: "bg-warning/10 text-warning border-warning/20",
  }],
  [/^(write-review|write-answer|review-text|pros-|cons-|recommend|yes-recommend|approve-ceo|salary-|interview-)/, {
    Icon: Star, tint: "bg-accent/10 text-accent border-accent/20",
  }],
  [/^(add-photo|upload-photo|add-product-photo)/, {
    Icon: Camera, tint: "bg-accent/10 text-accent border-accent/20",
  }],
  [/^check-?in/, {
    Icon: MapPin, tint: "bg-success/10 text-success border-success/20",
  }],
  [/^(answer-qa)/, {
    Icon: MessageCircle, tint: "bg-warning/10 text-warning border-warning/20",
  }],
  // Heavy creation
  [/^(create-|post-tweet|post-story|post-in-|cross-post|multi-pages|multi-groups|pin-to-multi)/, {
    Icon: Plus, tint: "bg-primary/15 text-primary border-primary/25",
  }],
  // Music duet / stitch
  [/^(duet-)/, {
    Icon: Mic2, tint: "bg-accent/10 text-accent border-accent/20",
  }],
];

export function getTaskTypeIconStyle(slug: string | null | undefined): TaskTypeIconStyle {
  if (!slug) return FALLBACK;
  for (const [pattern, style] of PREFIX_MAP) {
    if (pattern.test(slug)) return style;
  }
  return FALLBACK;
}
