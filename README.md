# KidsQuest - אפליקציית נקודות ומשימות לילדים

אפליקציית מוטיבציה לילדים (גילאי 7-18) עם מערכת נקודות, משימות ופרסים. שם התצוגה באפליקציה: **Kids**.

## תיעוד

| למי | קובץ |
|-----|------|
| התקנה והרצה | **[SETUP.md](./SETUP.md)** |
| הצטרפות לקוד | **[CONTRIBUTING.md](./CONTRIBUTING.md)** |
| איך המערכת בנויה | **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** |
| פריסה (API, ווב, אנדרואיד) | **[deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md)** |
| סוכן / Cursor | **[AGENTS.md](./AGENTS.md)** |

## מבנה הפרויקט

```
kidsapp/
├── apps/mobile/     # Expo SDK 57 — אפליקציית ילד + ממשק הורה (אנדרואיד, iOS, ווב)
├── packages/shared/ # טיפוסים וקבועים משותפים (@kidsapp/shared)
├── server/          # Node.js API + MongoDB (פורט 3001)
└── docker-compose.yml
```

## דרישות

- Node.js 22.13+ (או 20.19.4+)
- Docker (ל-MongoDB מקומי)
- Expo Go (לבדיקה על טלפון) — גרסה שתומכת ב-**SDK 57**

מדריך מפורט (התקנות, Docker, הרצה יומיומית, Expo): **[SETUP.md](./SETUP.md)**

## התקנה והרצה

```bash
# התקנת תלויות
npm install

# הפעלת MongoDB
npm run db:up

# בניית חבילה משותפת
npm run build -w @kidsapp/shared

# יצירת נתוני דמו (מוחק את המסד!)
npm run seed -w server

# הפעלת השרת (טרמינל 1)
npm run dev:server

# הפעלת האפליקציה (טרמינל 2)
npm run dev:mobile
```

אחרי `seed` מודפס **קוד המשפחה** (6 ספרות). ילדים חייבים אותו בכניסה, בנוסף לשם המשתמש וה-PIN. אותו קוד משמש גם להזמנת הורה שני.

## נתוני דמו

| תפקיד | פרטי התחברות |
|-------|-------------|
| הורה | parent@test.com / parent123 |
| ילד 1 | yonatan / 1234 + קוד המשפחה מה-seed |
| ילד 2 | itay / 5678 + קוד המשפחה מה-seed |

הקוד מופיע גם במסך הילדים אצל ההורה (ואפשר לסרוק QR במקום להקליד).

## פרודקשן (שרת חי)

| | |
|---|---|
| **אפליקציה בווב** | https://kids.synaboard.com |
| **כניסה הורה** | https://kids.synaboard.com/parent-login |
| **API** | https://kids.synaboard.com/health |

פריסה: API + ווב על VM Google (אותה מכונה כמו בטומטומים). מדריך: **[deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md)**.

```bash
./deploy/vm/deploy.sh       # עדכון API (pm2)
npm run deploy:web          # עדכון אתר ווב (Expo export → nginx)
```

פיתוח מקומי (`npm run dev:mobile` / `npm run web`) — לא אותו מסלול; לבדיקה מהירה על המחשב.

## Expo Go על אנדרואיד

הפרויקט משתמש ב-**Expo SDK 57** — תואם ל-Expo Go מה-Play Store שתומך ב-SDK 57.

אם מופיעה שגיאת "Project is incompatible":
1. עדכן Expo Go מה-Play Store (או התקן מ-[expo.dev/go](https://expo.dev/go?sdkVersion=57&platform=android&device=true))
2. עצור את שרת הפיתוח (`Ctrl+C`) והפעל מחדש: `npm run dev:mobile`
3. סרוק שוב את ה-QR code

**חשוב:** הטלפון והמחשב חייבים להיות על אותה רשת WiFi. השרת (`npm run dev:server`) חייב לרוץ.

אם ההתחברות נכשלת, במסך הלוגאין יוצג כתובת השרת (במצב פיתוח). אפשר גם להגדיר ידנית ב-`apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```
(החלף ב-IP של המחשב שלך — ב-Windows: `ipconfig`, חפשו IPv4)

## פלטפורמות

- **אנדרואיד**: `cd apps/mobile && npm run android` (או Expo Go, או APK מ-EAS)
- **ווב (פיתוח מקומי)**: `cd apps/mobile && npm run web` → `http://localhost:8081`
- **ווב (פרודקשן)**: https://kids.synaboard.com — אחרי `npm run deploy:web`
- **ממשק הורה (פיתוח)**: `/(parent)` אחרי התחברות; בפרודקשן: `/parent-login` → `/(parent)`

## בניית אנדרואיד והעלאה ל-Play Store

חנות Google Play מקבלת **AAB** בלבד. שרת פרודקשן: `https://kids.synaboard.com`.

```bash
# פעם אחת: חשבון Expo + קישור לפרויקט
cd apps/mobile
npx eas-cli login
npx eas-cli init   # פרויקט: @pilotx/kidsquest

# כתובת API (חובה לבילד production)
npx eas-cli env:create --name EXPO_PUBLIC_API_URL \
  --value https://kids.synaboard.com \
  --environment production --visibility plaintext --scope project

# בילד לחנות (AAB) — מהשורש:
npm run build:android

# העלאה ל-Play (internal/draft)
npm run submit:android
```

APK לבדיקה על טלפון: `npm run build:android:preview` (EAS), או `release/kidsquest-1.0.0.apk` אם נוצר מ-AAB מקומית.

פירוט (VM, nginx, Play Console): **[deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md)** ו-[SETUP.md](./SETUP.md).

## תכונות

- משימות לפי קטגוריות (בית, לימודים, חברתי, חוג, ספורט) עם תדירות יומית / שבועית / חד-פעמית
- חנות פרסים (Robux, Brawl Stars, פיצה, ועוד) עם אישור הורה למימוש
- אישור הורה על משימות; נקודות ו-XP רק אחרי אישור
- משפחה: עד 2 הורים, קוד הזמנה, כניסת ילד עם QR
- גיימיפיקציה: רמות, streak, תגים, לידרבורד, כוכב יומי / גלגל מזל / תיבת אוצר
- 4 ערכות נושא (Minecraft, Brawl Stars, Roblox, Sparkle)
- תמיכה מלאה בעברית (RTL)
