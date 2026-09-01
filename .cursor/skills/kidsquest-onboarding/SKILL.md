---
name: kidsquest-onboarding
description: Orients a new contributor or agent in the KidsQuest monorepo — stack, commands, demo logins, where code lives, and what to read first. Use when joining the project, asking how it works, where to start, onboarding, or exploring the repo for the first time.
---

# KidsQuest onboarding

Do this before writing code.

## Read (in order)

1. [README.md](../../../README.md) — what it is, demo users
2. [SETUP.md](../../../SETUP.md) — run locally
3. [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) — data model and flows
4. [AGENTS.md](../../../AGENTS.md) — hard rules

## What this is

Family motivation app: parents assign tasks and approve rewards; kids earn XP. One Expo app, two roles (`parent` | `kid`). Hebrew RTL. Product name in UI: **Kids**.

## Run

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

Web: press `w` in Metro. Parent UI is `/parent` after login. API: `http://localhost:3001/health`.

## Where to look

| Need | Path |
|------|------|
| Types/constants | `packages/shared/src/index.ts` |
| HTTP client | `apps/mobile/lib/api.ts` |
| Routes | `server/src/routes/` |
| Points/streak/gifts | `server/src/services/gamification.ts` |
| Screens | `apps/mobile/app/(kid)/`, `app/(parent)/` |
| Hebrew strings | `apps/mobile/lib/i18n.ts` |
| Themes | `apps/mobile/constants/themes.ts` |

## Stack you must not guess

Expo **SDK 54**, Express + Mongoose, MongoDB DB name `kidsapp`, JWT Bearer. Docs: https://docs.expo.dev/versions/v54.0.0/
