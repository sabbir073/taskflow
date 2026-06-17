"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, Music, AlertTriangle } from "lucide-react";

// html2canvas (~120KB minified) is lazy-loaded inside finalize() — the
// screenshot capture step runs once at the end of the countdown, so we
// only ship the chunk to workers who actually start a music play. Other
// pages now skip the cost entirely.

// Music streaming play-lock player. Mirrors the YouTube watch modal but for
// Spotify / TIDAL / Deezer / SoundCloud / Bandcamp.
//
//   - Fullscreen overlay locks the page (no nav, no clicks except close + volume).
//   - Audio AUTO-PLAYS the moment the modal mounts: Spotify uses the iframe
//     SDK (loadSpotifyAPI below — mirrors the YouTube IFrame API integration
//     in youtube-watch-modal.tsx). TIDAL / Deezer / SoundCloud use embed
//     URL params (?autoplay=true / &auto_play=true). Bandcamp's embed
//     refuses autoplay; we still render it and show a hint, but the
//     countdown auto-starts regardless.
//   - 1500ms after mount the countdown begins automatically — no more
//     manual "Start counter" button. The brief warm-up lets the iframe
//     load + (where supported) audio actually start before the timer ticks.
//   - document.visibilitychange while running ⇒ pause + reset counter and
//     show a friendly warning. Matches "Stay on this tab to earn credit".
//   - On completion: html2canvas captures the modal card (NOT the iframe —
//     cross-origin frames are excluded by browsers), POSTs the screenshot to
//     /api/upload, fires onCompleted(screenshotUrl).

type Platform = "spotify" | "tidal" | "deezer" | "soundcloud" | "bandcamp";

// Minimal subset of Spotify's iframe-API surface we use. The full API has
// more events (player_update, ready) but we only need .play() on the
// controller and .destroy() during teardown.
type SpotifyController = {
  play: () => void;
  pause: () => void;
  destroy: () => void;
};

type SpotifyIFrameAPI = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
  }
}

