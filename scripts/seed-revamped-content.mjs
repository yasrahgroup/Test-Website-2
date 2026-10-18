import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(import.meta.dirname, '..');
const dbPath = path.join(root, 'storage', 'website.sqlite');

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

const content = {
  brand: 'Azaroth Tech-Hive',
  brandTitle: 'AZAROTH',
  brandSubtitle: 'TECH-HIVE',
  footerBrandTitle: 'AZAROTH',
  footerBrandSubtitle: 'TECH-HIVE',
  tagline: 'Practical software engineering for real business needs.',
  heroEyebrow: 'SOFTWARE ENGINEERING & DIGITAL SOLUTIONS',
  heroTitle: 'Innovative Software Solutions — Technology designed around the *way you work.*',
  heroDescription: 'Azaroth Tech-Hive helps organisations address practical business challenges through custom software, web and mobile applications, cloud and DevOps services, systems integration, and workflow automation. We begin by understanding your goals, then work with you to define a solution that fits your requirements, resources, and operating environment.',
  aboutTitle: 'Start with the challenge. *Build toward the right solution.*',
  aboutDescription: 'Effective technology begins with a clear understanding of the problem it needs to solve. We take time to learn about your workflows, users, existing systems, and priorities before recommending an approach. The result should be useful in day-to-day operations, understandable to the people who rely on it, and maintainable as your needs evolve.',
  mission: 'Understand the challenge. Define the right solution. Build with purpose.',
  contactEmail: 'contact@azaroth.example',
  contactPhone: '+1 (555) 019-2834',
  contactLocation: 'London · New York · Worldwide',
  footerDescription: 'Azaroth Tech-Hive helps organisations assess technology challenges and plan practical software solutions across applications, cloud, integration, and workflow automation.',
  homeProductsEnabled: 'true',
  homeProductsTitle: 'Software for *Specific Operational Workflows*',
  homeProductsDescription: 'Azaroth Tech-Hive is developing products intended to support defined business needs. Explore our verified capabilities and current product status.',
  primary: '#910b2c',
  gold: '#d5a13c',
  orange: '#f47721',
  background: '#faf8f4',
  ink: '#171b2c',
  logo: '/logo.png',
  cursorEnabled: 'true',
  cursorStyle: 'gold-ring',
  cursorSize: '27',
  cursorLag: '0.22',
  navigation: JSON.stringify([
    { label: 'Home', url: '/' },
    { label: 'About', url: '/about' },
    { label: 'Services', url: '/services' },
    { label: 'Industries', url: '/industries' },
    { label: 'Products', url: '/products' },
    { label: 'Case Studies', url: '/projects' },
    { label: 'Insights', url: '/blog' },
    { label: 'Careers', url: '/careers' },
    { label: 'Contact', url: '/contact' }
  ]),
  services: JSON.stringify([
    {
      icon: 'code-2',
      name: 'Custom Software Development',
      description: 'Applications aligned with your business processes and user requirements.'
    },
    {
      icon: 'cloud',
      name: 'Cloud & DevOps',
      description: 'Deployment workflows and cloud environments planned around operational needs and maintainability.'
    },
    {
      icon: 'smartphone',
      name: 'Web & Mobile Applications',
      description: 'Digital experiences designed for the devices, tasks, and users they need to support.'
    },
    {
      icon: 'cpu',
      name: 'AI & Workflow Automation',
      description: 'Thoughtful evaluation of automation opportunities, using rules, existing tools, or AI where appropriate.'
    },
    {
      icon: 'network',
      name: 'Systems Integration',
      description: 'Connections that help applications exchange information consistently.'
    },
    {
      icon: 'shield-check',
      name: 'Quality Engineering & Support',
      description: 'Testing, release practices, and support arrangements defined around project requirements.'
    }
  ]),
  industries: JSON.stringify([
    {
      name: 'Healthcare',
      icon: 'heart-pulse',
      description: 'Administrative workflows such as appointment coordination and information access with appropriate privacy.',
      tone: 'mint'
    },
    {
      name: 'Finance & Business Operations',
      icon: 'landmark',
      description: 'Workflows where accurate records, defined permissions, traceability, and controlled access are important.',
      tone: 'peach'
    },
    {
      name: 'Retail & Commerce',
      icon: 'shopping-bag',
      description: 'Assess how product information, inventory, orders, and fulfilment processes can work together across channels.',
      tone: 'sky'
    },
    {
      name: 'Education & Training',
      icon: 'graduation-cap',
      description: 'Explore course administration, learner access, assessment workflows, and progress reporting.',
      tone: 'lavender'
    },
    {
      name: 'Manufacturing',
      icon: 'factory',
      description: 'Connect production records, inventory information, and operational reporting with systems already in use.',
      tone: 'peach'
    },
    {
      name: 'Logistics & Supply Chain',
      icon: 'truck',
      description: 'Workflows involving orders, shipment status, exceptions, notifications, and operational decisions.',
      tone: 'sky'
    }
  ]),
  stats: JSON.stringify([
    { value: '01', label: 'Discover — Objectives & Constraints' },
    { value: '02', label: 'Define & Design — Scope & Priorities' },
    { value: '03', label: 'Develop & Validate — Build & Feedback' },
    { value: '04', label: 'Deliver & Improve — Handover & Support' }
  ]),
  privacyText: `Information you provide:
When you submit an enquiry through this website, Azaroth Tech-Hive may receive the information you choose to provide, such as your name, email address, organisation, area of interest, and message. If you apply for a role, we may also receive the information and documents you submit as part of your application.

How information is used:
Information submitted through the website is used to review and respond to enquiries and, where relevant, to administer recruitment.

Access and service providers:
Website administrators and authorised service providers may access or process submitted information as necessary to operate the website and handle enquiries.

Storage and retention:
Information is stored securely using local encrypted server storage and retained only for the duration required to evaluate enquiries and maintain operational compliance, after which records are deleted.

Cookies and analytics:
This website utilizes essential session cookies required for administrative authentication and CSRF security. We do not use third-party tracking pixels or marketing cookies.

Your choices and privacy requests:
For questions or requests concerning personal information, contact contact@azaroth.example. We support requests for data access, correction, or deletion in accordance with applicable regulations.`,
  termsText: `Azaroth Tech-Hive Terms of Use:
These terms govern your use of the Azaroth Tech-Hive website. Content is provided for general informational purposes concerning our software engineering services and technology capabilities.

1. Intellectual Property
All design, text, logos, graphics, and code on this site are the property of Azaroth Tech-Hive or its licensors.

2. Enquiries & Communication
Information submitted via our enquiry forms does not establish a formal client relationship until a formal agreement is executed.

3. Disclaimers
Product descriptions labeled as Concept or In Development represent forward-looking capabilities and are subject to change.

Contact: contact@azaroth.example for legal inquiries.`
};

