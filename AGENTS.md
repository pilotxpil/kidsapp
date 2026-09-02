# KidsQuest — agent guide

Read this before changing code. Human onboarding: [README.md](./README.md), [SETUP.md](./SETUP.md), [CONTRIBUTING.md](./CONTRIBUTING.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Deploy: [deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md).

## Stack (do not guess versions)

| Piece | Reality |
|-------|---------|
| Mobile | Expo **SDK 54** (`expo ~54.0.0`), React Native 0.81, React 19, expo-router 6 |
| API | Express + TypeScript + Mongoose, port **3001** |
| DB | MongoDB 7 (Docker) or Atlas DB name `kidsapp` |
| Shared | `@kidsapp/shared` — types/constants; **build before run** |
| UI language | Hebrew, RTL |

Expo docs: https://docs.expo.dev/versions/v54.0.0/ — not v57, not unversioned.

## Repo map

```
apps/mobile/          Expo app (kid + parent), file-based routes
  app/(kid)/          Kid tabs: home, tasks, shop, profile
  app/(parent)/       Parent tabs: dashboard, tasks, rewards, kids, profile
  lib/api.ts          Only HTTP client — add new endpoints here
  lib/i18n.ts         All user-visible strings (`t('key')`)
  constants/themes.ts Theme packs (ember / minecraft / brawl / roblox / sparkle)
server/src/
  routes/             Express routers
  models/             Mongoose
  services/gamification.ts  Points, XP, streak, badges, daily gifts
packages/shared/src/index.ts  Types + constants shared by both sides
deploy/vm/                  Production: deploy.sh (API), deploy-web.sh (static web)
```

## Hard rules

1. **Shared first.** New types, enums, constants, templates go in `packages/shared`, then `npm run build -w @kidsapp/shared`, then server + mobile.
2. **Hebrew UI.** New copy in `apps/mobile/lib/i18n.ts`. Server error strings are Hebrew. Do not hardcode English UI.
3. **Themed UI.** Use `useTheme()` / `useThemedStyles`, `ThemedScreen`, `Button`, `Card`, `spacing`. No one-off color palettes.
4. **RTL.** Use `rtl` helpers from `apps/mobile/lib/rtl.ts`. Do not `forceRTL`.
5. **Auth.** JWT Bearer. Parent vs kid via `requireParent` / `requireKid`. Kids are scoped by `familyId`. Kid login needs `username` + PIN + **family invite code**.
6. **No tests yet.** Verify with `dev:server` + `dev:mobile` (web or Expo Go). Production: [deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md).

## Production

| Piece | Reality |
|-------|---------|
| Public URL | `https://kids.synaboard.com` (web + API; nginx routes `/auth`, `/tasks`, … to :3001) |
| VM | `pilotxpil@instance-20251228-103624`, project `synaboard-482321`, pm2 `kidsquest-api` |
| EAS | `@pilotx/kidsquest`; `EXPO_PUBLIC_API_URL=https://kids.synaboard.com` for builds |
| Android | `com.kidsapp.quest` |

Deploy API: `./deploy/vm/deploy.sh`. Deploy web: `npm run deploy:web`. Never `seed` on Atlas production. New top-level API path → update `deploy/vm/nginx-kidsquest.conf`.

## Typical change

1. Types/constants → `packages/shared`
2. Persistence/rules → `server/src` (model + route + gamification if points)
3. Client → `apps/mobile/lib/api.ts` then screen/component
4. Strings → `lib/i18n.ts`

## Commands (repo root)

```bash
npm install
npm run db:up
npm run build -w @kidsapp/shared
npm run seed -w server          # WIPEs DB
npm run dev:server              # :3001
npm run dev:mobile              # Expo
npm run deploy:web              # static web → production
./deploy/vm/deploy.sh           # API → production VM
```
