-- ============================================================================
-- 051_categories_and_missing_platforms.sql
-- ----------------------------------------------------------------------------
-- WHY: Reference demo (references/taskmos-demo-bundle-system.md §19-§20)
--   surfaced three gaps in the live DB vs. the intended product:
--     1. No `category` column on tasks → can't cleanly filter the worker
--        grid by engagement / creation / review / music / maps.
--     2. Four platforms are referenced by the product but never seeded:
--        Threads, Quora, Google Maps, Website.
--     3. Several distinctive action types are missing for both new and
--        existing platforms — content-creation actions (create-story,
--        create-reel, create-short, create-thread, create-article,
--        create-board, create-thread-chain), niche engagement actions
--        (bookmark, quote, save-post, watch-reel, duet, keep-post-live,
--        multi-groups, cross-post), and audience boosters (follow-user,
--        give-award, follow-company, turn-on-bell).
--
-- IMPACT:
--   * tasks: +category column (TEXT, NOT NULL, default 'engagement',
--     CHECK constraint, +index). Backfilled from platform + task_type.
--   * platforms: 4 new rows (display_order 26-29) with stable slugs.
--   * task_types: ~60 new rows across new + existing platforms.
--
-- ROLLBACK:
--   ALTER TABLE tasks DROP COLUMN category;
--   DELETE FROM platforms WHERE slug IN ('threads','quora','google_maps','website');
--   (task_types rows for those 4 cascade via ON DELETE CASCADE; existing-
--    platform additions stay — they're harmless idle rows.)
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS / ON CONFLICT (slug) for platforms
--   / ON CONFLICT (platform_id, slug) for task_types. Safe to re-run.
-- ============================================================================


-- ============================================================================
-- 1. tasks.category column + backfill
-- ============================================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'engagement';

-- CHECK constraint added separately so a re-run after a previous half-apply
-- can still attach it without ALTER COLUMN errors. Use a named constraint
-- with a guard for idempotency.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_category_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_category_check
      CHECK (category IN ('engagement','creation','review','music','maps','other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

-- Backfill best-effort: derive from the joined platform / task_type.
-- Only touches rows still on the default 'engagement' so admin overrides
-- (set after this migration) survive a re-run.
UPDATE tasks t
SET category = CASE
  WHEN p.slug IN ('spotify','tidal','deezer','soundcloud','bandcamp') THEN 'music'
  WHEN p.slug IN ('google_business','yelp','trustpilot','tripadvisor','bbb',
                  'g2','capterra','sitejabber','glassdoor','facebook_reviews') THEN 'review'
  WHEN p.slug = 'google_maps' THEN 'maps'
  WHEN tt.slug LIKE 'create-%' OR tt.slug = 'post-tweet' OR tt.slug = 'post-story' THEN 'creation'
  ELSE 'engagement'
END
FROM task_types tt
JOIN platforms p ON p.id = tt.platform_id
WHERE t.task_type_id = tt.id
  AND t.category = 'engagement';


-- ============================================================================
-- 2. Missing platforms (Threads, Quora, Google Maps, Website)
-- ============================================================================

INSERT INTO platforms (name, slug, icon, display_order) VALUES
  ('Threads',     'threads',     'at-sign',     26),
  ('Quora',       'quora',       'help-circle', 27),
  ('Google Maps', 'google_maps', 'map-pin',     28),
  ('Website',     'website',     'globe',       29)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- 3. Task types — NEW platforms
-- ============================================================================

-- ---- Threads (7 task types) -----------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'threads'), 'Like Thread', 'like-thread',
    '[{"name":"post_url","label":"Thread Post URL","type":"url","required":true}]',
    'screenshot', 1),
  ((SELECT id FROM platforms WHERE slug = 'threads'), 'Reply to Thread', 'reply-thread',
    '[{"name":"post_url","label":"Thread Post URL","type":"url","required":true},
      {"name":"reply_text","label":"Reply Text Template","type":"textarea","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'threads'), 'Repost Thread', 'repost-thread',
    '[{"name":"post_url","label":"Thread Post URL","type":"url","required":true}]',
    'url', 4),
  ((SELECT id FROM platforms WHERE slug = 'threads'), 'Quote Thread', 'quote-thread',
    '[{"name":"post_url","label":"Thread Post URL","type":"url","required":true},
      {"name":"quote_text","label":"Your Commentary","type":"textarea","required":true}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'threads'), 'Follow Account', 'follow-account',
    '[{"name":"profile_url","label":"Profile URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'threads'), 'Create Thread Post', 'create-post',
    '[{"name":"caption","label":"Caption Template","type":"textarea","required":true},
      {"name":"hashtags","label":"Hashtags","type":"text","required":false},
      {"name":"image_url","label":"Image / Media","type":"image","required":false}]',
    'url', 8),
  ((SELECT id FROM platforms WHERE slug = 'threads'), 'Create Thread Chain', 'create-thread-chain',
    '[{"name":"thread_posts","label":"Thread Chain (3+ posts, separate by blank line)","type":"textarea","required":true},
      {"name":"hashtags","label":"Hashtags","type":"text","required":false},
      {"name":"media_url","label":"Attach image to one post","type":"image","required":false}]',
    'url', 18)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Quora (7 task types) -------------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'quora'), 'Upvote Answer', 'upvote-answer',
    '[{"name":"answer_url","label":"Answer URL","type":"url","required":true}]',
    'screenshot', 1),
  ((SELECT id FROM platforms WHERE slug = 'quora'), 'Comment on Answer', 'comment-on-answer',
    '[{"name":"answer_url","label":"Answer URL","type":"url","required":true},
      {"name":"comment_text","label":"Comment Text","type":"textarea","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'quora'), 'Share Question', 'share-question',
    '[{"name":"question_url","label":"Question URL","type":"url","required":true},
      {"name":"share_destination","label":"Suggested Share Destination","type":"text","required":false}]',
    'url', 3),
  ((SELECT id FROM platforms WHERE slug = 'quora'), 'Follow Question', 'follow-question',
    '[{"name":"question_url","label":"Question URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'quora'), 'Follow User', 'follow-user',
    '[{"name":"profile_url","label":"Quora Profile URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'quora'), 'Write Answer', 'write-answer',
    '[{"name":"question_url","label":"Question URL","type":"url","required":true},
      {"name":"answer_template","label":"Answer Template (150+ words; workers personalize)","type":"textarea","required":true},
      {"name":"brand_mention","label":"Brand Mention Instruction","type":"text","required":false},
      {"name":"answer_image_url","label":"Optional Image","type":"image","required":false}]',
    'url', 10),
  ((SELECT id FROM platforms WHERE slug = 'quora'), 'Create Detailed Answer', 'create-detailed-answer',
    '[{"name":"question_url","label":"Question URL","type":"url","required":true},
      {"name":"answer_template","label":"Answer Template (200+ words, mention brand naturally)","type":"textarea","required":true},
      {"name":"brand_link","label":"Brand Link to Include","type":"url","required":false},
      {"name":"answer_image_url","label":"Image to Include","type":"image","required":false}]',
    'url', 18)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Google Maps (6 task types) -------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'google_maps'), '5-Star Rating', 'rate-5-star',
    '[{"name":"location_url","label":"Google Maps Location URL","type":"url","required":true},
      {"name":"location_name","label":"Location Name","type":"text","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'google_maps'), 'Write Review (40+ words)', 'write-review',
    '[{"name":"location_url","label":"Location URL","type":"url","required":true},
      {"name":"location_name","label":"Location Name","type":"text","required":true},
      {"name":"review_template","label":"Review Template","type":"textarea","required":true},
      {"name":"key_points","label":"Points to Mention","type":"textarea","required":false}]',
    'screenshot', 7),
  ((SELECT id FROM platforms WHERE slug = 'google_maps'), 'Add Photo of Place', 'add-photo',
    '[{"name":"location_url","label":"Location URL","type":"url","required":true},
      {"name":"photo_url","label":"Photo (admin uploads if available)","type":"image","required":false},
      {"name":"photo_guidance","label":"Photo Guidance","type":"text","required":false}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'google_maps'), 'Save the Place', 'save-place',
    '[{"name":"location_url","label":"Location URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'google_maps'), 'Share Location', 'share-location',
    '[{"name":"location_url","label":"Location URL","type":"url","required":true},
      {"name":"share_destination","label":"Share Destination","type":"text","required":false}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'google_maps'), 'Answer Q&A', 'answer-qa',
    '[{"name":"location_url","label":"Location URL","type":"url","required":true},
      {"name":"question_text","label":"Question Text","type":"textarea","required":true},
      {"name":"suggested_answer","label":"Suggested Answer","type":"textarea","required":true}]',
    'screenshot', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Website (5 task types) -----------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'website'), 'Visit Page (30+ sec)', 'visit-page',
    '[{"name":"page_url","label":"Page URL","type":"url","required":true},
      {"name":"min_duration_sec","label":"Min Duration (seconds)","type":"number","required":false,"placeholder":"30"}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'website'), 'Scroll to End', 'scroll-to-end',
    '[{"name":"page_url","label":"Page URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'website'), 'Leave a Comment', 'leave-comment',
    '[{"name":"page_url","label":"Page URL","type":"url","required":true},
      {"name":"comment_template","label":"Comment Template","type":"textarea","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'website'), 'Subscribe to Newsletter', 'subscribe-newsletter',
    '[{"name":"signup_url","label":"Signup Page URL","type":"url","required":true},
      {"name":"signup_hint","label":"Signup Hint","type":"text","required":false,"placeholder":"e.g. footer form"}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'website'), 'Share Link Externally', 'share-link',
    '[{"name":"page_url","label":"Page URL","type":"url","required":true},
      {"name":"share_destination","label":"Share Destination","type":"text","required":false}]',
    'url', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;