const setStmt = db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
for (const [k, v] of Object.entries(content)) {
  setStmt.run(k, v);
}

const products = [
  {
    slug: 'fitness-management-system',
    title: 'Fitness Management System',
    category: 'In Development',
    summary: 'Membership and class management for fitness operations.',
    body: `The Fitness Management System is intended to support gyms and fitness operators with member information, renewals, class scheduling, and branch-level activity through a more coordinated workflow.

Planned or verified capabilities:
- Member records and renewal management
- Recurring subscription handling
- Class and trainer scheduling
- Multi-branch operational views
- Connections to supported payment or access-control providers, where available

Designed for: Fitness centres, gym groups, and multi-location operators.
Product note: Availability and integrations depend on the current product scope. Contact us to discuss its present capabilities.`,
    technology: 'Node, React, SQL',
    status: 'published'
  },
  {
    slug: 'omnichannel-commerce-platform',
    title: 'Omnichannel Commerce Platform',
    category: 'In Development',
    summary: 'Coordinate products, inventory, and orders across sales channels.',
    body: `The Omnichannel Commerce Platform is designed to help retailers manage catalogue information, stock visibility, and order workflows across multiple stores, brands, or sales channels.

Capabilities:
- Catalogue management across stores or brands
- Inventory visibility across locations
- Order routing to supported fulfilment locations
- Market-specific content, currency, or language
- Discount and coupon rules
- Connections to supported storefront interfaces

Designed for: Retailers managing multiple online stores, brands, warehouses, or sales channels.
Product note: Compatibility with ERP, payment, shipping, and other third-party systems must be confirmed for each required integration.`,
    technology: 'TypeScript, GraphQL, Cloud',
    status: 'published'
  },
  {
    slug: 'learning-management-platform',
    title: 'Learning Management Platform',
    category: 'In Development',
    summary: 'Organise learning content, enrolment, and progress.',
    body: `The Learning Management Platform is intended to help organisations coordinate training programmes, learning materials, enrolment, assessments, and learner progress.

Capabilities:
- Course and content management
- Learner enrolment, groups, and roles
- Quizzes and completion tracking
- Learning paths by role or team
- Certificates and reminders
- Progress reporting

Designed for: Corporate learning teams, HR and training departments, and training providers.
Product note: Support for external learning-content standards and virtual-classroom tools must be verified before it is advertised.`,
    technology: 'React, Python, Postgres',
    status: 'published'
  },
  {
    slug: 'healthcare-management-system',
    title: 'Healthcare Management System',
    category: 'Concept',
    summary: 'A developing concept for coordinated clinic administration.',
    body: `The Healthcare Management System is being explored as a way to coordinate administrative workflows across clinics, potentially including appointments, patient-information workflows, diagnostic-service connections, and remote consultations.

Areas under consideration:
- Appointment scheduling
- Patient-information coordination
- Laboratory and imaging workflow connections
- Remote consultation functionality
- Role-based access across clinic environments

Designed for: Healthcare organisations assessing options for connected administrative workflows.

Important product notice: This product is in development and is not ready for clinical use or for processing real patient data. No regulatory approval or compliance certification is claimed. Any future use involving health information would require appropriate privacy, security, clinical, and legal review for the relevant jurisdiction.`,
    technology: 'Architecture & Security Discovery',
    status: 'published'
  }
];

const insertEntry = db.prepare(`
  INSERT INTO entries (type, slug, title, category, summary, body, technology, status)
  VALUES ('products', ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(type, slug) DO UPDATE SET
    title=excluded.title,
    category=excluded.category,
    summary=excluded.summary,
    body=excluded.body,
    technology=excluded.technology,
    status=excluded.status,
    updated_at=CURRENT_TIMESTAMP
`);

for (const p of products) {
  insertEntry.run(p.slug, p.title, p.category, p.summary, p.body, p.technology, p.status);
}

try { db.exec('PRAGMA wal_checkpoint(PASSIVE);'); } catch { }

console.log('✓ CMS database successfully updated with Azaroth Tech-Hive Revamped Edition content.');
