#!/usr/bin/env bash
# Build Expo web (production) locally and deploy static files to the VM.
set -euo pipefail

INSTANCE="instance-20251228-103624"
ZONE="us-central1-c"
PROJECT="synaboard-482321"
REMOTE_HOST="pilotxpil@${INSTANCE}"
REMOTE_WEB="/home/pilotxpil/kidsapp/web"
API_URL="${EXPO_PUBLIC_API_URL:-https://kids.synaboard.com}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
MOBILE="$REPO_ROOT/apps/mobile"

export PATH="/opt/homebrew/share/google-cloud-sdk/bin:/opt/homebrew/bin:$PATH"

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
  echo "Run: gcloud auth login"
  exit 1
fi

gcloud config set project "$PROJECT" --quiet

echo "==> Build shared + Expo web export (API: $API_URL)..."
cd "$REPO_ROOT"
npm run build -w @kidsapp/shared
cd "$MOBILE"
EXPO_PUBLIC_API_URL="$API_URL" npx expo export --platform web

if [[ ! -d dist ]]; then
  echo "ERROR: apps/mobile/dist not found after export"
  exit 1
fi

TMP_TAR="$(mktemp /tmp/kidsapp-web.XXXXXX.tgz)"
trap 'rm -f "$TMP_TAR"' EXIT

echo "==> Packaging dist/..."
tar -czf "$TMP_TAR" -C dist .

echo "==> Upload..."
gcloud compute scp "$TMP_TAR" "${REMOTE_HOST}:~/kidsapp-web.tgz" --zone="$ZONE" --project="$PROJECT"

REMOTE_SCRIPT=$(cat <<REMOTE
set -euo pipefail
mkdir -p "$REMOTE_WEB"
find "$REMOTE_WEB" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf ~/kidsapp-web.tgz -C "$REMOTE_WEB"
rm -f ~/kidsapp-web.tgz
REMOTE
)

echo "==> Extract on server..."
gcloud compute ssh "$REMOTE_HOST" --zone="$ZONE" --project="$PROJECT" --command="$REMOTE_SCRIPT"

echo "==> Update nginx (web + API split)..."
gcloud compute scp "$SCRIPT_DIR/nginx-kidsquest.conf" "${REMOTE_HOST}:~/nginx-kidsquest.conf" --zone="$ZONE" --project="$PROJECT"
gcloud compute ssh "$REMOTE_HOST" --zone="$ZONE" --project="$PROJECT" --command='sudo cp ~/nginx-kidsquest.conf /etc/nginx/sites-available/kidsquest && sudo nginx -t && sudo systemctl reload nginx'

echo ""
echo "=============================================="
echo " Web:  https://kids.synaboard.com"
echo " API:  https://kids.synaboard.com/health"
echo " Parent (after login): https://kids.synaboard.com/parent-login"
echo "=============================================="
