# NexaGear transfer handoff

Prepared 2026-10-06. Read **AGENTS.md and this file before running setup or changing code** when the owner says `update` on the original computer.

## Repository and expected revision

- Repository: https://github.com/OTimileyin/NexaGear.git
- Intended branch: `main`; normal push only, never force-push.
- Handoff identifier: `nexagear-transfer-20261006-01`. The transfer commit includes this identifier in its commit-message trailer. The final chat reply supplies the exact commit hash; a file cannot embed its own containing commit hash.
- Starting revision was `d43b01a62fcc2a00e5aa1fed37cbf3fe9dbeb7c1`. Fetched and fast-forwarded the unrelated documentation commit `548f334` from GitHub, preserving all local changes.
- Before setup: inspect `git status --short`, `git branch --show-current`, `git remote -v` and `git log -5 --format=full`. Confirm the hash from the final chat reply is present with `git merge-base --is-ancestor <expected-hash> HEAD` and this handoff identifier matches. Preserve unrelated modifications and ignored local configuration; do not reset, clean or overwrite them.

## Completed work

- Next.js 16/TypeScript website: NexaGear brand mark, animated/reduced-motion landing page, real representative product photos, simplified navigation, searchable/category-filtered catalogue, price ordering, responsive cards, device appearance and saved light/dark overrides.
- Expo SDK 57 mobile: skippable animated introduction, email-code sign-in for existing accounts, signup and configured Google flow, guest browsing, product detail, compact Home/Categories/You/Cart/Settings screens, shared server-backed cart, device appearance and saved preferences.
- Compact mobile layout: 390px baseline, 13px search margins, 6px product gaps, square imagery, three-column category thumbnails, 27% category sidebar, compact rows, 54px plus safe-area bottom bar. Cart/Settings have route-specific back bars and no bottom navigation. Larger screens use constrained content and more product columns.
- Native checkout: delivery form, authenticated Next.js mobile API, existing server-priced order flow, Paystack test payment browser session, return deep link and server-verified result. Client-supplied prices are never authoritative. Credentials remain server-side.
- NGN formatting throughout website/app/email. Existing original demo amounts retained without currency conversion.
- Exactly 100 additive demo products (NG-101 through NG-200), ten creator/developer/home groups; 111 total database products. Migration `0012_catalog_expansion.sql` already applied to the existing project; do not blindly rerun older migrations.
- Forty-four credited representative category photographs for new products, plus original-product photography. Photos and indicative demo prices are not verified supplier stock, specifications or market prices. No fabricated ratings, sales, discounts, rewards or shipping promises.
- Website deployed at https://nexagear.vercel.app. Verified deployment `dpl_DcKTbVfEPozSZkd9ghPyJUuS4bNW` includes all four mobile API routes. `.vercelignore` uses root-anchored `/mobile/` so `app/api/mobile` is uploaded.
- APK preview profile targets the live backend and uses remote Android signing credentials. Build `54f8d190-6f40-49cc-b5ea-710e6464496e` failed with EAS `SERVER_ERROR` / lost worker connection (network or memory), not a reported source compilation error. Owner requested a fresh-cache retry; see the final transfer evidence below for its build identifier/status. Do not call a submitted build a finished APK.

## Changed files and components

Changes are grouped below; `git show --stat <transfer-commit>` and `git diff-tree --no-commit-id --name-status -r <transfer-commit>` give the exact committed file inventory.

| Area | Files / paths |
| --- | --- |
| Website | `app/page.tsx`, `app/shop/page.tsx`, `app/globals.css`, `app/layout.tsx`, `app/icon.svg`, OG/product metadata files; `components/{BrandMark,MotionReveal,SiteHeader,AuthSection,CartTrigger,ProductCard,ProductImage,SchemeToggle}.tsx` |
| Checkout | `app/checkout/actions.ts`, `app/checkout/verify/route.ts`, `app/api/mobile/{checkout,payment,payment/return,payment/verify}/route.ts`; `lib/{mobile-checkout,payment-verification,format,mailgun,seo}.ts` |
| Mobile routing | `mobile/src/app/_layout.tsx`, `(shop)/{_layout,index,categories,account,cart}.tsx`, `welcome.tsx`, `sign-in.tsx`, `settings.tsx`, `privacy.tsx`, `product.tsx`, `orders.tsx`, `checkout.tsx`; former root `index.tsx`/`cart.tsx` moved into screen wrappers |
| Mobile components | `mobile/src/screens/{ShopScreen,CartScreen}.tsx`; shared `ui`, `ProductTile`, `ProductRow`, `Recommendations`, `shopping`, `shopping-icons`, `TabIcon` components |
| Mobile data/theme | `mobile/src/lib/{browse-context,catalog-context,catalog-filter,catalog,catalog-photos,product-photos,checkout-api,format,theme,types}`; `mobile/eas.json`, public-key template `mobile/.env.example` |
| Catalogue/assets | `catalog/{expansion.json,README.md}`; `supabase/migrations/0012_catalog_expansion.sql`; `public/images/{catalog,photography}`; `mobile/assets/{catalog,photography,icons}` including credits |
| Scripts | `scripts/{apply-catalog-expansion,prepare-catalog-expansion,source-catalog-photos,source-product-photos,prepare-shopping-icons,audit-storefront,audit-mobile-flow,audit-compact-mobile,check-mobile-bundle,smoke-vercel,vercel-project,deploy-vercel,build-mobile-apk}.mjs` |
| Tests/docs | catalogue expansion, native checkout and payment verification tests; format/email/SEO expectations; PRD/architecture/security/design/decision/implementation docs; `docs/{BRAND_IDENTITY,MOBILE_TESTING}.md`; this handoff |

