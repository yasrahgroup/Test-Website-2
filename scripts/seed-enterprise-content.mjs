import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const storageDir = path.join(root, 'storage');
const mediaDir = path.join(storageDir, 'media');
const dbPath = path.join(storageDir, 'website.sqlite');

fs.mkdirSync(mediaDir, { recursive: true, mode: 0o700 });

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

// 1. Seed Media Assets from public/images
const publicImagesDir = path.join(root, 'public', 'images');
const mediaAssets = [
  { file: 'about_corporate_studio.jpg', alt: 'AZAROTH Collaborative Studio & Engineering Hub' },
  { file: 'ai_automation_engine.jpg', alt: 'Enterprise AI & Automation Engine' },
  { file: 'mobile_experience_showcase.jpg', alt: 'High-Performance Mobile Platform Experience' },
  { file: 'sentinel_platform_hero.jpg', alt: 'Cloud Sentinel Security & Infrastructure Platform' }
];

const mediaInsert = db.prepare('INSERT OR IGNORE INTO media(filename, mime, alt, size) VALUES(?, ?, ?, ?)');
const publicMediaMap = {};

for (const asset of mediaAssets) {
  const src = path.join(publicImagesDir, asset.file);
  if (fs.existsSync(src)) {
    const stat = fs.statSync(src);
    // Use consistent 32-hex hash based on filename for idempotent runs
    const hash = crypto.createHash('md5').update('azaroth_' + asset.file).digest('hex') + '.jpg';
    const dest = path.join(mediaDir, hash);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
    mediaInsert.run(hash, 'image/jpeg', asset.alt, stat.size);
    publicMediaMap[asset.file] = '/media/' + hash;
    console.log(`✓ Media asset registered: ${asset.file} -> /media/${hash}`);
  }
}

// 2. Global settings
const settingsMap = {
  brand: 'AZAROTH TECH-HIVE',
  brandTitle: 'AZAROTH',
  brandSubtitle: 'TECH-HIVE',
  footerBrandTitle: 'AZAROTH',
  footerBrandSubtitle: 'TECH-HIVE',
  tagline: 'Ideas. Technology. Impact.',
  heroEyebrow: 'SOFTWARE ENGINEERING & DIGITAL SOLUTIONS',
  heroTitle: 'Innovative Software Solutions — Technology designed around the *way you work.*',
  heroDescription: 'Azaroth Tech-Hive helps organisations address practical business challenges through custom software, web and mobile applications, cloud and DevOps services, systems integration, and workflow automation. We begin by understanding your goals, then work with you to define a solution that fits your requirements, resources, and operating environment.',
  heroImage: '/images/sentinel_platform_hero.jpg',
  aboutTitle: 'Start with the challenge. *Build toward the right solution.*',
  aboutDescription: 'Effective technology begins with a clear understanding of the problem it needs to solve. We take time to learn about your workflows, users, existing systems, and priorities before recommending an approach. The result should be useful in day-to-day operations, understandable to the people who rely on it, and maintainable as your needs evolve.',
  aboutImage: '/images/about_corporate_studio.jpg',
  mission: 'Understand the challenge. Define the right solution. Build with purpose.',
  contactEmail: 'contact@azaroth-techhive.com',
  contactPhone: '+1 (555) 019-2834',
  contactLocation: 'London · New York · Worldwide',
  footerDescription: 'Ideas become impact when technology meets imagination. Building purposeful digital experiences for tomorrow.',
  homeProductsEnabled: 'true',
  homeProductsTitle: 'Software for *Specific Operational Workflows*',
  homeProductsDescription: 'Azaroth Tech-Hive is developing products intended to support defined business needs. Explore our verified capabilities and current product status.',
  homeServicesEyebrow: 'WHAT WE DO',
  homeServicesTitle: 'Technology Solutions, *Thoughtfully Built*',
  homeServicesDescription: 'From ambitious ideas to reliable products, our teams bring the right technology to every challenge.',
  homeIndustriesEyebrow: 'OUR EXPERTISE',
  homeIndustriesTitle: 'Technology for *Every Possibility*',
  homeIndustriesDescription: 'Focused digital solutions for organizations across a wide range of industries.',
  homeApproachEyebrow: 'OUR APPROACH',
  homeApproachTitle: 'Built Around People. *Driven by Purpose.*',
  homeApproachDescription: 'A collaborative way of working, grounded in clarity, creativity and lasting value.',
  ctaEyebrow: "LET'S MAKE IT HAPPEN",
  ctaTitle: "Have an idea? Let's build *something great.*",
  ctaButtonText: 'Start a conversation',
  ctaButtonLink: '/contact',
  primary: '#7A0C16',
  gold: '#d5a13c',
  orange: '#f47721',
  background: '#faf8f4',
  ink: '#171b2c',
  logo: '/logo.png',
  cursorEnabled: 'true',
  cursorStyle: 'gold-ring',
  cursorSize: '27',
  cursorLag: '0.22',
  animationPreset: 'elegant'
};

