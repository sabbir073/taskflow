import { ImageResponse } from "next/og";

// Browser tab favicon — matches the TaskFlow logo (white lightning bolt
// inside a purple→pink→orange gradient square). Next generates /icon on
// demand so it shows up everywhere without shipping a binary.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          color: "white",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
