import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sqliteModule = await import('node:sqlite').catch(() => null);
const DatabaseSync = sqliteModule?.DatabaseSync || null;

try { process.loadEnvFile(); } catch {}
const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let storage = (isServerless ? path.join(os.tmpdir(), 'storage') : (process.env.STORAGE_DIR || path.join(root, 'storage')));
let dbFile = (isServerless ? path.join(storage, 'website.sqlite') : (process.env.DB_PATH || path.join(storage, 'website.sqlite')));
const port = Number(process.env.APP_PORT || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw Error(`Invalid PORT: ${port}. Use a number from 1 to 65535.`);
}
const prod = process.env.NODE_ENV === 'production';
const siteUrl = (process.env.PUBLIC_URL || 'http://localhost:' + port).replace(/\/$/, '');

function ensureStorage() {
  try {
    fs.mkdirSync(storage, { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.dirname(dbFile), { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(storage, 'media'), { recursive: true, mode: 0o700 });
    fs.mkdirSync(path.join(storage, 'private'), { recursive: true, mode: 0o700 });
  } catch (err) {
    if (err.code === 'EROFS' || err.code === 'EACCES') {
      console.warn(`[Storage] Read-only filesystem detected at ${storage}. Falling back to temporary directory.`);
      storage = path.join(os.tmpdir(), 'storage');
      dbFile = path.join(storage, 'website.sqlite');
      fs.mkdirSync(storage, { recursive: true, mode: 0o700 });
      fs.mkdirSync(path.dirname(dbFile), { recursive: true, mode: 0o700 });
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
  const seedDb = path.join(repoStorage, 'website.sqlite');
  if (fs.existsSync(seedDb) && !fs.existsSync(dbFile)) {
    try { fs.copyFileSync(seedDb, dbFile); } catch {}
  }
  const seedMedia = path.join(repoStorage, 'media');
  if (fs.existsSync(seedMedia)) {
    try { fs.cpSync(seedMedia, path.join(storage, 'media'), { recursive: true }); } catch {}
  }
}

let db;
if (DatabaseSync) {
  try {
    db = new DatabaseSync(dbFile);
    try {
      if (isServerless) {
        db.exec('PRAGMA journal_mode=MEMORY; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
      } else {
        db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA synchronous=NORMAL;');
      }
    } catch {
      try { db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;'); } catch {}
    }
  } catch (err) {
    console.warn(`[SQLite] Failed to open ${dbFile}: ${err.message}. Trying in-memory database.`);
    try {
      db = new DatabaseSync(':memory:');
    } catch {
      db = null;
    }
  }
}

if (!db) {
  console.warn('[SQLite] SQLite unavailable or failed to initialize — using in-memory store');
  db = {
    exec: () => {},
    prepare: () => ({
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0 })
    })
  };
}

try {
  db.exec(`
   CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS entries(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,slug TEXT NOT NULL,title TEXT NOT NULL,summary TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',image TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft',seo_title TEXT NOT NULL DEFAULT '',seo_description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT '',location TEXT NOT NULL DEFAULT '',job_type TEXT NOT NULL DEFAULT '',technology TEXT NOT NULL DEFAULT '',gallery TEXT NOT NULL DEFAULT '[]',features TEXT NOT NULL DEFAULT '[]',specifications TEXT NOT NULL DEFAULT '[]',faqs TEXT NOT NULL DEFAULT '[]',sections_config TEXT NOT NULL DEFAULT '[]',hero_cta_label TEXT NOT NULL DEFAULT '',hero_cta_link TEXT NOT NULL DEFAULT '',secondary_cta_label TEXT NOT NULL DEFAULT '',secondary_cta_link TEXT NOT NULL DEFAULT '',image_position TEXT NOT NULL DEFAULT 'right',social_image TEXT NOT NULL DEFAULT '',canonical_url TEXT NOT NULL DEFAULT '',related_slugs TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(type,slug));
   CREATE INDEX IF NOT EXISTS idx_entries ON entries(type,status,updated_at);
   CREATE TABLE IF NOT EXISTS layouts(slug TEXT PRIMARY KEY,title TEXT NOT NULL,blocks TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',seo_title TEXT NOT NULL DEFAULT '',seo_description TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY AUTOINCREMENT,filename TEXT UNIQUE NOT NULL,mime TEXT NOT NULL,alt TEXT NOT NULL DEFAULT '',size INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS inquiries(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL,company TEXT NOT NULL DEFAULT '',service TEXT NOT NULL DEFAULT '',message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY AUTOINCREMENT,job_slug TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,portfolio TEXT NOT NULL DEFAULT '',message TEXT NOT NULL DEFAULT '',resume_filename TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'new',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,action TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
   CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires);
  `);

  const tableColumns=t=>new Set(db.prepare(`PRAGMA table_info(${t})`).all().map(r=>r.name));
  const existingSessions=tableColumns('sessions');
  if(existingSessions.size && !existingSessions.has('user_id')){
   db.exec('DROP TABLE sessions; CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires);');
   console.warn('Legacy login sessions invalidated during database upgrade.');
  }
  const oldInquiryColumns=tableColumns('inquiries');
  for(const [col,def] of [['status',"'new'"],['notes',"''"]])if(oldInquiryColumns.size && !oldInquiryColumns.has(col))db.exec(`ALTER TABLE inquiries ADD COLUMN ${col} TEXT NOT NULL DEFAULT ${def}`);
  const olderMedia=tableColumns('media');
  if(olderMedia.size && !olderMedia.has('filename')){
   db.exec("ALTER TABLE media RENAME TO media_starter_backup; CREATE TABLE media(id INTEGER PRIMARY KEY AUTOINCREMENT,filename TEXT UNIQUE NOT NULL,mime TEXT NOT NULL,alt TEXT NOT NULL DEFAULT '',size INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
   const legacyAssets=db.prepare('SELECT url,alt FROM media_starter_backup').all();
   for(const asset of legacyAssets){const match=/^\/uploads\/([a-f0-9]{32}\.(png|jpg|webp))$/.exec(asset.url);if(!match)continue;
    const source=path.join(root,'uploads',match[1]);if(!fs.existsSync(source))continue;
    const target=path.join(storage,'media',match[1]);fs.copyFileSync(source,target);
    const type=match[1].endsWith('.jpg')?'image/jpeg':'image/'+match[1].split('.').pop();
    db.prepare('INSERT OR IGNORE INTO media(filename,mime,alt,size) VALUES(?,?,?,?)').run(match[1],type,asset.alt||'',fs.statSync(target).size);
    db.prepare('UPDATE entries SET image=? WHERE image=?').run('/media/'+match[1],asset.url);
   }
   console.warn('Legacy media table migrated; original starter table retained as media_starter_backup.');
  }
  const entryColumns=new Set(db.prepare('PRAGMA table_info(entries)').all().map(x=>x.name));
  const newCols=['seo_title','seo_description','category','location','job_type','technology','gallery','features','specifications','faqs','sections_config','hero_cta_label','hero_cta_link','secondary_cta_label','secondary_cta_link','image_position','social_image','canonical_url','related_slugs'];
  for(const col of newCols)if(entryColumns.size && !entryColumns.has(col)){
    const defaultVal=['gallery','features','specifications','faqs','sections_config','related_slugs'].includes(col)?'[]':col==='image_position'?'right':'';
    db.exec(`ALTER TABLE entries ADD COLUMN ${col} TEXT NOT NULL DEFAULT '${defaultVal}'`);
  }
} catch (e) {
  console.warn('[SQLite] Schema migration check:', e.message);
}
const TYPES = new Set(['services','industries','products','careers','blog','projects','pages','testimonials','team','technologies']);
const ROLES={viewer:1,editor:2,admin:3};
 const defaults={
  brand:'AZAROTH TECH-HIVE',brandTitle:'AZAROTH',brandSubtitle:'TECH-HIVE',tagline:'Ideas. Technology. Impact.',footerBrandTitle:'AZAROTH',footerBrandSubtitle:'TECH-HIVE',
  heroEyebrow:'SOFTWARE ENGINEERING & DIGITAL SOLUTIONS',
  heroTitle:'Intelligence, Engineered and Innovation Unleashed. — Innovative Software Solutions',
  heroDescription:'We design, build and scale intelligent digital systems, enterprise applications, and purpose-driven software that empower ambitious organizations to solve critical operational challenges and accelerate sustainable growth.',
  aboutTitle:'Engineering Software. Enabling Progress.',
  aboutDescription:'Azaroth Tech-Hive architects purposeful software solutions engineered around real operational workflows. We partner with forward-thinking enterprises to design, develop, and deploy robust platforms that turn complexity into competitive advantage.',
  mission:'To partner with visionary enterprises, solving their toughest operational challenges through purposeful software architecture, rigorous engineering, and lasting collaboration.',
  vision:'To engineer transformative, dependable digital systems that simplify complexity and power sustainable organizational progress.',
  contactEmail:'hello@azaroth-techhive.com',
  contactPhone:'+91 6379480931',
  contactLocation:'24, Malaviya Avenue, Thiruvanmiyur, Chennai, India',
  footerDescription:'Ideas become impact when technology meets imagination. Building purposeful digital experiences for tomorrow.',
  homeProductsEnabled:'true',
  homeProductsTitle:'Software for *Specific Operational Workflows*',
  homeProductsDescription:'Azaroth Tech-Hive is developing products intended to support defined business needs. Explore our verified capabilities and current product status.',
  homeServicesEyebrow:'WHAT WE DO',
  homeServicesTitle:'Technology Solutions, *Thoughtfully Built*',
  homeServicesDescription:'From ambitious ideas to reliable products, our teams bring the right technology to every challenge.',
  homeIndustriesEyebrow:'OUR EXPERTISE',
  homeIndustriesTitle:'Technology for *Every Possibility*',
  homeIndustriesDescription:'Focused digital solutions for organizations across a wide range of industries.',
  homeApproachEyebrow:'OUR APPROACH',
  homeApproachTitle:'Built Around People. *Driven by Purpose.*',
  homeApproachDescription:'A collaborative way of working, grounded in clarity, creativity and lasting value.',
  ctaEyebrow:"LET'S MAKE IT HAPPEN",
  ctaTitle:"Have an idea? Let's build *something great.*",
  ctaButtonText:'Start a conversation',
  ctaButtonLink:'/contact',
  heroCtaLabel:'Request for Quote',
  heroCtaLink:'/contact?type=quote',
  heroSecondaryCtaLabel:'Our Portfolio',
  heroSecondaryCtaLink:'/products',
  navCtaLabel:'Request for Quote',
  navCtaLink:'/contact?type=quote',
  primary:'#7A0C16',
  gold:'#d5a13c',
  orange:'#f47721',
  background:'#faf8f4',
  ink:'#171b2c',
  logo:'/logo.png',
  heroImage:'/images/sentinel_platform_hero.jpg',
  aboutImage:'/images/about_corporate_studio.jpg',
  cursorEnabled:'true',
  cursorStyle:'gold-ring',
  cursorSize:'27',
  cursorLag:'0.22',
  animationPreset:'elegant',
  navigation:JSON.stringify([
    {label:'Home',url:'/'},
    {label:'About Us',url:'/about',children:[
      {label:'Who We Are',url:'/about#who-we-are'},
      {label:'Our Values',url:'/about#values'},
      {label:'How We Work',url:'/about#how-we-work'}
    ]},
    {label:'Our Portfolio',url:'/products',children:[
      {label:'Explore Products',url:'/products'},
      {label:'Explore Services',url:'/services'}
    ]},
    {label:'Resource Hub',url:'/blog'},
    {label:'Connect With Us',url:'/contact'},
    {label:'Request for Quote',url:'/contact?type=quote'}
  ]),
  socials:JSON.stringify([]),
  services:JSON.stringify([
    {icon:'code-2',name:'Custom Software Development',description:'Applications aligned with your business processes, user requirements, and enterprise security standards.'},
    {icon:'cloud',name:'Cloud & DevOps Engineering',description:'Deployment workflows, container orchestration, and cloud environments planned around operational resilience.'},
    {icon:'smartphone',name:'Web & Mobile Applications',description:'Digital experiences designed for high performance, intuitive interaction, and multi-device continuity.'},
    {icon:'cpu',name:'AI & Workflow Automation',description:'Intelligent evaluation of automation opportunities, integrating rules, predictive models, and enterprise AI.'},
    {icon:'network',name:'Systems Integration',description:'Modern API connectors and event-driven architecture that help disparate enterprise tools exchange data securely.'},
    {icon:'shield-check',name:'Quality Engineering & Support',description:'Automated testing, security hardening, continuous release practices, and dedicated ongoing maintenance.'}
  ]),
  industries:JSON.stringify([
    {name:'Healthcare & Life Sciences',icon:'heart-pulse',description:'Secure clinical administration, patient intake automation, and telemetry workflows with zero-trust privacy.',tone:'mint'},
    {name:'Finance & Business Operations',icon:'chart-no-axes-combined',description:'High-integrity transaction engines, permissioned record-keeping, and regulatory compliance reporting.',tone:'peach'},
    {name:'Retail & Omnichannel Commerce',icon:'shopping-bag',description:'Unified product catalogs, real-time inventory synchronization, and frictionless cross-channel fulfillment.',tone:'sky'},
    {name:'Education & Corporate Training',icon:'graduation-cap',description:'Interactive course administration, learner progress tracking, role-based paths, and competency verification.',tone:'lavender'},
    {name:'Manufacturing & Industrial IoT',icon:'factory',description:'Connected telemetry, shop-floor production records, equipment tracking, and predictive maintenance.',tone:'peach'},
    {name:'Logistics & Supply Chain',icon:'truck',description:'End-to-end shipment visibility, intelligent order routing, exception dispatching, and carrier coordination.',tone:'sky'}
  ]),
  stats:JSON.stringify([
    {value:'01',label:'Discover — Goals & Constraints'},
    {value:'02',label:'Define & Design — Blueprint & UX'},
    {value:'03',label:'Develop & Validate — Iterative Build & QA'},
    {value:'04',label:'Deliver & Evolve — Deployment & Support'}
  ]),
  values:JSON.stringify([
    {icon:'users',name:'Client First',description:'Deep partnership at every stage of discovery and delivery.',tone:'peach'},
    {icon:'lightbulb',name:'Innovation Driven',description:'Pragmatic engineering that turns ambitious ideas into measurable value.',tone:'peach'},
    {icon:'shield-check',name:'Integrity Always',description:'Zero-trust security, transparent code, and uncompromising standards.',tone:'mint'},
    {icon:'handshake',name:'People Powered',description:'Technology engineered to empower human decision-making and productivity.',tone:'lavender'},
    {icon:'globe',name:'Built to Last',description:'Architected for high availability, cloud portability, and long-term resilience.',tone:'sky'}
  ]),
  privacyText:'Information you provide:\nWhen you submit an enquiry through this website, Azaroth Tech-Hive may receive the information you choose to provide, such as your name, email address, organisation, area of interest, and message. If you apply for a role, we may also receive the information and documents you submit as part of your application.\n\nHow information is used:\nInformation submitted through the website is used to review and respond to enquiries and, where relevant, to administer recruitment.\n\nAccess and service providers:\nWebsite administrators and authorised service providers may access or process submitted information as necessary to operate the website and handle enquiries.\n\nStorage and retention:\nInformation is stored securely using local encrypted server storage and retained only for the duration required to evaluate enquiries and maintain operational compliance, after which records are deleted.\n\nCookies and analytics:\nThis website utilizes essential session cookies required for administrative authentication and CSRF security. We do not use third-party tracking pixels or marketing cookies.\n\nYour choices and privacy requests:\nFor questions or requests concerning personal information, contact hello@azaroth-techhive.com. We support requests for data access, correction, or deletion in accordance with applicable regulations.',
  termsText:'Azaroth Tech-Hive Terms of Use:\nThese terms govern your use of the Azaroth Tech-Hive website. Content is provided for general informational purposes concerning our software engineering services and technology capabilities.\n\n1. Intellectual Property\nAll design, text, logos, graphics, and code on this site are the property of Azaroth Tech-Hive or its licensors.\n\n2. Enquiries & Communication\nInformation submitted via our enquiry forms does not establish a formal client relationship until a formal agreement is executed.\n\n3. Disclaimers\nProduct descriptions labeled as Concept or Under Development represent forward-looking capabilities and are subject to change.\n\nContact: hello@azaroth-techhive.com for legal inquiries.'
 };
function settings(){
  const data={...defaults};
  try{
    if(db){
      for(const row of db.prepare('SELECT key,value FROM settings').all())data[row.key]=row.value;
    }
  }catch(e){
    console.warn('[Settings] Reading settings fallback:', e.message);
  }
  return data;
}
function audit(user,action,details=''){db.prepare('INSERT INTO audit(user_id,action,details) VALUES(?,?,?)').run(user||null,action,String(details).slice(0,700));}
function encodePassword(password){const salt=crypto.randomBytes(16);const hash=crypto.scryptSync(password,salt,64);return salt.toString('hex')+':'+hash.toString('hex');}
function verifyPassword(password,record){try{const [salt,expected]=record.split(':');const h=crypto.scryptSync(password,Buffer.from(salt,'hex'),64);return crypto.timingSafeEqual(h,Buffer.from(expected,'hex'));}catch{return false;}}
const emailOK=x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)&&x.length<=254;
// Bootstrap or synchronize primary administrator credentials from environment
const bootstrapEmail=(process.env.INITIAL_ADMIN_EMAIL||process.env.ADMIN_EMAIL||'').trim().toLowerCase();
const bootstrapPass=process.env.INITIAL_ADMIN_PASSWORD||process.env.ADMIN_PASSWORD;
if(bootstrapEmail && bootstrapPass && emailOK(bootstrapEmail) && bootstrapPass.length>=1 && bootstrapPass.length<=128){
 const existingAdmin=db.prepare('SELECT id FROM users WHERE email=?').get(bootstrapEmail);
 if(!existingAdmin){
  db.prepare('INSERT INTO users(email,password_hash,role,active) VALUES(?,?,?,1)').run(bootstrapEmail,encodePassword(bootstrapPass),'admin');
  console.log('Administrator created for ' + bootstrapEmail);
 }else{
  db.prepare('UPDATE users SET password_hash=?, role=?, active=1 WHERE id=?').run(encodePassword(bootstrapPass),'admin',existingAdmin.id);
  console.log('Administrator credentials synchronized for ' + bootstrapEmail);
 }
}
if(!db.prepare('SELECT id FROM users LIMIT 1').get()){
 console.warn('CMS administrator is not configured. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (or ADMIN_EMAIL and ADMIN_PASSWORD) to bootstrap.');
}
const hex=crypto.randomBytes,sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const MIME={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
function j(res,code,obj,h={}){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h});res.end(JSON.stringify(obj));}
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=(x,max)=>String(x??'').trim().slice(0,max);
const slugOK=x=>typeof x==='string'&&x.length<=110&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const imgOK=x=>x===''||/^\/(logo|logo-source|icon-48|icon-192|icon-512)\.png$/.test(x)||(/^\/images\/[a-z0-9_.-]+\.(png|jpg|webp)$/.test(x))||(/^\/media\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(x)||/^https:\/\/[\w.-]+(?:\/[^\s"'<>]*)?$/.test(x));
function cookies(req){const out={};for(const segment of (req.headers.cookie||'').split(';')){const pos=segment.indexOf('=');if(pos>0)out[segment.slice(0,pos).trim()]=segment.slice(pos+1).trim();}return out;}
function member(req){const auth=req.headers.authorization;const bearer=auth&&auth.startsWith('Bearer ')?auth.slice(7).trim():null;const token=bearer||req.headers['x-session-token']||cookies(req).sid;if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT u.id,u.email,u.role,s.csrf,s.expires FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.active=1').get(sha(token))||null;}
function allowed(req,member,role='viewer'){return !!member&&member.expires>Date.now()&&ROLES[member.role]>=ROLES[role];}
function sameSite(req){const origin=req.headers.origin;if(origin){try{const u=new URL(origin);if(u.protocol!=='http:'&&u.protocol!=='https:')return false;const hostCandidates=[req.headers['x-forwarded-host'],req.headers.host,process.env.PUBLIC_URL?new URL(process.env.PUBLIC_URL).host:null].filter(Boolean).flatMap(h=>h.split(',').map(s=>s.trim().toLowerCase()));const originHost=u.host.toLowerCase();if(hostCandidates.some(h=>h===originHost||h.split(':')[0]===u.hostname.toLowerCase()))return true;if(originHost.endsWith('.run.app')||originHost.endsWith('.google.dev')||originHost.endsWith('.aistudio.google.com')||u.hostname==='localhost'||u.hostname==='127.0.0.1')return true;return false;}catch{return false;}}const sec=req.headers['sec-fetch-site'];return !sec||sec==='same-origin'||sec==='none'||sec==='same-site'||sec==='cross-site';}
function authWrite(req,member){const token=req.headers['x-session-token']||(req.headers.authorization&&req.headers.authorization.startsWith('Bearer ')&&req.headers.authorization.slice(7).trim());const tokenValid=!!token;const csrfValid=req.headers['x-csrf-token']===member.csrf;return sameSite(req)&&(csrfValid||tokenValid);}
const hits=new Map();function limited(req,key,max,period=60000){const ip=(req.socket.remoteAddress||'unknown').slice(0,120),id=key+':'+ip,now=Date.now(),prev=hits.get(id)||[],fresh=prev.filter(t=>t>now-period);fresh.push(now);hits.set(id,fresh);if(hits.size>15000){for(const [k,v] of hits){if(!v.length||v[v.length-1]<now-period)hits.delete(k);}}return fresh.length>max;}
async function jsonBody(req,limit=140000){const chunks=[];let n=0;for await(const part of req){n+=part.length;if(n>limit)throw Object.assign(Error('Payload too large'),{httpCode:413});chunks.push(part);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw Object.assign(Error('Invalid JSON'),{httpCode:400});}}
function validateBlocks(list){if(!Array.isArray(list)||list.length>45)return false;const kinds=new Set(['hero','text','image-text','cards','stats','faq','cta','collection','divider']);return list.every(b=>b&&typeof b==='object'&&kinds.has(b.type)&&typeof b.id==='string'&&b.id.length<=60&&JSON.stringify(b).length<=20000&&(!b.items||(Array.isArray(b.items)&&b.items.length<=35&&b.items.every(x=>x&&typeof x==='object'&&Object.values(x).every(v=>typeof v==='string'&&v.length<=1800))))&&Object.entries(b).every(([k,v])=>k==='items'||(typeof v==='string'&&v.length<=18000))); }
async function notify(subject,message){if(!process.env.RESEND_API_KEY||!process.env.NOTIFY_FROM||!process.env.NOTIFY_TO)return false;try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.NOTIFY_FROM,to:[process.env.NOTIFY_TO],subject,text:message})});return response.ok;}catch(err){console.error('Notification error',err.message);return false;}}
function previewText(s){return String(s||'').replace(/\s+/g,' ').slice(0,200);}
function contentSEO(p,site){let title=site.brand+' — '+site.tagline,description=previewText(site.heroDescription),entryData=null;
 const pages={'/':'Home','/about':'About Us','/services':'Services','/industries':'Industries','/products':'Products','/blog':'Insights','/careers':'Careers','/projects':'Case Studies','/contact':'Contact','/quote':'Request for Quote','/privacy':'Privacy Policy','/terms':'Terms of Use'};
 if(p!=='/'&&pages[p])title=pages[p]+' | '+site.brand;
 const match=/^\/(services|industries|products|careers|blog|projects|pages|testimonials|team|technologies)\/([a-z0-9-]+)$/.exec(p);
 if(match){const item=db.prepare('SELECT title,summary,body,features,seo_title,seo_description FROM entries WHERE type=? AND slug=? AND status=?').get(match[1],match[2],'published');if(item){title=(item.seo_title||item.title)+' | '+site.brand;description=previewText(item.seo_description||item.summary);entryData=item;}}
 const pageName=p==='/'?'home':p.slice(1).replaceAll('/','-');const layout=db.prepare('SELECT seo_title,seo_description FROM layouts WHERE slug=? AND status=?').get(pageName,'published');if(layout){title=layout.seo_title||title;description=layout.seo_description||description;}
 return {title,description,entryData};}
function webHtml(p){const site=settings(),seo=contentSEO(p,site),canonical=siteUrl+p;
 let extraHtml='';
 if(seo.entryData){
  extraHtml=`<div><p>${e(seo.entryData.body)}</p>`;
  if(seo.entryData.features){try{const fl=JSON.parse(seo.entryData.features);if(Array.isArray(fl))extraHtml+='<ul>'+fl.map(f=>`<li><strong>${e(f.title||'')}</strong> ${e(f.description||'')}</li>`).join('')+'</ul>';}catch{}}
  extraHtml+='</div>';
 }
 const fallback=p==='/'?`<div style="max-width:1100px;margin:150px auto;padding:30px"><h1>${e(site.heroTitle)}</h1><p>${e(site.heroDescription)}</p><a href="/services">Explore services</a></div>`:`<div style="max-width:1100px;margin:150px auto;padding:30px"><h1>${e(seo.title)}</h1><p>${e(seo.description)}</p>${extraHtml}</div>`;
 let template = '';
 try {
  template = fs.readFileSync(path.join(pub,'index.html'),'utf8');
 } catch {
  template = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#faf8f4"><link rel="icon" type="image/png" href="/icon-48.png"><link rel="apple-touch-icon" href="/icon-192.png"><meta name="description" content="Purposeful software, designed for tomorrow."><title>AZAROTH — Ideas. Technology. Impact.</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/style.css?v=2.6"><script src="/icons.js?v=2.6" defer></script><script src="/app.js?v=2.6" defer></script><script src="/enhancements.js?v=2.6" defer></script></head><body><div id="orb" aria-hidden="true"><span></span><em></em></div><div id="app"></div></body></html>';
 }
 return template.replace('<title>AZAROTH — Ideas. Technology. Impact.</title>',`<title>${e(seo.title)}</title>`).replace('<meta name="description" content="Purposeful software, designed for tomorrow.">',`<meta name="description" content="${e(seo.description)}"><link rel="canonical" href="${e(canonical)}"><meta property="og:title" content="${e(seo.title)}"><meta property="og:description" content="${e(seo.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${e(canonical)}">`).replace('<div id="app"></div>',`<div id="app">${fallback}</div>`).replace('</head>',`${p==='/admin'?'<meta name=\"robots\" content=\"noindex,nofollow\">':''}</head>`);
}
function streamFile(res,file,mime,extra={}){res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff',...extra});return fs.createReadStream(file).pipe(res);}
const handleRequest = async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors *; object-src 'none'; base-uri 'self'; form-action 'self'");
 if(prod)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 try{
  let requestUrl=req.url;
  try{
   const check=new URL(requestUrl,'http://localhost');
   const forwarded=check.searchParams.get('__url')||check.searchParams.get('url');
   if(forwarded){
    check.searchParams.delete('__url');check.searchParams.delete('url');
    const rest=check.searchParams.toString();
    requestUrl=forwarded+(rest?'?'+rest:'');
   }
  }catch{}
  const url=new URL(requestUrl,'http://localhost');let p=url.pathname;if(p.length>1&&p.endsWith('/'))p=p.slice(0,-1);const method=req.method;const user=member(req);
 if(method==='GET'&&(p==='/api/health'||p==='/health'))return j(res,200,{ok:true,db:true});
 if(method==='GET'&&p==='/api/content')return j(res,200,settings());
 if(method==='GET'&&p==='/api/layouts'){
  const slug=url.searchParams.get('slug')||'';if(!/^[a-z0-9-]{1,110}$/.test(slug))return j(res,400,{error:'Invalid page'});
  const row=db.prepare('SELECT slug,title,blocks,status FROM layouts WHERE slug=?').get(slug);
  return j(res,200,row&&row.status==='published'?{...row,blocks:JSON.parse(row.blocks)}:null);
 }
 if(method==='GET'&&p==='/api/entries'){
  const type=url.searchParams.get('type');if(!TYPES.has(type))return j(res,400,{error:'Invalid collection'});
  const slug=url.searchParams.get('slug');let rows;
  if(slug){if(!slugOK(slug))return j(res,400,{error:'Invalid slug'});rows=db.prepare('SELECT id,type,slug,title,summary,body,image,category,location,job_type,technology,gallery,features,specifications,faqs,sections_config,hero_cta_label,hero_cta_link,secondary_cta_label,secondary_cta_link,image_position,social_image,canonical_url,related_slugs,updated_at FROM entries WHERE type=? AND slug=? AND status=?').get(type,slug,'published');}
  else rows=db.prepare('SELECT id,type,slug,title,summary,image,category,location,job_type,technology,hero_cta_label,hero_cta_link,image_position,updated_at FROM entries WHERE type=? AND status=? ORDER BY updated_at DESC LIMIT 200').all(type,'published');
  return j(res,200,rows||null);
 }
 if(method==='POST'&&p==='/api/contact'){
  if(!sameSite(req)||limited(req,'contact',7))return j(res,429,{error:'Please try again later'});
  const x=await jsonBody(req);if(x.website)return j(res,200,{ok:true});
  const name=str(x.name,150),email=str(x.email,254).toLowerCase(),company=str(x.company,160),service=str(x.service,160),message=str(x.message,5000);
  if(name.length<2||!emailOK(email)||message.length<10||x.consent!==true)return j(res,400,{error:'Enter your name, valid email, message and privacy consent.'});
  db.prepare('INSERT INTO inquiries(name,email,company,service,message) VALUES(?,?,?,?,?)').run(name,email,company,service,message);
  notify('New website enquiry',`Name: ${name}\nEmail: ${email}\nCompany: ${company}\nService: ${service}\nMessage: ${message}`);
  return j(res,200,{ok:true});
 }
 if(method==='POST'&&p==='/api/jobs/apply'){
  if(!sameSite(req)||limited(req,'apply',5))return j(res,429,{error:'Please try again later'});
  const x=await jsonBody(req,4*1024*1024);if(x.website)return j(res,200,{ok:true});
  const job=str(x.job,110),name=str(x.name,150),email=str(x.email,254).toLowerCase(),portfolio=str(x.portfolio,500),message=str(x.message,3000);
  if(!slugOK(job)||name.length<2||!emailOK(email)||x.consent!==true)return j(res,400,{error:'Valid job, name, email and privacy consent are required'});
  const opening=db.prepare('SELECT id FROM entries WHERE type=? AND slug=? AND status=?').get('careers',job,'published');if(!opening)return j(res,404,{error:'This position is no longer available'});
  let filename='';if(x.resume){const d=/^data:application\/pdf;base64,([A-Za-z0-9+/=]+)$/.exec(String(x.resume));if(!d||d[1].length>3*1024*1024)return j(res,400,{error:'PDF resume must be under 2MB'});const buf=Buffer.from(d[1],'base64');if(buf.length>2*1024*1024||buf.toString('ascii',0,5)!=='%PDF-')return j(res,400,{error:'Only valid PDF resumes are supported'});filename=hex(16).toString('hex')+'.pdf';fs.writeFileSync(path.join(storage,'private',filename),buf,{flag:'wx',mode:0o600});}
  db.prepare('INSERT INTO applications(job_slug,name,email,portfolio,message,resume_filename) VALUES(?,?,?,?,?,?)').run(job,name,email,portfolio,message,filename);
  notify('New application: '+job,`Name: ${name}\nEmail: ${email}\nJob: ${job}`);
  return j(res,200,{ok:true});
 }
 if(method==='POST'&&p==='/api/admin/login'){
  if(!sameSite(req)||limited(req,'login',30,600000))return j(res,429,{error:'Too many attempts. Try again later.'});
  const x=await jsonBody(req);let email=str(x.email,254).toLowerCase(),pw=String(x.password||'').slice(0,300);
  if(!email){const first=db.prepare("SELECT email FROM users WHERE role='admin' AND active=1 ORDER BY id ASC LIMIT 1").get();if(first)email=first.email;}
  const row=db.prepare('SELECT id,email,role,password_hash,active FROM users WHERE email=?').get(email);
  if(!row||!row.active||!verifyPassword(pw,row.password_hash))return j(res,401,{error:'Invalid email or password'});
  db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  const token=hex(32).toString('hex'),csrf=hex(24).toString('hex');
  db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires) VALUES(?,?,?,?)').run(sha(token),row.id,csrf,Date.now()+8*3600*1000);
  audit(row.id,'auth.login');
  return j(res,200,{ok:true,csrf,token,email:row.email,role:row.role},{'Set-Cookie':`sid=${token}; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=28800`});
 }
 if(p==='/api/admin/logout'&&method==='POST'){
  const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7).trim():req.headers['x-session-token']||cookies(req).sid;
  if(user){if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha(token));audit(user.id,'auth.logout');}
  return j(res,200,{ok:true},{'Set-Cookie':`sid=; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=0`});
 }
 if(p.startsWith('/api/admin/')){
  if(!allowed(req,user))return j(res,401,{error:'Authentication required'});
  if(method!=='GET'&&!authWrite(req,user))return j(res,403,{error:'Security token missing or invalid'});
  if(p==='/api/admin/check'&&method==='GET')return j(res,200,{ok:true,email:user.email,role:user.role,csrf:user.csrf});
  if(p==='/api/admin/overview'&&method==='GET')return j(res,200,{entries:db.prepare('SELECT type,COUNT(*) count FROM entries GROUP BY type').all(),enquiries:db.prepare('SELECT count(*) n FROM inquiries').get().n,applications:db.prepare('SELECT count(*) n FROM applications').get().n,pages:db.prepare('SELECT count(*) n FROM layouts').get().n});
  if(p==='/api/admin/content'&&method==='PUT'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});
   const x=await jsonBody(req,200000),put=db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
   const allowedKeys=new Set(Object.keys(defaults));const edits=[];
   for(const [k,val] of Object.entries(x)){if(!allowedKeys.has(k)||typeof val!=='string'||val.length>60000)return j(res,400,{error:'Invalid setting: '+k});
    let v=val;
    if(['services','industries','stats','navigation','socials','values'].includes(k)){let parsed;try{parsed=JSON.parse(v)}catch{return j(res,400,{error:k+' must contain valid JSON'})}if(!Array.isArray(parsed)||parsed.length>100)return j(res,400,{error:'Invalid array in '+k});}
    if(['primary','gold','orange','background','ink'].includes(k)){
     v=v.trim();
     if(/^#[0-9a-fA-F]{3}$/.test(v))v='#'+v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
     if(!/^#[0-9a-fA-F]{6}$/.test(v))return j(res,400,{error:'Invalid colour'});
    }
    if(k==='cursorStyle'&&!['gold-ring','gold-orbit','micro-dot','glass-outline'].includes(v))return j(res,400,{error:'Invalid cursor style'});
    if(['logo','heroImage','aboutImage'].includes(k)&&!imgOK(v))return j(res,400,{error:'Invalid image URL for '+k});
    edits.push([k,v]);}
   db.exec('BEGIN');try{for(const [k,v] of edits)put.run(k,v);db.exec('COMMIT');try{db.exec('PRAGMA wal_checkpoint(PASSIVE);');}catch{}}catch(err){db.exec('ROLLBACK');throw err;}
   audit(user.id,'settings.saved',edits.map(x=>x[0]).join(','));return j(res,200,{ok:true});
  }
  if(p==='/api/admin/entries'&&method==='GET'){
   const type=url.searchParams.get('type');if(!TYPES.has(type))return j(res,400,{error:'Invalid collection'});
   return j(res,200,db.prepare('SELECT * FROM entries WHERE type=? ORDER BY updated_at DESC LIMIT 500').all(type));
  }
  if(p==='/api/admin/entries'&&method==='POST'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});
   const x=await jsonBody(req,200000),type=x.type,slug=str(x.slug,110).toLowerCase();if(!TYPES.has(type)||!slugOK(slug))return j(res,400,{error:'Invalid type or slug'});
   const title=str(x.title,180),summary=str(x.summary,1300),text=str(x.body,40000),image=str(x.image,700),status=x.status==='published'?'published':'draft',seoTitle=str(x.seo_title,180),seoDesc=str(x.seo_description,300),category=str(x.category,110),location=str(x.location,110),jobType=str(x.job_type,110),technology=str(x.technology,700);
   const galleryItemOK=item=>typeof item==='string'?imgOK(item):(item&&typeof item==='object'&&typeof item.url==='string'&&imgOK(item.url));
   let gallery='[]';if(x.gallery){try{const list=typeof x.gallery==='string'?JSON.parse(x.gallery):x.gallery;if(!Array.isArray(list)||list.length>24||!list.every(galleryItemOK))throw Error('Invalid gallery');gallery=JSON.stringify(list);}catch{return j(res,400,{error:'Gallery must contain valid image URLs'});}}
   const parseJSON=(val,maxLen=40)=>{if(!val)return'[]';try{const parsed=typeof val==='string'?JSON.parse(val):val;return Array.isArray(parsed)&&parsed.length<=maxLen?JSON.stringify(parsed):'[]';}catch{return'[]';}};
   const features=parseJSON(x.features,40);
   const specifications=parseJSON(x.specifications,40);
   const faqs=parseJSON(x.faqs,40);
   const sectionsConfig=parseJSON(x.sections_config,20);
   const relatedSlugs=parseJSON(x.related_slugs,20);
   const heroCtaLabel=str(x.hero_cta_label,80);
   const heroCtaLink=str(x.hero_cta_link,250);
   const secondaryCtaLabel=str(x.secondary_cta_label,80);
   const secondaryCtaLink=str(x.secondary_cta_link,250);
   const imagePosition=['right','left','full','top'].includes(x.image_position)?x.image_position:'right';
   const socialImage=imgOK(x.social_image)?str(x.social_image,700):'';
   const canonicalUrl=str(x.canonical_url,500);
   if(!title||!imgOK(image))return j(res,400,{error:'Title required and image must be a permitted URL'});
   const existingId = Number(x.id);
    if(Number.isSafeInteger(existingId) && existingId > 0 && db.prepare('SELECT id FROM entries WHERE id=?').get(existingId)){
      db.prepare(`UPDATE entries SET type=?,slug=?,title=?,summary=?,body=?,image=?,status=?,seo_title=?,seo_description=?,category=?,location=?,job_type=?,technology=?,gallery=?,features=?,specifications=?,faqs=?,sections_config=?,hero_cta_label=?,hero_cta_link=?,secondary_cta_label=?,secondary_cta_link=?,image_position=?,social_image=?,canonical_url=?,related_slugs=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(type,slug,title,summary,text,image,status,seoTitle,seoDesc,category,location,jobType,technology,gallery,features,specifications,faqs,sectionsConfig,heroCtaLabel,heroCtaLink,secondaryCtaLabel,secondaryCtaLink,imagePosition,socialImage,canonicalUrl,relatedSlugs,existingId);
    } else {
      db.prepare(`INSERT INTO entries(type,slug,title,summary,body,image,status,seo_title,seo_description,category,location,job_type,technology,gallery,features,specifications,faqs,sections_config,hero_cta_label,hero_cta_link,secondary_cta_label,secondary_cta_link,image_position,social_image,canonical_url,related_slugs) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(type,slug) DO UPDATE SET title=excluded.title,summary=excluded.summary,body=excluded.body,image=excluded.image,status=excluded.status,seo_title=excluded.seo_title,seo_description=excluded.seo_description,category=excluded.category,location=excluded.location,job_type=excluded.job_type,technology=excluded.technology,gallery=excluded.gallery,features=excluded.features,specifications=excluded.specifications,faqs=excluded.faqs,sections_config=excluded.sections_config,hero_cta_label=excluded.hero_cta_label,hero_cta_link=excluded.hero_cta_link,secondary_cta_label=excluded.secondary_cta_label,secondary_cta_link=excluded.secondary_cta_link,image_position=excluded.image_position,social_image=excluded.social_image,canonical_url=excluded.canonical_url,related_slugs=excluded.related_slugs,updated_at=CURRENT_TIMESTAMP`).run(type,slug,title,summary,text,image,status,seoTitle,seoDesc,category,location,jobType,technology,gallery,features,specifications,faqs,sectionsConfig,heroCtaLabel,heroCtaLink,secondaryCtaLabel,secondaryCtaLink,imagePosition,socialImage,canonicalUrl,relatedSlugs);
    }
   audit(user.id,'entry.saved',type+'/'+slug+'/'+status);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/entries'&&method==='DELETE'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});const x=await jsonBody(req),id=Number(x.id);if(!Number.isSafeInteger(id)||id<1)return j(res,400,{error:'Invalid ID'});
   db.prepare('DELETE FROM entries WHERE id=?').run(id);audit(user.id,'entry.deleted',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/export'&&method==='GET'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});
   const settingsRows=db.prepare('SELECT key,value FROM settings').all();
   const entriesRows=db.prepare('SELECT * FROM entries ORDER BY type,slug').all();
   const layoutsRows=db.prepare('SELECT * FROM layouts ORDER BY slug').all();
   const mediaRows=db.prepare('SELECT id,filename,mime,alt,size,created_at FROM media ORDER BY id').all();
   return j(res,200,{ok:true,exported_at:new Date().toISOString(),settings:settingsRows,entries:entriesRows,layouts:layoutsRows,media:mediaRows});
  }
  if(p==='/api/admin/layouts'&&method==='GET')return j(res,200,db.prepare('SELECT slug,title,status,seo_title,seo_description,updated_at FROM layouts ORDER BY slug').all());
  if(p==='/api/admin/layout'&&method==='GET'){
   const slug=url.searchParams.get('slug')||'';if(!/^[a-z0-9-]{1,110}$/.test(slug))return j(res,400,{error:'Invalid page'});const row=db.prepare('SELECT * FROM layouts WHERE slug=?').get(slug);return j(res,200,row?{...row,blocks:JSON.parse(row.blocks)}:null);
  }
  if(p==='/api/admin/layout'&&method==='PUT'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});
   const x=await jsonBody(req,500000),slug=str(x.slug,110).toLowerCase(),title=str(x.title,180),blocks=x.blocks,status=x.status==='published'?'published':'draft';
   if(!/^[a-z0-9-]{1,110}$/.test(slug)||!title||!validateBlocks(blocks))return j(res,400,{error:'Invalid page layout'});
   db.prepare(`INSERT INTO layouts(slug,title,blocks,status,seo_title,seo_description) VALUES(?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,blocks=excluded.blocks,status=excluded.status,seo_title=excluded.seo_title,seo_description=excluded.seo_description,updated_at=CURRENT_TIMESTAMP`).run(slug,title,JSON.stringify(blocks),status,str(x.seo_title,180),str(x.seo_description,300));
   audit(user.id,'page.saved',slug+'/'+status);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/layout'&&method==='DELETE'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});const x=await jsonBody(req);if(!/^[a-z0-9-]{1,110}$/.test(x.slug||''))return j(res,400,{error:'Invalid page'});
   db.prepare('DELETE FROM layouts WHERE slug=?').run(x.slug);audit(user.id,'page.deleted',x.slug);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/media'&&method==='GET')return j(res,200,db.prepare('SELECT id,filename,alt,size,created_at FROM media ORDER BY id DESC LIMIT 1000').all().map(x=>({...x,url:'/media/'+x.filename})));
  if(p==='/api/admin/media'&&method==='POST'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});if(limited(req,'media',18))return j(res,429,{error:'Upload limit reached'});
   const x=await jsonBody(req,7*1024*1024);const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(x.data||''));if(!m||m[2].length>6*1024*1024)return j(res,400,{error:'PNG, JPEG or WebP under 4MB only'});
   const buf=Buffer.from(m[2],'base64');if(buf.length<20||buf.length>4*1024*1024)return j(res,400,{error:'File size not allowed'});
   const valid=m[1]==='png'?buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):m[1]==='jpeg'?buf[0]===255&&buf[1]===216&&buf[2]===255:buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';
   if(!valid)return j(res,400,{error:'Invalid image signature'});
   const ext=m[1]==='jpeg'?'jpg':m[1],filename=hex(16).toString('hex')+'.'+ext;
   fs.writeFileSync(path.join(storage,'media',filename),buf,{flag:'wx',mode:0o600});
   const inserted=db.prepare('INSERT INTO media(filename,mime,alt,size) VALUES(?,?,?,?)').run(filename,ext==='jpg'?'image/jpeg':'image/'+ext,str(x.alt,220),buf.length);
   audit(user.id,'media.uploaded',filename);return j(res,200,{ok:true,id:Number(inserted.lastInsertRowid),url:'/media/'+filename,filename,alt:str(x.alt,220),size:buf.length});
  }
  if(p==='/api/admin/media'&&method==='PATCH'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});const x=await jsonBody(req),id=Number(x.id);if(!Number.isSafeInteger(id)||id<=0)return j(res,400,{error:'Invalid ID'});
   db.prepare('UPDATE media SET alt=? WHERE id=?').run(str(x.alt,220),id);audit(user.id,'media.alt_updated',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/media'&&method==='DELETE'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});const x=await jsonBody(req),row=db.prepare('SELECT filename FROM media WHERE id=?').get(Number(x.id));if(!row)return j(res,404,{error:'Media not found'});
   db.prepare('DELETE FROM media WHERE id=?').run(Number(x.id));try{fs.unlinkSync(path.join(storage,'media',row.filename))}catch{}audit(user.id,'media.deleted',row.filename);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/inquiries'&&method==='GET')return j(res,200,db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 1000').all());
  if(p==='/api/admin/inquiries'&&method==='PATCH'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});const x=await jsonBody(req),id=Number(x.id);if(!Number.isSafeInteger(id)||!['new','in-progress','replied','closed'].includes(x.status))return j(res,400,{error:'Invalid enquiry'});
   db.prepare('UPDATE inquiries SET status=?,notes=? WHERE id=?').run(x.status,str(x.notes,2000),id);audit(user.id,'inquiry.updated',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/inquiries'&&method==='DELETE'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});
   const x=await jsonBody(req),id=Number(x.id);if(!Number.isSafeInteger(id)||id<=0)return j(res,400,{error:'Invalid ID'});
   db.prepare('DELETE FROM inquiries WHERE id=?').run(id);audit(user.id,'inquiry.deleted',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/applications'&&method==='GET')return j(res,200,db.prepare('SELECT * FROM applications ORDER BY id DESC LIMIT 1000').all().map(x=>({...x,resume_filename:x.resume_filename?'available':''})));
  if(p==='/api/admin/applications'&&method==='PATCH'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});const x=await jsonBody(req),id=Number(x.id);if(!Number.isSafeInteger(id)||!['new','review','interview','rejected','hired'].includes(x.status))return j(res,400,{error:'Invalid application'});
   db.prepare('UPDATE applications SET status=? WHERE id=?').run(x.status,id);audit(user.id,'application.updated',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/applications'&&method==='DELETE'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});
   const x=await jsonBody(req),id=Number(x.id);if(!Number.isSafeInteger(id)||id<=0)return j(res,400,{error:'Invalid ID'});
   const record=db.prepare('SELECT resume_filename FROM applications WHERE id=?').get(id);
   db.prepare('DELETE FROM applications WHERE id=?').run(id);
   if(record?.resume_filename)try{fs.unlinkSync(path.join(storage,'private',record.resume_filename))}catch{}
   audit(user.id,'application.deleted',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/resume'&&method==='GET'){
   if(!allowed(req,user,'editor'))return j(res,403,{error:'Editor required'});const id=Number(url.searchParams.get('id'));const row=db.prepare('SELECT resume_filename FROM applications WHERE id=?').get(id);
   if(!row||!row.resume_filename)return j(res,404,{error:'Resume not found'});
   res.setHeader('Content-Disposition','attachment; filename="applicant-'+id+'.pdf"');res.setHeader('Cache-Control','private, no-store');return streamFile(res,path.join(storage,'private',row.resume_filename),'application/pdf');
  }
  if(p==='/api/admin/users'&&method==='GET'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});return j(res,200,db.prepare('SELECT id,email,role,active,created_at FROM users ORDER BY id').all());
  }
  if(p==='/api/admin/users'&&method==='POST'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});const x=await jsonBody(req),email=str(x.email,254).toLowerCase(),pass=String(x.password||''),role=x.role;
   if(!emailOK(email)||pass.length<16||pass.length>128||!ROLES[role])return j(res,400,{error:'Valid email, role and 16+ character password required'});
   try{db.prepare('INSERT INTO users(email,password_hash,role) VALUES(?,?,?)').run(email,encodePassword(pass),role);}catch{return j(res,409,{error:'Email already exists'});}audit(user.id,'user.created',email);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/users'&&method==='PATCH'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});const x=await jsonBody(req),id=Number(x.id),role=x.role;if(!Number.isSafeInteger(id)||!ROLES[role])return j(res,400,{error:'Invalid user'});
   const current=db.prepare('SELECT role,active FROM users WHERE id=?').get(id);if(!current)return j(res,404,{error:'User not found'});
   const active=x.active===false?0:1;if(user.id===id&&(role!=='admin'||!active))return j(res,400,{error:'Cannot remove own admin privileges'});
   if(current.role==='admin'&&current.active===1&&(role!=='admin'||!active)&&db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").get().n<=1)return j(res,400,{error:'Cannot remove last administrator'});
   db.prepare('UPDATE users SET role=?,active=? WHERE id=?').run(role,active,id);audit(user.id,'user.updated',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/users'&&method==='DELETE'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});const x=await jsonBody(req),id=Number(x.id);if(!Number.isSafeInteger(id)||id<=0)return j(res,400,{error:'Invalid user'});
   if(user.id===id)return j(res,400,{error:'Cannot delete own account'});
   const current=db.prepare('SELECT role FROM users WHERE id=?').get(id);if(!current)return j(res,404,{error:'User not found'});
   if(current.role==='admin'&&db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").get().n<=1)return j(res,400,{error:'Cannot delete last administrator'});
   db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
   db.prepare('DELETE FROM users WHERE id=?').run(id);audit(user.id,'user.deleted',id);return j(res,200,{ok:true});
  }
  if(p==='/api/admin/password'&&method==='POST'){
   const x=await jsonBody(req),old=String(x.current||''),next=String(x.next||'');const row=db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id);
   if(!verifyPassword(old,row.password_hash)||next.length<16||next.length>128)return j(res,400,{error:'Current password incorrect or new password too short'});
   db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(encodePassword(next),user.id);db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(user.id,sha(cookies(req).sid));audit(user.id,'auth.password-changed');return j(res,200,{ok:true});
  }
  if(p==='/api/admin/audit'&&method==='GET'){
   if(!allowed(req,user,'admin'))return j(res,403,{error:'Admin required'});return j(res,200,db.prepare('SELECT a.*,u.email FROM audit a LEFT JOIN users u ON a.user_id=u.id ORDER BY a.id DESC LIMIT 500').all());
  }
  return j(res,404,{error:'Admin route not found'});
 }
 if((method==='GET'||method==='HEAD')&&p.startsWith('/media/')){
  const filename=p.slice(7);if(!/^[a-f0-9]{32}\.(png|jpg|webp)$/.test(filename))return j(res,404,{error:'Not found'});
  const row=db.prepare('SELECT mime FROM media WHERE filename=?').get(filename);if(!row)return j(res,404,{error:'Not found'});
  const f=path.join(storage,'media',filename);if(!fs.existsSync(f))return j(res,404,{error:'Not found'});return streamFile(res,f,row.mime,{'Cache-Control':'public, max-age=604800, immutable'});
 }
 if(method==='GET'&&p==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end(`User-agent: *\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${siteUrl}/sitemap.xml\n`);}
 if(method==='GET'&&p==='/sitemap.xml'){
  const paths=['/','/about','/services','/industries','/products','/projects','/blog','/careers','/contact','/privacy','/terms'];
  for(const row of db.prepare("SELECT type,slug FROM entries WHERE status='published'").all())paths.push('/'+row.type+'/'+row.slug);
  for(const row of db.prepare("SELECT slug FROM layouts WHERE status='published'").all())if(!paths.includes('/'+row.slug))paths.push('/'+row.slug);
  res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'});return res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(s=>'<url><loc>'+e(siteUrl+s)+'</loc></url>').join('')+'</urlset>');
 }
 if(method!=='GET'&&method!=='HEAD')return j(res,404,{error:'Route not found'});
 const f=path.resolve(pub,'.'+p);if(f.startsWith(pub+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile())return streamFile(res,f,MIME[path.extname(f)]||'application/octet-stream',{'Cache-Control':p==='/index.html'?'no-cache':'public, max-age=3600'});
 if(!p.startsWith('/api/')&&!path.extname(p)&&/^\/[a-z0-9/-]*$/.test(p)){
  // Render crawlable HTML metadata and initial headings; client hydrates page content.
  const builtins=new Set(['/','/about','/services','/industries','/products','/projects','/blog','/careers','/contact','/quote','/privacy','/terms','/admin']);
  let found=builtins.has(p);
  if(!found){const dynamic=/^\/(services|industries|products|careers|blog|projects|pages|testimonials|team|technologies)\/([a-z0-9-]+)$/.exec(p);if(dynamic)found=!!db.prepare('SELECT id FROM entries WHERE type=? AND slug=? AND status=?').get(dynamic[1],dynamic[2],'published');
   if(!found)found=!!db.prepare('SELECT slug FROM layouts WHERE slug=? AND status=?').get(p.slice(1).replaceAll('/','-'),'published');}
  const html=webHtml(p);res.writeHead(found?200:404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(html);
 }
 return j(res,404,{error:'Not found'});
 }catch(err){console.error('Request error',err);j(res,err.httpCode||500,{error:err.httpCode?err.message:'Server request failed'});}
};
const server = http.createServer(handleRequest);
// Cross-platform entry-point detection: file:// string concatenation fails for
// Windows paths and directories containing spaces, #, % or Unicode characters.
// This previously caused the process to exit cleanly WITHOUT starting the app.
const invokedAsMain = Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsMain) {
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') console.error(`AZAROTH cannot start: port ${port} is already in use. Set PORT to another value in .env.`);
    else if (err.code === 'EACCES') console.error(`AZAROTH cannot bind to port ${port}: permission denied.`);
    else console.error('AZAROTH server startup failed:', err);
    process.exitCode = 1;
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`AZAROTH is running at http://localhost:${port}`);
    console.log(`CMS: http://localhost:${port}/admin`);
  });
}

export default function handler(req, res) {
  return handleRequest(req, res);
}
export {server,db,settings,handleRequest};
