import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createTestDatabaseScope } from './test-database.mjs';

const base = path.resolve(import.meta.dirname, '..');
const testDatabase = await createTestDatabaseScope();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'azaroth-parity-test-'));
const port = 36000 + Math.floor(Math.random() * 10000);
const endpoint = 'http://127.0.0.1:' + port;
const adminEmail = 'admin@azaroth-enterprise.test';
const adminPass = 'super-secure-admin-pass-phrase-999';
const variables = {
  ...process.env,
  PORT: String(port),
  PUBLIC_URL: endpoint,
  STORAGE_DIR: temp,
  DATABASE_URL: '',
  DATABASE_URL_UNPOOLED: '',
  TEST_DATABASE_URL: testDatabase.connectionString,
  INITIAL_ADMIN_EMAIL: adminEmail,
  INITIAL_ADMIN_PASSWORD: adminPass,
  NODE_ENV: 'test'
};

let proc = null, cookies = '', csrf = '';
const assert = (condition, msg) => {
  if (!condition) throw Error('FAILED: ' + msg);
  console.log('✓', msg);
};

async function req(url, method = 'GET', obj, auth = true, withCsrf = true) {
  const response = await fetch(endpoint + url, {
    method,
    headers: {
      ...(obj ? { 'Content-Type': 'application/json' } : {}),
      ...(auth && cookies ? { 'Cookie': cookies } : {}),
      ...(auth && withCsrf && csrf && method !== 'GET' ? { 'X-CSRF-Token': csrf } : {})
    },
    body: obj ? JSON.stringify(obj) : undefined
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body, headers: response.headers };
}

async function boot(env = variables) {
  proc = spawn(process.execPath, ['server.js'], { cwd: base, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', x => stderr += x.toString());
  let ready = false;
  for (let i = 0; i < 70; i++) {
    try {
      const r = await req('/api/health');
      if (r.status === 200) { ready = true; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!ready) throw Error('Server did not start: ' + stderr);
}

try {
  console.log('--- STARTING PRODUCT, IMAGE & CMS PARITY TESTS ---');
  await boot();

  // 1. Authenticate as Administrator
  let r = await req('/api/admin/login', 'POST', { email: adminEmail, password: adminPass }, false);
  assert(r.status === 200 && r.body.csrf, 'Admin successfully logs in with CSRF token');
  cookies = r.headers.get('set-cookie').split(';')[0];
  csrf = r.body.csrf;

  // -------------------------------------------------------------
  // 2. IMAGE WORKFLOW TESTS
  // -------------------------------------------------------------
  // 2.1 Unauthenticated upload attempt rejected
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+y1cAAAAASUVORK5CYII=';
  r = await req('/api/admin/media', 'POST', { data: 'data:image/png;base64,' + tinyPng, alt: 'Test image' }, false);
  assert(r.status === 401, 'Unauthenticated media upload rejected with 401');

  // 2.2 Upload invalid image signature rejected
  r = await req('/api/admin/media', 'POST', { data: 'data:image/png;base64,' + Buffer.from('NOT_A_REAL_PNG_FILE').toString('base64'), alt: 'Fake png' });
  assert(r.status === 400, 'Invalid image signature rejected with 400');

  // 2.3 Upload oversized file (> 4MB) rejected
  const oversizedData = Buffer.alloc(4.5 * 1024 * 1024, 0xaa).toString('base64');
  r = await req('/api/admin/media', 'POST', { data: 'data:image/png;base64,' + oversizedData, alt: 'Oversized' });
  assert(r.status === 400, 'Oversized image file rejected with 400');

  // 2.4 Upload valid PNG image
  r = await req('/api/admin/media', 'POST', { data: 'data:image/png;base64,' + tinyPng, alt: 'Initial Alt Description' });
  assert(r.status === 200 && r.body.url && r.body.id, 'Valid PNG upload returns media URL and ID');
  const mediaId = r.body.id;
  const mediaUrl = r.body.url;

  // 2.5 In-place alt-text editing via PATCH /api/admin/media
  r = await req('/api/admin/media', 'PATCH', { id: mediaId, alt: 'Updated Accessible Alt Description' });
  assert(r.status === 200, 'Media alt-text successfully updated via PATCH');
  r = await req('/api/admin/media');
  const mediaItem = r.body.find(m => m.id === mediaId);
  assert(mediaItem && mediaItem.alt === 'Updated Accessible Alt Description', 'Updated alt-text persisted in database');

  // 2.6 Upload second image for product gallery
  const secondPng = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QzwAEjDAGACAvBfkc90zQAAAAAElFTkSuQmCC';
  r = await req('/api/admin/media', 'POST', { data: 'data:image/png;base64,' + secondPng, alt: 'Screenshot 2' });
  assert(r.status === 200, 'Second gallery screenshot uploaded');
  const galleryUrl2 = r.body.url;

  // -------------------------------------------------------------
  // 3. PRODUCT WORKFLOW TESTS
  // -------------------------------------------------------------
  const productSlug = 'cloud-sentinel-platform';

  // 3.1 Create product as DRAFT with full customization
  const productDraftData = {
    type: 'products',
    slug: productSlug,
    title: 'Cloud Sentinel Platform',
    summary: 'Autonomous cloud security posture management and active threat response.',
    body: 'Cloud Sentinel delivers continuous visibility across multi-cloud environments, analyzing telemetry in real-time and automating remediation workflows before threats escalate.\n\nDesigned for modern infrastructure teams, it integrates seamlessly with Kubernetes, Terraform, and leading CI/CD pipelines.',
    category: 'Enterprise Security',
    technology: 'Node.js, PostgreSQL, eBPF, OpenTelemetry',
    status: 'draft',
    image: mediaUrl,
    image_position: 'right',
    hero_cta_label: 'Request Platform Demo',
    hero_cta_link: '/contact',
    secondary_cta_label: 'Read Technical Whitepaper',
    secondary_cta_link: '/contact',
    gallery: JSON.stringify([
      { url: mediaUrl, caption: 'Dashboard Overview', alt: 'Security overview metrics' },
      { url: galleryUrl2, caption: 'Kubernetes Cluster Telemetry', alt: 'Live pod security audit' }
    ]),
    features: JSON.stringify([
      { icon: 'shield-check', title: 'Zero-Trust Telemetry', description: 'Kernel-level observation via eBPF probes without performance overhead.' },
      { icon: 'brain-circuit', title: 'Automated Remediation', description: 'Policy-based instant containment of misconfigured cloud assets.' },
      { icon: 'layers-3', title: 'Unified Multi-Cloud Map', description: 'Interactive graph visualization across AWS, GCP, and Azure.' }
    ]),
    specifications: JSON.stringify([
      { group: 'Deployment', label: 'Cloud Environments', value: 'AWS, Google Cloud, Azure, On-Premises' },
      { group: 'Deployment', label: 'Container Runtime', value: 'Kubernetes 1.25+, Docker, containerd' },
      { group: 'Compliance', label: 'Certifications', value: 'SOC 2 Type II, ISO 27001, HIPAA compliant' }
    ]),
    faqs: JSON.stringify([
      { question: 'How is Cloud Sentinel deployed?', answer: 'Deploy via our Helm chart or Terraform module in under 15 minutes.' },
      { question: 'Does it require root privileges?', answer: 'The eBPF sensor requires standard BPF capabilities without full root access.' }
    ]),
    seo_title: 'Cloud Sentinel — Autonomous Cloud Security & Threat Response',
    seo_description: 'Continuous multi-cloud security visibility and autonomous remediation for enterprise infrastructure.'
  };

  r = await req('/api/admin/entries', 'POST', productDraftData);
  assert(r.status === 200, 'Product saved as draft');

  // 3.2 Confirm draft product is NOT publicly accessible
  r = await req(`/api/entries?type=products&slug=${productSlug}`);
  assert(r.status === 200 && r.body === null, 'Draft product is hidden from public API');
  r = await req(`/products/${productSlug}`);
  assert(r.status === 404, 'Draft product returns HTTP 404 on public route');

  // 3.3 Publish product
  const productPublishedData = {
    ...productDraftData,
    status: 'published'
  };
  r = await req('/api/admin/entries', 'POST', productPublishedData);
  assert(r.status === 200, 'Product published');

  // 3.4 Verify public API returns published product with all structured attributes
  r = await req(`/api/entries?type=products&slug=${productSlug}`);
  assert(r.status === 200 && r.body.slug === productSlug, 'Published product returned by API');
  assert(r.body.title === 'Cloud Sentinel Platform', 'Product title matches');
  assert(r.body.hero_cta_label === 'Request Platform Demo', 'Hero CTA label persisted');
  assert(r.body.image_position === 'right', 'Image position persisted');
  const pubFeatures = JSON.parse(r.body.features);
  assert(pubFeatures.length === 3 && pubFeatures[0].title === 'Zero-Trust Telemetry', 'Structured features persisted and returned');
  const pubSpecs = JSON.parse(r.body.specifications);
  assert(pubSpecs.length === 3 && pubSpecs[0].label === 'Cloud Environments', 'Specifications persisted and returned');
  const pubFaqs = JSON.parse(r.body.faqs);
  assert(pubFaqs.length === 2 && pubFaqs[0].question.includes('Cloud Sentinel deployed'), 'Product FAQs persisted and returned');
  const pubGallery = JSON.parse(r.body.gallery);
  assert(pubGallery.length === 2 && pubGallery[1].caption === 'Kubernetes Cluster Telemetry', 'Gallery items and captions persisted');

  // 3.5 Verify public route returns HTTP 200 with SSR metadata and rendered content
  r = await req(`/products/${productSlug}`);
  assert(r.status === 200, 'Public product page returns HTTP 200');
  assert(r.body.includes('Cloud Sentinel — Autonomous Cloud Security'), 'Product SEO title present in HTML');
  assert(r.body.includes('Continuous multi-cloud security visibility'), 'Product meta description present in HTML');
  assert(r.body.includes('Zero-Trust Telemetry'), 'Product feature rendered in page HTML shell');

  // 3.6 Edit product (reorder gallery, update title) and republish
  const updatedGallery = [
    pubGallery[1], // Reordered
    pubGallery[0]
  ];
  const productUpdatedData = {
    ...productPublishedData,
    title: 'Cloud Sentinel Platform v2',
    gallery: JSON.stringify(updatedGallery)
  };
  r = await req('/api/admin/entries', 'POST', productUpdatedData);
  assert(r.status === 200, 'Product successfully edited and republished');

  r = await req(`/api/entries?type=products&slug=${productSlug}`);
  assert(r.body.title === 'Cloud Sentinel Platform v2', 'Updated title returned');
  const reorderedGallery = JSON.parse(r.body.gallery);
  assert(reorderedGallery[0].caption === 'Kubernetes Cluster Telemetry', 'Gallery order updated and verified');

  // -------------------------------------------------------------
  // 4. PUBLIC SITE - CMS PARITY TESTS
  // -------------------------------------------------------------
  // 4.1 Update homepage section titles and verify public parity
  const paritySettings = {
    homeServicesEyebrow: 'CORE SOLUTIONS',
    homeServicesTitle: 'Engineered for Digital *Excellence*',
    homeServicesDescription: 'Custom architecture tailored to mission-critical operations.',
    homeIndustriesEyebrow: 'TARGET VERTICALS',
    homeIndustriesTitle: 'Cross-Industry *Domain Knowledge*',
    homeIndustriesDescription: 'Proven software solutions across regulated sectors.',
    homeApproachEyebrow: 'OUR PRINCIPLES',
    homeApproachTitle: 'Quality, Velocity and *Accountability*',
    homeApproachDescription: 'Transparent development cycles focused on tangible ROI.',
    ctaEyebrow: 'READY TO ACCELERATE?',
    ctaTitle: 'Partner with our engineering team *today.*',
    ctaButtonText: 'Schedule Technical Consultation',
    ctaButtonLink: '/contact'
  };

  r = await req('/api/admin/content', 'PUT', paritySettings);
  assert(r.status === 200, 'CMS updates homepage parity settings and custom CTA');

  r = await req('/api/content');
  assert(r.body.homeServicesTitle === 'Engineered for Digital *Excellence*', 'Homepage services title setting persisted');
  assert(r.body.ctaButtonText === 'Schedule Technical Consultation', 'CTA button text setting persisted');

  // 4.2 Verify all standard public routes return HTTP 200
  const standardRoutes = [
    '/',
    '/about',
    '/services',
    '/industries',
    '/products',
    '/projects',
    '/blog',
    '/careers',
    '/contact',
    '/privacy',
    '/terms'
  ];
  for (const route of standardRoutes) {
    const res = await req(route);
    assert(res.status === 200, `Public route ${route} responds with HTTP 200`);
  }

  // -------------------------------------------------------------
  // 5. DATA PERSISTENCE ACROSS RESTART
  // -------------------------------------------------------------
  proc.kill();
  await new Promise(res => proc.once('exit', res));
  proc = null;

  // Restart server using the same SQLite storage
  await boot({ ...variables, INITIAL_ADMIN_EMAIL: '', INITIAL_ADMIN_PASSWORD: '' });

  r = await req(`/api/entries?type=products&slug=${productSlug}`);
  assert(r.status === 200 && r.body.title === 'Cloud Sentinel Platform v2', 'Product and gallery data persist across full server restart');

  r = await req('/api/content');
  assert(r.body.homeServicesTitle === 'Engineered for Digital *Excellence*', 'Parity settings persist across full server restart');

  console.log('\n======================================================');
  console.log('ALL PRODUCT, IMAGE WORKFLOW & CMS PARITY TESTS PASSED!');
  console.log('======================================================\n');
} catch (err) {
  console.error('TEST SUITE ERROR:', err);
  process.exitCode = 1;
} finally {
  if (proc) {
    proc.kill();
    await new Promise(resolve => {
      proc.once('exit', resolve);
      setTimeout(resolve, 1000).unref();
    });
  }
  fs.rmSync(temp, { recursive: true, force: true });
  await testDatabase.close();
}
