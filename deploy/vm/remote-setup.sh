#!/usr/bin/env bash
# Runs ON the VM after code sync. Invoked by deploy.sh via gcloud compute ssh.
set -euo pipefail

APP_ROOT="/home/pilotxpil/kidsapp"
cd "$APP_ROOT"

export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"

echo "==> Node: $(node -v 2>/dev/null || echo missing)"

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]]; then
  echo "==> Installing Node 20 via nvm..."
  export NVM_DIR="$HOME/.nvm"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm alias default 20
fi

# shellcheck source=/dev/null
[[ -s "$HOME/.nvm/nvm.sh" ]] && source "$HOME/.nvm/nvm.sh"

echo "==> npm install + build..."
npm ci
npm run build -w @kidsapp/shared
npm run build -w server

if [[ ! -f server/.env ]]; then
  echo "ERROR: server/.env missing on VM. Run deploy.sh from your Mac (it copies a local .env)."
  exit 1
fi

# Ensure production flags (deploy.sh may have already written these)
grep -q '^NODE_ENV=' server/.env && sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' server/.env || echo 'NODE_ENV=production' >> server/.env
grep -q '^PORT=' server/.env || echo 'PORT=3001' >> server/.env

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing pm2..."
  npm install -g pm2
fi

echo "==> PM2 start/restart..."
pm2 delete kidsquest-api 2>/dev/null || true
pm2 start "$APP_ROOT/deploy/vm/ecosystem.config.cjs"
pm2 save

echo "==> Health check (local)..."
sleep 2
curl -sf http://127.0.0.1:3001/health && echo ""

echo "==> Done. API on :3001 (nginx → https://kids.synaboard.com when configured)."
