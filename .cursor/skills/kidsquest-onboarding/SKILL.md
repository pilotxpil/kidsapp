---
name: kidsquest-onboarding
description: Orients a new contributor or agent in the KidsQuest monorepo — stack, commands, demo logins, where code lives, production URLs, and what to read first. Use when joining the project, asking how it works, where to start, onboarding, deploying, or exploring the repo for the first time.
---

# KidsQuest onboarding

Do this before writing code.

## Read (in order)

1. [README.md](../../../README.md) — what it is, demo users, production URLs
2. [SETUP.md](../../../SETUP.md) — run locally + Play Store + deploy summary
3. [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) — data model and flows
4. [AGENTS.md](../../../AGENTS.md) — hard rules
5. [deploy/vm/DEPLOY.md](../../../deploy/vm/DEPLOY.md) — API/web/EAS deploy (when touching production)

Deploy-only tasks: skill `kidsquest-deploy`.

## What this is

Family motivation app: parents assign tasks and approve rewards; kids earn XP. One Expo app, two roles (`parent` | `kid`). Hebrew RTL. Product name in UI: **Kids**.

## Run (local dev)

From repo root, Node 20+:

```bash
npm install
npm run db:up
npm run build -w @kidsapp/shared
npm run seed -w server
npm run dev:server
npm run dev:mobile
```

`seed` **wipes** the DB and prints a 6-digit **family invite code**. Kids cannot log in without it.

| Role | Login |
|------|--------|
| Parent | `parent@test.com` / `parent123` |
| Kid | `yonatan` / `1234` or `itay` / `5678` + family code from seed |

Local web: press `w` in Metro or `npm run web` → `http://localhost:8081`. Parent UI after login: `/(parent)`. API: `http://localhost:3001/health`.

## Production (live)

| | URL |
|---|-----|
| Web app | https://kids.synaboard.com |
| Parent login | https://kids.synaboard.com/parent-login |
| API health | https://kids.synaboard.com/health |

Deploy: `./deploy/vm/deploy.sh` (API), `npm run deploy:web` (static web). MongoDB Atlas DB `kidsapp`. EAS: `@pilotx/kidsquest`.

## Where to look

| Need | Path |
|------|------|
| Types/constants | `packages/shared/src/index.ts` |
| HTTP client | `apps/mobile/lib/api.ts` |
| API URL config | `apps/mobile/lib/config.ts`, `app.config.js` |
| Routes | `server/src/routes/` |
| Points/streak/gifts | `server/src/services/gamification.ts` |
| Screens | `apps/mobile/app/(kid)/`, `app/(parent)/` |
| Hebrew strings | `apps/mobile/lib/i18n.ts` |
| Themes | `apps/mobile/constants/themes.ts` |
| Deploy scripts | `deploy/vm/deploy.sh`, `deploy/vm/deploy-web.sh` |
| EAS | `apps/mobile/eas.json` |

## Stack you must not guess

Expo **SDK 54**, Express + Mongoose, MongoDB DB name `kidsapp`, JWT Bearer. Docs: https://docs.expo.dev/versions/v54.0.0/
