#!/usr/bin/env bash
# Deploy this checkout to the server: upload the source, build it there, swap in the new release
# and restart the service. Posts, uploads and settings in /var/lib/besthomas are never touched.
#
# The server and SSH key come from environment variables, or from .env.deploy in the project root
# (not committed):
#
#   DEPLOY_HOST=root@your.server.ip
#   DEPLOY_KEY=/path/to/your-key.pem
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
[ -f "$ROOT/.env.deploy" ] && . "$ROOT/.env.deploy"
HOST="${DEPLOY_HOST:?Set DEPLOY_HOST, e.g. in .env.deploy}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/id_ed25519}"
SSH="ssh -i $KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new ${DEPLOY_SSH_OPTS:-}"

echo "==> Uploading source to $HOST:/opt/besthomas/src"
$SSH "$HOST" 'mkdir -p /opt/besthomas/src'
rsync -az --delete -e "$SSH" \
  --exclude node_modules --exclude .next --exclude data --exclude reference \
  --exclude '.env*' --exclude .claude --exclude .git --exclude '*.tsbuildinfo' --exclude .DS_Store \
  "$ROOT/" "$HOST:/opt/besthomas/src/"

echo "==> Building on the server"
$SSH "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/besthomas/src
bash deploy/setup-server.sh
npm ci --no-audit --no-fund --loglevel=error
rm -rf .next   # always build from scratch; a reused build cache once shipped stale CSS
NEXT_TELEMETRY_DISABLED=1 npm run build

release=/opt/besthomas/app.new
rm -rf "$release"
cp -r .next/standalone "$release"
cp -r .next/static "$release/.next/static"
cp -r public "$release/public"
install -d -o besthomas -g besthomas "$release/.next/cache"

rm -rf /opt/besthomas/app.old
if [ -d /opt/besthomas/app ]; then mv /opt/besthomas/app /opt/besthomas/app.old; fi
mv "$release" /opt/besthomas/app
systemctl restart besthomas

up=""
for i in $(seq 1 20); do
  if curl -fs -o /dev/null http://127.0.0.1:3100/; then up=1; break; fi
  sleep 1
done
if [ -z "$up" ]; then
  echo "besthomas did not come up; last log lines:" >&2
  journalctl -u besthomas -n 40 --no-pager >&2
  exit 1
fi
echo "==> besthomas is up on 127.0.0.1:3100"
bash deploy/setup-server.sh --site
REMOTE
