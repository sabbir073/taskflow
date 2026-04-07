import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use direct URL (port 5432) for migrations, not pooler
const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  console.error("Missing DIRECT_URL in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

const migrationsDir = join(__dirname, "../supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} migration files\n`);

try {
  await client.connect();
  console.log("Connected to database\n");

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    console.log(`Running: ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ✓ OK`);
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      // Continue with other migrations
    }
  }

  console.log("\n✓ All migrations complete!");
} catch (err) {
  console.error("Connection failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
