# AZAROTH — Corporate Software Website + CMS (v2.3 · cursor usability update)

A working, deployable Node.js website and integrated CMS built around the supplied burgundy-and-gold **A** logo. The design follows the supplied white/ivory corporate About Us reference and includes a non-obscuring **CMS-selectable Gold Ring / Orbit / Micro Dot / Clear Glass cursor**, responsive layouts, animations, editable brand settings, block-based page builder, media library, content publishing, recruiting, and enquiry tracking.

**This is application source code, not a static mockup.** The app contains a real database, protected APIs, image uploads, application processing, publishing and administrative access controls. **It is not a guarantee of safe launch on an untested hosting environment:** DNS, TLS, backups, legal copy, real company facts, monitoring and target-host checks are required before commercial launch.


## Cursor design update — v2.3

The previous 64px opaque Glass Orb and its hover label obscured words underneath the pointer. **v2.3 replaces it with four small, see-through cursor designs** and does not display any "View" label on top of text:

| Style | Appearance | Best use |
| --- | --- | --- |
| **Fine Gold Ring** (default) | 27px thin gold ring, 5px burgundy dot; grows at most 36px on hover, stays hollow | Professional and clear, recommended |
| **Golden Orbit** | Thin, incomplete gold orbit tracing the original logo language | Branded / distinctive |
| **Micro Dot** | 10px burgundy dot, 16px hover, faint gold halo | Most unobtrusive |
| **Clear Glass Outline** | Transparent 28px glass-edge outline, minimal reflection | Glass character without covering words |

### Change cursor through the CMS

Open **`/admin` → Brand & Theme → Cursor design**. Choose any of the four options, then click **Save all settings**. Reload the public site to see it. Settings are persisted in PostgreSQL and keep working after restart. **No source-code changes or redeployment are necessary to switch styles**. The CMS also lets you disable the custom cursor entirely; text inputs, the admin dashboard, touch devices, and reduced-motion users retain a native cursor.

The app intentionally retains cursor hover animations and click feedback, but makes the centre transparent and removes the large filled circle.

Existing v2.2 database upgrades require **no migration**: if no cursor style was previously stored, the default is the new Fine Gold Ring.

## Start here — launch error fixes in v2.2

**Confirmed problem in v2.1:** `server.js` compared its module URL with a manually concatenated `file://` path. A Windows path, project directory with a space, `#`, `%`, or Unicode could make the comparison fail. The app would exit **without starting an HTTP listener**, sometimes with no error shown. v2.2 fixes this with `pathToFileURL(path.resolve(...))` and includes a regression test that reproduces the failure. **Use this updated ZIP, not v2.1.**

### Local launch (Windows / macOS / Linux)

1. Extract the entire ZIP, not only `server.js`. Open a terminal **inside the folder containing `package.json`**.
2. Install **Node.js v22.13.0 or newer** (22 LTS recommended). Check with `node -v`.
3. Copy `.env.example` to `.env`. In Windows PowerShell: `Copy-Item .env.example .env`; in macOS/Linux: `cp .env.example .env`.
4. Set `DATABASE_URL` (and, if provided by your host, `DATABASE_URL_UNPOOLED`) to a reachable PostgreSQL database. Set `INITIAL_ADMIN_EMAIL` to a real company email (not `admin@example.com`) and `INITIAL_ADMIN_PASSWORD` to a unique passphrase of 16–128 characters. For **local-only startup** set `PORT=3000` and `PUBLIC_URL=http://localhost:3000`. Set your real `DOMAIN` later for HTTPS hosting.
5. Run `npm install` to install the PostgreSQL driver, then `npm run doctor` for startup diagnostics and `npm start`. The app prints its working URL and CMS URL.
6. Visit `http://localhost:3000` and `http://localhost:3000/admin`. Log in using the configured initial credentials.

> **Note:** The first administrator is created **only if the users table is empty**. If you have already initialized the database, changing the bootstrap credentials in `.env` will not change an existing password. Use `npm run reset-password` as described below instead. Keep the `storage/` directory or Docker persistent volume when upgrading.

