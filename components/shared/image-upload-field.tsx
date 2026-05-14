"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, Download as DownloadIcon, Loader2 } from "lucide-react";
import { Label } from "@/components/ui";

// Reusable S3 multi-image upload field. The single home for every image
// uploader in the product (task form, task edit form, profile avatar, group
// avatar+cover, popup image, per-item bundle images, proof screenshots).
//
// Files POST to /api/upload — already implements true S3 multipart upload
// via @aws-sdk/lib-storage (see [app/api/upload/route.ts]). Returns a single
// CloudFront URL per file.
//
// `value` accepts either string (legacy single-image storage) or string[];
// `onChange` always emits string[] so call sites can normalise to the new
// shape. When `multiple={false}` the array is capped at length 1.

interface Props {
  value: string | string[] | null | undefined;
  onChange: (next: string[]) => void;
  multiple?: boolean;
  maxImages?: number;
  label?: string;
  helperText?: string;
  showDownload?: boolean;
  className?: string;
  disabled?: boolean;
  accept?: string;
}

function normaliseValue(v: Props["value"]): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return [v];
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    // Fall back to opening the URL in a new tab if CORS prevents the blob fetch.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop();
    return last && last.includes(".") ? last : fallback;
  } catch {
    return fallback;
  }
}

export function ImageUploadField({
  value,
  onChange,
  multiple = true,
  maxImages = 6,
  label,
  helperText,
  showDownload = false,
  className = "",
  disabled = false,
  accept = "image/*",
}: Props) {
  const urls = normaliseValue(value);
  const cap = multiple ? maxImages : 1;
  const remaining = Math.max(0, cap - urls.length);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;
      const arr = Array.from(files).slice(0, remaining);
      if (arr.length === 0) return;
      setUploading(true);
      const uploaded: string[] = [];
      for (const file of arr) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.url) uploaded.push(data.url as string);
        } catch {
          /* silently skip; toast surfaces in caller if needed */
        }
      }
      if (uploaded.length > 0) {
        const next = multiple ? [...urls, ...uploaded].slice(0, cap) : uploaded.slice(0, 1);
        onChange(next);
      }
      setUploading(false);
    },
    [remaining, disabled, multiple, urls, cap, onChange]
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) uploadFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(i: number) {
    onChange(urls.filter((_, j) => j !== i));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  const dropTone = dragOver ? "border-primary/60 bg-primary/[0.04]" : "border-border hover:border-primary/40";
  const showDrop = remaining > 0 && !disabled;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}

      {urls.length > 0 && (
        <div className={`grid gap-2 ${multiple ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-1"}`}>
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group rounded-xl overflow-hidden border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={multiple ? "w-full h-24 object-cover" : "w-full h-32 object-cover"} />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Remove image"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {showDownload && (
                <button
                  type="button"
                  onClick={() => downloadFile(url, filenameFromUrl(url, `image-${i + 1}.jpg`))}
                  aria-label="Download image"
                  className="absolute bottom-1 right-1 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <DownloadIcon className="w-3 h-3" /> Download
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showDrop && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dropTone}`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading
              ? "Uploading..."
              : multiple
                ? `Click or drop images (${urls.length}/${cap})`
                : "Click or drop an image"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={onPick}
            className="hidden"
            disabled={disabled || uploading}
          />
        </label>
      )}

      {helperText && <p className="text-[11px] text-muted-foreground">{helperText}</p>}
    </div>
  );
}
