import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import nodemailer from 'nodemailer';
import { resolveDatabaseUrl, poolOptions } from './lib/database-url.mjs';

const { Pool } = pg;

try { process.loadEnvFile(); } catch { }
const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let storage = (isServerless ? path.join(os.tmpdir(), 'storage') : (process.env.STORAGE_DIR || path.join(root, 'storage')));
const port = Number(process.env.APP_PORT || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw Error(`Invalid PORT: ${port}. Use a number from 1 to 65535.`);
}
const prod = process.env.NODE_ENV === 'production';
const siteUrl = (process.env.PUBLIC_URL || process.env.APP_URL || 'http://localhost:' + port).replace(/\/$/, '');

function ensureStorage() {
  try {
    fs.mkdirSync(storage, { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(storage, 'media'), { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(storage, 'private'), { recursive: true, mode: 0o700 });
  } catch (err) {
    if (err.code === 'EROFS' || err.code === 'EACCES') {
      console.warn(`[Storage] Read-only filesystem detected at ${storage}. Falling back to temporary directory.`);
      storage = path.join(os.tmpdir(), 'storage');
      fs.mkdirSync(storage, { recursive: true, mode: 0o700 });
      fs.mkdirSync(path.join(storage, 'media'), { recursive: true, mode: 0o700 });
      fs.mkdirSync(path.join(storage, 'private'), { recursive: true, mode: 0o700 });
    } else {
      throw Error(`Cannot create storage directory ${storage}: ${err.message}. Check STORAGE_DIR and file permissions.`);
    }
  }
}
ensureStorage();

const repoStorage = path.join(root, 'storage');
if (process.env.NODE_ENV !== 'test' && path.resolve(storage) !== path.resolve(repoStorage) && fs.existsSync(repoStorage)) {
  const seedMedia = path.join(repoStorage, 'media');
  if (fs.existsSync(seedMedia)) {
    try { fs.cpSync(seedMedia, path.join(storage, 'media'), { recursive: true }); } catch { }
  }
}

let db, pool;
try {
  const environment = process.env.NODE_ENV || 'development';
  const databaseUrl = resolveDatabaseUrl();
  pool = new Pool(poolOptions(databaseUrl));
  pool.on('error', (err) => {
    console.warn('[PostgreSQL] Idle pool connection notice:', err.message);
  });
  const probe = await pool.connect();
  probe.release();
  console.log(`[PostgreSQL] Connected to database (${environment})`);
} catch (err) {
  console.error('[PostgreSQL] Database connection failed:', err.message);
  throw Error(`Database connection failed: ${err.message}. Check DATABASE_URL or TEST_DATABASE_URL environment variables.`);
}

try {
  await pool.query(`
   CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires BIGINT NOT NULL);
   CREATE TABLE IF NOT EXISTS entries(id SERIAL PRIMARY KEY,type TEXT NOT NULL,slug TEXT NOT NULL,title TEXT NOT NULL,summary TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',image TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft',seo_title TEXT NOT NULL DEFAULT '',seo_description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT '',location TEXT NOT NULL DEFAULT '',job_type TEXT NOT NULL DEFAULT '',technology TEXT NOT NULL DEFAULT '',gallery TEXT NOT NULL DEFAULT '[]',features TEXT NOT NULL DEFAULT '[]',specifications TEXT NOT NULL DEFAULT '[]',faqs TEXT NOT NULL DEFAULT '[]',sections_config TEXT NOT NULL DEFAULT '[]',hero_cta_label TEXT NOT NULL DEFAULT '',hero_cta_link TEXT NOT NULL DEFAULT '',secondary_cta_label TEXT NOT NULL DEFAULT '',secondary_cta_link TEXT NOT NULL DEFAULT '',image_position TEXT NOT NULL DEFAULT 'right',social_image TEXT NOT NULL DEFAULT '',canonical_url TEXT NOT NULL DEFAULT '',related_slugs TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(type,slug));
   CREATE INDEX IF NOT EXISTS idx_entries ON entries(type,status,updated_at);
   CREATE TABLE IF NOT EXISTS layouts(slug TEXT PRIMARY KEY,title TEXT NOT NULL,blocks TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',seo_title TEXT NOT NULL DEFAULT '',seo_description TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS media(id SERIAL PRIMARY KEY,filename TEXT UNIQUE NOT NULL,mime TEXT NOT NULL,alt TEXT NOT NULL DEFAULT '',size INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS inquiries(id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,company TEXT NOT NULL DEFAULT '',service TEXT NOT NULL DEFAULT '',message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS applications(id SERIAL PRIMARY KEY,job_slug TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,portfolio TEXT NOT NULL DEFAULT '',message TEXT NOT NULL DEFAULT '',resume_filename TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS audit(id SERIAL PRIMARY KEY,user_id INTEGER,action TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS revisions(id SERIAL PRIMARY KEY,entity_type TEXT NOT NULL,entity_key TEXT NOT NULL,data TEXT NOT NULL,created_by TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE INDEX IF NOT EXISTS idx_revisions ON revisions(entity_type,entity_key,id DESC);
   CREATE TABLE IF NOT EXISTS settings_draft(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,updated_by TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires);
  `);
  // Compatibility upgrades for databases created by earlier releases.
  // Session expiry stores Date.now() (milliseconds), which overflows a 4-byte INTEGER.
  await pool.query('ALTER TABLE sessions ALTER COLUMN expires TYPE BIGINT');
  await pool.query("ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'contact'");
  console.log('[PostgreSQL] Schema initialized');
} catch (e) {
  console.warn('[PostgreSQL] Schema migration check:', e.message);
}

// PostgreSQL compatibility layer (mimics SQLite API)
const pgCompat = {
  prepare: (sql) => {
    const params = [];
    let paramIndex = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
    return {
      get: async (...args) => {
        const result = await pool.query(pgSql, args);
        return result.rows[0] || null;
      },
      all: async (...args) => {
        const result = await pool.query(pgSql, args);
        return result.rows;
      },
      run: async (...args) => {
        await pool.query(pgSql, args);
        return { changes: 1 };
      }
    };
  },
  exec: async (sql) => {
    await pool.query(sql);
  }
};
db = pgCompat;
const TYPES = new Set(['services', 'industries', 'products', 'careers', 'blog', 'projects', 'pages', 'testimonials', 'team', 'technologies']);
const ROLES = { viewer: 1, editor: 2, admin: 3 };
const defaults = {
  brand: 'AZAROTH TECH-HIVE', brandTitle: 'AZAROTH', brandSubtitle: 'TECH-HIVE', tagline: 'Ideas. Technology. Impact.',
  footerBrandTitle: 'AZAROTH', footerBrandSubtitle: 'TECH-HIVE',
  heroEyebrow: 'SOFTWARE ENGINEERING & DIGITAL SOLUTIONS',
  heroTitle: 'Intelligence, Engineered and Innovation Unleashed.',
  heroDescription: 'We design, build and scale intelligent digital experiences that help ambitious businesses innovate, transform and grow.',
  heroCtaLabel: 'Request for Quote', heroCtaLink: '/contact/request-for-quote',
  heroSecondaryCtaLabel: 'Our Portfolio', heroSecondaryCtaLink: '/products/explore-products',
  heroImage: '/logo.png', heroSlides: '[]', heroMiniTitle: 'Design meets innovation', heroMiniText: 'Purpose-built digital solutions for real business needs.',
  aboutEyebrowHome: 'ABOUT OUR COMPANY', homeAboutTitle: 'Engineering Software. Enabling Progress.',
  homeAboutDescription: 'We begin by understanding the challenge. Working alongside you, we define the right approach, build software around your real workflows, and support what we ship so the result keeps earning its place in your operations.',
  homeAboutCtaLabel: 'Discover our story', homeAboutCtaLink: '/about',
  homeSections: '["hero","about","services","approach","products","industries","values","cta"]',
  homeValues: JSON.stringify([{ icon: 'atom', title: 'Curiosity first', description: 'Every engagement starts with understanding — the domain, the constraints and the context of the people who will use the system.' }, { icon: 'compass', title: 'Solutions with purpose', description: 'Technology choices are driven by the problem, not by fashion. If a simpler approach serves you better, we will say so.' }, { icon: 'drafting-compass', title: 'Design as discipline', description: 'Information architecture, flow and polish are treated as engineering inputs, not decoration.' }, { icon: 'flower-2', title: 'Growth with intent', description: 'We help teams launch improvements, measure outcomes and build on what works.' }]),
  valuesEyebrow: 'HOW WE THINK', valuesTitle: 'Values that guide every build', valuesDescription: 'Understand the challenge. Define the right solution. Build with purpose.',
  valuesDeepDive: JSON.stringify([{ icon: 'atom', title: 'Curiosity', description: 'We ask before we build. Requirements, existing systems, edge cases and the people behind each workflow shape every decision.' }, { icon: 'compass', title: 'Purpose', description: 'Features exist to remove a bottleneck, clarify a decision or empower a specific user. Anything else is scope to question.' }, { icon: 'drafting-compass', title: 'Craft', description: 'Architecture you can change safely, interfaces your team can learn quickly and documentation your team can actually use.' }, { icon: 'flower-2', title: 'Reliability', description: 'Software that behaves the same way on Monday morning as it did during the demo — dependable, observable and maintained.' }]),
  howWeWork: JSON.stringify([{ value: '01', title: 'Discover', description: 'Learn the domain, interview the people involved, audit existing systems and define what success means in measurable terms.' }, { value: '02', title: 'Define', description: 'Translate findings into an agreed scope: prioritised requirements, architecture direction and a realistic roadmap.' }, { value: '03', title: 'Build', description: 'Iterate in short cycles with working software and regular checkpoints so feedback shapes the product early.' }, { value: '04', title: 'Support', description: 'Ship with knowledge transfer, documentation and monitoring. Software that is handed over properly stays useful.' }]),
  navCtaLabel: 'Get a Quote', navCtaLink: '/contact/request-for-quote',
  aboutTitle: 'Driven by Innovation. Powered by People.', aboutDescription: 'Technology should empower people. Our approach combines thoughtful engineering, design and strategy to solve complex challenges.', mission: 'To empower businesses through purposeful technology and lasting partnerships.',
  contactEmail: 'hello@azaroth-techhive.com', contactPhone: '+91 6379480931', contactLocation: '24, Malaviya Avenue, Thiruvanmiyur, Chennai, India', footerDescription: 'Ideas become impact when technology meets imagination. Building purposeful digital experiences for tomorrow.', footerTagline: 'Build · Innovate · Grow',
  homeProductsEyebrow: 'OUR PRODUCTS', homeProductsEnabled: 'true', homeProductsTitle: 'Digital Products. Thoughtfully Designed.', homeProductsDescription: 'Explore the platforms and software products our team builds for real business challenges.',
  homeServicesEyebrow: 'WHAT WE DO', homeServicesTitle: 'Technology Solutions, Thoughtfully Built', homeServicesDescription: 'From ambitious ideas to reliable products, our teams bring the right technology to every challenge.',
  homeIndustriesEyebrow: 'OUR EXPERTISE', homeIndustriesTitle: 'Technology for Every Possibility', homeIndustriesDescription: 'Focused digital solutions for organizations across a wide range of industries.',
  homeApproachEyebrow: 'OUR APPROACH', homeApproachTitle: 'Built Around People. Driven by Purpose.', homeApproachDescription: 'A collaborative way of working, grounded in clarity, creativity and lasting value.',
  ctaEyebrow: "LET'S MAKE IT HAPPEN", ctaTitle: "Have an idea? Let's build *something great.*", ctaButtonText: 'Request for Quote', ctaButtonLink: '/contact',
  primary: '#7A0C16', gold: '#d5a13c', orange: '#f47721', background: '#faf8f4', ink: '#171b2c', footerBrandTitleColor: '#ffffff', logo: '/logo.png', heroImage: '/logo.png', aboutImage: '/images/about_corporate_studio.jpg', cursorEnabled: 'true', cursorStyle: 'gold-ring', cursorSize: '42', cursorLag: '0.32', animationPreset: 'elegant',
  navigation: JSON.stringify([{ label: 'Home', url: '/' }, { label: 'About Us', url: '/about' }, { label: 'Who We Are', url: '/about/who-we-are', dropdown: true }, { label: 'Our Values', url: '/about/our-values', dropdown: true }, { label: 'How We Work', url: '/about#how-we-work', dropdown: true }, { label: 'Our Products', url: '/products' }, { label: 'Explore Products', url: '/products/explore-products', dropdown: true }, { label: 'Explore Services', url: '/products/explore-services', dropdown: true }, { label: 'Resource Hub', url: '/blog' }, { label: 'Connect With Us', url: '/contact' }, { label: 'Request for Quote', url: '/contact/request-for-quote', dropdown: true }]),
  socials: JSON.stringify([{ label: 'LinkedIn', url: 'https://www.linkedin.com/company/azaroth-techhive', icon: 'linkedin' }]),
  footerQuickLinks: JSON.stringify([{ label: 'Explore Products', url: '/products/explore-products' }, { label: 'Explore Services', url: '/products/explore-services' }, { label: 'Resource Hub', url: '/blog' }]),
  footerQuickHeading: 'Quick Links', footerContactHeading: 'Contact Us', footerFollowHeading: 'Follow Us',
  footerLegal: JSON.stringify([{ label: 'Privacy Policy', url: '/privacy' }, { label: 'Terms of Use', url: '/terms' }]),
  services: JSON.stringify([{ icon: 'code-2', name: 'Custom Software', description: 'Tailored, scalable applications engineered for your business.' }, { icon: 'cloud', name: 'Cloud & DevOps', description: 'Modern infrastructure designed for reliability and growth.' }, { icon: 'smartphone', name: 'Mobile Experiences', description: 'Thoughtful, high-performance apps for every screen.' }, { icon: 'brain-circuit', name: 'AI & Automation', description: 'Intelligent workflows that simplify complex operations.' }, { icon: 'layers-3', name: 'Enterprise Platforms', description: 'Connected systems that help your teams move faster.' }, { icon: 'shield-check', name: 'Security & Support', description: 'Dependable protection and ongoing technical care.' }]),
  industries: JSON.stringify([{ name: 'Healthcare', icon: 'heart-pulse', description: 'Human-centered digital care', tone: 'mint' }, { name: 'Finance', icon: 'chart-no-axes-combined', description: 'Confident financial innovation', tone: 'peach' }, { name: 'Retail', icon: 'shopping-bag', description: 'Connected customer experiences', tone: 'lavender' }, { name: 'Education', icon: 'graduation-cap', description: 'Smarter learning platforms', tone: 'sky' }, { name: 'Manufacturing', icon: 'factory', description: 'Intelligent operations', tone: 'peach' }, { name: 'Logistics', icon: 'truck', description: 'Visibility across the journey', tone: 'mint' }]),
  stats: JSON.stringify([{ value: '01', label: 'Discover' }, { value: '02', label: 'Design' }, { value: '03', label: 'Develop' }, { value: '04', label: 'Deliver' }]),
  privacyText: 'This is starter privacy notice text. Before launch, replace it with a privacy policy reviewed for your jurisdiction, data practices, contact forms and retention periods.', termsText: 'This is starter terms-of-use text. Replace it with approved company terms before public launch.',
  serviceIcons: JSON.stringify(['code-2', 'cloud', 'smartphone', 'brain-circuit', 'layers-3', 'shield-check']),
  industryIcons: JSON.stringify(['heart-pulse', 'chart-no-axes-combined', 'shopping-bag', 'graduation-cap', 'factory', 'truck']),
  productCatalogHeroSubtitle: 'Three platforms in active development, each available for scoped early builds. They give your teams a practical starting point for the roadmap while keeping scope, branding, and operational ownership clear.',
  productsHeroEyebrow: 'OUR PRODUCTS', productsHeroTitle: 'Products & Platform Foundations',
  productCtaLabel: 'Request for Quote', productCatalogCtaLabel: 'Explore Services', productCatalogCtaLink: '/products/explore-services',
  productStatusBadgeText: 'Platform In Active Development',
  servicesHeroEyebrow: 'OUR EXPERTISE', servicesHeroTitle: 'Services Built Around Your Challenges', servicesHeroDescription: 'From custom software to cloud and automation, we help teams solve real operational problems with the right technology.',
  industriesHeroEyebrow: 'INDUSTRIES WE SERVE', industriesHeroTitle: 'Industry Applications', industriesHeroDescription: 'Technology tailored to the processes, constraints and users of each industry we support.',
  blogEyebrow: 'RESOURCE HUB', blogTitle: 'Insights & Resources', blogDescription: 'Practical engineering notes and company updates from the Azaroth Tech-Hive team.', blogIntro: 'New content will appear here after it has been approved and published in the CMS.',
  careersEyebrow: 'CAREERS', careersTitle: 'Opportunities at Azaroth Tech-Hive', careersDescription: 'Build purposeful software with a team that values clarity, craft and ownership.',
  projectsEyebrow: 'CASE STUDIES', projectsTitle: 'Selected Work', projectsDescription: 'A selection of projects, platforms and engagements delivered by the Azaroth Tech-Hive team.',
  contactHeroEyebrow: 'GET IN TOUCH', contactHeroTitle: "Let's Talk About Your Project", contactHeroDescription: 'Send us a message and a member of our team will get back to you.',
  contactFormTitle: 'Send Us a Message', contactFormDescription: 'Fields marked with * are required.', contactNameLabel: 'Name', contactEmailLabel: 'Email Address', contactCompanyLabel: 'Company Name (optional)', contactPhoneLabel: 'Phone Number (optional)', contactEnquiryLabel: 'Enquiry About', contactServiceLabel: 'Service of Interest (optional)', contactMessageLabel: 'Message', contactConsentLabel: 'I consent to my details being stored and used to respond to my enquiry.', contactSubmitLabel: 'Submit Enquiry', contactSuccessTitle: 'Thank you — your enquiry has been received.', contactSuccessText: 'A member of our team will get back to you shortly.',
  contactEnquiryOptions: JSON.stringify(['General', 'Product Enquiry', 'Services Enquiry']),
  rfqHeroEyebrow: 'REQUEST FOR QUOTE', rfqHeroTitle: 'Request for Quote', rfqHeroDescription: 'Tell us about your requirements and our team will prepare a tailored quote.', rfqIntro: 'Share your requirements below. A member of our team will review your request and respond with next steps.', rfqSubmitLabel: 'Submit Request', rfqSuccessTitle: 'Thank you — your request for quote has been received.', rfqSuccessText: 'A member of our team will review your requirements and get back to you.', rfqInterestLabel: 'Product / Service of Interest',
  testimonialsEyebrow: 'CLIENT VOICES', testimonialsTitle: 'What Our Partners Say', testimonialsDescription: 'Published, approved testimonials from our customers.',
  technologyEyebrow: 'TECHNOLOGY STACK', technologyTitle: 'Built with Modern Technology', technologyDescription: 'Our published technology capabilities.',
  teamEyebrow: 'MEET THE TEAM', teamTitle: 'People Behind the Technology', teamDescription: 'Meet our published leadership and team profiles.',
  productOverviewEyebrow: 'PRODUCT OVERVIEW', productOverviewTitle: 'Architecture & Design Goals',
  featuresEyebrow: 'CAPABILITIES', featuresTitle: 'Core Features & Business Impact', featuresDescription: 'Built with specialized workflows to solve real operational bottlenecks.',
  galleryEyebrow: 'SCREENSHOTS & INTERFACES', galleryTitle: 'Visual Tour of the Platform', galleryDescription: 'Explore the interface and user workflows.',
  specsEyebrow: 'SPECIFICATIONS', specsTitle: 'Technical Architecture & Environment', specsDescription: 'Detailed system specifications, deployment options, and integration standards.',
  faqEyebrow: 'QUESTIONS & ANSWERS', faqTitle: 'Frequently Asked Questions', faqDescription: 'Common inquiries regarding setup, deployment, and customization.',
  aboutBeliefEyebrow: 'WHAT WE BELIEVE', aboutBeliefTitle: 'Better Technology Starts with Better Thinking', aboutBeliefDescription: 'We combine curiosity, craft and collaboration to create technology that works beautifully for people.',
  aboutVisionCard: JSON.stringify({ icon: 'eye', title: 'Our vision', description: 'Make powerful digital technology more meaningful, accessible and useful.' }),
  aboutPromiseCard: JSON.stringify({ icon: 'heart-handshake', title: 'Our promise', description: 'Thoughtful partnerships, transparent communication and quality engineering.' }),
  productDefaultTechSpecs: JSON.stringify({ latency: 'P99 latency: design target set per deployment', concurrency: 'Sized with you during scoping', protocols: ['REST', 'GraphQL', 'Webhooks'] }),
  productDefaultBenefits: JSON.stringify(['Tailored modular architecture', 'Integration-ready by design', 'Operational dashboards & reporting']),
  productDefaultCapabilities: JSON.stringify(['Modular architecture design', 'Role-based access controls', 'Comprehensive audit logging', 'Observable system behaviour']),
  productDefaultIntegrations: JSON.stringify(['Documented REST and GraphQL endpoints for data exchange.', 'Event-driven webhooks for workflow automation.', 'Standard SSO integration via SAML or OpenID Connect.', 'Import/export tooling for gradual data migration.']),
  productStatusColors: JSON.stringify({ 'under-development': '#F59E0B', 'beta-release': '#7C3AED', 'production-ready': '#2563EB', 'commercial-launch': '#0D9488', 'live': '#16A34A' })
};

// One-time upgrade for databases seeded by earlier releases. The legacy starter
// palette used maintenance/deprecated keys and a different colour set; replace it
// with the canonical lifecycle palette but never overwrite administrator colours.
try {
  const legacyStatusColors = JSON.stringify({ live: '#126449', 'under-development': '#d5a13c', maintenance: '#f47721', deprecated: '#900b2b' });
  const upgraded = await pool.query("UPDATE settings SET value=$1 WHERE key='productStatusColors' AND value=$2", [defaults.productStatusColors, legacyStatusColors]);
  if (upgraded.rowCount) console.log('[PostgreSQL] Upgraded legacy product status colours');
} catch (err) {
  console.warn('[PostgreSQL] Product status colour upgrade skipped:', err.message);
}

// Replace untouched starter placeholder values with the AZAROTH brand details.
// Only exact starter values are upgraded, so real content is never overwritten.
try {
  const placeholderUpgrades = [
    ['contactEmail', 'hello@example.com', defaults.contactEmail],
    ['contactPhone', '+00 000 000 0000', defaults.contactPhone],
    ['contactLocation', 'Your city · Worldwide', defaults.contactLocation],
    ['contactLocation', 'Chennai,India', defaults.contactLocation],
    ['socials', JSON.stringify([]), defaults.socials]
  ];
  for (const [key, from, to] of placeholderUpgrades) {
    const result = await pool.query('UPDATE settings SET value=$1 WHERE key=$2 AND value=$3', [to, key, from]);
    if (result.rowCount) console.log(`[PostgreSQL] Upgraded starter value for ${key}`);
  }
} catch (err) {
  console.warn('[PostgreSQL] Brand detail upgrade skipped:', err.message);
}

async function settings() {
  const data = { ...defaults };
  try {
    if (db) {
      for (const row of await db.prepare('SELECT key,value FROM settings').all()) data[row.key] = row.value;
    }
  } catch (e) {
    console.warn('[Settings] Reading settings fallback:', e.message);
  }
  return data;
}
async function audit(user, action, details = '') { await db.prepare('INSERT INTO audit(user_id,action,details) VALUES(?,?,?)').run(user || null, action, String(details).slice(0, 700)); }
function encodePassword(password) { const salt = crypto.randomBytes(16); const hash = crypto.scryptSync(password, salt, 64); return salt.toString('hex') + ':' + hash.toString('hex'); }
function verifyPassword(password, record) { try { const [salt, expected] = record.split(':'); const h = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 64); return crypto.timingSafeEqual(h, Buffer.from(expected, 'hex')); } catch { return false; } }
const emailOK = x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) && x.length <= 254;