PostgreSQL is the live database. The app does not fall back to SQLite or an in-memory database if PostgreSQL is unavailable.

### Quick local Docker check (does not need a domain)

Create the `.env` file as above and run:

```bash
docker compose -f compose.local.yaml up -d --build
docker compose -f compose.local.yaml ps
```

Visit `http://localhost:8080` and `http://localhost:8080/admin`. The local Docker port binds **only to your computer**. To view logs, use `docker compose -f compose.local.yaml logs -f app`.

The local Docker setup uses a separate `local_site_data` volume, so it does **not** share data with the production Compose deployment.

### Troubleshooting

| Error or symptom | Cause / fix |
| --- | --- |
| App starts then immediately exits / site does not open | v2.1 entry-point bug. Use v2.2. Check `npm start` displays **AZAROTH is running**. |
| `No such built-in module: node:sqlite` or Node syntax errors | Node version too old. Use Node.js **22.13+**; run `npm run doctor`. |
| `DATABASE_URL environment variable is required` or connection failure | Configure a reachable PostgreSQL URL in `.env`, check credentials/network access, and run `npm run doctor`. |
| `Production startup blocked: first administrator is missing` | Set valid `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` on the **first** production launch. The default example values are intentionally rejected. |
| Admin login fails | Verify email/password. If a database already exists, reset the password instead of changing `.env`. |
| `EADDRINUSE`, port already in use | Stop the old process, or change `PORT` in `.env` (and `PUBLIC_URL` for local operation). |
| PostgreSQL permission or connection errors | Confirm the PostgreSQL database exists, the configured role can connect and create/update the application schema, and TLS settings match your provider. |
| Docker Compose refuses to start because `DOMAIN` is missing | Use `compose.local.yaml` for local testing, or enter a real registered domain with valid DNS for production. |
| HTTPS certificate fails | Confirm DNS points to your host, inbound ports **80 and 443** are open, and `docker compose logs -f caddy` for errors. |
| CMS page looks blank | Verify the app is serving `/api/health`, `/api/content`, `/app.js`, `/enhancements.js` and `/style.css` (no 404). Use a hard refresh to clear cached assets. |
| App opens but uploaded images disappear after restart | Do not use ephemeral filesystem storage. Keep the named Docker volume and configure off-site backups. |

For diagnostics, run `npm run verify` and include output from `npm start` or `docker compose logs --tail=150 app` when reporting a new issue. Do **not** share your `.env` secrets or user records.

## Quick deploy — Docker Compose + automatic HTTPS

Requirements: a VPS or dedicated server with Docker Engine and Docker Compose, ports 80 and 443 reachable, a domain pointing to your server, and a reachable PostgreSQL database.

1. Copy the project folder to your server and open a terminal in it.
2. Copy `.env.example` to `.env` and set:
   - `DOMAIN=www.yourcompany.com` (with matching DNS A/AAAA record).
   - `DATABASE_URL` (and `DATABASE_URL_UNPOOLED` if provided) for your PostgreSQL database.
   - `INITIAL_ADMIN_EMAIL=you@yourcompany.com`.
   - `INITIAL_ADMIN_PASSWORD=` to a unique random password of at least 16 characters.
3. Start the application:

   ```bash
   docker compose up -d --build
   docker compose ps
   ```

4. Wait for the app to become healthy and Caddy to provision TLS. Open `https://YOUR-DOMAIN/admin`. Log in with the email/password from `.env`.
5. **Remove `INITIAL_ADMIN_PASSWORD` from `.env` after first launch**, then run `docker compose up -d --force-recreate app`. The account lives in the persistent database, not the bootstrap environment variable.
6. In `/admin` update the logo, copy, contact details, policies, photos, navigation and CMS content. Test a message submission and confirm it appears under **Enquiries**.
7. Set up **automatic off-server backups**, log monitoring, uptime alerts and any desired notification provider. Check the full deployment checklist below.

> Docker was not available in the build environment, so container execution and real HTTPS certificate issuance **must** be confirmed on your own server. Automated application API tests were run successfully.

