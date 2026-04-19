"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent, type Editor, NodeViewWrapper, type NodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import ImageExt from "@tiptap/extension-image";
import YoutubeExt from "@tiptap/extension-youtube";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Code, Quote, Minus,
  Link as LinkIcon, Undo2, Redo2, ImagePlus, Video, X, Check,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Subscript as SubIcon, Superscript as SupIcon,
  Table as TableIcon, Type, Palette, ChevronDown,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Custom image with drag-to-resize
const ResizableImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("width") || el.style.width || null, renderHTML: (attrs: Record<string, unknown>) => attrs.width ? { style: `width: ${attrs.width}` } : {} },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(ImageResizeView); },
});

// Custom youtube with drag-to-resize
const ResizableYoutube = YoutubeExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      customWidth: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-width") || null, renderHTML: (attrs: Record<string, unknown>) => attrs.customWidth ? { "data-width": attrs.customWidth } : {} },
    };
  },
  addNodeView() { return ReactNodeViewRenderer(YoutubeResizeView); },
});

// Extend TextStyle to support fontSize
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize || null,
        renderHTML: (attrs: Record<string, unknown>) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
});

export function RichTextEditor({ value, onChange, placeholder, minHeight = "180px" }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        // Disable built-ins we add separately with custom config
        ...({ link: false, underline: false } as Record<string, unknown>),
      }),
      UnderlineExt,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline", target: "_blank", rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder: placeholder || "Start typing..." }),
      ResizableImage.configure({ HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-2" }, allowBase64: false }),
      ResizableYoutube.configure({ HTMLAttributes: { class: "rounded-lg my-2" }, width: 640, height: 360 }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

// ============================================================================
// Full-featured toolbar
// ============================================================================
const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px"];
const HEADING_OPTIONS = [
  { label: "Normal", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
  { label: "Heading 4", level: 4 },
];
const TEXT_COLORS = [
  "#000000", "#374151", "#6B7280", "#DC2626", "#EA580C", "#D97706", "#16A34A",
  "#0EA5E9", "#2563EB", "#7C3AED", "#DB2777", "#FFFFFF",
];
const HIGHLIGHT_COLORS = [
  "transparent", "#FEF08A", "#BBF7D0", "#BFDBFE", "#E9D5FF", "#FECDD3", "#FED7AA", "#D1FAE5",
];

function EditorToolbar({ editor }: { editor: Editor }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showHeadings, setShowHeadings] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  function closeAll() {
    setShowColors(false);
    setShowHighlights(false);
    setShowHeadings(false);
    setShowFontSize(false);
  }

  // ---- Image upload ----
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    } catch { /* */ }
    setUploadingImage(false);
    e.target.value = "";
  }

  // ---- Image by URL ----
  function insertImageUrl(url: string) {
    if (url) editor.chain().focus().setImage({ src: url }).run();
    setShowImageInput(false);
  }

  const btn = (active: boolean) =>
    `p-1.5 rounded-md transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

  // Current heading level label
  const currentHeading = HEADING_OPTIONS.find((h) =>
    h.level === 0 ? !editor.isActive("heading") : editor.isActive("heading", { level: h.level })
  );

  return (
    <div className="border-b border-border/60 bg-muted/30">
      {/* Row 1: main formatting */}
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-border/30">
        {/* Heading dropdown */}
        <DropdownButton
          label={currentHeading?.label || "Normal"}
          isOpen={showHeadings}
          onClick={() => { closeAll(); setShowHeadings(!showHeadings); }}
          className="min-w-[100px]"
        >
          {HEADING_OPTIONS.map((h) => (
            <button
              key={h.level}
              type="button"
              onClick={() => {
                if (h.level === 0) editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level: h.level as 1 | 2 | 3 | 4 }).run();
                setShowHeadings(false);
              }}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-muted rounded-md ${
                (h.level === 0 && !editor.isActive("heading")) || editor.isActive("heading", { level: h.level })
                  ? "text-primary font-semibold" : ""
              }`}
            >
              {h.label}
            </button>
          ))}
        </DropdownButton>

        {/* Font size dropdown */}
        <DropdownButton
          label={<Type className="w-3.5 h-3.5" />}
          isOpen={showFontSize}
          onClick={() => { closeAll(); setShowFontSize(!showFontSize); }}
          title="Font Size"
        >
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
                setShowFontSize(false);
              }}
              className="block w-full text-left px-3 py-1 text-sm hover:bg-muted rounded-md"
              style={{ fontSize: size }}
            >
              {size}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { editor.chain().focus().unsetMark("textStyle").run(); setShowFontSize(false); }}
            className="block w-full text-left px-3 py-1 text-xs hover:bg-muted rounded-md text-muted-foreground mt-1 border-t border-border/40 pt-2"
          >
            Reset
          </button>
        </DropdownButton>

        <Sep />

        {/* Bold / Italic / Underline / Strikethrough */}
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="Bold"><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="Italic"><Italic className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))} title="Underline"><Underline className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive("strike"))} title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={btn(editor.isActive("subscript"))} title="Subscript"><SubIcon className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={btn(editor.isActive("superscript"))} title="Superscript"><SupIcon className="w-4 h-4" /></button>

        <Sep />

        {/* Text color */}
        <DropdownButton
          label={<Palette className="w-4 h-4" />}
          isOpen={showColors}
          onClick={() => { closeAll(); setShowColors(!showColors); }}
          title="Text Color"
          activeColor={editor.getAttributes("textStyle").color}
        >
          <div className="grid grid-cols-6 gap-1 p-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { editor.chain().focus().setColor(c).run(); setShowColors(false); }}
                className="w-6 h-6 rounded-md border border-border/60 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => { editor.chain().focus().unsetColor().run(); setShowColors(false); }}
            className="w-full text-xs text-center py-1 text-muted-foreground hover:text-foreground mt-1"
          >
            Reset color
          </button>
        </DropdownButton>

        {/* Highlight */}
        <DropdownButton
          label={<Highlighter className="w-4 h-4" />}
          isOpen={showHighlights}
          onClick={() => { closeAll(); setShowHighlights(!showHighlights); }}
          title="Highlight"
        >
          <div className="grid grid-cols-4 gap-1 p-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  if (c === "transparent") editor.chain().focus().unsetHighlight().run();
                  else editor.chain().focus().toggleHighlight({ color: c }).run();
                  setShowHighlights(false);
                }}
                className="w-7 h-7 rounded-md border border-border/60 hover:scale-110 transition-transform flex items-center justify-center"
                style={{ backgroundColor: c === "transparent" ? undefined : c }}
                title={c === "transparent" ? "Remove" : c}
              >
                {c === "transparent" && <X className="w-3 h-3 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </DropdownButton>
      </div>

      {/* Row 2: alignment, lists, blocks, media */}
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5">
        {/* Alignment */}
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btn(editor.isActive({ textAlign: "left" }))} title="Align Left"><AlignLeft className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btn(editor.isActive({ textAlign: "center" }))} title="Center"><AlignCenter className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btn(editor.isActive({ textAlign: "right" }))} title="Align Right"><AlignRight className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btn(editor.isActive({ textAlign: "justify" }))} title="Justify"><AlignJustify className="w-4 h-4" /></button>

        <Sep />

        {/* Lists & blocks */}
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="Bullet List"><List className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="Quote"><Quote className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive("codeBlock"))} title="Code"><Code className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)} title="Line"><Minus className="w-4 h-4" /></button>

        <Sep />

        {/* Table */}
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={btn(editor.isActive("table"))}
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        <Sep />

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            if (editor.isActive("link")) { editor.chain().focus().extendMarkRange("link").unsetLink().run(); }
            else { setShowLinkInput(true); setShowVideoInput(false); setShowImageInput(false); }
          }}
          className={btn(editor.isActive("link"))}
          title="Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        {/* Image */}
        <button
          type="button"
          onClick={() => imageFileRef.current?.click()}
          className={`${btn(false)} ${uploadingImage ? "opacity-50" : ""}`}
          title="Upload Image"
          disabled={uploadingImage}
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input ref={imageFileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

        {/* Image by URL */}
        <button
          type="button"
          onClick={() => { setShowImageInput(true); setShowLinkInput(false); setShowVideoInput(false); }}
          className={btn(false)}
          title="Image from URL"
        >
          <span className="text-[10px] font-bold leading-none">IMG</span>
        </button>

        {/* Video */}
        <button
          type="button"
          onClick={() => { setShowVideoInput(true); setShowLinkInput(false); setShowImageInput(false); }}
          className={btn(false)}
          title="Embed Video"
        >
          <Video className="w-4 h-4" />
        </button>

        <Sep />

        {/* Undo / Redo */}
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${btn(false)} disabled:opacity-30`} title="Undo"><Undo2 className="w-4 h-4" /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${btn(false)} disabled:opacity-30`} title="Redo"><Redo2 className="w-4 h-4" /></button>
      </div>

      {/* Inline inputs */}
      {showLinkInput && (
        <InlineInput icon={<LinkIcon className="w-3.5 h-3.5" />} placeholder="Paste URL and press Enter" initialValue={editor.getAttributes("link").href || ""}
          onSubmit={(url) => { if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run(); setShowLinkInput(false); }}
          onCancel={() => setShowLinkInput(false)} />
      )}
      {showVideoInput && (
        <InlineInput icon={<Video className="w-3.5 h-3.5" />} placeholder="Paste YouTube URL"
          onSubmit={(url) => {
            if (url) {
              editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
            }
            setShowVideoInput(false);
          }}
          onCancel={() => setShowVideoInput(false)} />
      )}
      {showImageInput && (
        <InlineInput icon={<ImagePlus className="w-3.5 h-3.5" />} placeholder="Paste image URL"
          onSubmit={(url) => insertImageUrl(url)}
          onCancel={() => setShowImageInput(false)} />
      )}
    </div>
  );
}

