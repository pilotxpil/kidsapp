# KidsQuest 2.0 — production & monetization

What shipped in 2.0, and the one-time setup that turns on paid subscriptions, ads and password-reset
email. Everything below is optional at runtime: until a piece is configured the app degrades
gracefully (no purchase button, no ads, reset shows a support address).

## Plans

| | Free | Premium (`premium`) | Founder (`founder`) |
|---|---|---|---|
| Kids per family | 2 | 8 | 8 |
| Active tasks per kid | 15 | 200 | 200 |
| Active rewards | 10 | 100 | 100 |
| Custom learning packs, learning insights | – | ✓ | ✓ |
| Premium worlds (Space, Candy) | – | ✓ | ✓ |
| Custom weekly family challenge | – | ✓ | ✓ |
| Ads (parent screens only) | yes | no | no |

- Limits live in `packages/shared/src/plans.ts` and are enforced by the API (`server/src/services/entitlements.ts`), which answers HTTP 402 with `code: PREMIUM_REQUIRED`. The app opens the paywall (`app/premium.tsx`) on that code; older app builds just show the Hebrew error text.
- **Founders:** every family created before `FOUNDER_CUTOFF` (default 2026-12-01) is migrated to `founder` at boot (`server/src/utils/migratePlans.ts`). That covers all families that existed before 2.0, so nothing changes for current users. To end the grace period earlier, set `FOUNDER_CUTOFF` in `server/.env`; to downgrade a founder by hand: `db.families.updateOne({_id: …}, {$set: {plan: 'free'}})`.
- One subscription covers the whole family: the app passes the **family id** to Google Play as the obfuscated account id, and the server binds each purchase token to one family.

## 1. Subscriptions (Google Play Billing, verified by the API) — live since 2.3.0

- **Products** (created and activated through the Play Developer API, Nov 2026): `kidsquest_premium_monthly` (base plan `monthly`, P1M, ₪14.90) and `kidsquest_premium_yearly` (base plan `yearly`, P1Y, ₪119.90), 7-day grace period, priced in 174 countries from the ILS base. Change prices in Play Console → Monetize → Subscriptions.
- **App:** `lib/purchases.ts` (expo-iap): loads the base-plan offers, buys with `obfuscatedAccountId = familyId`, sends the purchase token to `POST /billing/play/verify`, then finishes the transaction. On sign-in it re-sends any unacknowledged purchase; "restore" re-sends every KidsQuest subscription the Play account owns.
- **Server:** `services/playBilling.ts` reads `purchases.subscriptionsv2` with the service account in `GOOGLE_PLAY_SA_B64` (base64 of the JSON; the `eas-play-submit@synaboard-482321` account has the needed financial permission), acknowledges, and sets `plan/premiumUntil/premiumWillRenew` with `billingSource: 'play'`. It never trusts the client. Renewals, cancellations and refunds are picked up by re-reading the stored token: on `POST /billing/sync`, on `GET /billing/status` after `premiumUntil` passes, and in a sweep every 6 hours for subscriptions ending within a day.
- **Testing a purchase:** add the tester's Google account under Play Console → Settings → License testing; their purchases are free test purchases. Anyone else on the internal track is charged for real.
- Optional later: Real-time developer notifications (Pub/Sub) for instant cancellation/refund updates; today they apply within 6 hours.

## 2. Ads (AdMob, Families policy) — live since 2.3.0

Ads appear **only** on parent screens, **only** for free families, as one banner on the parent home. Requests are child-directed, under-age-of-consent, max rating G, non-personalized; the `AD_ID` permission is blocked in `app.json`, and measurement is delayed until that config is set.

- AdMob app **KidsQuest** (Android) `ca-app-pub-4868306599735004~8046906084`, banner unit **KidsQuest parent banner** `ca-app-pub-4868306599735004/8509940510`, in the same AdMob account as the Stackline games. Both are EAS production env vars (`ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`).
- `https://kids.synaboard.com/app-ads.txt` is served from `apps/mobile/public/app-ads.txt`.
- AdMob limits serving until the app is linked to its **public** Play listing: after the production release, AdMob → Apps → KidsQuest → App settings → add the Play store listing.
- Remote kill switch without a release: `ADS_ENABLED=false` in `server/.env` (served by `GET /app/config`).

## 3. Password reset email

Any SMTP provider works (Gmail app password, Resend, SES, Brevo…). In `server/.env`:
```
SMTP_HOST=…  SMTP_PORT=465  SMTP_USER=…  SMTP_PASS=…
MAIL_FROM="KidsQuest <no-reply@kids.synaboard.com>"
SUPPORT_EMAIL=support@kids.synaboard.com
```
Without SMTP in production, "forgot password" tells the parent to write to `SUPPORT_EMAIL`. Codes are 6 digits, hashed, valid 15 minutes, max 5 attempts; requests are rate limited.

## 4. Play Console declarations (open registration)

- **Account deletion URL:** `https://kids.synaboard.com/delete-account` (in-app: Settings → מחיקת החשבון). Kid profiles: Family → edit → delete.
- **Privacy policy URL:** `https://kids.synaboard.com/privacy` · **Terms:** `https://kids.synaboard.com/terms`.
- **Target audience:** parents + children → Families policy applies. Declare AdMob as the only ads SDK (Families self-certified), no AAID, no location.
- **Data safety:** parent email (account), kid display name/username (app functionality), photos only when a kid attaches proof (optional, stored on our server, deleted with the account), purchase history (Google Play). AdMob (parent screens of free families) collects what its Data safety guide lists for child-directed, non-personalized requests (app interactions, diagnostics, approximate location from IP; no advertising ID). No data sold.

## 5. iOS later

`ios.bundleIdentifier` is `com.kidsapp.quest`, encryption exemption is declared, and every native module in the app supports iOS. To ship: Apple developer account → `npx eas-cli build -p ios --profile production` → App Store Connect subscriptions with the same two product ids → add App Store verification to `services/playBilling.ts`'s counterpart (App Store Server API) and enable `purchasesAvailable()` on iOS (and optionally `ADMOB_IOS_APP_ID` / `EXPO_PUBLIC_ADMOB_BANNER_IOS`). The "manage subscription" link on the paywall is Android-only today; add the App Store link when iOS ships.

## 6. Release checklist

1. `server/.env` has the production values above (never commit it).
2. `./deploy/vm/deploy.sh` (API; runs the founder migration on boot) and `npm run deploy:web` (web + nginx, which must list `billing`).
3. `cd apps/mobile && npx eas-cli build -p android --profile production` → submit to internal → roll out (see `.cursor/skills/kidsquest-deploy/SKILL.md`).
4. After the store build is live, deploy the API again (or set `STORE_VERSION_ANDROID`) so 1.x installs get the update prompt.