// Bootstrap the first administrator once; environment values never reset an existing account.
const bootstrapEmail = (process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const bootstrapPass = process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
if (bootstrapEmail && bootstrapPass && emailOK(bootstrapEmail) && bootstrapPass.length >= 1 && bootstrapPass.length <= 128) {
  try {
    const existingAdmin = await db.prepare('SELECT id FROM users WHERE email=?').get(bootstrapEmail);
    if (!existingAdmin) {
      await db.prepare('INSERT INTO users(email,password_hash,role,active) VALUES(?,?,?,1)').run(bootstrapEmail, encodePassword(bootstrapPass), 'admin');
      console.log('Initial administrator created.');
    }
  } catch (err) {
    console.warn('[Admin Bootstrap] Note:', err.message);
  }
}
try {
  if (!await db.prepare('SELECT id FROM users LIMIT 1').get()) {
    console.warn('CMS administrator is not configured. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (or ADMIN_EMAIL and ADMIN_PASSWORD) to bootstrap.');
  }
} catch (err) {
  console.warn('[Admin Check] Note:', err.message);
}

const hex = crypto.randomBytes, sha = s => crypto.createHash('sha256').update(s).digest('hex');
const MIME = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function j(res, code, obj, h = {}) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...h }); res.end(JSON.stringify(obj)); }
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = (x, max) => String(x ?? '').trim().slice(0, max);
const slugOK = x => typeof x === 'string' && x.length <= 110 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const imgOK = x => x === '' || /^\/(logo|logo-source|icon-48|icon-192|icon-512)\.png$/.test(x) || (/^\/images\/[a-z0-9_.-]+\.(png|jpg|webp)$/.test(x)) || (/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(x) || /^https:\/\/[\w.-]+(?:\/[^\s"'<>]*)?$/.test(x));
function cookies(req) { const out = {}; for (const segment of (req.headers.cookie || '').split(';')) { const pos = segment.indexOf('='); if (pos > 0) out[segment.slice(0, pos).trim()] = segment.slice(pos + 1).trim(); } return out; }
async function member(req) { const auth = req.headers.authorization; const bearer = auth && auth.startsWith('Bearer ') ? auth.slice(7).trim() : null; const token = bearer || req.headers['x-session-token'] || cookies(req).sid; if (!token || !/^[a-f0-9]{64}$/.test(token)) return null; return (await db.prepare('SELECT u.id,u.email,u.role,s.csrf,s.expires FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.active=1').get(sha(token))) || null; }
function allowed(req, member, role = 'viewer') { return !!member && member.expires > Date.now() && ROLES[member.role] >= ROLES[role]; }
function sameSite(req) { const origin = req.headers.origin; if (origin) { try { const u = new URL(origin); if (u.protocol !== 'http:' && u.protocol !== 'https:') return false; const hostCandidates = [req.headers['x-forwarded-host'], req.headers.host, process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL).host : null].filter(Boolean).flatMap(h => h.split(',').map(s => s.trim().toLowerCase())); const originHost = u.host.toLowerCase(); if (hostCandidates.some(h => h === originHost || h.split(':')[0] === u.hostname.toLowerCase())) return true; if (originHost.endsWith('.run.app') || originHost.endsWith('.google.dev') || originHost.endsWith('.aistudio.google.com') || u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true; return false; } catch { return false; } } const sec = req.headers['sec-fetch-site']; return !sec || sec === 'same-origin' || sec === 'none' || sec === 'same-site' || sec === 'cross-site'; }
function authWrite(req, member) { const token = req.headers['x-session-token'] || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && req.headers.authorization.slice(7).trim()); const tokenValid = !!token; const csrfValid = req.headers['x-csrf-token'] === member.csrf; return sameSite(req) && (csrfValid || tokenValid); }
const hits = new Map(); function limited(req, key, max, period = 60000) { const ip = (req.socket.remoteAddress || 'unknown').slice(0, 120), id = key + ':' + ip, now = Date.now(), prev = hits.get(id) || [], fresh = prev.filter(t => t > now - period); fresh.push(now); hits.set(id, fresh); if (hits.size > 15000) { for (const [k, v] of hits) { if (!v.length || v[v.length - 1] < now - period) hits.delete(k); } } return fresh.length > max; }
async function jsonBody(req, limit = 140000) { const chunks = []; let n = 0; for await (const part of req) { n += part.length; if (n > limit) throw Object.assign(Error('Payload too large'), { httpCode: 413 }); chunks.push(part); } try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw Object.assign(Error('Invalid JSON'), { httpCode: 400 }); } }
function validateBlocks(list) { if (!Array.isArray(list) || list.length > 45) return false; const kinds = new Set(['hero', 'text', 'image-text', 'cards', 'stats', 'faq', 'cta', 'collection', 'divider']); return list.every(b => b && typeof b === 'object' && kinds.has(b.type) && typeof b.id === 'string' && b.id.length <= 60 && JSON.stringify(b).length <= 20000 && (!b.items || (Array.isArray(b.items) && b.items.length <= 35 && b.items.every(x => x && typeof x === 'object' && Object.values(x).every(v => typeof v === 'string' && v.length <= 1800)))) && Object.entries(b).every(([k, v]) => k === 'items' || (typeof v === 'string' && v.length <= 18000))); }
const SETTINGS_ARRAY_KEYS = new Set(['services', 'industries', 'stats', 'navigation', 'socials', 'footerQuickLinks', 'serviceIcons', 'industryIcons', 'productDefaultBenefits', 'productDefaultCapabilities', 'productDefaultIntegrations', 'contactEnquiryOptions', 'footerLegal', 'heroSlides', 'homeSections', 'homeValues', 'valuesDeepDive', 'howWeWork']);
const SETTINGS_OBJECT_KEYS = new Set(['aboutVisionCard', 'aboutPromiseCard', 'productDefaultTechSpecs', 'productStatusColors', 'componentStyles', 'responsiveOverrides']);
const SETTINGS_COLOR_KEYS = new Set(['primary', 'gold', 'orange', 'background', 'ink', 'footerBrandTitleColor']);
const SETTINGS_LOCALE_IMG_KEYS = new Set(['logo', 'heroImage', 'aboutImage']);
async function validateSettingsPayload(x) {
  if (typeof x !== 'object' || !x || Array.isArray(x)) throw Object.assign(Error('Invalid settings payload'), { httpCode: 400 });
  const allowedKeys = new Set(Object.keys(defaults)); const edits = [];
  if (x.brand && !x.brandTitle) x.brandTitle = x.brand;
  if (x.brandTitle && !x.brand) x.brand = x.brandTitle;
  if (x.brandTitle && !x.footerBrandTitle) x.footerBrandTitle = x.brandTitle;
  if (x.brandSubtitle && !x.footerBrandSubtitle) x.footerBrandSubtitle = x.brandSubtitle;
  const bad = message => Object.assign(Error(message), { httpCode: 400 });
  for (const [k, val] of Object.entries(x)) {
    if (!allowedKeys.has(k) || typeof val !== 'string' || val.length > 60000) throw bad('Invalid setting: ' + k);
    let v = val;
    if (SETTINGS_ARRAY_KEYS.has(k)) { let parsed; try { parsed = JSON.parse(v) } catch { throw bad(k + ' must contain valid JSON') } if (!Array.isArray(parsed) || parsed.length > 100) throw bad('Invalid array in ' + k); }
    if (SETTINGS_OBJECT_KEYS.has(k)) {
      let parsed; try { parsed = JSON.parse(v) } catch { throw bad(k + ' must contain valid JSON') }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw bad('Invalid object in ' + k);
      if (k === 'componentStyles' || k === 'responsiveOverrides') { for (const [tk, tv] of Object.entries(parsed)) { if (typeof tk !== 'string' || tk.length > 60 || typeof tv !== 'string' || tv.length > 300) throw bad('Invalid value in ' + k); } }
    }
    if (SETTINGS_COLOR_KEYS.has(k)) {
      v = v.trim();
      if (/^#[0-9a-fA-F]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw bad('Invalid colour');
    }
    if (k === 'cursorStyle' && !['gold-ring', 'gold-orbit', 'micro-dot', 'glass-outline'].includes(v)) throw bad('Invalid cursor style');
    if (SETTINGS_LOCALE_IMG_KEYS.has(k) && !imgOK(v)) throw bad('Invalid image URL for ' + k);
    edits.push([k, v]);
  }
  if (!edits.length) throw bad('No settings provided');
  return edits;
}
const pruneRevisions = async (t, k) => { try { await db.prepare('DELETE FROM revisions WHERE entity_type=? AND entity_key=? AND id NOT IN (SELECT id FROM revisions WHERE entity_type=? AND entity_key=? ORDER BY id DESC LIMIT 20)').run(t, k, t, k); } catch { } };
let mailTransport = null;
function getMailTransport() {
  if (mailTransport) return mailTransport;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465;
  if (host && user && pass) {
    mailTransport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
    return mailTransport;
  }
  return null;
}

async function sendEmail({ to, subject, text, html, attachments }) {
  const from = process.env.EMAIL_FROM || process.env.SUPPORT_EMAIL || 'hello@azaroth-techhive.com';
  const transport = getMailTransport();
  if (transport) {
    try {
      const info = await transport.sendMail({
        from: `"AZAROTH Tech-Hive" <${from}>`,
        to,
        subject,
        text,
        html: html || (text ? text.replace(/\n/g, '<br>') : ''),
        attachments
      });
      console.log(`[Email] Sent to ${to}: "${subject}" (MessageId: ${info.messageId})`);
      return true;
    } catch (err) {
      console.error(`[Email] SMTP delivery failed to ${to}:`, err.message);
    }
  }
  if (process.env.RESEND_API_KEY && (process.env.NOTIFY_FROM || from)) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM || from,
          to: Array.isArray(to) ? to : [to],
          subject,
          text,
          html
        })
      });
      if (response.ok) {
        console.log(`[Email] Sent via Resend to ${to}`);
        return true;
      }
      console.error(`[Email] Resend API error: ${response.status}`);
    } catch (err) {
      console.error('[Email] Resend delivery error:', err.message);
    }
  }
  console.warn(`[Email] Could not deliver email to ${to}: no active transport succeeded.`);
  return false;
}

