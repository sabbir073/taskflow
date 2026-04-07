"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";

interface AppSettings {
  site_name: string;
  site_description: string;
  primary_color: string;
  accent_color: string;
  dark_mode_default: boolean;
  [key: string]: unknown;
}

const defaultSettings: AppSettings = {
  site_name: "TaskFlow",
  site_description: "Social Media Task Exchange Platform",
  primary_color: "#7C3AED",
  accent_color: "#EC4899",
  dark_mode_default: false,
};

const SettingsContext = createContext<AppSettings>(defaultSettings);

export function useAppSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings: Record<string, unknown>[];
}) {
  const { setTheme, theme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const map = { ...defaultSettings };
    for (const s of initialSettings) {
      const key = String(s.key);
      let val = s.value;
      // Unwrap double-quoted strings from JSON storage
      if (typeof val === "string") {
        try { val = JSON.parse(val); } catch { /* keep as-is */ }
      }
      (map as Record<string, unknown>)[key] = val;
    }
    return map;
  });

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

  // Update document title with site name
  useEffect(() => {
    // Update the favicon/tab title prefix
    const titleEl = document.querySelector("title");
    if (titleEl && !titleEl.textContent?.includes(settings.site_name)) {
      // The Next.js metadata handles the title, so we just update the CSS variable
    }
  }, [settings.site_name]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
