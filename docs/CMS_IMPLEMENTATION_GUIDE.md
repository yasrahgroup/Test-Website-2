# AZAROTH CMS — Implementation, Deployment & Operational Guide

## 1. System Architecture & Prerequisites

AZAROTH is built as a zero-dependency, high-performance Node.js application leveraging Node 22 LTS native capabilities:
- **Server Engine**: Native `node:http` with streaming, granular routing, and strict security headers.
- **Data Persistence**: Embedded `node:sqlite` in WAL mode with atomic transactions and in-memory fallback.
- **Crypto & Security**: Native `node:crypto` (`scryptSync` password hashing, constant-time `timingSafeEqual`, SHA-256 tokens).
- **Filesystem & Storage**: Native `node:fs` with strict octal permissions (`0o600` for files, `0o700` for directories).
- **Frontend Architecture**: Client-side reactive SPA framework with dynamic SSR shell pre-rendering for SEO and social crawlers.

---

## 2. Environment Variables & Setup

Configuration is controlled via environment variables or a local `.env` file (see `.env.example`):

```bash
# Server & Port
PORT=3000                     # HTTP listener port (default: 3000)
PUBLIC_URL=http://localhost:3000 # Canonical base URL for SEO and sitemaps
NODE_ENV=production           # 'development' or 'production'

# Storage & Persistence
STORAGE_DIR=storage           # Root storage directory (contains media/, private/, website.sqlite)
DB_PATH=storage/website.sqlite # Explicit SQLite database file path

# Initial Admin Bootstrap
INITIAL_ADMIN_EMAIL=admin@azaroth.tech
INITIAL_ADMIN_PASSWORD=your-super-strong-password

# Transactional Email (Optional)
RESEND_API_KEY=re_...
NOTIFY_FROM=noreply@azaroth.tech
NOTIFY_TO=team@azaroth.tech
```

---

## 3. Local Development & Operational Commands

```bash
# Install dependencies (zero production npm dependencies required)
npm install

# Start local dev server with file watching
npm run dev

# Run comprehensive verification suite (syntax, integration, frontend, startup, parity)
npm run verify

# Individual test runners
npm test              # Full production integration suite
npm run test:frontend # Frontend DOM and smoke test
npm run test:startup  # Startup regression test
npm run test:parity   # Product customization & parity test

# Operational scripts
npm run doctor        # Pre-flight environment diagnostics
npm run backup        # Archive database, media, and private resumes
npm run reset-password # CLI tool to securely rotate admin credentials
```

---

## 4. Production Deployment Requirements

### 4.1 Container & Cloud Run
When running in Docker or Cloud Run:
- Cloud Run automatically injects `PORT=8080`. The server detects this and binds port 3000 or the assigned port cleanly.
- Mount a persistent volume at `/app/storage` (or configure `STORAGE_DIR` to a mounted Cloud Storage bucket/NFS share) to ensure uploaded assets and SQLite databases persist across container restarts.

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
