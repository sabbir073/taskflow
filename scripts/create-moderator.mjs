// Creates (or upgrades) a Moderator user.
//
// Usage:
//   pnpm exec node scripts/create-moderator.mjs <email> <password> [name]
//
// Behavior:
//   - If a user with the given email already exists, their role is updated
//     to "moderator" (idempotent).
//   - Otherwise a new users row is inserted with email_verified = now() and
//     a corresponding profile row with role = "moderator", is_approved = true.
//
// Environment:
//   DIRECT_URL must point at the Supabase Postgres direct connection string.

import pg from "pg";
import bcrypt from "bcryptjs";

const [, , emailArg, passwordArg, nameArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error("Usage: node scripts/create-moderator.mjs <email> <password> [name]");
  process.exit(2);
}

if (!process.env.DIRECT_URL) {
  console.error("Missing DIRECT_URL environment variable");
  process.exit(2);
}

const email = String(emailArg).trim().toLowerCase();
const name = nameArg || email.split("@")[0];

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log(`Connected. Provisioning moderator for ${email}...`);

  const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);

  if (existing.rows.length > 0) {
    const userId = existing.rows[0].id;
    await client.query(
      "UPDATE profiles SET role = 'moderator', is_approved = true, status = 'active' WHERE user_id = $1",
      [userId]
    );
    console.log(`User ${email} already existed — role upgraded to moderator (id ${userId}).`);
    return;
  }

  const passwordHash = await bcrypt.hash(passwordArg, 12);

  const insertUser = await client.query(
    `INSERT INTO users (name, email, email_verified, password_hash)
     VALUES ($1, $2, now(), $3)
     RETURNING id`,
    [name, email, passwordHash]
  );
  const userId = insertUser.rows[0].id;

  // The profile row is normally created by a trigger on users insert. If the
  // trigger isn't installed, fall back to inserting it manually.
  const profileExists = await client.query("SELECT 1 FROM profiles WHERE user_id = $1", [userId]);
  if (profileExists.rows.length === 0) {
    await client.query(
      `INSERT INTO profiles (user_id, role, status, is_approved)
       VALUES ($1, 'moderator', 'active', true)`,
      [userId]
    );
  } else {
    await client.query(
      "UPDATE profiles SET role = 'moderator', is_approved = true, status = 'active' WHERE user_id = $1",
      [userId]
    );
  }

  console.log(`Created moderator ${email} (id ${userId}).`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
