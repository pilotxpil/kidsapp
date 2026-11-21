# Public launch on Google Play — checklist

> **Status (Nov 21, 2026):** 2.3.0 (29) was sent to Google for review for **production, Israel only, full rollout** (Play does not allow a staged rollout on an app's first release). Managed publishing is off, so it goes live automatically once approved. All App content declarations, the store listing and the Parenting category are done; Target audience is 6+ (incl. 18+) with Teacher Approved opt-in. Reviewer login: `reviewer-login.local.md` (gitignored), entered in Sign in details.

Everything the Play Console asks for before a production (public) release, with the answers that
match how KidsQuest 2.1 actually works. Texts: `LISTING.md`. Graphics: `screenshots/`, `feature-graphic.png`.
Monetization setup (RevenueCat, AdMob, SMTP): `../PRODUCTION.md`.

## 0. Before you start

- [ ] Create the mailbox **support@kids.synaboard.com** (or change `SUPPORT_EMAIL` in `server/.env` and the texts to an address you read). The privacy policy, terms and deletion page point to it.
- [x] Ads are on from 2.3.0 (AdMob banner on the parent home of free families only), so the "Ads" declaration below is **Yes**.

## 1. Store listing (Grow → Store presence → Main store listing)

- [ ] App name, short and full description: `LISTING.md` (he-IL default, en-US translation)
- [ ] App icon 512×512: export `apps/mobile/assets/images/icon.png` at 512 px
- [ ] Feature graphic 1024×500: `feature-graphic.png`
- [ ] Phone screenshots (2–8): `screenshots/01…07.png`, in that order
- [ ] Category **Parenting**, contact email, website `https://kids.synaboard.com`

## 2. App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://kids.synaboard.com/privacy` |
| App access | **Restricted.** Provide a reviewer login (see §3). Instructions: "Sign in as parent → home inbox. For the kid view: Family tab → כניסה shows the family code; sign in on the welcome screen with that code, username and PIN." |
| Ads | **Yes**: one banner on the parent home of free families only, child-directed, non-personalized, rating G. Kids never see ads. |
| Content rating (IARC) | **Done.** All other app types; users interact (task photos to the kid's parents, limited to invited family); online content; digital purchases. Result: ESRB Everyone, PEGI 3, USK all ages, 3+ elsewhere (Brazil 14+). |
| Target audience and content | Age groups: **6–8**, **9–12** and **18+** (parents). Appeals to children: Yes, so the **Families policy** applies (see notes below). |
| News app | No |
| COVID-19 | No |
| Data safety | See §4 |
| Government app | No |
| Financial features | No |
| Health | No |
| Account deletion | Yes, in app (Settings → מחיקת החשבון) and on the web: `https://kids.synaboard.com/delete-account` |

**Families policy notes** (already handled in code): no ads on kid screens; AdMob is the only ads SDK
and is configured child-directed with `AD_ID` blocked; kids have no email/password and cannot buy anything;
no location; push notifications only to the family.

## 3. Reviewer account (App access)

Google's reviewers need a working login. Recommended: a fictional **demo family on production**
(parent + 2 kids with sample tasks), e.g. `review@kids.synaboard.com`. I can create it for you on
request; it is real data in the production database, so it needs your go-ahead.

## 4. Data safety form — submitted through the API (Nov 20, 2026)

The answers live in `data-safety.csv` (Play's CSV format) and were uploaded with `POST applications/com.kidsapp.quest/dataSafety`. To change them, edit the CSV and upload it again (or edit in Play Console). Summary:

| Data type | Collected / shared | Why | Optional |
|---|---|---|---|
| Email address, name, user IDs | Collected | App functionality, account management | No |
| Purchase history | Collected | App functionality (premium) | Yes |
| Photos (task proof) | Collected | App functionality, seen only by the kid's parents | Yes |
| App interactions | Collected; shared with AdMob | App functionality; advertising, analytics, fraud prevention | No |
| Device or other IDs (push token; AdMob app-set ID) | Collected and shared | App functionality, advertising, fraud prevention | No |
| Approximate location (AdMob, from IP) | Collected and shared | Advertising, fraud prevention | No |
| Diagnostics (AdMob) | Collected and shared | Analytics, advertising | No |

- Encrypted in transit: yes. Account creation: email + password. Deletion: yes, `https://kids.synaboard.com/delete-account` (also in-app).
- After "Target audience" includes children, re-upload with `PSL_DATA_COLLECTION_COMPLIES_FAMILY_POLICY=true` (Play rejects that answer before the app is in the Families program).
- 2.3.0 blocks AD_ID, the Privacy Sandbox ad-services permissions, the microphone, overlay and foreground-service permissions; the only sensitive permissions left are camera (task photos) and billing.

## 5. Monetization (Monetize → Products → Subscriptions)

- [x] `kidsquest_premium_monthly` (₪14.90) and `kidsquest_premium_yearly` (₪119.90) are created and active (see `../PRODUCTION.md` §1)
- [ ] Add your own Google account under Settings → License testing, then buy once on the internal track to confirm the flow (test purchases are free for license testers)

## 6. Release

1. Testing → Internal testing already has **2.3.0 (29)**. Optionally add a closed track for a few more families first.
2. Production → Create release → **Promote** 2.3.0 (29) from internal testing.
3. Countries: start with **Israel**.
4. Use a **staged rollout** (e.g. 20%), watch Android vitals / crashes for a few days, then 100%.
5. After it is live, the web app already serves the same version; nothing else to deploy.

## 7. Known follow-ups

- Some shop avatars resemble existing game/meme characters (classic "noob", toilet character). Replace them with original art before heavy promotion; keep them owned for kids who bought them.
- Reward templates mention Robux / Brawl Stars / Minecraft by name; consider generic wording ("game coins").
