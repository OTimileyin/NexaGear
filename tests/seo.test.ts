import { describe, expect, it } from "vitest";

import {
  escapeJsonLd,
  pageMetadata,
  productJsonLd,
  schemaAvailability,
  SITE_CARD_ALT,
  SITE_CARD_PATH,
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
    expect(data.offers.priceCurrency).toBe("NGN");
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

describe("pageMetadata", () => {
  const base = { title: "Shop", description: "The catalogue.", path: "/shop" };

  it("makes the canonical and the og:url the same value", () => {
    // These two disagreeing is the bug this helper exists to prevent: it told
    // social crawlers that /shop was the homepage.
    const meta = pageMetadata(base);
    expect(meta.alternates?.canonical).toBe("/shop");
    expect(meta.openGraph?.url).toBe(meta.alternates?.canonical);
  });

  it("defaults to the site card so a page cannot silently lose its image", () => {
    const meta = pageMetadata(base);
    expect(meta.openGraph?.images).toEqual([
      { url: SITE_CARD_PATH, alt: SITE_CARD_ALT },
    ]);
    expect(meta.twitter?.images).toEqual([SITE_CARD_PATH]);
  });

  it("emits no image when told null, leaving a route's own card file in charge", () => {
    const meta = pageMetadata({ ...base, image: null });
    expect(meta.openGraph?.images).toBeUndefined();
    expect(meta.twitter?.images).toBeUndefined();
  });

  it("uses an explicit image when given one", () => {
    const meta = pageMetadata({
      ...base,
      image: { url: "/product/x/opengraph-image", alt: "Product card" },
    });
    expect(meta.openGraph?.images).toEqual([
      { url: "/product/x/opengraph-image", alt: "Product card" },
    ]);
    expect(meta.twitter?.images).toEqual(["/product/x/opengraph-image"]);
  });

  it("publishes the wide twitter card, because the asset is 1200x630", () => {
    // `card` lives on some members of the Twitter metadata union, so it has to
    // be narrowed rather than read off the union directly.
    const { twitter } = pageMetadata(base);
    expect(twitter && "card" in twitter ? twitter.card : null).toBe(
      "summary_large_image",
    );
  });

  it("keeps the page title on the template but sends a plain social title", () => {
    // `absolute` opts the <title> out of the " · NexaGear" template. Social
    // titles have no template, so an object there would be a type error — the
    // helper has to unwrap it.
    const meta = pageMetadata({
      ...base,
      title: { absolute: "NexaGear — gear for developers and makers" },
    });
    expect(meta.title).toEqual({
      absolute: "NexaGear — gear for developers and makers",
    });
    expect(meta.openGraph?.title).toBe("NexaGear — gear for developers and makers");
    expect(meta.twitter?.title).toBe("NexaGear — gear for developers and makers");
  });

  it("names the site on every card", () => {
    expect(pageMetadata(base).openGraph?.siteName).toBe("NexaGear");
  });

  it("leaves an ordinary page indexable", () => {
    expect(pageMetadata(base).robots).toBeUndefined();
  });

  it("keeps functional pages out of search results while still following links", () => {
    // robots.txt disallow stops crawling, not indexing: a linked-to /checkout
    // can still be indexed without this.
    const meta = pageMetadata({ ...base, path: "/checkout", index: false });
    expect(meta.robots).toEqual({ index: false, follow: true });
    // The canonical still matters, or the page advertises the homepage's URL.
    expect(meta.alternates?.canonical).toBe("/checkout");
  });
});
