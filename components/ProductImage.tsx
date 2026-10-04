import type { CSSProperties } from "react";

/**
 * Product artwork, rendered as a CSS mask.
 *
 * An SVG loaded through <img src> is an isolated document: nothing the page
 * does can reach inside it. That is why the original artwork had to hardcode
 * its own colours, and why those colours were light-only — a cream background
 * and near-black strokes baked into every file, which rendered as a bright
 * rectangle on a dark surface.
 *
 * As a mask the artwork contributes only its ALPHA, and the visible colour
 * comes from CSS. So the same file renders as dark ink on a light surface and
 * light ink on a dark one, with no second asset and nothing to keep in sync.
 * Shading survives because the artwork varies opacity rather than hue.
 *
 * SVG is skipped deliberately: these files are a few hundred bytes each, and
 * sending them through the image optimizer achieved nothing.
 */

interface ProductImageProps {
  src: string;
  /**
   * Accessible name. Omit it when the artwork is decorative — in a cart row,
   * for example, the product name is already the link text and repeating it
   * would make the line read twice. An omitted name renders `aria-hidden`
   * rather than an empty `aria-label`, which is the difference between
   * "unlabelled image" and "no image".
   */
  name?: string;
  className?: string;
  /** Mask colour; defaults to the theme's ink. */
  tone?: "ink" | "accent";
}

export function ProductImage({
  src,
  name,
  className = "",
  tone = "ink",
}: ProductImageProps) {
  return (
    <span
      role={name ? "img" : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
      className={`product-art product-art--${tone} ${className}`}
      style={{ "--product-art-src": `url(${src})` } as CSSProperties}
    />
  );
}