const setStmt = db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
for (const [k, v] of Object.entries(settingsMap)) {
  setStmt.run(k, v);
}
console.log('✓ Settings updated');

// 3. Enrich products
const enrichedProducts = [
  {
    slug: 'fitness-management-system',
    title: 'Fitness Management System',
    category: 'Commercial SaaS',
    summary: 'Membership lifecycle, automated billing, and branch-level scheduling for fitness operators.',
    body: `The Fitness Management System is designed to support gyms, health clubs, and multi-location boutique studios with member management, renewals, class scheduling, and branch-level activity through a streamlined, cohesive workflow.\n\nFrom online member onboarding to biometric or RFID turnstile integration, it unifies operations across single or multi-tenant deployments.`,
    technology: 'Node.js, React, SQLite, GraphQL, Webhooks',
    image: '/images/mobile_experience_showcase.jpg',
    image_position: 'right',
    hero_cta_label: 'Schedule Platform Demo',
    hero_cta_link: '/contact',
    secondary_cta_label: 'Explore Architecture',
    secondary_cta_link: '/contact',
    gallery: JSON.stringify([
      { url: '/images/mobile_experience_showcase.jpg', caption: 'Mobile Member Pass & Booking UI', alt: 'Mobile app screen' },
      { url: '/images/ai_automation_engine.jpg', caption: 'Branch Manager Dashboard & Analytics', alt: 'Analytics dashboard' }
    ]),
    features: JSON.stringify([
      { icon: 'users', title: 'Member Records & Retention', description: 'Automated membership status tracking, contract renewals, and payment exception workflows.' },
      { icon: 'calendar', title: 'Class & Trainer Scheduling', description: 'Real-time timetable booking with waitlist automation and instructor capacity management.' },
      { icon: 'credit-card', title: 'Recurring Billing Integration', description: 'Seamless reconciliation with Stripe, direct debits, and local merchant payment processors.' },
      { icon: 'building-2', title: 'Multi-Branch Synchronization', description: 'Centralized administration with fine-grained role permissions for location managers.' }
    ]),
    specifications: JSON.stringify([
      { group: 'Deployment', label: 'Cloud Architecture', value: 'Multi-Tenant AWS / GCP or Isolated On-Prem' },
      { group: 'Deployment', label: 'Database Engine', value: 'High-Performance Relational SQL / SQLite' },
      { group: 'Security', label: 'Access Control', value: 'Role-Based RBAC with Audit Logging' },
      { group: 'Integrations', label: 'Hardware Protocols', value: 'Wiegand / OSDP Turnstiles & Webhook Relays' }
    ]),
    faqs: JSON.stringify([
      { question: 'Can this platform support multiple club locations?', answer: 'Yes. The system is designed with a hierarchical tenancy model allowing unified corporate reporting alongside individual branch controls.' },
      { question: 'How are recurring payments and failed charges handled?', answer: 'Automated dunning workflows attempt smart retries and notify members via email and SMS before suspending access.' },
      { question: 'What hardware is required for access control?', answer: 'The platform integrates with standard IP controllers, barcode scanners, and RFID readers via secure local relays.' }
    ]),
    seo_title: 'Fitness Management System — Multi-Location Gym & Studio Platform',
    seo_description: 'Streamline member renewals, class booking, and multi-branch operations with the Azaroth Fitness Management System.',
    status: 'published'
  },
  {
    slug: 'omnichannel-commerce-platform',
    title: 'Omnichannel Commerce Platform',
    category: 'Enterprise Commerce',
    summary: 'Coordinate products, inventory, and orders seamlessly across retail stores and digital channels.',
    body: `The Omnichannel Commerce Platform provides retailers with a unified catalogue, distributed inventory visibility, and intelligent order routing across online storefronts, physical retail POS, and third-party marketplaces.\n\nEngineered for high-volume transactions, it synchronizes stock levels in real time to prevent overselling and optimizes fulfilment from nearest warehouses.`,
    technology: 'TypeScript, GraphQL, Redis, Postgres, Microservices',
    image: '/images/ai_automation_engine.jpg',
    image_position: 'left',
    hero_cta_label: 'Request Technical Walkthrough',
    hero_cta_link: '/contact',
    secondary_cta_label: 'View Integration Specs',
    secondary_cta_link: '/contact',
    gallery: JSON.stringify([
      { url: '/images/ai_automation_engine.jpg', caption: 'Real-Time Order Routing & Stock Matrix', alt: 'Inventory console' },
      { url: '/images/mobile_experience_showcase.jpg', caption: 'Store Associate Mobile Fulfilment App', alt: 'Mobile UI' }
    ]),
    features: JSON.stringify([
      { icon: 'package', title: 'Unified Product Information', description: 'Single source of truth for SKUs, variant attributes, and multi-language localized descriptions.' },
      { icon: 'layers-3', title: 'Distributed Inventory Map', description: 'Real-time stock synchronization across central distribution centers and store backrooms.' },
      { icon: 'truck', title: 'Intelligent Order Routing', description: 'Automated allocation to optimal fulfilment nodes based on shipping cost and proximity.' },
      { icon: 'refresh-cw', title: 'Cross-Channel Returns', description: 'Buy-online-return-in-store (BORIS) workflows with immediate inventory restock.' }
    ]),
    specifications: JSON.stringify([
      { group: 'Performance', label: 'Order Throughput', value: '15,000+ Orders / Min Benchmark' },
      { group: 'Architecture', label: 'Service Model', value: 'Event-Driven Headless Microservices' },
      { group: 'Integrations', label: 'ERP Connectors', value: 'SAP, NetSuite, Microsoft Dynamics 365' },
      { group: 'Compliance', label: 'Data Standards', value: 'PCI-DSS Level 1 & GDPR Certified' }
    ]),
    faqs: JSON.stringify([
      { question: 'Does the platform support headless frontend storefronts?', answer: 'Yes. Complete GraphQL and REST APIs allow connection to custom Next.js storefronts, native iOS/Android apps, and kiosk displays.' },
      { question: 'How is inventory synchronized during flash sales?', answer: 'Redis-backed distributed locks and transactional order queues guarantee stock reservations without duplicate allocations.' }
    ]),
    seo_title: 'Omnichannel Commerce Platform — Real-Time Retail Order & Inventory Management',
    seo_description: 'Unify retail inventory, distributed order routing, and multi-channel catalogues with Azaroth Tech-Hive.',
    status: 'published'
  },
  {
    slug: 'learning-management-platform',
    title: 'Learning Management Platform',
    category: 'EdTech & Corporate Training',
    summary: 'Coordinate curriculum delivery, role-based training paths, and compliance certifications.',
    body: `The Learning Management Platform helps modern organizations, academies, and professional bodies organize interactive courses, monitor learner progression, and enforce compliance certifications.\n\nFeaturing rich multimedia course builders and automated quiz assessments, it provides administrators with deep analytics into team skill development.`,
    technology: 'React, Node.js, Python, PostgreSQL, SCORM/xAPI',
    image: '/images/sentinel_platform_hero.jpg',
    image_position: 'right',
    hero_cta_label: 'Explore Learning Platform',
    hero_cta_link: '/contact',
    secondary_cta_label: 'Download Curriculum Guide',
    secondary_cta_link: '/contact',
    gallery: JSON.stringify([
      { url: '/images/sentinel_platform_hero.jpg', caption: 'Interactive Learning Dashboard & Course Catalog', alt: 'LMS interface' },
      { url: '/images/about_corporate_studio.jpg', caption: 'Collaborative Study Groups & Grading Rubric', alt: 'Grading console' }
    ]),
    features: JSON.stringify([
      { icon: 'book-open', title: 'Modular Course Builder', description: 'Drag-and-drop lesson authoring supporting video, documents, quizzes, and SCORM modules.' },
      { icon: 'award', title: 'Automated Certification', description: 'Dynamic, verifiable PDF certificates generated automatically upon passing requirements.' },
      { icon: 'users', title: 'Role-Based Learning Paths', description: 'Targeted onboarding tracks assigned by department, seniority, or compliance requirements.' },
      { icon: 'bar-chart-2', title: 'Executive Progress Reporting', description: 'Comprehensive audit trails for compliance audits and team completion benchmarks.' }
    ]),
    specifications: JSON.stringify([
      { group: 'Standards', label: 'eLearning Compliance', value: 'SCORM 1.2, SCORM 2004, xAPI / Tin Can' },
      { group: 'Authentication', label: 'Enterprise SSO', value: 'SAML 2.0, Okta, Microsoft Entra ID, Google Workspace' },
      { group: 'Media', label: 'Video Streaming', value: 'Adaptive HLS Bitrate with Watermarking' }
    ]),
    faqs: JSON.stringify([
      { question: 'Can existing SCORM course packages be uploaded?', answer: 'Yes. The system natively parses and plays SCORM 1.2 and SCORM 2004 packages with full completion tracking.' },
      { question: 'How are enterprise single sign-on (SSO) credentials mapped?', answer: 'Users are provisioned Just-In-Time (JIT) from your identity provider with roles mapped to Active Directory groups.' }
    ]),
    seo_title: 'Learning Management Platform — Corporate Training & Certification',
    seo_description: 'Deliver engaging onboarding, compliance courses, and skill assessments with the Azaroth Learning Management Platform.',
    status: 'published'
  },
  {
    slug: 'healthcare-management-system',
    title: 'Healthcare Management System',
    category: 'Architecture Discovery',
    summary: 'A developing framework for coordinated clinic administration, triage workflows, and diagnostic integration.',
    body: `The Healthcare Management System is an architectural exploration into streamlining clinic administration, appointment coordination, and diagnostic lab telemetry with rigorous data isolation.\n\nDesigned around zero-trust security principles, the platform investigates patient intake automation, scheduling optimizations, and encrypted teleconsultation bridges.`,
    technology: 'Node.js, PostgreSQL, eBPF, WebRTC, OpenTelemetry',
    image: '/images/about_corporate_studio.jpg',
    image_position: 'left',
    hero_cta_label: 'Discuss Architecture Discovery',
    hero_cta_link: '/contact',
    secondary_cta_label: 'Compliance Roadmap',
    secondary_cta_link: '/contact',
    gallery: JSON.stringify([
      { url: '/images/about_corporate_studio.jpg', caption: 'Clinical Consultation Workspace Concept', alt: 'Clinic concept' },
      { url: '/images/sentinel_platform_hero.jpg', caption: 'Diagnostic Telemetry Pipeline Map', alt: 'Pipeline visualization' }
    ]),
    features: JSON.stringify([
      { icon: 'calendar', title: 'Coordinated Scheduling', description: 'Conflict-free appointment allocation across multi-disciplinary physician practices.' },
      { icon: 'file-text', title: 'Patient Intake Coordination', description: 'Digital pre-registration workflows reducing front-desk wait times and transcription errors.' },
      { icon: 'activity', title: 'Diagnostic Lab Telemetry', description: 'Standardized interfaces connecting pathology and diagnostic imaging reports directly to provider charts.' },
      { icon: 'shield-check', title: 'Encrypted Teleconsultation', description: 'Peer-to-peer WebRTC video consultations with end-to-end media encryption.' }
    ]),
    specifications: JSON.stringify([
      { group: 'Compliance', label: 'Regulatory Framework', value: 'Designed for HIPAA & GDPR Technical Safeguards' },
      { group: 'Security', label: 'Data Encryption', value: 'AES-256 at Rest & TLS 1.3 in Transit' },
      { group: 'Auditability', label: 'Access Logs', value: 'Append-Only Cryptographic Audit Trail' }
    ]),
    faqs: JSON.stringify([
      { question: 'Is this platform certified for live clinical diagnostic use today?', answer: 'This product represents an architecture discovery and research framework. Full clinical production deployments require local regulatory clearance.' },
      { question: 'How is sensitive health information isolated?', answer: 'Each clinic instance utilizes dedicated database tenant isolation and field-level encryption for identifiers.' }
    ]),
    seo_title: 'Healthcare Management System — Clinic Workflow & Telemetry Concept',
    seo_description: 'Explore the architectural concept for secure, connected clinical administration from Azaroth Tech-Hive.',
    status: 'published'
  }
];

