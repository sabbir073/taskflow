import DOMPurify from "isomorphic-dompurify";

// Read-only renderer for stored TipTap HTML. Lives in its own module
// (separate from rich-text-editor.tsx) so display-only routes — task
// detail, notice board, notices admin list, group detail — don't pull
// in the entire @tiptap stack just to render `<p>...</p>` content.
//
// Server-component-safe: no "use client" directive, no React hooks.

// DOMPurify config tuned to what Tiptap emits: formatting tags,
// headings, lists, images, tables, links, plus YouTube iframes
// (whitelisted host below). Strips every <script>, event handler,
// inline javascript: URL, etc.
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "img", "span", "div",
    "table", "thead", "tbody", "tr", "th", "td",
    "sub", "sup", "mark",
    "iframe", "video",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel",
    "src", "alt", "title", "width", "height",
    "style", "class",
    "colspan", "rowspan",
    "frameborder", "allow", "allowfullscreen", "controls",
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ["target"],
  FORBID_TAGS: ["script", "style", "object", "embed", "form", "input", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
};

// Strip any <iframe> whose src isn't a YouTube embed. DOMPurify's
// ALLOWED_URI_REGEXP only validates URL syntax, not host — without this
// pass, an admin (or anyone authoring a description) could drop a
// `<iframe src="https://attacker.example/">` past the sanitizer.
const YOUTUBE_EMBED_HOST = /^https:\/\/(www\.)?youtube\.com\/embed\//i;
function tightenIframes(html: string): string {
  return html.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe>/gi, (full, attrs: string) => {
    const m = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    if (m && YOUTUBE_EMBED_HOST.test(m[1])) return full;
    return "";
  });
}

export function RichTextContent({ html }: { html: string }) {
  if (!html || html === "<p></p>") return null;
  const clean = tightenIframes(DOMPurify.sanitize(html, SANITIZE_CONFIG));
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
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
