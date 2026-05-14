-- ============================================================================
-- Phase 3 — new platforms + task types (music streaming + business reviews)
-- ============================================================================
-- 15 new platforms (5 music streaming + 10 review sites) + ~86 task types.
-- Idempotent: ON CONFLICT (slug) for platforms and ON CONFLICT (platform_id,
-- slug) for task_types so re-runs no-op.
--
-- Image-type fields (Pinterest-style image_url, review-site photo_url) use
-- `"type": "image"` instead of `"type": "url"` so the bundle form renders
-- them as the new S3 multi-image upload component. Migration 050 backfills
-- this for previously-seeded platforms.

-- 1. PLATFORMS -----------------------------------------------------------------
INSERT INTO platforms (name, slug, icon, display_order) VALUES
  -- Music streaming (11–15)
  ('Spotify',         'spotify',         'music',                 11),
  ('TIDAL',           'tidal',           'music-2',               12),
  ('Deezer',          'deezer',          'headphones',            13),
  ('SoundCloud',      'soundcloud',      'cloud',                 14),
  ('Bandcamp',        'bandcamp',        'disc-3',                15),
  -- Business reviews (16–25)
  ('Google Business', 'google_business', 'map-pin',               16),
  ('Yelp',            'yelp',            'star',                  17),
  ('Trustpilot',      'trustpilot',      'shield-check',          18),
  ('Tripadvisor',     'tripadvisor',     'compass',               19),
  ('BBB',             'bbb',             'building-2',            20),
  ('G2',              'g2',              'trophy',                21),
  ('Capterra',        'capterra',        'search',                22),
  ('Sitejabber',      'sitejabber',      'thumbs-up',             23),
  ('Glassdoor',       'glassdoor',       'briefcase',             24),
  ('Facebook Reviews','facebook_reviews','message-square-heart',  25)
ON CONFLICT (slug) DO NOTHING;

-- 2. TASK TYPES ----------------------------------------------------------------
-- Each block uses (SELECT id FROM platforms WHERE slug = '<slug>') so the
-- migration doesn't depend on the SERIAL sequence state.