### Optional email notifications (Resend)

Website submissions always save to the CMS. To additionally send notification emails, set `RESEND_API_KEY`, `NOTIFY_FROM` (a verified sender) and `NOTIFY_TO` in `.env`, then recreate the app. You need to configure and verify the sender domain in your Resend account. Without these, contact enquiries and job applications **still function**; notification emails are simply disabled.

## Local development

Requires Node.js **22.13+**; tested with Node.js 22.16.

```bash
export PORT=3000
export INITIAL_ADMIN_EMAIL='admin@yourcompany.com'
export INITIAL_ADMIN_PASSWORD='use-a-unique-strong-password-with-16-plus-characters'
npm start
```

Open `http://localhost:3000` and `http://localhost:3000/admin`. PostgreSQL stores application data; uploaded public media and private resumes are stored under `STORAGE_DIR` and need persistent storage.

To run with an `.env` file directly: `node --env-file=.env server.js` (set `PUBLIC_URL=http://localhost:3000` if testing locally). For production, use the provided Compose setup or an equivalent TLS reverse proxy, a managed PostgreSQL database, and persistent file storage.

## What the CMS actually does

| CMS area | Working actions |
| --- | --- |
| Overview | Database-backed content, enquiry, application, page counts |
| Brand & Theme | Brand text, logo URL, hero/About copy, contact details, colours, legal copy, Glass Orb settings, animation preset |
| Navigation | Add, remove, reorder and update site navigation and social links |
| Feature Cards | Edit service, industry and process/statistic cards |
| Content Library | Draft, publish, update, delete services, industries, products, jobs, blog posts, projects, team members, testimonials, technologies and standalone entries |
| Visual Page Builder | Add, edit, reorder, remove and preview hero, text, image/text, cards, stats, FAQ, collection, CTA and divider blocks; draft/publish layouts for standard or custom pages |
| Media Library | Upload/reuse/delete PNG/JPEG/WebP assets up to 4MB, store alternative text |
| Enquiries | View submissions, update status, add notes, delete records (admin) |
| Job Applications | View applicants, update status, download private PDF resumes, delete applications/resumes (admin) |
| Team & Access | Create users with Admin/Editor/Viewer roles, update roles and active state, change password |
| Activity Log | Review recent administrative actions |

### PostgreSQL setup and SQLite migration

The server and container configurations use PostgreSQL via `DATABASE_URL` (or `DATABASE_URL_UNPOOLED`). `DATABASE_URL` is server-only and must never be exposed to browser code. Set the URLs and admin bootstrap values in `.env` before starting the app.

For an existing `storage/website.sqlite`, first review the proposed merge without writing to either database:

```bash
npm run migrate:sqlite:plan
```

After reviewing the row counts and conflicts, run the migration:

```bash
npm run migrate:sqlite
```

The migration takes verified, private backups of the SQLite source, current PostgreSQL rows, public media, and private resumes in `storage/migration-backups/` before writing. It merges SQLite content into PostgreSQL while retaining unrelated PostgreSQL records; matching SQLite records take precedence, and colliding audit records are retained with remapped IDs. Keep the SQLite file unchanged until the application and migrated counts/content have been independently checked. Secure and copy the backup directory off-host; it contains sensitive user, session, inquiry, and resume data. Re-running an already completed source migration is guarded.

### Transparent navigation and Home product showcase (v2.1, preserved in v2.2)

