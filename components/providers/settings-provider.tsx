"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { getSettings } from "@/lib/actions/settings";

interface AppSettings {
  site_name: string;
  site_description: string;
  primary_color: string;
  accent_color: string;
  dark_mode_default: boolean;
  enable_notice_board: boolean;
  require_subscription: boolean;
  require_user_approval: boolean;
  [key: string]: unknown;
}

const defaultSettings: AppSettings = {
  site_name: "TaskMOS",
  site_description: "Social Media Task Exchange Platform",
  primary_color: "#7C3AED",
  accent_color: "#EC4899",
  dark_mode_default: false,
  enable_notice_board: true,
  require_subscription: false,
  require_user_approval: false,
};

const SettingsContext = createContext<AppSettings>(defaultSettings);

export function useAppSettings() {
  return useContext(SettingsContext);
}

function mergeSettings(rows: Record<string, unknown>[]): AppSettings {
  const map: AppSettings = { ...defaultSettings };
  for (const s of rows) {
    const key = String(s.key);
    let val = s.value;
    // Unwrap double-quoted strings from JSON storage
    if (typeof val === "string") {
      try { val = JSON.parse(val); } catch { /* keep as-is */ }
    }
    (map as Record<string, unknown>)[key] = val;
  }
  return map;
}

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: Record<string, unknown>[];
}) {
  const { setTheme, theme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(() => mergeSettings(initialSettings));

  // Re-sync when the server layout re-fetches settings (e.g. after admin toggles)
  useEffect(() => {
    setSettings(mergeSettings(initialSettings));
  }, [initialSettings]);

  // Periodic poll so admin changes in /settings (primary_color, accent_color,
  // require_subscription, require_user_approval, site_name, etc.) propagate
  // to other users without a manual page reload. 2-minute interval is fine
  // — settings rarely change and this is purely background sync. Failures
  // (network blip, server hiccup) silently keep the previous values.
  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const fresh = await getSettings();
        if (Array.isArray(fresh)) {
          setSettings(mergeSettings(fresh as Record<string, unknown>[]));
        }
      } catch {
        // Network blip — keep previous values; next tick will retry.
      }
    }, 2 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Apply branding CSS variables when settings change
  useEffect(() => {
    const root = document.documentElement;

    if (settings.primary_color) {
      root.style.setProperty("--primary", settings.primary_color);
    }
    if (settings.accent_color) {
      root.style.setProperty("--accent", settings.accent_color);
    }
  }, [settings.primary_color, settings.accent_color]);

  // Apply dark mode default on first load (only if user hasn't set a preference)
  useEffect(() => {
    if (settings.dark_mode_default && theme === "light") {
      // Only apply if no user preference stored
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setTheme("dark");
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
