# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above) has the stack versions, hard rules, production facts and the base command list. This file adds only what it doesn't cover. `.cursor/rules/` and `.cursor/skills/` are the Cursor equivalents: mostly mirrored in `AGENTS.md`, with the remainder (versioning, deploy) folded in below.

## Commands (beyond AGENTS.md)

```bash
npm run dev                       # build shared, then API (tsx watch) + Metro together
npm run dev -w @kidsapp/shared    # tsc --watch while editing packages/shared
npm run build                     # tsc shared + server → dist/ (what the VM runs)
cd apps/mobile && npm run web     # Expo web at http://localhost:8081 (kid + parent UI)
```

- Node `^20.19.4 || ^22.13.0 || >=24.3.0`. Create `server/.env` from `server/.env.example`.
- There is **no test runner and no lint script**, so there is no single-test command. Typecheck from inside each workspace (server/shared resolve TS 5.9, mobile the hoisted TS 6.0):

  ```bash
  cd server && npx tsc --noEmit        # clean at v1.1.9
  cd apps/mobile && npx tsc --noEmit   # exits non-zero at v1.1.9 on a few existing errors (DailyWord, Input, KidAvatar, ThemedScreen) — compare against that baseline
  ```
- Local logins after `npm run seed -w server`: parent `parent@test.com` / `parent123`; kids `yonatan` / `1234` and `itay` / `5678`, each plus the 6-digit family code the seed prints.
- `eas` is not on PATH: use `npx eas-cli …` from `apps/mobile`, and don't rely on the root `npm run build:android` for a non-interactive build.

## Releases and versioning

- For a user-facing release (Android store build, or a prod API deploy that should advertise a new version), bump `expo.version` in `apps/mobile/app.json` **and** keep `apps/mobile/package.json` `version` identical. `android.versionCode` must also increase: the EAS `production` profile auto-increments it and writes it back to `app.json` (`appVersionSource: local`), so expect to commit that diff.
- `./deploy/vm/deploy.sh` rewrites `STORE_VERSION_ANDROID/IOS` in your local `server/.env` from `expo.version` before uploading it — never set them by hand. The app's update prompt (`lib/appUpdate.ts`) compares its version with the Play listing (iOS: iTunes lookup) and falls back to `GET /app/version`, which serves those env vars. It is skipped on web and in `__DEV__`.
- Play internal-testing upload (EAS build → submit with a service-account key → `.cursor/skills/kidsquest-deploy/scripts/publish-internal.py` to roll the draft out) is documented step by step in `.cursor/skills/kidsquest-deploy/SKILL.md`. Never commit the service-account JSON or leave `serviceAccountKeyPath` in `eas.json`.

## Architecture notes that span files

**Shared package.** `@kidsapp/shared` is CommonJS compiled to `dist/` and reached through the workspace symlink, so edits in `src/` are invisible to server and mobile until rebuilt (EAS cloud builds rebuild it via `eas-build-post-install`). It holds more than types: content banks (`DAILY_WORDS`, `DAILY_RIDDLES`, `COSMETIC_ITEMS`, task/reward templates) and logic both sides must agree on (`calculateLevel`, answer matchers like `selectAllMatches` / `openWordsMatch` / `riddleGuessMatches`). Mongoose interfaces re-declare some shared unions by hand (`IUser.uiTheme`, `IPointTransaction.type`), so extending a shared union also means updating the model.

**Server boot** (`server/src/index.ts`): connect → `migrateFamilies()` → `migrateUserIndexes()` → `loadLearningPacks()` → `startScheduledJobs()`. The migrations are idempotent in-place fixups that run on every boot (there is no migration framework; add new ones the same way). The only cron job (19:00 Asia/Jerusalem evening reminder, guarded by an in-memory once-per-day flag) runs inside the API process, so pm2 must stay at `instances: 1`.

**Points, XP, streaks.** Every balance change goes through `awardPoints` / `deductPoints` in `services/gamification.ts` (callers: tasks, learning, rewards, cosmetics, manual bonus, daily word/riddle/shop gifts, homework, family challenge). `awardPoints` also runs level-up and badge checks; badge conditions are hardcoded in `updateLevelAndBadges` — shared `BADGES` / `BADGE_REWARDS` supply only labels and payouts, so a new badge needs both.
- Daily gift type (star vs wheel), the treasure-chest day, and the daily word/riddle/shop picks come from an FNV-1a hash of `kidId:date:salt` — nothing is stored. The snippet is copy-pasted in `gamification.ts`, `dailyWord.ts`, `dailyRiddle.ts` and `shopFreebies.ts`; changing a salt or the hash re-rolls everyone's "today".
- "Already claimed today" for star/wheel/chest is derived from `PointTransaction` rows (`type: 'daily'`, or `type: 'bonus'` with description `'גלגל מזל'` / `'תיבת אוצר'`), so those description strings act as identifiers. Words, riddles and shop deals track claims in their own collections (`DailyWordClaim`, `DailyRiddleClaim`, `ShopDailyDeal`).
- A "day" is the UTC date (`todayString()`, `startOfUtcDay()`, daily-task `dayKey`), so daily resets and streak rollovers happen at about 02:00–03:00 Israel time. Only the cron job uses Asia/Jerusalem.