- The navigation now sits **directly over the hero with no white pill/background, border, backdrop blur or drop shadow**. Its links, logo and CTA are unchanged and remain CMS-editable. On small screens, the **opened menu drawer** retains an opaque white background for readability; the header itself stays transparent. This transparent hero-integrated header is deliberately **not sticky** during scrolling, to avoid unreadable links over page content.
- Home includes a new **Featured Products** section with an elegant product visual, category, summary, optional overview highlights from the product body, technology tags, and working product detail links. It automatically displays up to **three published products** from the existing CMS. Draft/unpublished products never appear publicly.
- To add products: sign in to `/admin`, open **Content Library → Products**, enter title, slug, short summary, detailed body, category, technologies (comma-separated), optional image URL from **Media Library**, set **Published**, and save. Reload Home. The first published product is featured; the next two use compact cards. Products are ordered by latest update in the public API.
- Before publishing real products, Home displays a polished **product-development introduction** rather than inventing false product names or customer claims.
- In **Brand & Theme** you can edit the homepage product section headline, description and visibility. If you've created a custom published home layout using the **Visual Page Builder**, add a **Collection** block with collection set to `products`, or reload the updated Home starter sections (which now include products). This keeps section order completely CMS-controlled.
- The original CMS database schema remains compatible. New settings are added with safe defaults at runtime, and old content is retained.

### Public pages

Home, About, Services, Industries, Products, Careers, Blog/Insights, Projects/Case Studies, Contact, Privacy, Terms, all relevant detail pages and CMS-created layouts. Published services and industries automatically replace the starter homepage card collections; other collections show published records only.

**Important:** Company statistics, team members, testimonials, product descriptions and industry claims must be genuine and approved by the business. Default text is demonstration copy, not verified marketing claims. Default Privacy and Terms text **must be replaced and legally reviewed** before launch.

### CMS page builder steps

1. Open **Visual Page Builder** and select `home`, `about`, `services`, etc., or choose **Create custom page** and type a URL slug.
2. Click **Load starter sections** or add individual blocks.
3. Edit headings, paragraphs, images and buttons; reorder sections with ↑ and ↓. For cards, stats or FAQ entries use one item per line, fields separated by `|`.
4. Check the live section preview.
5. Set **Publish status** to `Published` and click **Save page layout**.
6. Refresh the corresponding public page. Draft layouts are never publicly visible. A published custom layout overrides that standard page's built-in sections; deleting it restores the built-in page.

**Images:** Open **Media Library**, upload an image, copy its `/media/...` URL, then paste it into a page or content editor. The original logo is available as `/logo.png`.

### Changing the Glass Orb Cursor

Go to `/admin` → **Brand & Theme** and set `Glass Orb Cursor`, size and trailing lag. It activates only on desktop fine-pointer devices. Inputs, text editing, touch devices, CMS administration and reduced-motion users retain normal interaction behaviour. Cards and buttons show elegant hover effects and contextual cursor states.

## Security design

- Scrypt password hashing with individual salts.
- Server-side Admin / Editor / Viewer access rules.
- Secure HttpOnly SameSite cookies over HTTPS, time-limited login sessions and CSRF headers on administrative mutations.
- Constant-time password verification, request-size bounds, basic per-IP rate limits and form honeypots.
- Parameterized SQL queries, allowlisted content types, image header validation, private résumé storage and forced PDF downloads.
- Browser security headers including Content Security Policy and HSTS in production.
- Audit trail, server-side form validation and explicitly required privacy consent.

These controls do not replace regular dependency checks, security review, ongoing patching, backups or hosting/firewall hardening. Keep the Node and Caddy images patched and do not expose the Node application port publicly when using the supplied Compose configuration.

### Reset an admin password from the server

With local Node:

```bash
TARGET_EMAIL='admin@yourcompany.com' NEW_PASSWORD='your-new-unique-16-plus-character-password' npm run reset-password
```

When running Docker, execute `node scripts/reset-password.mjs` **inside the app container**, providing the two environment variables securely. All sessions for that account are invalidated.

## Backups and recovery

PostgreSQL stores application records; uploaded public media and private resumes live in `storage/`. The SQLite-to-PostgreSQL migration is an explicit, backed-up operation and is not run automatically at server startup. For Docker, the `site_data` volume persists file uploads; the database itself is the PostgreSQL service configured in `.env`.

Create a consistent database and media backup:

```bash
npm run backup -- ./backups/manual-2026-10-17
```

For Docker (backup stored in the persistent volume initially):

```bash
docker compose exec app node scripts/backup.mjs /app/storage/backups/daily-001
```

