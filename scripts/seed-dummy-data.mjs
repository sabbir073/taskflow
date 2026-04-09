import pg from "pg";
import bcrypt from "bcryptjs";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  await client.connect();
  console.log("Connected. Seeding dummy data...\n");

  const password = await bcrypt.hash("User@12345", 12);

  // ===== 5 DUMMY USERS =====
  const users = [
    { name: "Alice Johnson", email: "alice@example.com" },
    { name: "Bob Williams", email: "bob@example.com" },
    { name: "Carol Davis", email: "carol@example.com" },
    { name: "David Brown", email: "david@example.com" },
    { name: "Eva Martinez", email: "eva@example.com" },
  ];

  const userIds = [];
  for (const u of users) {
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [u.email]);
    if (existing.rows.length > 0) {
      userIds.push(existing.rows[0].id);
      console.log(`User exists: ${u.email} (${existing.rows[0].id})`);
      continue;
    }
    const result = await client.query(
      "INSERT INTO users (name, email, email_verified, password_hash) VALUES ($1, $2, now(), $3) RETURNING id",
      [u.name, u.email, password]
    );
    userIds.push(result.rows[0].id);
    console.log(`Created user: ${u.email} (${result.rows[0].id})`);
  }

  // Give users different points
  const pointAmounts = [500, 350, 800, 150, 650];
  for (let i = 0; i < userIds.length; i++) {
    await client.query(
      "UPDATE profiles SET total_points = $1, tasks_completed = $2, current_streak = $3, longest_streak = $4 WHERE user_id = $5",
      [pointAmounts[i], Math.floor(pointAmounts[i] / 20), Math.floor(Math.random() * 15), Math.floor(Math.random() * 30), userIds[i]]
    );
  }
  console.log("Updated user points\n");

  // Make Alice a group_leader
  await client.query("UPDATE profiles SET role = 'group_leader' WHERE user_id = $1", [userIds[0]]);

  // ===== GET ADMIN USER ID =====
  const adminResult = await client.query("SELECT id FROM users WHERE email = 'admin@taskflow.com'");
  const adminId = adminResult.rows[0]?.id;
  if (!adminId) { console.error("Admin user not found!"); process.exit(1); }

  // ===== 4 GROUPS =====
  const groups = [
    { name: "Marketing Team", desc: "Social media marketing coordination", category: "Marketing", privacy: "public", leader: adminId, approval: "approved" },
    { name: "Content Creators", desc: "Content creation and distribution team", category: "Content", privacy: "public", leader: userIds[0], approval: "approved" },
    { name: "Sales Outreach", desc: "Sales team social media outreach", category: "Sales", privacy: "private", leader: userIds[2], approval: "pending_approval" },
    { name: "Influencer Squad", desc: "Influencer collaboration group", category: "Influencer", privacy: "public", leader: userIds[4], approval: "approved" },
  ];

  const groupIds = [];
  for (const g of groups) {
    const slug = g.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const result = await client.query(
      "INSERT INTO groups (name, slug, description, category, privacy, leader_id, created_by, approval_status) VALUES ($1, $2, $3, $4, $5, $6, $6, $7) RETURNING id",
      [g.name, slug, g.desc, g.category, g.privacy, g.leader, g.approval]
    );
    groupIds.push(result.rows[0].id);

    // Add leader as member
    await client.query(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'leader') ON CONFLICT DO NOTHING",
      [result.rows[0].id, g.leader]
    );
    console.log(`Created group: ${g.name} (${result.rows[0].id}) [${g.approval}]`);
  }

  // Add users to groups
  for (let i = 0; i < userIds.length; i++) {
    await client.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING", [groupIds[0], userIds[i]]);
    if (i < 3) await client.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING", [groupIds[1], userIds[i]]);
  }
  console.log("Added members to groups\n");

  // ===== 5 TASKS (mix of admin-created approved + user-created pending) =====
  const tasks = [
    {
      title: "Like our Facebook announcement post",
      desc: "Go to our Facebook page and like the latest announcement post about the new product launch.",
      platform_id: 2, task_type_id: 8, // Facebook - Like Post
      task_data: { post_url: "https://facebook.com/taskflow/posts/123" },
      budget: 100, per_completion: 5, target: "all_users",
      created_by: adminId, approval: "approved", status: "pending",
    },
    {
      title: "Follow our Twitter/X account",
      desc: "Follow @TaskFlowHQ on Twitter/X and stay updated with our latest news.",
      platform_id: 3, task_type_id: 14, // Twitter - Follow Account
      task_data: { profile_url: "https://twitter.com/TaskFlowHQ" },
      budget: 200, per_completion: 10, target: "all_users",
      created_by: adminId, approval: "approved", status: "pending",
    },
    {
      title: "Subscribe to our YouTube channel",
      desc: "Subscribe to TaskFlow on YouTube for tutorials and updates.",
      platform_id: 5, task_type_id: 23, // YouTube - Subscribe
      task_data: { channel_url: "https://youtube.com/@TaskFlow" },
      budget: 150, per_completion: 10, target: "group", target_group: groupIds[0],
      created_by: adminId, approval: "approved", status: "pending",
    },
    {
      title: "Share our LinkedIn post about AI features",
      desc: "Share the latest LinkedIn post about our new AI-powered features with your network.",
      platform_id: 6, task_type_id: 27, // LinkedIn - Share Post
      task_data: { post_url: "https://linkedin.com/posts/taskflow-ai-features" },
      budget: 80, per_completion: 15, target: "all_users",
      created_by: userIds[0], approval: "pending_approval", status: "pending",
    },
    {
      title: "Join our Discord server",
      desc: "Join the official TaskFlow Discord server and introduce yourself in #general.",
      platform_id: 9, task_type_id: 37, // Discord - Join Server
      task_data: { invite_url: "https://discord.gg/taskflow" },
      budget: 200, per_completion: 15, target: "all_users",
      created_by: userIds[2], approval: "pending_approval", status: "pending",
    },
  ];

  const taskIds = [];
  for (const t of tasks) {
    const result = await client.query(
      `INSERT INTO tasks (title, description, platform_id, task_type_id, task_data, points, point_budget, points_per_completion, points_spent, target_type, target_group_id, created_by, approval_status, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13) RETURNING id`,
      [t.title, t.desc, t.platform_id, t.task_type_id, JSON.stringify(t.task_data), t.per_completion, t.budget, t.per_completion, t.target, t.target_group || null, t.created_by, t.approval, t.status]
    );
    taskIds.push(result.rows[0].id);
    console.log(`Created task: "${t.title}" (${result.rows[0].id}) [${t.approval}]`);

    // Deduct budget from creator for published tasks
    if (t.status === "pending") {
      await client.query("UPDATE profiles SET total_points = total_points - $1 WHERE user_id = $2", [t.budget, t.created_by]);
    }
  }

  // Create assignments for approved tasks
  for (let i = 0; i < 3; i++) { // first 3 tasks are admin-approved
    const taskId = taskIds[i];
    for (const userId of userIds) {
      await client.query(
        "INSERT INTO task_assignments (task_id, user_id, status) VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING",
        [taskId, userId]
      );
    }
  }

  // Make some assignments in different statuses for realism
  // Alice accepted task 1
  await client.query("UPDATE task_assignments SET status = 'in_progress' WHERE task_id = $1 AND user_id = $2", [taskIds[0], userIds[0]]);
  // Bob submitted proof for task 1
  await client.query(
    "UPDATE task_assignments SET status = 'submitted', proof_url = 'https://facebook.com/proof/bob123', submitted_at = now() WHERE task_id = $1 AND user_id = $2",
    [taskIds[0], userIds[1]]
  );
  // Carol got approved for task 2
  await client.query(
    "UPDATE task_assignments SET status = 'approved', proof_url = 'https://twitter.com/proof/carol', submitted_at = now(), reviewed_at = now(), reviewed_by = $3, points_awarded = 10 WHERE task_id = $1 AND user_id = $2",
    [taskIds[1], userIds[2], adminId]
  );
  // Update task spend
  await client.query("UPDATE tasks SET points_spent = 10 WHERE id = $1", [taskIds[1]]);

  console.log("Created task assignments\n");

  // ===== NOTIFICATIONS =====
  const notifications = [
    { user_id: userIds[0], type: "task_assigned", title: "New task assigned", message: "You have a new task: Like our Facebook announcement post" },
    { user_id: userIds[1], type: "task_assigned", title: "New task assigned", message: "You have a new task: Follow our Twitter/X account" },
    { user_id: userIds[2], type: "task_approved", title: "Task approved!", message: "Your submission for 'Follow our Twitter/X account' was approved! You earned 10 points." },
    { user_id: adminId, type: "system", title: "New task pending approval", message: "Alice Johnson created a task that needs your approval: Share our LinkedIn post" },
    { user_id: adminId, type: "system", title: "New group pending approval", message: "Carol Davis created a group 'Sales Outreach' that needs your approval" },
  ];

  for (const n of notifications) {
    await client.query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)",
      [n.user_id, n.type, n.title, n.message]
    );
  }
  console.log("Created notifications\n");

  // ===== POINTS HISTORY =====
  await client.query(
    "INSERT INTO points_history (user_id, amount, action, description) VALUES ($1, $2, 'task_completed', 'Task completed: Follow our Twitter/X account')",
    [userIds[2], 10]
  );
  console.log("Created points history\n");

  // ===== VERIFY =====
  const userCount = await client.query("SELECT count(*) FROM users");
  const groupCount = await client.query("SELECT count(*) FROM groups");
  const taskCount = await client.query("SELECT count(*) FROM tasks");
  const assignmentCount = await client.query("SELECT count(*) FROM task_assignments");
  const notifCount = await client.query("SELECT count(*) FROM notifications");

  console.log("=== SUMMARY ===");
  console.log(`Users: ${userCount.rows[0].count}`);
  console.log(`Groups: ${groupCount.rows[0].count}`);
  console.log(`Tasks: ${taskCount.rows[0].count}`);
  console.log(`Assignments: ${assignmentCount.rows[0].count}`);
  console.log(`Notifications: ${notifCount.rows[0].count}`);

  await client.end();
  console.log("\nDone!");
}

seed().catch(console.error);
