---
name: Next.js 16 SEO file conventions used by TaskFlow
description: Where to find authoritative Next 16 SEO API docs locally and which conventions apply
type: reference
---

Next.js 16 SEO file conventions live in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/`:
- `sitemap.md` — `app/sitemap.(xml|ts|js)`, returns `MetadataRoute.Sitemap` (array of `{url, lastModified, changeFrequency, priority}`). Cached by default unless using request-time API.
- `robots.md` — `app/robots.(txt|ts|js)`, returns `MetadataRoute.Robots` (`{rules, sitemap}`).
- `opengraph-image.md` — file convention for OG images (use `app/opengraph-image.png` or `.tsx` with ImageResponse).
- `app-icons.md` — for icon/apple-icon (already used: `app/icon.tsx`, `app/apple-icon.tsx`).
- `manifest.md` — for PWA manifest.

JSON-LD guide: `node_modules/next/dist/docs/01-app/02-guides/json-ld.md` — recommends inline `<script type="application/ld+json">` in `layout.js` or `page.js`, using `JSON.stringify(...).replace(/</g, "\\u003c")` to defang XSS.

`viewport` and `themeColor` should be exported via the new `viewport` export (separate from `metadata`) in root layout per Next 13.2+ conventions, still current in 16.

**How to apply:** Before recommending any sitemap/robots/JSON-LD/viewport implementation, re-read these files — Next 16 may have minor behavior changes from older training data.
