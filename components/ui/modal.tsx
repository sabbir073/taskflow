"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Used as `aria-labelledby` target. Pass a unique id matching an element
  // inside `children` (typically the heading). When omitted, `aria-label`
  // is used instead.
  labelledBy?: string;
  ariaLabel?: string;
  // Backdrop classes — caller controls overlay look (blur, color, padding).
  backdropClassName?: string;
  // Panel wrapper classes — caller controls width / position / sizing.
  panelClassName?: string;
  // Close on backdrop click. Defaults to true. Set false for destructive
  // modals where stray clicks shouldn't dismiss.
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

// Accessible modal primitive. Provides:
// - role="dialog" + aria-modal="true" so screen readers announce it
// - focus trap: first focusable in panel takes focus on open; Tab loops
//   inside; trigger element gets focus back on close
// - Esc-to-close
// - body scroll lock while open
// Caller supplies the visual content; this component owns the a11y plumbing.
export function Modal({
  isOpen,
  onClose,
  labelledBy,
  ariaLabel,
  backdropClassName = "fixed inset-0 z-50 flex items-center justify-center bg-black/50",
  panelClassName = "bg-card rounded-2xl shadow-2xl border border-border max-w-lg w-full",
  closeOnBackdrop = true,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture the element that had focus before opening so we can restore it
  // when the modal closes.
  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    return () => {
      triggerRef.current?.focus?.();
    };
  }, [isOpen]);

  // Move focus to the first focusable element inside the panel on open.
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0];
    if (first) first.focus();
    else panel.focus();
  }, [isOpen]);

  // Esc-to-close + Tab focus trap.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Body scroll lock — prevents page underneath from scrolling while modal
  // is open. Saves and restores the previous overflow value.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={backdropClassName}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        tabIndex={-1}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
