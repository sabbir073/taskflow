"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Btn } from "@/components/ui";
import { Volume2, X, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useActiveNotices } from "@/hooks/use-notices";
import { useAppSettings } from "@/components/providers/settings-provider";
import { getSettingsMap } from "@/lib/actions/settings";
import { formatRelativeTime } from "@/lib/utils";
import { RichTextContent } from "./rich-text-editor";

function useNoticeBoardEnabled(fallback: boolean): boolean {
  const { data } = useQuery({
    queryKey: ["settings-live"],
    queryFn: getSettingsMap,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
  if (!data) return fallback;
  const val = data.enable_notice_board;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    try { return JSON.parse(val) !== false; } catch { return fallback; }
  }
  return fallback;
}

export function NoticeBoard() {
  const settings = useAppSettings();
  const enabled = useNoticeBoardEnabled(settings.enable_notice_board !== false);
  const { data: notices, isLoading } = useActiveNotices();
  const [activeIdx, setActiveIdx] = useState(0);
  const [openNotice, setOpenNotice] = useState<Record<string, unknown> | null>(null);
  const [paused, setPaused] = useState(false);
  const [slideDir, setSlideDir] = useState<"up" | "down">("up");
  const [animating, setAnimating] = useState(false);

  const items = notices || [];

  // Auto-rotate
  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const timer = setInterval(() => slideTo((activeIdx + 1) % items.length, "up"), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, paused, activeIdx]);

  if (!enabled) return null;
  if (isLoading || items.length === 0) return null;

  function slideTo(idx: number, dir: "up" | "down") {
    if (animating || idx === activeIdx) return;
    setSlideDir(dir);
    setAnimating(true);
    setTimeout(() => { setActiveIdx(idx); setTimeout(() => setAnimating(false), 50); }, 250);
  }

  const current = items[activeIdx] || items[0];

  return (
    <>
      {/* ---- Marquee-style ticker ---- */}
      <div
        className="mb-6 rounded-xl overflow-hidden bg-[#1a1a2e] dark:bg-[#0f0f1a] text-white shadow-lg"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex items-stretch">
          {/* Left accent strip with icon */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-accent shrink-0">
            <Volume2 className="w-4 h-4 text-white" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/90 hidden sm:block">
              Notice
            </span>
          </div>

          {/* Ticker content */}
          <div className="flex-1 flex items-center px-4 py-3 min-w-0 overflow-hidden">
            <div className="flex-1 min-w-0 relative h-5">
              {items.map((n, i) => {
                const isActive = i === activeIdx;
                const title = String(n.title || "");
                return (
                  <button
                    key={n.id as number}
                    type="button"
                    onClick={() => setOpenNotice(n)}
                    className={`absolute inset-0 text-left text-sm font-medium truncate transition-all duration-300 ease-out cursor-pointer hover:text-accent
                      ${isActive && !animating ? "opacity-100 translate-y-0" : ""}
                      ${isActive && animating ? (slideDir === "up" ? "opacity-0 -translate-y-full" : "opacity-0 translate-y-full") : ""}
                      ${!isActive && !animating ? "opacity-0 translate-y-full" : ""}
                      ${!isActive && animating ? "opacity-0" : ""}
                    `}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side: counter + nav */}
          <div className="flex items-center gap-1 px-3 shrink-0">
            {items.length > 1 && (
              <>
                <span className="text-[10px] text-white/50 font-mono mr-1">
                  {String(activeIdx + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")}
                </span>
                <button type="button" onClick={() => slideTo((activeIdx - 1 + items.length) % items.length, "down")}
                  className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => slideTo((activeIdx + 1) % items.length, "up")}
                  className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpenNotice(current)}
              className="ml-1 text-[11px] font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              View
            </button>
          </div>
        </div>

        {/* Thin animated progress bar */}
        {items.length > 1 && !paused && (
          <div className="h-0.5 bg-white/5">
            <div
              key={activeIdx}
              className="h-full bg-gradient-to-r from-primary to-accent"
              style={{ animation: "progress 5s linear forwards" }}
            />
          </div>
        )}
      </div>

      {/* ---- Full notice modal ---- */}
      {openNotice && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpenNotice(null)}
        >
          <div
            className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#1a1a2e] dark:bg-[#0f0f1a] text-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/20" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow">
                      <Volume2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Announcement</span>
                  </div>
                  <h2 className="text-xl font-bold leading-tight">{String(openNotice.title || "")}</h2>
                  {!!openNotice.created_at && (
                    <p className="text-xs text-white/50 mt-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {formatRelativeTime(String(openNotice.created_at))}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setOpenNotice(null)}
                  className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {String(openNotice.body || "").startsWith("<") ? (
                <RichTextContent html={String(openNotice.body || "")} />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{String(openNotice.body || "")}</p>
              )}
            </div>

            {/* Footer navigation */}
            {items.length > 1 && (
              <div className="px-6 py-3 border-t border-border/40 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-1.5">
                  {items.map((n, i) => (
                    <button key={n.id as number} type="button"
                      onClick={() => { setActiveIdx(i); setOpenNotice(n); }}
                      className={`rounded-full transition-all duration-300 ${
                        (n.id as number) === (openNotice.id as number)
                          ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-foreground/20 hover:bg-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const idx = (items.findIndex((n) => (n.id as number) === (openNotice.id as number)) - 1 + items.length) % items.length;
                    setActiveIdx(idx); setOpenNotice(items[idx]);
                  }}><ChevronLeft className="w-4 h-4" /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const idx = (items.findIndex((n) => (n.id as number) === (openNotice.id as number)) + 1) % items.length;
                    setActiveIdx(idx); setOpenNotice(items[idx]);
                  }}><ChevronRight className="w-4 h-4" /></Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
