# AZAROTH CMS & Public Website Implementation Plan

## Overview & Execution Strategy

This implementation plan details the priority phases and technical tasks required to upgrade AZAROTH CMS and the public website into an enterprise-grade corporate platform.

---

## Phase P0: Core CMS Fixes, Database Extensions, & Product Customization

### 1. Database Schema Extensions (`server.js`)
- Safely check and extend the `entries` table using non-destructive `ALTER TABLE` queries:
  - `features TEXT NOT NULL DEFAULT '[]'` (JSON array: `[{ title, description, icon }]`)
  - `specifications TEXT NOT NULL DEFAULT '[]'` (JSON array: `[{ group, label, value }]`)
  - `faqs TEXT NOT NULL DEFAULT '[]'` (JSON array: `[{ question, answer }]`)
  - `sections_config TEXT NOT NULL DEFAULT '[]'` (JSON array of visible sections and order)
  - `hero_cta_label TEXT NOT NULL DEFAULT ''`
  - `hero_cta_link TEXT NOT NULL DEFAULT ''`
  - `secondary_cta_label TEXT NOT NULL DEFAULT ''`
  - `secondary_cta_link TEXT NOT NULL DEFAULT ''`
  - `image_position TEXT NOT NULL DEFAULT 'right'` ('right', 'left', 'full', 'top')
  - `social_image TEXT NOT NULL DEFAULT ''`
  - `canonical_url TEXT NOT NULL DEFAULT ''`
  - `related_slugs TEXT NOT NULL DEFAULT '[]'`
- Extend `settings` defaults with missing parity keys:
  - `homeServicesEyebrow`, `homeServicesTitle`, `homeServicesDescription`
  - `homeApproachEyebrow`, `homeApproachTitle`, `homeApproachDescription`
  - `ctaEyebrow`, `ctaTitle`, `ctaButtonText`, `ctaButtonLink`
- Update `/api/entries` and `/api/admin/entries` to query and return these columns.

### 2. Full Product Customization Experience (`public/enhancements.js`)
- Redesign the entry editor when editing `type === 'products'`:
  - Basic Info: Title, slug, summary, full description, category, tags, technology stack, publication status.
  - Media & Visuals: Main product image picker, screenshot/gallery image manager with drag/reorder/remove, image position toggle ('right', 'left', 'full').
  - Features & Benefits: Visual editor to add, edit, reorder, and remove key product features.
  - Specifications: Grouped technical specs table builder (e.g. Platform, Deployment, Compliance).
  - Product FAQs: Accordion question and answer editor.
  - Call to Action: Primary and secondary button text, URL targets, and visibility.
  - Section Visibility & Ordering: Drag or move up/down controls to toggle which sections appear on the product page.
  - Live Preview Drawer: Instantly view the desktop or mobile product page rendering without saving.

### 3. Public Product Detail Rendering (`public/enhancements.js`)
- Transform `detail('products', slug)` into a high-converting, beautifully structured software product landing page:
  - Interactive hero section with badge, title, summary, action buttons, and responsive hero graphic/visual.
  - Screenshot / gallery carousel with caption and fullscreen modal view.
  - Features grid with custom icons and descriptions.
  - Specifications table with clean grouping.
  - Product FAQs interactive accordion.
  - Related products showcase.
  - Custom bottom CTA matching the product's primary action.

---

## Phase P1: Unified Image Upload & Media Library Integration

### 1. Backend Media Enhancements (`server.js`)
- Add `PATCH /api/admin/media` to allow updating alt-text on existing media records.
- Ensure POST `/api/admin/media` returns full metadata: `{ ok: true, id, filename, url, alt, size, mime, created_at }`.
- Validate file signatures (PNG, JPEG, WebP) and size limits (4MB max).
- Ensure safe file naming and storage permissions.

### 2. Frontend Universal Media Components (`public/enhancements.js`)
- Implement `renderImageField({ label, value, alt, onChange, helpText })`:
  - Live image thumbnail preview.
  - "Upload Image" button (instant base64 encoding, progress indicator, and upload to `/api/admin/media`).
  - "Choose from Media Library" button (opens reusable Media Picker modal).
  - "Remove Image" button.
  - Alt text input for accessibility and SEO.
- Implement `renderGalleryManager({ items, onChange })`:
  - Thumbnail strip of all gallery assets.
  - Add image (upload new or pick from library).
  - Move up (↑) / Move down (↓) controls.
  - Remove (×) button.
  - Per-image caption and alt text.
- Integrate into:
  - Brand & Theme: Logo picker.
  - Visual Page Builder: Hero blocks, Image-Text blocks, Card blocks.
  - Content Library: Main entry image, gallery manager, blog cover, team photo.

---

## Phase P2: Public Site CMS Parity & Usability Enhancements

### 1. Parity & Hardcoded Copy Fixes
- Connect all homepage headings to `settings` with fallback to starter copy.
- Connect global CTA section to `settings.ctaEyebrow`, `settings.ctaTitle`, `settings.ctaButtonText`, `settings.ctaButtonLink`.
- Ensure SSR HTML generator (`server.js:webHtml`) reflects updated settings and product SEO metadata.

### 2. CMS Usability & Feedback
- Non-blocking toast notifications for saves, publishes, deletes, and errors.
- Unsaved change warnings before navigating away from active forms.
- Search and status filter (`All`, `Published`, `Draft`) in Content Library.
- Accessible ARIA labels and keyboard focus styling.

---

## Phase P3: Comprehensive Automated Testing & Verification

1. Enhance `tests/integration.mjs` and create `tests/cms-parity-products.mjs`:
   - Product creation, draft saving, gallery upload, reordering, section configuring, publishing, public verification, unpublishing.
   - Media upload validation, invalid file rejection, oversized file rejection, alt-text updating, library selection.
   - Parity checks for all public routes and editable settings.
2. Run complete test verification suite (`npm run verify`).
3. Compile test report in `docs/TEST_REPORT.md`.
