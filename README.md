# KidsQuest - אפליקציית נקודות ומשימות לילדים

אפליקציית מוטיבציה לילדים (גילאי 7-18) עם מערכת נקודות, משימות ופרסים.

## מבנה הפרויקט

```
kidsapp/
├── apps/mobile/     # Expo - אפליקציית ילד (אנדרואיד + ווב) + ממשק הורה
├── packages/shared/ # טיפוסים משותפים
├── server/          # Node.js API + MongoDB
└── docker-compose.yml
```

## דרישות

- Node.js 20+
- Docker (ל-MongoDB מקומי)
- Expo Go (לבדיקה על טלפון)

## התקנה והרצה

```bash
# התקנת תלויות
npm install

# הפעלת MongoDB
npm run db:up

# בניית חבילה משותפת
npm run build -w @kidsapp/shared

# יצירת נתוני דמו
npm run seed -w server

# הפעלת השרת (טרמינל 1)
npm run dev:server

# הפעלת האפליקציה (טרמינל 2)
npm run dev:mobile
```

## נתוני דמו

| תפקיד | פרטי התחברות |
|-------|-------------|
| הורה | parent@test.com / parent123 |
| ילד 1 | yonatan / 1234 |
| ילד 2 | itay / 5678 |

## Expo Go על אנדרואיד

הפרויקט משתמש ב-**Expo SDK 54** — תואם ל-Expo Go מה-Play Store.

אם מופיעה שגיאת "Project is incompatible":
1. עדכן Expo Go מה-Play Store
2. עצור את שרת הפיתוח (`Ctrl+C`) והפעל מחדש: `npm run dev:mobile`
3. סרוק שוב את ה-QR code

**חשוב:** הטלפון והמחשב חייבים להיות על אותה רשת WiFi. השרת (`npm run dev:server`) חייב לרוץ.

אם ההתחברות נכשלת, במסך הלוגאין יוצג כתובת השרת (במצב פיתוח). אפשר גם להגדיר ידנית ב-`apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```
(החלף ב-IP של המחשב שלך)

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

- משימות לפי קטגוריות (בית, לימודים, חברתי, חוג, ספורט)
- חנות פרסים (Robux, Brawl Stars, פיצה, ועוד)
- אישור הורה על משימות ומימושים
- גיימיפיקציה: רמות, streak, תגים, לידרבורד
- תמיכה מלאה בעברית (RTL)
