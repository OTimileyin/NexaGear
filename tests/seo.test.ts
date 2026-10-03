import { describe, expect, it } from "vitest";

import {
  escapeJsonLd,
  productJsonLd,
  schemaAvailability,
  siteUrl,
  type SeoProduct,
} from "@/lib/seo";

const product: SeoProduct = {
  name: "Compact Mechanical Keyboard",
  slug: "compact-mechanical-keyboard",
  sku: "NG-101",
  description: "A 75% keyboard with hot-swap switches.",
  price: 89,
  imageUrl: null,
  inventoryStatus: "in_stock",
};

describe("siteUrl", () => {
  it("falls back to localhost rather than emitting a relative base", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl()).toBe("http://localhost:3000");

    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  });

  it("strips trailing slashes so joined URLs have exactly one separator", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://nexagear.vercel.app/";
    expect(siteUrl()).toBe("https://nexagear.vercel.app");

    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  });
});

describe("schemaAvailability", () => {
  it("maps the three known states", () => {
    expect(schemaAvailability("in_stock")).toBe("InStock");
    expect(schemaAvailability("low_stock")).toBe("LimitedAvailability");
    expect(schemaAvailability("out_of_stock")).toBe("OutOfStock");
  });

  it("maps an unknown state to out of stock rather than claiming availability", () => {
    expect(schemaAvailability("mystery")).toBe("OutOfStock");
    expect(schemaAvailability("")).toBe("OutOfStock");
  });
});

describe("productJsonLd", () => {
  it("publishes only fields the catalogue actually holds", () => {
    const data = JSON.parse(productJsonLd(product, "https://nexagear.vercel.app"));

    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("Compact Mechanical Keyboard");
    expect(data.sku).toBe("NG-101");
    expect(data.offers.price).toBe("89.00");
    expect(data.offers.priceCurrency).toBe("USD");
    expect(data.offers.url).toBe(
      "https://nexagear.vercel.app/product/compact-mechanical-keyboard",
    );
    expect(data.offers.availability).toBe("https://schema.org/InStock");
  });

  it("omits the image key entirely when the product has none", () => {
    const data = JSON.parse(productJsonLd(product, "https://example.com"));
    expect("image" in data).toBe(false);

    const withImage = JSON.parse(
      productJsonLd({ ...product, imageUrl: "https://example.com/kb.png" }, "https://example.com"),
    );
    expect(withImage.image).toBe("https://example.com/kb.png");
  });

  it("never invents ratings, reviews or stock counts", () => {
    const data = JSON.parse(productJsonLd(product, "https://example.com"));
    expect(data.aggregateRating).toBeUndefined();
    expect(data.review).toBeUndefined();
    expect(data.offers.inventoryLevel).toBeUndefined();
  });

  it("escapes a description that would otherwise close the script tag", () => {
    const hostile = JSON.parse(
      productJsonLd(
        { ...product, description: "</script><img src=x onerror=alert(1)>" },
        "https://example.com",
      ),
    );

    expect(hostile.description).toBe("</script><img src=x onerror=alert(1)>");
    // The raw emitted string must not contain a literal closing tag.
    const raw = productJsonLd(
      { ...product, description: "</script><img src=x onerror=alert(1)>" },
      "https://example.com",
    );
    expect(raw).not.toContain("</script>");
    expect(raw).not.toContain("<img");
  });
});

describe("escapeJsonLd", () => {
  it("escapes angle brackets and ampersands", () => {
    expect(escapeJsonLd('{"a":"<b>&"}')).toBe('{"a":"\\u003cb\\u003e\\u0026"}');
  });
});