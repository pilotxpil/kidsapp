# מדריך הפעלה — KidsQuest

מדריך מפורט להקמת סביבת הפיתוח, הפעלת השרת והאפליקציה, ועבודה יומיומית עם Expo.

## מה יש בפרויקט

| חלק | תיקייה | תפקיד |
|-----|--------|--------|
| אפליקציה (ילד + הורה) | `apps/mobile` | Expo **SDK 57** — אנדרואיד, iOS וווב |
| API | `server` | Node.js (Express) על פורט **3001** |
| טיפוסים משותפים | `packages/shared` | חבילה שנבנית ל-`dist` לפני הרצה |
| MongoDB | Docker (local) או Atlas (production) | מסד נתונים — DB נפרד: `kidsapp` |

זה מונוריפו (npm workspaces). כמעט כל הפקודות רצות מתיקיית השורש `kidsapp/`.

---

## מה להתקין מראש

### 1. Node.js 22.13 ומעלה

השרת והאפליקציה דורשים Node.js **22.13+** (או 20.19.4+). Metro של SDK 57 לא תומך ב-22.11 ומטה.

בדיקה:

```bash
node -v   # לדוגמה v22.13 או v22.14
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

הפרויקט על **Expo SDK 57**. Expo Go בחנות חייב להיות גרסה שתומכת ב-SDK 57. אם מופיעה שגיאת *Project is incompatible* — עדכנו את Expo Go (או [התקינו SDK 57](https://expo.dev/go?sdkVersion=57&platform=android&device=true)) והפעילו מחדש את שרת הפיתוח.

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

(החליפו ב-IP האמיתי.)

- **Windows:** `ipconfig` ב-PowerShell / CMD — חפשו `IPv4 Address` של ה-Wi‑Fi (למשל `192.168.1.5`).
- **macOS:** הגדרות מערכת → רשת, או `ipconfig getifaddr en0`.

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

**זהירות:** הסיד מוחק את כל המשתמשים, המשפחות, המשימות והפרסים במסד.

בסוף מודפס **קוד המשפחה** (6 ספרות). ילד נכנס עם: קוד משפחה + שם משתמש + PIN. אותו קוד משמש גם להזמנת הורה שני.

משתמשים שנוצרים:

| תפקיד | התחברות | סיסמה |
|-------|---------|--------|
| הורה | `parent@test.com` | `parent123` |
| ילד 1 | `yonatan` | `1234` + קוד המשפחה מהפלט |
| ילד 2 | `itay` | `5678` + קוד המשפחה מהפלט |

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

אחרי התחברות כהורה, ממשק ההורה בנתיב `/(parent)` (expo-router).

### תרחיש: ווב בפרודקשן (שרת)

לא Metro — אתר סטטי על `https://kids.synaboard.com` (אחרי פריסה):

```bash
npm run deploy:web
```

כניסה הורה: `/parent-login`. פירוט: [deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md).

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

## העלאה ל-Google Play

החנות מקבלת **Android App Bundle ‏(.aab)** בלבד. הפרופיל `production` ב-`eas.json` מייצר AAB; `preview` נשאר APK לבדיקות.

### מה חייב להיות מוכן לפני הבילד

