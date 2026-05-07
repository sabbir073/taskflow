import { ImageResponse } from "next/og";

// 1200×630 social-share preview image. Generated on demand by Next so
// we don't ship a binary asset. Mirrors the brand palette used by
// app/icon.tsx: purple → pink → orange gradient + lightning bolt.
//
// The same image serves Twitter via app/twitter-image.tsx which
// re-exports this default.
export const alt = "TaskMOS — Grow Your Social Media 100% Organically";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)",
          color: "white",
          padding: 80,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 32,
            background: "rgba(255, 255, 255, 0.16)",
            marginBottom: 44,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="white"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            marginBottom: 24,
          }}
        >
          TaskMOS
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            opacity: 0.92,
            textAlign: "center",
            maxWidth: 920,
            lineHeight: 1.25,
          }}
        >
          Grow Your Social Media 100% Organically
        </div>
      </div>
    ),
    { ...size }
  );
}
