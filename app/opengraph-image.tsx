import { ImageResponse } from "next/og";

import { SITE_CARD_ALT } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Imported rather than repeated: the same string is published as og:image:alt
// by every route that falls back to this card, and two copies would drift.
export const alt = SITE_CARD_ALT;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F6F3EC",
          color: "#1A1D21",
          padding: 72,
          borderTop: "12px solid #C4430F",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            fontFamily: "monospace",
            color: "#5C646D",
          }}
        >
          <span>NEXAGEAR · CATALOGUE 2026</span>
          <span>NG-2026</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            Gear that earns its desk space.
          </div>
          <div style={{ fontSize: 32, color: "#5C646D", display: "flex" }}>
            Keyboards, hubs, power, audio, and electronics kits for developers
            and makers.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 26,
            fontFamily: "monospace",
            color: "#2254A3",
          }}
        >
          <span>DEVELOPER SETUP</span>
          <span>·</span>
          <span>ELECTRONICS</span>
          <span>·</span>
          <span>ROBOTICS</span>
          <span>·</span>
          <span>PROTOTYPING</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
