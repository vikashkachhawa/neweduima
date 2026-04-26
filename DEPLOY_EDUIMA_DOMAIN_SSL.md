# Eduima Deployment on eduima.com with SSL

## 1. DNS Requirements

Create these DNS records and point to your Linux server public IP:

- A record: `eduima.com`
- A record: `www.eduima.com`

Wait until DNS propagation is complete.

Important for SSL validation:

- `eduima.com` and `www.eduima.com` must resolve only to this server while issuing the certificate.
- If multiple A records point to different servers/CDN endpoints, Let's Encrypt HTTP challenge can fail with `unauthorized`.

## 2. Server Requirements

- Ubuntu/Debian Linux server
- Node.js 18+
- MySQL running and database configured
- Open ports: 80 and 443

## 3. Prepare Environment Files

### Backend (`backend/.env`)

```env
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=eduima_db
JWT_SECRET=change-this-in-production
JWT_EXPIRE=24h
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://eduima.com
FRONTEND_URLS=https://eduima.com,https://www.eduima.com
```

### Frontend (`frontend/.env.production`)

```env
VITE_API_URL=/api
VITE_SOCKET_URL=https://eduima.com
```

## 4. Copy Project to Server Path

Project should exist at:

- `/var/www/eduima`

## 5. Deploy App

```bash
cd /var/www/eduima
bash deploy/scripts/deploy.sh
```

## 6. Configure Nginx and SSL

```bash
cd /var/www/eduima
sudo bash deploy/scripts/setup-domain-ssl.sh
```

This configures Nginx for:

- Frontend static app from `/var/www/eduima/frontend/dist`
- API proxy to backend `127.0.0.1:5000`
- Socket.io proxy to backend
- HTTPS certificate via Let's Encrypt
- HTTP to HTTPS redirect

## 7. Verify

- `https://eduima.com`
- `https://www.eduima.com`
- `https://eduima.com/health`