**Important:** Copy backup files to a different server or managed object storage. A backup held only inside the same Docker volume does **not** protect against host or volume loss. Protect backups containing contact details and résumés as sensitive data. `npm run backup` exports PostgreSQL tables plus `media/` and `private/` files; use your PostgreSQL provider's tested restore procedure to restore the database, restore the files into the storage volume, verify ownership, and restart the app. Test restore procedures periodically.

## Tests

Version 2.2 keeps the 2.1 regression checks for published products, filtering drafts, home-page product rendering, product links, CMS section customization, hide/show setting, and transparent navigation styling.


```bash
npm run doctor
npm run verify
```

The integration, startup, and parity suites require `TEST_DATABASE_URL` to a dedicated PostgreSQL test database. They create and remove a uniquely named schema there and refuse to use the configured production database. Never set `TEST_DATABASE_URL` to production. The tests create the first administrator, check roles, authentication, CSRF, drafts/publishing, layouts, media, enquiries, job applications and private résumés, SEO, audit logging and restart persistence. The frontend smoke suite executes the application scripts in a simulated DOM and checks that each major page produces its expected markup.

The container's Chromium installation enforced a URL block policy; full visual browser, keyboard/screen-reader, performance, Web Vitals and cross-device rendering tests could **not** be completed here. Run these in a real browser before public launch.

## Production launch checklist

- [ ] Configure domain and TLS; validate `https://` and redirects.
- [ ] Remove the bootstrap password from the environment after creating the first administrator.
- [ ] Replace sample company name, contact information, description, images and services with verified content.
- [ ] Add real career listings/products/blog posts (or hide unavailable sections using Navigation manager).
- [ ] Review and publish company-specific Privacy Policy, Terms, data retention period and legal contacts.
- [ ] Connect a verified Resend sender if email notifications are required.
- [ ] Test forms, applicant résumé downloads, editor permissions and logout on the real host.
- [ ] Test 320px mobile through 1920px desktop, touch interactions and reduced-motion setting.
- [ ] Run accessibility, SEO, Core Web Vitals and security checks on the deployed site.
- [ ] Add daily off-site encrypted backups and periodically test restoration.
- [ ] Configure monitoring, alerting, system updates, log retention and a data deletion procedure.

## Architecture and operational notes

- This is a Node.js application backed by PostgreSQL (`pg`) and filesystem-based media/resume storage. A reachable database URL is required; there is no in-memory fallback.
- PostgreSQL stores shared application data. Keep `STORAGE_DIR` persistent for media and private resumes, or migrate those files to an appropriately secured object store before using ephemeral or horizontally scaled application instances.
- Public pages have route-specific server-provided title, description, canonical and Open Graph metadata, plus an initial content fallback. The full visual content renders in the browser, so search engine support is not the same as a fully server-rendered Next.js implementation.
- Inline CMS content uses escaped plain text; this builder is **section-based**, not a free-form WYSIWYG/drag-anywhere canvas. Sections are reordered with explicit controls.
- Sample office photographs are loaded from Unsplash; fonts are loaded from Google Fonts. Replace them with licensed, approved company photos and self-hosted fonts as required. All application JavaScript and icons are served locally.
- This package has no paid dependencies, but hosting, DNS, email and external media may incur third-party costs.

## Contents

- `server.js` — authenticated CMS API, database and web server
- `public/` — website UI, CMS interface, original brand artwork, styles, icons and interactions
- `compose.yaml` + `Dockerfile` + `Caddyfile` — deployable HTTPS hosting stack
- `scripts/backup.mjs` — consistent database and file backup
- `scripts/reset-password.mjs` — recovery for server administrators
- `tests/` — API, frontend smoke and cross-platform startup regression checks
- `compose.local.yaml` — local-only Docker launch without DNS / HTTPS
- `scripts/doctor.cjs` — Node, configuration and storage troubleshooting diagnostics
- `.env.example` — first-run configuration template

**License/ownership:** Original logo was supplied by the website owner. Ensure rights to any new media and text supplied or uploaded through the CMS. Site source code is provided for your use; check your organizational policies before launch.
