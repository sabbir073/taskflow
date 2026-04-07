-- Seed platforms
INSERT INTO platforms (name, slug, icon, display_order) VALUES
  ('Pinterest', 'pinterest', 'pin', 1),
  ('Facebook', 'facebook', 'facebook', 2),
  ('Twitter/X', 'twitter', 'twitter', 3),
  ('Instagram', 'instagram', 'instagram', 4),
  ('YouTube', 'youtube', 'youtube', 5),
  ('LinkedIn', 'linkedin', 'linkedin', 6),
  ('TikTok', 'tiktok', 'music', 7),
  ('Reddit', 'reddit', 'message-circle', 8),
  ('Discord', 'discord', 'message-square', 9),
  ('Telegram', 'telegram', 'send', 10);

-- Pinterest tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (1, 'Create Pin', 'create-pin', '[{"name":"image_url","label":"Image URL","type":"url","required":true},{"name":"title","label":"Pin Title","type":"text","required":true},{"name":"description","label":"Description","type":"textarea","required":true},{"name":"board_name","label":"Board Name","type":"text","required":true}]', 'url', 30),
  (1, 'Save Pin', 'save-pin', '[{"name":"pin_url","label":"Pin URL","type":"url","required":true},{"name":"board_name","label":"Board Name","type":"text","required":true}]', 'screenshot', 15),
  (1, 'Follow Board', 'follow-board', '[{"name":"board_url","label":"Board URL","type":"url","required":true}]', 'screenshot', 10),
  (1, 'Follow User', 'follow-user', '[{"name":"profile_url","label":"Profile URL","type":"url","required":true}]', 'screenshot', 10);

-- Facebook tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (2, 'Create Post', 'create-post', '[{"name":"content","label":"Post Content","type":"textarea","required":true},{"name":"image_url","label":"Image URL","type":"url","required":false}]', 'url', 25),
  (2, 'Share Post', 'share-post', '[{"name":"post_url","label":"Post URL","type":"url","required":true}]', 'url', 15),
  (2, 'Like Post', 'like-post', '[{"name":"post_url","label":"Post URL","type":"url","required":true}]', 'screenshot', 5),
  (2, 'Comment on Post', 'comment-post', '[{"name":"post_url","label":"Post URL","type":"url","required":true},{"name":"comment","label":"Comment","type":"textarea","required":true}]', 'screenshot', 10),
  (2, 'Follow Page', 'follow-page', '[{"name":"page_url","label":"Page URL","type":"url","required":true}]', 'screenshot', 10);

-- Twitter/X tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (3, 'Post Tweet', 'post-tweet', '[{"name":"content","label":"Tweet Content","type":"textarea","required":true},{"name":"hashtags","label":"Hashtags","type":"text","required":false}]', 'url', 20),
  (3, 'Retweet', 'retweet', '[{"name":"tweet_url","label":"Tweet URL","type":"url","required":true}]', 'url', 10),
  (3, 'Like Tweet', 'like-tweet', '[{"name":"tweet_url","label":"Tweet URL","type":"url","required":true}]', 'screenshot', 5),
  (3, 'Reply to Tweet', 'reply-tweet', '[{"name":"tweet_url","label":"Tweet URL","type":"url","required":true},{"name":"reply","label":"Reply Content","type":"textarea","required":true}]', 'url', 15),
  (3, 'Follow Account', 'follow-account', '[{"name":"profile_url","label":"Profile URL","type":"url","required":true}]', 'screenshot', 10);

-- Instagram tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (4, 'Create Post', 'create-post', '[{"name":"image_url","label":"Image URL","type":"url","required":true},{"name":"caption","label":"Caption","type":"textarea","required":true},{"name":"hashtags","label":"Hashtags","type":"text","required":false}]', 'url', 30),
  (4, 'Post Story', 'post-story', '[{"name":"content_description","label":"Content Description","type":"textarea","required":true}]', 'screenshot', 20),
  (4, 'Like Post', 'like-post', '[{"name":"post_url","label":"Post URL","type":"url","required":true}]', 'screenshot', 5),
  (4, 'Comment', 'comment', '[{"name":"post_url","label":"Post URL","type":"url","required":true},{"name":"comment","label":"Comment","type":"textarea","required":true}]', 'screenshot', 10),
  (4, 'Follow Account', 'follow-account', '[{"name":"profile_url","label":"Profile URL","type":"url","required":true}]', 'screenshot', 10);

