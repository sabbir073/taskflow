"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, Input, Btn } from "@/components/ui";
import { updateSetting } from "@/lib/actions/settings";
import { useAllPlatformsForAdmin, useSetPlatformActive } from "@/hooks/use-tasks";
import { PLATFORM_CONFIG } from "@/lib/constants/platforms";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "general", label: "General" },
  { key: "branding", label: "Branding" },
  { key: "notifications", label: "Notifications" },
  { key: "security", label: "Security" },
  { key: "points", label: "Points" },
  { key: "platforms", label: "Platforms" },
];

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
    const currentValue = getSettingValue(key);
    const result = await updateSetting(key, unwrapValue(currentValue));
    if (result.success) { toast.success("Setting saved"); router.refresh(); }
    else toast.error(result.error);
    setSaving(null);
  }

  function updateLocal(key: string, newVal: unknown) {
    setSettings((prev) => prev.map((s) => (String(s.key) === key ? { ...s, value: newVal } : s)));
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <nav className="flex md:flex-col gap-1 md:w-48 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button key={cat.key} onClick={() => setActiveTab(cat.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-colors whitespace-nowrap ${activeTab === cat.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            {cat.label}
          </button>
        ))}
      </nav>
      <div className="flex-1">
        {activeTab === "platforms" ? (
          <PlatformsSettings />
        ) : (
        <Card>
          <CardHeader><CardTitle className="capitalize">{activeTab} Settings</CardTitle></CardHeader>
          <CardContent>
            {filtered.length === 0 ? <p className="text-sm text-muted-foreground py-4">No settings in this category</p> : (
              <div className="space-y-1">
                {filtered.map((setting) => {
                  const key = String(setting.key);
                  const value = setting.value;
                  const displayKey = key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

                  if (isBoolValue(value)) {
                    return (
                      <div key={key} className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl hover:bg-muted/30 transition-colors">
                        <p className="text-sm font-medium">{displayKey}</p>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={getBoolValue(value)}
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

                  return (
                    <div key={key} className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl hover:bg-muted/30 transition-colors">
                      <p className="text-sm font-medium min-w-0 shrink-0">{displayKey}</p>
                      <div className="flex gap-2">
                        <Input
                          value={displayValue(value)}
                          className="w-48"
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
      <CardHeader>
        <CardTitle>Platforms</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Toggle a platform off to hide it from the create-task picker. Existing tasks on disabled platforms keep working.
        </p>
      </CardHeader>
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {name.charAt(0)}
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