-- ---- Spotify (8 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Stream Track', 'stream-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"track_name","label":"Track Name + Artist","type":"text","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Like Track', 'like-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Add to Playlist', 'add-to-playlist',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"playlist_suggestion","label":"Suggested Playlist Context","type":"text","required":false,"placeholder":"e.g. Add to your chill playlist"}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Follow Artist', 'follow-artist',
    '[{"name":"artist_url","label":"Artist Profile URL","type":"url","required":true},
      {"name":"artist_name","label":"Artist Name","type":"text","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Share Track', 'share-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"share_platform","label":"Suggested Share Platform","type":"text","required":false,"placeholder":"e.g. IG Story / WhatsApp"}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Pre-Save Album', 'pre-save-album',
    '[{"name":"presave_url","label":"Pre-save Campaign URL","type":"url","required":true,"placeholder":"https://show.co/..."},
      {"name":"release_date","label":"Release Date","type":"text","required":true}]',
    'screenshot', 6),
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Save Album to Library', 'save-album',
    '[{"name":"album_url","label":"Album URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'spotify'), 'Create Public Playlist', 'create-public-playlist',
    '[{"name":"playlist_name","label":"Playlist Name Suggestion","type":"text","required":true},
      {"name":"required_track_url","label":"Required Track URL","type":"url","required":true},
      {"name":"playlist_description","label":"Playlist Description","type":"textarea","required":true},
      {"name":"track_suggestions","label":"Track Suggestions (10+ tracks)","type":"textarea","required":false}]',
    'url', 8)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- TIDAL (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'tidal'), 'HiFi Stream', 'hifi-stream',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"quality_requirement","label":"Quality Requirement","type":"text","required":false,"placeholder":"HiFi / Master"}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'tidal'), 'Like Track', 'like-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'tidal'), 'Add to Playlist', 'add-to-playlist',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"playlist_guidance","label":"Playlist Guidance","type":"text","required":false}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'tidal'), 'Follow Artist', 'follow-artist',
    '[{"name":"artist_url","label":"Artist Profile URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'tidal'), 'Share Track', 'share-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'tidal'), 'Add to Collection', 'add-to-collection',
    '[{"name":"album_url","label":"Album/Track URL","type":"url","required":true}]',
    'screenshot', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Deezer (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'deezer'), 'Stream Track', 'stream-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'deezer'), 'Add to Favorites', 'add-to-favorites',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'deezer'), 'Add to Playlist', 'add-to-playlist',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"playlist_hint","label":"Playlist Hint","type":"text","required":false}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'deezer'), 'Follow Artist', 'follow-artist',
    '[{"name":"artist_url","label":"Artist URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'deezer'), 'Share Track', 'share-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'deezer'), 'Add to Library', 'add-to-library',
    '[{"name":"album_url","label":"Album/Track URL","type":"url","required":true}]',
    'screenshot', 3)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- SoundCloud (7 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Play Track', 'play-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Like Track', 'like-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 1),
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Repost Track', 'repost-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Comment on Track', 'comment-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"comment_text","label":"Comment Text","type":"textarea","required":true},
      {"name":"timestamp","label":"Comment Timestamp (mm:ss)","type":"text","required":false}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Follow Artist', 'follow-artist',
    '[{"name":"artist_url","label":"Artist Profile URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Add to Playlist', 'add-to-playlist',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"playlist_hint","label":"Playlist Hint","type":"text","required":false}]',
    'url', 5),
  ((SELECT id FROM platforms WHERE slug = 'soundcloud'), 'Download Track', 'download-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 3)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Bandcamp (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'bandcamp'), 'Stream Full Track', 'stream-full-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'bandcamp'), 'Add to Wishlist', 'add-to-wishlist',
    '[{"name":"track_url","label":"Track/Album URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'bandcamp'), 'Follow Artist', 'follow-artist',
    '[{"name":"artist_url","label":"Artist URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'bandcamp'), 'Share on Social', 'share-on-social',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"share_platform","label":"Suggested Platform","type":"text","required":false}]',
    'url', 4),
  ((SELECT id FROM platforms WHERE slug = 'bandcamp'), 'Buy Track / Pay-What-You-Want', 'buy-track',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"suggested_amount","label":"Suggested Amount","type":"text","required":false}]',
    'screenshot', 10),
  ((SELECT id FROM platforms WHERE slug = 'bandcamp'), 'Leave Public Comment', 'leave-public-comment',
    '[{"name":"track_url","label":"Track URL","type":"url","required":true},
      {"name":"comment_text","label":"Comment Text","type":"textarea","required":true}]',
    'screenshot', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Google Business (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'google_business'), '5-Star Rating', 'rate-5-star',
    '[{"name":"business_url","label":"Business GMB URL","type":"url","required":true},
      {"name":"business_name","label":"Business Name","type":"text","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'google_business'), 'Write Review (50+ words)', 'write-review',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"business_name","label":"Business Name","type":"text","required":true},
      {"name":"review_template","label":"Review Template (50-80 words)","type":"textarea","required":true},
      {"name":"key_points","label":"Key Points to Mention","type":"textarea","required":false,"placeholder":"location, service, staff..."}]',
    'screenshot', 8),
  ((SELECT id FROM platforms WHERE slug = 'google_business'), 'Upload Photo', 'upload-photo',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"photo_url","label":"Photo (admin uploads)","type":"image","required":false},
      {"name":"photo_guidance","label":"Photo Guidance","type":"textarea","required":false,"placeholder":"real storefront photo, no stock"}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'google_business'), 'Answer Q&A', 'answer-qa',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"question_text","label":"Question Text","type":"textarea","required":true},
      {"name":"suggested_answer","label":"Suggested Answer","type":"textarea","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'google_business'), 'Save Business / Follow', 'save-business',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'google_business'), 'Share Listing', 'share-listing',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"share_destination","label":"Share Destination","type":"text","required":false,"placeholder":"WhatsApp / IG Story"}]',
    'screenshot', 3)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Yelp (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'yelp'), '5-Star Rating', 'rate-5-star',
    '[{"name":"business_url","label":"Yelp Business URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'yelp'), 'Write Review (50+ words)', 'write-review',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"business_name","label":"Business Name","type":"text","required":true},
      {"name":"review_template","label":"Review Template","type":"textarea","required":true},
      {"name":"required_mentions","label":"Required Mentions","type":"textarea","required":false}]',
    'screenshot', 8),
  ((SELECT id FROM platforms WHERE slug = 'yelp'), 'Add Food / Service Photo', 'add-photo',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"photo_url","label":"Photo (admin uploads)","type":"image","required":false},
      {"name":"photo_type","label":"Photo Type","type":"text","required":false,"placeholder":"dish close-up / interior"}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'yelp'), 'Check-In', 'check-in',
    '[{"name":"location_url","label":"Yelp Location URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'yelp'), 'Save Business', 'save-business',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'yelp'), 'Mark Other Reviews Useful', 'mark-useful',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"review_urls","label":"Review URLs (3-5 to mark)","type":"textarea","required":true}]',
    'screenshot', 2)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Trustpilot (4 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'trustpilot'), '5-Star Rating', 'rate-5-star',
    '[{"name":"company_url","label":"Trustpilot Company URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'trustpilot'), 'Write Review (50+ words)', 'write-review',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"company_name","label":"Company Name","type":"text","required":true},
      {"name":"review_template","label":"Review Template","type":"textarea","required":true},
      {"name":"service_context","label":"Service Used Context","type":"textarea","required":false}]',
    'screenshot', 10),
  ((SELECT id FROM platforms WHERE slug = 'trustpilot'), 'Mark as Verified', 'mark-verified',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"order_proof_url","label":"Order Confirmation Proof URL","type":"url","required":false}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'trustpilot'), 'Upload Photo', 'upload-photo',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"photo_url","label":"Photo (admin uploads)","type":"image","required":false}]',
    'screenshot', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Tripadvisor (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'tripadvisor'), '5-Star Rating', 'rate-5-star',
    '[{"name":"listing_url","label":"Listing URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'tripadvisor'), 'Write Review (50+ words)', 'write-review',
    '[{"name":"listing_url","label":"Listing URL","type":"url","required":true},
      {"name":"property_name","label":"Property Name","type":"text","required":true},
      {"name":"review_template","label":"Review Template","type":"textarea","required":true},
      {"name":"travel_date","label":"Travel Date","type":"text","required":true},
      {"name":"traveler_type","label":"Type of Traveler","type":"text","required":false}]',
    'screenshot', 8),
  ((SELECT id FROM platforms WHERE slug = 'tripadvisor'), 'Upload Travel Photo', 'upload-photo',
    '[{"name":"listing_url","label":"Listing URL","type":"url","required":true},
      {"name":"photo_url","label":"Photo (admin uploads)","type":"image","required":false},
      {"name":"photo_guidance","label":"Photo Guidance","type":"textarea","required":false}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'tripadvisor'), 'Save to Trip', 'save-to-trip',
    '[{"name":"listing_url","label":"Listing URL","type":"url","required":true},
      {"name":"trip_name","label":"Trip Name Suggestion","type":"text","required":false}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'tripadvisor'), 'Mark Reviews Helpful', 'mark-helpful',
    '[{"name":"listing_url","label":"Listing URL","type":"url","required":true},
      {"name":"review_urls","label":"Review URLs","type":"textarea","required":true}]',
    'screenshot', 2),
  ((SELECT id FROM platforms WHERE slug = 'tripadvisor'), 'Answer Travel Q&A', 'answer-qa',
    '[{"name":"listing_url","label":"Listing URL","type":"url","required":true},
      {"name":"question_text","label":"Question Text","type":"textarea","required":true},
      {"name":"suggested_answer","label":"Suggested Answer","type":"textarea","required":true}]',
    'screenshot', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- BBB (3 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'bbb'), 'Submit High Rating', 'rate-high',
    '[{"name":"business_url","label":"BBB Business Profile URL","type":"url","required":true}]',
    'screenshot', 6),
  ((SELECT id FROM platforms WHERE slug = 'bbb'), 'Detailed Review (80+ words)', 'write-review',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"business_name","label":"Business Name","type":"text","required":true},
      {"name":"review_template","label":"Review Template (formal tone)","type":"textarea","required":true},
      {"name":"service_context","label":"Service Context","type":"textarea","required":false}]',
    'screenshot', 10),
  ((SELECT id FROM platforms WHERE slug = 'bbb'), 'Verify Account', 'verify-account',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true}]',
    'screenshot', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- G2 (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'g2'), '5-Star Rating', 'rate-5-star',
    '[{"name":"product_url","label":"G2 Product URL","type":"url","required":true}]',
    'screenshot', 6),
  ((SELECT id FROM platforms WHERE slug = 'g2'), 'Pros Review (40+ words)', 'pros-review',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true},
      {"name":"pros_template","label":"Pros Template","type":"textarea","required":true},
      {"name":"feature_highlights","label":"Feature Highlights to Mention","type":"textarea","required":false},
      {"name":"worker_role","label":"Worker Role Context","type":"text","required":false}]',
    'screenshot', 8),
  ((SELECT id FROM platforms WHERE slug = 'g2'), 'Cons Review (20+ words)', 'cons-review',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true},
      {"name":"cons_template","label":"Cons Template (mild, constructive)","type":"textarea","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'g2'), 'LinkedIn Verification', 'verify-linkedin',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'g2'), 'Recommend Product', 'recommend',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'g2'), 'Role / Industry Tag', 'tag-role-industry',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true},
      {"name":"suggested_role","label":"Suggested Role","type":"text","required":false},
      {"name":"company_size","label":"Company Size","type":"text","required":false},
      {"name":"industry","label":"Industry","type":"text","required":false}]',
    'screenshot', 2)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Capterra (5 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'capterra'), '5-Star Rating', 'rate-5-star',
    '[{"name":"product_url","label":"Capterra Product URL","type":"url","required":true}]',
    'screenshot', 6),
  ((SELECT id FROM platforms WHERE slug = 'capterra'), 'Detailed Review (60+ words)', 'write-review',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true},
      {"name":"review_template","label":"Review Template","type":"textarea","required":true},
      {"name":"use_case","label":"Use Case Description","type":"textarea","required":false},
      {"name":"pros","label":"Pros","type":"textarea","required":false},
      {"name":"cons","label":"Cons","type":"textarea","required":false}]',
    'screenshot', 9),
  ((SELECT id FROM platforms WHERE slug = 'capterra'), 'Would Recommend', 'recommend',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true},
      {"name":"recommendation_context","label":"Recommendation Context","type":"textarea","required":false}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'capterra'), 'Verify Identity', 'verify-identity',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'capterra'), 'Industry / Role Tag', 'tag-role-industry',
    '[{"name":"product_url","label":"Product URL","type":"url","required":true},
      {"name":"suggested_role","label":"Suggested Role","type":"text","required":false},
      {"name":"company_size","label":"Company Size","type":"text","required":false}]',
    'screenshot', 2)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Sitejabber (4 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'sitejabber'), '5-Star Rating', 'rate-5-star',
    '[{"name":"business_url","label":"Sitejabber Business URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'sitejabber'), 'Write Review (50+ words)', 'write-review',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"product_context","label":"Product / Service Context","type":"textarea","required":false},
      {"name":"review_template","label":"Review Template","type":"textarea","required":true}]',
    'screenshot', 8),
  ((SELECT id FROM platforms WHERE slug = 'sitejabber'), 'Add Product Photo', 'add-product-photo',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"photo_url","label":"Photo (admin uploads)","type":"image","required":false}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'sitejabber'), 'Verified Buyer Tag', 'verified-buyer',
    '[{"name":"business_url","label":"Business URL","type":"url","required":true},
      {"name":"order_proof_url","label":"Order Confirmation Proof URL","type":"url","required":false}]',
    'screenshot', 4)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Glassdoor (7 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'glassdoor'), 'Rate the Company', 'rate-company',
    '[{"name":"company_url","label":"Glassdoor Company URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'glassdoor'), 'Pros Section (40+ words)', 'pros-section',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"pros_template","label":"Pros Template","type":"textarea","required":true},
      {"name":"focus_areas","label":"Focus Areas","type":"text","required":false,"placeholder":"culture, growth, perks"}]',
    'screenshot', 7),
  ((SELECT id FROM platforms WHERE slug = 'glassdoor'), 'Cons Section (20+ words)', 'cons-section',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"cons_template","label":"Cons Template","type":"textarea","required":true}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'glassdoor'), 'Recommend to a Friend', 'recommend',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"recommendation_context","label":"Recommendation Context","type":"textarea","required":false}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'glassdoor'), 'Approve of CEO', 'approve-ceo',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'glassdoor'), 'Salary Submission', 'salary-submission',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"salary_range","label":"Salary Range Suggestion","type":"text","required":false}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'glassdoor'), 'Interview Review', 'interview-review',
    '[{"name":"company_url","label":"Company URL","type":"url","required":true},
      {"name":"interview_process","label":"Interview Process Description","type":"textarea","required":true}]',
    'screenshot', 5)
