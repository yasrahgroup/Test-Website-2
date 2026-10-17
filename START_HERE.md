## New in v2.3

**Opaque Glass Orb hover problem fixed.** Choose **Gold Ring**, **Golden Orbit**, **Micro Dot** or **Clear Glass Outline** under `/admin` → **Brand & Theme** → **Cursor design**, then save. Default is Fine Gold Ring; no text is covered.

# AZAROTH v2.2 — Start here

This release fixes the previous package's confirmed startup bug.

## Fastest way to run on a computer

1. Unzip the **entire** folder. Open Terminal/PowerShell inside the folder containing `package.json`.
2. Install Node.js 22.13+ (`node -v`).
3. Copy `.env.example` to `.env`:
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
4. Open `.env` and **replace** the example administrator email and password with real unique values. Password must be 16+ characters. For local run you may append:

   ```dotenv
   PORT=3000
   PUBLIC_URL=http://localhost:3000
   ```

5. Run:

   ```bash
   npm run doctor
   npm start
   ```

6. Open `http://localhost:3000` and CMS: `http://localhost:3000/admin`.

**No npm install is required.** Your site data and uploads are saved in the `storage/` directory. Keep it when updating.

## Docker without a domain (local check)

```bash
docker compose -f compose.local.yaml up -d --build
```

Open `http://localhost:8080` and `/admin`.

## Real domain / HTTPS deployment (server)

Update `.env` with your real `DOMAIN`, initial admin email/password, and point your DNS to the server. Open inbound ports 80 and 443, then:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Open `https://YOUR-DOMAIN/admin`. On first login the CMS account is persisted; remove `INITIAL_ADMIN_PASSWORD` from `.env` and recreate the app container. Preserve your `site_data` Docker volume.

## If anything fails

```bash
npm run verify
# Or on Docker:
docker compose logs --tail=150 app
```

See `README.md` for launch troubleshooting, backup, security and complete deployment instructions. **Do not send private .env contents, passwords or application data in support logs.**
