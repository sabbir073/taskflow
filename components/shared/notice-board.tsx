"use client";

import { useState, useEffect, useRef, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { Btn, Modal } from "@/components/ui";
import { Megaphone, X, ChevronLeft, ChevronRight, Clock, ArrowRight } from "lucide-react";
import { useActiveNotices } from "@/hooks/use-notices";
import { useAppSettings } from "@/components/providers/settings-provider";
import { getSettingsMap } from "@/lib/actions/settings";
import { formatRelativeTime } from "@/lib/utils";
import { RichTextContent } from "./rich-text-content";

// Strip HTML tags + collapse whitespace for the 1-line body preview (notice
// bodies can be rich HTML; the full modal renders the real markup).
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// "NEW" badge for notices published within the last 48h.
function isRecent(createdAt: unknown): boolean {
  if (!createdAt) return false;
  const t = new Date(String(createdAt)).getTime();
  return Number.isFinite(t) && Date.now() - t < 48 * 60 * 60 * 1000;
}

function useNoticeBoardEnabled(fallback: boolean): boolean {
  const { data } = useQuery({
    queryKey: ["settings-live"],
    queryFn: getSettingsMap,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    staleTime: 30000,
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
  const [animating, setAnimating] = useState(false);

  const items = notices || [];
  const noticeTitleId = useId();

  // Track latest activeIdx in a ref so the auto-rotate interval can read it
  // without forcing a rebind on every tick (which previously caused
  // strict-mode double-tick & cadence drift after manual nav).
  const activeIdxRef = useRef(activeIdx);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  // `animating` also lives in a ref so slideTo's guard never reads a stale
  // closed-over value when fired from the auto-rotate interval (the interval's
  // slideTo is captured at effect-bind time — the closure froze the old
  // activeIdx/animating, which previously blocked the wrap back to index 0 and
  // stuck rotation on the last notice).
  const animatingRef = useRef(false);

  // Track pending animation timers so unmount/dep-change can cancel them
  // and `animating` can never get stuck true.
  const animTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const pending = animTimeoutsRef.current;
    return () => {
      pending.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Declared before the auto-rotate effect that references it. Guard on live
  // refs, not the closed-over state, so the interval can always wrap back to
  // index 0 and keep looping forever (the stale-closure guard was the bug).
  function slideTo(idx: number) {
    if (animatingRef.current || idx === activeIdxRef.current) return;
    animatingRef.current = true;
    setAnimating(true);
    const t1 = setTimeout(() => {
      activeIdxRef.current = idx; // fresh for the next interval tick
      setActiveIdx(idx);
      const t2 = setTimeout(() => {
        animatingRef.current = false;
        setAnimating(false);
      }, 50);
      animTimeoutsRef.current.push(t2);
    }, 250);
    animTimeoutsRef.current.push(t1);
  }

  // Auto-rotate. Deps no longer include activeIdx — interval reads ref.
  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const timer = setInterval(() => {
      const next = (activeIdxRef.current + 1) % items.length;
      slideTo(next);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length, paused]);

  if (!enabled) return null;
  if (isLoading || items.length === 0) return null;

  // Clamp at render so a deleted/deactivated notice can't strand us past the
  // end of the array — keeps the loop and counter healthy without a setState
  // effect (the auto-rotate interval also self-heals via its modulo wrap).
  const safeIdx = activeIdx < items.length ? activeIdx : 0;
  const current = items[safeIdx] || items[0];

  return (
    <>
      {/* ---- Spotlight announcement card ---- */}
      <div
        className="group mb-6 rounded-2xl overflow-hidden border border-primary/20 ring-1 ring-primary/10 bg-linear-to-br from-primary/10 via-card to-accent/10 shadow-lg shadow-primary/10"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="p-4 sm:p-5">
          {/* Header: pulsing megaphone + eyebrow + NEW + counter/nav */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <span className="absolute inset-0 rounded-xl bg-primary/40 animate-ping opacity-60" />
                <div className="relative w-9 h-9 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/30">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary">Announcements</span>
                {isRecent(current?.created_at) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
                    <span className="w-1 h-1 rounded-full bg-accent" /> New
                  </span>
                )}
              </div>
            </div>

            {items.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground font-mono tabular-nums mr-1">
                  {String(safeIdx + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")}
                </span>
                <button type="button" aria-label="Previous notice" onClick={() => slideTo((safeIdx - 1 + items.length) % items.length)}
                  className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" aria-label="Next notice" onClick={() => slideTo((safeIdx + 1) % items.length)}
                  className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Body: title + 1-line preview (crossfade on rotate) */}
          <button
            type="button"
            onClick={() => setOpenNotice(current)}
            className={`block w-full text-left transition-opacity duration-300 ${animating ? "opacity-0" : "opacity-100"}`}
          >
            <p className="text-base sm:text-lg font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {String(current?.title || "")}
            </p>
            {!!stripHtml(String(current?.body || "")) && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                {stripHtml(String(current?.body || ""))}
              </p>
            )}
          </button>

          {/* Footer: CTA + dot indicators */}
          <div className="flex items-center justify-between gap-3 mt-3">
            <button
              type="button"
              onClick={() => setOpenNotice(current)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:gap-1.5 transition-all"
            >
              Read full notice <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {items.length > 1 && (
              <div className="flex items-center gap-1.5">
                {items.map((n, i) => (
                  <button key={n.id as number} type="button" aria-label={`Go to notice ${i + 1}`}
                    onClick={() => slideTo(i)}
                    className={`rounded-full transition-all duration-300 ${i === safeIdx ? "w-5 h-1.5 bg-linear-to-r from-primary to-accent" : "w-1.5 h-1.5 bg-foreground/20 hover:bg-foreground/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thin animated progress bar */}
        {items.length > 1 && !paused && (
          <div className="h-0.5 bg-primary/10">
            <div
              key={safeIdx}
              className="h-full bg-linear-to-r from-primary to-accent"
              style={{ animation: "progress 5s linear forwards" }}
            />
          </div>
        )}
      </div>

      {/* ---- Full notice modal ---- */}
      <Modal
        isOpen={!!openNotice}
        onClose={() => setOpenNotice(null)}
        labelledBy={noticeTitleId}
        backdropClassName="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        panelClassName="bg-card rounded-2xl w-full max-w-2xl shadow-2xl border border-border/50 overflow-hidden"
      >
        {openNotice && (
          <>
            {/* Header */}
            <div className="bg-[#1a1a2e] dark:bg-[#0f0f1a] text-white p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-primary/30 via-transparent to-accent/20" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center shadow">
                      <Megaphone className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Announcement</span>
                  </div>
                  <h2 id={noticeTitleId} className="text-xl font-bold leading-tight">{String(openNotice.title || "")}</h2>
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
              {/^\s*<[a-zA-Z]/.test(String(openNotice.body || "")) ? (
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
          </>
        )}
      </Modal>
    </>
  );
}