ON CONFLICT (platform_id, slug) DO NOTHING;

-- ---- Facebook Reviews (6 task types) ----
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  ((SELECT id FROM platforms WHERE slug = 'facebook_reviews'), 'Yes, Recommend Page', 'yes-recommend',
    '[{"name":"page_url","label":"FB Page URL","type":"url","required":true}]',
    'screenshot', 5),
  ((SELECT id FROM platforms WHERE slug = 'facebook_reviews'), 'Review Text (30+ words)', 'review-text',
    '[{"name":"page_url","label":"FB Page URL","type":"url","required":true},
      {"name":"review_template","label":"Review Template","type":"textarea","required":true}]',
    'screenshot', 6),
  ((SELECT id FROM platforms WHERE slug = 'facebook_reviews'), 'Add Photo', 'add-photo',
    '[{"name":"page_url","label":"FB Page URL","type":"url","required":true},
      {"name":"photo_url","label":"Photo (admin uploads)","type":"image","required":false}]',
    'screenshot', 4),
  ((SELECT id FROM platforms WHERE slug = 'facebook_reviews'), 'Share Recommendation', 'share-recommendation',
    '[{"name":"page_url","label":"FB Page URL","type":"url","required":true}]',
    'url', 4),
  ((SELECT id FROM platforms WHERE slug = 'facebook_reviews'), 'Follow the Page', 'follow-page',
    '[{"name":"page_url","label":"FB Page URL","type":"url","required":true}]',
    'screenshot', 3),
  ((SELECT id FROM platforms WHERE slug = 'facebook_reviews'), 'Check-In at Location', 'check-in',
    '[{"name":"location_url","label":"Location URL","type":"url","required":true}]',
    'screenshot', 3)
ON CONFLICT (platform_id, slug) DO NOTHING;
