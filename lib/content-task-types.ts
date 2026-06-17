// Task type slugs that require user-generated content (comments, posts, etc.)
// When the task creator picks one of these, we show an "AI Prompt" field so
// they can give the users a ready-to-paste ChatGPT prompt.

const CONTENT_TASK_TYPE_PATTERNS = [
  "comment",       // comment, comment-post, comment-video, comment-pin, comment-on-answer
  "post",          // post-story, post-tweet, create-post, share-post, post-in-group
  "tweet",         // post-tweet, reply-tweet, retweet, quote-tweet, create-thread (no 'tweet' here, but create-thread is also added below via "thread")
  "message",       // send-message, react-message, forward-message
  "reply",         // reply-tweet, reply-thread
  "review",        // write-review, review-text
  "caption",
  "story",         // post-story, create-story
  "pin",           // create-pin, save-pin (most are excluded; create-pin needs prompt)
  "video",         // create-video, create-short (NOT watch-video / like-video — excluded below)
  // Newly added by migration 051:
  "answer",        // write-answer, create-detailed-answer, answer-qa
  "thread",        // create-thread, create-thread-chain, quote-thread, reply-thread, repost-thread
  "article",       // create-article (LinkedIn)
  "duet",          // duet-stitch
  "playlist",      // create-public-playlist (admin still benefits from a prompt for playlist names/desc)
  "board",         // create-board (Pinterest)
  "cross-post",    // cross-post (Reddit)
];

// Task types whose slugs contain one of the patterns above should show the
// AI prompt field. A few are explicitly excluded because they don't need
// text generation (e.g. "like-video", "watch-video", "save-pin" — just clicks).
const NEVER_CONTENT = [
  "like-post", "like-tweet", "like-video", "like-track", "like-pin", "like-thread",
  "watch-video", "watch-reel",
  "follow-account", "follow-board", "follow-page", "follow-user", "follow-artist",
  "follow-question", "follow-company",
  "connect", "subscribe", "retweet", "upvote", "upvote-answer",
  "join-channel", "join-server", "join-subreddit",
  "save-pin", "save-post", "save-business", "save-place", "save-to-favorites",
  "save-album", "save-to-trip",
  "share-post", "share-track", "share-on-social", "share-recommendation",
  "share-listing", "share-question", "share-link", "share-location",
  "share-playlist", "share-to-story", "share-to-friends", "share-video",
  "bookmark-tweet",
  "repost-track", "repost-thread", "repost-to-feed",
  "react-message",
  "play-track", "stream-track", "stream-full-track", "hifi-stream",
  "add-to-playlist", "add-to-favorites", "add-to-collection", "add-to-library",
  "add-to-wishlist",
  "pre-save-album", "buy-track", "download-track",
  "turn-on-bell",
  "keep-post-live", "keep-video-live",
  "rate-5-star", "rate-high", "rate-company",
  "check-in", "checkin", "mark-useful", "mark-helpful", "mark-verified",
  "verify-account", "verify-linkedin", "verify-identity", "verified-buyer",
  "approve-ceo", "recommend", "yes-recommend", "follow-the-page",
  "visit-page", "scroll-to-end", "subscribe-newsletter",
  "pin-to-multi-boards",
];

export function taskTypeNeedsAiPrompt(slug: string | null | undefined): boolean {
  if (!slug) return false;
  const s = slug.toLowerCase();
  if (NEVER_CONTENT.includes(s)) return false;
  return CONTENT_TASK_TYPE_PATTERNS.some((p) => s.includes(p));
}
