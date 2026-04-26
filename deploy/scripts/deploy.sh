#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/eduima"
BACKEND_DIR="${APP_ROOT}/backend"
FRONTEND_DIR="${APP_ROOT}/frontend"

if [[ ! -d "${BACKEND_DIR}" || ! -d "${FRONTEND_DIR}" ]]; then
  echo "Expected app at ${APP_ROOT} with backend/ and frontend/"
  exit 1
fi

pushd "${BACKEND_DIR}" >/dev/null
npm ci
popd >/dev/null

pushd "${FRONTEND_DIR}" >/dev/null
npm ci
npm run build
popd >/dev/null

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe eduima-backend >/dev/null 2>&1; then
    pm2 restart eduima-backend --update-env
  else
    pm2 start "${BACKEND_DIR}/server.js" --name eduima-backend --cwd "${BACKEND_DIR}"
  fi
  pm2 save
else
  echo "pm2 not found. Install with: npm install -g pm2"
  echo "Then run: pm2 start ${BACKEND_DIR}/server.js --name eduima-backend"
fi

echo "Deploy complete. Frontend build at ${FRONTEND_DIR}/dist"
