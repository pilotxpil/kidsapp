# ארכיטקטורה — KidsQuest

מפת המערכת למי שמצטרף. פרטי הרצה: [SETUP.md](../SETUP.md). איך לתרום: [CONTRIBUTING.md](../CONTRIBUTING.md).

## מה זה

KidsQuest (שם התצוגה: **Kids**) היא אפליקציית מוטיבציה למשפחות. הורה מגדיר משימות ופרסים; ילד משלים משימות, צובר XP, ומממש פרסים אחרי אישור הורה.

שני תפקידים באותה אפליקציית Expo:

| תפקיד | כניסה | מסכים |
|--------|--------|--------|
| הורה | אימייל + סיסמה | דשבורד, משימות, פרסים, ילדים, פרופיל |
| ילד | קוד משפחה + שם משתמש + PIN | בית, משימות, חנות, פרופיל |

## חלקי המערכת

```
טלפון / דפדפן                  מחשב פיתוח
┌─────────────────┐            ┌──────────────────┐
│ apps/mobile     │  HTTP JSON │ server (:3001)   │
│ Expo SDK 54     │ ─────────► │ Express + JWT    │
│ expo-router     │            │ Mongoose         │
└─────────────────┘            └────────┬─────────┘
         ▲                              │
         │  @kidsapp/shared             ▼
         │  (טיפוסים + קבועים)     MongoDB (kidsapp)
         └──────────────────────────────┘
```

מונוריפו עם npm workspaces: `apps/mobile`, `server`, `packages/shared`.

## מודל הנתונים

**Family** — יחידת הבידוד. עד 2 הורים (`parentIds`). `inviteCode` בן 6 ספרות משמש גם כקוד כניסה לילדים וגם להזמנת הורה שני.

**User** — `role: parent | kid`. הורה: `email` + `passwordHash`. ילד: `username` ייחודי בתוך המשפחה + `pinHash`. ילד מחזיק `points`, `xp`, `level`, `streak`, `badges`, `uiTheme`.

**Task** — שייכת למשפחה ולילד (`assignedTo`). תדירות: `once` / `daily` / `weekly`.

**TaskCompletion** — ילד לוחץ "סיום" → `pending` → הורה `approve` / `reject`. נקודות ניתנות רק באישור.

**Reward / Redemption** — ילד מבקש מימוש → `pending`. באישור הורה מנוכים נקודות והסטטוס הופך ל-`fulfilled`. דחייה לא מנכה.

**PointTransaction** — יומן: `task` | `redemption` | `bonus` | `streak` | `daily`.

## זרימות מרכזיות

### הרשמה וכניסה

1. הורה נרשם עם שם משפחה → נוצרת Family + קוד הזמנה.
2. הורה שני נרשם עם אותו קוד (מקסימום 2).
3. הורה יוצר פרופיל ילד (שם, username, PIN, אווטאר) ויכול להציג QR לכניסה.
4. ילד נכנס עם קוד המשפחה + username + PIN (או סריקת QR). הקוד נשמר במכשיר.

JWT ל-30 יום. Payload: `{ userId, role, familyId }`. כל שאילתה מסוננת לפי `familyId`.

### משימה

```
הורה יוצר משימה (אפשר לכמה ילדים בבת אחת)
    → ילד רואה לפי תדירות: available / pending / completed
    → ילד שולח השלמה
    → הורה מאשר → awardPoints (נקודות + XP + תגים)
```

לוגיקת תדירות: `server/src/utils/taskAvailability.ts`.

### פרס

```
הורה מגדיר פרס בחנות
    → ילד מממש אם יש מספיק נקודות (עדיין לא מנוכות)
    → הורה מאשר → deductPoints + fulfilled
```

### מתנות יומיות (גיימיפיקציה)

הלוגיקה ב-`server/src/services/gamification.ts` ובקבועים ב-`packages/shared`.

