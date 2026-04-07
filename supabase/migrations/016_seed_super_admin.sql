-- Seed Super Admin user
-- Password: Admin@123456 (bcrypt hash with cost factor 12)
-- IMPORTANT: Change this password immediately after first login
INSERT INTO users (id, name, email, email_verified, password_hash)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Super Admin',
  'admin@taskflow.com',
  now(),
  '$2a$12$LJ3DFg1GKUOJL1Yua4Pn5eS8W8f5Y6E3sXgFj9bZn8kHjJB3oKqy'
);

-- Create admin profile
INSERT INTO profiles (user_id, role, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'super_admin',
  'active'
);