const upsertEntry = db.prepare(`
  INSERT INTO entries (type, slug, title, summary, body, image, status, seo_title, seo_description, category, location, job_type, technology, gallery, features, specifications, faqs, sections_config, hero_cta_label, hero_cta_link, secondary_cta_label, secondary_cta_link, image_position, social_image, canonical_url, related_slugs)
  VALUES ('products', ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, '', '', '[]')
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    summary=excluded.summary,
    body=excluded.body,
    image=excluded.image,
    status=excluded.status,
    seo_title=excluded.seo_title,
    seo_description=excluded.seo_description,
    category=excluded.category,
    technology=excluded.technology,
    gallery=excluded.gallery,
    features=excluded.features,
    specifications=excluded.specifications,
    faqs=excluded.faqs,
    hero_cta_label=excluded.hero_cta_label,
    hero_cta_link=excluded.hero_cta_link,
    secondary_cta_label=excluded.secondary_cta_label,
    secondary_cta_link=excluded.secondary_cta_link,
    image_position=excluded.image_position,
    updated_at=CURRENT_TIMESTAMP
`);

for (const p of enrichedProducts) {
  upsertEntry.run(
    p.slug,
    p.title,
    p.summary,
    p.body,
    p.image,
    p.status,
    p.seo_title,
    p.seo_description,
    p.category,
    p.technology,
    p.gallery,
    p.features,
    p.specifications,
    p.faqs,
    p.hero_cta_label,
    p.hero_cta_link,
    p.secondary_cta_label,
    p.secondary_cta_link,
    p.image_position
  );
  console.log(`✓ Product enriched: ${p.title} (${p.slug})`);
}

