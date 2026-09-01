# פריסת KidsQuest על VM Google (Synaboard)

אותה מכונה כמו **בטומטומים** / **Synaboard** — בלי לגעת ב-`synaboard.com` (8080/3000) או `batumi.synaboard.com`.

| | |
|---|---|
| מכונה | `instance-20251228-103624` |
| פרויקט GCP | `synaboard-482321` |
| Zone | `us-central1-c` |
| SSH | `pilotxpil@instance-20251228-103624` (**לא** משתמש `koby` מ-gcloud ברירת מחדל) |
| דומיין | `kids.synaboard.com` |
| API (פנימי) | `127.0.0.1:3001` — pm2 `kidsquest-api` |
| קוד API | `/home/pilotxpil/kidsapp` |
| קבצי ווב | `/home/pilotxpil/kidsapp/web` |
| MongoDB | Atlas, database `kidsapp` (`server/.env` — לא ב-git) |
| EAS | `@pilotx/kidsquest` על expo.dev |

פורטים על המכונה: KidsQuest **3001**, Synaboard API **3000**, Synaboard web **8080**.

---

## פקודות מהירות (Mac, אחרי `gcloud auth login`)

```bash
gcloud config set project synaboard-482321

# עדכון API אחרי שינוי ב-server/
./deploy/vm/deploy.sh

# עדכון אתר ווב אחרי שינוי UI
npm run deploy:web

# אנדרואיד לחנות (AAB)
npm run build:android

# העלאה ל-Play (internal/draft)
npm run submit:android
```

---

## פעם ראשונה

### 1. gcloud

```bash
brew install --cask google-cloud-sdk
gcloud auth login
gcloud config set project synaboard-482321
```

### 2. DNS

רשומת **A**: `kids.synaboard.com` → IP המכונה:

```bash
gcloud compute instances describe instance-20251228-103624 \
  --zone=us-central1-c --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### 3. API על VM

```bash
chmod +x deploy/vm/deploy.sh deploy/vm/remote-setup.sh deploy/vm/deploy-web.sh
./deploy/vm/deploy.sh
```

מעלה `server/.env` מהמחשב המקומי, `npm ci`, build, pm2.

### 4. HTTPS (פעם אחת)

```bash
gcloud compute ssh pilotxpil@instance-20251228-103624 --zone=us-central1-c
sudo certbot --nginx -d kids.synaboard.com
```

### 5. ווב פרודקשן

```bash
npm run deploy:web
```

בונה `expo export --platform web` עם `EXPO_PUBLIC_API_URL=https://kids.synaboard.com`, מעלה ל-`web/`, מעדכן nginx.

### 6. EAS (אנדרואיד)

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init   # אם עוד לא — פרויקט @pilotx/kidsquest

npx eas-cli env:create --name EXPO_PUBLIC_API_URL \
  --value https://kids.synaboard.com \
  --environment production --visibility plaintext --scope project

# אופציונלי ל-APK preview:
npx eas-cli env:create --name EXPO_PUBLIC_API_URL \
  --value https://kids.synaboard.com \
  --environment preview --visibility plaintext --scope project
```

```bash
cd ../..   # שורש הריפו
npm run build:android        # AAB
npm run build:android:preview  # APK
```

---

## nginx — אותו דומיין לווב + API

`deploy/vm/nginx-kidsquest.conf`:

- קבצים סטטיים (Expo `dist/`) → `root /home/pilotxpil/kidsapp/web`
- `/auth`, `/tasks`, `/rewards`, `/kids`, `/family`, `/health` → proxy ל-`:3001`

**חשוב:** route API חדש ברמת השורש ב-`server/src/index.ts` → הוסיפו ל-regex ב-nginx.

---

## עדכון שגרה

| שינוי | פקודה |
|--------|--------|
| שרת (routes, gamification) | `./deploy/vm/deploy.sh` |
| UI לפרודקשן ווב | `npm run deploy:web` |
| אפליקציה אנדרואיד | `npm run build:android` (+ submit) |

**אל** תריצו `npm run seed -w server` על Atlas בפרודקשן.

---

## בדיקות

```bash
curl https://kids.synaboard.com/health          # {"status":"ok"}
curl -sI https://kids.synaboard.com/ | head -3  # Content-Type: text/html

gcloud compute ssh pilotxpil@instance-20251228-103624 --zone=us-central1-c
pm2 list
pm2 logs kidsquest-api
```

---

## הבדל מבטומטומים

| בטומטומים | KidsQuest |
|-----------|-----------|
| אתר סטטי `out/` ב-subdomain | ווב + API על `kids.synaboard.com` |
| Supabase | MongoDB Atlas |
| `rsync` של `out/` | `deploy-web.sh` + `deploy.sh` (pm2) |

---

## פתרון תקלות

| תסמין | פתרון |
|--------|--------|
| `Permission denied` ב-deploy | סקריפטים משתמשים ב-`pilotxpil@instance…` |
| `Cannot GET /` בדפדפן לפני deploy-web | הריצו `npm run deploy:web` |
| `eas build` נכשל על API URL | הגדירו `EXPO_PUBLIC_API_URL` ב-EAS (production/preview) |
| JWT חלש | עדכנו `JWT_SECRET` ב-`server/.env` ו-`./deploy/vm/deploy.sh` |