// ============================================================================
// Shared primitives
// ============================================================================
function DropdownButton({
  label,
  isOpen,
  onClick,
  children,
  title,
  className,
  activeColor,
}: {
  label: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  activeColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClick();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClick]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors
          ${isOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"} ${className || ""}`}
      >
        {activeColor && (
          <span className="w-3 h-3 rounded-sm border border-border/60 shrink-0" style={{ backgroundColor: activeColor }} />
        )}
        {label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl p-1.5 min-w-[120px]">
          {children}
        </div>
      )}
    </div>
  );
}

function InlineInput({
  placeholder, icon, initialValue, onSubmit, onCancel,
}: {
  placeholder: string; icon: React.ReactNode; initialValue?: string;
  onSubmit: (value: string) => void; onCancel: () => void;
}) {
  const [val, setVal] = useState(initialValue || "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-t border-border/40">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <input ref={inputRef} type="url" value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(val.trim()); } if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
      <button type="button" onClick={() => onSubmit(val.trim())} className="p-1 rounded-md hover:bg-primary/10 text-primary"><Check className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={onCancel} className="p-1 rounded-md hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function Sep() { return <div className="w-px h-5 bg-border mx-0.5" />; }

// ============================================================================
// Drag-to-resize node views
// ============================================================================
function ImageResizeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [resizing, setResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startW = useRef(0);
  const dirRef = useRef<"left" | "right">("right");

  const onHandleDown = useCallback((dir: "left" | "right", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dirRef.current = dir;
    setResizing(true);
    startX.current = e.clientX;
    startW.current = containerRef.current?.offsetWidth || 300;
  }, []);

  useEffect(() => {
    if (!resizing) return;
    function onMouseMove(e: MouseEvent) {
      const mult = dirRef.current === "left" ? -1 : 1;
      const diff = (e.clientX - startX.current) * mult;
      const newW = Math.max(80, startW.current + diff);
      if (containerRef.current) containerRef.current.style.width = `${newW}px`;
    }
    function onMouseUp(e: MouseEvent) {
      setResizing(false);
      const mult = dirRef.current === "left" ? -1 : 1;
      const diff = (e.clientX - startX.current) * mult;
      const newW = Math.max(80, startW.current + diff);
      updateAttributes({ width: `${newW}px` });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); };
  }, [resizing, updateAttributes]);

  const show = selected || resizing;
  const handleClass = (cursor: string) =>
    `absolute bg-primary/80 border-2 border-white shadow-md rounded-sm transition-opacity ${show ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${cursor}`;

  return (
    <NodeViewWrapper className="inline-block my-2">
      <div
        ref={containerRef}
        className={`relative inline-block group ${selected ? "ring-2 ring-primary/40 rounded-lg" : ""}`}
        style={{ width: node.attrs.width || undefined }}
      >
        <img src={node.attrs.src} alt={node.attrs.alt || ""} className="rounded-lg w-full h-auto block" draggable={false} />

        {/* Left handles */}
        <div onMouseDown={(e) => onHandleDown("left", e)} className={`${handleClass("cursor-w-resize")} top-1/2 -translate-y-1/2 left-1 w-2 h-8`} />
        <div onMouseDown={(e) => onHandleDown("left", e)} className={`${handleClass("cursor-nw-resize")} top-1 left-1 w-3 h-3`} />
        <div onMouseDown={(e) => onHandleDown("left", e)} className={`${handleClass("cursor-sw-resize")} bottom-1 left-1 w-3 h-3`} />

        {/* Right handles */}
        <div onMouseDown={(e) => onHandleDown("right", e)} className={`${handleClass("cursor-e-resize")} top-1/2 -translate-y-1/2 right-1 w-2 h-8`} />
        <div onMouseDown={(e) => onHandleDown("right", e)} className={`${handleClass("cursor-ne-resize")} top-1 right-1 w-3 h-3`} />
        <div onMouseDown={(e) => onHandleDown("right", e)} className={`${handleClass("cursor-se-resize")} bottom-1 right-1 w-3 h-3`} />

        {/* Size label */}
        {show && containerRef.current && (
          <span className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-mono pointer-events-none">
            {Math.round(containerRef.current.offsetWidth)}px
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// Convert any YouTube URL to its embed form
function toYoutubeEmbed(url: string): string {
  if (!url) return "";
  // Already an embed URL
  if (url.includes("/embed/")) return url;
  // youtu.be/ID
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  // youtube.com/watch?v=ID
  const long = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (long) return `https://www.youtube.com/embed/${long[1]}`;
  // youtube.com/shorts/ID
  const shorts = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
  return url;
}

function YoutubeResizeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [resizing, setResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startW = useRef(0);
  const dirRef = useRef<"left" | "right">("right");

  const width = node.attrs.customWidth ? parseInt(node.attrs.customWidth, 10) : (node.attrs.width || 640);
  const height = node.attrs.height || 360;
  const aspect = height / (node.attrs.width || 640);
  const embedSrc = toYoutubeEmbed(node.attrs.src || "");

  const onHandleDown = useCallback((dir: "left" | "right", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dirRef.current = dir;
    setResizing(true);
    startX.current = e.clientX;
    startW.current = containerRef.current?.offsetWidth || width;
  }, [width]);

  useEffect(() => {
    if (!resizing) return;
    function onMouseMove(e: MouseEvent) {
      const mult = dirRef.current === "left" ? -1 : 1;
      const diff = (e.clientX - startX.current) * mult;
      const newW = Math.max(200, startW.current + diff);
      if (containerRef.current) {
        containerRef.current.style.width = `${newW}px`;
        const iframe = containerRef.current.querySelector("iframe");
        if (iframe) { iframe.style.width = `${newW}px`; iframe.style.height = `${Math.round(newW * aspect)}px`; }
      }
    }
    function onMouseUp(e: MouseEvent) {
      setResizing(false);
      const mult = dirRef.current === "left" ? -1 : 1;
      const diff = (e.clientX - startX.current) * mult;
      const newW = Math.max(200, startW.current + diff);
      updateAttributes({ customWidth: String(newW), width: newW, height: Math.round(newW * aspect) });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => { document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp); };
  }, [resizing, updateAttributes, aspect]);

  const show = selected || resizing;
  const handleClass = (cursor: string) =>
    `absolute bg-primary/80 border-2 border-white shadow-md rounded-sm transition-opacity ${show ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${cursor}`;

  const currentW = node.attrs.customWidth ? parseInt(node.attrs.customWidth, 10) : width;

  return (
    <NodeViewWrapper className="my-2">
      <div
        ref={containerRef}
        className={`relative inline-block group ${selected ? "ring-2 ring-primary/40 rounded-lg" : ""}`}
        style={{ width: `${currentW}px` }}
      >
        <iframe
          src={embedSrc}
          className="rounded-lg w-full pointer-events-none"
          style={{ height: `${Math.round(currentW * aspect)}px` }}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        {/* Transparent overlay — prevents iframe from stealing mouse events; click-through when not selected */}
        <div className={`absolute inset-0 rounded-lg ${selected || resizing ? "bg-transparent" : "bg-transparent"}`} />

        {/* Left handles */}
        <div onMouseDown={(e) => onHandleDown("left", e)} className={`${handleClass("cursor-w-resize")} top-1/2 -translate-y-1/2 left-1 w-2 h-8`} />
        <div onMouseDown={(e) => onHandleDown("left", e)} className={`${handleClass("cursor-nw-resize")} top-1 left-1 w-3 h-3`} />
        <div onMouseDown={(e) => onHandleDown("left", e)} className={`${handleClass("cursor-sw-resize")} bottom-1 left-1 w-3 h-3`} />

        {/* Right handles */}
        <div onMouseDown={(e) => onHandleDown("right", e)} className={`${handleClass("cursor-e-resize")} top-1/2 -translate-y-1/2 right-1 w-2 h-8`} />
        <div onMouseDown={(e) => onHandleDown("right", e)} className={`${handleClass("cursor-ne-resize")} top-1 right-1 w-3 h-3`} />
        <div onMouseDown={(e) => onHandleDown("right", e)} className={`${handleClass("cursor-se-resize")} bottom-1 right-1 w-3 h-3`} />

        {/* Size label */}
        {show && containerRef.current && (
          <span className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-mono pointer-events-none">
            {Math.round(containerRef.current.offsetWidth)}px
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ============================================================================
// Render stored HTML
// ============================================================================
export function RichTextContent({ html }: { html: string }) {
  if (!html || html === "<p></p>") return null;
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none
        prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
        prose-blockquote:border-l-primary/40 prose-blockquote:bg-muted/30 prose-blockquote:px-3 prose-blockquote:py-1 prose-blockquote:rounded-r-lg
        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px]
        prose-a:text-primary prose-a:underline
        prose-img:rounded-lg prose-img:max-w-full
        prose-table:border-collapse prose-td:border prose-td:border-border prose-td:p-2 prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted/40"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
