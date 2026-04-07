-- Default app settings
INSERT INTO settings (key, value, category) VALUES
  ('site_name', '"TaskFlow"', 'general'),
  ('site_description', '"Social Media Task Exchange Platform"', 'general'),
  ('site_url', '"http://localhost:3000"', 'general'),
  ('timezone', '"UTC"', 'general'),
  ('date_format', '"MMM dd, yyyy"', 'general'),
  ('primary_color', '"#7C3AED"', 'branding'),
  ('accent_color', '"#EC4899"', 'branding'),
  ('dark_mode_default', 'false', 'branding'),
  ('email_notifications_enabled', 'true', 'notifications'),
  ('task_assigned_email', 'true', 'notifications'),
  ('task_approved_email', 'true', 'notifications'),
  ('task_rejected_email', 'true', 'notifications'),
  ('weekly_report_email', 'true', 'notifications'),
  ('session_timeout_hours', '24', 'security'),
  ('password_min_length', '8', 'security'),
  ('require_special_chars', 'true', 'security'),
  ('max_login_attempts', '5', 'security'),
  ('lockout_duration_minutes', '15', 'security'),
  ('default_task_points', '10', 'points'),
  ('daily_login_bonus', '5', 'points'),
  ('streak_multiplier', '1.5', 'points'),
  ('referral_bonus', '50', 'points'),
  ('milestone_10_tasks', '25', 'points'),
  ('rejection_penalty', '-5', 'points'),
  ('inactivity_penalty', '-10', 'points');

-- Default landing page content
INSERT INTO landing_content (section_key, content, display_order) VALUES
  ('hero', '{
    "badge": "Trusted by 1000+ Teams",
    "title": "Amplify Your Social Media Presence",
    "subtitle": "Empower your team with gamified task management, seamless collaboration, and data-driven insights across all major social media platforms.",
    "cta_primary": "Get Started Free",
    "cta_secondary": "Learn More",
    "stats": [
      {"value": "10K+", "label": "Active Users"},
      {"value": "500K+", "label": "Tasks Completed"},
      {"value": "99.9%", "label": "Uptime"},
      {"value": "24/7", "label": "Support"}
    ]
  }', 1),
  ('features', '{
    "title": "Everything You Need",
    "subtitle": "Powerful features to supercharge your social media campaigns",
    "items": [
      {"icon": "list-todo", "title": "Multi-Platform Tasks", "description": "Create and manage tasks across 10+ social media platforms from a single dashboard.", "active": true},
      {"icon": "trophy", "title": "Gamified Experience", "description": "Earn points, unlock badges, and climb leaderboards to stay motivated.", "active": true},
      {"icon": "users", "title": "Team Collaboration", "description": "Organize members into groups and assign tasks to entire teams at once.", "active": true},
      {"icon": "shield-check", "title": "Proof Verification", "description": "Submit screenshots or URLs as proof of completion for admin review.", "active": true},
      {"icon": "bar-chart-3", "title": "Analytics Dashboard", "description": "Track performance with real-time analytics and exportable reports.", "active": true},
      {"icon": "bell", "title": "Smart Notifications", "description": "Stay informed with in-app and email notifications for every important event.", "active": true}
    ]
  }', 2),
  ('pricing', '{
    "title": "Simple Pricing",
    "subtitle": "Choose the plan that fits your team",
    "plans": [
      {"name": "Starter", "price": "Free", "period": "forever", "description": "Perfect for small teams getting started", "features": ["Up to 10 members", "5 platforms", "Basic analytics", "Email support"], "popular": false, "active": true},
      {"name": "Pro", "price": "$29", "period": "/month", "description": "For growing teams that need more", "features": ["Up to 100 members", "All 10 platforms", "Advanced analytics", "Priority support", "Custom branding", "API access"], "popular": true, "active": true},
      {"name": "Enterprise", "price": "Custom", "period": "", "description": "For large organizations", "features": ["Unlimited members", "All platforms", "Custom integrations", "Dedicated support", "SLA guarantee", "SSO/SAML"], "popular": false, "active": true}
    ]
  }', 3),
  ('testimonials', '{
    "title": "Loved by Teams",
    "subtitle": "See what our users have to say",
    "items": [
      {"quote": "TaskFlow transformed how our marketing team coordinates social media campaigns. The gamification aspect keeps everyone motivated.", "author": "Sarah Chen", "role": "Marketing Director", "company": "GrowthCo", "active": true},
      {"quote": "We saw a 3x increase in social media engagement after implementing TaskFlow. The analytics are incredibly insightful.", "author": "Michael Rodriguez", "role": "Social Media Manager", "company": "BrandSync", "active": true},
      {"quote": "The proof verification system saves us hours of manual checking. Our team loves the point system and friendly competition.", "author": "Emily Watson", "role": "Team Lead", "company": "DigitalFirst", "active": true}
    ]
  }', 4),
  ('cta', '{
    "title": "Ready to Transform Your Social Media Strategy?",
    "subtitle": "Join thousands of teams already using TaskFlow to amplify their social media presence.",
    "button_text": "Start Free Today"
  }', 5);
