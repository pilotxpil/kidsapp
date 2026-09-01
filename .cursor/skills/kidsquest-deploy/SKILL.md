---
name: kidsquest-deploy
description: Deploys KidsQuest API, web UI, or Android builds to production (GCP VM Synaboard, EAS). Use when deploying to server, publishing web at kids.synaboard.com, EAS build/submit, gcloud SSH, nginx, or production API URL.
---

# KidsQuest deploy

Full guide: [deploy/vm/DEPLOY.md](../../../deploy/vm/DEPLOY.md). Same GCP VM as batumtumim / Synaboard.

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

`/auth`, `/tasks`, `/rewards`, `/kids`, `/family`, `/health`

Config template: `deploy/vm/nginx-kidsquest.conf`. New API top-level mount → update nginx regex + docs.

## EAS (Android)

- Profiles in `apps/mobile/eas.json`: `production` = AAB (store), `preview` = APK (internal).
- Production build requires EAS env `EXPO_PUBLIC_API_URL=https://kids.synaboard.com` (no trailing slash).
- `app.config.js` enforces HTTPS for `production` profile builds.
- After `eas init`, `app.json` has `extra.eas.projectId` — do not hand-edit UUID.
- gcloud deploy scripts use `pilotxpil@` for scp/ssh.

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