-- YouTube tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (5, 'Watch Video', 'watch-video', '[{"name":"video_url","label":"Video URL","type":"url","required":true},{"name":"watch_duration","label":"Watch Duration (min)","type":"number","required":true}]', 'screenshot', 15),
  (5, 'Like Video', 'like-video', '[{"name":"video_url","label":"Video URL","type":"url","required":true}]', 'screenshot', 5),
  (5, 'Comment on Video', 'comment-video', '[{"name":"video_url","label":"Video URL","type":"url","required":true},{"name":"comment","label":"Comment","type":"textarea","required":true}]', 'screenshot', 15),
  (5, 'Subscribe', 'subscribe', '[{"name":"channel_url","label":"Channel URL","type":"url","required":true}]', 'screenshot', 10);

-- LinkedIn tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (6, 'Create Post', 'create-post', '[{"name":"content","label":"Post Content","type":"textarea","required":true},{"name":"hashtags","label":"Hashtags","type":"text","required":false}]', 'url', 25),
  (6, 'Like Post', 'like-post', '[{"name":"post_url","label":"Post URL","type":"url","required":true}]', 'screenshot', 5),
  (6, 'Comment', 'comment', '[{"name":"post_url","label":"Post URL","type":"url","required":true},{"name":"comment","label":"Comment","type":"textarea","required":true}]', 'screenshot', 15),
  (6, 'Share Post', 'share-post', '[{"name":"post_url","label":"Post URL","type":"url","required":true}]', 'url', 15),
  (6, 'Connect', 'connect', '[{"name":"profile_url","label":"Profile URL","type":"url","required":true}]', 'screenshot', 10);

-- TikTok tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (7, 'Create Video', 'create-video', '[{"name":"video_description","label":"Video Description","type":"textarea","required":true},{"name":"hashtags","label":"Hashtags","type":"text","required":false}]', 'url', 40),
  (7, 'Like Video', 'like-video', '[{"name":"video_url","label":"Video URL","type":"url","required":true}]', 'screenshot', 5),
  (7, 'Comment', 'comment', '[{"name":"video_url","label":"Video URL","type":"url","required":true},{"name":"comment","label":"Comment","type":"textarea","required":true}]', 'screenshot', 10),
  (7, 'Follow Account', 'follow-account', '[{"name":"profile_url","label":"Profile URL","type":"url","required":true}]', 'screenshot', 10);

-- Reddit tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (8, 'Create Post', 'create-post', '[{"name":"subreddit","label":"Subreddit","type":"text","required":true},{"name":"title","label":"Post Title","type":"text","required":true},{"name":"content","label":"Content","type":"textarea","required":true}]', 'url', 25),
  (8, 'Comment', 'comment', '[{"name":"post_url","label":"Post URL","type":"url","required":true},{"name":"comment","label":"Comment","type":"textarea","required":true}]', 'url', 15),
  (8, 'Upvote', 'upvote', '[{"name":"post_url","label":"Post URL","type":"url","required":true}]', 'screenshot', 5),
  (8, 'Join Subreddit', 'join-subreddit', '[{"name":"subreddit_url","label":"Subreddit URL","type":"url","required":true}]', 'screenshot', 10);

-- Discord tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (9, 'Join Server', 'join-server', '[{"name":"invite_url","label":"Server Invite URL","type":"url","required":true}]', 'screenshot', 15),
  (9, 'Send Message', 'send-message', '[{"name":"server_name","label":"Server Name","type":"text","required":true},{"name":"channel_name","label":"Channel Name","type":"text","required":true},{"name":"message","label":"Message","type":"textarea","required":true}]', 'screenshot', 10),
  (9, 'React to Message', 'react-message', '[{"name":"message_link","label":"Message Link","type":"url","required":true},{"name":"reaction","label":"Reaction","type":"text","required":true}]', 'screenshot', 5);

-- Telegram tasks
INSERT INTO task_types (platform_id, name, slug, required_fields, proof_type, default_points) VALUES
  (10, 'Join Channel/Group', 'join-channel', '[{"name":"channel_url","label":"Channel/Group URL","type":"url","required":true}]', 'screenshot', 15),
  (10, 'Send Message', 'send-message', '[{"name":"group_name","label":"Group Name","type":"text","required":true},{"name":"message","label":"Message","type":"textarea","required":true}]', 'screenshot', 10),
  (10, 'Forward Message', 'forward-message', '[{"name":"original_message","label":"Original Message","type":"url","required":true},{"name":"destination","label":"Destination","type":"text","required":true}]', 'screenshot', 10);
