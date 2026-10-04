# Lesson 3 — what has to be handed in, and the shortest honest path to it

Deadline: **Monday 5 October 2026, 23:59 WAT.** Four things are submitted, and
one of them (the video) cannot be recorded until the other work exists. Nothing
here is a claim that something is done — the state column is the point.

## 1. What must be handed in

| Deliverable | State | What it needs |
|---|---|---|
| GitHub **PR link** for a team contribution | **NOT STARTED** | A branch pushed to GitHub and a PR opened against the team repo. `gh` is not authenticated in this environment and `git push` hangs on an invisible credential prompt, so this is an **owner action** in their own terminal. |
| **APK download link** (Drive or similar) | **BLOCKED** | The mobile app must exist *and* be built. Expo Go cannot produce an APK, so the demo path recorded in D36 (Expo Go) **cannot satisfy this submission**. |
| **Repository link** | Available | The `nexagear` repo. |
| **Video demonstration**, one continuous take, physical device | **BLOCKED** | Web server cart + mobile app + a deployed web build. See §3. |

## 2. The APK changes a recorded decision

**D36 triggered.** It deferred the updater and named the trigger in advance:
*"before the first installable build."* An APK is the first installable build.
`expo-updates` is a native module, so a binary built without it can **never** be
OTA-updated — not later, not by adding the package afterwards.

Cost of including it now: one dependency and a config block, inside a build that
has to happen anyway. Cost of not including it: this binary is permanently
unpatchable, and the file will be sitting in someone's Google Drive.

Note the limitation that must not be glossed: **code signing is paid-tier only**,
so on free tier this channel is TLS and EAS hosting without client-side
signature verification.

## 3. The video, mapped to code that has to exist first

| Teacher's step | What has to be true | State |
|---|---|---|
| 1. Open the web app, sign in a **new** account | Deployed site + Clerk. Live Google sign-in verified (D18). | works |
| 2. Show the signed-in state | Header auth region | works |
| 3. **Add an item to the cart on the web** | **The website must use the server cart** — today it writes to `localStorage`, which a phone cannot see | **NOT DONE** |
| 4. Open the mobile app | An APK installed on the phone | not built |
| 5. **Log in with the same account** | Clerk Expo, same instance as the web | not built |
| 6. **The web-added item is in the mobile cart** | The app must **fetch the cart on open *and* subscribe to realtime**. A subscription alone shows an empty cart if the item was added before the app connected — this is the step most likely to fail on camera. | not built |
| 7. Add another item from the mobile app | Server cart write + RLS | backend done, client not built |
| 8. Return to the web, see the mobile-added item | The website must also subscribe to realtime, or the take needs a manual refresh | **NOT DONE** |
| 9. Physical device, one continuous recording | Both platforms visible in frame | owner action |

## 4. Pre-work in dependency order — this order cannot change

1. **Switch the website cart to the server cart** (server-backed when signed in,
   `localStorage` only for guests, merge on sign-in, realtime subscription).
   Outstanding since D35; it is the first domino.
2. **Push and redeploy.** **14 commits are unpushed** and the live site is behind
   them, so the deployed app cannot demonstrate any of this yet.
3. **Scaffold the Expo app**, with `expo-updates` included (see §2).
4. **Build the APK**, install it on the phone, upload it to Drive.
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

## 6. Traps that would cost the evening

- **Expo Go cannot be submitted.** It is not an APK and has no update channel.
- **Do not record before the push redeploys.** A stale deployment shows a
  `localStorage` cart and step 8 silently fails.
- **The app must load the cart, not only subscribe.** See step 6 above.
- **One continuous take.** Re-open the app rather than restarting it mid-take if
  a step needs repeating; editing clips together is explicitly discouraged.
- Clerk dev instances have usage limits — fine for a demo, but don't burn
  sign-ups while rehearsing. Rehearse with the account already created.
