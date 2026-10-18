# AZAROTH CMS — Implementation, Deployment & Operational Guide

## 1. System Architecture & Prerequisites

AZAROTH is a Node.js application using PostgreSQL for persistent records and filesystem storage for uploaded assets:
- **Server Engine**: Native `node:http` with streaming, granular routing, and strict security headers.
- **Data Persistence**: PostgreSQL via the `pg` driver; database connectivity is required and the application has no in-memory fallback.
- **Crypto & Security**: Native `node:crypto` (`scryptSync` password hashing, constant-time `timingSafeEqual`, SHA-256 tokens).
- **Filesystem & Storage**: Native `node:fs` with strict octal permissions (`0o600` for files, `0o700` for directories).
- **Frontend Architecture**: Client-side reactive SPA framework with dynamic SSR shell pre-rendering for SEO and social crawlers.

---

## 2. Environment Variables & Setup

Configuration is controlled via environment variables or a local `.env` file (see `.env.example`). Configure `DATABASE_URL` for PostgreSQL; use `DATABASE_URL_UNPOOLED` only when supplied by your database provider. Database URLs remain server-side and must not be sent to browser code.

```bash
# Server & Port
PORT=3000                     # HTTP listener port (default: 3000)
PUBLIC_URL=http://localhost:3000 # Canonical base URL for SEO and sitemaps
NODE_ENV=production           # 'development' or 'production'

# File storage (public media and private resumes; database is PostgreSQL)
STORAGE_DIR=storage

# Initial Admin Bootstrap
INITIAL_ADMIN_EMAIL=admin@azaroth.tech
INITIAL_ADMIN_PASSWORD=your-super-strong-password

# Dedicated PostgreSQL database for tests only; never point this at production.
# Tests create and remove a uniquely named schema.
TEST_DATABASE_URL=postgresql://user:password@host:port/test_database?sslmode=require

# Transactional Email (Optional)
RESEND_API_KEY=re_...
NOTIFY_FROM=noreply@azaroth.tech
NOTIFY_TO=team@azaroth.tech
```

---

## 3. Local Development & Operational Commands

```bash
# Install dependencies, including the PostgreSQL driver
npm install

# Start local dev server with file watching
npm run dev

# Set TEST_DATABASE_URL to a dedicated test database before running integration tests.
# Run checks plus integration, frontend, startup, and parity suites
npm run verify

# Individual test runners
npm test              # Full production integration suite
npm run test:frontend # Frontend DOM and smoke test
npm run test:startup  # Startup regression test
npm run test:parity   # Product customization & parity test

# Operational scripts
npm run doctor        # Pre-flight environment diagnostics
npm run backup        # Export PostgreSQL tables, media, and private resumes
npm run reset-password # CLI tool to securely rotate admin credentials

# SQLite import: inspect first, then migrate after reviewing the plan.
npm run migrate:sqlite:plan
npm run migrate:sqlite
```

The migration creates checksum-verified backups of the SQLite source, current PostgreSQL data, `storage/media`, and `storage/private` before committing data changes. It merges source records in a transaction, preserving PostgreSQL-only records and remapping colliding audit IDs. Keep and secure the backups, leave the source SQLite database unchanged, and verify migrated counts/content before retiring it. See the project README for the migration procedure and conflict behavior.

---

## 4. Production Deployment Requirements

### 4.1 Container & Cloud Run
When running in Docker or Cloud Run:
- Configure the PostgreSQL URLs in the deployment environment; Compose reads `.env` and passes the database configuration to the app.
- Mount persistent storage at `/app/storage` for uploaded public media and private resumes. PostgreSQL is managed separately from this filesystem volume.

### 4.2 Security Best Practices
- The server sets comprehensive security headers automatically:
  - `Content-Security-Policy`: Disallows untrusted script execution.
  - `X-Content-Type-Options: nosniff`: Prevents MIME type confusion.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy`: Restricts camera, microphone, geolocation, and payment APIs.
  - `Strict-Transport-Security` (`HSTS`) enabled in production mode.
  - Session cookies configured with `HttpOnly; SameSite=Lax` and `Secure` in production.

---

## 5. CMS Editorial Workflows

### 5.1 Product Management
1. Navigate to `/admin` and log in with administrator or editor credentials.
2. Select **Products** in the sidebar.
3. Click **New Product** or select an existing product.
4. Customize hero section:
   - Enter **Title**, **Slug**, **Summary**, and detailed **Body** text.
   - Choose **Hero Image** from Media Library or upload directly.
   - Set **Image Position** (`Right`, `Left`, `Full Width`, `Top`).
   - Define **CTA Button Text** and **CTA Target Link** (e.g., `/contact`).
5. Manage **Gallery & Screenshots**:
   - Upload multiple screenshots or select existing assets.
   - Add accessible captions and alternative text.
   - Drag to reorder gallery images.
6. Structured **Features & Specifications**:
   - Add feature cards with icons (e.g. `shield-check`, `brain-circuit`, `layers-3`).
   - Add technical specifications grouped by category (e.g. `Deployment`, `Compliance`).
7. **FAQs & SEO**:
   - Add frequently asked questions and answers.
   - Configure custom meta title, description, and social share card.
8. **Draft vs Publish**:
   - Save as **Draft** to preview privately.
   - Click **Publish** to make visible immediately on `/products` and `/products/:slug`.

### 5.2 Global Website & Parity Configuration
1. In `/admin`, open **Settings**.
2. Configure **Brand Name**, **Tagline**, and **Accent Color**.
3. Choose interactive cursor design:
   - `Fine Gold Ring` (Default recommended)
   - `Golden Orbit`
   - `Micro Dot`
   - `Clear Glass Outline`
4. Set section copy for homepage parity:
   - Services eyebrow, title, and description.
   - Industries eyebrow, title, and description.
   - Approach principles eyebrow, title, and description.
   - Primary CTA eyebrow, title, button text, and link.
5. Click **Save Settings**. Changes propagate instantaneously across all public routes.
