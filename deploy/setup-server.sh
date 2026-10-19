#!/usr/bin/env bash
# Server setup for besthomas.com. Runs on the server as root; safe to run again on every deploy.
#
#   setup-server.sh          service user, content folder, env file, systemd unit
#   setup-server.sh --site   add/refresh the site in FrankenPHP (run once the app is up). The config is
#                            validated first, so a mistake never takes the other sites on this server down.
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"

setup_service() {
  id besthomas >/dev/null 2>&1 || useradd --system --home-dir /var/lib/besthomas --shell /usr/sbin/nologin besthomas
  install -d -o besthomas -g besthomas -m 750 /var/lib/besthomas

  if [ ! -f /etc/besthomas.env ]; then
    local password
    password="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
    (
      umask 027
      printf 'ADMIN_PASSWORD=%s\nSITE_URL=https://besthomas.com\nSITE_TIMEZONE=Asia/Shanghai\n' "$password" >/etc/besthomas.env
    )
    chown root:besthomas /etc/besthomas.env
    chmod 640 /etc/besthomas.env
    echo "setup: created /etc/besthomas.env with a new admin password"
  fi

  install -m 644 "$SRC/deploy/besthomas.service" /etc/systemd/system/besthomas.service
  systemctl daemon-reload
  systemctl enable besthomas >/dev/null 2>&1
}

validate_caddy() {
  runuser -u www-data -- env XDG_DATA_HOME=/var/lib/caddy/data XDG_CONFIG_HOME=/var/lib/caddy/config \
    frankenphp validate --config /etc/frankenphp/Caddyfile
}

setup_site() {
  local log=/var/log/frankenphp/besthomas.com.access.log
  local site=/etc/frankenphp/sites/besthomas.com.caddy
  [ -f "$log" ] || install -o www-data -g www-data -m 600 /dev/null "$log"
  cmp -s "$SRC/deploy/besthomas.com.caddy" "$site" && return 0

  local backup=""
  if [ -f "$site" ]; then backup="$site.bak"; cp "$site" "$backup"; fi
  install -m 644 "$SRC/deploy/besthomas.com.caddy" "$site"
  if validate_caddy >/tmp/besthomas-caddy-validate.log 2>&1; then
    systemctl reload frankenphp
    echo "setup: FrankenPHP reloaded with besthomas.com"
  else
    cat /tmp/besthomas-caddy-validate.log >&2
    if [ -n "$backup" ]; then mv "$backup" "$site"; else rm -f "$site"; fi
    echo "setup: Caddy config invalid; previous site config restored, FrankenPHP not reloaded" >&2
    return 1
  fi
}

if [ "${1:-}" = "--site" ]; then setup_site; else setup_service; fi
