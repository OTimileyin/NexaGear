# NexaGear — Design Guidelines

> **Current direction (D39, 2026-10-05):** the owner requested a cleaner store, real photography, NexaGear branding, and a motion-led homepage. `BRAND_IDENTITY.md` defines the current implementation. This supersedes the older exposed theme comparisons, mask-only product artwork, and prohibition on landing-page motion described below. Light/dark accessibility and truthful catalogue content remain required. The older sections are retained as design history.

> **Two approved directions (D29) × two colour schemes (D30) — four appearances.**
> `datasheet/light` is the shipped default and is unchanged. A second direction,
> `apple`, is a **comparison**, reachable with `?theme=apple` or the header
> switcher. Both are available light or dark via `?scheme=` or the Auto/Light/Dark
> control.
>
> None of this is a fork. There is one component tree and one set of colour
> tokens; the appearance is a `data-theme` attribute plus a `data-scheme`
> attribute, and CSS custom properties overridden under those selectors do the
> rest. Adding a third direction or a third scheme means adding token blocks, not
> duplicating components.
>
> **The rule that makes dark mode work: `ink` and `paper` invert.** Everything
> else follows — `text-ink`, `bg-paper`, and the inverted-button pattern
> (`hover:bg-ink hover:text-paper`) all stay correct with no extra classes.
>
> **Never write a literal colour.** No `text-white`, no `bg-white`, no arbitrary
> hex. All colour comes from the seven tokens. A literal is how the primary
> button ended up white-on-light-orange at 2.32:1 in dark mode while passing
> every other check. See DECISION_LOG D29, D30 and
> `scripts/color-contrast-audit.mjs`.
>
> **If you are about to "improve" this design by making it look more like
> Apple, read DECISION_LOG D31 first.** It records the tradeoff, why the apple
> direction ships as a comparison rather than a replacement, which direction
> wins if only one can ship, and — stated in advance — what evidence would flip
> the decision. The short version: the apple theme removes 11 identity-bearing
> elements including every part number and annotation, and it costs one extra
> token layer to keep both. The honest cost of this decision is that a reviewer
> who prefers the apple direction will see it as the worse product, because it
> is.

**Signature concept: "The Datasheet."** Every NexaGear product is presented like an engineering component datasheet — the document this exact audience already reads. Grounded in: engineering workbenches, electronics packaging, technical product photography, developer hardware (PRD §26).

## Pass 1 — Design direction

### The memorable idea

Product photography annotated with **drafting-style dimension callouts**: hairline leader lines and numbered balloons that reveal real specs (layout width, port count, weight). The callouts *draw in* when a product detail opens. Decoration that carries information — nothing that doesn't.

### Audience & visual job

- **Audience:** developers, makers, electronics students, robotics learners, remote workers.
- **Primary visual job:** make real gear look worth inspecting, and make specs effortless to trust — a store that reads like a well-made datasheet, not a template.

### Color system (6 colors)

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F6F3EC` | page background (warm paper) |
| `--ink` | `#1A1D21` | primary text |
| `--drafting-blue` | `#2254A3` | structure, annotations, links, focus rings |
| `--signal-orange` | `#C4430F` | primary CTA + price emphasis only — spent sparingly |
| `--steel` | `#5C646D` | hairlines, secondary text (5.4:1 on paper) |
| `--stock-green` | `#2E7D4F` | availability status only, never decorative |

*Retuned 2026-10-01 during Phase 7 AA verification (DECISION_LOG D14): original picks
`#E4572E` (3.3:1 as text) and `#8A939E` (2.8:1) failed 4.5:1 — the hexes above pass*
*(signal: 4.6:1 on paper, 5.1:1 under white button text). Rendered artwork may still
use `#8A939E` for non-text line art.*

Rules: no gradients. Orange never as background wash. Status never communicated by color alone (pair with text/icon).

### Typography

| Role | Choice | Usage |
|---|---|---|
| Display / UI / body | technical grotesque (e.g., Archivo or Space Grotesk) | headings, nav, prose |
| Data | monospace (e.g., IBM Plex Mono or JetBrains Mono) | prices, quantities, totals, part numbers, spec tables |

- Hierarchy: one `h1` per page; section headings descend in order.
- Mono-for-data is a deliberate datasheet convention: every price and `NG-0xx` part number is monospace, tabular figures.
- Minimum body size 16px; line-height ≥1.5 for prose.

### Layout system

- **Spec-sheet grid:** hairline rules (`--steel` at low weight) and table-like rows instead of floating rounded cards.
- Left-aligned structure; consistent max-width content column; 4/8px spacing scale.
- **Annotation strip** under each product image: `NG-0xx` part no. · category code · revision/date — monospace, steel.
- Product detail = parametric spec table + annotated hero image.
- **Checkout:** single column, large summary, totals in mono, exactly one primary CTA per screen.

### Component behavior

