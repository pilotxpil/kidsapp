#!/usr/bin/env bash
# Sync STORE_VERSION_* in server/.env from apps/mobile/app.json expo.version.
# Used by deploy.sh so update-check API stays aligned with the app release.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
APP_JSON="$REPO_ROOT/apps/mobile/app.json"
ENV_FILE="$REPO_ROOT/server/.env"

if [[ ! -f "$APP_JSON" ]]; then
  echo "Missing $APP_JSON"
  exit 1
fi

VERSION="$(node -p "require('$APP_JSON').expo.version")"
if [[ -z "$VERSION" || "$VERSION" == "undefined" ]]; then
  echo "Could not read expo.version from app.json"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from server/.env.example first."
  exit 1
fi

upsert_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    # macOS / BSD sed
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

upsert_env "STORE_VERSION_ANDROID" "$VERSION"
upsert_env "STORE_VERSION_IOS" "$VERSION"

echo "==> Synced store versions to $VERSION (STORE_VERSION_ANDROID / STORE_VERSION_IOS)"
