-- Seed badge definitions
INSERT INTO badges (name, slug, description, icon, criteria) VALUES
  ('First Steps', 'first-steps', 'Complete your first task', 'target', '{"type":"tasks_completed","threshold":1,"description":"Complete 1 task"}'),
  ('Week Warrior', 'week-warrior', 'Maintain a 7-day streak', 'swords', '{"type":"current_streak","threshold":7,"description":"7-day streak"}'),
  ('Month Master', 'month-master', 'Maintain a 30-day streak', 'medal', '{"type":"current_streak","threshold":30,"description":"30-day streak"}'),
  ('Century Club', 'century-club', 'Complete 100 tasks', 'hash', '{"type":"tasks_completed","threshold":100,"description":"Complete 100 tasks"}'),
  ('Social Star', 'social-star', 'Complete tasks on 5+ platforms', 'star', '{"type":"distinct_platforms","threshold":5,"description":"Tasks on 5+ platforms"}'),
  ('Team Player', 'team-player', 'Join 3 or more groups', 'handshake', '{"type":"groups_joined","threshold":3,"description":"Join 3+ groups"}'),
  ('Top 10', 'top-10', 'Reach the top 10 on the leaderboard', 'trophy', '{"type":"leaderboard_rank","threshold":10,"description":"Top 10 leaderboard"}'),
  ('Perfect Score', 'perfect-score', '10 approvals with 0 rejections', 'sparkles', '{"type":"perfect_approvals","threshold":10,"description":"10 approvals, 0 rejections"}');
