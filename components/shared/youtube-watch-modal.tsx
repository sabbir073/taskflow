"use client";

import { useEffect, useRef, useState } from "react";
import { X, Volume2, VolumeX, Loader2 } from "lucide-react";

// Minimal subset of the YouTube IFrame Player API surface we touch.
type YTPlayer = {
  destroy: () => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  playVideo: () => void;
};

type YTPlayerEvent = { data: number; target: YTPlayer };

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number; UNSTARTED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Cache the API loader across the app session so we don't re-inject the
// script on every modal mount. Resolves once `window.YT` is ready to use.
let apiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("yt-api-load-failed"));
      document.head.appendChild(tag);
    }
    // YouTube calls this global when the API is ready.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    // Timeout — if the script never fires the callback, fail loudly.
    setTimeout(() => {
      if (!window.YT?.Player) reject(new Error("yt-api-timeout"));
    }, 10000);
  });
  return apiPromise;
}

// Pulls a video ID from any common YouTube URL form.
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // youtu.be/<id>
  let m = trimmed.match(/youtu\.be\/([\w-]{6,})/);
  if (m) return m[1];
  // youtube.com/watch?v=<id>
  m = trimmed.match(/[?&]v=([\w-]{6,})/);
  if (m) return m[1];
  // youtube.com/embed/<id> or /shorts/<id> or /live/<id>
  m = trimmed.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{6,})/);
  if (m) return m[1];
  // Last resort: bare 11-char ID
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

const BLOCKED_KEYS = new Set([
  " ", "Spacebar", "k", "K", // play/pause toggles
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", // seek + volume bypass
  "j", "J", "l", "L", // 10s seek
  "f", "F", // fullscreen
  "m", "M", // mute toggle (we own this)
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", // % seek
  ",", ".", // frame step
  "c", "C", // captions
]);

export function YoutubeWatchModal({
  videoUrl,
  onCompleted,
  onClose,
}: {
  videoUrl: string;
  onCompleted: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const completedRef = useRef(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);

  const videoId = extractYouTubeId(videoUrl);

  // Mount + create player.
  //
  // CRITICAL: YouTube's IFrame API REPLACES whatever DOM node we pass it
  // with its own <iframe>. If we hand it `containerRef.current` (a node
  // React owns), React's reconciler still thinks the original div is its
  // child and later throws "Failed to execute 'insertBefore' on 'Node'"
  // during unmount. The fix is to create an inner placeholder div via
  // `document.createElement` and let YT replace THAT — React only ever
  // sees the outer container, which YT never touches.
  useEffect(() => {
    if (!videoId) {
      setLoadState("error");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let mountedNode: HTMLDivElement | null = null;

    loadYouTubeAPI()
      .then(() => {
        if (cancelled || !window.YT?.Player) return;

        // Inner placeholder that YT.Player will swap for its iframe.
        // Owned outside React's tree — we add and remove it ourselves.
        mountedNode = document.createElement("div");
        mountedNode.style.width = "100%";
        mountedNode.style.height = "100%";
        container.appendChild(mountedNode);

        playerRef.current = new window.YT.Player(mountedNode, {
          videoId,
          playerVars: {
            // Lock down the chrome — controls hidden, no related, no kbd, no fs
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            fs: 0,
            iv_load_policy: 3,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: YTPlayerEvent) => {
              if (cancelled) return;
              setLoadState("ready");
              try {
                e.target.setVolume(volume);
                e.target.playVideo();
              } catch {
                /* noop */
              }
            },
            onStateChange: (e: YTPlayerEvent) => {
              // 0 = ENDED. We ignore PAUSED/BUFFERING/etc — only completion submits.
              if (e.data === 0 && !completedRef.current) {
                completedRef.current = true;
                onCompleted();
              }
            },
            onError: () => {
              if (!cancelled) setLoadState("error");
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
      // Destroy BEFORE we touch the DOM so the SDK stops postMessaging.
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
      playerRef.current = null;
      // After destroy(), YT removes its iframe, but if anything is left
      // behind (mountedNode still attached, or the iframe stayed), strip
      // it ourselves so React's reconciliation has a clean slate.
      try {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Block global keyboard shortcuts that would let the user pause/seek
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, []);

  // Volume slider → player
  function handleVolumeChange(next: number) {
    setVolume(next);
    if (next > 0 && muted) {
      setMuted(false);
      playerRef.current?.unMute();
    }
    playerRef.current?.setVolume(next);
  }

  function toggleMute() {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex sm:items-center sm:justify-center sm:p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-2xl bg-black overflow-hidden shadow-2xl">
        {/* Header — close only. Closing does NOT submit. */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10">
          <p className="text-sm font-semibold text-white/90">Watch the full video to complete this task</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video stage — locked. The pointer-events overlay prevents
            clicks from reaching the iframe (right-click, double-click for
            fullscreen, the YouTube logo, etc). */}
        <div className="relative flex-1 sm:flex-none w-full bg-black aspect-video">
          {loadState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
            </div>
          )}
          {loadState === "error" && (
            <div className="absolute inset-0 flex items-center justify-center text-center px-6">
              <div>
                <p className="text-white font-semibold mb-1">Could not load this video</p>
                <p className="text-white/60 text-xs">The link may be invalid or YouTube blocked playback. Close and try again.</p>
              </div>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
          {/* Click-blocking overlay — sits above the iframe so the user
              can't trigger YouTube's own controls or context menu. */}
          <div
            className="absolute inset-0"
            style={{ pointerEvents: loadState === "ready" ? "auto" : "none" }}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
            onDoubleClick={(e) => e.preventDefault()}
          />
        </div>

        {/* Footer — volume controls only */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-black/80 border-t border-white/10">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            aria-label="Volume"
            className="flex-1 h-1.5 rounded-full accent-primary cursor-pointer"
          />
          <span className="text-[11px] font-mono text-white/60 w-9 text-right">{muted ? 0 : volume}%</span>
        </div>
      </div>
    </div>
  );
}
