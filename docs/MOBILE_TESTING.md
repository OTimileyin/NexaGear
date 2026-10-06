# Testing the updated mobile experience

Run the Next.js backend and Metro on the same computer:

```powershell
npm.cmd run dev
```

In a second terminal:

```powershell
cd mobile
npx.cmd --no-install expo start --lan
```

Connect the phone to the same Wi-Fi, scan Metro's QR code in Expo Go and reload the project. The local app derives the API host from Metro and contacts the backend on port 3000. Keep both servers running. If the phone cannot reach the backend, confirm that the computer's firewall permits the dev server on the private network.

1. Sign out under Settings to review the introduction. It takes about two seconds and has a Skip introduction control. Device reduced-motion settings suppress the animation.
2. Choose Sign in, enter the existing Clerk account's email and verify the email code. Alternatively choose Create an account; username and password are needed for account creation.
3. Confirm that the shop shows product photographs, names, NGN prices and add buttons. Images represent the demo catalogue and are not verified supplier photographs.
   The catalogue now contains 111 products. Use search, price sorting and the bottom Home/Categories/Account/Cart tabs. Guest browsing is available from the introduction; cart writes require sign-in. Google sign-in uses the existing Clerk connection and still needs a real phone completion test.
4. Open Settings. Switch between Device setting, Light and Dark, then restart the app to confirm the choice is remembered. Device setting should follow subsequent OS appearance changes.
5. Add a product, open Cart and tap Checkout. Enter delivery details and continue to Paystack. Use test payment credentials supplied by Paystack's test checkout.
6. Complete or dismiss the payment screen. The app checks payment on the server; use Check payment if the network was interrupted. A redirect alone never produces a paid result. A saved order and checkout link can be resumed without creating a new order.
7. Confirm payment in the app. Check that purchased, unchanged cart rows disappear on both devices. Items or quantities changed during checkout are preserved.

For a standalone/cloud build, set the public `EXPO_PUBLIC_API_URL` in the build environment to the **updated** backend origin. An old Vercel deployment will not contain the new native checkout endpoints. The app fails with a configuration message rather than silently opening that old site. No private payment or auth keys belong in the mobile environment.

The website header provides Auto, Light and Dark controls. Auto follows the operating system and manual choices persist in that browser.

All displayed catalogue amounts are now denominated in NGN, matching Paystack. Existing demo database amounts were retained without currency conversion.

Automated evidence is generated with `node scripts/audit-mobile-flow.mjs` and `node scripts/audit-storefront.mjs` in ignored `test-results/` directories. Physical-phone sign-in, payment, deep-link return and cart synchronization require owner verification; browser checks are not a substitute for those flows.

## Android APK cloud build ? 2026-10-05

The first build failed after losing its worker connection. The retry `8208b5b2-f1e5-4bc4-a55b-1d65b640ee5c` was checked on 2026-10-06 and is FINISHED. [Download the Android APK](https://expo.dev/artifacts/eas/UObnJmPyLlu7XY_CJ_mNe6zgrreiCGojXeh6Frbncqs.apk). [Build details](https://expo.dev/accounts/agenttim/projects/nexagear-mobile/builds/8208b5b2-f1e5-4bc4-a55b-1d65b640ee5c).

The preview profile uses https://nexagear.vercel.app as EXPO_PUBLIC_API_URL and the three public Supabase/Clerk keys from the EAS preview environment. Existing remote Android keystore retained. The archive was uploaded before the transfer commit. Mobile cart tests pass (13/13). Installation, authentication, payment return and device behavior remain unverified until tested on a physical phone.
