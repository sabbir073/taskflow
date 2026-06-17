import { ImageResponse } from "next/og";

// 192×192 PWA icon referenced by app/manifest.ts. Same brand mark + gradient as
// app/apple-icon.tsx so the installed-app icon matches the iOS home-screen icon.
// Served at /icon-192.png (folder-name-as-filename route).
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)",
          color: "white",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
        </svg>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
