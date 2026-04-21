import { ImageResponse } from "next/og";

// iOS home-screen icon — same design as the browser favicon but at 180×180
// with a larger corner radius so it looks right on iOS.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 40,
          color: "white",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