-- ============================================================================
-- 4. Task types — additions to EXISTING platforms
-- ============================================================================

-- ---- Instagram additions (5) ----------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'instagram'), 'Save Post', 'save-post',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'instagram'), 'Share to Story', 'share-to-story',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'instagram'), 'Create Story (24hr)', 'create-story',
    '[{"name":"story_image_url","label":"Story Image (admin uploads)","type":"image","required":false},
      {"name":"story_text","label":"Sticker / Text Instruction","type":"textarea","required":false},
      {"name":"tag_handle","label":"Tag Handle","type":"text","required":false}]',
    'screenshot', 8),
  ((SELECT id FROM platforms WHERE slug = 'instagram'), 'Create Reel (15+ sec)', 'create-reel',
    '[{"name":"caption","label":"Reel Caption","type":"textarea","required":true},
      {"name":"hashtags","label":"Hashtags","type":"text","required":false},
      {"name":"source_video_url","label":"Source Video (if reusing)","type":"url","required":false}]',
    'url', 25),
  ((SELECT id FROM platforms WHERE slug = 'instagram'), 'Keep Post Live 7+ Days', 'keep-post-live',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true},
      {"name":"duration_days","label":"Min Duration (days)","type":"number","required":false,"placeholder":"7"}]',
    'screenshot', 7)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Facebook additions (7) -----------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'facebook'), 'Save Post', 'save-post',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'facebook'), 'Watch Reel (60+ sec)', 'watch-reel',
    '[{"name":"reel_url","label":"Reel URL","type":"url","required":true},
      {"name":"min_watch_sec","label":"Min Watch (seconds)","type":"number","required":false,"placeholder":"60"}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'facebook'), 'Create Story (24hr)', 'create-story',
    '[{"name":"story_image_url","label":"Story Image","type":"image","required":false},
      {"name":"story_text","label":"Story Text","type":"textarea","required":false}]',
    'screenshot', 6),
  ((SELECT id FROM platforms WHERE slug = 'facebook'), 'Post in Group', 'post-in-group',
    '[{"name":"group_url","label":"Target Group URL","type":"url","required":true},
      {"name":"post_text","label":"Post Text","type":"textarea","required":true},
      {"name":"image_url","label":"Image (optional)","type":"image","required":false}]',
    'url', 12),
  ((SELECT id FROM platforms WHERE slug = 'facebook'), 'Post in 2+ Groups', 'post-in-multi-groups',
    '[{"name":"group_list","label":"Suggested Groups (one per line)","type":"textarea","required":true},
      {"name":"post_text","label":"Post Text (same across groups)","type":"textarea","required":true},
      {"name":"image_url","label":"Image (optional)","type":"image","required":false}]',
    'url', 18),
  ((SELECT id FROM platforms WHERE slug = 'facebook'), 'Cross-Post to Pages', 'cross-post-pages',
    '[{"name":"page_list","label":"Pages to Share To","type":"textarea","required":true},
      {"name":"share_caption","label":"Share Caption","type":"text","required":false}]',
    'url', 14),
  ((SELECT id FROM platforms WHERE slug = 'facebook'), 'Keep Post Live 7+ Days', 'keep-post-live',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true},
      {"name":"duration_days","label":"Min Duration (days)","type":"number","required":false,"placeholder":"7"}]',
    'screenshot', 5)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Twitter / X additions (3) --------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'twitter'), 'Bookmark Tweet', 'bookmark-tweet',
    '[{"name":"tweet_url","label":"Tweet URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'twitter'), 'Quote Tweet', 'quote-tweet',
    '[{"name":"tweet_url","label":"Tweet URL","type":"url","required":true},
      {"name":"quote_text","label":"Quote Commentary","type":"textarea","required":true}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'twitter'), 'Create Thread (3+ tweets)', 'create-thread',
    '[{"name":"thread_tweets","label":"Thread Tweets (3+, separate by blank line)","type":"textarea","required":true},
      {"name":"hashtags","label":"Hashtags","type":"text","required":false},
      {"name":"media_url","label":"Media for first tweet","type":"image","required":false},
      {"name":"mention_handle","label":"Brand Handle to Mention","type":"text","required":false}]',
    'url', 18)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- YouTube additions (4) ------------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'youtube'), 'Share Video', 'share-video',
    '[{"name":"video_url","label":"Video URL","type":"url","required":true},
      {"name":"share_destination","label":"Share Destination","type":"text","required":false}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'youtube'), 'Turn On Notifications (bell)', 'turn-on-bell',
    '[{"name":"channel_url","label":"Channel URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'youtube'), 'Create Short (15-60s)', 'create-short',
    '[{"name":"title","label":"Shorts Title","type":"text","required":true},
      {"name":"description","label":"Description (with brand link)","type":"textarea","required":true},
      {"name":"hashtags","label":"Hashtags","type":"text","required":false},
      {"name":"source_clip_url","label":"Source Clip / Sound","type":"url","required":false}]',
    'url', 30),
  ((SELECT id FROM platforms WHERE slug = 'youtube'), 'Create Community Post', 'create-community-post',
    '[{"name":"post_text","label":"Community Post Text","type":"textarea","required":true},
      {"name":"post_image_url","label":"Image (optional)","type":"image","required":false}]',
    'url', 8)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- TikTok additions (4) -------------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'tiktok'), 'Save to Favorites', 'save-to-favorites',
    '[{"name":"video_url","label":"Video URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'tiktok'), 'Share to Friends', 'share-to-friends',
    '[{"name":"video_url","label":"Video URL","type":"url","required":true},
      {"name":"share_destination","label":"Share Destination","type":"text","required":false}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'tiktok'), 'Duet or Stitch', 'duet-stitch',
    '[{"name":"original_video_url","label":"Original Video URL","type":"url","required":true},
      {"name":"duet_caption","label":"Duet / Stitch Caption","type":"textarea","required":true}]',
    'url', 8),
  ((SELECT id FROM platforms WHERE slug = 'tiktok'), 'Keep Video Live 30+ Days', 'keep-video-live',
    '[{"name":"video_url","label":"Video URL","type":"url","required":true},
      {"name":"duration_days","label":"Min Duration (days)","type":"number","required":false,"placeholder":"30"}]',
    'screenshot', 10)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- LinkedIn additions (4) -----------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'linkedin'), 'Save Post', 'save-post',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'linkedin'), 'Repost to Feed', 'repost-to-feed',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'linkedin'), 'Follow Company Page', 'follow-company',
    '[{"name":"company_url","label":"Company Page URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'linkedin'), 'Write Article', 'create-article',
    '[{"name":"article_title","label":"Article Title","type":"text","required":true},
      {"name":"article_content","label":"Article Body Template","type":"textarea","required":true},
      {"name":"company_tag","label":"Company Tag","type":"text","required":false}]',
    'url', 35)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Pinterest additions (4) ----------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'pinterest'), 'Like Pin', 'like-pin',
    '[{"name":"pin_url","label":"Pin URL","type":"url","required":true}]',
    'screenshot', 1),
  ((SELECT id FROM platforms WHERE slug = 'pinterest'), 'Comment on Pin', 'comment-pin',
    '[{"name":"pin_url","label":"Pin URL","type":"url","required":true},
      {"name":"comment_text","label":"Comment Text","type":"textarea","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'pinterest'), 'Create Themed Board', 'create-board',
    '[{"name":"board_name","label":"Board Name Suggestion","type":"text","required":true},
      {"name":"board_description","label":"Board Description","type":"textarea","required":false}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'pinterest'), 'Pin to 2+ Boards', 'pin-to-multi-boards',
    '[{"name":"pin_url","label":"Pin URL","type":"url","required":true},
      {"name":"board_names","label":"Suggested Boards (one per line)","type":"textarea","required":true}]',
    'screenshot', 5)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Reddit additions (4) -------------------------------------------------
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'reddit'), 'Save Post', 'save-post',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'reddit'), 'Follow Redditor', 'follow-user',
    '[{"name":"profile_url","label":"Redditor Profile URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'reddit'), 'Give Award', 'give-award',
    '[{"name":"post_url","label":"Post URL","type":"url","required":true},
      {"name":"award_type","label":"Suggested Award Type","type":"text","required":false}]',
    'screenshot', 6),
  ((SELECT id FROM platforms WHERE slug = 'reddit'), 'Cross-Post to 2+ Subreddits', 'cross-post',
    '[{"name":"original_post_url","label":"Original Post URL","type":"url","required":true},
      {"name":"subreddit_list","label":"Target Subreddits (one per line)","type":"textarea","required":true},
      {"name":"cross_post_note","label":"Optional Note","type":"text","required":false}]',
    'url', 10)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- SoundCloud additions (1) ---------------------------------------------
-- (Spotify already has create-public-playlist from migration 049.)
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Create Public Playlist', 'create-public-playlist',
    '[{"name":"playlist_name","label":"Playlist Name (mentions artist)","type":"text","required":true},
      {"name":"required_track_url","label":"Required Track URL","type":"url","required":true},
      {"name":"playlist_description","label":"Playlist Description","type":"textarea","required":false},
      {"name":"track_suggestions","label":"Suggested Tracks (10+)","type":"textarea","required":false}]',
    'url', 6)
ON CONFLICT (platform_id, slug) DO NOTHING;


-- ============================================================================
-- 5. Sanity: surface counts so a humans-reading-logs can verify.
-- ============================================================================
-- (Comments only — DO NOTHING on running. Postgres has no NOTICE inside
-- migration files unless wrapped in a DO block. Skipping noise.)

-- End of 051.
