// Natural-flow priority for a task_type slug — single source of truth used
// both client-side (task-form picker order) and server-side (createTask /
// updateTask save-time re-ordering of bundle items).
//
// Lower number = earlier in the worker's natural workflow. The tiers
// codify the intuition that you can't like or comment on a video before
// you've watched it, you can't review a place before you've visited the
// listing page, etc. Save-time re-ordering enforces this so an admin who
// clicks actions out of natural order still ends up with a bundle that
// walks the worker through the right sequence.
//
// Tier overview:
//   1   passive consumption (must do first)            stream / watch / play / visit
//   2   light engagement                              like / react / upvote
//   3   save / bookmark / collect                     save / pin / add-to / bookmark / pre-save
//   4   text engagement                               comment / reply / quote
//   5   sharing                                       share / retweet / repost / send
//   6   long-term follow                              follow / subscribe / connect / join / bell
//   7.x review-flow steps                              rate → write → pros/cons → photo → verify → check-in → QA
//   8.x heavy creation                                 create-* / post-tweet / cross-post / duet / give-award
//   9   ongoing commitment (always last)              keep-post-live / keep-video-live
//
// Tier 0 overrides (numerically high but special-cased BEFORE the generic
// patterns) cover review-platform supporting CTAs that come AFTER the
// primary rate/write/photo flow, not in the generic save/share buckets.

export const ACTION_PRIORITY_TIERS = [
  "1.0 — Foundation: stream / watch / play / visit",
  "2.0-2.5 — Quick reactions: upvote, like, react",
  "3.0 — Save / bookmark / collect",
  "4.0-4.5 — Text engagement: comment, reply, quote",
  "5.0 — Sharing: share, retweet, repost, forward",
  "6.0 — Long-term follow: follow, subscribe, connect, bell",
  "7.x — Review flow: rate → write → photo → verify → check-in → Q&A",
  "8.x — Heavy creation: create-*, post-tweet, cross-post, duet",
  "9.0 — Ongoing commitment: keep-post-live, keep-video-live",
] as const;

export function actionPriority(slug: string): number {
  // 0. Review-context overrides — for review-listing platforms (Google
  // Business, Yelp, Tripadvisor, Google Maps), the save/share/mark-helpful
  // variants are optional CTAs that come AFTER the primary rate/write/photo
  // flow, not before. We special-case those slugs so the generic
  // `^save-` / `^share-` / `mark-useful|mark-helpful` patterns below don't
  // pull them into tier 3 / tier 5.
  if (["mark-useful", "mark-helpful"].includes(slug)) return 7.85;
  if (["save-business", "save-place", "save-to-trip"].includes(slug)) return 7.9;
  if (["share-listing", "share-recommendation", "share-location"].includes(slug)) return 7.95;

  // 1. Foundation — passive consumption, must do first
  if (/^(watch-|stream-|hifi-stream|play-track|visit-page|scroll-to-end)/.test(slug)) return 1.0;

  // 2. Quick reactions
  if (slug === "upvote" || slug === "upvote-answer") return 2.0;
  if (/^(like-|react-)/.test(slug)) return 2.5;

  // 3. Save / bookmark / collect (pre-save is a deferred save, slot here).
  // Note: save-business/save-place/save-to-trip and mark-useful/mark-helpful
  // are review-platform supporting CTAs and handled in the tier-0 override
  // block above; they will not reach this pattern.
  if (/^(save-|add-to-|bookmark-|pre-save-)/.test(slug)) return 3.0;

  // 4. Text engagement
  if (/^(comment(-|$)|reply-|leave-comment|leave-public-comment|comment-on-)/.test(slug)) return 4.0;
  if (/^(quote-)/.test(slug)) return 4.5;

  // 5. Sharing
  if (/^(share-|retweet|repost-|forward-message|send-message|react-message)/.test(slug)) return 5.0;

  // 6. Follow / subscribe / connect
  if (/^(follow-|subscribe|connect|join-|turn-on-bell)/.test(slug)) return 6.0;

  // 7. Review-specific natural order
  if (/^rate(-|$)/.test(slug)) return 7.1;
  if (/^(write-review|write-answer|review-text)/.test(slug)) return 7.2;
  if (/^(pros-|cons-|recommend$|yes-recommend|approve-ceo)/.test(slug)) return 7.3;
  if (/^(add-photo|upload-photo|add-product-photo)/.test(slug)) return 7.4;
  if (/^(verify-|verified-|mark-verified)/.test(slug)) return 7.5;
  if (/^check-?in/.test(slug)) return 7.6;
  if (slug === "answer-qa") return 7.7;
  if (/^(salary-|interview-|tag-)/.test(slug)) return 7.8;

  // 8. Heavy creation
  if (/^(create-|post-tweet|post-story|post-in-)/.test(slug)) return 8.1;
  if (/^(cross-post|pin-to-multi|multi-pages|multi-groups)/.test(slug)) return 8.2;
  if (/^(buy-track|download-track)/.test(slug)) return 8.3;
  if (/^(duet-|give-award)/.test(slug)) return 8.4;

  // 9. Always last — ongoing commitment
  if (/^keep-/.test(slug)) return 9.0;

  // Unknown — middle of the pack
  return 5.5;
}