**Learning packs** (`shared/learning.ts` → `content/packs/*.json` → `services/learningPacks.ts` → `routes/learning.ts` → `app/(kid)/learn`, `app/(parent)/learn*`, `components/learning/`):
- Built-in packs load once at boot: restart the API after editing a JSON, and note an invalid file is skipped with only a console warning. Format: `content/packs/README.md`; AI-generation prompt: `docs/LEARNING_PACK_AI_PROMPT.md`.
- Parents can also import/author family packs (`FamilyLearningPack`, ids `custom_*`) and hide built-ins per family (`FamilyHiddenLearningPack`). `getLearningPackForFamily` resolves hidden → none, then the family's own copy, then the built-in. `parseLearningPack` is the single validator for files and imports and accepts only `multiple_choice`, `select_all`, `open_words` (`fill_blank` / `flashcard` still exist in the shared types and `checkAnswer` but can't be loaded).
- Pack payloads sent to kids have answers stripped (`toPublicActivity`); grading is server-side in `POST /learning/packs/:packId/check`. A pack pays out **once, on completion** (`packCompletionPoints`: the family's per-pack override or `defaultPoints`), after which `completeHomeworkForPack` auto-approves open Tasks whose `learningPackId` matches.

**Mobile data flow.**
- `lib/api.ts` is the only HTTP client: 15 s timeout, the server's `{ error }` text becomes `Error.message` (screens show it directly), token in AsyncStorage (`kidsapp_token`).
- `app/_layout.tsx` nests `AuthProvider` → `ThemeProvider` → `RootNavigator`. Role gating is `Stack.Protected` **plus** a redirect effect that sends a signed-in user to their role home from every route outside their own group. Only `privacy` is exempt, so a new top-level screen reachable while signed in must be exempted there too.
- Tab screens initialise from `readScreenCache(ScreenCacheKey.x)` (in-memory, cleared on logout), refresh via `useFocusLoad` (which swallows errors on purpose) and call `writeScreenCache`; the tab layouts call `prefetchKidScreens` / `prefetchParentScreens` to warm those caches. Non-tab screens inside a tab group are registered with `href: null` in that group's `_layout.tsx`.
- `useThemedStyles(factory)` memoizes on `theme.id` only — never close over props or state in the factory. BGM is started only by the `(kid)` tab layout (`lib/bgm.ts`); trigger effects through `playSfx`.
- `t(key)` is a typed lookup into the `he` object; placeholders are substituted by hand (`t('k').replace('{n}', String(n))`) — there is no plural/format helper.
- API base URL (`lib/config.ts`): `EXPO_PUBLIC_API_URL`, else the Expo dev host's LAN IP on :3001 (Android emulator: `10.0.2.2`). It is inlined at bundle time and **throws at import in a non-dev build when unset**, so every web export and EAS build must set it. `app.config.js` also enforces https on the EAS `production` profile and allows cleartext only in non-production builds.

**Other server touchpoints.**
- Responses go through `utils/format.ts` (`formatUser`, `formatTask`, `formatReward`, …) so ObjectIds and dates are stringified to match the shared types; don't return raw Mongoose documents.
- Push: mobile `lib/push.ts` registers an Expo token after login (skipped on web, Expo Go and simulators; `expo-notifications` is imported dynamically because loading it in Expo Go on Android throws). `services/push.ts` provides `notifyUsers` / `notifyFamilyParents` plus fire-and-forget `push*` helpers and prunes `DeviceNotRegistered` tokens. Every `data.type` must exist in shared `PushNotificationType`.
- Task proof photos are base64 `data:image/` URIs stored inline on `TaskCompletion.proofPhoto`, capped by `MAX_PROOF_PHOTO_CHARS` (400 000) in shared; the 2 MB JSON body limit in `server/src/index.ts` must stay above that cap.

## Deployment gotchas

- nginx proxies by a path regex that must list every top-level mount in `server/src/index.ts` (currently `auth|tasks|rewards|kids|family|learning|push|app|health`). `deploy.sh` does **not** touch nginx; the conf is copied, tested and reloaded by `deploy-web.sh` (`npm run deploy:web`), so a new API mount needs both deploys. `deploy/vm/DEPLOY.md` lists fewer paths than the conf — trust the conf.
- `deploy.sh` ships only `package.json`, `package-lock.json`, `packages/shared`, `content`, `server` and `deploy/vm` (plus your local `server/.env`), then runs `npm ci` and the builds on the VM. Anything else the API reads at runtime is not uploaded — e.g. `GET /learning/studio` serves `docs/learning-pack-studio.html`, so it 404s on the VM unless that file was placed there by hand.
- `deploy-web.sh` builds the Expo web export locally (`EXPO_PUBLIC_API_URL` defaults to the production URL) and replaces the VM's web directory wholesale.

## Docs

`README.md`, `SETUP.md` and `docs/ARCHITECTURE.md` (all Hebrew) predate the learning packs, push, daily word/riddle, cosmetics shop and family challenges; `ARCHITECTURE.md`'s API table lists 5 of the 8 mounted routers. Treat the code as the source of truth. Apart from `ARCHITECTURE.md`, `LEARNING_PACK_AI_PROMPT.md` and `learning-pack-studio.html`, the files in `docs/` are standalone design-pick pages and notes for separate Roblox games (`lingo-*`, `draw-guess-*`), not app documentation.
