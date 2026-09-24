---
name: kidsquest-deploy
description: Deploys KidsQuest API, web UI, or Android builds to production (GCP VM Synaboard, EAS) and uploads the store build to Google Play internal testing. Use when deploying to server, publishing web at kids.synaboard.com, EAS build/submit, Play internal testing, gcloud SSH, nginx, or production API URL.
---

# KidsQuest deploy

Full guide: [deploy/vm/DEPLOY.md](../../../deploy/vm/DEPLOY.md). Same GCP VM as batumtumim / Synaboard.

## App version (required before release / deploy)

**Always** bump the mobile version before an Android store build or API deploy that should advertise a new release:

1. `apps/mobile/app.json` → `expo.version` (e.g. `1.1.0` → `1.1.1`) and bump `android.versionCode` if not relying on EAS `autoIncrement`
2. Keep `apps/mobile/package.json` `version` in sync with `expo.version`
3. Run `./deploy/vm/deploy.sh` — it **auto-syncs** `STORE_VERSION_ANDROID` / `STORE_VERSION_IOS` in `server/.env` from `expo.version` (do not set them by hand)

Update-check in the app compares installed version to Play/App Store, with `/app/version` as fallback. If the API version is stale, users will not be prompted.

## Production URLs

| | |
|---|---|
| Web + API (public) | `https://kids.synaboard.com` |
| API health | `https://kids.synaboard.com/health` |
| Parent login (web) | `https://kids.synaboard.com/parent-login` |
| EAS project | `@pilotx/kidsquest` on expo.dev |

## GCP VM

| | |
|---|---|
| Instance | `instance-20251228-103624` |
| Project | `synaboard-482321` |
| Zone | `us-central1-c` |
| SSH user | `pilotxpil@instance-20251228-103624` (not default `koby`) |
| API path | `/home/pilotxpil/kidsapp` — pm2 `kidsquest-api`, port **3001** |
| Web static | `/home/pilotxpil/kidsapp/web` |

Other services on VM (do not conflict): Synaboard API **3000**, web **8080**, batumtumim static nginx.

Prereq on Mac: `gcloud auth login`, `gcloud config set project synaboard-482321`.

## Deploy commands (repo root)

```bash
./deploy/vm/deploy.sh      # API only — uploads server + server/.env, pm2 restart
./deploy/vm/deploy-web.sh  # Web static export → nginx (same domain)
npm run deploy:web         # alias for deploy-web.sh
npm run build:android      # EAS production AAB (Play Store)
```

**Never** run `npm run seed -w server` against production Atlas.

## nginx on `kids.synaboard.com`

Single domain: static Expo export at `/`, API paths proxied to `:3001`:

`/auth`, `/tasks`, `/rewards`, `/kids`, `/family`, `/learning`, `/push`, `/app`, `/health`


Config template: `deploy/vm/nginx-kidsquest.conf`. New API top-level mount → update nginx regex + docs.

## EAS (Android)

- Profiles in `apps/mobile/eas.json`: `production` = AAB (store), `preview` = APK (internal).
- Production build requires EAS env `EXPO_PUBLIC_API_URL=https://kids.synaboard.com` (no trailing slash).
- `app.config.js` enforces HTTPS for `production` profile builds.
- After `eas init`, `app.json` has `extra.eas.projectId` — do not hand-edit UUID.
- `eas` is not on PATH. From `apps/mobile`, use `npx eas-cli`. Do not rely on root `npm run build:android` for a non-interactive build.
- Production `autoIncrement: true` bumps `android.versionCode` during the build and writes it back to `app.json`. Package `com.kidsapp.quest`. Same Play signing key replaces an existing Play install when `versionCode` is higher. Sideload and Expo Go are not upgraded in place.
- gcloud deploy scripts use `pilotxpil@` for scp/ssh.

## Google Play internal testing

When the user asks for a new store version (or to ship everything and build for the store), upload that AAB to the **internal** track and roll it out. A draft does not reach testers.

Submit profile in `apps/mobile/eas.json` stays `track: internal`, `releaseStatus: draft`. Do not change it to `completed`. Promoting in the same Play edit as halting the previous completed release fails.

Service account (Play Console → Users and permissions, release to testing tracks; API: Google Play Android Developer):

| | |
|---|---|
| Email | `eas-play-submit@synaboard-482321.iam.gserviceaccount.com` |
| Key file | `/Users/koby/Downloads/synaboard-482321-ef559c81f342.json` |

Never commit the JSON, never print `private_key`, and never leave `serviceAccountKeyPath` in `eas.json`.

From `apps/mobile`, after the version bump and `./deploy/vm/deploy.sh`:

```bash
npx eas-cli build --platform android --profile production --non-interactive --wait
```

Set `submit.production.android.serviceAccountKeyPath` to the key file only for the next command, then remove that field before finishing:

```bash
npx eas-cli submit --platform android --profile production --id <build-id> --non-interactive --wait
```

Then roll out the draft (stdlib + openssl; no extra packages):

```bash
python3 .cursor/skills/kidsquest-deploy/scripts/publish-internal.py \
  --key /Users/koby/Downloads/synaboard-482321-ef559c81f342.json \
  --version-code <versionCode>
```

The script replaces the internal track with that release at status `completed`. If it is already the completed release, it prints `already-published` and does not upload again. Testers may need a few minutes, or to open the store listing, before the update appears.

## Web production build

Runs **locally** (not on VM):

```bash
EXPO_PUBLIC_API_URL=https://kids.synaboard.com npx expo export --platform web
# output: apps/mobile/dist → deployed to VM web/
```

`deploy-web.sh` does build + upload + nginx reload.

## Local dev vs production

| | Dev | Production |
|---|-----|------------|
| API | `localhost:3001` or Docker Mongo | VM pm2 + Atlas DB `kidsapp` |
| Web UI | Metro `npm run web` (:8081) | Static at `kids.synaboard.com` |
| Mobile | Expo Go / dev client | EAS build with `EXPO_PUBLIC_API_URL` |

After server API changes: `./deploy/vm/deploy.sh`. After UI changes for live web: `npm run deploy:web`. After mobile API URL change: new EAS build.
