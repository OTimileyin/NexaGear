# Lesson 3 — what has to be handed in, and the shortest honest path to it

Deadline: **Monday 5 October 2026, 23:59 WAT.** Four things are submitted, and
one of them (the video) cannot be recorded until the other work exists. Nothing
here is a claim that something is done — the state column is the point.

## 1. What must be handed in

| Deliverable | State | What it needs |
|---|---|---|
| GitHub **PR link** for a team contribution | Owner says not required | Recorded because the brief lists it: a branch pushed to GitHub and a PR opened against the team repo. The owner has since said the PR deliverable was a mistake, so it is **not** on the critical path — but `gh` is not authenticated here and `git push` hangs on an invisible credential prompt, so even the branch push is an **owner action** in their own terminal. |
| **APK download link** (Drive or similar) | **BUILD IN PROGRESS** | The app exists, the EAS project is linked and an APK-producing profile is configured. Build `a4c773f9` is on EAS: https://expo.dev/accounts/agenttim/projects/nexagear-mobile/builds/a4c773f9-2e58-47b1-a934-e12df720373c — not yet downloaded, not yet installed. Expo Go cannot produce an APK, so the demo path recorded in D36 (Expo Go) could never have satisfied this submission. |
| **Repository link** | Available | The `nexagear` repo. **16 commits are still unpushed**, so anything graded from the remote is behind this work. |
| **Video demonstration**, one continuous take, physical device | **BLOCKED** | Web server cart (done) + an installed APK + a demo account. See §3. |

## 2. The APK changed a recorded decision — and the change is now made

**D36 triggered, and this was honoured rather than noted.** D36 deferred the
updater and named the trigger in advance: *"before the first installable build."*
An APK is the first installable build. `expo-updates` is a native module, so a
binary built without it can **never** be OTA-updated — not later, not by adding
the package afterwards.

What the build now contains, in `mobile/app.json` (D37):

| Setting | Value | Why it has to be in *v1* |
|---|---|---|
| `expo-updates` | `57.0.24` | The native module is the door; a binary without it is permanently local-only. |
| `runtimeVersion` | `{ policy: "appVersion" }` | Stops an updated JavaScript bundle being applied to a binary it does not match. |
| `updates.url` | `https://u.expo.dev/9d86b236-318a-424f-b356-adabcb69e9df` | Without it the app disables expo-updates at startup (`INVALID_MISSING_URL`) and the door is shut again. |

Cost of including it now: one dependency and a config block, inside a build that
had to happen anyway. Cost of not including it: this binary is permanently
unpatchable, and the file will be sitting in someone's Google Drive.

Note the limitation that must not be glossed: **code signing is paid-tier only**,
so on free tier this channel is TLS and EAS hosting without client-side
signature verification.

## 3. The video, mapped to code that has to exist first

| Teacher's step | What has to be true | State |
|---|---|---|
| 1. Open the web app, sign in a **new** account | Deployed site + Clerk. Live Google sign-in verified (D18). | works |
| 2. Show the signed-in state | Header auth region | works |
| 3. **Add an item to the cart on the web** | **The website must use the server cart** — it now does: `localStorage` only for guests, `cart_items` for signed-in shoppers, merged on sign-in, and the website subscribes as well as writes | **DONE** (commit `b7feeaa`, `lib/cart/server-bridge.ts`; **live signed-in round trip still unverified**) |
| 4. Open the mobile app | An APK installed on the phone | app written + typechecked; **build in progress** |
| 5. **Log in with the same account** | Clerk Expo, same instance as the web. The custom flow uses email + password, so the account **must have a password** — a Google-only account cannot sign in here | code written; sign-in API contract exercised against the live instance (see §5) |
| 6. **The web-added item is in the mobile cart** | The app **fetches the cart on open *and* subscribes to realtime**. A subscription alone shows an empty cart if the item was added before the app connected — this is the step most likely to fail on camera. | code written (`load()` then `subscribe()`, in that order); **not yet exercised on a device** |
| 7. Add another item from the mobile app | Server cart write + RLS | backend proven (`0011` verify, 12 assertions); client written, **not yet exercised** |
| 8. Return to the web, see the mobile-added item | The website must also subscribe to realtime, or the take needs a manual refresh | **DONE in code** (`components/CartSync.tsx`); not yet seen live |
| 9. Physical device, one continuous recording | Both platforms visible in frame | owner action |

## 4. Pre-work in dependency order — this order cannot change

1. **Switch the website cart to the server cart** (server-backed when signed in,
   `localStorage` only for guests, merge on sign-in, realtime subscription).
   Outstanding since D35; it is the first domino.
2. **Push and redeploy.** **14 commits are unpushed** and the live site is behind
   them, so the deployed app cannot demonstrate any of this yet.
3. **Scaffold the Expo app**, with `expo-updates` included (see §2).
4. **Build the APK** (submitted to EAS, `a4c773f9`), install it on the phone, upload it to Drive.
5. **Rehearse the nine steps once, end to end, in one take**, then record.

## 5. Account choice for the demo — measured, not assumed

Read from the live Clerk instance (`development` environment):

- **password sign-in: enabled**
- email verification: **email code**
- **username: required** at sign-up
- Google OAuth: **enabled** (and verified working on the web, D18)

**Recommendation: create the demo account with email + password, plus a
username.** The same credentials then work on the website and the phone with
**no redirect URI configuration at all**. Native Google OAuth requires a redirect
URI registered against the app's scheme, which is a classic evening-eating
failure and a bad thing to discover mid-take. Google remains the nicer-looking
option on the web, but if the account is Google-only then the app must also do
Google OAuth — which reintroduces exactly the redirect requirement.

Sign-up needs a username, so decide it before recording rather than inventing one
on camera.

**What is already known to work, measured rather than assumed:** the app's
sign-in form was exercised against the live Clerk instance from a real browser.
A bogus credential returned Clerk's own message (`Couldn't find your account.`)
rendered in an `alert`, which proves the Core 3 `signIn.password()` contract
(`{ error }`, not a thrown exception) and that the instance is reachable from the
app's configuration. What has **not** been exercised is a *successful* sign-in,
because that needs an account whose verification email someone can read.

**If the demo email is inconvenient, a Clerk development instance accepts a
`+clerk_test` suffix with the fixed code `424242`.** Recorded as an option only —
this environment did not exercise it, so it is a documented behaviour of Clerk
dev instances rather than something measured here. The owner's own inbox needs no
special handling at all.

## 6. Traps that would cost the evening

- **Expo Go cannot be submitted.** It is not an APK and has no update channel.
- **Do not record before the push redeploys.** A stale deployment shows a
  `localStorage` cart and step 8 silently fails.
- **The app must load the cart, not only subscribe.** See step 6 above.
- **One continuous take.** Re-open the app rather than restarting it mid-take if
  a step needs repeating; editing clips together is explicitly discouraged.
- Clerk dev instances have usage limits — fine for a demo, but don't burn
  sign-ups while rehearsing. Rehearse with the account already created.
