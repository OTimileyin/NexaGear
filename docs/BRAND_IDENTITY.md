# NexaGear — Make room for your next idea

Approved direction: the owner's 2026-10-05 request for a cleaner storefront, real photographs, a distinct identity, and a motion-led landing page (D39).

## Identity

- Audience: developers, makers, electronics learners, and people setting up a workspace.
- Position: desk essentials and hands-on electronics in one catalogue.
- Voice: practical, direct, curious. Describe what gear does; avoid invented quality claims, endorsements, reviews, delivery promises, and customer counts.
- Mark: a compact geometric N with an offset connector stroke. Header, footer, and favicon use the same shape. Its silhouette works at 32–40px.
- Phrase: **Make room for your next idea.**
- Colour: warm paper and ink, with signal orange reserved for actions and identity. Existing light/dark contrast tokens remain supported. The old Apple comparison now uses the NexaGear orange too.
- Typography: Archivo for headings and prose; IBM Plex Mono for actual prices and small collection labels. Headlines are 44–84px, section titles 30–48px, product titles 18px, body 16–18px, secondary metadata 12–14px.
- Layout: a 1280px content container, 20/32px outer gutters, 24px grid gaps, 64/96px section rhythm. Rounded photo frames, generous image space, and one primary action per section.

## Photography

Real, licensed photographs replace all eleven demo SVG drawings on the website. Serve compressed WebP files locally. `public/images/photography/credits.json` records the photographer, source URL, license, description, and intended use for each asset; `scripts/source-product-photos.mjs` reproduces the downloads and rejects premium images.

These are **representative photographs**, not verified supplier/SKU photographs. The shop, detail pages, and footer say so. Some images show an individual board, tool, or adapter rather than the whole named demo bundle. Replace them with owner/supplier photographs of the exact products before real commerce. No manufacturer endorsement is claimed. The existing database is not rewritten and future supplier image paths remain intact.

## Motion

One-time hero entrance and image settling, followed by scroll-triggered section reveals. No autoplay video, endless marquee, scroll hijacking, WebGL, or new animation dependency. Reveals use IntersectionObserver and opacity/transform; content remains visible without JavaScript. Hero timing: 650–1400ms; section reveal: 500ms; interactive photo hover: 200ms. Longer hero timings are intentional storytelling, not delayed interaction. Reduced motion disables these effects and reveals all content immediately.

## Audit findings and replacements

Source-backed findings, recorded before implementation; screenshots/source snapshots are in ignored `test-results/design-before/`.

1. `components/SiteHeader.tsx`: five comparison/scheme choices, an exposed email, admin link, and NG-2026 compete with shopping. Replace the comparison controls with Shop gear, Our approach, Cart, and authentication; put admin inside Manage. Preserve account identity accessibly.
2. `components/ProductImage.tsx`: monochrome masked SVG drawings read as placeholders. Replace the eleven known demo artwork paths with licensed local photographs; preserve unrelated supplier URLs.
3. `components/ProductCard.tsx`: 11–12px metadata and name/price packed into one row weaken hierarchy. Use 14px category, 18px title, 16px price, with availability on the photograph and a clear exploration link.
4. `app/page.tsx`: a text-only hero repeats two links to the same shop and starts with a demo notice. Replace with a photographic split hero, one catalogue action, an anchored collection action, two working category collections, featured gear, and a brand introduction. Retain the demo notice later in the page.
5. `app/layout.tsx`: the footer claims free delivery without verified fulfilment evidence. Remove that claim and retain truthful demo/payment and photo limitations.
6. Motion: no landing-page narrative motion. Add finite entrance/scroll reveals, keep navigation native, and disable motion for reduced-motion users.

Live verification is recorded in `docs/IMPLEMENTATION_PLAN.md`; production deployment and real product equivalence are not implied by a local visual audit.
