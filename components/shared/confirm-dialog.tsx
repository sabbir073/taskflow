"use client";

import { Btn } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning";
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel = "Confirm", isLoading = false, variant = "danger" }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-xl ${variant === "danger" ? "bg-error/10" : "bg-warning/10"}`}>
            <AlertTriangle className={`w-5 h-5 ${variant === "danger" ? "text-error" : "text-warning"}`} />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Btn>
          <Btn variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}