// 4. Seed Services
const services = [
  {
    slug: 'custom-software-development',
    title: 'Custom Software Development',
    summary: 'Tailored web, cloud, and core applications engineered around your operational requirements.',
    body: 'We engineer bespoke digital systems designed to eliminate operational bottlenecks, automate manual tasks, and scale seamlessly with business demand.\n\nFrom initial architecture discovery to deployment and continuous delivery, our cross-functional engineering teams build maintainable, well-tested software using modern languages and proven architectural patterns.',
    image: '/images/ai_automation_engine.jpg',
    category: 'Software Engineering',
    features: JSON.stringify([
      { icon: 'code-2', title: 'Architecture Discovery', description: 'Technical scoping and domain modeling to define clean boundaries and scalable foundations.' },
      { icon: 'layers-3', title: 'Full-Stack Engineering', description: 'End-to-end implementation from accessible frontend interfaces to resilient backend services.' },
      { icon: 'network', title: 'API & Microservices', description: 'Secure REST and GraphQL interfaces enabling frictionless system integration.' },
      { icon: 'check-circle-2', title: 'Automated Testing', description: 'Comprehensive unit, integration, and end-to-end test coverage for production reliability.' }
    ]),
    faqs: JSON.stringify([
      { question: 'What is your typical project kickoff process?', answer: 'We begin with a 1-2 week discovery sprint to document technical constraints, user workflows, and success metrics before writing production code.' },
      { question: 'Who owns the intellectual property?', answer: 'You own 100% of the custom source code, documentation, and architecture assets developed for your project.' }
    ]),
    hero_cta_label: 'Discuss Your Project',
    hero_cta_link: '/contact',
    status: 'published'
  },
  {
    slug: 'cloud-devops-engineering',
    title: 'Cloud & DevOps Engineering',
    summary: 'Resilient cloud infrastructure, automated CI/CD pipelines, and zero-downtime releases.',
    body: 'Modern cloud environments must balance performance, cost predictability, and operational security.\n\nWe design and manage containerized infrastructure across AWS, Google Cloud, and private enterprise VPCs, using Infrastructure as Code (Terraform) and zero-downtime deployment pipelines with full observability.',
    image: '/images/sentinel_platform_hero.jpg',
    category: 'Cloud Infrastructure',
    features: JSON.stringify([
      { icon: 'cloud', title: 'Infrastructure as Code', description: 'Deterministic, reproducible environments managed via Terraform and GitOps.' },
      { icon: 'refresh-cw', title: 'CI/CD Automation', description: 'Automated build, test, and zero-downtime canary deployment pipelines.' },
      { icon: 'activity', title: 'Observability & APM', description: 'Distributed tracing, structured metrics, and proactive alerting with OpenTelemetry.' },
      { icon: 'shield-check', title: 'Security Hardening', description: 'Network isolation, secret rotation, and continuous vulnerability scanning.' }
    ]),
    faqs: JSON.stringify([
      { question: 'Can you assist with cloud migration from legacy servers?', answer: 'Yes. We plan phased, risk-mitigated migrations with comprehensive fallback plans and zero unexpected downtime.' }
    ]),
    hero_cta_label: 'Consult Cloud Architects',
    hero_cta_link: '/contact',
    status: 'published'
  },
  {
    slug: 'web-mobile-applications',
    title: 'Web & Mobile Applications',
    summary: 'High-performance responsive web applications and cross-platform mobile experiences.',
    body: 'We craft intuitive, responsive digital experiences optimized for performance across desktops, tablets, and mobile devices.\n\nEvery touch interaction is designed with purpose, ensuring accessible, fluid experiences that drive user adoption and operational efficiency.',
    image: '/images/mobile_experience_showcase.jpg',
    category: 'Application Development',
    features: JSON.stringify([
      { icon: 'smartphone', title: 'Cross-Platform Performance', description: 'Fast, smooth interactions tuned for mobile web and native platforms.' },
      { icon: 'eye', title: 'Accessible Design (WCAG AA)', description: 'Semantic markup, keyboard navigation, and high-contrast typography.' },
      { icon: 'wifi-off', title: 'Offline Capabilities', description: 'Local caching and background synchronization for intermittent connectivity.' }
    ]),
    faqs: JSON.stringify([
      { question: 'Do you build native mobile apps or PWAs?', answer: 'We evaluate your business requirements and recommend either high-performance Progressive Web Apps or native cross-platform codebases.' }
    ]),
    hero_cta_label: 'Start Application Brief',
    hero_cta_link: '/contact',
    status: 'published'
  }
];

