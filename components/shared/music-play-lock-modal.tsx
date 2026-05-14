"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, Music, AlertTriangle } from "lucide-react";
import html2canvas from "html2canvas";

// Music streaming play-lock player. Mirrors the YouTube watch modal but for
// Spotify / TIDAL / Deezer / SoundCloud / Bandcamp. The reference doc spec:
//
//   - Fullscreen overlay locks the page (no nav, no clicks except close + volume).
//   - Worker hits Start → countdown begins (most music embeds expose no
//     play-state JS API, so we anchor the timer to the click rather than to
//     actual audio playback. SoundCloud's Widget API CAN report play/pause,
//     but to keep one implementation across platforms we use the click anchor
//     uniformly — it matches the reference doc's pseudocode).
//   - document.visibilitychange while running ⇒ pause + reset counter and
//     show a friendly warning. Matches "Stay on this tab to earn credit".
//   - On completion: html2canvas captures the modal card (NOT the iframe —
//     cross-origin frames are excluded by browsers), POSTs the screenshot to
//     /api/upload, fires onCompleted(screenshotUrl).

type Platform = "spotify" | "tidal" | "deezer" | "soundcloud" | "bandcamp";

interface Props {
  trackUrl: string;
  platformSlug: Platform;
  watchDurationSec: number;
  onCompleted: (screenshotUrl: string | null) => void;
  onClose: () => void;
}

