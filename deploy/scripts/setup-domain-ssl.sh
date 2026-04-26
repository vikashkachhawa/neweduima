#!/usr/bin/env bash
set -euo pipefail

DOMAIN="eduima.com"
WWW_DOMAIN="www.eduima.com"
APP_ROOT="/var/www/eduima"
NGINX_SITE_SRC="${APP_ROOT}/deploy/nginx/eduima.com.conf"
NGINX_SITE_DST="/etc/nginx/sites-available/eduima.com"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/scripts/setup-domain-ssl.sh"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update
  apt-get install -y nginx
fi

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
fi

if [[ ! -f "${NGINX_SITE_SRC}" ]]; then
  echo "Missing nginx config: ${NGINX_SITE_SRC}"
  echo "Copy repository to ${APP_ROOT} first."
  exit 1
fi

ln -sf "${NGINX_SITE_SRC}" "${NGINX_SITE_DST}"
ln -sf "${NGINX_SITE_DST}" "/etc/nginx/sites-enabled/eduima.com"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

certbot --nginx \
  -d "${DOMAIN}" \
  -d "${WWW_DOMAIN}" \
  --redirect \
  --agree-tos \
  --register-unsafely-without-email \
  --non-interactive

nginx -t
systemctl reload nginx

echo "SSL enabled for https://${DOMAIN} and https://${WWW_DOMAIN}"
