# מדריך הפעלה — KidsQuest

מדריך מפורט להקמת סביבת הפיתוח, הפעלת השרת והאפליקציה, ועבודה יומיומית עם Expo.

## מה יש בפרויקט

| חלק | תיקייה | תפקיד |
|-----|--------|--------|
| אפליקציה (ילד + הורה) | `apps/mobile` | Expo SDK 54 — אנדרואיד, iOS וווב |
| API | `server` | Node.js (Express) על פורט **3001** |
| טיפוסים משותפים | `packages/shared` | חבילה שנבנית ל-`dist` לפני הרצה |
| MongoDB | Docker (local) או Atlas (production) | מסד נתונים — DB נפרד: `kidsapp` |

זה מונוריפו (npm workspaces). כמעט כל הפקודות רצות מתיקיית השורש `kidsapp/`.

---

## מה להתקין מראש

### 1. Node.js 20 ומעלה

השרת והאפליקציה דורשים Node.js **20+**.

בדיקה:

```bash
node -v   # לדוגמה v20.x או v22.x
npm -v
```

אם אין Node: [nodejs.org](https://nodejs.org/) או דרך [nvm](https://github.com/nvm-sh/nvm) / [fnm](https://github.com/Schniz/fnm).

### 2. Docker Desktop (חובה לפיתוח מקומי)

MongoDB רץ בקונטיינר, לא כהתקנה ישירה על המחשב.

1. התקינו [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. פתחו את Docker Desktop והמתינו עד שהוא במצב Running (אייקון לווייתן יציב).
3. בדיקה בטרמינל:

```bash
docker --version
docker compose version
```

בלי Docker, `npm run db:up` ייכשל והשרת לא יצליח להתחבר ל-MongoDB.

**אלטרנטיבה — MongoDB Atlas (production):** אותו cluster Atlas כמו פרויקטים אחרים (למשל theboard), עם **database נפרד** `kidsapp`:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/kidsapp?retryWrites=true&w=majority
```

הגדירו ב-`server/.env`. אין צורך ב-Docker כשמשתמשים ב-Atlas.

**אלטרנטיבה — Docker מקומי:** אם כבר יש MongoDB מקומי על פורט 27017, אפשר לדלג על Docker — ודאו ש-`server/.env` מצביע על אותו URI.

### 3. Expo Go (לבדיקה על טלפון אמיתי)

האפליקציה בפיתוח רצה בדרך כלל דרך **Expo Go**, בלי לבנות APK בכל שינוי.

- **אנדרואיד:** [Expo Go ב-Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS:** [Expo Go ב-App Store](https://apps.apple.com/app/expo-go/id982107779)

הפרויקט על **Expo SDK 54**. Expo Go בחנות חייב להיות גרסה שתומכת ב-SDK 54. אם מופיעה שגיאת *Project is incompatible* — עדכנו את Expo Go והפעילו מחדש את שרת הפיתוח.

חשבון Expo **לא חובה** להרצה מקומית. הוא נדרש רק לבניית APK בענן (EAS).

### 4. אופציונלי לפי פלטפורמה

| מטרה | מה צריך |
|------|---------|
| דפדפן במחשב (`npm run web` בתוך `apps/mobile`) | כלום מעבר ל-Node |
| אמולטור אנדרואיד | [Android Studio](https://developer.android.com/studio) + אמולטור |
| סימולטור iOS | macOS + [Xcode](https://developer.apple.com/xcode/) |
| בנייה מקומית של native (לא Expo Go) | אותם כלי native + `npx expo prebuild` |

לרוב הפיתוח מספיקים: Node + Docker + Expo Go (או ווב).

---

## הגדרת הפרויקט בפעם הראשונה

כל הפקודות מתוך תיקיית השורש של הריפו.

### שלב 1 — שכפול והתקנת תלויות

```bash
cd kidsapp
npm install
```

זה מתקין את כל ה-workspaces: מובייל, שרת, ו-`packages/shared`.

### שלב 2 — קבצי סביבה

**שרת:** אם אין `server/.env`, העתיקו מהדוגמה:

```bash
cp server/.env.example server/.env
```

ערכי ברירת המחדל לפיתוח:

```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/kidsapp
JWT_SECRET=kidsapp-dev-secret-change-in-production
NODE_ENV=development
```

**מובייל:** `apps/mobile/.env` אופציונלי. בדרך כלל האפליקציה מזהה לבד את כתובת המחשב מ-Expo. אם ההתחברות מהטלפון נכשלת, צרו `apps/mobile/.env`:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

ואז הגדירו את ה-IP של המחשב ברשת הביתית:

```
EXPO_PUBLIC_API_URL=http://192.168.1.5:3001
```

(החליפו ב-IP האמיתי. ב-macOS: הגדרות מערכת → רשת, או `ipconfig getifaddr en0`.)

אחרי שינוי `.env` במובייל צריך להפעיל מחדש את Expo (`Ctrl+C` ואז `npm run dev:mobile`).

### שלב 3 — MongoDB ב-Docker

```bash
npm run db:up
```

זה מריץ `docker compose up -d` — קונטיינר בשם `kidsapp-mongodb`, פורט 27017, עם volume ששומר את הנתונים בין הפעלות.

בדיקה:

```bash
docker ps
```

צריך להופיע `kidsapp-mongodb` במצב Up.

עצירה (הנתונים נשארים ב-volume):

```bash
npm run db:down
```

מחיקת הנתונים לגמרי (זהיר):

```bash
docker compose down -v
```

### שלב 4 — בניית החבילה המשותפת

```bash
npm run build -w @kidsapp/shared
```

בלי זה השרת/האפליקציה עלולים להיכשל כי הם תלויים ב-`packages/shared/dist`.

אם משנים טיפוסים ב-`packages/shared` תוך כדי עבודה, אפשר להשאיר watch:

```bash
npm run dev -w @kidsapp/shared
```

### שלב 5 — נתוני דמו (פעם אחת, או אחרי איפוס DB)

ודאו ש-Mongo רץ, ואז:

```bash
npm run seed -w server
```

משתמשים שנוצרים:

| תפקיד | התחברות | סיסמה |
|-------|---------|--------|
| הורה | `parent@test.com` | `parent123` |
| ילד 1 | `yonatan` | `1234` |
| ילד 2 | `itay` | `5678` |

---

## הרצה יומיומית

צריך **שני טרמינלים** (או `npm run dev` שמריץ שרת + Expo יחד).

### טרמינל 1 — API

```bash
npm run dev:server
```

הצלחה נראית כך:

```
Connected to MongoDB
Server running on http://0.0.0.0:3001
```

השרת מאזין על כל הממשקים (`0.0.0.0`), כדי שהטלפון ברשת יוכל לפנות אליו.

בדיקה מהירה בדפדפן או בטרמינל:

```bash
curl http://localhost:3001/health
# {"status":"ok"}
```

אם מופיע `Failed to start server` — כמעט תמיד Mongo לא רץ. הריצו `npm run db:up`.

### טרמינל 2 — Expo (האפליקציה)

```bash
npm run dev:mobile
```

נפתח Metro (שרת הבנדל של Expo), בדרך כלל עם QR code ותפריט:

- `a` — אנדרואיד (אמולטור / מכשיר מחובר)
- `i` — iOS (סימולטור, ב-Mac)
- `w` — ווב בדפדפן
- `r` — רענון
- `m` — תפריט

**קיצור אחד לשניהם:**

```bash
npm run db:up          # אם Mongo עוד לא רץ
npm run dev            # שרת + מובייל יחד
```

### סדר הפעלה מומלץ בכל בוקר

1. Docker Desktop פתוח  
2. `npm run db:up` (אם הקונטיינר לא רץ)  
3. `npm run dev:server`  
4. `npm run dev:mobile`  
5. פתיחת האפליקציה ב-Expo Go / ווב / אמולטור  

---

## איך לעבוד עם Expo (בקצרה)

Expo הוא כלי שמאפשר לכתוב React Native ולהריץ על טלפון בלי לבנות אפליקציית native בכל שינוי. בפיתוח, Metro שולח את הקוד לטלפון; Expo Go מריץ אותו.

### תרחיש נפוץ: טלפון אמיתי

1. המחשב והטלפון על **אותו Wi‑Fi** (לא VPN שמפריד רשתות, לא "Isolated" / AP isolation בנתב).
2. `npm run dev:server` ו-`npm run dev:mobile` רצים.
3. פתחו Expo Go, סרקו את ה-QR:
   - **אנדרואיד:** מצלמה או סורק בתוך Expo Go.
   - **iOS:** מצלמת המערכת.
4. האפליקציה נטענת. שינויים בקוד מתעדכנים אוטומטית (Fast Refresh).

האפליקציה מנסה לפנות ל-API בכתובת המחשב על פורט 3001 (לפי ה-host של Expo). לכן **השרת חייב לרוץ** — אחרת מסך ההתחברות ייכשל.

אם הלוגאין נכשל: במצב פיתוח מוצגת כתובת השרת במסך ההתחברות. אפשר לכפות אותה ב-`apps/mobile/.env` כמו למעלה.

Tunnel (`expo start --tunnel`) עוזר כשהרשת חוסמת חיבור מקומי, אבל עדיין צריך שהטלפון יגיע ל-API על המחשב (או שרת מרוחק). לפיתוח ביתי עדיף LAN רגיל.

### תרחיש: ווב במחשב (ממשק הורה)

```bash
cd apps/mobile
npm run web
```

אחרי התחברות כהורה, ממשק ההורה נמצא בנתיב `/parent`.

### תרחיש: אמולטור

- אנדרואיד: `cd apps/mobile && npm run android`  
  כתובת ה-API באמולטור היא לרוב `http://10.0.2.2:3001` (הקוד כבר מטפל בזה אם אין host מ-Expo).
- iOS: `cd apps/mobile && npm run ios` (Mac + Xcode).

### מה לא חייבים לעשות בפיתוח יומיומי

- אין צורך ב-`eas build` בכל שינוי.
- אין צורך ב-Android Studio רק כדי לראות את האפליקציה על הטלפון (Expo Go מספיק).
- אין צורך בתיקיות `android/` / `ios/` כל עוד נשארים ב-Expo Go (managed workflow).

### בניית APK להתקנה בלי Expo Go

דורש חשבון Expo:

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

הפרופיל `preview` ב-`eas.json` מייצר APK להתקנה פנימית. הבנייה רצה בענן של Expo, לא על המחשב.

---

## פתרון תקלות נפוצות

| תסמין | מה לבדוק |
|--------|-----------|
| השרת לא עולה / שגיאת Mongo | Docker רץ? `docker ps` מציג `kidsapp-mongodb`? `npm run db:up` |
| Expo Go: incompatible SDK | עדכון Expo Go + הפעלה מחדש של `dev:mobile` |
| הטלפון לא נטען / QR לא עובד | אותו Wi‑Fi; חומת אש לא חוסמת פורט 8081; נסו `w` לווב כדי לוודא ש-Metro חי |
| התחברות מהטלפון נכשלת, ווב עובד | השרת רץ? IP נכון ב-`EXPO_PUBLIC_API_URL`? פורט 3001 פתוח בחומת האש |
| שגיאות import מ-`@kidsapp/shared` | `npm run build -w @kidsapp/shared` ואז `npm install` בשורש |
| `npm run seed` נכשל | Mongo חייב לרוץ קודם |

---

## סיכום פקודות

```bash
npm install                         # תלויות (פעם ראשונה / אחרי משיכה)
npm run db:up                       # MongoDB
npm run db:down                     # עצירת MongoDB
npm run build -w @kidsapp/shared    # חבילה משותפת
npm run seed -w server              # נתוני דמו
npm run dev:server                  # API על :3001
npm run dev:mobile                  # Expo / Metro
npm run dev                         # שרת + Expo יחד
```