No framework upgrades or application dependencies were added. Root/mobile package files and lockfiles were preserved.

## Credentials stay outside Git

The owner's latest instruction cancels encrypted credential transfer. No plaintext or encrypted credentials archive is committed or pushed, and no decryption password is needed. Keep existing ignored `.env.local` and `mobile/.env` on the original computer. If values are missing, restore them from the owner's provider dashboards or an existing authorized private configuration; never from browser cookies/login sessions or fabricated values. Do not print values or copy them into tracked files.

Encryption attempts were unsuccessful and retained private temporary Markdown files outside the repository. Verified all three private temporary copies against the still-existing original ignored configuration and deleted only those explicit plaintext files. Working environment files were preserved. No credential values were printed.

## Environment variable destinations

| Destination | Names |
| --- | --- |
| Root ignored `.env.local`; Vercel server environment where configured | `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, `PAYSTACK_SECRET_KEY` |
| Root `.env.local` browser-safe website config | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, sign-in/sign-up fallback redirect variables when present |
| Root `.env.local` / local provider-tool environment, never mobile | `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`; `SUPABASE_PROJECT_REF` only if actually supplied |
| Mobile ignored `mobile/.env` and EAS preview environment, public values only | `EXPO_PUBLIC_SUPABASE_URL` from website Supabase URL; `EXPO_PUBLIC_SUPABASE_ANON_KEY` from website anon/publishable key; `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from website publishable key; `EXPO_PUBLIC_API_URL` set to reachable updated backend |
| Optional root server config, leave absent if unavailable | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Optional tool environment/OS credential store, only if transferred | `EXPO_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN` only if already available locally; otherwise authenticate locally with Expo/GitHub, without extracting this computer's sessions |

The existing ignored configuration contains the root and mobile values listed above; optional Google OAuth secrets, database passwords, Upstash config or tool tokens are not fabricated. Clerk brokers Google auth; no independent Google client secret is required by the current code. The Android keystore remains in EAS; log into owner account `agenttim` to access it, rather than exporting a private signing key.

For local website use set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, sign-in `/sign-in`, signup `/sign-up`, fallback `/`. The saved source may have an older local port: adapt site/Playwright URLs to the port actually used. For standalone mobile builds `mobile/eas.json` sets `EXPO_PUBLIC_API_URL=https://nexagear.vercel.app`. For local Expo Go use a reachable LAN backend or this updated hosted backend; never package localhost as the phone's API URL.

Never copy service-role, Clerk secret, Mailgun, Paystack, Vercel or Supabase management credentials to `mobile/.env`, `EXPO_PUBLIC_*`, tracked files or client assets. Root/mobile `.env` files, `.vercel`, keystores and test evidence are ignored. Several credentials were previously shared in chat: rotate them in provider dashboards before real use and update destinations, without changing public/private boundaries.

## Setup on the original computer