async function notify(subject, message, options = {}) {
  const target = process.env.SUPPORT_EMAIL || process.env.NOTIFY_TO || process.env.ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL || 'hello@azaroth-techhive.com';
  return sendEmail({
    to: target,
    subject: `[AZAROTH] ${subject}`,
    text: message,
    ...options
  });
}
function previewText(s) { return String(s || '').replace(/\s+/g, ' ').slice(0, 200); }
async function contentSEO(p, site) {
  let title = site.brand + ' — ' + site.tagline, description = previewText(site.heroDescription), entryData = null;
  const pages = { '/': 'Home', '/about': 'About Us', '/services': 'Services', '/industries': 'Industries', '/products': 'Products', '/blog': 'Resource Hub', '/careers': 'Career Opportunities', '/projects': 'Case Studies', '/contact': 'Contact', '/privacy': 'Privacy Policy', '/terms': 'Terms of Use', '/products/explore-products': 'Our Products', '/products/explore-services': 'Our Services', '/contact/request-for-quote': 'Request for Quote' };
  if (p !== '/' && pages[p]) title = pages[p] + ' | ' + site.brand;
  const match = /^\/(services|industries|products|careers|blog|projects|pages|testimonials|team|technologies)\/([a-z0-9-]+)$/.exec(p);
  if (match) { const item = await db.prepare('SELECT title,summary,body,features,seo_title,seo_description FROM entries WHERE type=? AND slug=? AND status=?').get(match[1], match[2], 'published'); if (item) { title = (item.seo_title || item.title) + ' | ' + site.brand; description = previewText(item.seo_description || item.summary); entryData = item; } }
  const pageName = p === '/' ? 'home' : p.slice(1).replaceAll('/', '-'); const layout = await db.prepare('SELECT seo_title,seo_description FROM layouts WHERE slug=? AND status=?').get(pageName, 'published'); if (layout) { title = layout.seo_title || title; description = layout.seo_description || description; }
  return { title, description, entryData };
}
async function webHtml(p) {
  const site = await settings(), seo = await contentSEO(p, site), canonical = siteUrl + p;
  let extraHtml = '';
  if (seo.entryData) {
    extraHtml = `<div><p>${e(seo.entryData.body)}</p>`;
    if (seo.entryData.features) { try { const fl = JSON.parse(seo.entryData.features); if (Array.isArray(fl)) extraHtml += '<ul>' + fl.map(f => `<li><strong>${e(f.title || '')}</strong> ${e(f.description || '')}</li>`).join('') + '</ul>'; } catch { } }
    extraHtml += '</div>';
  }
  const bTitle = site.brandTitle || site.brand || 'AZAROTH';
  const bSubtitle = site.brandSubtitle || 'TECH-HIVE';
  const bLogo = site.logo || '/logo.png';
  const navLinks = (() => { try { const list = JSON.parse(site.navigation); if (!Array.isArray(list)) return ''; return list.filter(n => n && !n.dropdown && typeof n.label === 'string' && typeof n.url === 'string').map(n => `<a href="${e(n.url)}">${e(n.label)}</a>`).join(''); } catch { return ''; } })();
  const heroPrimaryLabel = site.heroCtaLabel || 'Request for Quote', heroPrimaryLink = site.heroCtaLink || '/contact/request-for-quote';
  const heroSecondaryLabel = site.heroSecondaryCtaLabel || 'Our Portfolio', heroSecondaryLink = site.heroSecondaryCtaLink || '/products/explore-products';
  const heroSections = (p === '/' ? `<section class="hero"><div class="wrap"><div class="hero-inner"><div class="hero-copy"><div class="eyebrow">${e(site.heroEyebrow || 'SOFTWARE ENGINEERING & DIGITAL SOLUTIONS')}</div><h1>${e(site.heroTitle)}</h1><p>${e(site.heroDescription)}</p><div class="actions"><a href="${e(heroPrimaryLink)}" class="pill primary">${e(heroPrimaryLabel)} &rarr;</a><a href="${e(heroSecondaryLink)}" class="pill secondary">${e(heroSecondaryLabel)} &rarr;</a></div></div></div></div></section><section class="about-preview section"><div class="wrap"><div class="section-head"><div class="eyebrow">${e(site.aboutEyebrowHome || 'ABOUT OUR COMPANY')}</div><h2>${e(site.homeAboutTitle)}</h2></div><p>${e(site.homeAboutDescription)}</p><a class="pill secondary" href="${e(site.homeAboutCtaLink || '/about')}">${e(site.homeAboutCtaLabel || 'Discover our story')} &rarr;</a></div></section>` : '');
  const navShell = `<header class="nav" id="nav"><a href="/" class="brand" aria-label="${e(bTitle)} ${e(bSubtitle)} homepage"><img src="${e(bLogo)}" alt="${e(bTitle)} logo"><div class="brand-lockup"><span class="brand-title">${e(bTitle)}</span><span class="brand-subtitle">${e(bSubtitle)}</span></div></a><nav class="nav-links" aria-label="Primary">${navLinks}</nav><div class="nav-actions"><a class="pill primary" href="${e(site.navCtaLink || '/contact/request-for-quote')}">${e(site.navCtaLabel || 'Get a Quote')} &rarr;</a></div></header>`;

  let fallback = '';
  if (p === '/admin') {
    fallback = `<main class="admin"><div class="wrap"><div class="eyebrow">AZAROTH CONTENT STUDIO</div><h2>Website control center</h2><p class="admin-tagline">Edit, preview and publish your website without touching code.</p><div id="adminRoot"><div class="admin-panel admin-login"><h3>Secure administrator sign in</h3><p>Enter your administrator credentials below to access the Content Studio.</p><form id="loginForm"><div class="field"><label>Email address</label><input type="email" id="loginEmail" name="email" required autocomplete="username" placeholder="admin@azaroth-techhive.com"></div><div class="field"><label>Password</label><input type="password" id="loginPass" name="password" required autocomplete="current-password"></div><button class="pill primary" type="submit" id="loginSubmitBtn">Sign in &rarr;</button><p id="loginResult" role="status"></p></form></div></div></div></main>`;
  } else if (p === '/') {
    fallback = navShell + heroSections;
  } else {
    const pageLabel = p === '/about' ? 'ABOUT US' : p === '/services' ? 'OUR EXPERTISE' : p === '/industries' ? 'INDUSTRIES' : p === '/products' ? 'OUR PRODUCTS' : p === '/contact' ? 'GET IN TOUCH' : p === '/careers' ? 'CAREERS' : p === '/blog' ? 'INSIGHTS' : 'AZAROTH';
    fallback = `${navShell}<section class="page-hero"><div class="wrap"><div class="eyebrow">${e(pageLabel)}</div><h1>${e(seo.title)}</h1><p>${e(seo.description)}</p>${extraHtml}</div></section>`;
  }
  let template = '';
  try {
    template = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  } catch {
    template = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#faf8f4"><link rel="icon" type="image/png" href="/icon-48.png"><link rel="apple-touch-icon" href="/icon-192.png"><meta name="description" content="Purposeful software, designed for tomorrow."><title>AZAROTH — Ideas. Technology. Impact.</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/style.css?v=2.6"><script src="/icons.js?v=2.6" defer></script><script src="/app.js?v=2.6" defer></script><script src="/enhancements.js?v=2.6" defer></script></head><body><div id="orb" aria-hidden="true"><span></span><em></em></div><div id="app"></div></body></html>';
  }
  return template.replace('<title>AZAROTH — Ideas. Technology. Impact.</title>', `<title>${e(seo.title)}</title>`).replace('<meta name="description" content="Purposeful software, designed for tomorrow.">', `<meta name="description" content="${e(seo.description)}"><link rel="canonical" href="${e(canonical)}"><meta property="og:title" content="${e(seo.title)}"><meta property="og:description" content="${e(seo.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${e(canonical)}">`).replace('<div id="app"></div>', `<div id="app">${fallback}</div>`).replace('</head>', `${p === '/admin' ? '<meta name=\"robots\" content=\"noindex,nofollow\">' : ''}</head>`);
}
function streamFile(res, file, mime, extra = {}) { res.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', ...extra }); return fs.createReadStream(file).pipe(res); }
const handleRequest = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
  if (prod) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  try {
    let requestUrl = req.url;
    try {
      const check = new URL(requestUrl, 'http://localhost');
      const forwarded = check.searchParams.get('__url') || check.searchParams.get('url');
      if (forwarded) {
        check.searchParams.delete('__url'); check.searchParams.delete('url');
        const rest = check.searchParams.toString();
        requestUrl = forwarded + (rest ? '?' + rest : '');
      }
    } catch { }
    const url = new URL(requestUrl, 'http://localhost'); let p = url.pathname; if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1); const method = req.method; const user = await member(req);
    if (method === 'GET' && (p === '/api/health' || p === '/health')) return j(res, 200, { ok: true, db: true });
    if (method === 'GET' && p === '/api/content') return j(res, 200, await settings());
    if (method === 'GET' && p === '/api/layouts') {
      const slug = url.searchParams.get('slug') || ''; if (!/^[a-z0-9-]{1,110}$/.test(slug)) return j(res, 400, { error: 'Invalid page' });
      const row = await db.prepare('SELECT slug,title,blocks,status FROM layouts WHERE slug=?').get(slug);
      return j(res, 200, row && row.status === 'published' ? { ...row, blocks: JSON.parse(row.blocks) } : null);
    }
    if (method === 'GET' && p === '/api/entries') {
      const type = url.searchParams.get('type'); if (!TYPES.has(type)) return j(res, 400, { error: 'Invalid collection' });
      const slug = url.searchParams.get('slug'); let rows;
      if (slug) { if (!slugOK(slug)) return j(res, 400, { error: 'Invalid slug' }); rows = await db.prepare('SELECT id,type,slug,title,summary,body,image,category,location,job_type,technology,gallery,features,specifications,faqs,sections_config,hero_cta_label,hero_cta_link,secondary_cta_label,secondary_cta_link,image_position,social_image,canonical_url,related_slugs,updated_at FROM entries WHERE type=? AND slug=? AND status=?').get(type, slug, 'published'); }
      else rows = await db.prepare('SELECT id,type,slug,title,summary,image,category,location,job_type,technology,hero_cta_label,hero_cta_link,image_position,updated_at FROM entries WHERE type=? AND status=? ORDER BY updated_at DESC LIMIT 200').all(type, 'published');
      return j(res, 200, rows || null);
    }
    const phoneOK = x => !x || (x.length <= 30 && /^[+()0-9\-.\s]{6,30}$/.test(x));
    if (method === 'POST' && p === '/api/contact') {
      if (!sameSite(req) || limited(req, 'contact', 7)) return j(res, 429, { error: 'Please try again later' });
      const x = await jsonBody(req); if (x.website) return j(res, 200, { ok: true });
      const name = str(x.name, 150), email = str(x.email, 254).toLowerCase(), company = str(x.company, 160), service = str(x.service, 160), message = str(x.message, 5000), phone = str(x.phone, 30), enquiry = str(x.enquiry, 60) || 'General';
      if (name.length < 2 || !emailOK(email) || message.length < 10 || !phoneOK(phone) || x.consent !== true) return j(res, 400, { error: 'Enter your name, valid email, message and privacy consent.' });
      await db.prepare('INSERT INTO inquiries(name,email,company,service,message,phone,source) VALUES(?,?,?,?,?,?,?)').run(name, email, company, service, message, phone, 'contact');
      notify('New website enquiry', `Name: ${name}\nEmail: ${email}\nCompany: ${company}\nEnquiry About: ${enquiry}\nService: ${service}\nPhone: ${phone || 'N/A'}\nMessage:\n${message}`).catch(err => console.error('[Email] Admin notify failed:', err.message));
      const confirmationText = `Dear ${name},

Thank you for reaching out to AZAROTH Tech-Hive. We have received your enquiry regarding ${service || enquiry || 'our services'}.

Summary of what you submitted:
- Name: ${name}
- Email: ${email}
- Company: ${company || 'N/A'}
- Phone: ${phone || 'N/A'}
- Service: ${service || 'General enquiry'}
- Message:
${message}

A representative from our team will review your enquiry and get back to you shortly.

Warm regards,
AZAROTH Tech-Hive Team
https://azaroth-techhive.com`;
      const confirmationHtml = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#171b2c;line-height:1.6">
        <h2 style="color:#7A0C16;margin-bottom:8px">AZAROTH TECH-HIVE</h2>
        <p>Dear <strong>${e(name)}</strong>,</p>
        <p>Thank you for reaching out to AZAROTH Tech-Hive. We have received your enquiry regarding <strong>${e(service || 'our services')}</strong>.</p>
        <div style="background:#faf8f4;border-left:4px solid #d5a13c;padding:16px;margin:20px 0;border-radius:4px">
          <p style="margin:4px 0"><strong>Name:</strong> ${e(name)}</p>
          <p style="margin:4px 0"><strong>Email:</strong> ${e(email)}</p>
          <p style="margin:4px 0"><strong>Company:</strong> ${e(company || 'N/A')}</p>
          <p style="margin:4px 0"><strong>Phone:</strong> ${e(phone || 'N/A')}</p>
          <p style="margin:4px 0"><strong>Service:</strong> ${e(service || 'General enquiry')}</p>
          <p style="margin:4px 0"><strong>Message:</strong><br>${e(message).replace(/\n/g, '<br>')}</p>
        </div>
        <p>A member of our team will review your enquiry and follow up with you promptly.</p>
        <hr style="border:none;border-top:1px solid #e0ded9;margin:24px 0">
        <p style="font-size:12px;color:#6b7280">AZAROTH Tech-Hive · Practical software engineering for real business needs.<br><a href="https://azaroth-techhive.com" style="color:#7A0C16">azaroth-techhive.com</a></p>
      </div>`;
      sendEmail({
        to: email,
        subject: 'We have received your enquiry — AZAROTH Tech-Hive',
        text: confirmationText,
        html: confirmationHtml
      }).catch(err => console.error('[Email] Confirmation email failed:', err.message));
      return j(res, 200, { ok: true });
    }
    if (method === 'POST' && p === '/api/quote') {
      if (!sameSite(req) || limited(req, 'quote', 7)) return j(res, 429, { error: 'Please try again later' });
      const x = await jsonBody(req); if (x.website) return j(res, 200, { ok: true });
      const name = str(x.name, 150), email = str(x.email, 254).toLowerCase(), company = str(x.company, 160), phone = str(x.phone, 30), enquiry = str(x.enquiry, 60) || 'General', interest = str(x.interest, 160), message = str(x.message, 5000);
      if (name.length < 2 || !emailOK(email) || message.length < 10 || !phoneOK(phone) || x.consent !== true) return j(res, 400, { error: 'Enter your name, valid email, requirements and privacy consent.' });
      await db.prepare('INSERT INTO inquiries(name,email,company,service,message,phone,source) VALUES(?,?,?,?,?,?,?)').run(name, email, company, interest, message, phone, 'quote');
      notify('New request for quote', `Name: ${name}\nEmail: ${email}\nCompany: ${company}\nEnquiry About: ${enquiry}\nInterest: ${interest || 'N/A'}\nPhone: ${phone || 'N/A'}\nRequirements:\n${message}`).catch(err => console.error('[Email] Admin notify failed:', err.message));
      const quoteText = `Dear ${name},

Thank you for submitting a request for quote to AZAROTH Tech-Hive.

Summary of what you submitted:
- Name: ${name}
- Email: ${email}
- Company: ${company || 'N/A'}
- Phone: ${phone || 'N/A'}
- Interest: ${interest || 'N/A'}
- Requirements:
${message}

A representative from our team will review your requirements and get back to you with next steps.

Warm regards,
AZAROTH Tech-Hive Team
https://azaroth-techhive.com`;
      const quoteHtml = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#171b2c;line-height:1.6">
        <h2 style="color:#7A0C16;margin-bottom:8px">AZAROTH TECH-HIVE</h2>
        <p>Dear <strong>${e(name)}</strong>,</p>
        <p>Thank you for submitting a <strong>Request for Quote</strong>. We have received your requirements.</p>
        <div style="background:#faf8f4;border-left:4px solid #d5a13c;padding:16px;margin:20px 0;border-radius:4px">
          <p style="margin:4px 0"><strong>Name:</strong> ${e(name)}</p>
          <p style="margin:4px 0"><strong>Email:</strong> ${e(email)}</p>
          <p style="margin:4px 0"><strong>Company:</strong> ${e(company || 'N/A')}</p>
          <p style="margin:4px 0"><strong>Phone:</strong> ${e(phone || 'N/A')}</p>
          <p style="margin:4px 0"><strong>Interest:</strong> ${e(interest || 'N/A')}</p>
          <p style="margin:4px 0"><strong>Requirements:</strong><br>${e(message).replace(/\n/g, '<br>')}</p>
        </div>
        <p>A member of our team will review your requirements and follow up with you promptly.</p>
        <hr style="border:none;border-top:1px solid #e0ded9;margin:24px 0">
        <p style="font-size:12px;color:#6b7280">AZAROTH Tech-Hive · Practical software engineering for real business needs.<br><a href="https://azaroth-techhive.com" style="color:#7A0C16">azaroth-techhive.com</a></p>
      </div>`;
      sendEmail({ to: email, subject: 'We have received your request for quote — AZAROTH Tech-Hive', text: quoteText, html: quoteHtml }).catch(err => console.error('[Email] RFQ confirmation email failed:', err.message));
      return j(res, 200, { ok: true });
    }
    if (method === 'POST' && p === '/api/jobs/apply') {
      if (!sameSite(req) || limited(req, 'apply', 5)) return j(res, 429, { error: 'Please try again later' });
      const x = await jsonBody(req, 4 * 1024 * 1024); if (x.website) return j(res, 200, { ok: true });
      const job = str(x.job, 110), name = str(x.name, 150), email = str(x.email, 254).toLowerCase(), portfolio = str(x.portfolio, 500), message = str(x.message, 3000);
      if (!slugOK(job) || name.length < 2 || !emailOK(email) || x.consent !== true) return j(res, 400, { error: 'Valid job, name, email and privacy consent are required' });
      const opening = await db.prepare('SELECT id FROM entries WHERE type=? AND slug=? AND status=?').get('careers', job, 'published'); if (!opening) return j(res, 404, { error: 'This position is no longer available' });
      let filename = ''; if (x.resume) { const d = /^data:application\/pdf;base64,([A-Za-z0-9+/=]+)$/.exec(String(x.resume)); if (!d || d[1].length > 3 * 1024 * 1024) return j(res, 400, { error: 'PDF resume must be under 2MB' }); const buf = Buffer.from(d[1], 'base64'); if (buf.length > 2 * 1024 * 1024 || buf.toString('ascii', 0, 5) !== '%PDF-') return j(res, 400, { error: 'Only valid PDF resumes are supported' }); filename = hex(16).toString('hex') + '.pdf'; fs.writeFileSync(path.join(storage, 'private', filename), buf, { flag: 'wx', mode: 0o600 }); }
      await db.prepare('INSERT INTO applications(job_slug,name,email,portfolio,message,resume_filename) VALUES(?,?,?,?,?,?)').run(job, name, email, portfolio, message, filename);
      const attachments = [];
      if (filename) {
        const filePath = path.join(storage, 'private', filename);
        if (fs.existsSync(filePath)) attachments.push({ filename: `${name.replace(/[^a-zA-Z0-9]/g, '_')}_resume.pdf`, path: filePath });
      }
      notify('New application: ' + job, `Name: ${name}\nEmail: ${email}\nJob: ${job}\nPortfolio: ${portfolio || 'N/A'}\nMessage:\n${message}`, { attachments }).catch(err => console.error('[Email] HR notify failed:', err.message));
      const appConfirmText = `Dear ${name},

Thank you for applying for the ${job} role at AZAROTH Tech-Hive.

We have received your application materials and will carefully review your background and experience. If your profile matches our requirements, a member of our talent team will reach out with next steps.

Best regards,
AZAROTH Talent Acquisition
https://azaroth-techhive.com`;
      sendEmail({
        to: email,
        subject: `Application Received: ${job} — AZAROTH Tech-Hive`,
        text: appConfirmText
      }).catch(err => console.error('[Email] Application candidate email failed:', err.message));
      return j(res, 200, { ok: true });
    }
    if (method === 'POST' && p === '/api/admin/login') {
      if (!sameSite(req) || limited(req, 'login', 30, 600000)) return j(res, 429, { error: 'Too many attempts. Try again later.' });
      const x = await jsonBody(req); let email = str(x.email, 254).toLowerCase(), pw = String(x.password || '').slice(0, 300);
      if (!email || !pw) return j(res, 400, { error: 'Email and password required' });
      const row = await db.prepare('SELECT id,email,role,password_hash,active FROM users WHERE email=?').get(email);
      if (!row || !row.active || !verifyPassword(pw, row.password_hash)) return j(res, 401, { error: 'Invalid email or password' });
      await db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
      const token = hex(32).toString('hex'), csrf = hex(24).toString('hex');
      await db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires) VALUES(?,?,?,?)').run(sha(token), row.id, csrf, Date.now() + 8 * 3600 * 1000);
      await audit(row.id, 'auth.login');
      return j(res, 200, { ok: true, csrf, token, email: row.email, role: row.role }, { 'Set-Cookie': `sid=${token}; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=28800` });
    }
    if (p === '/api/admin/logout' && method === 'POST') {
      const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : req.headers['x-session-token'] || cookies(req).sid;
      if (user) { if (token) await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token)); await audit(user.id, 'auth.logout'); }
      return j(res, 200, { ok: true }, { 'Set-Cookie': `sid=; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=0` });
    }
    if (p.startsWith('/api/admin/')) {
      if (!allowed(req, user)) return j(res, 401, { error: 'Authentication required' });
      if (method !== 'GET' && !authWrite(req, user)) return j(res, 403, { error: 'Security token missing or invalid' });
      if (p === '/api/admin/check' && method === 'GET') return j(res, 200, { ok: true, email: user.email, role: user.role, csrf: user.csrf });
      if (p === '/api/admin/overview' && method === 'GET') return j(res, 200, { entries: (await db.prepare('SELECT type,COUNT(*) count FROM entries GROUP BY type').all()), enquiries: (await db.prepare('SELECT count(*) n FROM inquiries').get()).n, applications: (await db.prepare('SELECT count(*) n FROM applications').get()).n, pages: (await db.prepare('SELECT count(*) n FROM layouts').get()).n });
      if (p === '/api/admin/content' && method === 'PUT') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        const edits = await validateSettingsPayload(await jsonBody(req, 200000)), put = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        await db.exec('BEGIN'); try { for (const [k, v] of edits) await put.run(k, v); await db.exec('COMMIT'); } catch (err) { await db.exec('ROLLBACK'); throw err; }
        await audit(user.id, 'settings.saved', edits.map(x => x[0]).join(',')); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/content-draft' && method === 'GET') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        const row = await db.prepare('SELECT data,updated_by,updated_at FROM settings_draft WHERE id=1').get();
        return j(res, 200, row ? { edits: JSON.parse(row.data), updated_by: row.updated_by, updated_at: row.updated_at } : { edits: {}, updated_by: '', updated_at: '' });
      }
      if (p === '/api/admin/content-draft' && method === 'PUT') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        const edits = await validateSettingsPayload(await jsonBody(req, 200000));
        const row = await db.prepare('SELECT data FROM settings_draft WHERE id=1').get();
        const merged = { ...(row ? JSON.parse(row.data) : {}), ...Object.fromEntries(edits) };
        await db.prepare('INSERT INTO settings_draft(id,data,updated_by,updated_at) VALUES(1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').run(JSON.stringify(merged), user.email);
        await audit(user.id, 'settings.drafted', edits.map(x => x[0]).join(',')); return j(res, 200, { ok: true, keys: Object.keys(merged) });
      }
      if (p === '/api/admin/content-draft' && method === 'DELETE') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        await db.prepare('DELETE FROM settings_draft WHERE id=1').run(); await audit(user.id, 'settings.draft-discarded'); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/content/publish' && method === 'POST') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        const row = await db.prepare('SELECT data FROM settings_draft WHERE id=1').get();
        if (!row) return j(res, 400, { error: 'No draft to publish' });
        const edits = await validateSettingsPayload(JSON.parse(row.data));
        const snapshot = {};
        for (const [k] of edits) { const cur = await db.prepare('SELECT value FROM settings WHERE key=?').get(k); snapshot[k] = cur ? cur.value : (defaults[k] ?? ''); }
        await db.prepare('INSERT INTO revisions(entity_type,entity_key,data,created_by) VALUES(?,?,?,?)').run('settings', 'pre-publish', JSON.stringify(snapshot), user.email);
        const put = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        await db.exec('BEGIN'); try { for (const [k, v] of edits) await put.run(k, v); await db.exec('COMMIT'); } catch (err) { await db.exec('ROLLBACK'); throw err; }
        await pruneRevisions('settings', 'pre-publish');
        await db.prepare('DELETE FROM settings_draft WHERE id=1').run();
        await audit(user.id, 'settings.published', edits.map(x => x[0]).join(',')); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/revisions' && method === 'GET') {
        const type = str(url.searchParams.get('type') || '', 20);
        if (!['settings', 'entry', 'layout'].includes(type)) return j(res, 400, { error: 'Invalid revision type' });
        if (type === 'settings') return j(res, 200, await db.prepare("SELECT id,entity_key,created_by,created_at FROM revisions WHERE entity_type='settings' ORDER BY id DESC LIMIT 20").all());
        const ref = str(url.searchParams.get('ref') || '', 140);
        const key = type === 'entry' ? (/^[a-z0-9]+\/[a-z0-9-]+$/.test(ref) ? ref : '') : (/^[a-z0-9-]{1,110}$/.test(ref) ? ref : '');
        if (!key) return j(res, 400, { error: 'Invalid revision reference' });
        return j(res, 200, await db.prepare('SELECT id,entity_key,created_by,created_at FROM revisions WHERE entity_type=? AND entity_key=? ORDER BY id DESC LIMIT 20').all(type, key));
      }
      if (p === '/api/admin/revision' && method === 'GET') {
        const id = Number(url.searchParams.get('id')); if (!Number.isSafeInteger(id) || id < 1) return j(res, 400, { error: 'Invalid revision ID' });
        const row = await db.prepare('SELECT * FROM revisions WHERE id=?').get(id); if (!row) return j(res, 404, { error: 'Revision not found' });
        let data; try { data = JSON.parse(row.data) } catch { return j(res, 400, { error: 'Corrupt revision data' }) }
        return j(res, 200, { id: row.id, entity_type: row.entity_type, entity_key: row.entity_key, created_by: row.created_by, created_at: row.created_at, data });
      }
      if (p === '/api/admin/revisions/restore' && method === 'POST') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        const x = await jsonBody(req), id = Number(x.id);
        if (!Number.isSafeInteger(id) || id < 1) return j(res, 400, { error: 'Invalid revision ID' });
        const row = await db.prepare('SELECT * FROM revisions WHERE id=?').get(id); if (!row) return j(res, 404, { error: 'Revision not found' });
        const parsed = JSON.parse(row.data);
        if (row.entity_type === 'settings') {
          const edits = await validateSettingsPayload(parsed);
          if (x.target === 'draft') {
            const current = await db.prepare('SELECT data FROM settings_draft WHERE id=1').get();
            const merged = { ...(current ? JSON.parse(current.data) : {}), ...Object.fromEntries(edits) };
            await db.prepare('INSERT INTO settings_draft(id,data,updated_by,updated_at) VALUES(1,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').run(JSON.stringify(merged), user.email);
            await audit(user.id, 'settings.revision-restored-draft', 'rev:' + id); return j(res, 200, { ok: true, target: 'draft' });
          }
          const snapshot = {};
          for (const [k] of edits) { const cur = await db.prepare('SELECT value FROM settings WHERE key=?').get(k); snapshot[k] = cur ? cur.value : (defaults[k] ?? ''); }
          await db.prepare('INSERT INTO revisions(entity_type,entity_key,data,created_by) VALUES(?,?,?,?)').run('settings', 'pre-restore', JSON.stringify(snapshot), user.email);
          const put = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
          await db.exec('BEGIN'); try { for (const [k, v] of edits) await put.run(k, v); await db.exec('COMMIT'); } catch (err) { await db.exec('ROLLBACK'); throw err; }
          await pruneRevisions('settings', 'pre-restore');
          await audit(user.id, 'settings.revision-restored', 'rev:' + id); return j(res, 200, { ok: true, target: 'live' });
        }
        if (row.entity_type === 'entry') {
          if (!parsed || typeof parsed.type !== 'string' || !TYPES.has(parsed.type) || !slugOK(parsed.slug || '') || typeof parsed.title !== 'string' || !parsed.title || !imgOK(parsed.image || '')) return j(res, 400, { error: 'Invalid revision data' });
          const snapshot = JSON.stringify(await db.prepare('SELECT * FROM entries WHERE type=? AND slug=?').get(parsed.type, parsed.slug) || {});
          await db.prepare('INSERT INTO revisions(entity_type,entity_key,data,created_by) VALUES(?,?,?,?)').run('entry', parsed.type + '/' + parsed.slug, snapshot, user.email);
          await db.prepare(`INSERT INTO entries(type,slug,title,summary,body,image,status,seo_title,seo_description,category,location,job_type,technology,gallery,features,specifications,faqs,sections_config,hero_cta_label,hero_cta_link,secondary_cta_label,secondary_cta_link,image_position,social_image,canonical_url,related_slugs) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(type,slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,body=excluded.body,image=excluded.image,status=excluded.status,seo_title=excluded.seo_title,seo_description=excluded.seo_description,category=excluded.category,location=excluded.location,job_type=excluded.job_type,technology=excluded.technology,gallery=excluded.gallery,features=excluded.features,specifications=excluded.specifications,faqs=excluded.faqs,sections_config=excluded.sections_config,hero_cta_label=excluded.hero_cta_label,hero_cta_link=excluded.hero_cta_link,secondary_cta_label=excluded.secondary_cta_label,secondary_cta_link=excluded.secondary_cta_link,image_position=excluded.image_position,social_image=excluded.social_image,canonical_url=excluded.canonical_url,related_slugs=excluded.related_slugs,updated_at=CURRENT_TIMESTAMP`).run(parsed.type, parsed.slug, parsed.title, parsed.summary || '', parsed.body || '', parsed.image || '', parsed.status === 'published' ? 'published' : 'draft', parsed.seo_title || '', parsed.seo_description || '', parsed.category || '', parsed.location || '', parsed.job_type || '', parsed.technology || '', parsed.gallery || '[]', parsed.features || '[]', parsed.specifications || '[]', parsed.faqs || '[]', parsed.sections_config || '[]', parsed.hero_cta_label || '', parsed.hero_cta_link || '', parsed.secondary_cta_label || '', parsed.secondary_cta_link || '', ['right', 'left', 'full', 'top'].includes(parsed.image_position) ? parsed.image_position : 'right', parsed.social_image || '', parsed.canonical_url || '', parsed.related_slugs || '[]');
          await pruneRevisions('entry', parsed.type + '/' + parsed.slug);
          await audit(user.id, 'entry.revision-restored', parsed.type + '/' + parsed.slug); return j(res, 200, { ok: true });
        }
        if (row.entity_type === 'layout') {
          if (typeof row.entity_key !== 'string' || !/^[a-z0-9-]{1,110}$/.test(row.entity_key)) return j(res, 400, { error: 'Invalid revision reference' });
          let blocks = parsed.blocks; if (!validateBlocks(blocks)) return j(res, 400, { error: 'Invalid revision blocks' });
          const snapshot = JSON.stringify(await db.prepare('SELECT slug,title,blocks,status,seo_title,seo_description FROM layouts WHERE slug=?').get(row.entity_key) || {});
          await db.prepare('INSERT INTO revisions(entity_type,entity_key,data,created_by) VALUES(?,?,?,?)').run('layout', row.entity_key, snapshot, user.email);
          await db.prepare(`INSERT INTO layouts(slug,title,blocks,status,seo_title,seo_description) VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,blocks=excluded.blocks,status=excluded.status,seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=CURRENT_TIMESTAMP`).run(row.entity_key, str(parsed.title, 180), JSON.stringify(blocks), parsed.status === 'published' ? 'published' : 'draft', str(parsed.seo_title, 180), str(parsed.seo_description, 300));
          await pruneRevisions('layout', row.entity_key);
          await audit(user.id, 'layout.revision-restored', row.entity_key); return j(res, 200, { ok: true });
        }
        return j(res, 400, { error: 'Unsupported revision restore' });
      }
      if (p === '/api/admin/entries' && method === 'GET') {
        const type = url.searchParams.get('type'); if (!TYPES.has(type)) return j(res, 400, { error: 'Invalid collection' });
        return j(res, 200, await db.prepare('SELECT * FROM entries WHERE type=? ORDER BY updated_at DESC LIMIT 500').all(type));
      }
      if (p === '/api/admin/entries' && method === 'POST') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' });
        const x = await jsonBody(req, 200000), type = x.type, slug = str(x.slug, 110).toLowerCase(); if (!TYPES.has(type) || !slugOK(slug)) return j(res, 400, { error: 'Invalid type or slug' });
        const title = str(x.title, 180), summary = str(x.summary, 1300), text = str(x.body, 40000), image = str(x.image, 700), status = x.status === 'published' ? 'published' : 'draft', seoTitle = str(x.seo_title, 180), seoDesc = str(x.seo_description, 300), category = str(x.category, 110), location = str(x.location, 110), jobType = str(x.job_type, 110), technology = str(x.technology, 700);
        const galleryItemOK = item => typeof item === 'string' ? imgOK(item) : (item && typeof item === 'object' && typeof item.url === 'string' && imgOK(item.url));
        let gallery = '[]'; if (x.gallery) { try { const list = typeof x.gallery === 'string' ? JSON.parse(x.gallery) : x.gallery; if (!Array.isArray(list) || list.length > 24 || !list.every(galleryItemOK)) throw Error('Invalid gallery'); gallery = JSON.stringify(list); } catch { return j(res, 400, { error: 'Gallery must contain valid image URLs' }); } }
        const parseJSON = (val, maxLen = 50) => { if (!val) return '[]'; try { const parsed = typeof val === 'string' ? JSON.parse(val) : val; if (Array.isArray(parsed)) return parsed.length <= maxLen ? JSON.stringify(parsed) : '[]'; if (parsed && typeof parsed === 'object') return JSON.stringify(parsed); return '[]'; } catch { return '[]'; } };
        const features = parseJSON(x.features, 50);
        const specifications = parseJSON(x.specifications, 50);
        const faqs = parseJSON(x.faqs, 50);
        const sectionsConfig = parseJSON(x.sections_config, 50);
        const relatedSlugs = parseJSON(x.related_slugs, 50);
        const heroCtaLabel = str(x.hero_cta_label, 80);
        const heroCtaLink = str(x.hero_cta_link, 250);
        const secondaryCtaLabel = str(x.secondary_cta_label, 80);
        const secondaryCtaLink = str(x.secondary_cta_link, 250);
        const imagePosition = ['right', 'left', 'full', 'top'].includes(x.image_position) ? x.image_position : 'right';
        const socialImage = imgOK(x.social_image) ? str(x.social_image, 700) : '';
        const canonicalUrl = str(x.canonical_url, 500);
        if (!title || !imgOK(image)) return j(res, 400, { error: 'Title required and image must be a permitted URL' });
        const priorEntry = await db.prepare('SELECT * FROM entries WHERE type=? AND slug=?').get(type, slug);
        if (priorEntry) {
          await db.prepare('INSERT INTO revisions(entity_type,entity_key,data,created_by) VALUES(?,?,?,?)').run('entry', type + '/' + slug, JSON.stringify(priorEntry), user.email);
          await pruneRevisions('entry', type + '/' + slug);
        }
        await db.prepare(`INSERT INTO entries(type,slug,title,summary,body,image,status,seo_title,seo_description,category,location,job_type,technology,gallery,features,specifications,faqs,sections_config,hero_cta_label,hero_cta_link,secondary_cta_label,secondary_cta_link,image_position,social_image,canonical_url,related_slugs) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(type,slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,body=excluded.body,image=excluded.image,status=excluded.status,seo_title=excluded.seo_title,seo_description=excluded.seo_description,category=excluded.category,location=excluded.location,job_type=excluded.job_type,technology=excluded.technology,gallery=excluded.gallery,features=excluded.features,specifications=excluded.specifications,faqs=excluded.faqs,sections_config=excluded.sections_config,hero_cta_label=excluded.hero_cta_label,hero_cta_link=excluded.hero_cta_link,secondary_cta_label=excluded.secondary_cta_label,secondary_cta_link=excluded.secondary_cta_link,image_position=excluded.image_position,social_image=excluded.social_image,canonical_url=excluded.canonical_url,related_slugs=excluded.related_slugs,updated_at=CURRENT_TIMESTAMP`).run(type, slug, title, summary, text, image, status, seoTitle, seoDesc, category, location, jobType, technology, gallery, features, specifications, faqs, sectionsConfig, heroCtaLabel, heroCtaLink, secondaryCtaLabel, secondaryCtaLink, imagePosition, socialImage, canonicalUrl, relatedSlugs);
        await audit(user.id, 'entry.saved', type + '/' + slug + '/' + status); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/entries' && method === 'DELETE') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' }); const x = await jsonBody(req), id = Number(x.id); if (!Number.isSafeInteger(id) || id < 1) return j(res, 400, { error: 'Invalid ID' });
        await db.prepare('DELETE FROM entries WHERE id=?').run(id); await audit(user.id, 'entry.deleted', id); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/layouts' && method === 'GET') return j(res, 200, await db.prepare('SELECT slug,title,status,seo_title,seo_description,updated_at FROM layouts ORDER BY slug').all());
      if (p === '/api/admin/layout' && method === 'GET') {
        const slug = url.searchParams.get('slug') || ''; if (!/^[a-z0-9-]{1,110}$/.test(slug)) return j(res, 400, { error: 'Invalid page' }); const row = await db.prepare('SELECT * FROM layouts WHERE slug=?').get(slug); return j(res, 200, row ? { ...row, blocks: JSON.parse(row.blocks) } : null);
      }
      if (p === '/api/admin/layout' && method === 'PUT') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' });
        const x = await jsonBody(req, 500000), slug = str(x.slug, 110).toLowerCase(), title = str(x.title, 180), blocks = x.blocks, status = x.status === 'published' ? 'published' : 'draft';
        if (!/^[a-z0-9-]{1,110}$/.test(slug) || !title || !validateBlocks(blocks)) return j(res, 400, { error: 'Invalid page layout' });
        const priorLayout = await db.prepare('SELECT * FROM layouts WHERE slug=?').get(slug);
        if (priorLayout) {
          await db.prepare('INSERT INTO revisions(entity_type,entity_key,data,created_by) VALUES(?,?,?,?)').run('layout', slug, JSON.stringify(priorLayout), user.email);
          await pruneRevisions('layout', slug);
        }
        await db.prepare(`INSERT INTO layouts(slug,title,blocks,status,seo_title,seo_description) VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,blocks=excluded.blocks,status=excluded.status,seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=CURRENT_TIMESTAMP`).run(slug, title, JSON.stringify(blocks), status, str(x.seo_title, 180), str(x.seo_description, 300));
        await audit(user.id, 'page.saved', slug + '/' + status); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/layout' && method === 'DELETE') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' }); const x = await jsonBody(req); if (!/^[a-z0-9-]{1,110}$/.test(x.slug || '')) return j(res, 400, { error: 'Invalid page' });
        await db.prepare('DELETE FROM layouts WHERE slug=?').run(x.slug); await audit(user.id, 'page.deleted', x.slug); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/media' && method === 'GET') return j(res, 200, (await db.prepare('SELECT id,filename,alt,size,created_at FROM media ORDER BY id DESC LIMIT 1000').all()).map(x => ({ ...x, url: '/media/' + x.filename })));
      if (p === '/api/admin/media' && method === 'POST') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' }); if (limited(req, 'media', 18)) return j(res, 429, { error: 'Upload limit reached' });
        const x = await jsonBody(req, 7 * 1024 * 1024); const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(x.data || '')); if (!m || m[2].length > 6 * 1024 * 1024) return j(res, 400, { error: 'PNG, JPEG or WebP under 4MB only' });
        const buf = Buffer.from(m[2], 'base64'); if (buf.length < 20 || buf.length > 4 * 1024 * 1024) return j(res, 400, { error: 'File size not allowed' });
        const valid = m[1] === 'png' ? buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) : m[1] === 'jpeg' ? buf[0] === 255 && buf[1] === 216 && buf[2] === 255 : buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
        if (!valid) return j(res, 400, { error: 'Invalid image signature' });
        const ext = m[1] === 'jpeg' ? 'jpg' : m[1], filename = hex(16).toString('hex') + '.' + ext;
        fs.writeFileSync(path.join(storage, 'media', filename), buf, { flag: 'wx', mode: 0o600 });
        const mRec = await db.prepare('INSERT INTO media(filename,mime,alt,size) VALUES(?,?,?,?) RETURNING id').get(filename, ext === 'jpg' ? 'image/jpeg' : 'image/' + ext, str(x.alt, 220), buf.length);
        await audit(user.id, 'media.uploaded', filename); return j(res, 200, { ok: true, id: mRec?.id, url: '/media/' + filename, filename, alt: str(x.alt, 220), size: buf.length });
      }
      if (p === '/api/admin/media' && method === 'PATCH') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' }); const x = await jsonBody(req), id = Number(x.id); if (!Number.isSafeInteger(id) || id <= 0) return j(res, 400, { error: 'Invalid ID' });
        await db.prepare('UPDATE media SET alt=? WHERE id=?').run(str(x.alt, 220), id); await audit(user.id, 'media.alt_updated', id); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/media' && method === 'DELETE') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' }); const x = await jsonBody(req), row = await db.prepare('SELECT filename FROM media WHERE id=?').get(Number(x.id)); if (!row) return j(res, 404, { error: 'Media not found' });
        await db.prepare('DELETE FROM media WHERE id=?').run(Number(x.id)); try { fs.unlinkSync(path.join(storage, 'media', row.filename)) } catch { } await audit(user.id, 'media.deleted', row.filename); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/inquiries' && method === 'GET') return j(res, 200, await db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 1000').all());
      if (p === '/api/admin/inquiries' && method === 'PATCH') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' }); const x = await jsonBody(req), id = Number(x.id); if (!Number.isSafeInteger(id) || !['new', 'in-progress', 'replied', 'closed'].includes(x.status)) return j(res, 400, { error: 'Invalid enquiry' });
        await db.prepare('UPDATE inquiries SET status=?,notes=? WHERE id=?').run(x.status, str(x.notes, 2000), id); await audit(user.id, 'inquiry.updated', id); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/inquiries' && method === 'DELETE') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        const x = await jsonBody(req), id = Number(x.id); if (!Number.isSafeInteger(id) || id <= 0) return j(res, 400, { error: 'Invalid ID' });
        await db.prepare('DELETE FROM inquiries WHERE id=?').run(id); await audit(user.id, 'inquiry.deleted', id); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/applications' && method === 'GET') return j(res, 200, (await db.prepare('SELECT * FROM applications ORDER BY id DESC LIMIT 1000').all()).map(x => ({ ...x, resume_filename: x.resume_filename ? 'available' : '' })));
      if (p === '/api/admin/applications' && method === 'PATCH') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' }); const x = await jsonBody(req), id = Number(x.id); if (!Number.isSafeInteger(id) || !['new', 'review', 'interview', 'rejected', 'hired'].includes(x.status)) return j(res, 400, { error: 'Invalid application' });
        await db.prepare('UPDATE applications SET status=? WHERE id=?').run(x.status, id); await audit(user.id, 'application.updated', id); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/applications' && method === 'DELETE') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' });
        const x = await jsonBody(req), id = Number(x.id); if (!Number.isSafeInteger(id) || id <= 0) return j(res, 400, { error: 'Invalid ID' });
        const record = await db.prepare('SELECT resume_filename FROM applications WHERE id=?').get(id);
        await db.prepare('DELETE FROM applications WHERE id=?').run(id);
        if (record?.resume_filename) try { fs.unlinkSync(path.join(storage, 'private', record.resume_filename)) } catch { }
        await audit(user.id, 'application.deleted', id); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/resume' && method === 'GET') {
        if (!allowed(req, user, 'editor')) return j(res, 403, { error: 'Editor required' }); const id = Number(url.searchParams.get('id')); const row = await db.prepare('SELECT resume_filename FROM applications WHERE id=?').get(id);
        if (!row || !row.resume_filename) return j(res, 404, { error: 'Resume not found' });
        res.setHeader('Content-Disposition', 'attachment; filename="applicant-' + id + '.pdf"'); res.setHeader('Cache-Control', 'private, no-store'); return streamFile(res, path.join(storage, 'private', row.resume_filename), 'application/pdf');
      }
      if (p === '/api/admin/users' && method === 'GET') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' }); return j(res, 200, await db.prepare('SELECT id,email,role,active,created_at FROM users ORDER BY id').all());
      }
      if (p === '/api/admin/users' && method === 'POST') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' }); const x = await jsonBody(req), email = str(x.email, 254).toLowerCase(), pass = String(x.password || ''), role = x.role;
        if (!emailOK(email) || pass.length < 16 || pass.length > 128 || !ROLES[role]) return j(res, 400, { error: 'Valid email, role and 16+ character password required' });
        try { await db.prepare('INSERT INTO users(email,password_hash,role) VALUES(?,?,?)').run(email, encodePassword(pass), role); } catch { return j(res, 409, { error: 'Email already exists' }); } await audit(user.id, 'user.created', email); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/users' && method === 'PATCH') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' }); const x = await jsonBody(req), id = Number(x.id), role = x.role; if (!Number.isSafeInteger(id) || !ROLES[role]) return j(res, 400, { error: 'Invalid user' });
        const current = await db.prepare('SELECT role,active FROM users WHERE id=?').get(id); if (!current) return j(res, 404, { error: 'User not found' });
        const active = x.active === false ? 0 : 1; if (user.id === id && (role !== 'admin' || !active)) return j(res, 400, { error: 'Cannot remove own admin privileges' });
        if (current.role === 'admin' && current.active === 1 && (role !== 'admin' || !active) && (await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").get()).n <= 1) return j(res, 400, { error: 'Cannot remove last administrator' });
        await db.prepare('UPDATE users SET role=?,active=? WHERE id=?').run(role, active, id); await audit(user.id, 'user.updated', id); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/password' && method === 'POST') {
        const x = await jsonBody(req), old = String(x.current || ''), next = String(x.next || ''); const row = await db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id);
        if (!verifyPassword(old, row.password_hash) || next.length < 16 || next.length > 128) return j(res, 400, { error: 'Current password incorrect or new password too short' });
        await db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(encodePassword(next), user.id); await db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(user.id, sha(cookies(req).sid)); await audit(user.id, 'auth.password-changed'); return j(res, 200, { ok: true });
      }
      if (p === '/api/admin/audit' && method === 'GET') {
        if (!allowed(req, user, 'admin')) return j(res, 403, { error: 'Admin required' }); return j(res, 200, await db.prepare('SELECT a.*,u.email FROM audit a LEFT JOIN users u ON a.user_id=u.id ORDER BY a.id DESC LIMIT 500').all());
      }
      return j(res, 404, { error: 'Admin route not found' });
    }
    if ((method === 'GET' || method === 'HEAD') && p.startsWith('/media/')) {
      const filename = p.slice(7); if (!/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(filename)) return j(res, 404, { error: 'Not found' });
      const row = await db.prepare('SELECT mime FROM media WHERE filename=?').get(filename); if (!row) return j(res, 404, { error: 'Not found' });
      const f = path.join(storage, 'media', filename); if (!fs.existsSync(f)) return j(res, 404, { error: 'Not found' }); return streamFile(res, f, row.mime, { 'Cache-Control': 'public, max-age=604800, immutable' });
    }
    if (method === 'GET' && p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(`User-agent: *\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${siteUrl}/sitemap.xml\n`); }
    if (method === 'GET' && p === '/sitemap.xml') {
      const paths = ['/', '/about', '/services', '/industries', '/products', '/projects', '/blog', '/careers', '/contact', '/privacy', '/terms', '/products/explore-products', '/products/explore-services', '/contact/request-for-quote'];
      for (const row of await db.prepare("SELECT type,slug FROM entries WHERE status='published'").all()) paths.push('/' + row.type + '/' + row.slug);
      for (const row of await db.prepare("SELECT slug FROM layouts WHERE status='published'").all()) if (!paths.includes('/' + row.slug)) paths.push('/' + row.slug);
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }); return res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + paths.map(s => '<url><loc>' + e(siteUrl + s) + '</loc></url>').join('') + '</urlset>');
    }
    if (method !== 'GET' && method !== 'HEAD') return j(res, 404, { error: 'Route not found' });
    const f = path.resolve(pub, '.' + p); if (f.startsWith(pub + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile()) return streamFile(res, f, MIME[path.extname(f)] || 'application/octet-stream', { 'Cache-Control': p === '/index.html' ? 'no-cache' : 'public, max-age=3600' });
    if (!p.startsWith('/api/') && !path.extname(p) && /^\/[a-z0-9/-]*$/.test(p)) {
      // Render crawlable HTML metadata and initial headings; client hydrates page content.
      const builtins = new Set(['/', '/about', '/services', '/industries', '/products', '/projects', '/blog', '/careers', '/contact', '/privacy', '/terms', '/admin', '/products/explore-products', '/products/explore-services', '/contact/request-for-quote']);
      let found = builtins.has(p);
      if (!found) {
        const dynamic = /^\/(services|industries|products|careers|blog|projects|pages|testimonials|team|technologies)\/([a-z0-9-]+)$/.exec(p); if (dynamic) found = !!(await db.prepare('SELECT id FROM entries WHERE type=? AND slug=? AND status=?').get(dynamic[1], dynamic[2], 'published'));
        if (!found) found = !!(await db.prepare('SELECT slug FROM layouts WHERE slug=? AND status=?').get(p.slice(1).replaceAll('/', '-'), 'published'));
      }
      const html = await webHtml(p); res.writeHead(found ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); return res.end(html);
    }
    return j(res, 404, { error: 'Not found' });
  } catch (err) { console.error('Request error', err); j(res, err.httpCode || 500, { error: err.httpCode ? err.message : 'Server request failed' }); }
};
const server = http.createServer(handleRequest);
// Cross-platform entry-point detection: file:// string concatenation fails for
// Windows paths and directories containing spaces, #, % or Unicode characters.
// This previously caused the process to exit cleanly WITHOUT starting the app.
const invokedAsMain = Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsMain) {
  let bindRetries = 0;
  server.on('error', err => {
    if (err.code === 'EADDRINUSE' && bindRetries < 3) {
      bindRetries++;
      console.warn(`[AZAROTH] Port ${port} is busy, retrying in 500ms (attempt ${bindRetries}/3)...`);
      setTimeout(() => {
        try { server.close(); } catch {}
        server.listen(port, '0.0.0.0');
      }, 500);
      return;
    }
    if (err.code === 'EADDRINUSE') console.error(`AZAROTH cannot start: port ${port} is already in use. Set PORT to another value in .env or terminate the active process.`);
    else if (err.code === 'EACCES') console.error(`AZAROTH cannot bind to port ${port}: permission denied.`);
    else console.error('AZAROTH server startup failed:', err);
    process.exit(1);
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`AZAROTH is running at http://localhost:${port}`);
    console.log(`CMS: http://localhost:${port}/admin`);
  });

  const gracefulShutdown = () => {
    server.close(() => {
      if (pool) pool.end().catch(() => {}).finally(() => process.exit(0));
      else process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

export default function handler(req, res) {
  return handleRequest(req, res);
}
export { server, db, settings, handleRequest };
