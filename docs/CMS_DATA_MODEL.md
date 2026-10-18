# AZAROTH CMS — Data Model & Schema Specification

## 1. Overview

The AZAROTH platform uses a high-performance, embedded relational data store (SQLite via Node.js 22 `node:sqlite` or in-memory fallback) with write-ahead logging (WAL), foreign key constraints, and automatic migration synchronization.

---

## 2. Relational Schema & Tables

### 2.1 Table: `settings`
Stores key-value global site configurations, branding, contact details, navigation structure, and homepage section copy.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `key` | `TEXT` | `PRIMARY KEY` | Setting identifier (e.g., `brand`, `heroTitle`, `homeServicesTitle`) |
| `value` | `TEXT` | `NOT NULL` | String scalar or serialized JSON array/object |

### 2.2 Table: `users`
Manages administrative and editorial access with role-based access control (RBAC).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique user ID |
| `email` | `TEXT` | `UNIQUE NOT NULL` | Verified login email |
| `password_hash` | `TEXT` | `NOT NULL` | Scrypt hash formatted as `salt:derivedKey` |
| `role` | `TEXT` | `NOT NULL CHECK(role IN ('admin','editor','viewer'))` | Role tier |
| `active` | `INTEGER` | `NOT NULL DEFAULT 1` | Status flag (`1` = active, `0` = suspended) |
| `created_at` | `TEXT` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |

### 2.3 Table: `sessions`
Secure server-side sessions bound to encrypted tokens and CSRF secrets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `token_hash` | `TEXT` | `PRIMARY KEY` | SHA-256 hash of the 64-char hex session cookie |
| `user_id` | `INTEGER` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Associated user ID |
| `csrf` | `TEXT` | `NOT NULL` | Random 64-char hex CSRF token |
| `expires` | `INTEGER` | `NOT NULL` | Unix epoch millisecond expiry |

### 2.4 Table: `entries`
The unified content model for all CMS collections (`services`, `industries`, `products`, `careers`, `blog`, `projects`, `pages`, `testimonials`, `team`, `technologies`).

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Auto-incrementing identifier |
| `type` | `TEXT` | `NOT NULL` | Collection discriminator (`products`, `blog`, etc.) |
| `slug` | `TEXT` | `NOT NULL` | URL-safe slug unique per collection |
| `title` | `TEXT` | `NOT NULL` | Main heading or entity name |
| `summary` | `TEXT` | `''` | Short excerpt or subtitle |
| `body` | `TEXT` | `''` | Long-form markdown or formatted prose |
| `image` | `TEXT` | `''` | Primary cover or hero image URL |
| `status` | `TEXT` | `'draft'` | Publication state (`'draft'` or `'published'`) |
| `seo_title` | `TEXT` | `''` | Custom page meta title override |
| `seo_description` | `TEXT` | `''` | Custom page meta description override |
| `category` | `TEXT` | `''` | Industry or taxonomic category |
| `location` | `TEXT` | `''` | Office location or remote status (careers) |
| `job_type` | `TEXT` | `''` | Full-time, contract, internship (careers) |
| `technology` | `TEXT` | `''` | Comma-delimited or tagged technologies |
| `gallery` | `TEXT` | `'[]'` | JSON array of image URLs or `{url, caption, alt}` |
| `features` | `TEXT` | `'[]'` | JSON array of `{icon, title, description}` |
| `specifications` | `TEXT` | `'[]'` | JSON array of `{group, label, value}` |
| `faqs` | `TEXT` | `'[]'` | JSON array of `{question, answer}` |
| `sections_config` | `TEXT` | `'[]'` | JSON array of section visibility & order flags |
| `hero_cta_label` | `TEXT` | `''` | Primary CTA button text |
| `hero_cta_link` | `TEXT` | `''` | Primary CTA target URL |
| `secondary_cta_label` | `TEXT` | `''` | Secondary CTA button text |
| `secondary_cta_link` | `TEXT` | `''` | Secondary CTA target URL |
| `image_position` | `TEXT` | `'right'` | Alignment: `'right'`, `'left'`, `'full'`, `'top'` |
| `social_image` | `TEXT` | `''` | Custom OpenGraph image URL |
| `canonical_url` | `TEXT` | `''` | Explicit canonical URL override |
| `related_slugs` | `TEXT` | `'[]'` | JSON array of related entry slugs |
| `created_at` | `TEXT` | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TEXT` | `CURRENT_TIMESTAMP` | Last updated timestamp |

*Index*: `CREATE INDEX IF NOT EXISTS idx_entries ON entries(type,status,updated_at);`  
*Unique Constraint*: `UNIQUE(type, slug)`

### 2.5 Table: `layouts`
Stores block-based page layouts for pages like `/about`, `/contact`, or custom landing pages.

| Column | Type | Default | Description |
|---|---|---|---|
| `slug` | `TEXT` | `PRIMARY KEY` | Page route identifier |
| `title` | `TEXT` | `NOT NULL` | Page title |
| `blocks` | `TEXT` | `NOT NULL` | Serialized JSON array of validated layout blocks |
| `status` | `TEXT` | `'draft'` | Publication state |
| `seo_title` | `TEXT` | `''` | SEO title override |
| `seo_description`| `TEXT` | `''` | SEO description override |
| `updated_at` | `TEXT` | `CURRENT_TIMESTAMP` | Update timestamp |

### 2.6 Table: `media`
Stores uploaded binary assets metadata and filesystem references.

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique media ID |
| `filename` | `TEXT` | `NOT NULL` | Hex-randomized disk filename (`<hash>.<ext>`) |
| `mime` | `TEXT` | `NOT NULL` | Validated MIME type (`image/png`, `image/jpeg`, etc.) |
| `alt` | `TEXT` | `NOT NULL DEFAULT ''`| Accessible alt description |
| `size` | `INTEGER` | `NOT NULL` | File byte length |
| `created_at` | `TEXT` | `CURRENT_TIMESTAMP` | Upload timestamp |

### 2.7 Table: `enquiries`
Captures inbound business inquiries submitted via the public contact form.

| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique ID |
| `name`, `email`, `company`, `message` | `TEXT NOT NULL` | User input fields |
| `service` | `TEXT NOT NULL DEFAULT ''` | Selected service interest |
| `status` | `TEXT NOT NULL DEFAULT 'new'` | Pipeline stage (`new`, `contacted`, `closed`) |
| `notes` | `TEXT NOT NULL DEFAULT ''` | Internal staff notes |
| `created_at` | `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP` | Submission timestamp |

### 2.8 Table: `applications`
Captures inbound job applications and private resume uploads.

| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Application ID |
| `opening_slug`, `name`, `email`, `phone`, `note` | `TEXT NOT NULL` | Applicant details |
| `resume_filename` | `TEXT NOT NULL` | Reference to file in private storage (`storage/private/`) |
| `created_at` | `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP` | Application timestamp |

### 2.9 Table: `audit`
Immutable administrative audit trail.

| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Entry ID |
| `user_id` | `INTEGER` | Foreign key referencing `users(id)` or `NULL` |
| `action` | `TEXT NOT NULL` | Action code (`entry.saved`, `media.uploaded`, etc.) |
| `details` | `TEXT NOT NULL DEFAULT ''` | Serialized action context |
| `created_at` | `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP` | Log timestamp |
