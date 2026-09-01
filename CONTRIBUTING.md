# תרומה ל-KidsQuest

מדריך למי שמצטרף לפרויקט (בן אדם או סוכן). התקנה מלאה: [SETUP.md](./SETUP.md). איך המערכת בנויה: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). פריסה: [deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md).

## לפני הקוד הראשון

1. Node.js 20+, Docker Desktop, ואופציונלי Expo Go.
2. מהשורש: `npm install` → `npm run db:up` → `npm run build -w @kidsapp/shared` → `npm run seed -w server`.
3. שני טרמינלים: `npm run dev:server` ו-`npm run dev:mobile` (או `npm run dev`).
4. ווב מקומי: Metro → `w` או `npm run web`. פרודקשן: https://kids.synaboard.com (`npm run deploy:web`).

`seed` **מוחק** משתמשים, משפחות, משימות ופרסים. אחרי הסיד מודפס **קוד המשפחה** — ילדים חייבים אותו בכניסה (יחד עם username ו-PIN).

חשבונות דמו: ראו [README.md](./README.md).

## איך משנים משהו

הסדר הקבוע — אל תדלגו על shared:

1. **טיפוס / קבוע / תבנית** → `packages/shared/src/index.ts` ואז `npm run build -w @kidsapp/shared` (או `npm run dev -w @kidsapp/shared` ב-watch).
2. **שרת** → מודל ב-`server/src/models` אם צריך, ראוטר ב-`server/src/routes`, גיימיפיקציה ב-`server/src/services/gamification.ts`.
3. **לקוח** → מתודה ב-`apps/mobile/lib/api.ts`, אחר כך מסך תחת `app/(kid)` או `app/(parent)`.
4. **מחרוזת למשתמש** → מפתח ב-`apps/mobile/lib/i18n.ts` ו-`t('key')`. שגיאות שרת בעברית.

אין כרגע חבילת בדיקות. אחרי שינוי UI או זרימה — בדקו ידנית בווב ו/או ב-Expo Go (ילד + הורה אם נגעתם בשני הצדדים). שינוי API → `./deploy/vm/deploy.sh`; שינוי UI לפרודקשן → `npm run deploy:web`.

## מוסכמות UI

- מסך: `ThemedScreen`. צבעים מ-`useTheme()`, לא hex חד-פעמי.
- כפתור/כרטיס/שדה: `Button`, `Card`, `Input`. ריווח: `spacing`.
- RTL: `rtl` מ-`lib/rtl.ts`. טעינת מסך בפוקוס: `useFocusLoad`.
- ערכת נושא: ארבע ערכות ב-`constants/themes.ts`. שינוי דרך `setUiTheme`.
- Expo: רק APIs של **SDK 54** — https://docs.expo.dev/versions/v54.0.0/

פירוט לסוכנים: [AGENTS.md](./AGENTS.md).

## מה לא לעשות

- לא לעדכן את Expo ל-SDK אחר בלי החלטה מפורשת (התיעוד והתוספים תלויים ב-54).
- לא לכתוב טיפוסים כפולים בשרת ובמובייל — המקור הוא `@kidsapp/shared`.
- לא לקומיט `server/.env` או `apps/mobile/.env`.
- לא להריץ `seed` על בסיס עם נתונים אמיתיים.

## פקודות יומיומיות

```bash
npm run db:up
npm run dev:server
npm run dev:mobile
npm run build -w @kidsapp/shared   # אחרי שינוי ב-shared
npm run deploy:web                 # ווב פרודקשן
./deploy/vm/deploy.sh              # API פרודקשן
```
