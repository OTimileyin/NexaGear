import { ImageResponse } from "next/og";

import { getProductBySlug } from "@/lib/catalog";
import { formatMoney, inventoryLabel } from "@/lib/format";

/**
 * Social card for a product page.
 *
 * This exists because a shared product link previously had NO image at all:
 * the root `opengraph-image` does not reach a nested route that declares its
 * own `openGraph` metadata, so the card rendered as bare text.
 *
 * Everything on it comes from the catalogue row — name, part number, price,
 * category, stock state. No ratings, no "best seller", no invented claims: the
 * design guidelines forbid them, and a social card is exactly where an
 * invented claim would travel furthest.
 *
 * The artwork is deliberately absent. It is an alpha-only SVG that the page
 * renders through a CSS mask, and next/og cannot mask; drawing a coloured copy
 * here would put the wrong colours on the one surface that cannot follow the
 * theme.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NexaGear product: part number, name and price";

const PAPER = "#F6F3EC";
const INK = "#1A1D21";
const SIGNAL = "#C4430F";
const STEEL = "#5C646D";

export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product: Awaited<ReturnType<typeof getProductBySlug>> = null;
  try {
    product = await getProductBySlug(slug);
  } catch {
    // Catalogue unreachable — fall through to the generic card rather than
    // failing the request, so a share link still previews.
    product = null;
  }

  const stock = product ? inventoryLabel(product.inventoryStatus).text : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: PAPER,
          color: INK,
          padding: 72,
          borderTop: `12px solid ${SIGNAL}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            fontFamily: "monospace",
            color: STEEL,
          }}
        >
          <span>NEXAGEAR · CATALOGUE 2026</span>
          <span>{product ? product.sku : "NG-2026"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {product ? (
            <div
              style={{
                fontSize: 26,
                fontFamily: "monospace",
                color: SIGNAL,
                letterSpacing: 2,
              }}
            >
              {product.category.toUpperCase()}
            </div>
          ) : null}

          <div
            style={{
              fontSize: product && product.name.length > 34 ? 66 : 84,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            {product ? product.name : "Gear for developers and makers"}
          </div>

          {product ? (
            <div style={{ fontSize: 34, color: STEEL, display: "flex", gap: 16 }}>
              <span style={{ color: INK, fontWeight: 600 }}>
                {formatMoney(product.price)}
              </span>
              {stock ? <span>· {stock}</span> : null}
            </div>
          ) : (
            <div style={{ fontSize: 32, color: STEEL, display: "flex" }}>
              Keyboards, hubs, power, audio, and electronics kits.
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
            fontFamily: "monospace",
            color: STEEL,
          }}
        >
          <span>nexagear</span>
          <span>USD</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
