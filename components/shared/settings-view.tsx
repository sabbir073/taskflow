"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, Input, Btn } from "@/components/ui";
import { updateSetting } from "@/lib/actions/settings";
import { useAllPlatformsForAdmin, useSetPlatformActive } from "@/hooks/use-tasks";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import { SectionHeader } from "@/components/shared/section-header";
import { PlatformIcon, PLATFORM_BRAND_SLUGS } from "@/components/shared/platform-icon";
import { SlidersHorizontal, Palette, Bell, ShieldCheck, Coins, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "general", label: "General", icon: SlidersHorizontal, description: "Site name, description, and general toggles" },
  { key: "branding", label: "Branding", icon: Palette, description: "Colors and visual identity" },
  { key: "notifications", label: "Notifications", icon: Bell, description: "Notification behavior" },
  { key: "security", label: "Security", icon: ShieldCheck, description: "Approval, subscription gating, and access rules" },
  { key: "points", label: "Points", icon: Coins, description: "Points economy tuning" },
  { key: "platforms", label: "Platforms", icon: LayoutGrid, description: "Enable or disable platforms in the create-task picker" },
] as const;

// Unwrap JSONB values: "\"TaskMOS\"" -> "TaskMOS", true -> true
function unwrapValue(val: unknown): unknown {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

function displayValue(val: unknown): string {
  const unwrapped = unwrapValue(val);
  if (unwrapped === null || unwrapped === undefined) return "";
  return String(unwrapped);
}

function isBoolValue(val: unknown): boolean {
  const unwrapped = unwrapValue(val);
  return unwrapped === true || unwrapped === false;
}

function getBoolValue(val: unknown): boolean {
  const unwrapped = unwrapValue(val);
  return unwrapped === true;
}

function isNumberValue(val: unknown): boolean {
  return typeof unwrapValue(val) === "number";
}

function isColorKey(key: string, val: unknown): boolean {
  return /_color$/.test(key) && typeof unwrapValue(val) === "string";
}

// Words that should stay uppercase when deriving a label from a snake_case key.
const ACRONYMS: Record<string, string> = { usd: "USD", bdt: "BDT", url: "URL", id: "ID", ai: "AI", api: "API" };

function titleizeKey(key: string): string {
  return key
    .split("_")
    .map((w) => ACRONYMS[w] ?? (w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

type SettingMeta = { label: string; description: string };

// Human label + one-line description per known setting key. Unknown keys fall
// back to a Title-Cased derivation (titleizeKey). Keeping this as a TS map
// avoids a settings-metadata schema change — the `settings` table only stores
// key/value/category.
const SETTING_META: Record<string, SettingMeta> = {
  // General
  site_name: { label: "Site Name", description: "The public name shown across the app and in emails." },
  site_description: { label: "Site Description", description: "Short tagline used in page metadata and SEO." },
  site_url: { label: "Site URL", description: "Canonical base URL of the platform." },
  timezone: { label: "Timezone", description: "Default timezone used when displaying dates." },
  date_format: { label: "Date Format", description: "Pattern used to render dates (date-fns tokens)." },
  usd_to_bdt_rate: { label: "USD → BDT Rate", description: "Conversion rate used for BDT pricing and payments." },
  enable_notice_board: { label: "Notice Board", description: "Show the announcements notice board on the dashboard." },
  group_access_pricing_mode: { label: "Group Access — Pricing Mode", description: "\"auto\" = price auto-computed from the rates below (pay upfront); \"admin\" = admin sets the price per application." },
  group_access_base_price: { label: "Group Access — Base Price", description: "Flat base added to every group-access price (USD)." },
  group_access_rate_per_group: { label: "Group Access — Rate per Group", description: "Auto-pricing: charge per requested group (USD)." },
  group_access_rate_per_member: { label: "Group Access — Rate per Member", description: "Auto-pricing: charge per requested member (USD)." },
  group_access_rate_per_task: { label: "Group Access — Rate per Task", description: "Auto-pricing: charge per requested task (USD)." },
  // Branding
  primary_color: { label: "Primary Color", description: "Main brand color for buttons, links, and accents." },
  accent_color: { label: "Accent Color", description: "Secondary brand color used in gradients and highlights." },
  dark_mode_default: { label: "Dark Mode by Default", description: "New visitors start in dark mode unless they've chosen otherwise." },
  // Notifications
  email_notifications_enabled: { label: "Email Notifications", description: "Master switch for all outgoing emails." },
  task_assigned_email: { label: "Task Assigned Email", description: "Email a worker when a task is assigned to them." },
  task_approved_email: { label: "Task Approved Email", description: "Email a worker when their submission is approved." },
  task_rejected_email: { label: "Task Rejected Email", description: "Email a worker when their submission is rejected." },
  weekly_report_email: { label: "Weekly Report Email", description: "Send users a weekly summary of their activity." },
  // Security
  session_timeout_hours: { label: "Session Timeout (hours)", description: "How long a login session stays valid." },
  password_min_length: { label: "Minimum Password Length", description: "Fewest characters allowed in a password." },
  require_special_chars: { label: "Require Special Characters", description: "Passwords must include a symbol." },
  max_login_attempts: { label: "Max Login Attempts", description: "Failed logins before an account is temporarily locked." },
  lockout_duration_minutes: { label: "Lockout Duration (minutes)", description: "How long an account stays locked after too many failed attempts." },
  require_subscription: { label: "Require Subscription", description: "Force users to have an active plan to create tasks & groups." },
  require_user_approval: { label: "Require Signup Approval", description: "New accounts need staff approval before they can sign in." },
  // Points
  default_task_points: { label: "Default Task Points", description: "Starting point value suggested when creating a task." },
  daily_login_bonus: { label: "Daily Login Bonus", description: "Points awarded for logging in each day." },
  streak_multiplier: { label: "Streak Multiplier", description: "Bonus multiplier applied to login streaks." },
  referral_bonus: { label: "Referral Bonus", description: "Points granted for a successful referral." },
  milestone_10_tasks: { label: "10-Task Milestone Bonus", description: "Bonus points for completing 10 tasks." },
  rejection_penalty: { label: "Rejection Penalty", description: "Points deducted after repeated rejected submissions." },
  inactivity_penalty: { label: "Inactivity Penalty", description: "Points deducted for prolonged inactivity." },
};

function getSettingMeta(key: string): SettingMeta {
  return SETTING_META[key] ?? { label: titleizeKey(key), description: "" };
}

export function SettingsView({ initialSettings }: { initialSettings: Record<string, unknown>[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = settings.filter((s) => String(s.category) === activeTab);

  function getSettingValue(key: string): unknown {
    const setting = settings.find((s) => String(s.key) === key);
    return setting?.value;
  }

  async function handleSave(key: string) {
    setSaving(key);
    // Send the raw local value — never unwrapValue() here. unwrapValue runs
    // JSON.parse, so a JSON-parseable string typed into a text setting (e.g.
    // "123" or "true") would be coerced to a number/bool before saving. The
    // server (updateSetting) already coerces genuinely-numeric settings.
    const currentValue = getSettingValue(key);
    const result = await updateSetting(key, currentValue);
    if (result.success) { toast.success("Setting saved"); router.refresh(); }
    else toast.error(result.error);
    setSaving(null);
  }

  function updateLocal(key: string, newVal: unknown) {
    setSettings((prev) => prev.map((s) => (String(s.key) === key ? { ...s, value: newVal } : s)));
  }

  const activeCat = CATEGORIES.find((c) => c.key === activeTab) || CATEGORIES[0];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Category nav. Desktop (md+): quiet vertical sidebar. Mobile: a
          horizontal pill row consistent with the rest of the dashboard. */}
      <nav className="flex md:flex-col gap-2 md:gap-1 md:w-52 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-none shrink-0">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeTab === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`flex items-center gap-2.5 px-4 py-2 md:py-2.5 rounded-full md:rounded-xl text-sm font-medium text-left whitespace-nowrap transition-all
                ${isActive
                  ? "bg-linear-to-r from-primary to-accent text-white shadow-md shadow-primary/25 md:bg-none md:bg-primary/10 md:text-primary md:shadow-none md:font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground md:bg-transparent"}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {cat.label}
            </button>
          );
        })}
      </nav>
      <div className="flex-1 min-w-0">
        {activeTab === "platforms" ? (
          <PlatformsSettings />
        ) : (
        <Card>
          <SectionHeader
            icon={activeCat.icon}
            tint="bg-primary/10 text-primary"
            title={`${activeCat.label} settings`}
            description={activeCat.description}
          />
          <CardContent>
            {filtered.length === 0 ? <p className="text-sm text-muted-foreground py-4">No settings in this category</p> : (
              <div className="divide-y divide-border/40 -mx-1">
                {filtered.map((setting) => {
                  const key = String(setting.key);
                  const value = setting.value;
                  const meta = getSettingMeta(key);

                  // Left column shared by every row: friendly label + description.
                  const labelCol = (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{meta.label}</p>
                      {meta.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{meta.description}</p>}
                    </div>
                  );

                  // Boolean → toggle (saves immediately).
                  if (isBoolValue(value)) {
                    return (
                      <div key={key} className="flex items-center justify-between gap-4 py-3.5 px-4 hover:bg-muted/30 transition-colors">
                        {labelCol}
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={getBoolValue(value)}
                            disabled={saving === key}
                            onChange={(e) => {
                              const newVal = e.target.checked;
                              updateLocal(key, newVal);
                              // Save immediately for toggles
                              setSaving(key);
                              updateSetting(key, newVal).then((r) => {
                                if (r.success) { toast.success("Setting saved"); router.refresh(); }
                                else toast.error(r.error);
                                setSaving(null);
                              });
                            }}
                          />
                          <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-4 after:shadow-sm" />
                        </label>
                      </div>
                    );
                  }

                  // Color → swatch + hex input + Save.
                  if (isColorKey(key, value)) {
                    const hex = displayValue(value);
                    const validHex = /^#[0-9a-fA-F]{6}$/.test(hex);
                    return (
                      <div key={key} className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4 py-3.5 px-4 hover:bg-muted/30 transition-colors">
                        {labelCol}
                        <div className="flex items-center gap-2 w-full lg:w-auto lg:shrink-0">
                          <input
                            type="color"
                            value={validHex ? hex : "#000000"}
                            onChange={(e) => updateLocal(key, e.target.value)}
                            className="h-9 w-10 shrink-0 rounded-lg border border-border bg-card cursor-pointer p-0.5"
                            aria-label={`${meta.label} picker`}
                          />
                          <Input
                            value={hex}
                            className="flex-1 lg:flex-none lg:w-32 font-mono"
                            onChange={(e) => updateLocal(key, e.target.value)}
                          />
                          <Btn variant="outline" size="sm" disabled={saving === key} onClick={() => handleSave(key)}>
                            {saving === key ? "..." : "Save"}
                          </Btn>
                        </div>
                      </div>
                    );
                  }

                  // Number / text → input + Save.
                  const numeric = isNumberValue(value);
                  return (
                    <div key={key} className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4 py-3.5 px-4 hover:bg-muted/30 transition-colors">
                      {labelCol}
                      <div className="flex gap-2 w-full lg:w-auto lg:shrink-0">
                        <Input
                          type={numeric ? "number" : "text"}
                          inputMode={numeric ? "decimal" : undefined}
                          value={displayValue(value)}
                          className="flex-1 lg:flex-none lg:w-48"
                          onChange={(e) => updateLocal(key, e.target.value)}
                        />
                        <Btn variant="outline" size="sm" disabled={saving === key} onClick={() => handleSave(key)}>
                          {saving === key ? "..." : "Save"}
                        </Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}

// Admin-only: list every platform (incl. disabled) with a toggle that flips
// platforms.is_active. Disabled platforms vanish from getPlatforms() so the
// create-task picker no longer offers them; existing tasks on the platform
// keep working.
function PlatformsSettings() {
  const { data: platforms, isLoading } = useAllPlatformsForAdmin();
  const setActive = useSetPlatformActive();

  return (
    <Card>
      <SectionHeader
        icon={LayoutGrid}
        tint="bg-primary/10 text-primary"
        title="Platforms"
        description="Toggle a platform off to hide it from the create-task picker. Existing tasks on disabled platforms keep working."
      />
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading platforms…</p>
        ) : (
          <div className="space-y-1">
            {(platforms || []).map((p) => {
              const slug = String(p.slug);
              const cfg = PLATFORM_CONFIG[slug as keyof typeof PLATFORM_CONFIG];
              const name = cfg?.name || String(p.name);
              const color = cfg?.color || "#999";
              const isActive = !!p.is_active;
              const id = p.id as number;
              return (
                <div key={id} className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {PLATFORM_BRAND_SLUGS.has(slug)
                        ? <PlatformIcon slug={slug} className="w-4 h-4" />
                        : <span className="text-xs font-bold">{name.charAt(0)}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">/{slug}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isActive}
                      disabled={setActive.isPending}
                      onChange={(e) => setActive.mutate({ platformId: id, isActive: e.target.checked })}
                    />
                    <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-4 after:shadow-sm" />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
