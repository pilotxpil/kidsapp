#!/usr/bin/env bash
# Deploy KidsQuest API to the Synaboard GCP VM (same as batumtumim).
# Prerequisite: gcloud auth login (once on this Mac)
set -euo pipefail

INSTANCE="instance-20251228-103624"
ZONE="us-central1-c"
PROJECT="synaboard-482321"
REMOTE_USER="pilotxpil"
REMOTE_DIR="/home/pilotxpil/kidsapp"
SUBDOMAIN="kids.synaboard.com"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

export PATH="/opt/homebrew/share/google-cloud-sdk/bin:/opt/homebrew/bin:$PATH"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Install gcloud: brew install --cask google-cloud-sdk"
  exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
  echo "Run first: gcloud auth login"
  exit 1
fi

gcloud config set project "$PROJECT" --quiet

if [[ ! -f "$REPO_ROOT/server/.env" ]]; then
  echo "Missing $REPO_ROOT/server/.env — copy from server/.env.example and set MONGODB_URI."
  exit 1
fi

if grep -q 'kidsapp-dev-secret' "$REPO_ROOT/server/.env"; then
  echo "WARNING: JWT_SECRET in server/.env looks like dev default — change before production."
fi

echo "==> Building shared + server locally (sanity check)..."
cd "$REPO_ROOT"
npm run build -w @kidsapp/shared
npm run build -w server

TMP_TAR="$(mktemp /tmp/kidsapp-deploy.XXXXXX.tgz)"
trap 'rm -f "$TMP_TAR"' EXIT

echo "==> Packaging (server + shared, no mobile)..."
tar -czf "$TMP_TAR" \
  -C "$REPO_ROOT" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.expo' \
  --exclude='.git' \
  package.json \
  package-lock.json \
  packages/shared \
  server \
  deploy/vm

REMOTE_HOST="${REMOTE_USER}@${INSTANCE}"

echo "==> Upload tarball..."
gcloud compute scp "$TMP_TAR" "${REMOTE_HOST}:~/kidsapp-deploy.tgz" --zone="$ZONE" --project="$PROJECT"

echo "==> Upload server/.env (secrets stay off git)..."
gcloud compute scp "$REPO_ROOT/server/.env" "${REMOTE_HOST}:~/kidsapp-server.env" --zone="$ZONE" --project="$PROJECT"

REMOTE_SCRIPT=$(cat <<'REMOTE'
set -euo pipefail
mkdir -p /home/pilotxpil/kidsapp
cd /home/pilotxpil/kidsapp
tar -xzf ~/kidsapp-deploy.tgz
mv -f ~/kidsapp-server.env server/.env
chmod 600 server/.env
bash deploy/vm/remote-setup.sh
REMOTE
)

echo "==> Remote install + pm2..."
gcloud compute ssh "$REMOTE_HOST" --zone="$ZONE" --project="$PROJECT" --command="$REMOTE_SCRIPT"

EXTERNAL_IP="$(gcloud compute instances describe "$INSTANCE" --zone="$ZONE" --project="$PROJECT" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
echo ""
echo "=============================================="
echo " API deployed on VM (port 3001, pm2: kidsquest-api)"
echo " External IP: $EXTERNAL_IP"
echo ""
echo " Next (once DNS A record exists for $SUBDOMAIN → $EXTERNAL_IP):"
echo "   gcloud compute ssh $REMOTE_HOST --zone=$ZONE --project=$PROJECT"
echo "   sudo cp $REMOTE_DIR/deploy/vm/nginx-kidsquest.conf /etc/nginx/sites-available/kidsquest"
echo "   sudo ln -sf /etc/nginx/sites-available/kidsquest /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "   sudo certbot --nginx -d $SUBDOMAIN"
echo ""
echo " Then set EAS production env:"
echo "   EXPO_PUBLIC_API_URL=https://$SUBDOMAIN"
echo "=============================================="