- כל יום (דטרמיניסטי לפי kid+תאריך): **כוכב** או **גלגל מזל** (50/50). אחד מהם ביום.
- כוכב: 4 הקשות, `DAILY_STAR_BONUS` (10) + בונוס רצף.
- גלגל: סגמנטים משוקללים (`FORTUNE_WHEEL_SEGMENTS`).
- ~22% מהימים גם **תיבת אוצר** (`SURPRISE_CHEST_DAILY_CHANCE`).
- רצף: בונוס ב-3 / 7 / 30 ימים. XP לרמה: `level * 100`.
- תגים מוגדרים ב-`BADGES` + `BADGE_REWARDS`.

## API (קיצור)

בסיס בפיתוח: `http://localhost:3001`. בפרודקשן: `https://kids.synaboard.com`. שגיאות: `{ error: "עברית" }`.

| קידומת | תפקיד |
|--------|--------|
| `GET /health` | חיים |
| `/auth` | הרשמה/כניסה הורה, כניסת ילד, `/me` |
| `/tasks` | CRUD משימות, השלמה, אישור |
| `/rewards` | CRUD פרסים, מימוש, אישור |
| `/kids` | CRUD ילדים, פרופיל, מתנות יומיות, לידרבורד, דשבורד |
| `/family/invite` | קוד הזמנה להורה |

רשימה מדויקת: `apps/mobile/lib/api.ts` (הלקוח) ו-`server/src/routes/`.

## אפליקציה (Expo Router)

```
app/
  index.tsx              מסך כניסה (גיבור / הורה)
  kid-login.tsx          קוד משפחה + username + PIN + סורק QR
  parent-login.tsx
  parent-register.tsx    משפחה חדשה או הצטרפות עם קוד
  (kid)/                 טאבים — מוגן ב-Stack.Protected
  (parent)/              טאבים — מוגן ב-Stack.Protected
```

ניווט לפי תפקיד: `app/_layout.tsx`. טוקן ב-AsyncStorage (`kidsapp_token`).

כתובת API: `apps/mobile/lib/config.ts` — `EXPO_PUBLIC_API_URL` או host של Expo (פיתוח). בפרודקשן: `https://kids.synaboard.com` (נאפית ב-EAS build ו-`expo export`).

## פריסה (פרודקשן)

```
דפדפן / אנדרואיד          VM (nginx :443)              Atlas
┌─────────────────┐      ┌──────────────────┐         ┌─────────┐
│ Expo web static │ ───► │ kids.synaboard.com│         │ kidsapp │
│ EAS Android APK │      │  / → web/         │         │   DB    │
│ fetch → /auth…  │ ───► │  /auth… → :3001   │ ──────► │         │
└─────────────────┘      │  pm2 kidsquest-api│         └─────────┘
                         └──────────────────┘
```

אותה מכונה GCP כמו Synaboard / בטומטומים. פורטים: KidsQuest **3001**, Synaboard API **3000**, Synaboard web **8080**.

פריסה: [deploy/vm/DEPLOY.md](../deploy/vm/DEPLOY.md) — `deploy.sh` (API), `deploy-web.sh` (ווב).

## UI

- **ערכות נושא:** `ember` | `minecraft` | `brawl` | `roblox` | `sparkle`. ברירת מחדל ילד: ember; הורה: roblox. נשמר ב-`user.uiTheme`.
- **מסך:** `ThemedScreen` + `useTheme()` / `useThemedStyles`.
- **טקסט:** `t('key')` מ-`lib/i18n.ts` בלבד.
- **כיוון:** `lib/rtl.ts` — בלי `forceRTL`.
- **רכיבים:** `Button`, `Card`, `Input`, `RtlText`, אנימציות תחת `components/animations/`.
- **ריווח:** `spacing` מ-`constants/theme.ts`.
- **צליל/מוזיקה:** `lib/sfx.ts`, `lib/bgm.ts` (רק במסכי ילד).

## קבצים שכדאי לפתוח קודם

1. `packages/shared/src/index.ts` — החוזה בין שרת לאפליקציה
2. `apps/mobile/lib/api.ts` — כל הקריאות
3. `server/src/index.ts` + `server/src/routes/`
4. `server/src/services/gamification.ts`
5. `apps/mobile/app/_layout.tsx`
6. `apps/mobile/constants/themes.ts`