1. Preserve unrelated local work, pull `main` without force, and confirm the expected transfer commit/identifier. Read applicable mobile AGENTS instructions too.
2. Preserve existing ignored environment files and restore missing configuration from authorized provider sources. Authenticate GitHub, Expo (`eas whoami` should identify `agenttim`) and Vercel through their supported local flows or transferred authorized tokens. Do not copy browser/session state.
3. Use a current Node version compatible with installed packages (this computer uses Node 24). Run `npm ci` at root and in `mobile`; use `npm.cmd`/`npx.cmd` on Windows if PowerShell script policy blocks wrappers.
4. Reuse existing Supabase and Clerk projects. Check read-only expansion status with `node --env-file=.env.local scripts/apply-catalog-expansion.mjs --check`; existing database should report 111 records and zero new rows pending. Do not reset the database.
5. Start root `npm run dev` (port 3000). Start `npx --no-install expo start --lan` from `mobile`. Connect phone/computer to the same Wi-Fi; use the newly printed QR/URL, not this computer's old IP. LAN mode cannot serve a phone on another network; use a completed APK or a working tunnel.
6. Confirm live Vercel site and APIs remain reachable. If deploying again, `node scripts/vercel-project.mjs` links the existing project and `node scripts/deploy-vercel.mjs` deploys using the authorized local token, without printing it. Paystack remains test-only.
7. Cloud APK: public EAS preview keys are already configured; `eas build --platform android --profile preview` uses remote keystore and live API origin. Check the retry build first; do not submit duplicates while it is still queued/running.

## Validation evidence and limits

- Root: 220 tests across 17 files; root/mobile TypeScript, lint, Next.js production build and built-client secret scan previously passed. Revalidated during transfer; final results are recorded below. Existing Vite/Node module-mode notices do not constitute failed tests.
- Mobile cart math: 13 tests passed.
- Website browser audit: ten page/theme/viewport combinations with no overflow, broken images, runtime errors or axe violations; category, reduced motion and skip-link checks passed.
- Mobile: 24 compact-layout captures at 360/390/430/768 widths passed search/category navigation, overflow and route-specific bottom bar checks. Nine onboarding/auth-entry/guest gating/theme/navigation checks passed. Android manifest's actual `src/app` bundle returned HTTP 200 with updated code.
- Live Vercel smoke: landing/shop HTTP 200, 111 products, search, representative photo response, all three unsigned mobile checkout/payment/verification requests rejected with 401.
- Generated evidence/screenshots are ignored under `test-results`; regenerate with the audit scripts after servers are ready. `scripts/check-mobile-bundle.mjs` reads Metro's manifest launch URL, including `transform.routerRoot=src/app`; a hand-built bundle URL may load the wrong route root.
- Physical-phone Google/email completion, signed-in order history, full Paystack test payment/deep-link return, two-device cart cleanup, signed-in empty cart, cross-user order isolation and signed-in admin remain IMPLEMENTED / UNVERIFIED. Do not infer provider end-to-end success from mock tests or unsigned browser checks.
- Mailgun sandbox requires authorized recipients; a prior live send was blocked by provider authorization. Rate limiting is optional and fails open when Upstash is absent. No live payment charging enabled.
- Existing production checklist/performance budgets contain unresolved owner/provider tasks. This handoff records tested changes; it does not claim full live-commerce production readiness.

## Completion protocol after `update`

Run appropriate root/mobile typechecks, lint, unit tests, build/client-secret scan and browser checks. Exercise the user's phone/auth/cart/payment journey where credentials and devices are available; record any provider limitations honestly. Once setup is successfully verified, remove `HANDOFF.md`. No credential archive or decrypted file is part of this handoff. Preserve ignored environment files. Confirm resolved absolute cleanup targets remain within their intended temp directory or repository; do not recursively delete unrelated directories.

Review tracked diff/staged contents for credentials, deliberately stage the tracked handoff removal plus necessary verified project changes, commit and push to the intended branch without force. Preserve unrelated local work. Report the resulting revision and checks. Keep credentials outside Git throughout the transfer and cleanup.

## Final transfer evidence

The preparing agent appends fresh gate, secret-scan and APK retry results here before the transfer commit. The final chat reply reports the commit hash and push result.

- Fresh transfer checks: root 220/220 tests, mobile TypeScript, root TypeScript, clean lint, Next.js production build and client-bundle secret scan all passed. Live Vercel smoke passed again.
- Reviewed 235 project paths; staged scanner checked 233 added/modified files against six configured private credential values plus provider/private-key patterns and found no exposed credentials. Final scanner is rerun before commit. Root/mobile environment files and Vercel link metadata remain ignored.
- APK retry submitted with fresh cache: https://expo.dev/accounts/agenttim/projects/nexagear-mobile/builds/8208b5b2-f1e5-4bc4-a55b-1d65b640ee5c . Submission succeeded; final APK completion/install verification remains pending.

- Owner cancelled encryption on 2026-10-06 after local GnuPG failed. Transfer contains documentation and verified source/assets only; no credentials archive or encryption helper is included.

- Final staged scan: 232 added/modified files checked, six configured private values plus provider/private-key patterns, zero findings. Total transfer: 233 files including deletions; staged whitespace check passed. Three redundant private plaintext copies verified against original configuration and deleted. No credentials archive exists.
