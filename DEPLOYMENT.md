# Deployment Guide — Railway + PostgreSQL

This deploys **3 Railway services** inside one project:
1. **PostgreSQL** database (Railway plugin)
2. **Backend** (Django API) — root directory `backend/`
3. **Frontend** (React) — root directory `frontend/`

---

## Prerequisites
- A [Railway](https://railway.app) account (sign in with GitHub)
- This repo pushed to GitHub (done — branch `claude/jolly-cori-OsjVd`)

---

## Step 1 — Create the project & database
1. Railway → **New Project** → **Deploy from GitHub repo** → select `Payments_manager`.
2. In the project, click **New** → **Database** → **Add PostgreSQL**.

## Step 2 — Backend service
1. **New** → **GitHub Repo** → same repo.
2. Service **Settings** → set **Root Directory** = `backend`.
3. Settings → **Branch** = `claude/jolly-cori-OsjVd` (or `main` after merge).
4. **Variables** tab — add:
   | Key | Value |
   |---|---|
   | `SECRET_KEY` | a long random string (50+ chars) |
   | `DEBUG` | `False` |
   | `DATABASE_URL` | reference the Postgres var: `${{Postgres.DATABASE_URL}}` |
   | `TWILIO_ACCOUNT_SID` | your Twilio SID |
   | `TWILIO_AUTH_TOKEN` | your Twilio token |
   | `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (or your number) |
   | `CORS_ALLOWED_ORIGINS` | the frontend URL (fill in after Step 3) |
5. Settings → **Networking** → **Generate Domain**. Note this URL — it's your API base.
6. Migrations + collectstatic run automatically on each deploy (via `Procfile` release phase).

### Create your admin user (one-time)
Backend service → open a shell (Railway → service → ⋯ → **Shell** / or use `railway run`):
```bash
python manage.py createsuperuser
```

## Step 3 — Frontend service
1. **New** → **GitHub Repo** → same repo.
2. Settings → **Root Directory** = `frontend`.
3. **Variables** tab — add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-backend-domain>/api` |
4. Settings → **Networking** → **Generate Domain**. This is the URL you open in the browser.

## Step 4 — Connect CORS
1. Copy the frontend domain (e.g. `https://payments-frontend.up.railway.app`).
2. Go to the **backend** service → Variables → set `CORS_ALLOWED_ORIGINS` to that URL.
3. Backend redeploys automatically.

---

## Done
Open the frontend URL → log in with your superuser → start adding trainers, students, batches.

## Notes
- **Media/screenshots**: Railway's filesystem is ephemeral. For persistent payment screenshots, add a Railway **Volume** mounted at `backend/media`, or switch to S3/Cloudinary later.
- **Custom domain**: add it under a service's Networking tab and update DNS.
- **Costs**: Hobby plan is free to start; usage-based after.

## Local development
See `README.md`.
