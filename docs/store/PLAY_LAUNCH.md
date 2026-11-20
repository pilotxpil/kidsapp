# Public launch on Google Play — checklist

Everything the Play Console asks for before a production (public) release, with the answers that
match how KidsQuest 2.1 actually works. Texts: `LISTING.md`. Graphics: `screenshots/`, `feature-graphic.png`.
Monetization setup (RevenueCat, AdMob, SMTP): `../PRODUCTION.md`.

## 0. Before you start

- [ ] Create the mailbox **support@kids.synaboard.com** (or change `SUPPORT_EMAIL` in `server/.env` and the texts to an address you read). The privacy policy, terms and deletion page point to it.
- [ ] Decide whether ads are on at launch. Until the AdMob ids are set, the app shows **no ads**, so the "Ads" declaration below is **No**. Change it to Yes in the same release that turns ads on.

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
| Ads | **No** while AdMob is not configured. When enabled: **Yes**; ads appear only on parent screens, child-directed, non-personalized, rating G. |
| Content rating (IARC) | App type: **All other app types**. Violence, sexuality, language, controlled substances, gambling: **No**. Users interact or communicate: **No** (no chat; photos go only to the kid's own parents). Shares location: **No**. Digital purchases: **Yes** (subscription). Expected rating: **Everyone / 3+**. |
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

## 4. Data safety form

**Data collected** (none is sold; none is shared for advertising):

| Data type | Collected | Why | Optional |
|---|---|---|---|
| Email address (parent) | Yes | Account management, password reset | No |
| Name (parent display name, kid nickname) | Yes | App functionality | No |
| User IDs (account ids) | Yes | App functionality | No |
| Photos (task proof a kid attaches) | Yes | App functionality, seen only by the kid's parents | **Yes** |
| Purchase history (subscription status) | Yes | App functionality (premium) | Yes |
| App interactions (tasks, points, learning answers) | Yes | App functionality | No |
| Device or other IDs | **No** (AD_ID permission removed) | — | — |
| Location, contacts, messages, audio | No | — | — |

- Data is encrypted in transit: **Yes** (HTTPS)
- Users can request deletion: **Yes** (in-app + web URL above)
- Data shared with third parties: subscription status with Google Play/RevenueCat as **service providers** (not "sharing" under Play's definition); AdMob receives non-personalized ad requests from parent screens only when ads are enabled.

## 5. Monetization (Monetize → Products → Subscriptions)

- [ ] `kidsquest_premium_monthly` and `kidsquest_premium_yearly`, auto-renewing, priced in ILS
- [ ] Then follow `../PRODUCTION.md` §1 (RevenueCat) and send me the keys; I rebuild and release

## 6. Release

1. Testing → Internal testing already has **2.2.0 (26)**. Optionally add a closed track for a few more families first.
2. Production → Create release → **Promote** 2.2.0 (26) from internal testing.
3. Countries: start with **Israel**.
4. Use a **staged rollout** (e.g. 20%), watch Android vitals / crashes for a few days, then 100%.
5. After it is live, the web app already serves the same version; nothing else to deploy.

## 7. Known follow-ups

- Some shop avatars resemble existing game/meme characters (classic "noob", toilet character). Replace them with original art before heavy promotion; keep them owned for kids who bought them.
- Reward templates mention Robux / Brawl Stars / Minecraft by name; consider generic wording ("game coins").
