// Task type slugs that require user-generated content (comments, posts, etc.)
// When the task creator picks one of these, we show an "AI Prompt" field so
// they can give the users a ready-to-paste ChatGPT prompt.

const CONTENT_TASK_TYPE_PATTERNS = [
  "comment",       // comment, comment-post, comment-video
  "post",          // post-story, post-tweet, create-post, share-post
  "tweet",         // post-tweet, reply-tweet, retweet
  "message",       // send-message, react-message, forward-message
  "reply",         // reply-tweet
  "review",
  "caption",
  "story",
  "pin",           // create-pin, save-pin
  "video",         // create-video (content) — but NOT watch-video / like-video
];

// Task types whose slugs contain one of the patterns above should show the
// AI prompt field. A few are explicitly excluded because they don't need
// text generation (e.g. "like-video", "watch-video", "save-pin" — just clicks).
const NEVER_CONTENT = [
  "like-post", "like-tweet", "like-video", "watch-video",
  "follow-account", "follow-board", "follow-page", "follow-user",
  "connect", "subscribe", "retweet", "upvote",
  "join-channel", "join-server", "join-subreddit",
  "save-pin", "share-post", "react-message",
];

export function taskTypeNeedsAiPrompt(slug: string | null | undefined): boolean {
  if (!slug) return false;
  const s = slug.toLowerCase();
  if (NEVER_CONTENT.includes(s)) return false;
  return CONTENT_TASK_TYPE_PATTERNS.some((p) => s.includes(p));
}
