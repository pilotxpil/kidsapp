---
name: add-kidsquest-feature
description: Adds a feature across @kidsapp/shared, the Express API, and the Expo app in the required order. Use when implementing a new endpoint, screen, model, gamification rule, or any change that touches more than one package.
---

# Add a KidsQuest feature

Work **shared → server → mobile**. Skipping shared causes duplicated types and broken imports.

## 1. Shared contract

Edit `packages/shared/src/index.ts` (types, unions, constants, templates).

```bash
npm run build -w @kidsapp/shared
```

Keep a watch if iterating: `npm run dev -w @kidsapp/shared`.

## 2. Server

- New collection → `server/src/models/`
- New HTTP → `server/src/routes/` and mount in `server/src/index.ts` if it is a new router
- Always filter by `req.user.familyId`
- Parent-only: `authenticate` + `requireParent`. Kid-only: `requireKid`
- Errors: `res.status(...).json({ error: 'עברית' })`
- Points / XP / badges / daily gifts → `server/src/services/gamification.ts` (`awardPoints` / `deductPoints`)
- Return users via `formatUser`

## 3. Mobile client

Add a method on `api` in `apps/mobile/lib/api.ts` (the only HTTP module).

Then UI:

- Kid screens: `apps/mobile/app/(kid)/`
- Parent screens: `apps/mobile/app/(parent)/`
- Load on focus: `useFocusLoad`
- Copy: key in `lib/i18n.ts`, render with `t('key')`

## 4. Verify

No automated tests. Run `dev:server` + `dev:mobile` and exercise parent and kid if the change crosses roles.

## Checklist

- [ ] Type exported from `@kidsapp/shared` and built
- [ ] Route scoped to `familyId` + correct role
- [ ] `api.ts` method added
- [ ] Hebrew strings (UI + server errors)
- [ ] Theme/RTL used on new UI (see skill `kidsquest-ui`)