const upsertService = db.prepare(`
  INSERT INTO entries (type, slug, title, summary, body, image, status, category, features, faqs, hero_cta_label, hero_cta_link)
  VALUES ('services', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    summary=excluded.summary,
    body=excluded.body,
    image=excluded.image,
    status=excluded.status,
    category=excluded.category,
    features=excluded.features,
    faqs=excluded.faqs,
    hero_cta_label=excluded.hero_cta_label,
    hero_cta_link=excluded.hero_cta_link,
    updated_at=CURRENT_TIMESTAMP
`);

for (const s of services) {
  upsertService.run(s.slug, s.title, s.summary, s.body, s.image, s.status, s.category, s.features, s.faqs, s.hero_cta_label, s.hero_cta_link);
  console.log(`✓ Service seeded: ${s.title}`);
}

// 5. Seed Testimonials
const testimonials = [
  {
    slug: 'marcus-vance-meridian',
    title: 'Marcus Vance',
    category: 'CTO, Meridian Financial Technologies',
    summary: '“Azaroth Tech-Hive delivered our core ledger modernization ahead of schedule. Their engineering rigor, transparent communication, and focus on reliability made them an invaluable partner.”',
    body: '“Azaroth Tech-Hive delivered our core ledger modernization ahead of schedule. Their engineering rigor, transparent communication, and focus on reliability made them an invaluable partner.”',
    image: '/images/about_corporate_studio.jpg',
    status: 'published'
  },
  {
    slug: 'elena-rostova-nordique',
    title: 'Elena Rostova',
    category: 'VP of Digital Product, Nordique Retail Group',
    summary: '“The omnichannel commerce architecture transformed our inventory synchronization across 45 stores. Zero unexpected downtime during peak seasonal traffic.”',
    body: '“The omnichannel commerce architecture transformed our inventory synchronization across 45 stores. Zero unexpected downtime during peak seasonal traffic.”',
    image: '/images/mobile_experience_showcase.jpg',
    status: 'published'
  }
];

