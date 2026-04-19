"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useActivePopups } from "@/hooks/use-popups";

interface Props {
  target: "website" | "dashboard";
}

// Shows the first active popup for the given target as a centered modal.
// Tracks dismissed popup IDs in sessionStorage so they don't reappear
// until the user opens a new tab.
export function PopupDisplay({ target }: Props) {
  const { data: popups } = useActivePopups(target);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = sessionStorage.getItem(`dismissed_popups_${target}`);
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch { /* */ }
  }, [target]);

  if (!mounted) return null;

  const items = (popups || []).filter((p) => !dismissed.has(p.id as number));
  if (items.length === 0) return null;

  const popup = items[0];
  const id = popup.id as number;
  const imageUrl = String(popup.image_url || "");
  const text = String(popup.text_content || "");
  const textPosition = String(popup.text_position || "bottom");
  const linkUrl = String(popup.link_url || "");

  function dismiss() {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { sessionStorage.setItem(`dismissed_popups_${target}`, JSON.stringify([...next])); } catch { /* */ }
  }

  const content = (
    <>
      {/* Text above */}
      {text && textPosition === "top" && (
        <div className="px-5 pt-5 pb-2">
          <p className="text-sm text-center leading-relaxed">{text}</p>
        </div>
      )}

      {/* Image */}
      {imageUrl && (
        <div className={`${text && textPosition === "top" ? "px-5 pb-5" : text && textPosition === "bottom" ? "px-5 pt-5" : "p-0"}`}>
          {linkUrl ? (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              <img src={imageUrl} alt="" className="w-full h-auto rounded-lg hover:opacity-95 transition-opacity" />
            </a>
          ) : (
            <img src={imageUrl} alt="" className="w-full h-auto rounded-lg" />
          )}
        </div>
      )}

      {/* Text below */}
      {text && textPosition === "bottom" && (
        <div className="px-5 pb-5 pt-2">
          <p className="text-sm text-center leading-relaxed">{text}</p>
        </div>
      )}

      {/* If no image, just text */}
      {!imageUrl && text && (
        <div className="p-6">
          <p className="text-sm text-center leading-relaxed">{text}</p>
        </div>
      )}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={dismiss}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl border border-border/50 w-full max-w-lg overflow-hidden relative animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {content}
      </div>
    </div>
  );
}
