# AZAROTH Public Website – CMS Parity Matrix

This document maps every public website route, section, and interactive component to its corresponding CMS editor, API endpoint, data model, frontend renderer, and automated verification test.

---

## Complete Parity Matrix

| Public Route | Public Section / Component | CMS Editor Tab | API Endpoint & Method | Data Model / Database Key | Renderer Function | Automated Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **All Routes** | Header / Navigation Bar | Navigation Manager | `PUT /api/admin/content` | `settings.navigation` (JSON) | `header()` | `tests/integration.mjs` (test 29, 39) |
| **All Routes** | Brand Logo & Title/Subtitle | Brand & Theme | `PUT /api/admin/content` | `settings.logo`, `settings.brand`, `settings.brandTitle`, `settings.brandSubtitle` | `header()`, `footer()` | `tests/integration.mjs` (test 29) |
| **All Routes** | Luxury Theme Colors | Brand & Theme | `PUT /api/admin/content` | `settings.primary`, `settings.gold`, `settings.orange`, `settings.background`, `settings.ink` | `theme()`, CSS variables | `tests/integration.mjs` (test 31) |
| **All Routes** | Custom Cursor Design | Brand & Theme | `PUT /api/admin/content` | `settings.cursorStyle`, `settings.cursorSize`, `settings.cursorLag`, `settings.cursorEnabled` | `initCursor()`, `cursorAppearance()` | `tests/integration.mjs` (test 32-38) |
| **All Routes** | Footer Section | Brand & Theme / Navigation | `PUT /api/admin/content` | `settings.footerBrandTitle`, `settings.footerDescription`, `settings.contactEmail`, `settings.contactPhone`, `settings.socials` | `footer()` | `tests/frontend-smoke.mjs` |
| `/` (Homepage) | Hero Banner | Brand & Theme / Page Builder | `PUT /api/admin/content` or `PUT /api/admin/layout` | `settings.heroEyebrow`, `settings.heroTitle`, `settings.heroDescription`, `settings.tagline`, `settings.stats` | `hero()` or `renderBlocks()` | `tests/integration.mjs` (test 20) |
| `/` (Homepage) | About Preview Section | Brand & Theme / Page Builder | `PUT /api/admin/content` | `settings.aboutTitle`, `settings.aboutDescription`, `settings.mission` | `aboutPreview()` | `tests/frontend-smoke.mjs` |
| `/` (Homepage) | Featured Services Section | Feature Cards / Content Library | `PUT /api/admin/content` or `POST /api/admin/entries?type=services` | `settings.services` or `entries` table (`type='services'`) | `serviceCards()` | `tests/integration.mjs` |
| `/` (Homepage) | Featured Products Showcase | Brand & Theme / Content Library | `PUT /api/admin/content` & `POST /api/admin/entries?type=products` | `settings.homeProductsEnabled`, `settings.homeProductsTitle`, `settings.homeProductsDescription`, `entries` (`type='products'`) | `featuredProducts()` | `tests/integration.mjs` (test 47-50), `tests/frontend-smoke.mjs` |
| `/` (Homepage) | Industries Preview Section | Feature Cards / Content Library | `PUT /api/admin/content` or `POST /api/admin/entries?type=industries` | `settings.industries` or `entries` (`type='industries'`) | `industryCards()` | `tests/frontend-smoke.mjs` |
| `/` (Homepage) | Our Approach / Values | Brand & Theme / Page Builder | `PUT /api/admin/content` | `settings.homeApproachTitle`, `settings.homeApproachDescription` | `values()` | `tests/frontend-smoke.mjs` |
| `/` (Homepage) | Technology Stack Strip | Content Library | `POST /api/admin/entries?type=technologies` | `entries` (`type='technologies'`) | `technologyShowcase()` | `tests/cms-parity-products.mjs` |
| `/` (Homepage) | Client Testimonials Strip | Content Library | `POST /api/admin/entries?type=testimonials` | `entries` (`type='testimonials'`) | `visualTestimonials()` | `tests/cms-parity-products.mjs` |
| `/` (Homepage) | Call to Action (CTA) | Brand & Theme / Page Builder | `PUT /api/admin/content` | `settings.ctaEyebrow`, `settings.ctaTitle`, `settings.ctaButtonText`, `settings.ctaButtonLink` | `cta()` | `tests/frontend-smoke.mjs` |
| `/about` | About Top Banner & Story | Brand & Theme / Page Builder | `PUT /api/admin/content` or `PUT /api/admin/layout` | `settings.aboutTitle`, `settings.aboutDescription`, `settings.mission` | `about()` | `tests/frontend-smoke.mjs` |
| `/about` | Team Member Profiles | Content Library | `POST /api/admin/entries?type=team` | `entries` (`type='team'`) | `teamShowcase()` | `tests/cms-parity-products.mjs` |
| `/services` | Services Catalog Listing | Content Library | `POST /api/admin/entries?type=services` | `entries` (`type='services'`) | `services()`, `dynamicListing()` | `tests/frontend-smoke.mjs` |
| `/services/:slug` | Service Detail Page | Content Library | `POST /api/admin/entries?type=services` | `entries` record (`type='services'`) | `detail('services', slug)` | `tests/integration.mjs` |
| `/industries` | Industries Catalog Listing | Content Library | `POST /api/admin/entries?type=industries` | `entries` (`type='industries'`) | `industries()`, `dynamicListing()` | `tests/frontend-smoke.mjs` |
| `/industries/:slug`| Industry Detail Page | Content Library | `POST /api/admin/entries?type=industries` | `entries` record (`type='industries'`) | `detail('industries', slug)` | `tests/integration.mjs` |
| `/products` | Products Showcase Listing | Content Library | `POST /api/admin/entries?type=products` | `entries` (`type='products'`) | `products()`, `dynamicListing()` | `tests/integration.mjs` (test 48) |
| `/products/:slug` | Custom Product Landing Page | Content Library (Product Editor) | `POST /api/admin/entries?type=products` | `entries` record (`features`, `specifications`, `faqs`, `gallery`, `sections_config`, `hero_cta_label`, etc.) | `detail('products', slug)` | `tests/cms-parity-products.mjs` |
| `/projects` | Case Studies & Portfolio | Content Library | `POST /api/admin/entries?type=projects` | `entries` (`type='projects'`) | `projects()`, `dynamicListing()` | `tests/integration.mjs` (test 41-42) |
| `/projects/:slug` | Case Study Detail Page | Content Library | `POST /api/admin/entries?type=projects` | `entries` record (`type='projects'`) | `detail('projects', slug)` | `tests/integration.mjs` (test 42) |
| `/blog` | Insights & Articles Listing | Content Library | `POST /api/admin/entries?type=blog` | `entries` (`type='blog'`) | `blog()`, `dynamicListing()` | `tests/integration.mjs` (test 43) |
| `/blog/:slug` | Article Detail Page | Content Library | `POST /api/admin/entries?type=blog` | `entries` record (`type='blog'`) | `detail('blog', slug)` | `tests/integration.mjs` (test 44) |
| `/careers` | Career Opportunities Listing | Content Library | `POST /api/admin/entries?type=careers` | `entries` (`type='careers'`) | `careers()`, `dynamicListing()` | `tests/integration.mjs` (test 52) |
| `/careers/:slug` | Career Opening & Job Application | Content Library | `POST /api/admin/entries?type=careers` | `entries` record + `applications` table | `detail('careers', slug)`, `jobForm()` | `tests/integration.mjs` (test 70) |
| `/contact` | Contact Information & Form | Brand & Theme | `PUT /api/admin/content` | `settings.contactEmail`, `settings.contactPhone`, `settings.contactLocation` + `inquiries` table | `contact()` | `tests/integration.mjs` (test 65-66) |
| `/privacy` | Privacy Policy Notice | Brand & Theme | `PUT /api/admin/content` | `settings.privacyText` | `privacy()` | `tests/frontend-smoke.mjs` |
| `/terms` | Terms of Use Notice | Brand & Theme | `PUT /api/admin/content` | `settings.termsText` | `terms()` | `tests/frontend-smoke.mjs` |
| Custom Pages | Visual Block Layouts | Visual Page Builder | `PUT /api/admin/layout` | `layouts` table (`slug`, `blocks`, `status`, `seo_title`, `seo_description`) | `renderBlocks()` | `tests/integration.mjs` (test 53-59) |
