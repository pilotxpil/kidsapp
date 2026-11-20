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
- One subscription covers the whole family. The RevenueCat app user id is the **family id**.

## 1. Subscriptions (Google Play + RevenueCat)

1. **Play Console → Monetize → Subscriptions:** create `kidsquest_premium_monthly` and `kidsquest_premium_yearly` (base plan auto-renewing, prices in ILS). Activate them.
2. **RevenueCat** (free tier is enough): new project → Android app `com.kidsapp.quest`, upload the Play service-account JSON (the same `eas-play-submit@…` account works once it has *Financial data* + *Manage orders* permissions).
   - Products: import both ids. Entitlement: `premium`, attach both products. Offering `default` with packages `$rc_monthly` and `$rc_annual`.
   - Webhook: URL `https://kids.synaboard.com/billing/webhook`, Authorization header = a long random string.
3. **Server env** (`server/.env`, then `./deploy/vm/deploy.sh`):
   ```
   REVENUECAT_SECRET_KEY=sk_…            # RevenueCat → API keys → secret (v1)
   REVENUECAT_WEBHOOK_AUTH=<the same random string as the webhook header>
   ```
4. **EAS env** (production): `npx eas-cli env:create --name EXPO_PUBLIC_RC_ANDROID_KEY --value goog_… --environment production --visibility plaintext --scope project`, then build a new AAB.

The purchase flow: paywall → Google Play sheet → `POST /billing/sync` (server re-reads RevenueCat, never trusts the client) → family becomes `premium` with `premiumUntil`. Renewals, cancellations and expiry arrive via the webhook. Restore purchases is on the paywall.

## 2. Ads (AdMob, Families policy)

Ads appear **only** on parent screens, **only** for free families, as one banner on the parent home. Requests are child-directed, under-age-of-consent, max rating G, non-personalized; the `AD_ID` permission is blocked in `app.json`, and measurement is delayed until that config is set.

1. AdMob → add app (Android, `com.kidsapp.quest`) → mark as *designed for families / child-directed* → create one **Adaptive banner** unit.
2. EAS env (production): `ADMOB_ANDROID_APP_ID=ca-app-pub-…~…` and `EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-…/…`, then rebuild. Until the unit id is set, no ad is ever requested (the build uses Google's sample app id so the SDK can start).
3. Remote kill switch without a release: `ADS_ENABLED=false` in `server/.env` (served by `GET /app/config`).

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
- **Data safety:** parent email (account), kid display name/username (app functionality), photos only when a kid attaches proof (optional, stored on our server, deleted with the account), purchase history (RevenueCat). No data sold or shared for advertising.

## 5. iOS later

`ios.bundleIdentifier` is `com.kidsapp.quest`, encryption exemption is declared, and every native module in the app supports iOS. To ship: Apple developer account → `npx eas-cli build -p ios --profile production` → App Store Connect subscriptions with the same two product ids → add the iOS app in RevenueCat → `EXPO_PUBLIC_RC_IOS_KEY=appl_…` (and optionally `ADMOB_IOS_APP_ID` / `EXPO_PUBLIC_ADMOB_BANNER_IOS`). The "manage subscription" link on the paywall is Android-only today; add the App Store link when iOS ships.

## 6. Release checklist

1. `server/.env` has the production values above (never commit it).
2. `./deploy/vm/deploy.sh` (API; runs the founder migration on boot) and `npm run deploy:web` (web + nginx, which must list `billing`).
3. `cd apps/mobile && npx eas-cli build -p android --profile production` → submit to internal → roll out (see `.cursor/skills/kidsquest-deploy/SKILL.md`).
4. After the store build is live, deploy the API again (or set `STORE_VERSION_ANDROID`) so 1.x installs get the update prompt.