// Cache the Spotify iframe API loader across the session — mirrors the
// YouTube IFrame API loader in youtube-watch-modal.tsx so the script is
// injected once even if the worker opens multiple Spotify tasks in a row.
let spotifyApiPromise: Promise<SpotifyIFrameAPI> | null = null;
function loadSpotifyAPI(): Promise<SpotifyIFrameAPI> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (spotifyApiPromise) return spotifyApiPromise;
  spotifyApiPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("spotify-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "spotify-iframe-api";
      tag.src = "https://open.spotify.com/embed/iframe-api/v1";
      tag.async = true;
      tag.onerror = () => reject(new Error("spotify-api-load-failed"));
      document.head.appendChild(tag);
    }
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      prev?.(api);
      resolve(api);
    };
    // 10s timeout matches the YouTube loader's tolerance — if the script
    // never fires the ready callback we fall back to the plain iframe.
    setTimeout(() => {
      if (!spotifyApiPromise) return;
      reject(new Error("spotify-api-timeout"));
    }, 10000);
  });
  return spotifyApiPromise;
}

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
        // ?autoplay=true makes TIDAL's embed start playback the moment the
        // iframe loads — no in-iframe click needed.
        const m = trimmed.match(/tidal\.com\/(?:browse\/)?tracks?\/(\d+)/i);
        if (m) return `https://embed.tidal.com/tracks/${m[1]}?autoplay=true`;
        return null;
      }
      case "deezer": {
        // https://www.deezer.com/{lang}/track/{ID}
        // ?autoplay=true makes Deezer's widget auto-start playback.
        const m = trimmed.match(/deezer\.com\/(?:[a-z]{2}\/)?track\/(\d+)/i);
        if (m) return `https://widget.deezer.com/widget/light/track/${m[1]}?autoplay=true`;
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

// Spotify iframe SDK expects a track URI (spotify:track:{ID}), not a URL.
// Returns null if the URL doesn't parse to a track ID — caller falls back
// to the plain iframe with the embed URL.
function extractSpotifyUri(url: string): string | null {
  if (!url) return null;
  const m = url.trim().match(/open\.spotify\.com\/(?:embed\/)?track\/([\w-]{6,})/i);
  return m ? `spotify:track:${m[1]}` : null;
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
  // Spotify-only: mount node + controller for the iframe SDK. For the other
  // 4 platforms we render a plain <iframe> and these stay unused.
  const spotifyMountRef = useRef<HTMLDivElement | null>(null);
  const spotifyControllerRef = useRef<SpotifyController | null>(null);
  const [spotifySdkFailed, setSpotifySdkFailed] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const embed = extractTrackEmbed(platformSlug, trackUrl);
  const spotifyUri = platformSlug === "spotify" ? extractSpotifyUri(trackUrl) : null;
  const requiredSec = Math.max(1, Math.floor(watchDurationSec));
  const progressPct = Math.min(100, (elapsedSec / requiredSec) * 100);

  // Single source of truth for the "everything's frozen" state: the counter
  // is running and hasn't finished yet. Drives the close-button disable, the
  // iframe click-blocker overlay, and any future per-control disabling.
  const isLocked = started && !completedRef.current;

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
  // Two signals listened on:
  //   1. `visibilitychange` — fires when the *tab* is hidden (other tab, alt-tab away).
  //   2. `window.blur` — fires when the *window* loses focus but the tab
  //      stays "visible" (clicking another app, opening DevTools popped out).
  // Both reset the counter so a worker can't background the tab.
  useEffect(() => {
    const reset = (reason: string) => {
      if (!started || completedRef.current) return;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setStarted(false);
      setElapsedSec(0);
      startedAtRef.current = null;
      setWarning(reason);
    };
    const onVisibility = () => {
      if (document.hidden) reset("Stay on this tab to earn credit. Counter reset.");
    };
    const onBlur = () => reset("Keep this window focused. Counter reset.");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [started]);

  // Body scroll lock while the modal is open so the worker can't scroll the
  // dashboard behind the lock. Restored on unmount.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

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

  // Spotify-only: load the iframe SDK and create a controller that
  // auto-starts playback. Mirrors the YouTube IFrame API pattern in
  // youtube-watch-modal.tsx. The user gesture from clicking "Open player"
  // (which mounted this modal) satisfies Spotify's autoplay policy. If the
  // SDK fails to load we mark `spotifySdkFailed` so the render falls back
  // to a plain iframe with the embed URL — the countdown still runs.
  useEffect(() => {
    if (platformSlug !== "spotify" || !spotifyUri) return;
    // Capture the mount node now so the cleanup function doesn't re-read
    // spotifyMountRef.current (which may have been nulled by then once the
    // <div ref={spotifyMountRef}> unmounts).
    const mountNode = spotifyMountRef.current;
    if (!mountNode) return;
    let cancelled = false;
    loadSpotifyAPI()
      .then((api) => {
        if (cancelled) return;
        api.createController(mountNode, { uri: spotifyUri, width: "100%", height: 232 }, (controller) => {
          if (cancelled) {
            try { controller.destroy(); } catch { /* noop */ }
            return;
          }
          spotifyControllerRef.current = controller;
          try { controller.play(); } catch { /* noop */ }
        });
      })
      .catch(() => {
        if (!cancelled) setSpotifySdkFailed(true);
      });
    return () => {
      cancelled = true;
      const c = spotifyControllerRef.current;
      spotifyControllerRef.current = null;
      try { c?.destroy(); } catch { /* noop */ }
      // Strip whatever the SDK left in the mount node so React can clean up
      // its tree without conflict.
      try { while (mountNode.firstChild) mountNode.removeChild(mountNode.firstChild); } catch { /* noop */ }
    };
  }, [platformSlug, spotifyUri]);

  // Auto-start countdown after a brief warm-up so the embed has time to
  // load + (where supported) begin playback. 1500ms is the sweet spot
  // between letting slow iframes mount and not boring the worker with
  // dead-air. Counter, visibility-reset, and lock-overlay all hang off
  // `started` so they pick this up automatically.
  useEffect(() => {
    if (!embed) return;
    const t = window.setTimeout(() => {
      setWarning(null);
      setElapsedSec(0);
      completedRef.current = false;
      startedAtRef.current = performance.now();
      setStarted(true);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [embed]);

  async function finalize() {
    setCapturing(true);
    let screenshotUrl: string | null = null;
    try {
      if (cardRef.current) {
        // Lazy import — see comment at the top of this file.
        const { default: html2canvas } = await import("html2canvas");
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
            onClick={isLocked ? undefined : onClose}
            disabled={isLocked}
            aria-label={isLocked ? "Close disabled until countdown ends" : "Close player"}
            aria-disabled={isLocked}
            title={isLocked ? "Close disabled — countdown in progress" : "Close"}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Iframe stage. Spotify uses the iframe SDK (mount node below);
            TIDAL / Deezer / SoundCloud auto-play via URL params; Bandcamp's
            embed refuses autoplay so a tiny hint surfaces in the footer. */}
        <div className="relative w-full bg-black" style={{ aspectRatio: platformSlug === "soundcloud" ? "16/9" : "auto", minHeight: platformSlug === "spotify" ? 232 : 232 }}>
          {!embed ? (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-white/70 text-sm">
              <div>
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-warning" />
                Could not parse this track URL for {PLATFORM_LABEL[platformSlug]}. Contact the task creator.
              </div>
            </div>
          ) : platformSlug === "spotify" && spotifyUri && !spotifySdkFailed ? (
            // Spotify SDK path: createController swaps this node for its own
            // iframe and we call .play() once it's ready.
            <div
              ref={spotifyMountRef}
              className="w-full"
              style={{ minHeight: 232 }}
            />
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
          {/* Click-blocker overlay — sits ABOVE the iframe / SDK mount
              while the countdown is running so the worker can't reach the
              embed's pause/seek controls. Only mounted while locked so a
              worker can still bail out during the 1500 ms warm-up if they
              opened the wrong track. */}
          {isLocked && (
            <div
              className="absolute inset-0 z-10 cursor-not-allowed"
              aria-hidden="true"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            />
          )}
        </div>

        {/* Progress + countdown */}
        {embed && (
          <div className="flex-shrink-0 px-4 py-3 bg-black/80 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
              <span>{started ? `${formatClock(Math.min(elapsedSec, requiredSec))} listened` : "Loading player…"}</span>
              <span>{formatClock(requiredSec)} required</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
                style={{ width: `${started ? progressPct : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-white/60 text-center">
              {capturing
                ? "Capturing proof…"
                : !started
                ? `Starting ${PLATFORM_LABEL[platformSlug]} player automatically…`
                : "Music is playing — stay on this tab. Switching tabs resets the counter."}
            </p>
            {platformSlug === "bandcamp" && !capturing && (
              <p className="text-[11px] text-white/50 text-center italic">
                Bandcamp doesn&apos;t support autoplay — click play in the player above if you don&apos;t hear music. The counter is already running.
              </p>
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