const upsertTestimonial = db.prepare(`
  INSERT INTO entries (type, slug, title, category, summary, body, image, status)
  VALUES ('testimonials', ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    category=excluded.category,
    summary=excluded.summary,
    body=excluded.body,
    image=excluded.image,
    status=excluded.status,
    updated_at=CURRENT_TIMESTAMP
`);

for (const t of testimonials) {
  upsertTestimonial.run(t.slug, t.title, t.category, t.summary, t.body, t.image, t.status);
  console.log(`✓ Testimonial seeded: ${t.title}`);
}

// 6. Seed Team Profiles
const teamMembers = [
  {
    slug: 'tariq-azam',
    title: 'Tariq Azam',
    category: 'Leadership',
    summary: 'Principal Software Architect & Founder',
    body: 'Over 15 years leading enterprise digital transformations, cloud-native architectures, and mission-critical distributed systems.',
    image: '/images/about_corporate_studio.jpg',
    status: 'published'
  },
  {
    slug: 'sarah-lin',
    title: 'Sarah Lin',
    category: 'Engineering',
    summary: 'Head of Engineering & Security',
    body: 'Specializes in zero-trust cloud infrastructure, high-throughput backend services, and automated quality assurance.',
    image: '/images/sentinel_platform_hero.jpg',
    status: 'published'
  }
];

const upsertTeam = db.prepare(`
  INSERT INTO entries (type, slug, title, category, summary, body, image, status)
  VALUES ('team', ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    category=excluded.category,
    summary=excluded.summary,
    body=excluded.body,
    image=excluded.image,
    status=excluded.status,
    updated_at=CURRENT_TIMESTAMP
`);

for (const m of teamMembers) {
  upsertTeam.run(m.slug, m.title, m.category, m.summary, m.body, m.image, m.status);
  console.log(`✓ Team seeded: ${m.title}`);
}

