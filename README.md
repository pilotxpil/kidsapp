# KidsQuest - אפליקציית נקודות ומשימות לילדים

אפליקציית מוטיבציה לילדים (גילאי 7-18) עם מערכת נקודות, משימות ופרסים. שם התצוגה באפליקציה: **Kids**.

## תיעוד

| למי | קובץ |
|-----|------|
| התקנה והרצה | **[SETUP.md](./SETUP.md)** |
| הצטרפות לקוד | **[CONTRIBUTING.md](./CONTRIBUTING.md)** |
| איך המערכת בנויה | **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** |
| סוכן / Cursor | **[AGENTS.md](./AGENTS.md)** |

## מבנה הפרויקט

```
kidsapp/
├── apps/mobile/     # Expo SDK 54 — אפליקציית ילד + ממשק הורה (אנדרואיד, iOS, ווב)
├── packages/shared/ # טיפוסים וקבועים משותפים (@kidsapp/shared)
├── server/          # Node.js API + MongoDB (פורט 3001)
└── docker-compose.yml
```

## דרישות

- Node.js 20+
- Docker (ל-MongoDB מקומי)
- Expo Go (לבדיקה על טלפון) — גרסה שתומכת ב-**SDK 54**

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

## Expo Go על אנדרואיד

הפרויקט משתמש ב-**Expo SDK 54** — תואם ל-Expo Go מה-Play Store שתומך ב-SDK 54.

אם מופיעה שגיאת "Project is incompatible":
1. עדכן Expo Go מה-Play Store
2. עצור את שרת הפיתוח (`Ctrl+C`) והפעל מחדש: `npm run dev:mobile`
3. סרוק שוב את ה-QR code

**חשוב:** הטלפון והמחשב חייבים להיות על אותה רשת WiFi. השרת (`npm run dev:server`) חייב לרוץ.

אם ההתחברות נכשלת, במסך הלוגאין יוצג כתובת השרת (במצב פיתוח). אפשר גם להגדיר ידנית ב-`apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```
(החלף ב-IP של המחשב שלך — ב-Windows: `ipconfig`, חפשו IPv4)

## פלטפורמות

- **אנדרואיד**: `cd apps/mobile && npm run android` (או Expo Go)
- **ווב (מחשב)**: `cd apps/mobile && npm run web`
- **ממשק הורה**: נגיש בווב בכתובת `/parent` אחרי התחברות

## בניית APK לאנדרואיד

```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

(נדרש חשבון Expo - `npx eas login`)

## תכונות

- משימות לפי קטגוריות (בית, לימודים, חברתי, חוג, ספורט) עם תדירות יומית / שבועית / חד-פעמית
- חנות פרסים (Robux, Brawl Stars, פיצה, ועוד) עם אישור הורה למימוש
- אישור הורה על משימות; נקודות ו-XP רק אחרי אישור
- משפחה: עד 2 הורים, קוד הזמנה, כניסת ילד עם QR
- גיימיפיקציה: רמות, streak, תגים, לידרבורד, כוכב יומי / גלגל מזל / תיבת אוצר
- 4 ערכות נושא (Minecraft, Brawl Stars, Roblox, Sparkle)
- תמיכה מלאה בעברית (RTL)
