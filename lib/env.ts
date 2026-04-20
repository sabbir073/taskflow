import { z } from "zod";

// Centralised env validation. Any required var missing at boot → loud, named
// error instead of a cryptic "can't connect to Supabase" failure on first
// DB query. SMTP is optional (email is best-effort); AWS is required because
// uploads are a core feature.

const envSchema = z.object({
  // Auth
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars (run `openssl rand -base64 32`)"),
  AUTH_URL: z.string().url("AUTH_URL must be a full URL (e.g. https://app.example.com)"),

  // Supabase — database + service role (server-only)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required (server-side only)"),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // AWS S3 — file uploads
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required"),
  CLOUDFRONT_DOMAIN: z.string().min(1, "CLOUDFRONT_DOMAIN is required (bare hostname, no protocol)"),

  // SMTP — OPTIONAL. Email is best-effort; blank vars disable sending silently.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

// Parse once on import. Throws a formatted error listing every missing /
// invalid var so misconfiguration is obvious at deploy time instead of first
// request.
function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nCheck your .env / deployment secrets.`);
  }
  return result.data;
}

export const env = parseEnv();