1. **שרת API ציבורי ב-HTTPS** — פריסה על VM Synaboard (כמו בטומטומים): **[deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md)** (`kids.synaboard.com`). MongoDB Atlas DB `kidsapp`. אל תריצו `seed` על דאטה אמיתי.
2. **חשבון Expo** — [expo.dev](https://expo.dev) — לבילד בענן (EAS).
3. **חשבון Google Play Developer** — תשלום חד-פעמי ב-[Play Console](https://play.google.com/console). צרו אפליקציה חדשה (שם תצוגה, עברית, חינמית).
4. **מדיניות פרטיות ב-URL ציבורי** — חובה באפליקציה עם חשבונות ומצלמה (סריקת QR). אחרי `npm run deploy:web`: `https://kids.synaboard.com/privacy-policy.html`
5. **קהל יעד** — האפליקציה מיועדת לילדים. ב-Play Console יש שאלון גילאים ומדיניות Families. מלאו בכנות; אפליקציות לילדים כפופות לכללים מחמירים (פרסום, איסוף נתונים, הרשאות).

מזהה החבילה קבוע: `com.kidsapp.quest`. אחרי ההעלאה הראשונה אי אפשר להחליף אותו.

### שלב 1 — קישור EAS

מתוך `apps/mobile` (לא משורש הריפו):

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init
```

`eas init` כותב `extra.eas.projectId` ל-`app.json`. אל תשנו ידנית את ה-UUID.

### שלב 2 — כתובת API בבילד

הבילד לפרודקשן **ייכשל** בלי משתנה הסביבה הזה:

```bash
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://kids.synaboard.com --environment production --visibility plaintext --scope project
```

בלי סלאש בסוף. לבילד preview (APK) הגדירו אותו גם בסביבת `preview`. אחרי שינוי הכתובת צריך בילד חדש — היא נאפית לתוך האפליקציה.

### שלב 3 — בילד AAB

```bash
npx eas-cli build --platform android --profile production
```

EAS מייצר keystore בחתימה ומנהל אותו. בפעם הראשונה אשרו יצירת credentials. הבילד רץ בענן (~10–20 דקות). `versionCode` עולה אוטומטית (`autoIncrement`).

בסיום: קישור להורדת ה-`.aab` מ-[expo.dev](https://expo.dev).

### שלב 4 — יצירת האפליקציה ב-Play Console (פעם ראשונה)

1. [Play Console](https://play.google.com/console) → Create app.
2. שם, שפה ברירת מחדל עברית, אפליקציה (לא משחק אם זה לא משחק), חינמית.
3. השלימו את משימות ה-Dashboard: דירוג תוכן, קהל יעד, מדיניות פרטיות, Data safety, נכסי חנות (אייקון, צילומי מסך, תיאור קצר/ארוך).
4. **בדיקות פנימיות** → Create new release → בחתימה בחרו **Google-generated key** → העלו את ה-AAB.

או אחרי שיש Service Account של Google Cloud עם גישה ל-Play Console:

```bash
npx eas-cli credentials --platform android
# Google Service Account → Upload a Google Service Account Key

npx eas-cli submit --platform android --profile production
```

הפרופיל `submit.production` מעלה למסלול **internal** כ**טיוטה**. אתם מפרסמים / מקדמים לייצור מתוך Play Console אחרי שהרשימה בחנות מלאה.

מדריכי Expo (SDK 57 / EAS): [בילד פרודקשן לאנדרואיד](https://docs.expo.dev/tutorial/eas/android-production-build/), [העלאה ל-Play](https://docs.expo.dev/submit/android/), [העלאה ידנית בפעם הראשונה](https://docs.expo.dev/submit/android-manual/).

---

## פריסה לשרת (פרודקשן)

מדריך מלא: **[deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md)**.

| פקודה | מה מעדכן |
|--------|-----------|
| `./deploy/vm/deploy.sh` | API (Express) על VM — pm2 `kidsquest-api`, פורט 3001 |
| `npm run deploy:web` | אתר ווב סטטי → `https://kids.synaboard.com` |

דרישות: `gcloud auth login`, פרויקט `synaboard-482321`, SSH כ-`pilotxpil@instance-20251228-103624`. MongoDB: Atlas DB `kidsapp` ב-`server/.env` (לא commit).

DNS: `kids.synaboard.com` → IP המכונה. nginx מפצל API (`/auth`, `/tasks`, …) וקבצי Expo (`/home/pilotxpil/kidsapp/web`).

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
| כניסת ילד נכשלת אחרי seed | חסר קוד משפחה — מופיע בפלט ה-seed ובמסך הילדים אצל ההורה |
| `eas build` production נכשל על EXPO_PUBLIC_API_URL | חסר משתנה HTTPS בסביבת production ב-EAS |
| `https://kids.synaboard.com/` מציג JSON או 404 | אחרי פריסת ווב: `npm run deploy:web`; API: `curl …/health` |
| gcloud deploy נכשל Permission denied | השתמשו `pilotxpil@instance-20251228-103624` (לא משתמש ברירת מחדל) |

---

## המשך קריאה

- [CONTRIBUTING.md](./CONTRIBUTING.md) — איך לתרום לקוד
- [deploy/vm/DEPLOY.md](./deploy/vm/DEPLOY.md) — פריסה (API, ווב, EAS)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — מבנה המערכת
- [AGENTS.md](./AGENTS.md) — הנחיות לסוכן / Cursor
- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/

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
npm run build:android               # EAS AAB לחנות
npm run build:android:preview       # EAS APK פנימי
npm run submit:android              # העלאת AAB ל-Play (internal/draft)
npm run deploy:web                  # ווב פרודקשן → kids.synaboard.com
./deploy/vm/deploy.sh               # API פרודקשן → VM (pm2)
```