| Component | Behavior |
|---|---|
| Product grid item | image + annotation strip + name + price; whole item is one link; hover = rule thickens, no lift/glow |
| Quantity control | −/input/+ with explicit labels ("Decrease quantity of {name}"), disabled states at bounds |
| Buttons | primary = signal orange; secondary = ink outline; busy state shows verb ("Placing order…") |
| Forms | label above input, inline error below with corrective text, `aria-invalid` + `aria-describedby` |
| Cart line | table row; remove = explicit verb button; collapse animation on remove |
| Alert/error | rule-left border + icon + text; never color-only |

### Motion philosophy

Motion explains: opening (callouts draw in), removing (row collapse), confirming (check mark), submitting (busy). Nothing else animates. Non-triggered motion: none. All motion respects `prefers-reduced-motion: reduce` (instant states instead).

### Real content/assets

- Hero and grids show real catalogue product imagery (PRD §28 seed set), original/licensed only (PRD §29).
- No fake testimonials, ratings, user counts, logos, or statistics (PRD §26, MASTER §16).

**Product artwork carries NO colour of its own (D33).** Every file in
`public/images/products/` draws shape and shading only, varying *opacity* rather
than hue, and is rendered through `components/ProductImage.tsx` as a CSS **mask**
so the ink comes from CSS. Two rules follow, and both were learned the hard way:

- **Never put a hex in an SVG.** The original artwork hardcoded `#F6F3EC` as a
  full-canvas background, which is why it rendered as a bright rectangle on a
  dark page. Nothing inside an `<img>`-loaded SVG can be themed; a mask is what
  makes one file work on all four appearances.
- **Never bake annotations into artwork.** The old files carried the datasheet's
  `65% LAYOUT` callouts and part-number captions inside the image, so the apple
  theme could remove every annotation the app drew and the drawings still had
  theirs. If a caption is wanted, it belongs in the markup where it can be
  switched off.

`scripts/shoot-product-art.mjs` checks all eleven files in a real browser: each
must paint a visible range and at least four distinct luminance buckets, so a
flat silhouette or an empty box fails rather than looking merely "fine".

## Pass 2 — Anti-template critique (recorded)

| Question | Answer |
|---|---|
| Could this design belong to any product? | No — datasheet presentation, part numbers, spec tables, and callouts are specific to maker/engineering retail. |
| Defaults instead of product-specific decisions? | Palette derived from drafting media; mono-for-data mirrors real component datasheets; ruled grid mirrors spec sheets. |
| Overusing cards? | No cards-in-cards: ruled grid rows replace cards entirely. |
| Decoration stronger than product? | Callouts must reveal true specs; anything not informational is removed. |
| Hero characteristic of the actual subject? | Yes — an annotated hero product photo, not abstract gradients. |
| Generic typography/copy? | Grotesque + mono pairing with product-specific headlines; no lorem, no hype words. |
| Structural devices meaningful? | Rules separate real sections; annotation strips carry catalogue metadata. |
| Numbered steps sequential? | Only checkout guidance is numbered; steps occur in real order. |
| Common AI-generated patterns? | No purple gradients, no glassmorphism, no three identical feature cards, no glowing backgrounds, no fake social proof. |

**Verdict:** direction approved as product-specific; revisit if implementation drifts toward any answer above.

## Accessibility (WCAG 2.2 AA)

Semantic headings · keyboard-operable nav, cart controls, and checkout · labeled fields · visible focus (`drafting-blue`, ≥3:1) · contrast ≥4.5:1 text / ≥3:1 UI · validation errors tied to inputs · meaningful image alt text · reduced-motion support · no color-only information. Keyboard-only checkout is an acceptance gate (see `TESTING.md`).

**This applies to all four appearances.** `tests/e2e/theme-axe.spec.ts` scans every public route in all four theme-and-scheme combinations at WCAG 2.2 AA, and asserts `data-theme` *and* `data-scheme` applied **before** each scan — because a light-themed scan of a dark page still reports "accessible", so scanning the wrong scheme passes while proving nothing.

`scripts/color-contrast-audit.mjs` is the second line of defence: it measures 16 pairings across all four palettes and fails if any drops below its threshold, or if an audited colour is missing from `app/globals.css`.

## Anti-template rules (enforcement checklist)

1. No purple/blue gradient heroes.
2. No glassmorphism or glow.
3. No grid of identical rounded feature cards.
4. No testimonials, ratings, or user statistics — invented or otherwise.
5. No stock-photo people; product imagery only.
6. No generic headlines ("Empower your workflow") — headlines name NexaGear or the gear.

## Product language rules

- Name actions by what happens: `Sign in with Google`, `Place order`, `Remove item`.
- Action names stay consistent across the flow (checkout never says "Submit").
- Errors state what happened + next step: "Google sign-in was cancelled. Try again or browse without an account."
- Empty states direct the next useful action: "Your cart is empty. Browse gear →".
- Label demo/simulated results where they appear. Never apologetic or vague.
