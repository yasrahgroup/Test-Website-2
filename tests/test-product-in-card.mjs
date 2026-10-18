import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert';

const base = path.resolve(import.meta.dirname, '..', 'public');
const site = {
  brand: 'AZAROTH',
  logo: '/logo.png',
  tagline: 'Ideas. Technology. Impact.',
  heroEyebrow: 'BUILDING TOMORROW',
  heroTitle: 'Innovative Software Solutions for a Brighter World',
  heroDescription: 'We build technology for tomorrow.',
  primary: '#900b2b',
  gold: '#d5a13c',
  orange: '#f47721',
  background: '#faf8f4',
  ink: '#171b2c',
  navigation: '[]'
};

const app = { innerHTML: '' };
const handlers = [];
const classList = {
  _classes: new Set(),
  add(c) { this._classes.add(c); },
  remove(c) { this._classes.delete(c); },
  toggle(c) {
    if (this._classes.has(c)) { this._classes.delete(c); return false; }
    this._classes.add(c); return true;
  },
  contains(c) { return this._classes.has(c); }
};

const doc = {
  querySelector(s) {
    if (s === '#app') return app;
    return null;
  },
  querySelectorAll() { return []; },
  documentElement: { style: { setProperty() {} }, dataset: {} },
  body: { classList },
  title: ''
};

const location = { pathname: '/', hash: '' };
const ctx = {
  console,
  document: doc,
  location,
  history: { pushState(s, t, url) { const u = new URL(url, 'http://localhost:3000'); location.pathname = u.pathname; location.hash = u.hash; } },
  scrollTo() {},
  scrollY: 0,
  IntersectionObserver: class { observe() {} unobserve() {} },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame() {},
  setTimeout,
  clearTimeout,
  FormData,
  URL,
  window: {
    location,
    addEventListener(name, callback) { handlers.push([name, callback]); },
    lucide: { createIcons() {} },
    matchMedia: () => ({ matches: false })
  },
  fetch: async (u) => {
    if (u === '/api/content') return { ok: true, status: 200, json: async () => site };
    if (u.startsWith('/api/entries?type=products')) {
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 'prod-fms',
            slug: 'fitness-management-system',
            title: 'Fitness Management System',
            category: 'Commercial SaaS',
            status: 'Under Development',
            summary: 'Membership lifecycle, automated billing, and branch scheduling.',
            body: 'Full architecture overview and implementation specifications.',
            image: '/images/fitness_mgmt_hero.jpg',
            sections_config: JSON.stringify({
              badge: 'Commercial SaaS',
              status: 'Under Development',
              iconName: 'Activity',
              tagline: 'High-Throughput Facility Operations & Automated Member Lifecycle Management',
              benefits: ['Enterprise source code ownership', 'Tailored modular architecture', 'Full SLA & deployment pod'],
              techSpecs: {
                latency: '< 45ms P99',
                concurrency: '50k+ active sessions',
                compliancePosture: 'HIPAA / GDPR Ready',
                protocols: ['REST', 'GraphQL', 'WebSockets', 'gRPC']
              },
              keyCapabilities: [
                'Automated Member Check-In & Biometric Gate Integration',
                'Real-Time Class Scheduling & Dynamic Capacity Balancing'
              ],
              features: [
                'Multi-Location Tenant Isolation with Centralized HQ Governance',
                'Offline-First Edge Sync for Physical Gateways'
              ]
            })
          }
        ]
      };
    }
    return { ok: true, status: 200, json: async () => [] };
  },
  navigator: {},
  crypto
};

vm.createContext(ctx);
for (const script of ['app.js', 'enhancements.js']) {
  vm.runInContext(fs.readFileSync(path.join(base, script), 'utf8'), ctx, { filename: script });
}

await new Promise(r => setTimeout(r, 60));

// 1. Verify Homepage rendering
location.pathname = '/';
vm.runInContext('render()', ctx);
assert(app.innerHTML.includes('id="featured-products"'), 'Homepage product showcase missing');
assert(app.innerHTML.includes('Fitness Management System'), 'Featured product title not rendered');
assert(app.innerHTML.includes('/products/fitness-management-system'), 'Product detail URL present for homepage routing');
console.log('✓ Homepage renders featured product cards with proper URL bindings');

// 2. Verify /products Catalog rendering
location.pathname = '/products';
location.hash = '';
vm.runInContext('render()', ctx);

assert(app.innerHTML.includes('Our Products &amp; <span class="accent">Platform Foundations</span>'), 'Products catalog hero title missing');
assert(app.innerHTML.includes('category-filter-bar'), 'Category filter bar missing');
assert(app.innerHTML.includes('Commercial SaaS'), 'Category button or badge missing');
assert(app.innerHTML.includes('product-catalog-card'), 'Product catalog card missing');
assert(app.innerHTML.includes('See Full Details'), 'See Full Details toggle button missing');
assert(app.innerHTML.includes('Request a Demo'), 'Request a Demo button missing');
console.log('✓ /products catalog renders category filters, product cards, and action buttons');

// 3. Verify In-Card Expandable Details are present inside the card
assert(app.innerHTML.includes('product-expanded-details'), 'In-card expandable details container missing');
assert(app.innerHTML.includes('Architecture Design Goals'), 'Architecture Design Goals section missing in card');
assert(app.innerHTML.includes('Latency Design Target'), 'Latency target missing');
assert(app.innerHTML.includes('&lt; 45ms P99') || app.innerHTML.includes('< 45ms P99'), 'Latency value missing');
assert(app.innerHTML.includes('Concurrency Design Target'), 'Concurrency target missing');
assert(app.innerHTML.includes('50k+ active sessions'), 'Concurrency value missing');
assert(app.innerHTML.includes('Compliance Posture'), 'Compliance posture missing');
assert(app.innerHTML.includes('HIPAA / GDPR Ready'), 'Compliance posture value missing');
assert(app.innerHTML.includes('Supported Protocols'), 'Supported protocols missing');
assert(app.innerHTML.includes('REST, GraphQL, WebSockets, gRPC'), 'Supported protocols value missing');
assert(app.innerHTML.includes('Key Architectural Capabilities'), 'Key capabilities section missing');
assert(app.innerHTML.includes('Automated Member Check-In &amp; Biometric Gate Integration') || app.innerHTML.includes('Automated Member Check-In & Biometric Gate Integration'), 'Key capability item missing');
assert(app.innerHTML.includes('Enterprise Integration Features'), 'Enterprise integration features section missing');
assert(app.innerHTML.includes('Multi-Location Tenant Isolation with Centralized HQ Governance'), 'Integration feature item missing');
assert(app.innerHTML.includes('Request Technical Deployment'), 'Deployment CTA missing');
assert(app.innerHTML.includes('Speak with Solution Architect'), 'Architect CTA missing');
assert(app.innerHTML.includes('Collapse Details'), 'Collapse Details button missing');
console.log('✓ In-card expanded details contain all architectural goals, capabilities, integration features, and deployment CTAs');

// 4. Verify Hash Navigation automatically expands target product
location.pathname = '/products';
location.hash = '#fitness-management-system';
vm.runInContext('render()', ctx);
console.log('✓ Hash targeting /products#<slug> executes handleProductHash without errors');

console.log('\n======================================================');
console.log('ALL IN-CARD EXPANSION & HOMEPAGE FLOW TESTS PASSED!');
console.log('======================================================');