// 7. Seed Technologies
const technologies = [
  { slug: 'node-typescript', title: 'Node.js & TypeScript', category: 'Runtime & Backend', summary: 'High-throughput asynchronous servers and enterprise type safety.', status: 'published' },
  { slug: 'react-ui', title: 'React & Modern UI', category: 'Frontend Architecture', summary: 'Progressive, accessible component architectures and responsive interactions.', status: 'published' },
  { slug: 'postgresql-sqlite', title: 'PostgreSQL & SQLite', category: 'Data & Persistence', summary: 'ACID-compliant relational data modeling, indexing, and high-integrity storage.', status: 'published' },
  { slug: 'kubernetes-docker', title: 'Kubernetes & Docker', category: 'Cloud & DevOps', summary: 'Container orchestration, automated scaling, and zero-downtime deployment pipelines.', status: 'published' },
  { slug: 'opentelemetry-apm', title: 'OpenTelemetry & Observability', category: 'Security & Telemetry', summary: 'Distributed tracing, APM, and real-time operational telemetry.', status: 'published' }
];

const upsertTech = db.prepare(`
  INSERT INTO entries (type, slug, title, category, summary, status)
  VALUES ('technologies', ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    category=excluded.category,
    summary=excluded.summary,
    status=excluded.status,
    updated_at=CURRENT_TIMESTAMP
`);

for (const tech of technologies) {
  upsertTech.run(tech.slug, tech.title, tech.category, tech.summary, tech.status);
  console.log(`✓ Technology seeded: ${tech.title}`);
}

// 8. Seed Case Studies (projects)
const projects = [
  {
    slug: 'fintech-core-modernization',
    title: 'Enterprise Financial Core Modernization',
    category: 'Finance & Banking',
    summary: 'High-throughput transaction routing and real-time ledger synchronization.',
    body: 'A leading financial institution required modern transaction routing to replace legacy batch processing.\n\nAzaroth Tech-Hive designed an event-driven microservices architecture handling millions of daily events with strict ACID consistency, sub-10ms latency, and full regulatory auditability.',
    technology: 'Node.js, PostgreSQL, Kafka, Kubernetes, OpenTelemetry',
    image: '/images/ai_automation_engine.jpg',
    features: JSON.stringify([
      { icon: 'zap', title: 'Sub-10ms Settlement', description: 'Real-time ledger updates with zero-data-loss guarantees.' },
      { icon: 'shield-check', title: 'SOC 2 & ISO 27001', description: 'Fully compliant cryptographic audit trails.' },
      { icon: 'activity', title: '99.999% Availability', description: 'Zero single points of failure across active-active clusters.' }
    ]),
    hero_cta_label: 'Discuss Financial Architecture',
    hero_cta_link: '/contact',
    status: 'published'
  },
  {
    slug: 'global-supply-chain-telemetry',
    title: 'Real-Time Supply Chain Telemetry',
    category: 'Logistics & Supply Chain',
    summary: 'Unified freight tracking, exception alerting, and warehouse coordination across 14 international hubs.',
    body: 'Coordinating freight movements across 14 international hubs required end-to-end visibility.\n\nWe engineered a real-time telemetry ingestion pipeline and interactive operational dashboard that provides instant route exception detection and predictive arrival estimates.',
    technology: 'TypeScript, GraphQL, Redis, AWS, React',
    image: '/images/sentinel_platform_hero.jpg',
    features: JSON.stringify([
      { icon: 'clock', title: '40% Faster Exception Handling', description: 'Automated dispatch alerts notify hub managers immediately.' },
      { icon: 'map', title: 'Live Geospatial Tracking', description: 'Interactive vector map rendering container movements.' }
    ]),
    hero_cta_label: 'Explore Logistics Solutions',
    hero_cta_link: '/contact',
    status: 'published'
  }
];

const upsertProject = db.prepare(`
  INSERT INTO entries (type, slug, title, category, summary, body, technology, image, features, hero_cta_label, hero_cta_link, status)
  VALUES ('projects', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    category=excluded.category,
    summary=excluded.summary,
    body=excluded.body,
    technology=excluded.technology,
    image=excluded.image,
    features=excluded.features,
    hero_cta_label=excluded.hero_cta_label,
    hero_cta_link=excluded.hero_cta_link,
    status=excluded.status,
    updated_at=CURRENT_TIMESTAMP
`);

for (const p of projects) {
  upsertProject.run(p.slug, p.title, p.category, p.summary, p.body, p.technology, p.image, p.features, p.hero_cta_label, p.hero_cta_link, p.status);
  console.log(`✓ Case study seeded: ${p.title}`);
}