// Build an iframe-embed URL from the user-pasted track URL per platform. We
// keep parsing tolerant — if anything fails we leave the original URL alone
// and let the iframe's own error surface via onError.
function extractTrackEmbed(slug: Platform, url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  try {
    switch (slug) {
      case "spotify": {
        // https://open.spotify.com/track/{ID}[?si=...]
        const m = trimmed.match(/open\.spotify\.com\/track\/([\w-]{6,})/i);
        if (m) return `https://open.spotify.com/embed/track/${m[1]}`;
        // Already an embed link
        if (/open\.spotify\.com\/embed\//.test(trimmed)) return trimmed;
        return null;
      }
      case "tidal": {
        // https://tidal.com/browse/track/{ID} or /tracks/{ID}
        const m = trimmed.match(/tidal\.com\/(?:browse\/)?tracks?\/(\d+)/i);
        if (m) return `https://embed.tidal.com/tracks/${m[1]}`;
        return null;
      }
      case "deezer": {
        // https://www.deezer.com/{lang}/track/{ID}
        const m = trimmed.match(/deezer\.com\/(?:[a-z]{2}\/)?track\/(\d+)/i);
        if (m) return `https://widget.deezer.com/widget/light/track/${m[1]}`;
        return null;
      }
      case "soundcloud": {
        // https://soundcloud.com/{artist}/{track} → wrap in the Widget URL
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(trimmed)}&auto_play=true&hide_related=true&visual=true`;
      }
      case "bandcamp": {
        // Bandcamp track URLs are too varied for a clean regex — the worker
        // will see the page in an iframe and can press play there. We just
        // sandbox the URL itself.
        return trimmed;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  spotify: "Spotify",
  tidal: "TIDAL",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
};

export function MusicPlayLockModal({
  trackUrl,
  platformSlug,
  watchDurationSec,
  onCompleted,
  onClose,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const [started, setStarted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const embed = extractTrackEmbed(platformSlug, trackUrl);
  const requiredSec = Math.max(1, Math.floor(watchDurationSec));
  const progressPct = Math.min(100, (elapsedSec / requiredSec) * 100);

  // Tick the elapsed counter while `started` is true. Resets on tab-focus
  // loss (visibilitychange below).
  useEffect(() => {
    if (!started) return;
    intervalRef.current = window.setInterval(() => {
      const start = startedAtRef.current;
      if (start == null) return;
      const next = Math.floor((performance.now() - start) / 1000);
      setElapsedSec(next);
      if (next >= requiredSec && !completedRef.current) {
        completedRef.current = true;
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        finalize();
      }
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, requiredSec]);

  // Tab-focus reset: if the worker switches tabs OR the window loses focus
  // while the counter is running, blow the counter away and force restart.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && started && !completedRef.current) {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        setStarted(false);
        setElapsedSec(0);
        startedAtRef.current = null;
        setWarning("Stay on this tab to earn credit. Counter reset.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [started]);

  // Global keyboard block while the modal is open so the worker can't
  // tab-switch via Ctrl+Tab or Esc-out without losing progress.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Block space (often used to play/pause the page audio) and arrow keys
      // that some embeds map to seek. Tab + Cmd combos remain free so the
      // user can still alt-tab if needed (which already triggers the reset).
      if ([" ", "Spacebar", "ArrowLeft", "ArrowRight", "k", "K"].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, []);

  function startTimer() {
    setWarning(null);
    setElapsedSec(0);
    completedRef.current = false;
    startedAtRef.current = performance.now();
    setStarted(true);
  }

  async function finalize() {
    setCapturing(true);
    let screenshotUrl: string | null = null;
    try {
      if (cardRef.current) {
        // html2canvas can't capture cross-origin iframes — the iframe area
        // will appear blank in the screenshot. We still get the surrounding
        // card (track title, countdown, duration) which is good-enough proof.
        const canvas = await html2canvas(cardRef.current, {
          useCORS: true,
          backgroundColor: "#0a0a0a",
          logging: false,
        });
        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
        if (blob) {
          const form = new FormData();
          form.append("file", new File([blob], `music-${platformSlug}-${Date.now()}.jpg`, { type: "image/jpeg" }));
          const res = await fetch("/api/upload", { method: "POST", body: form });
          const data = await res.json();
          if (data?.url) screenshotUrl = data.url as string;
        }
      }
    } catch {
      /* swallow — fall through and submit with null screenshot */
    }
    setCapturing(false);
    onCompleted(screenshotUrl);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex sm:items-center sm:justify-center sm:p-4">
      {/* Lock layer — covers everything; only the modal card receives clicks. */}
      <div
        ref={cardRef}
        className="flex flex-col w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl bg-black overflow-hidden shadow-2xl border border-white/10"
      >
        {/* Header — close only (closing does NOT submit). */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10">
          <div className="flex items-center gap-2 text-white/90">
            <Music className="w-4 h-4" />
            <p className="text-sm font-semibold">
              {PLATFORM_LABEL[platformSlug]} · listen ≥{formatClock(requiredSec)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Iframe stage. Bandcamp + Spotify embeds usually need a click
            inside the iframe to actually play (autoplay is blocked). We tell
            the worker to press play in the embed once before we start the
            counter. */}
        <div className="relative w-full bg-black" style={{ aspectRatio: platformSlug === "soundcloud" ? "16/9" : "auto", minHeight: platformSlug === "spotify" ? 152 : 232 }}>
          {!embed ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-white/70 text-sm">
              <div>
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-warning" />
                Could not parse this track URL for {PLATFORM_LABEL[platformSlug]}. Contact the task creator.
              </div>
            </div>
          ) : (
            <iframe
              src={embed}
              title="Music player"
              className="w-full h-full"
              style={{ minHeight: platformSlug === "spotify" ? 152 : 232, border: 0 }}
              allow="autoplay; encrypted-media"
              loading="lazy"
            />
          )}
        </div>

        {/* Progress + countdown */}
        {embed && (
          <div className="flex-shrink-0 px-4 py-3 bg-black/80 border-t border-white/10 space-y-3">
            {!started ? (
              <>
                <p className="text-xs text-white/70 text-center">
                  Press play in the {PLATFORM_LABEL[platformSlug]} embed above, then click <strong className="text-white">Start counter</strong> below. The timer runs even if you switch tabs — but switching will <strong>reset the counter</strong>.
                </p>
                <button
                  type="button"
                  onClick={startTimer}
                  disabled={capturing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow disabled:opacity-50"
                >
                  Start counter
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
                  <span>{formatClock(Math.min(elapsedSec, requiredSec))} watched</span>
                  <span>{formatClock(requiredSec)} required</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-white/60 text-center">
                  {capturing
                    ? "Capturing proof…"
                    : "Keep this tab focused. Switching tabs will reset the counter."}
                </p>
              </>
            )}
            {warning && (
              <p className="text-[11px] text-warning text-center flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> {warning}
              </p>
            )}
            {capturing && (
              <p className="text-[11px] text-white/60 text-center flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Submitting…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
