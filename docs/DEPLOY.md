# Deploying the demo server

This puts the ERP on one small cloud server so the client can open it from his own computer.
It runs three containers: the database, the Django API, and Caddy (the web server that also serves the React app and handles HTTPS).

## 0. Before you start (on your PC)

Check the frontend builds cleanly. The server build runs the same command, so fixing errors here saves time.

```powershell
cd frontend
npm run build
```

If it prints errors, send them to Claude. Fix them before deploying.

## 1. Get a server

- Ubuntu 24.04 LTS, 2 GB RAM or more, 1 to 2 vCPU, 25 GB disk or more.
- Choose a region in India (for example AWS Lightsail Mumbai, or DigitalOcean Bangalore). Check the provider's current price.
- Open ports 22, 80 and 443 in the provider's firewall.

## 2. Point a domain at it (recommended)

Create an `A` record, for example `erp.yourdomain.com`, pointing to the server's IP address. With a domain, Caddy gets an HTTPS certificate automatically, so passwords are not sent in the clear.
Without a domain you can use the plain IP over HTTP for a short demo. Do not put real business data on an HTTP-only server.

## 3. Install Docker on the server

```bash
ssh ubuntu@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```

Log in again so the group change applies, then check `docker --version`.

## 4. Get the code onto the server

```bash
git clone https://github.com/scmmouli/ERP.git
cd ERP
```

If the repository is private, GitHub will ask for a username and a personal access token (not your password).

## 5. Create the secrets file

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Fill in every value. Generate random secrets with:

```bash
openssl rand -base64 48
```

Use one for `DJANGO_SECRET_KEY` and a different one for `POSTGRES_PASSWORD`.
Set `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `SITE_ADDRESS` and `USE_HTTPS` for your domain (or IP), and fill in the shop details printed on invoices.

## 6. Start everything

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

The first build takes a few minutes. Check it:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs backend --tail 30
```

Then open `https://YOUR_DOMAIN/api/health/`. It should show `{"status":"ok"}`.

## 7. Create the users

Choose one strong password for the demo. This creates the owner, counter and storekeeper users:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend \
  python manage.py seed_users --password 'ChooseAStrongPasswordHere'
```

Change individual passwords later in the Django admin at `/admin/`.

## 8. Add data

- **For a first demo:** load the sample parts, customers and stock:
  ```bash
  docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend python manage.py seed_catalog
  ```
- **With the client's real parts:** sign in as the owner, open **Items**, and use **Import from Excel**.

## 9. Updating after new code

```bash
cd ~/ERP
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Database changes are applied automatically when the backend starts.

## 10. Backups

Run a backup by hand:

```bash
sh deploy/backup.sh
```

Run one every night at 2 a.m.:

```bash
crontab -e
# add this line (change the path if your folder differs):
0 2 * * * cd /home/ubuntu/ERP && sh deploy/backup.sh >> backups/backup.log 2>&1
```

Backups stay on the same server, so also copy them somewhere else regularly (your PC, or cloud storage). To restore:

```bash
gunzip -c backups/erp_YYYY-MM-DD_HHMM.sql.gz | docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T db psql -U erp erp
```

## Before this holds real business data

This is a prototype server. Before the client enters real data:
- Use a domain with HTTPS.
- Replace the demo passwords, and give each staff member their own login.
- Test a backup and a restore.
- Turn on the provider's automatic server snapshots.