// 9. Seed Blog Articles (blog)
const articles = [
  {
    slug: 'architecting-resilient-distributed-systems',
    title: 'Architecting Resilient Distributed Systems for Modern Enterprises',
    category: 'Engineering Architecture',
    summary: 'Key patterns for fault tolerance, data consistency, and observability in mission-critical environments.',
    body: `Building systems that operate continuously without unexpected cascading failures requires defensive architectural choices.\n\nIn this article, we examine circuit breaker patterns, idempotency keys, write-ahead logging, and automated health probing that keep modern software resilient under heavy load.\n\nBy designing decoupled services that fail gracefully, teams can deploy updates multiple times a day with complete confidence in operational continuity.`,
    technology: 'Distributed Systems, Reliability, Cloud',
    image: '/images/sentinel_platform_hero.jpg',
    seo_title: 'Architecting Resilient Distributed Systems — Azaroth Tech-Hive Insights',
    seo_description: 'Discover practical patterns for building fault-tolerant distributed enterprise systems.',
    status: 'published'
  },
  {
    slug: 'designing-purposeful-software',
    title: 'Designing Purposeful Software: Beyond AI Hype and Slop',
    category: 'Design & Craft',
    summary: 'Why craftsmanship, accessibility, and human-centered workflows remain the foundation of lasting software.',
    body: `As generative tools flood digital spaces with generic templates and unverified features, deliberate design matters more than ever.\n\nWe explore the discipline of zero-pill metadata, high-contrast readability, domain-specific visual languages, and software built around actual user workflows.\n\nTrue engineering excellence is measured not by how fast generic code is emitted, but by whether the software solves real problems for real people.`,
    technology: 'Design Systems, Product Strategy, UX',
    image: '/images/about_corporate_studio.jpg',
    seo_title: 'Designing Purposeful Software — Craftsmanship over Hype',
    seo_description: 'Why human-centered craft and domain-specific design create lasting digital value.',
    status: 'published'
  }
];

const upsertArticle = db.prepare(`
  INSERT INTO entries (type, slug, title, category, summary, body, technology, image, seo_title, seo_description, status)
  VALUES ('blog', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    category=excluded.category,
    summary=excluded.summary,
    body=excluded.body,
    technology=excluded.technology,
    image=excluded.image,
    seo_title=excluded.seo_title,
    seo_description=excluded.seo_description,
    status=excluded.status,
    updated_at=CURRENT_TIMESTAMP
`);

for (const a of articles) {
  upsertArticle.run(a.slug, a.title, a.category, a.summary, a.body, a.technology, a.image, a.seo_title, a.seo_description, a.status);
  console.log(`✓ Article seeded: ${a.title}`);
}

// 10. Seed Careers
const jobs = [
  {
    slug: 'senior-fullstack-engineer',
    title: 'Senior Full-Stack Engineer',
    category: 'Engineering',
    location: 'London / Remote',
    job_type: 'Full-time',
    summary: 'Architect and build scalable web platforms, high-performance APIs, and modern CMS architectures.',
    body: `We are looking for an experienced full-stack engineer passionate about clean code, high reliability, and intuitive user experiences.\n\nYou will work across our Node.js, TypeScript, and modern frontend stacks, collaborating closely with architects and product teams to deliver purposeful digital products.\n\nRequirements:\n- 5+ years building production web applications\n- Deep knowledge of Node.js, modern browser APIs, and SQL\n- Passion for performance, security, and accessibility`,
    features: JSON.stringify([
      { icon: 'briefcase', title: 'Competitive Compensation & Equity', description: 'Industry-leading salary and meaningful equity stakes.' },
      { icon: 'home', title: 'Flexible Remote Work', description: 'Work from our hubs or remotely with flexible schedules.' },
      { icon: 'book', title: 'Continuous Learning Budget', description: 'Dedicated annual budget for conferences, courses, and certifications.' }
    ]),
    status: 'published'
  }
];

const upsertJob = db.prepare(`
  INSERT INTO entries (type, slug, title, category, location, job_type, summary, body, features, status)
  VALUES ('careers', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    category=excluded.category,
    location=excluded.location,
    job_type=excluded.job_type,
    summary=excluded.summary,
    body=excluded.body,
    features=excluded.features,
    status=excluded.status,
    updated_at=CURRENT_TIMESTAMP
`);

for (const j of jobs) {
  upsertJob.run(j.slug, j.title, j.category, j.location, j.job_type, j.summary, j.body, j.features, j.status);
  console.log(`✓ Job opening seeded: ${j.title}`);
}

try { db.exec('PRAGMA wal_checkpoint(PASSIVE);'); } catch {}
console.log('\n=============================================================');
console.log('✓ ALL ENTERPRISE CMS MODULES & PRODUCTS SEEDED SUCCESSFULLY!');
console.log('=============================================================');
