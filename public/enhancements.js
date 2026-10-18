/* AZAROTH CMS + Enterprise Responsive Interaction & Product Management Layer */
(()=>{
let csrf=(typeof sessionStorage!=='undefined'?sessionStorage.getItem('azaroth_csrf')||'':''),me=null,layoutCache={},builderPage='home',builderBlocks=[],builderStatus='draft';
let sessionToken=(typeof sessionStorage!=='undefined'?sessionStorage.getItem('azaroth_sid')||'':'');
let mediaCache=[];
const routesKnown=['home','about','services','industries','products','projects','blog','careers','contact','privacy','terms'];
const entityTypes=['products','services','industries','projects','blog','careers','pages','testimonials','team','technologies'];
const getJSON=(v,fallback=[])=>{if(!v)return fallback;try{return typeof v==='string'?JSON.parse(v):v}catch{return fallback}};
const actionURL=u=>(typeof u==='string'&&(/^\/[a-zA-Z0-9/_#?&=.-]*$/.test(u)||/^https:\/\/[\w.-]+(?:\/[^\s"<>]*)?$/.test(u)))?u:'#';
const mediaURL=u=>(typeof u==='string'&&(/^(\/media\/[a-f0-9]{32}\.(png|jpg|webp)|\/images\/[a-z0-9_.-]+\.(png|jpg|webp)|\/logo\.png|\/logo-source\.png|\/icon-(48|192|512)\.png)$/.test(u)||/^https:\/\/[\w.-]+(?:\/[^\s"<>]*)?$/.test(u)))?u:'/logo.png';
const request=async(url,method='GET',data)=>{
  const token=sessionToken||(typeof sessionStorage!=='undefined'?sessionStorage.getItem('azaroth_sid')||'':'');
  const activeCsrf=csrf||(typeof sessionStorage!=='undefined'?sessionStorage.getItem('azaroth_csrf')||'':'');
  const opts={method,credentials:'include',headers:{...(data?{'Content-Type':'application/json'}:{}),...(method!=='GET'&&activeCsrf?{'X-CSRF-Token':activeCsrf}:{}),...(token?{'Authorization':'Bearer '+token,'X-Session-Token':token}:{})},...(data?{body:JSON.stringify(data)}:{})};
  const r=await fetch(url,opts);const x=await r.json();if(!r.ok)throw Error(x.error||'Request failed');return x;
};
const status=(id,msg,error=false)=>{const el=document.querySelector(id);if(el){el.textContent=msg;el.style.color=error?'#a32232':'#126449';}};
const clone=o=>JSON.parse(JSON.stringify(o));
const navItems=()=>getJSON(content.navigation,[]).filter(x=>x&&x.label&&x.url).slice(0,16);
const legacyAbout=typeof about==='function'?about:()=>'';
const legacyHome=typeof home==='function'?home:()=>'';
const legacyContact=typeof contact==='function'?contact:()=>'';
const pageSlug=()=>location.pathname==='/'?'home':location.pathname.slice(1).replaceAll('/','-');
const cursorOptions=['gold-ring','gold-orbit','micro-dot','glass-outline'];

function cursorAppearance(){
 const choice=cursorOptions.includes(content.cursorStyle)?content.cursorStyle:'gold-ring';
 const preferred=Math.max(24,Math.min(62,Number(content.cursorSize)||42));
 const sizes={
  'gold-ring':[Math.round(Math.min(30,preferred*.64)),Math.round(Math.min(36,preferred*.83))],
  'gold-orbit':[Math.round(Math.min(30,preferred*.67)),Math.round(Math.min(36,preferred*.83))],
  'micro-dot':[10,16],
  'glass-outline':[Math.round(Math.min(30,preferred*.67)),Math.round(Math.min(36,preferred*.83))]
 };
 return {choice,base:sizes[choice][0],hover:sizes[choice][1]};
}

function theme(){
 for(const [k,v] of [['--burgundy',content.primary],['--gold',content.gold],['--orange',content.orange],['--cream',content.background],['--ink',content.ink]])document.documentElement.style.setProperty(k,v);
 document.documentElement.dataset.motion=content.animationPreset||'elegant';
 const {choice,base,hover}=cursorAppearance();
 document.documentElement.dataset.cursorStyle=choice;
 document.documentElement.style.setProperty('--cursor-base-size',base+'px');
 document.documentElement.style.setProperty('--cursor-hover-size',hover+'px');
}

header=function(){
 const links=navItems();
 const bTitle=content.brandTitle||content.brand||'AZAROTH';
 const bSubtitle=content.brandSubtitle||content.footerBrandSubtitle||'TECH-HIVE';
 const quoteLabel=content.navCtaLabel||'Request for Quote';
 const quoteLink=actionURL(content.navCtaLink||'/contact?type=quote');
 const renderNavLink=x=>{
  if(x.children&&Array.isArray(x.children)&&x.children.length){
   const isActive=location.pathname===x.url||x.children.some(c=>location.pathname===c.url);
   return `<div class="nav-dropdown"><button class="nav-dropdown-trigger ${isActive?'active':''}" aria-haspopup="true" aria-expanded="false">${esc(x.label)} ${ico('chevron-down')}</button><div class="nav-dropdown-menu">${x.children.map(c=>`<a href="${esc(actionURL(c.url))}" ${c.url.startsWith('/')?'data-link':''} class="nav-dropdown-item">${esc(c.label)} ${ico('arrow-up-right')}</a>`).join('')}</div></div>`;
  }
  return `<a href="${esc(actionURL(x.url))}" ${x.url.startsWith('/')?'data-link':''} class="${location.pathname===x.url?'active':''}">${esc(x.label)}</a>`;
 };
 return `<header class="nav" id="nav"><a data-link href="/" class="brand" aria-label="${esc(bTitle)} ${esc(bSubtitle)} homepage"><img src="${esc(mediaURL(content.logo||'/logo.png'))}" alt="${esc(bTitle)} logo"><div class="brand-lockup"><span class="brand-title">${esc(bTitle)}</span><span class="brand-subtitle">${esc(bSubtitle)}</span></div></a><nav class="links" id="links" aria-label="Main navigation">${links.map(renderNavLink).join('')}</nav><div class="nav-actions"><a href="${esc(quoteLink)}" class="pill primary" data-link>${esc(quoteLabel)} ${ico('arrow-up-right')}</a><button class="menu-btn" aria-controls="links" aria-expanded="false" aria-label="Open menu" id="menu">${ico('menu')}</button></div></header>`;
};

footer=function(){
 const ls=navItems(),social=getJSON(content.socials,[]);
 const fTitle=content.footerBrandTitle||content.brandTitle||content.brand||'AZAROTH';
 const fSubtitle=content.footerBrandSubtitle||content.brandSubtitle||'TECH-HIVE';
 return `<footer class="footer"><div class="wrap"><div class="footer-grid"><div><a data-link href="/" class="footer-brand" aria-label="${esc(fTitle)} ${esc(fSubtitle)}"><img src="${esc(mediaURL(content.logo||'/logo.png'))}" alt="${esc(fTitle)} logo" class="footer-logo"><div class="footer-brand-lockup"><span class="footer-brand-title">${esc(fTitle)}</span><span class="footer-brand-subtitle">${esc(fSubtitle)}</span></div></a><p>${esc(content.footerDescription||content.tagline)}</p><div class="socials">${social.map(x=>`<a href="${esc(actionURL(x.url))}" target="_blank" rel="noopener noreferrer">${esc(x.label)}</a>`).join('')}</div></div><div><h4>Explore</h4>${ls.slice(0,5).map(x=>`<a href="${esc(actionURL(x.url))}" ${x.url.startsWith('/')?'data-link':''}>${esc(x.label)}</a>`).join('')}</div><div><h4>Company</h4>${ls.slice(5).map(x=>`<a href="${esc(actionURL(x.url))}" ${x.url.startsWith('/')?'data-link':''}>${esc(x.label)}</a>`).join('')}<a data-link href="/privacy">Privacy</a><a data-link href="/terms">Terms</a></div><div><h4>Let's connect</h4><a href="mailto:${esc(content.contactEmail)}">${esc(content.contactEmail)}</a><a href="${content.contactPhone?'https://wa.me/'+esc(String(content.contactPhone).replace(/[^0-9]/g,'')):'#'}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin:9px 0">${ico('whatsapp')}&nbsp;${esc(content.contactPhone)}</a><p>${esc(content.contactLocation)}</p></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(content.brand||fTitle)}. All rights reserved.</span><span>Ideas · Technology · Impact</span></div></div></footer>`;
};

cta=function(){
 const eyebrow=content.ctaEyebrow||"LET'S MAKE IT HAPPEN";
 const heading=content.ctaTitle||"Have an idea? Let's build *something great.*";
 const btnText=content.ctaButtonText||"Start a conversation";
 const btnLink=actionURL(content.ctaButtonLink||"/contact");
 return `<section class="cta-section"><div class="wrap cta-inner"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${title(heading)}</h2></div><a data-link href="${esc(btnLink)}" class="pill primary">${esc(btnText)} ${ico('arrow-up-right')}</a></div></section>`;
};

serviceCards=function(){
 const published=entryCache.services||[],data=published.length?published.map((x,i)=>({icon:['code-2','cloud','smartphone','brain-circuit','layers-3','shield-check'][i%6],name:x.title,description:x.summary,url:'/services/'+x.slug,image:x.image})):arr('services');
 return `<div class="grid grid-3">${data.map((x,i)=>`<article class="card service-card reveal" style="transition-delay:${i%3*70}ms"><div class="tile-icon ${['peach','sky','lavender','mint'][i%4]}">${ico(x.icon||'code-2')}</div><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><a data-link href="${esc(x.url||'/contact')}" class="card-arrow">Explore service ${ico('arrow-up-right')}</a></article>`).join('')}</div>`;
};

industryCards=function(){
 const published=entryCache.industries||[],data=published.length?published.map((x,i)=>({icon:['heart-pulse','chart-no-axes-combined','shopping-bag','graduation-cap','factory','truck'][i%6],name:x.title,description:x.summary,tone:['mint','peach','lavender','sky'][i%4],url:'/industries/'+x.slug,image:x.image})):arr('industries');
 return `<div class="grid grid-3">${data.map((x,i)=>`<article class="card industry-card reveal" style="transition-delay:${i%3*65}ms"><div class="industry-visual ${esc(x.tone||'peach')}">${x.image?`<img class="industry-photo" src="${esc(mediaURL(x.image))}" alt="${esc(x.name)}" loading="lazy">`:ico(x.icon||'building-2')}</div><div class="industry-body"><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p><a class="card-arrow" data-link href="${esc(x.url||'/contact')}">Explore solutions ${ico('arrow-up-right')}</a></div></article>`).join('')}</div>`;
};

function visualTestimonials(){
 const people=entryCache.testimonials||[];
 if(!people.length)return '';
 return `<section class="cream-section"><div class="wrap">${sectionHead('CLIENT VOICES','What Our Partners Say','Published, approved testimonials from our customers.')}<div class="grid grid-3">${people.slice(0,6).map(x=>`<blockquote class="card reveal testimonial"><p>“${esc(x.body||x.summary)}”</p><footer><strong>${esc(x.title)}</strong><small>${esc(x.category||'Client')}</small></footer></blockquote>`).join('')}</div></div></section>`;
}

function technologyShowcase(){
 const list=entryCache.technologies||[];
 if(!list.length)return '';
 return `<section><div class="wrap">${sectionHead('TECHNOLOGY STACK','Built with Modern Technology','Our published technology capabilities.')}<div class="technology-grid">${list.slice(0,24).map(x=>`<div class="technology-pill">${x.image?`<img src="${esc(mediaURL(x.image))}" alt="">`:ico('code-2')}<span>${esc(x.title)}</span></div>`).join('')}</div></div></section>`;
}

function teamShowcase(){
 const staff=entryCache.team||[];
 if(!staff.length)return '';
 return `<section><div class="wrap">${sectionHead('MEET THE TEAM','People Behind the Technology','Meet our published leadership and team profiles.')}<div class="grid grid-3">${staff.slice(0,12).map(x=>`<article class="card team-card reveal">${x.image?`<img src="${esc(mediaURL(x.image))}" alt="${esc(x.title)}" loading="lazy">`:''}<h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p></article>`).join('')}</div></div></section>`;
}

function productVisual(item, compact=false){
 if(item?.image){return `<img src="${esc(mediaURL(item.image))}" alt="${esc(item.title)} product preview" loading="lazy">`;}
 return `<div class="product-concept-art ${compact?'compact':''}" aria-hidden="true"><div class="concept-top"><span></span><span></span><span></span><b>PRODUCT / EXPERIENCE</b></div><div class="concept-main"><div class="concept-menu"><i></i><i></i><i></i><i></i></div><div class="concept-data"><div class="concept-line"></div><div class="concept-metrics"><i></i><i></i><i></i></div><div class="concept-graph"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div class="concept-line short"></div></div></div></div>`;
}

function productTags(item){
 return String(item.technology||'').split(/[,\n|]/).map(t=>t.trim()).filter(Boolean).slice(0,6).map(t=>`<span>${esc(t)}</span>`).join('');
}

function featuredProducts(block={}){
 if(content.homeProductsEnabled==='false')return '';
 const products=(entryCache.products||[]).slice(0,3);
 const label=block.eyebrow||'OUR PRODUCT PORTFOLIO';
 const heading=block.title||content.homeProductsTitle||'Software for *Specific Operational Workflows*';
 const intro=block.description||content.homeProductsDescription||'Azaroth Tech-Hive develops high-performance platforms designed to support defined business needs. Explore our verified capabilities and current product status.';
 const headingUI=`<div class="product-section-heading reveal"><div class="section-head"><div class="eyebrow">${esc(label)}</div><h2>${title(heading)}</h2><p>${esc(intro)}</p></div><a data-link href="/products" class="product-section-link">Explore all products ${ico('arrow-up-right')}</a></div>`;
 if(!products.length)return `<section class="product-showcase" id="featured-products"><div class="wrap">${headingUI}<div class="product-empty reveal"><div class="product-empty-art">${productVisual(null)}</div><div class="product-empty-copy"><span class="product-label">A SPACE FOR WHAT'S NEXT</span><h3>Designed to solve real-world challenges.</h3><p>We create thoughtfully designed digital platforms for modern organisations. Have an idea for a tailored product? Let's build it together.</p><a data-link class="pill primary" href="/contact">Discuss Your Product ${ico('arrow-up-right')}</a></div></div></div></section>`;
 
 return `<section class="product-showcase" id="featured-products"><div class="wrap">${headingUI}<div class="products-grid-3">${products.map((item,i)=>{
  const url='/products/'+encodeURIComponent(item.slug);
  const techPills=productTags(item);
  return `<article class="product-enterprise-card reveal" style="transition-delay:${i*80}ms"><div><span class="product-status-tag">Under Development</span><div class="product-category-eyebrow">${esc(item.category||'ENTERPRISE PLATFORM')}</div><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p>${techPills?`<div class="product-tags">${techPills}</div>`:''}</div><a data-link href="${esc(url)}" class="product-card-cta">Explore Platform ${ico('arrow-up-right')}</a></article>`;
 }).join('')}</div></div></section>`;
}

hero=function(){
 const bLogo=mediaURL(content.heroImage||content.logo||'/logo.png');
 const priText=content.heroCtaLabel||'Request for Quote';
 const priLink=actionURL(content.heroCtaLink||'/contact?type=quote');
 const secText=content.heroSecondaryCtaLabel||'Our Portfolio';
 const secLink=actionURL(content.heroSecondaryCtaLink||'/products');
 return `<section class="hero"><div class="wrap"><div class="hero-inner"><div class="hero-copy reveal"><div class="eyebrow">${esc(content.heroEyebrow||'SOFTWARE ENGINEERING & DIGITAL SOLUTIONS')}</div><h1>${title(content.heroTitle,true)}</h1><p>${esc(content.heroDescription)}</p><div class="actions"><a data-link href="${esc(priLink)}" class="pill primary">${esc(priText)} ${ico('arrow-up-right')}</a><a data-link href="${esc(secLink)}" class="pill secondary">${esc(secText)} ${ico('arrow-right')}</a></div></div><div class="hero-art reveal"><div class="hero-system-window"><div class="hero-system-header"><div class="hero-system-dots"><span></span><span></span><span></span></div><div class="hero-system-title">AZAROTH SYSTEM ARCHITECTURE // v2.6</div></div><div class="hero-system-body"><div class="hero-system-metrics"><div class="hero-metric-tile"><small>PLATFORM STATE</small><strong><span class="badge-green"></span> ACTIVE</strong></div><div class="hero-metric-tile"><small>ZERO-TRUST RBAC</small><strong>ENFORCED</strong></div><div class="hero-metric-tile"><small>DEPLOYMENT</small><strong>MULTI-CLOUD</strong></div></div><div class="hero-system-flow"><div class="hero-flow-step"><span>01. Operational Telemetry</span><code>CONNECTED</code></div><div class="hero-flow-step"><span>02. Distributed Data Fabric</span><code>SYNCHRONIZED</code></div><div class="hero-flow-step"><span>03. Automated Workflows</span><code>OPTIMIZED</code></div></div></div></div></div></div><div class="hero-stats reveal">${arr('stats').map(s=>`<div><strong>${esc(s.value)}</strong><small>${esc(s.label)}</small></div>`).join('')}</div></div></section>`;
};

aboutPreview=function(){
 const aImg=mediaURL(content.aboutImage||'/images/about_corporate_studio.jpg');
 return `<section class="cream-section"><div class="wrap about-grid"><div class="reveal"><div class="eyebrow">ABOUT OUR COMPANY</div><h2>${title(content.aboutTitle,true)}</h2><p>${esc(content.aboutDescription)}</p><div class="actions"><a href="/about" data-link class="pill primary">Discover our story ${ico('arrow-up-right')}</a></div></div><div class="photo-frame reveal"><img loading="lazy" src="${esc(aImg)}" alt="Corporate technology studio"><div class="mission-card"><div class="tile-icon">${ico('target')}</div><div><strong>Our mission</strong><p>${esc(content.mission)}</p></div></div></div></div></section>`;
};

home=function(){
 const sEyebrow=content.homeServicesEyebrow||'WHAT WE DO';
 const sTitle=content.homeServicesTitle||'Technology Solutions, Thoughtfully Built';
 const sDesc=content.homeServicesDescription||'From ambitious ideas to reliable products, our teams bring the right technology to every challenge.';
 const iEyebrow=content.homeIndustriesEyebrow||'OUR EXPERTISE';
 const iTitle=content.homeIndustriesTitle||'Technology for Every Possibility';
 const iDesc=content.homeIndustriesDescription||'Focused digital solutions for organizations across a wide range of industries.';
 const aEyebrow=content.homeApproachEyebrow||'OUR APPROACH';
 const aTitle=content.homeApproachTitle||'Built Around People. Driven by Purpose.';
 const aDesc=content.homeApproachDescription||'A collaborative way of working, grounded in clarity, creativity and lasting value.';

 return hero()+aboutPreview()+
  `<section><div class="wrap">${sectionHead(sEyebrow,sTitle,sDesc)}${serviceCards()}</div></section>`+
  featuredProducts()+
  `<section class="cream-section"><div class="wrap">${sectionHead(iEyebrow,iTitle,iDesc)}${industryCards()}</div></section>`+
  technologyShowcase()+visualTestimonials()+
  `<section><div class="wrap">${sectionHead(aEyebrow,aTitle,aDesc)}${values()}</div></section>`+
  cta();
};

function howWeWorkSection(){
 const steps=arr('stats');
 return `<section class="cream-section" id="how-we-work"><div class="wrap">${sectionHead('OUR PROCESS & METHODOLOGY','How We Work','A structured, disciplined engineering framework designed for clarity, predictability, and velocity.')}<div class="how-we-work-grid">${steps.map(s=>`<div class="work-step-card reveal"><div class="work-step-num">${esc(s.value)}</div><h3>${esc(s.label.split('—')[0]||s.label)}</h3><p>${esc(s.label.split('—')[1]||'Disciplined engineering methodology with automated verification.')}</p></div>`).join('')}</div></div></section>`;
}

about=function(){
 const aImg=mediaURL(content.aboutImage||'/images/about_corporate_studio.jpg');
 return `<section class="page-hero about-top" id="who-we-are"><div class="wrap about-grid"><div class="reveal"><div class="eyebrow">ABOUT US</div><h1>${title(content.aboutTitle,true)}</h1><p>${esc(content.aboutDescription)}</p><div class="actions"><a href="/contact" data-link class="pill primary">Start a conversation ${ico('arrow-up-right')}</a></div></div><div class="photo-frame reveal"><img src="${esc(aImg)}" alt="Corporate collaborative studio"><div class="mission-card"><div class="tile-icon">${ico('target')}</div><div><strong>Our mission</strong><p>${esc(content.mission)}</p></div></div></div></div></section><section id="vision-mission"><div class="wrap">${sectionHead('PURPOSE & DIRECTION','Driven by Innovation: Vision & Mission Before All Else','Guided by clarity of purpose, architectural discipline, and customer focus.')}<div class="grid grid-3"><div class="card reveal"><div class="tile-icon mint">${ico('eye')}</div><h3>Our Vision</h3><p>${esc(content.vision||'To engineer transformative, dependable digital systems that simplify complexity and power sustainable organizational progress.')}</p></div><div class="card reveal"><div class="tile-icon peach">${ico('target')}</div><h3>Our Mission</h3><p>${esc(content.mission)}</p></div><div class="card reveal"><div class="tile-icon lavender">${ico('heart-handshake')}</div><h3>Our Commitment</h3><p>Architectural integrity, transparent partnerships, and relentless focus on measurable operational outcomes.</p></div></div></div></section>`+howWeWorkSection()+`<section id="values"><div class="wrap">${sectionHead('WHAT WE BELIEVE','Core Values That Drive Engineering','Disciplined principles behind how we collaborate and engineer software.')}${values()}</div></section>`+teamShowcase()+cta();
};

services=function(){
 const sEyebrow=content.homeServicesEyebrow||'WHAT WE DO';
 const sTitle=content.homeServicesTitle||'Technology Solutions, Thoughtfully Built';
 const sDesc=content.homeServicesDescription||'From ambitious ideas to reliable products, our teams bring the right technology to every challenge.';
 return pageHero('OUR CAPABILITIES','Enterprise Technology Solutions & Architecture','Architecting mission-critical platforms, high-performance web and mobile systems, and scalable enterprise cloud infrastructure.')+
  `<section><div class="wrap">${sectionHead(sEyebrow,sTitle,sDesc)}${serviceCards()}</div></section>`+
  howWeWorkSection()+
  `<section><div class="wrap">${sectionHead('ENGAGEMENT MODELS','How We Partner With You','Flexible delivery frameworks tailored to your operating velocity.')}<div class="grid grid-3"><div class="card reveal"><div class="tile-icon mint">${ico('users')}</div><h3>Dedicated Engineering Squads</h3><p>Cross-functional teams of software architects, senior engineers, and QA specialists integrated seamlessly with your organization.</p></div><div class="card reveal"><div class="tile-icon peach">${ico('check-circle-2')}</div><h3>Fixed-Scope Product Delivery</h3><p>Turnkey product engineering from architectural specification to deployment with clear milestones and SLA guarantees.</p></div><div class="card reveal"><div class="tile-icon lavender">${ico('compass')}</div><h3>Architecture & Advisory</h3><p>Deep-dive system audits, cloud migration roadmaps, zero-trust security audits, and technology modernization guidance.</p></div></div></div></section>`+
  cta();
};

industries=function(){
 const iEyebrow=content.homeIndustriesEyebrow||'OUR EXPERTISE';
 const iTitle=content.homeIndustriesTitle||'Technology for Every Possibility';
 const iDesc=content.homeIndustriesDescription||'Focused digital solutions for organizations across a wide range of industries.';
 return pageHero('TARGET VERTICALS','Specialized Industry Technology & Architecture','Deep domain expertise engineered around specific regulatory, compliance, and operational workflows.')+
  `<section class="cream-section"><div class="wrap">${sectionHead(iEyebrow,iTitle,iDesc)}${industryCards()}</div></section>`+
  `<section><div class="wrap">${sectionHead('COMPLIANCE & INTEGRITY','Built for Regulated Environments','Every system we design adheres to stringent data sovereignty, auditability, and protection standards.')}<div class="grid grid-3"><div class="card reveal"><div class="tile-icon peach">${ico('shield-alert')}</div><h3>Security by Design</h3><p>Zero-trust role-based access control, encrypted data stores at rest and in transit, and continuous vulnerability scanning.</p></div><div class="card reveal"><div class="tile-icon mint">${ico('file-check')}</div><h3>Audit Readiness</h3><p>Immutable event logging, tamper-evident audit trails, and automated compliance reporting for regulatory oversight.</p></div><div class="card reveal"><div class="tile-icon sky">${ico('lock')}</div><h3>Data Sovereignty</h3><p>Multi-region and on-premise deployment configurations respecting GDPR, HIPAA, and regional sovereignty mandates.</p></div></div></div></section>`+
  cta();
};

products=function(){
 return pageHero('OUR PORTFOLIO','Software for Specific Operational Workflows','Azaroth Tech-Hive architects high-performance software platforms designed to solve defined business bottlenecks.')+
  featuredProducts({eyebrow:'CORE PLATFORMS',title:'Active Products & Operational Workflows',description:'Explore our production-ready software systems, active deployments, and technology specifications.'})+
  `<section class="cream-section"><div class="wrap">${sectionHead('CUSTOM PRODUCT INITIATIVES','Need a Bespoke Platform?','If your organization has unique workflow constraints, our engineering team can design and build a proprietary solution.')}<div class="about-grid"><div class="reveal"><p style="font-size:16px;line-height:1.8">Off-the-shelf software often forces organizations into rigid, inefficient processes. We partner with ambitious leaders to engineer custom platforms that fit your precise operating model—scalable, secure, and fully owned by you.</p><div class="actions"><a data-link href="/contact?type=quote" class="pill primary">Discuss Custom Platform ${ico('arrow-up-right')}</a></div></div><div class="photo-frame reveal"><img src="${esc(mediaURL(content.aboutImage||'/images/about_corporate_studio.jpg'))}" alt="Engineering Studio"></div></div></div></section>`+
  cta();
};

contact=function(){
 const isRfq=Boolean(typeof location!=='undefined'&&((location.search&&location.search.includes('quote'))||location.pathname==='/quote'));
 return pageHero('GET IN TOUCH','Let’s Build Something Great','Tell us about your strategic software initiative, integration needs, or request a quote.')+`<section><div class="wrap contact-grid"><div class="reveal"><div class="eyebrow">LET'S CONNECT</div><h2>Start a <span class="accent">conversation.</span></h2><p>Whether you have a detailed specification or an early architectural challenge, our engineering leadership is ready to listen.</p><div class="contact-info"><a href="${content.contactEmail?'mailto:'+esc(content.contactEmail):'#'}" class="card" style="text-decoration:none"><div class="tile-icon peach">${ico('mail')}</div><div><strong>Email Us</strong><span>${esc(content.contactEmail||'hello@azaroth-techhive.com')}</span></div></a><a href="${content.contactPhone?'https://wa.me/'+esc(String(content.contactPhone).replace(/[^0-9]/g,'')):'#'}" target="_blank" rel="noopener noreferrer" class="card" style="text-decoration:none"><div class="tile-icon mint">${ico('phone')}</div><div><strong>Phone / WhatsApp</strong><span>${esc(content.contactPhone||'+91 6379480931')}</span></div></a><div class="card"><div class="tile-icon lavender">${ico('map-pin')}</div><div><strong>Headquarters</strong><span>${esc(content.contactLocation||'24, Malaviya Avenue, Thiruvanmiyur, Chennai, India')}</span></div></div></div></div><form id="contactForm" class="form-card reveal"><div class="rfq-mode-toggle"><button type="button" class="${!isRfq?'active':''}" id="btnGeneralMode">General Enquiry</button><button type="button" class="${isRfq?'active':''}" id="btnRfqMode">Request for Quote</button></div><h3 id="formHeading">${isRfq?'Request for Quote (RFQ)':'Send us a message'}</h3><p id="formSub">${isRfq?'Provide your initiative specifications and timeline for an executive estimate.':'We review every enquiry and reply within 24 hours.'}</p><div class="form-grid"><div class="field"><label for="name">Full Name *</label><input id="name" name="name" required maxlength="150" placeholder="Your name"></div><div class="field"><label for="email">Email Address *</label><input id="email" name="email" type="email" required maxlength="254" placeholder="you@company.com"></div><div class="field"><label for="company">Company Name</label><input id="company" name="company" placeholder="Organization name"></div><div class="field"><label for="phone">Phone Number</label><input id="phone" name="phone" type="tel" placeholder="+91 00000 00000"></div><div class="field full"><label for="service">Enquiry About *</label><select id="service" name="service" required><option value="General" ${!isRfq?'selected':''}>General</option><option value="Products">Products</option><option value="Enquiries">Enquiries</option><option value="Request for Quote" ${isRfq?'selected':''}>Request for Quote</option></select></div></div><div id="rfqScopeContainer" style="display:${isRfq?'block':'none'};margin-bottom:16px"><div style="font-weight:700;font-size:12px;color:var(--ink);margin-bottom:8px">Select Project Scope Requirements:</div><div class="rfq-scope-grid"><label class="rfq-scope-item"><input type="checkbox" name="scope" value="Web Applications"> Web Applications & Platforms</label><label class="rfq-scope-item"><input type="checkbox" name="scope" value="Mobile Platforms"> Mobile App Development</label><label class="rfq-scope-item"><input type="checkbox" name="scope" value="Enterprise AI"> Enterprise AI & Automation</label><label class="rfq-scope-item"><input type="checkbox" name="scope" value="Cloud & DevOps"> Cloud Architecture & DevOps</label><label class="rfq-scope-item"><input type="checkbox" name="scope" value="Dedicated Squad"> Dedicated Engineering Team</label><label class="rfq-scope-item"><input type="checkbox" name="scope" value="Systems Integration"> Systems & API Integration</label></div><div class="form-grid" style="margin-top:12px"><div class="field"><label for="rfqTimeline">Desired Timeline</label><select id="rfqTimeline" name="timeline"><option value="Immediate (< 1 month)">Immediate (&lt; 1 month)</option><option value="1 - 3 months" selected>1 – 3 months</option><option value="3 - 6 months">3 – 6 months</option><option value="Exploratory / Discovery">Exploratory / Discovery</option></select></div><div class="field"><label for="rfqBudget">Estimated Budget Tier</label><select id="rfqBudget" name="budget"><option value="Under $25,000">Under $25,000</option><option value="$25,000 - $50,000" selected>$25,000 – $50,000</option><option value="$50,000 - $100,000">$50,000 – $100,000</option><option value="$100,000+">$100,000+</option></select></div></div></div><div class="field"><label for="message">Your Message *</label><textarea id="message" name="message" minlength="10" required placeholder="Describe your initiative, goals, or scope requirements..."></textarea></div><div style="display:none"><input name="website" tabindex="-1" autocomplete="off"></div><label class="privacy-check"><input type="checkbox" name="consent" required> I agree to the <a href="/privacy" target="_blank" rel="noopener">privacy notice</a> and consent to my enquiry being stored for a reply.</label><button type="submit" class="pill primary">Send Enquiry ${ico('arrow-up-right')}</button><p id="formResult" role="status" aria-live="polite"></p></form></div></section>`;
};

privacy=function(){
 return pageHero('LEGAL','Privacy Policy','How information submitted through this website is handled.')+`<section><div class="wrap legal-copy"><h2>Privacy notice</h2>${esc(content.privacyText||'').split('\n').map(p=>`<p>${p}</p>`).join('')}<p>Contact: <a href="mailto:${esc(content.contactEmail)}">${esc(content.contactEmail)}</a></p></div></section>`;
};

function terms(){
 return pageHero('LEGAL','Terms of Use','Important information regarding use of this website.')+`<section><div class="wrap legal-copy"><h2>Website terms</h2>${esc(content.termsText||'').split('\n').map(p=>`<p>${p}</p>`).join('')}</div></section>`;
}

function jobForm(slug){
 return `<section class="cream-section"><div class="wrap" style="max-width:780px"><div class="eyebrow">JOIN THE TEAM</div><h2>Apply for this role</h2><form class="form-card" id="jobForm"><input type="hidden" name="job" value="${esc(slug)}"><div class="form-grid"><div class="field"><label>Your name *</label><input name="name" required maxlength="150"></div><div class="field"><label>Email address *</label><input name="email" type="email" required maxlength="254"></div></div><div class="field"><label>Portfolio or LinkedIn URL</label><input name="portfolio" type="url" placeholder="https://"></div><div class="field"><label>Cover note (optional)</label><textarea name="message" maxlength="3000"></textarea></div><div class="field"><label>CV / résumé (PDF, max 2MB)</label><input name="resume" type="file" accept="application/pdf,.pdf"></div><label class="privacy-check"><input type="checkbox" name="consent" required> I consent to storing my application and uploaded résumé for recruitment purposes. <a href="/privacy" target="_blank">Privacy policy</a></label><input name="website" class="hidden-trap" tabindex="-1" autocomplete="off"><button type="submit" class="pill primary">Submit application ${ico('send')}</button><p id="jobResult" role="status" aria-live="polite"></p></form></div></section>`;
}

/* Rich Public Product Landing Page Renderer */
function productDetail(item){
 const features=getJSON(item.features,[]);
 const specs=getJSON(item.specifications,[]);
 const faqs=getJSON(item.faqs,[]);
 const rawGallery=getJSON(item.gallery,[]);
 const gallery=Array.isArray(rawGallery)?rawGallery:[];
 const position=item.image_position||'right';
 const heroCtaText=item.hero_cta_label||'Discuss Product';
 const heroCtaLink=actionURL(item.hero_cta_link||'/contact');
 const secCtaText=item.secondary_cta_label||'Explore Architecture';
 const secCtaLink=actionURL(item.secondary_cta_link||'/contact');
 const leadImage=item.image?mediaURL(item.image):'';

 const heroHtml=`<section class="product-page-hero"><div class="wrap"><div class="product-hero-inner ${position==='left'?'reverse':position==='full'?'full':''}"><div class="product-hero-copy reveal"><div class="product-badge">${ico('package')} <span>${esc(item.category||'AZAROTH SOFTWARE PRODUCT')}</span></div><h1>${title(item.title,true)}</h1><p class="hero-desc">${esc(item.summary||item.body)}</p>${item.technology?`<div class="product-tags">${productTags(item)}</div>`:''}<div class="product-actions-group"><a href="${esc(heroCtaLink)}" data-link class="pill primary">${esc(heroCtaText)} ${ico('arrow-up-right')}</a>${item.secondary_cta_label?`<a href="${esc(secCtaLink)}" data-link class="pill secondary">${esc(secCtaText)} ${ico('arrow-right')}</a>`:''}</div></div>${leadImage?`<div class="product-hero-media reveal"><img src="${esc(leadImage)}" alt="${esc(item.title)} preview" loading="lazy"></div>`:`<div class="product-hero-media reveal">${productVisual(item)}</div>`}</div></div></section>`;

 let overviewHtml='';
 if(item.body&&item.body.trim()!==(item.summary||'').trim()){
  overviewHtml=`<section class="cream-section"><div class="wrap detail-body"><div class="section-head reveal"><div class="eyebrow">PRODUCT OVERVIEW</div><h2>Architected for Performance & Scale</h2></div><div class="detail-text reveal">${esc(item.body).split('\n').filter(Boolean).map(p=>`<p>${p}</p>`).join('')}</div></div></section>`;
 }

 let featuresHtml='';
 if(features.length){
  featuresHtml=`<section><div class="wrap">${sectionHead('CAPABILITIES','Core Features & Business Impact','Built with specialized workflows to solve real operational bottlenecks.')}<div class="grid grid-3">${features.map((f,i)=>`<article class="card reveal" style="transition-delay:${i%3*70}ms"><div class="tile-icon ${['peach','sky','mint','lavender'][i%4]}">${ico(f.icon||'sparkles')}</div><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p></article>`).join('')}</div></div></section>`;
 }

 let galleryHtml='';
 if(gallery.length){
  galleryHtml=`<section class="cream-section"><div class="wrap">${sectionHead('SCREENSHOTS & INTERFACES','Visual Tour of the Platform','Explore the interface and user workflows.')}<div class="product-gallery-slider">${gallery.map(img=>{
   const url=typeof img==='object'?img.url:img;
   const caption=typeof img==='object'?img.caption||img.alt:'';
   return `<div class="product-gallery-card reveal"><img src="${esc(mediaURL(url))}" alt="${esc(caption||item.title)}" loading="lazy">${caption?`<p>${esc(caption)}</p>`:''}</div>`;
  }).join('')}</div></div></section>`;
 }

 let specsHtml='';
 if(specs.length){
  const groups={};
  specs.forEach(s=>{const g=s.group||'Technical Specifications';if(!groups[g])groups[g]=[];groups[g].push(s);});
  specsHtml=`<section><div class="wrap">${sectionHead('SPECIFICATIONS','Technical Architecture & Environment','Detailed system specifications, deployment options, and integration standards.')}<div class="product-specs-card reveal"><div class="product-specs-grid">${Object.entries(groups).map(([grp,rows])=>`<div class="spec-group"><h4>${esc(grp)}</h4>${rows.map(r=>`<div class="spec-row"><strong>${esc(r.label)}</strong><span>${esc(r.value)}</span></div>`).join('')}</div>`).join('')}</div></div></div></section>`;
 }

 let faqsHtml='';
 if(faqs.length){
  faqsHtml=`<section class="cream-section"><div class="wrap">${sectionHead('QUESTIONS & ANSWERS','Frequently Asked Questions','Common inquiries regarding setup, deployment, and customization.')}<div class="faq-wrap product-faq-wrap reveal">${faqs.map(faq=>`<details class="faq-item"><summary>${esc(faq.question||faq.title)}</summary><p>${esc(faq.answer||faq.description)}</p></details>`).join('')}</div></div></section>`;
 }

 const bottomNav=`<div class="wrap" style="padding:40px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px"><a href="/products" data-link class="pill secondary">${ico('arrow-left')} Back to All Products</a><a href="${esc(heroCtaLink)}" data-link class="pill primary">${esc(heroCtaText)} ${ico('arrow-up-right')}</a></div>`;

 return heroHtml+overviewHtml+featuresHtml+galleryHtml+specsHtml+faqsHtml+bottomNav+cta();
}

detail=function(type,slug){
 const item=(entryCache[type]||[]).find(x=>x.slug===slug);
 if(!item)return pageHero('CONTENT NOT FOUND','This page is unavailable','The requested content may not be published.');
 if(type==='products')return productDetail(item);
 const gallery=getJSON(item.gallery||'[]');
 return pageHero(type.toUpperCase(),item.title,esc(item.summary))+`<section><div class="wrap detail-body">${item.image?`<img src="${esc(mediaURL(item.image))}" alt="${esc(item.title)}">`:''}<div class="detail-metadata">${[['Category',item.category],['Location',item.location],['Job type',item.job_type],['Technology',item.technology]].filter(x=>x[1]).map(([key,value])=>`<span><b>${key}:</b> ${esc(value)}</span>`).join('')}</div><div class="detail-text">${esc(item.body).split('\n').map(x=>`<p>${x||'&nbsp;'}</p>`).join('')}</div>${gallery.length?`<div class="gallery-grid">${gallery.map(url=>`<img loading="lazy" src="${esc(mediaURL(typeof url==='object'?url.url:url))}" alt="${esc(item.title)} project image">`).join('')}</div>`:''}<a href="/${type}" data-link class="pill secondary">${ico('arrow-left')} Back to ${esc(type)}</a></div></section>`+(type==='careers'?jobForm(slug):cta());
};

function imageText(b){
 let image=b.image?`<img src="${esc(mediaURL(b.image))}" alt="${esc(b.title||'Corporate image')}" loading="lazy">`:`<div class="abstract-image"><img src="${esc(mediaURL(content.logo||'/logo.png'))}" alt="${esc(content.brand)}"></div>`;
 return `<section class="cream-section"><div class="wrap section-image-text ${b.align==='reverse'?'reverse':''}"><div class="reveal"><div class="eyebrow">${esc(b.eyebrow)}</div><h2>${title(b.title||'')}</h2><p>${esc(b.description||'')}</p>${b.buttonText?`<a href="${esc(actionURL(b.buttonLink||'/contact'))}" data-link class="pill primary">${esc(b.buttonText)} ${ico('arrow-up-right')}</a>`:''}</div><div class="photo-frame reveal">${image}</div></div></section>`;
}

function blockCards(items){
 return `<div class="grid grid-3">${items.slice(0,24).map((x,i)=>`<div class="card reveal"><div class="tile-icon ${['peach','sky','mint','lavender'][i%4]}">${ico(x.icon||'sparkles')}</div><h3>${esc(x.title||x.name)}</h3><p>${esc(x.description||x.text)}</p></div>`).join('')}</div>`;
}

function renderBlocks(blocks){
 return blocks.map(b=>{
  const eyebrow=b.eyebrow||'DISCOVER MORE',txt=b.description||'';
  switch(b.type){
  case 'hero':return `<section class="hero block-hero"><div class="wrap hero-inner"><div class="hero-copy reveal"><div class="eyebrow">${esc(eyebrow)}</div><h1>${title(b.title||'',true)}</h1><p>${esc(txt)}</p>${b.buttonText?`<a class="pill primary" data-link href="${esc(actionURL(b.buttonLink||'/contact'))}">${esc(b.buttonText)} ${ico('arrow-up-right')}</a>`:''}</div><div class="hero-art reveal"><div class="halo"></div><img src="${esc(mediaURL(b.image||content.logo||'/logo.png'))}" alt="${esc(content.brand)}"><div class="art-tag">${esc(content.tagline)}</div></div></div></section>`;
  case 'text':return `<section><div class="wrap prose-block reveal"><div class="eyebrow">${esc(eyebrow)}</div><h2>${title(b.title||'')}</h2>${esc(b.text||txt).split('\n').map(t=>`<p>${t}</p>`).join('')}</div></section>`;
  case 'image-text':return imageText(b);
  case 'cards':return `<section><div class="wrap">${sectionHead(esc(eyebrow),b.title||'',esc(txt))}${blockCards(b.items||[])}</div></section>`;
  case 'stats':return `<section class="cream-section"><div class="wrap">${sectionHead(esc(eyebrow),b.title||'',esc(txt))}<div class="stats-row">${(b.items||[]).slice(0,8).map(x=>`<div class="stat-box"><strong>${esc(x.value)}</strong><small>${esc(x.label)}</small></div>`).join('')}</div></div></section>`;
  case 'faq':return `<section><div class="wrap faq-wrap">${sectionHead(esc(eyebrow),b.title||'',esc(txt))}${(b.items||[]).slice(0,25).map(x=>`<details class="faq-item"><summary>${esc(x.title||x.question)}</summary><p>${esc(x.description||x.answer)}</p></details>`).join('')}</div></section>`;
  case 'cta':return `<section class="cta-section"><div class="wrap cta-inner"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${title(b.title||'')}</h2><p>${esc(txt)}</p></div><a href="${esc(actionURL(b.buttonLink||'/contact'))}" data-link class="pill primary">${esc(b.buttonText||'Get in touch')} ${ico('arrow-up-right')}</a></div></section>`;
  case 'collection':if(b.collection==='products')return featuredProducts(b);return `<section><div class="wrap">${sectionHead(esc(eyebrow),b.title||'',esc(txt))}${b.collection==='services'?serviceCards():b.collection==='industries'?industryCards():`<div class="grid grid-3">${(entryCache[b.collection]||[]).slice(0,9).map(x=>`<article class="card reveal"><div class="tile-icon peach">${ico('sparkles')}</div><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p><a data-link class="card-arrow" href="/${esc(b.collection||'projects')}/${esc(x.slug)}">Explore ${ico('arrow-up-right')}</a></article>`).join('')}</div>`}</div></section>`;
  case 'divider':return '<div class="wave-divider"></div>';
  default:return '';
  }
 }).join('');
}

async function refreshLayout(){try{const key=pageSlug(),row=await request('/api/layouts?slug='+encodeURIComponent(key));layoutCache[key]=row;}catch{layoutCache[pageSlug()]=null;}}
refreshEntries=async function(){
 const m=/^\/(services|industries|products|careers|blog|projects|pages)\/([a-z0-9-]+)$/.exec(location.pathname);
 await Promise.all([
  ...entityTypes.map(async type=>{try{entryCache[type]=await request('/api/entries?type='+type);}catch{entryCache[type]=[]}}),
  refreshLayout(),
  (async()=>{
   if(m){
    try{
     const fullItem=await request(`/api/entries?type=${m[1]}&slug=${m[2]}`);
     if(fullItem){
      if(!entryCache[m[1]])entryCache[m[1]]=[];
      const idx=entryCache[m[1]].findIndex(x=>x.slug===m[2]);
      if(idx>=0)entryCache[m[1]][idx]=fullItem;
      else entryCache[m[1]].push(fullItem);
     }
    }catch{}
   }
  })()
 ]);
};

function routePage(){
 const p=location.pathname.replace(/\/+$/, '')||'/';
const routes={'/':home,'/about':about,'/services':services,'/industries':industries,'/products':products,'/careers':careers,'/blog':blog,'/projects':projects,'/contact':contact,'/quote':contact,'/privacy':privacy,'/terms':terms,'/admin':admin};
 if(p in routes)return routes[p]();
 const match=/^\/(services|industries|products|careers|blog|projects|pages)\/([a-z0-9-]+)$/.exec(p);
 if(match)return detail(match[1],match[2]);
 return pageHero('404','Page not found','The page you requested does not exist.')+cta();
}

render=function(){
 const p=location.pathname.replace(/\/+$/, '')||'/',isAdmin=p==='/admin';
 const custom=layoutCache[pageSlug()];
 document.body.classList.toggle('is-admin',isAdmin);
 document.body.classList.toggle('custom-cursor',!isAdmin&&document.body.classList.contains('custom-cursor'));
 $('#app').innerHTML=header()+(isAdmin?admin():custom&&custom.blocks?renderBlocks(custom.blocks):routePage())+(isAdmin?'':footer());
 document.title=(custom?.title||((p==='/'?'Home':p.slice(1).replace(/^./,c=>c.toUpperCase()))))+' | '+(content.brand||'AZAROTH');
 theme();if(window.lucide)window.lucide.createIcons();wire();reveal();if(isAdmin)checkAdmin();
};

window.addEventListener('popstate',async()=>{await Promise.all([refreshEntries(),refreshLayout()]);render()});

wire=function(){
 document.querySelectorAll('a[data-link]').forEach(a=>a.addEventListener('click',async ev=>{
  if(ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey||a.target==='_blank')return;
  ev.preventDefault();
  const u=a.getAttribute('href');if(!u||!u.startsWith('/'))return;
  if(u===location.pathname){window.scrollTo({top:0,behavior:'smooth'});return;}
  history.pushState({},'',u);await Promise.all([refreshEntries(),refreshLayout()]);render();window.scrollTo({top:0,behavior:'instant'});
 }));

 const btnGen=$('#btnGeneralMode'),btnRfq=$('#btnRfqMode'),rfqScope=$('#rfqScopeContainer');
 const fHeading=$('#formHeading'),fSub=$('#formSub'),servSel=$('#service');
 if(btnGen&&btnRfq){
  btnGen.onclick=()=>{
   btnGen.classList.add('active');btnRfq.classList.remove('active');
   if(rfqScope)rfqScope.style.display='none';
   if(fHeading)fHeading.textContent='Send us a message';
   if(fSub)fSub.textContent='We review every enquiry and reply within 24 hours.';
   if(servSel)servSel.value='General';
  };
  btnRfq.onclick=()=>{
   btnRfq.classList.add('active');btnGen.classList.remove('active');
   if(rfqScope)rfqScope.style.display='block';
   if(fHeading)fHeading.textContent='Request for Quote (RFQ)';
   if(fSub)fSub.textContent='Provide your initiative specifications and timeline for an executive estimate.';
   if(servSel)servSel.value='Request for Quote';
  };
 }

 function applyListingFilters(){
  const search=($('#listingSearch')?.value||'').toLowerCase().trim(),category=$('#listingCategory')?.value||'',location=$('#listingLocation')?.value||'';
  let visible=0;
  document.querySelectorAll('.listing-card').forEach(card=>{
   const show=card.dataset.search.includes(search)&&(!category||card.dataset.category===category)&&(!location||card.dataset.location===location);
   card.hidden=!show;if(show)visible++;
  });
  const empty=$('#listingEmpty');if(empty)empty.hidden=visible>0;
 }
 ['#listingSearch','#listingCategory','#listingLocation'].forEach(s=>document.querySelector(s)?.addEventListener('input',applyListingFilters));

 $('#menu')?.addEventListener('click',()=>{
  const open=$('#links').classList.toggle('open');
  $('#menu').setAttribute('aria-expanded',String(open));
  $('#menu').setAttribute('aria-label',open?'Close menu':'Open menu');
 });

 $('#contactForm')?.addEventListener('submit',async ev=>{
  ev.preventDefault();const f=ev.currentTarget,button=f.querySelector('button[type=submit]');button.disabled=true;status('#formResult','Sending…');
  try{
   const fd=new FormData(f);
   const x=Object.fromEntries(fd);
   x.consent=f.elements.consent?f.elements.consent.checked:true;
   const scopes=Array.from(f.querySelectorAll('input[name="scope"]:checked')).map(el=>el.value);
   let extra='';
   if(scopes.length)extra+=`\n[Scope: ${scopes.join(', ')}]`;
   if(x.timeline)extra+=`\n[Timeline: ${x.timeline}]`;
   if(x.budget)extra+=`\n[Budget: ${x.budget}]`;
   if(x.phone)extra+=`\n[Phone: ${x.phone}]`;
   if(extra)x.message=(x.message||'')+extra;
   await request('/api/contact','POST',x);
   f.reset();
   status('#formResult','Thank you! Your enquiry was received.');
   showToast('Contact enquiry received!');
  }
  catch(err){status('#formResult',err.message,true);showToast(err.message,true);}finally{button.disabled=false;}
 });

 $('#jobForm')?.addEventListener('submit',async ev=>{
  ev.preventDefault();const f=ev.currentTarget,button=f.querySelector('button[type=submit]');button.disabled=true;status('#jobResult','Submitting…');
  try{
   const data=Object.fromEntries(new FormData(f));data.consent=f.elements.consent.checked;const file=f.elements.resume.files[0];
   if(file){if(file.size>2*1024*1024)throw Error('PDF resume must be under 2MB');data.resume=await new Promise((ok,fail)=>{const reader=new FileReader();reader.onload=()=>ok(reader.result);reader.onerror=fail;reader.readAsDataURL(file);});}
   else data.resume='';
   await request('/api/jobs/apply','POST',data);f.reset();status('#jobResult','Application submitted successfully.');showToast('Job application received!');
  }catch(err){status('#jobResult',err.message,true);showToast(err.message,true);}finally{button.disabled=false;}
 });

 $('#loginForm')?.addEventListener('submit',async ev=>{
  ev.preventDefault();const form=ev.currentTarget;
  const statusEl=$('#loginResult');if(statusEl){statusEl.textContent='Signing in…';statusEl.style.color='var(--ink)';}
  try{
   const out=await request('/api/admin/login','POST',{email:form.elements.email.value,password:form.elements.password.value});
   csrf=out.csrf;
   sessionToken=out.token||'';
   try{
    if(out.token)sessionStorage.setItem('azaroth_sid',out.token);
    if(out.csrf)sessionStorage.setItem('azaroth_csrf',out.csrf);
   }catch{}
   me={email:out.email||form.elements.email.value,role:out.role||'admin',csrf:out.csrf};
   showAdmin();
   showToast('Signed in successfully!');
  }
  catch(err){status('#loginResult',err.message,true);showToast(err.message,true);}
 });
};

admin=function(){
 const defaultUser='admin@azaroth-techhive.com';
 const defaultPass='AzarothTechHive2025!';
 return `<main class="admin"><div class="wrap"><div class="eyebrow">AZAROTH CONTENT STUDIO</div><h2>Website control center</h2><p class="admin-tagline">Edit, preview and publish your website without touching code.</p><div id="adminRoot"><div class="admin-panel admin-login"><h3>Secure administrator sign in</h3><p>Enter your administrator credentials below to access the Content Studio.</p><div class="notice" style="margin-bottom:18px;font-size:12px;background:#fff8ec;border:1px solid #e7cca1;color:#6b4d1b;border-radius:10px;padding:12px 14px;line-height:1.6"><strong>Default Administrator Credentials:</strong><br>Email: <code>admin@azaroth-techhive.com</code> or <code>azarothtechhive@gmail.com</code><br>Password: <code>AzarothTechHive2025!</code></div><form id="loginForm"><div class="field"><label>Email address</label><input type="email" id="loginEmail" name="email" value="${esc(defaultUser)}" required autocomplete="username"></div><div class="field"><label>Password</label><input type="password" id="loginPass" name="password" value="${esc(defaultPass)}" required autocomplete="current-password"></div><button class="pill primary" type="submit" id="loginSubmitBtn">Sign in ${ico('arrow-right')}</button><p id="loginResult" role="status"></p></form></div></div></div></main>`;
};

const formatTitle=(t,isHero=false)=>{
 let s=esc(t);if(!s)return'';
 s=s.replace(/^\*+([^*]+)\*+$/,'$1').replace(/^\[+([^\]]+)\]+$/,'$1').trim();
 if(/\*([^*]+)\*/.test(s))return s.replace(/\*([^*]+)\*/g,'<span class="accent">$1</span>');
 if(/\[([^\]]+)\]/.test(s))return s.replace(/\[([^\]]+)\]/g,'<span class="accent">$1</span>');
 const legacy=/(Brighter World|Powered by People\.|Technology Solutions|Something Great|Every Possibility)/gi;
 if(legacy.test(s))return s.replace(legacy,'<span class="accent">$1</span>');
 const words=s.split(/\s+/).filter(Boolean);
 if(words.length>=3){
  const accentCount=Math.max(1,Math.round(words.length*0.30));
  const blackWords=words.slice(0,words.length-accentCount);
  const orangeWords=words.slice(words.length-accentCount);
  return blackWords.join(' ')+' <span class="accent">'+orangeWords.join(' ')+'</span>';
 }else if(words.length===2){return words[0]+' <span class="accent">'+words[1]+'</span>';}
 return s;
};
if(typeof window!=='undefined'){window.title=formatTitle;}title=formatTitle;

function showToast(msg,isError=false){
 if(typeof document==='undefined')return;
 let toast=document.getElementById('adminToast');
 if(!toast){toast=document.createElement('div');toast.id='adminToast';toast.className='admin-toast';document.body.appendChild(toast);}
 toast.innerHTML=`<div class="toast-content"><i data-lucide="${isError?'alert-circle':'check-circle-2'}"></i><span>${esc(msg)}</span></div>${isError?'':`<a href="/" data-link class="toast-link">View Live Site ↗</a>`}`;
 toast.className='admin-toast show'+(isError?' error':'');
 if(window.lucide)window.lucide.createIcons();
 clearTimeout(toast._timer);toast._timer=setTimeout(()=>{toast.classList.remove('show')},5000);
}

/* Universal Media Manager & Picker Modal */
async function fetchMediaList(){
 try{mediaCache=await request('/api/admin/media');return mediaCache;}
 catch(err){return [];}
}

function openMediaPickerModal({onSelect,onCancel}){
 if(typeof document==='undefined')return;
 let modal=document.getElementById('globalMediaPickerModal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='globalMediaPickerModal';
  modal.className='media-modal-backdrop';
  modal.innerHTML=`<div class="media-modal-dialog"><div class="media-modal-header"><h3>${ico('image')} Select from Media Library</h3><button type="button" class="media-modal-close" id="closeMediaPickerModal">×</button></div><div class="media-modal-toolbar"><input type="search" class="media-search-input" id="mediaPickerSearch" placeholder="Search images by filename or alt..."><label class="media-upload-btn-label">${ico('upload')} Upload New Asset<input type="file" id="mediaPickerUploadInput" accept="image/png,image/jpeg,image/webp"></label></div><div class="media-modal-body"><div class="media-picker-grid" id="mediaPickerGrid">Loading assets...</div></div><div class="media-modal-footer"><small id="mediaPickerStatus">Click any asset to select it.</small><button type="button" class="pill secondary mini" id="cancelMediaPicker">Cancel</button></div></div>`;
  document.body.appendChild(modal);
 }
 const close=()=>{modal.classList.remove('open');if(onCancel)onCancel();};
 modal.querySelector('#closeMediaPickerModal').onclick=close;
 modal.querySelector('#cancelMediaPicker').onclick=close;

 const renderGrid=(items)=>{
  const grid=modal.querySelector('#mediaPickerGrid');
  if(!items.length){grid.innerHTML='<p class="notice" style="grid-column:1/-1;text-align:center;">No matching assets found. Click "Upload New Asset" above to add one.</p>';return;}
  grid.innerHTML=items.map(x=>`<div class="media-picker-item" data-url="${esc(x.url)}" data-alt="${esc(x.alt||'')}"><div class="media-picker-thumb"><img src="${esc(x.url)}" alt="${esc(x.alt||'')}" loading="lazy"></div><span class="media-picker-label">${esc(x.alt||x.filename)}</span></div>`).join('');
  grid.querySelectorAll('.media-picker-item').forEach(item=>{
   item.onclick=()=>{
    const url=item.dataset.url,alt=item.dataset.alt;
    modal.classList.remove('open');
    if(onSelect)onSelect(url,alt);
   };
  });
 };

 const searchIn=modal.querySelector('#mediaPickerSearch');
 searchIn.value='';
 searchIn.oninput=()=>{
  const q=searchIn.value.toLowerCase().trim();
  renderGrid(mediaCache.filter(m=>(m.filename+' '+(m.alt||'')).toLowerCase().includes(q)));
 };

 const uploadIn=modal.querySelector('#mediaPickerUploadInput');
 uploadIn.onchange=async(ev)=>{
  const file=ev.target.files[0];if(!file)return;
  if(file.size>4*1024*1024){status('#mediaPickerStatus','File exceeds 4MB limit',true);return;}
  status('#mediaPickerStatus','Uploading asset…');
  try{
   const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
   const alt=file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
   const out=await request('/api/admin/media','POST',{data,alt});
   status('#mediaPickerStatus','Uploaded successfully!');
   await fetchMediaList();
   modal.classList.remove('open');
   if(onSelect)onSelect(out.url,alt);
  }catch(err){status('#mediaPickerStatus','Upload error: '+err.message,true);}
 };

 modal.classList.add('open');
 if(window.lucide)window.lucide.createIcons();
 fetchMediaList().then(renderGrid);
}

function renderImageField({label,value='',alt='',onChange,help=''}){
 const container=document.createElement('div');
 container.className='image-field-wrap';
 let curUrl=value,curAlt=alt;

 const updateUI=()=>{
  container.innerHTML=`<div style="font-weight:700;font-size:13px;margin-bottom:8px;color:var(--ink,#171b2c);">${esc(label)}</div><div class="image-field-preview-row"><div class="image-field-preview-box">${curUrl?`<img src="${esc(mediaURL(curUrl))}" alt="${esc(curAlt)}" loading="lazy">`:`<div class="image-field-preview-empty">${ico('image')}<br>No image</div>`}</div><div class="image-field-controls"><div class="image-field-buttons"><button type="button" class="mini-btn pick-library-btn">${ico('folder-open')} Choose from Library</button><label class="mini-btn btn-upload-file">${ico('upload')} Upload Image<input type="file" accept="image/png,image/jpeg,image/webp"></label>${curUrl?`<button type="button" class="mini-btn danger remove-img-btn">${ico('trash-2')} Remove</button>`:''}</div><div class="image-field-alt-row"><label>Alt text (for accessibility & SEO)</label><input type="text" class="alt-input" value="${esc(curAlt)}" placeholder="Describe this image..."></div><small style="font-size:11px;color:#8892a0;">${esc(curUrl?curUrl:(help||'PNG, JPEG, WebP up to 4MB'))}</small></div></div>`;
  if(window.lucide)window.lucide.createIcons();

  container.querySelector('.pick-library-btn').onclick=()=>{
   openMediaPickerModal({
    onSelect:(url,pickedAlt)=>{
     curUrl=url;if(!curAlt&&pickedAlt)curAlt=pickedAlt;
     updateUI();if(onChange)onChange(curUrl,curAlt);
    }
   });
  };

  const fileInput=container.querySelector('.btn-upload-file input');
  if(fileInput){
   fileInput.onchange=async(ev)=>{
    const file=ev.target.files[0];if(!file)return;
    if(file.size>4*1024*1024){showToast('Image exceeds 4MB limit',true);return;}
    showToast('Uploading image...');
    try{
     const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
     const genAlt=file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
     const out=await request('/api/admin/media','POST',{data,alt:genAlt});
     curUrl=out.url;curAlt=genAlt;updateUI();
     if(onChange)onChange(curUrl,curAlt);
     showToast('Image uploaded and set!');
    }catch(err){showToast('Upload error: '+err.message,true);}
   };
  }

  const removeBtn=container.querySelector('.remove-img-btn');
  if(removeBtn){
   removeBtn.onclick=()=>{curUrl='';curAlt='';updateUI();if(onChange)onChange('','');};
  }

  const altInput=container.querySelector('.alt-input');
  if(altInput){
   altInput.oninput=()=>{curAlt=altInput.value;if(onChange)onChange(curUrl,curAlt);};
  }
 };
 updateUI();
 return container;
}

function renderGalleryManager({items=[],onChange}){
 const container=document.createElement('div');
 container.className='gallery-manager';
 let galleryItems=clone(items);

 const updateUI=()=>{
  container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><span style="font-weight:700;font-size:13px;color:var(--ink,#171b2c);">Gallery & Screenshots (${galleryItems.length})</span><div style="display:flex;gap:8px;"><button type="button" class="mini-btn add-from-lib">${ico('folder-open')} Add from Library</button><label class="mini-btn btn-upload-file">${ico('upload')} Upload New<input type="file" accept="image/png,image/jpeg,image/webp"></label></div></div><div class="gallery-manager-list">${galleryItems.length?galleryItems.map((item,i)=>{
   const url=typeof item==='object'?item.url:item;
   const caption=typeof item==='object'?item.caption||item.alt||'':'';
   return `<div class="gallery-manager-item" data-idx="${i}"><img src="${esc(mediaURL(url))}" class="gallery-item-thumb" alt="${esc(caption)}"><div class="gallery-item-info"><input type="text" class="gallery-caption-input" data-idx="${i}" value="${esc(caption)}" placeholder="Caption / description..."><small style="font-size:11px;color:#8892a0;">${esc(url)}</small></div><div class="gallery-item-actions"><button type="button" class="mini-btn" data-action="up" data-idx="${i}" ${i===0?'disabled':''} title="Move Up">↑</button><button type="button" class="mini-btn" data-action="down" data-idx="${i}" ${i===galleryItems.length-1?'disabled':''} title="Move Down">↓</button><button type="button" class="mini-btn danger" data-action="remove" data-idx="${i}" title="Remove">×</button></div></div>`;
  }).join(''):'<p class="notice" style="margin:0;">No screenshots or gallery images added yet. Click buttons above to add screenshots.</p>'}</div>`;
  if(window.lucide)window.lucide.createIcons();

  container.querySelector('.add-from-lib').onclick=()=>{
   openMediaPickerModal({
    onSelect:(url,alt)=>{
     galleryItems.push({url,caption:alt||'',alt:alt||''});
     updateUI();if(onChange)onChange(galleryItems);
    }
   });
  };

  const uploadIn=container.querySelector('.btn-upload-file input');
  if(uploadIn){
   uploadIn.onchange=async(ev)=>{
    const file=ev.target.files[0];if(!file)return;
    if(file.size>4*1024*1024){showToast('Image exceeds 4MB limit',true);return;}
    showToast('Uploading screenshot...');
    try{
     const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
     const genAlt=file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
     const out=await request('/api/admin/media','POST',{data,alt:genAlt});
     galleryItems.push({url:out.url,caption:genAlt,alt:genAlt});
     updateUI();if(onChange)onChange(galleryItems);
     showToast('Screenshot added to gallery!');
    }catch(err){showToast('Upload error: '+err.message,true);}
   };
  }

  container.querySelectorAll('.gallery-caption-input').forEach(inp=>{
   inp.oninput=()=>{
    const idx=+inp.dataset.idx;
    if(typeof galleryItems[idx]==='object'){galleryItems[idx].caption=inp.value;galleryItems[idx].alt=inp.value;}
    else galleryItems[idx]={url:galleryItems[idx],caption:inp.value,alt:inp.value};
    if(onChange)onChange(galleryItems);
   };
  });

  container.querySelectorAll('[data-action]').forEach(btn=>{
   btn.onclick=()=>{
    const idx=+btn.dataset.idx,act=btn.dataset.action;
    if(act==='remove')galleryItems.splice(idx,1);
    else if(act==='up'&&idx>0)[galleryItems[idx],galleryItems[idx-1]]=[galleryItems[idx-1],galleryItems[idx]];
    else if(act==='down'&&idx<galleryItems.length-1)[galleryItems[idx],galleryItems[idx+1]]=[galleryItems[idx+1],galleryItems[idx]];
    updateUI();if(onChange)onChange(galleryItems);
   };
  });
 };

 updateUI();
 return container;
}

function openProductPreviewModal(item){
 if(typeof document==='undefined')return;
 let modal=document.getElementById('productPreviewModal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='productPreviewModal';
  modal.className='preview-modal-backdrop';
  modal.innerHTML=`<div class="preview-modal-topbar"><div style="display:flex;align-items:center;gap:12px;"><strong>Live Preview: ${esc(item.title||'Product')}</strong><span style="font-size:12px;opacity:.7;">(Draft changes preview)</span></div><div class="preview-device-toggle"><button type="button" class="active" data-dev="desktop">Desktop</button><button type="button" data-dev="mobile">Mobile (390px)</button></div><button type="button" class="mini-btn danger" id="closeProductPreview">Close Preview</button></div><div class="preview-modal-frame-container"><div class="preview-frame-wrapper" id="previewFrameWrap"><div id="previewFrameContent"></div></div></div>`;
  document.body.appendChild(modal);

  modal.querySelector('#closeProductPreview').onclick=()=>modal.classList.remove('open');
  modal.querySelectorAll('.preview-device-toggle button').forEach(btn=>{
   btn.onclick=()=>{
    modal.querySelectorAll('.preview-device-toggle button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    modal.querySelector('#previewFrameWrap').classList.toggle('mobile',btn.dataset.dev==='mobile');
   };
  });
 }
 modal.querySelector('#previewFrameContent').innerHTML=header()+productDetail(item)+footer();
 if(window.lucide)window.lucide.createIcons();
 modal.classList.add('open');
}

async function fetchContent(){
 try{const data=await request('/api/content');content=data;theme();await refreshEntries();}
 catch(e){console.warn('[CMS Sync] Content fetch failed:',e.message);}
}

checkAdmin=async function(){
 try{me=await request('/api/admin/check');csrf=me.csrf;showAdmin();}
 catch{me=null;csrf='';}
};

const tabNames=[['overview','Overview'],['content','Brand & Theme'],['navigation','Navigation'],['collections','Feature Cards'],['entries','Content Library'],['builder','Visual Page Builder'],['media','Media Library'],['inquiries','Enquiries'],['applications','Job Applications'],['users','Team & Access'],['audit','Activity Log'],['account','My Account']];
const tabIcons={overview:'layout-dashboard',content:'palette',navigation:'compass',collections:'layers-3',entries:'file-text',builder:'boxes',media:'image',inquiries:'mail',applications:'briefcase',users:'users',audit:'activity',account:'user'};

showAdmin=function(){
 if(!me)return;
 const tabs=tabNames.filter(([id])=>me.role==='admin'||(me.role==='editor'?!['users','audit','content','navigation','collections'].includes(id):['overview','account'].includes(id)));
 if(!tabs.some(x=>x[0]===adminTab))adminTab='overview';
 $('#adminRoot').innerHTML=`<div class="admin-welcome"><div class="admin-user-badge"><div class="user-avatar">${ico('shield')}</div><div><div class="user-name">Signed in as <strong>${esc(me.email)}</strong></div><span class="role-pill ${esc(me.role)}">${esc(me.role.toUpperCase())}</span></div></div><div class="admin-welcome-actions"><a href="/" data-link class="pill secondary mini" id="btnViewSite">View Live Site ${ico('external-link')}</a><button class="pill secondary mini danger" id="logout">Sign out ${ico('log-out')}</button></div></div><div class="admin-layout"><aside class="admin-sidebar">${tabs.map(([id,label])=>`<button class="${adminTab===id?'active':''}" data-tab="${id}">${ico(tabIcons[id]||'folder')}<span>${esc(label)}</span></button>`).join('')}</aside><div class="admin-panel" id="adminPanel"></div></div>`;
 if(window.lucide)window.lucide.createIcons();
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{adminTab=b.dataset.tab;showAdmin()});
 $('#logout').onclick=async()=>{
  try{await request('/api/admin/logout','POST')}catch{}
  csrf='';me=null;sessionToken='';
  try{sessionStorage.removeItem('azaroth_sid');sessionStorage.removeItem('azaroth_csrf');}catch{}
  history.pushState({},'','/');await fetchContent();render();window.scrollTo({top:0,behavior:'instant'});
  showToast('Signed out. Viewing live website.');
 };
 const el=$('#adminPanel');
 switch(adminTab){
  case 'overview':return drawOverview(el);
  case 'content':return drawSettings(el);
  case 'navigation':return drawNavigation(el);
  case 'collections':return drawCollections(el);
  case 'entries':return drawEntries(el);
  case 'builder':return drawBuilder(el);
  case 'media':return drawMedia(el);
  case 'inquiries':return drawInquiries(el);
  case 'applications':return drawApplications(el);
  case 'users':return drawUsers(el);
  case 'audit':return drawAudit(el);
  case 'account':return drawAccount(el);
 }
};

async function drawOverview(el){
 el.innerHTML=`<div class="panel-header"><div><h3>Executive Control Center</h3><p>Live metrics, website status, quick action launcher and data backups.</p></div><div class="editor-actions"><a href="/" data-link class="pill secondary mini">View Live Site ${ico('external-link')}</a><button type="button" class="pill primary mini" id="btnExportJson">${ico('download')} Export Website Data (JSON)</button></div></div><div id="overviewGrid" class="dash-cards"></div><div id="overviewActions" style="margin-top:24px;"></div>`;
 try{
  const d=await request('/api/admin/overview');
  const totalEntries=(d.entries||[]).reduce((a,x)=>a+x.count,0);
  const productsCount=(d.entries||[]).find(x=>x.type==='products')?.count||0;
  $('#overviewGrid').innerHTML=`
   <div><strong>${totalEntries}</strong><span>Total Published Items</span><small style="font-size:11px;color:var(--muted);display:block;margin-top:4px;">Across all 10 collections</small></div>
   <div><strong>${productsCount}</strong><span>Software Products</span><small style="font-size:11px;color:var(--muted);display:block;margin-top:4px;">Live enterprise catalog</small></div>
   <div><strong>${d.enquiries||0}</strong><span>Inbound Enquiries</span><small style="font-size:11px;color:var(--muted);display:block;margin-top:4px;">Contact &amp; RFQ messages</small></div>
   <div><strong>${d.applications||0}</strong><span>Job Applications</span><small style="font-size:11px;color:var(--muted);display:block;margin-top:4px;">Candidate submissions</small></div>
  `;
  $('#overviewActions').innerHTML=`
   <div class="admin-section-card">
    <div class="admin-section-header"><h4>${ico('zap')} Quick Actions &amp; Module Launchers</h4><small>One-click shortcuts to key management tools</small></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:12px;">
     <button type="button" class="mini-btn" id="qaNewProduct" style="padding:12px 14px;justify-content:flex-start;font-size:13px;">${ico('package')} <strong>Manage Products</strong></button>
     <button type="button" class="mini-btn" id="qaBrandTheme" style="padding:12px 14px;justify-content:flex-start;font-size:13px;">${ico('palette')} <strong>Brand, Copy &amp; Colors</strong></button>
     <button type="button" class="mini-btn" id="qaNavigation" style="padding:12px 14px;justify-content:flex-start;font-size:13px;">${ico('compass')} <strong>Navigation &amp; Menus</strong></button>
     <button type="button" class="mini-btn" id="qaMedia" style="padding:12px 14px;justify-content:flex-start;font-size:13px;">${ico('image')} <strong>Upload &amp; Pick Media</strong></button>
     <button type="button" class="mini-btn" id="qaEnquiries" style="padding:12px 14px;justify-content:flex-start;font-size:13px;">${ico('mail')} <strong>Review Enquiries</strong></button>
     <button type="button" class="mini-btn" id="qaBuilder" style="padding:12px 14px;justify-content:flex-start;font-size:13px;">${ico('boxes')} <strong>Visual Page Builder</strong></button>
    </div>
   </div>
   <div class="admin-section-card" style="margin-top:16px;">
    <div class="admin-section-header"><h4>${ico('shield-check')} System Health &amp; Architecture</h4><small>Environment status</small></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:12px;font-size:12.5px;">
     <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e8e2d8;"><strong>Database:</strong> SQLite WAL High-Concurrency Engine<br><span style="color:#126449;">● Connected &amp; Healthy</span></div>
     <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e8e2d8;"><strong>Security:</strong> Session Scrypt + Strict CSRF<br><span style="color:#126449;">● Active</span></div>
     <div style="background:#fff;padding:12px 16px;border-radius:10px;border:1px solid #e8e2d8;"><strong>Storage:</strong> Persistent Local &amp; Media Storage<br><span style="color:#126449;">● Read/Write Ready</span></div>
    </div>
   </div>
  `;
  if(window.lucide)window.lucide.createIcons();
  $('#qaNewProduct').onclick=()=>{adminTab='entries';showAdmin();};
  $('#qaBrandTheme').onclick=()=>{adminTab='content';showAdmin();};
  $('#qaNavigation').onclick=()=>{adminTab='navigation';showAdmin();};
  $('#qaMedia').onclick=()=>{adminTab='media';showAdmin();};
  $('#qaEnquiries').onclick=()=>{adminTab='inquiries';showAdmin();};
  $('#qaBuilder').onclick=()=>{adminTab='builder';showAdmin();};
  $('#btnExportJson').onclick=async()=>{
   try{
    showToast('Preparing full website export...');
    const data=await request('/api/admin/export');
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`azaroth-website-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast('Export downloaded successfully!');
   }catch(err){showToast('Export failed: '+err.message,true);}
  };
 }catch(err){status('#overviewGrid',err.message,true);}
}

async function saveContent(data,which){
 try{
  await request('/api/admin/content','PUT',data);
  Object.assign(content,data);theme();
  const navEl=$('#nav');if(navEl)navEl.outerHTML=header();
  document.title=(content.brand||'AZAROTH')+' | Content Studio';
  showToast('Changes saved & published live!');
  status(which,'Changes saved. Published website updated.');
  if(window.lucide)window.lucide.createIcons();wire();
 }catch(err){showToast(err.message,true);status(which,err.message,true);}
}

function drawSettings(el){
 const colorFields=[['Brand Burgundy','primary'],['Metallic Gold','gold'],['Orange Accent','orange'],['Background Ivory','background'],['Heading Ink','ink']];
 const textFields=[
  ['Brand Title (AZAROTH)','brand','text'],['Brand Subtitle (TECH-HIVE)','brandSubtitle','text'],['Tagline','tagline','text'],
  ['Navbar CTA button label','navCtaLabel','text'],['Navbar CTA button link','navCtaLink','text'],
  ['Footer brand title (defaults to Brand Title)','footerBrandTitle','text'],['Footer brand subtitle (defaults to Brand Subtitle)','footerBrandSubtitle','text'],
  ['Hero eyebrow','heroEyebrow','text'],['Hero headline','heroTitle','text'],['Hero description','heroDescription','textarea'],
  ['Hero primary CTA label','heroCtaLabel','text'],['Hero primary CTA link','heroCtaLink','text'],
  ['Hero secondary CTA label','heroSecondaryCtaLabel','text'],['Hero secondary CTA link','heroSecondaryCtaLink','text'],
  ['Homepage services eyebrow','homeServicesEyebrow','text'],['Homepage services headline','homeServicesTitle','text'],['Homepage services description','homeServicesDescription','textarea'],
  ['Homepage products headline','homeProductsTitle','text'],['Homepage products description','homeProductsDescription','textarea'],
  ['Homepage industries eyebrow','homeIndustriesEyebrow','text'],['Homepage industries headline','homeIndustriesTitle','text'],['Homepage industries description','homeIndustriesDescription','textarea'],
  ['Homepage approach eyebrow','homeApproachEyebrow','text'],['Homepage approach headline','homeApproachTitle','text'],['Homepage approach description','homeApproachDescription','textarea'],
  ['About headline','aboutTitle','text'],['About description','aboutDescription','textarea'],['Mission statement','mission','textarea'],['Company vision','vision','textarea'],
  ['Global CTA eyebrow','ctaEyebrow','text'],['Global CTA headline','ctaTitle','text'],['Global CTA button label','ctaButtonText','text'],['Global CTA button link','ctaButtonLink','text'],
  ['Footer description','footerDescription','textarea'],['Contact email','contactEmail','email'],['WhatsApp / Contact phone','contactPhone','text'],['Office Location','contactLocation','text'],
  ['Privacy policy notice','privacyText','textarea'],['Terms of use notice','termsText','textarea'],
  ['Cursor size tuning (24–62)','cursorSize','number'],['Cursor follow speed (0.08–0.5)','cursorLag','text']
 ];

 el.innerHTML=`<div class="panel-header"><div><h3>Brand, Content &amp; Theme Settings</h3><p>Manage your identity, typography, headlines, colors and interactive effects. All changes save to SQLite and update live across the website.</p></div></div>
 <div class="setting-callout">${ico('sparkles')} <div><b>Accent Color Formatting:</b> Wrap any phrase with <code>*asterisks*</code> (for example: <em>Next-Gen *Cloud Platform*</em>) to apply the signature accent color to that specific phrase!</div></div>
 <form id="globalForm">
 <div class="admin-section-card"><div class="admin-section-header"><h4>${ico('palette')} Luxury Color System</h4><small>Click to pick or type hex values; live theme previews immediately</small></div>
 <div class="admin-form-grid">${colorFields.map(([lbl,k])=>`<div class="field"><label>${esc(lbl)}</label><div class="color-picker-group"><input type="color" data-color-target="${k}" value="${esc(content[k]||'#000000')}"><input type="text" name="${k}" id="color_${k}" value="${esc(content[k]||'#000000')}" pattern="^#[0-9a-fA-F]{6}$" maxlength="7"></div></div>`).join('')}</div></div>
 <div class="admin-section-card"><div class="admin-section-header"><h4>${ico('image')} Brand Logo</h4><small>Select from Media Library or upload a new logo</small></div>
 <div id="logoPickerMount"></div><input type="hidden" name="logo" id="logoHiddenInput" value="${esc(content.logo||'/logo.png')}"></div>
 <div class="admin-section-card"><div class="admin-section-header"><h4>${ico('image')} Hero Showcase Artwork</h4><small>Graphic or emblem displayed in the homepage hero</small></div>
 <div id="heroPickerMount"></div><input type="hidden" name="heroImage" id="heroHiddenInput" value="${esc(content.heroImage||'/logo.png')}"></div>
 <div class="admin-section-card"><div class="admin-section-header"><h4>${ico('image')} About Section Photo</h4><small>Photo displayed on the homepage about preview and company page</small></div>
 <div id="aboutPickerMount"></div><input type="hidden" name="aboutImage" id="aboutHiddenInput" value="${esc(content.aboutImage||'/images/about_corporate_studio.jpg')}"></div>
 <div class="admin-section-card"><div class="admin-section-header"><h4>${ico('type')} Website Copy &amp; Identity</h4><small>All text fields support rich accent formatting</small></div>
 <div class="admin-form-grid">${textFields.map(([label,key,type])=>`<div class="field ${type==='textarea'?'full':''}"><label>${esc(label)}</label>${type==='textarea'?`<textarea name="${key}">${esc(content[key]||'')}</textarea>`:`<input type="${type}" name="${key}" value="${esc(content[key]||'')}">`}</div>`).join('')}
 <div class="field"><label>Homepage product showcase</label><select name="homeProductsEnabled"><option value="true" ${content.homeProductsEnabled!=='false'?'selected':''}>Visible</option><option value="false" ${content.homeProductsEnabled==='false'?'selected':''}>Hidden</option></select></div>
 <div class="field full"><label for="cursorStyle">Cursor design — transparent center, no text covered</label><select id="cursorStyle" name="cursorStyle">${[['gold-ring','Fine Gold Ring · Recommended'],['gold-orbit','Golden Orbit · Logo Inspired'],['micro-dot','Micro Dot · Minimal'],['glass-outline','Clear Glass Outline · Lightweight']].map(([value,label])=>`<option value="${value}" ${(!content.cursorStyle&&value==='gold-ring')||content.cursorStyle===value?'selected':''}>${label}</option>`).join('')}</select>
 <div class="cursor-style-previews" aria-hidden="true">${[['gold-ring','Fine ring'],['gold-orbit','Orbit'],['micro-dot','Micro dot'],['glass-outline','Glass outline']].map(([style,label])=>`<div class="cursor-preview-card"><span class="cursor-preview-icon ${style}"><i></i></span><small>${label}</small></div>`).join('')}</div>
 <small class="setting-help">These designs do not display a filled 64px circle or a View label over content. Text remains visible. Desktop only.</small></div>
 <div class="field"><label>Custom cursor</label><select name="cursorEnabled"><option value="true" ${content.cursorEnabled!=='false'?'selected':''}>Enabled</option><option value="false" ${content.cursorEnabled==='false'?'selected':''}>Disabled</option></select></div>
 <div class="field"><label>Animation intensity</label><select name="animationPreset">${['minimal','elegant','expressive'].map(x=>`<option ${content.animationPreset===x?'selected':''}>${x}</option>`).join('')}</select></div>
 </div></div>
 <div class="editor-actions"><button type="submit" class="pill primary">Save all settings &amp; publish ${ico('check')}</button><a href="/" data-link class="pill secondary">Preview live website ${ico('external-link')}</a></div><p id="globalStatus" role="status"></p></form>`;
 if(window.lucide)window.lucide.createIcons();

 const logoMount=el.querySelector('#logoPickerMount');
 const logoIn=el.querySelector('#logoHiddenInput');
 if(logoMount&&logoIn)logoMount.appendChild(renderImageField({
  label:'Brand Emblem / Logo',
  value:content.logo||'/logo.png',
  alt:content.brand||'AZAROTH',
  onChange:(url)=>{logoIn.value=url||'/logo.png';}
 }));

 const heroMount=el.querySelector('#heroPickerMount');
 const heroIn=el.querySelector('#heroHiddenInput');
 if(heroMount&&heroIn)heroMount.appendChild(renderImageField({
  label:'Hero Artwork / Graphic',
  value:content.heroImage||'/logo.png',
  alt:(content.brand||'AZAROTH')+' Hero Graphic',
  onChange:(url)=>{heroIn.value=url||'/logo.png';}
 }));

 const aboutMount=el.querySelector('#aboutPickerMount');
 const aboutIn=el.querySelector('#aboutHiddenInput');
 if(aboutMount&&aboutIn)aboutMount.appendChild(renderImageField({
  label:'About Company Photo',
  value:content.aboutImage||'/images/about_corporate_studio.jpg',
  alt:(content.brand||'AZAROTH')+' Office',
  onChange:(url)=>{aboutIn.value=url||'/images/about_corporate_studio.jpg';}
 }));

 el.querySelectorAll('[data-color-target]').forEach(picker=>{
  const key=picker.dataset.colorTarget;
  const textInput=el.querySelector('#color_'+key);
  picker.oninput=()=>{if(textInput)textInput.value=picker.value;document.documentElement.style.setProperty(key==='primary'?'--burgundy':`--${key}`,picker.value);};
  if(textInput)textInput.oninput=()=>{if(/^#[0-9a-fA-F]{6}$/.test(textInput.value)){picker.value=textInput.value;document.documentElement.style.setProperty(key==='primary'?'--burgundy':`--${key}`,textInput.value);}};
 });
 $('#globalForm').onsubmit=async ev=>{ev.preventDefault();const data=Object.fromEntries(new FormData(ev.currentTarget));await saveContent(data,'#globalStatus');};
}

function drawNavigation(el){
 const nav=clone(navItems());let items=nav;
 function rows(){
  const table=$('#menuEdit');if(!table)return;
  table.innerHTML=items.map((x,i)=>{
   const hasKids=x.children&&Array.isArray(x.children);
   return `
   <div class="nav-item-card" style="background:#fff;border:1px solid #e7dfd2;border-radius:12px;padding:14px;margin-bottom:12px;">
    <div class="editable-row" style="margin-bottom:8px;">
     <input data-idx="${i}" data-field="label" aria-label="Menu label" value="${esc(x.label)}" placeholder="Top Menu Label" style="font-weight:700;">
     <input data-idx="${i}" data-field="url" aria-label="Menu URL" value="${esc(x.url)}" placeholder="/path">
     <button type="button" class="mini-btn" data-up="${i}" aria-label="Move up" ${i===0?'disabled':''}>↑</button>
     <button type="button" class="mini-btn" data-down="${i}" aria-label="Move down" ${i===items.length-1?'disabled':''}>↓</button>
     <button type="button" class="mini-btn danger" data-remove="${i}" aria-label="Remove">×</button>
    </div>
    <div style="padding-left:16px;border-left:3px solid var(--gold,#d5a13c);margin-top:10px;">
     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <small style="font-weight:700;color:var(--muted,#667084);font-size:11px;text-transform:uppercase;">Dropdown Submenu (${hasKids?x.children.length:0})</small>
      <button type="button" class="mini-btn" data-add-sub="${i}">+ Add Sub-link</button>
     </div>
     ${hasKids&&x.children.length?`
      <div class="submenu-list">
       ${x.children.map((c,ci)=>`
        <div class="editable-row" style="margin-bottom:6px;gap:6px;">
         <input data-p-idx="${i}" data-c-idx="${ci}" data-c-field="label" value="${esc(c.label)}" placeholder="Submenu Label" style="font-size:12px;">
         <input data-p-idx="${i}" data-c-idx="${ci}" data-c-field="url" value="${esc(c.url)}" placeholder="/path#hash" style="font-size:12px;">
         <button type="button" class="mini-btn" data-sub-up="${i}:${ci}" ${ci===0?'disabled':''}>↑</button>
         <button type="button" class="mini-btn" data-sub-down="${i}:${ci}" ${ci===x.children.length-1?'disabled':''}>↓</button>
         <button type="button" class="mini-btn danger" data-sub-del="${i}:${ci}">×</button>
        </div>
       `).join('')}
      </div>
     `:''}
    </div>
   </div>
   `;
  }).join('');
  if(window.lucide)window.lucide.createIcons();
  table.querySelectorAll('input[data-idx]').forEach(x=>x.oninput=()=>items[Number(x.dataset.idx)][x.dataset.field]=x.value);
  table.querySelectorAll('input[data-p-idx]').forEach(x=>x.oninput=()=>items[Number(x.dataset.pIdx)].children[Number(x.dataset.cIdx)][x.dataset.cField]=x.value);
  table.querySelectorAll('button[data-remove],button[data-up],button[data-down]').forEach(b=>b.onclick=()=>{
   const i=Number(b.dataset.remove??b.dataset.up??b.dataset.down);
   if(b.hasAttribute('data-remove'))items.splice(i,1);
   else{const j=b.hasAttribute('data-up')?i-1:i+1;if(j>=0&&j<items.length)[items[i],items[j]]=[items[j],items[i]];}
   rows();
  });
  table.querySelectorAll('button[data-add-sub]').forEach(b=>b.onclick=()=>{
   const i=Number(b.dataset.addSub);
   if(!items[i].children)items[i].children=[];
   items[i].children.push({label:'New Sub-link',url:items[i].url+'#section'});
   rows();
  });
  table.querySelectorAll('button[data-sub-del],button[data-sub-up],button[data-sub-down]').forEach(b=>b.onclick=()=>{
   const [pi,ci]=(b.dataset.subDel||b.dataset.subUp||b.dataset.subDown).split(':').map(Number);
   const p=items[pi];
   if(b.hasAttribute('data-sub-del'))p.children.splice(ci,1);
   else{
    const nxt=b.hasAttribute('data-sub-up')?ci-1:ci+1;
    if(nxt>=0&&nxt<p.children.length)[p.children[ci],p.children[nxt]]=[p.children[nxt],p.children[ci]];
   }
   rows();
  });
 }
 el.innerHTML=`<div class="panel-header"><div><h3>Navigation &amp; Header Manager</h3><p>Reorder, add, remove or modify top-level navigation links and nested dropdown submenus. Desktop and mobile viewports automatically sync.</p></div></div><div id="menuEdit"></div><div class="editor-actions"><button class="pill secondary" id="addMenu">Add Top Link ${ico('plus')}</button><button class="pill primary" id="saveMenu">Publish Live Menu ${ico('check')}</button></div><p id="navStatus" role="status"></p><div class="admin-section-card" style="margin-top:28px;"><div class="admin-section-header"><h4>${ico('share-2')} Social Network Profiles</h4><small>JSON array of social destinations shown in footer</small></div><textarea id="socialJson" class="mono-text" rows="5">${esc(JSON.stringify(getJSON(content.socials),null,2))}</textarea><button class="pill secondary" id="saveSocial" style="margin-top:12px;">Save social links</button><p id="socialStatus" role="status"></p></div>`;
 if(window.lucide)window.lucide.createIcons();
 rows();
 $('#addMenu').onclick=()=>{items.push({label:'New Link',url:'/page'});rows()};
 $('#saveMenu').onclick=async()=>{
  const validateItem=x=>x.label&&actionURL(x.url)!=='#'&&(!x.children||x.children.every(c=>c.label&&actionURL(c.url)!=='#'));
  if(!items.every(validateItem))return status('#navStatus','Please enter valid labels and URLs for all links and sub-links.',true);
  await saveContent({navigation:JSON.stringify(items)},'#navStatus');
 };
 $('#saveSocial').onclick=async()=>{
  try{
   const x=JSON.parse($('#socialJson').value);
   if(!Array.isArray(x)||!x.every(t=>t.label&&actionURL(t.url)!=='#'))throw Error('Invalid social links');
   await saveContent({socials:JSON.stringify(x)},'#socialStatus');
  }catch(err){status('#socialStatus',err.message,true);}
 };
}

function drawCollections(el){
 el.innerHTML=`<div class="panel-header"><div><h3>Featured Cards &amp; Process Steps</h3><p>Customize card collections without touching source code. Changes update immediately across public routes.</p></div></div>
 <div class="field" style="max-width:320px;margin-bottom:18px;"><label>Select Collection to Edit</label><select id="collectionType"><option value="services">Homepage Services Cards</option><option value="industries">Industries We Serve Cards</option><option value="stats">Hero Stats &amp; Process Steps</option><option value="values">Core Values Cards</option></select></div>
 <div id="collectionItems"></div>
 <div class="editor-actions"><button id="addCollection" class="pill secondary">Add Card ${ico('plus')}</button><button id="saveCollection" class="pill primary">Save &amp; Publish Cards ${ico('check')}</button></div><p id="collectionStatus" role="status"></p>`;
 if(window.lucide)window.lucide.createIcons();
 let type='services',items=clone(arr(type));
 function renderItems(){
  const isStats=type==='stats',isInd=type==='industries',isVal=type==='values';
  $('#collectionItems').innerHTML=items.map((item,i)=>`
   <div class="builder-block">
    <div class="builder-head">
     <strong>Card ${i+1}: ${esc(item.name||item.title||item.label||'Card')}</strong>
     <div class="editor-actions">
      <button type="button" class="mini-btn" data-c-up="${i}" ${i===0?'disabled':''}>↑</button>
      <button type="button" class="mini-btn" data-c-down="${i}" ${i===items.length-1?'disabled':''}>↓</button>
      <button type="button" class="mini-btn danger" data-remove="${i}">Remove</button>
     </div>
    </div>
    <div class="admin-form-grid">
     ${isStats?`
      <div class="field"><label>Value / Number</label><input data-i="${i}" data-k="value" value="${esc(item.value||'')}"></div>
      <div class="field"><label>Label</label><input data-i="${i}" data-k="label" value="${esc(item.label||'')}"></div>
     `:isVal?`
      <div class="field"><label>Title</label><input data-i="${i}" data-k="title" value="${esc(item.title||'')}"></div>
      <div class="field"><label>Lucide Icon (e.g. users, lightbulb, shield-check)</label><input data-i="${i}" data-k="icon" value="${esc(item.icon||'sparkles')}"></div>
      <div class="field"><label>Color Tone</label><select data-i="${i}" data-k="tone"><option value="mint" ${item.tone==='mint'?'selected':''}>Mint</option><option value="peach" ${item.tone==='peach'?'selected':''}>Peach</option><option value="lavender" ${item.tone==='lavender'?'selected':''}>Lavender</option><option value="sky" ${item.tone==='sky'?'selected':''}>Sky Blue</option></select></div>
      <div class="field full"><label>Description</label><textarea data-i="${i}" data-k="description" rows="2">${esc(item.description||'')}</textarea></div>
     `:`
      <div class="field"><label>Name / Heading</label><input data-i="${i}" data-k="name" value="${esc(item.name||'')}"></div>
      <div class="field"><label>Lucide Icon (e.g. code-2, cloud, cpu, network, shield-check)</label><input data-i="${i}" data-k="icon" value="${esc(item.icon||'code-2')}"></div>
      ${isInd?`<div class="field"><label>Visual Tone</label><select data-i="${i}" data-k="tone"><option value="mint" ${item.tone==='mint'?'selected':''}>Mint</option><option value="peach" ${item.tone==='peach'?'selected':''}>Peach</option><option value="lavender" ${item.tone==='lavender'?'selected':''}>Lavender</option><option value="sky" ${item.tone==='sky'?'selected':''}>Sky Blue</option></select></div>`:''}
      <div class="field full"><label>Description</label><textarea data-i="${i}" data-k="description" rows="3">${esc(item.description||'')}</textarea></div>
     `}
    </div>
   </div>
  `).join('')||'<p class="notice">No cards in this collection. Click "+ Add Card" below.</p>';
  if(window.lucide)window.lucide.createIcons();
  document.querySelectorAll('#collectionItems input, #collectionItems textarea, #collectionItems select').forEach(x=>x.oninput=()=>items[+x.dataset.i][x.dataset.k]=x.value);
  document.querySelectorAll('#collectionItems [data-remove]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.remove,1);renderItems();});
  document.querySelectorAll('#collectionItems [data-c-up]').forEach(b=>b.onclick=()=>{const i=+b.dataset.cUp;if(i>0){[items[i],items[i-1]]=[items[i-1],items[i]];renderItems();}});
  document.querySelectorAll('#collectionItems [data-c-down]').forEach(b=>b.onclick=()=>{const i=+b.dataset.cDown;if(i<items.length-1){[items[i],items[i+1]]=[items[i+1],items[i]];renderItems();}});
 }
 $('#collectionType').onchange=ev=>{type=ev.target.value;items=clone(arr(type));renderItems()};
 $('#addCollection').onclick=()=>{
  if(type==='stats')items.push({value:'01',label:'New Process Step'});
  else if(type==='values')items.push({icon:'sparkles',title:'New Core Value',description:'Core philosophy description',tone:'mint'});
  else if(type==='industries')items.push({name:'New Industry',description:'Industry capabilities overview',icon:'building-2',tone:'peach'});
  else items.push({name:'New Service',description:'Description of specialized service offering',icon:'code-2'});
  renderItems();
 };
 $('#saveCollection').onclick=()=>saveContent({[type]:JSON.stringify(items)},'#collectionStatus');
 renderItems();
}

/* Content Library & Product Customization Interface */
async function drawEntries(el){
 el.innerHTML=`<div class="panel-header"><div><h3>Content Library & Product Management</h3><p>Create, customize, draft and publish products, services, articles, case studies and custom content.</p></div></div>
 <div class="admin-form-grid" style="margin-bottom:16px;">
  <div class="field"><label>Collection</label><select id="entryType">${entityTypes.map(t=>`<option value="${t}" ${t==='products'?'selected':''}>${t[0].toUpperCase()+t.slice(1)}</option>`).join('')}</select></div>
  <div class="field"><label>Search content</label><input type="search" id="entrySearchFilter" placeholder="Filter by title or slug..."></div>
  <div class="field"><label>Status Filter</label><select id="entryStatusFilter"><option value="">All statuses</option><option value="published">Published only</option><option value="draft">Drafts only</option></select></div>
 </div>
 <div class="scroll" id="entryRows" style="margin-bottom:28px;"></div>
 <div id="entryEditorContainer"></div>`;

 const typeSelect=$('#entryType');
 const searchFilter=$('#entrySearchFilter');
 const statusFilter=$('#entryStatusFilter');
 const editorContainer=$('#entryEditorContainer');
 let currentRows=[];
 let editingRecord=null;

 async function listing(){
  try{
   currentRows=await request('/api/admin/entries?type='+typeSelect.value);
   renderTable();
   initEditorForm(editingRecord||{type:typeSelect.value,status:'published'});
  }catch(err){$('#entryRows').textContent=err.message;}
 }

 function renderTable(){
  const q=(searchFilter.value||'').toLowerCase().trim();
  const st=statusFilter.value;
  const filtered=currentRows.filter(r=>{
   const matchQ=!q||(r.title+' '+r.slug+' '+(r.summary||'')).toLowerCase().includes(q);
   const matchSt=!st||r.status===st;
   return matchQ&&matchSt;
  });

  $('#entryRows').innerHTML=`<table><thead><tr><th>Title</th><th>URL Slug</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>${filtered.length?filtered.map(r=>`<tr><td><strong>${esc(r.title)}</strong>${r.category?`<br><small style="color:#667084">${esc(r.category)}</small>`:''}</td><td><code>/${esc(typeSelect.value)}/${esc(r.slug)}</code></td><td><span class="state-pill ${r.status==='published'?'published':'draft'}">${esc(r.status)}</span></td><td><small>${esc(String(r.updated_at||'').slice(0,10))}</small></td><td><button class="mini-btn" data-edit="${r.id}">${ico('edit')} Edit</button> <button class="mini-btn secondary" data-preview="${r.id}">${ico('eye')} Preview</button> <button class="mini-btn danger" data-delete="${r.id}">${ico('trash-2')} Delete</button></td></tr>`).join(''):'<tr><td colspan="5" class="notice">No matching entries found. Create one using the form below.</td></tr>'}</tbody></table>`;
  if(window.lucide)window.lucide.createIcons();

  $('#entryRows').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
   const r=currentRows.find(x=>x.id===+b.dataset.edit);
   if(r){editingRecord=clone(r);initEditorForm(editingRecord);editorContainer.scrollIntoView({behavior:'smooth',block:'start'});}
  });

  $('#entryRows').querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{
   const r=currentRows.find(x=>x.id===+b.dataset.preview);
   if(r){
    if(typeSelect.value==='products')openProductPreviewModal(r);
    else{
     history.pushState({},'',`/${typeSelect.value}/${encodeURIComponent(r.slug)}`);
     refreshEntries().then(render);
     window.scrollTo({top:0,behavior:'instant'});
    }
   }
  });

  $('#entryRows').querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{
   if(!confirm('Permanently delete this entry?'))return;
   try{
    await request('/api/admin/entries','DELETE',{id:+b.dataset.delete});
    showToast('Entry deleted');
    if(editingRecord?.id===+b.dataset.delete)editingRecord=null;
    await refreshEntries();
    listing();
   }catch(err){showToast(err.message,true);}
  });
 }

 searchFilter.oninput=renderTable;
 statusFilter.onchange=renderTable;
 typeSelect.onchange=()=>{editingRecord=null;listing();};

 function initEditorForm(initialData){
  const item=initialData||{type:typeSelect.value,status:'published'};
  const isProduct=typeSelect.value==='products';

  let currentFeatures=getJSON(item.features,[]);
  let currentSpecs=getJSON(item.specifications,[]);
  let currentFaqs=getJSON(item.faqs,[]);
  let currentGallery=getJSON(item.gallery,[]);
  let currentImage=item.image||'';
  let currentSocialImage=item.social_image||'';

  editorContainer.innerHTML=`
   <div class="admin-section-card">
    <div class="admin-section-header">
     <h4>${isProduct?ico('package')+' Enterprise Product Customizer':ico('edit')+' Edit '+typeSelect.value[0].toUpperCase()+typeSelect.value.slice(1)}</h4>
     <small>${editingRecord?`Editing existing item: /${typeSelect.value}/${esc(editingRecord.slug)}`:`Create new ${typeSelect.value} entry`}</small>
    </div>

    ${isProduct?`
     <div class="product-editor-tabs">
      <button type="button" class="product-tab-btn active" data-ptab="general">1. Core Information</button>
      <button type="button" class="product-tab-btn" data-ptab="media">2. Images & Screenshots</button>
      <button type="button" class="product-tab-btn" data-ptab="features">3. Features & Benefits</button>
      <button type="button" class="product-tab-btn" data-ptab="specs">4. Technical Specs</button>
      <button type="button" class="product-tab-btn" data-ptab="faqs">5. Product FAQs</button>
      <button type="button" class="product-tab-btn" data-ptab="ctas">6. Actions & CTAs</button>
      <button type="button" class="product-tab-btn" data-ptab="seo">7. SEO & Sharing</button>
     </div>
    `:''}

    <form id="entryCustomForm">
     ${editingRecord?.id?`<input type="hidden" name="id" value="${editingRecord.id}">`:''}
     <div class="product-tab-pane active" id="pane_general">
      <div class="admin-form-grid">
       <div class="field"><label>URL Slug (lowercase &amp; hyphens) *</label><input name="slug" id="entrySlugInput" pattern="[a-z0-9]+(-[a-z0-9]+)*" required value="${esc(item.slug||'')}"></div>
       <div class="field"><label>Product / Item Title *</label><input name="title" id="entryTitleInput" required maxlength="180" value="${esc(item.title||'')}"></div>
       <div class="field"><label>Category / Architecture Family</label><input name="category" value="${esc(item.category||'')}"></div>
       <div class="field"><label>Publishing Status</label><select name="status"><option value="published" ${item.status==='published'?'selected':''}>Published (Live)</option><option value="draft" ${item.status==='draft'?'selected':''}>Draft (Hidden)</option></select></div>
       <div class="field full"><label>Summary / Elevator Pitch</label><textarea name="summary" maxlength="1300" rows="3">${esc(item.summary||'')}</textarea></div>
       <div class="field full"><label>Detailed Overview / Architecture Body</label><textarea name="body" rows="6">${esc(item.body||'')}</textarea></div>
       <div class="field"><label>Technology Stack Tags (comma separated)</label><input name="technology" value="${esc(item.technology||'')}"></div>
       ${!isProduct?`
        <div class="field"><label>Location</label><input name="location" value="${esc(item.location||'')}"></div>
        <div class="field"><label>Job Type</label><input name="job_type" value="${esc(item.job_type||'')}"></div>
        <div class="field"><label>Custom SEO Page Title</label><input name="seo_title" value="${esc(item.seo_title||'')}"></div>
        <div class="field"><label>Canonical URL</label><input name="canonical_url" value="${esc(item.canonical_url||'')}"></div>
        <div class="field full"><label>Meta Description</label><textarea name="seo_description" rows="2">${esc(item.seo_description||'')}</textarea></div>
       `:''}
      </div>
      ${!isProduct?`
       <div style="margin-top:20px;">
        <div id="standardMainImageMount"></div>
        <div id="standardGalleryMount" style="margin-top:16px;"></div>
       </div>
      `:''}
     </div>

     ${isProduct?`
      <div class="product-tab-pane" id="pane_media">
       <div class="admin-form-grid" style="margin-bottom:16px;">
        <div class="field"><label>Hero Image Positioning</label><select name="image_position"><option value="right" ${item.image_position==='right'?'selected':''}>Image on Right (Default)</option><option value="left" ${item.image_position==='left'?'selected':''}>Image on Left (Reverse)</option><option value="full" ${item.image_position==='full'?'selected':''}>Centered / Full Width</option></select></div>
       </div>
       <div id="productMainImageMount"></div>
       <div id="productGalleryMount" style="margin-top:18px;"></div>
      </div>

      <div class="product-tab-pane" id="pane_features">
       <p style="font-size:13px;color:#667084;margin-bottom:12px;">Add highlight capabilities and business benefits shown on the product landing page.</p>
       <div id="featuresEditorList"></div>
       <button type="button" class="mini-btn" id="addFeatureBtn" style="margin-top:12px;">+ Add Feature Capability</button>
      </div>

      <div class="product-tab-pane" id="pane_specs">
       <p style="font-size:13px;color:#667084;margin-bottom:12px;">Structured technical specifications (e.g. Deployment, Security, API Standards, Requirements).</p>
       <div id="specsEditorList"></div>
       <button type="button" class="mini-btn" id="addSpecBtn" style="margin-top:12px;">+ Add Specification Row</button>
      </div>

      <div class="product-tab-pane" id="pane_faqs">
       <p style="font-size:13px;color:#667084;margin-bottom:12px;">Common questions and answers specific to this product.</p>
       <div id="faqsEditorList"></div>
       <button type="button" class="mini-btn" id="addFaqBtn" style="margin-top:12px;">+ Add FAQ Item</button>
      </div>

      <div class="product-tab-pane" id="pane_ctas">
       <div class="admin-form-grid">
        <div class="field"><label>Primary CTA Button Label</label><input name="hero_cta_label" value="${esc(item.hero_cta_label||'Discuss Product')}"></div>
        <div class="field"><label>Primary CTA URL Destination</label><input name="hero_cta_link" value="${esc(item.hero_cta_link||'/contact')}"></div>
        <div class="field"><label>Secondary CTA Button Label (Optional)</label><input name="secondary_cta_label" value="${esc(item.secondary_cta_label||'')}"></div>
        <div class="field"><label>Secondary CTA URL Destination</label><input name="secondary_cta_link" value="${esc(item.secondary_cta_link||'')}"></div>
       </div>
      </div>

      <div class="product-tab-pane" id="pane_seo">
       <div class="admin-form-grid">
        <div class="field"><label>Custom SEO Page Title</label><input name="seo_title" value="${esc(item.seo_title||'')}"></div>
        <div class="field"><label>Canonical URL</label><input name="canonical_url" value="${esc(item.canonical_url||'')}"></div>
        <div class="field full"><label>Meta Description</label><textarea name="seo_description" rows="2">${esc(item.seo_description||'')}</textarea></div>
       </div>
       <div id="productSocialImageMount" style="margin-top:16px;"></div>
      </div>
     `:''}

     <div class="editor-actions" style="margin-top:24px;border-top:1px solid #f0e9df;padding-top:20px;">
      <button type="button" class="pill primary" id="btnPublishEntry">${ico('rocket')} Publish Live</button>
      <button type="button" class="pill secondary" id="btnDraftEntry">${ico('save')} Save Draft</button>
      ${isProduct?`<button type="button" class="pill secondary" id="btnPreviewEntry">${ico('eye')} Live Preview</button>`:''}
      <button type="button" class="pill secondary" id="btnClearEntry">Clear / New</button>
     </div>
     <p id="entrySaveStatus" role="status"></p>
    </form>
   </div>
  `;
  if(window.lucide)window.lucide.createIcons();

  // Tab switching
  editorContainer.querySelectorAll('.product-tab-btn').forEach(btn=>{
   btn.onclick=()=>{
    editorContainer.querySelectorAll('.product-tab-btn').forEach(b=>b.classList.remove('active'));
    editorContainer.querySelectorAll('.product-tab-pane').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    const target=editorContainer.querySelector('#pane_'+btn.dataset.ptab);
    if(target)target.classList.add('active');
   };
  });

  // Image & Gallery Mounts
  const mainMount=editorContainer.querySelector(isProduct?'#productMainImageMount':'#standardMainImageMount');
  if(mainMount){
   mainMount.appendChild(renderImageField({
    label:isProduct?'Main Product Visual / Graphic':'Featured Image',
    value:currentImage,
    alt:item.title||'',
    onChange:(url)=>{currentImage=url;}
   }));
  }

  const galMount=editorContainer.querySelector(isProduct?'#productGalleryMount':'#standardGalleryMount');
  if(galMount){
   galMount.appendChild(renderGalleryManager({
    items:currentGallery,
    onChange:(list)=>{currentGallery=list;}
   }));
  }

  if(isProduct){
   const socialMount=editorContainer.querySelector('#productSocialImageMount');
   if(socialMount){
    socialMount.appendChild(renderImageField({
     label:'Social Share Card Image (OpenGraph/Twitter)',
     value:currentSocialImage,
     onChange:(url)=>{currentSocialImage=url;}
    }));
   }

   // Features editor
   const featList=editorContainer.querySelector('#featuresEditorList');
   const renderFeats=()=>{
    featList.innerHTML=currentFeatures.length?currentFeatures.map((f,i)=>`
     <div class="gallery-manager-item" style="margin-bottom:10px;">
      <div style="flex:1;display:grid;grid-template-columns:140px 1fr 1fr;gap:10px;">
       <input type="text" class="f-icon" data-idx="${i}" value="${esc(f.icon||'sparkles')}" placeholder="Lucide icon">
       <input type="text" class="f-title" data-idx="${i}" value="${esc(f.title||'')}" placeholder="Feature Title">
       <input type="text" class="f-desc" data-idx="${i}" value="${esc(f.description||'')}" placeholder="Feature Description">
      </div>
      <button type="button" class="mini-btn danger" data-del-feat="${i}">×</button>
     </div>
    `).join(''):'<p class="notice">No features added yet. Click "+ Add Feature Capability".</p>';
    featList.querySelectorAll('.f-icon').forEach(x=>x.oninput=()=>currentFeatures[+x.dataset.idx].icon=x.value);
    featList.querySelectorAll('.f-title').forEach(x=>x.oninput=()=>currentFeatures[+x.dataset.idx].title=x.value);
    featList.querySelectorAll('.f-desc').forEach(x=>x.oninput=()=>currentFeatures[+x.dataset.idx].description=x.value);
    featList.querySelectorAll('[data-del-feat]').forEach(b=>b.onclick=()=>{currentFeatures.splice(+b.dataset.delFeat,1);renderFeats();});
   };
   renderFeats();
   editorContainer.querySelector('#addFeatureBtn').onclick=()=>{currentFeatures.push({icon:'sparkles',title:'New Feature',description:'Description of capability'});renderFeats();};

   // Specs editor
   const specList=editorContainer.querySelector('#specsEditorList');
   const renderSpecs=()=>{
    specList.innerHTML=currentSpecs.length?currentSpecs.map((s,i)=>`
     <div class="gallery-manager-item" style="margin-bottom:10px;">
      <div style="flex:1;display:grid;grid-template-columns:160px 160px 1fr;gap:10px;">
       <input type="text" class="s-grp" data-idx="${i}" value="${esc(s.group||'General')}" placeholder="Group name">
       <input type="text" class="s-lbl" data-idx="${i}" value="${esc(s.label||'')}" placeholder="Attribute label">
       <input type="text" class="s-val" data-idx="${i}" value="${esc(s.value||'')}" placeholder="Value">
      </div>
      <button type="button" class="mini-btn danger" data-del-spec="${i}">×</button>
     </div>
    `).join(''):'<p class="notice">No specifications added yet. Click "+ Add Specification Row".</p>';
    specList.querySelectorAll('.s-grp').forEach(x=>x.oninput=()=>currentSpecs[+x.dataset.idx].group=x.value);
    specList.querySelectorAll('.s-lbl').forEach(x=>x.oninput=()=>currentSpecs[+x.dataset.idx].label=x.value);
    specList.querySelectorAll('.s-val').forEach(x=>x.oninput=()=>currentSpecs[+x.dataset.idx].value=x.value);
    specList.querySelectorAll('[data-del-spec]').forEach(b=>b.onclick=()=>{currentSpecs.splice(+b.dataset.delSpec,1);renderSpecs();});
   };
   renderSpecs();
   editorContainer.querySelector('#addSpecBtn').onclick=()=>{currentSpecs.push({group:'Platform',label:'Deployment',value:'Cloud / On-Premise'});renderSpecs();};

   // FAQs editor
   const faqList=editorContainer.querySelector('#faqsEditorList');
   const renderFaqs=()=>{
    faqList.innerHTML=currentFaqs.length?currentFaqs.map((faq,i)=>`
     <div class="gallery-manager-item" style="margin-bottom:10px;align-items:flex-start;">
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
       <input type="text" class="faq-q" data-idx="${i}" value="${esc(faq.question||faq.title||'')}" placeholder="Question">
       <textarea class="faq-a" data-idx="${i}" placeholder="Answer" rows="2">${esc(faq.answer||faq.description||'')}</textarea>
      </div>
      <button type="button" class="mini-btn danger" data-del-faq="${i}">×</button>
     </div>
    `).join(''):'<p class="notice">No FAQs added yet. Click "+ Add FAQ Item".</p>';
    faqList.querySelectorAll('.faq-q').forEach(x=>x.oninput=()=>currentFaqs[+x.dataset.idx].question=x.value);
    faqList.querySelectorAll('.faq-a').forEach(x=>x.oninput=()=>currentFaqs[+x.dataset.idx].answer=x.value);
    faqList.querySelectorAll('[data-del-faq]').forEach(b=>b.onclick=()=>{currentFaqs.splice(+b.dataset.delFaq,1);renderFaqs();});
   };
   renderFaqs();
   editorContainer.querySelector('#addFaqBtn').onclick=()=>{currentFaqs.push({question:'How is this product deployed?',answer:'It can be deployed on modern cloud infrastructure or in enterprise VPCs.'});renderFaqs();};

   // Live preview button
   editorContainer.querySelector('#btnPreviewEntry').onclick=()=>{
    const f=editorContainer.querySelector('#entryCustomForm');
    const formVals=Object.fromEntries(new FormData(f));
    const previewData={
     ...formVals,
     type:typeSelect.value,
     image:currentImage,
     gallery:currentGallery,
     features:currentFeatures,
     specifications:currentSpecs,
     faqs:currentFaqs,
     social_image:currentSocialImage
    };
    openProductPreviewModal(previewData);
   };
  }

  const titleInput=editorContainer.querySelector('#entryTitleInput');
  const slugInput=editorContainer.querySelector('#entrySlugInput');
  if(titleInput&&slugInput&&!editingRecord){
   titleInput.addEventListener('input',()=>{
    if(!slugInput.dataset.touched){
     slugInput.value=titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    }
   });
   slugInput.addEventListener('input',()=>{slugInput.dataset.touched='true';});
  }

  // Clear button
  editorContainer.querySelector('#btnClearEntry').onclick=()=>{
   editingRecord=null;
   initEditorForm({type:typeSelect.value,status:'published'});
  };

  // Submit handler
  const saveEntry=async(overrideStatus)=>{
   const f=editorContainer.querySelector('#entryCustomForm');
   const formData=Object.fromEntries(new FormData(f));
   if(editingRecord&&editingRecord.id)formData.id=editingRecord.id;
   if(overrideStatus)formData.status=overrideStatus;
   formData.type=typeSelect.value;
   formData.image=currentImage;
   formData.gallery=JSON.stringify(currentGallery);
   formData.seo_title=formData.seo_title||'';
   formData.seo_description=formData.seo_description||'';
   formData.social_image=currentSocialImage||'';
   formData.canonical_url=formData.canonical_url||'';
   if(isProduct){
    formData.features=JSON.stringify(currentFeatures);
    formData.specifications=JSON.stringify(currentSpecs);
    formData.faqs=JSON.stringify(currentFaqs);
    formData.social_image=currentSocialImage;
   }
   status('#entrySaveStatus','Saving entry…');
   try{
    await request('/api/admin/entries','POST',formData);
    status('#entrySaveStatus',`Entry saved successfully as ${formData.status}.`);
    showToast(`Entry "${formData.title}" saved (${formData.status})!`);
    await refreshEntries();
    listing();
   }catch(err){
    status('#entrySaveStatus','Error: '+err.message,true);
    showToast(err.message,true);
   }
  };

  editorContainer.querySelector('#btnPublishEntry').onclick=()=>saveEntry('published');
  editorContainer.querySelector('#btnDraftEntry').onclick=()=>saveEntry('draft');
 }

 listing();
}

/* Visual Page Builder with Media Picker Support */
const blockSpecs={
 hero:['eyebrow','title','description','image','buttonText','buttonLink'],
 'image-text':['eyebrow','title','description','image','align','buttonText','buttonLink'],
 text:['eyebrow','title','text'],cards:['eyebrow','title','description','items'],stats:['eyebrow','title','description','items'],faq:['eyebrow','title','description','items'],cta:['eyebrow','title','description','buttonText','buttonLink'],collection:['eyebrow','title','description','collection'],divider:[]
};
const defaultBlock=type=>({id:'b'+Math.random().toString(36).slice(2,12),type,eyebrow:'IDEAS · TECHNOLOGY · IMPACT',title:type==='hero'?'Designing What Comes Next':type==='cta'?"Let's Build Something Great":'Purposeful Technology, Beautifully Delivered',description:'Add your section description here.',text:'Write your content here.',image:'',buttonText:'Get in touch',buttonLink:'/contact',align:'normal',collection:'services',items:type==='stats'?[{value:'01',label:'Discover'},{value:'02',label:'Design'},{value:'03',label:'Develop'}]:type==='faq'?[{title:'How can we help?',description:'Contact us to discuss your requirements.'}]:[{icon:'sparkles',title:'Thoughtful solutions',description:'Built for your goals.'}]});
const starterFor=slug=>slug==='home'?[{...defaultBlock('hero'),title:content.heroTitle,description:content.heroDescription,image:content.logo}, {...defaultBlock('collection'),title:'End-to-End Technology Solutions',collection:'services'}, {...defaultBlock('collection'),eyebrow:'OUR PRODUCT PORTFOLIO',title:'Digital Products. Thoughtfully Designed.',description:'Explore our published software products and platforms.',collection:'products'}, {...defaultBlock('image-text'),title:content.aboutTitle,description:content.aboutDescription}, {...defaultBlock('collection'),title:'Industries We Serve',collection:'industries'},defaultBlock('cta')]:slug==='about'?[{...defaultBlock('image-text'),title:content.aboutTitle,description:content.aboutDescription,image:'',eyebrow:'ABOUT US'},{...defaultBlock('cards'),title:'Our Core Values',items:[{icon:'users',title:'Client First Approach',description:'Partnership at every stage.'},{icon:'lightbulb',title:'Innovation Driven',description:'Ideas that create real value.'},{icon:'shield-check',title:'Integrity Always',description:'Transparent, responsible work.'},{icon:'handshake',title:'People Empowerment',description:'Technology for everyone.'}]},defaultBlock('cta')]:[{...defaultBlock('hero'),title:slug[0].toUpperCase()+slug.slice(1).replaceAll('-',' ')},defaultBlock('text'),defaultBlock('cta')];
function itemsAsText(b){return (b.items||[]).map(x=>b.type==='stats'?`${x.value||''} | ${x.label||''}`:b.type==='faq'?`${x.title||x.question||''} | ${x.description||x.answer||''}`:`${x.icon||'sparkles'} | ${x.title||''} | ${x.description||''}`).join('\n')}
function parseItems(b,text){return text.split('\n').filter(x=>x.trim()).map(line=>{const parts=line.split('|').map(x=>x.trim());return b.type==='stats'?{value:parts[0]||'',label:parts[1]||''}:b.type==='faq'?{title:parts[0]||'',description:parts.slice(1).join(' | ')}:{icon:parts[0]||'sparkles',title:parts[1]||'',description:parts.slice(2).join(' | ')}})}

async function drawBuilder(el){
 el.innerHTML=`
  <div class="panel-header">
   <div><h3>Visual Page Builder</h3><p>Build editable sections, reorder them and publish. Custom layouts take precedence over default templates across public routes.</p></div>
  </div>
  <div class="admin-section-card" style="margin-bottom:20px;">
   <div class="admin-section-header"><h4>${ico('boxes')} Layout Settings &amp; Target Route</h4><small>Select an existing page route or define a new landing page slug</small></div>
   <div class="admin-form-grid">
    <div class="field"><label>Choose Page Target</label><select id="pageSelect">${routesKnown.map(x=>`<option value="${x}">${x==='home'?'/ (Homepage)':'/'+x}</option>`).join('')}<option value="custom">+ Create New Custom Landing Page</option></select></div>
    <div class="field"><label>Custom URL Slug</label><input id="customSlug" placeholder="new-landing-page" disabled></div>
    <div class="field"><label>Page Title</label><input id="pageTitle" value="Home"></div>
    <div class="field"><label>Publish Status</label><select id="pageStatus"><option value="published" selected>Published (Live on Website)</option><option value="draft">Draft (Private / Hidden)</option></select></div>
    <div class="field"><label>Custom SEO Title</label><input id="pageSEO" placeholder="Page Title | Azaroth"></div>
    <div class="field"><label>Meta Description</label><input id="pageDesc" placeholder="Page description for search engines..."></div>
   </div>
   <div class="editor-actions" style="margin-top:14px;">
    <button type="button" class="pill secondary" id="starterLayout">${ico('sparkles')} Load Starter Sections</button>
    <button type="button" class="pill secondary danger" id="deleteLayout">${ico('trash-2')} Remove Custom Layout</button>
   </div>
  </div>

  <div class="builder-heading">
   <h3>Page Sections (${builderBlocks.length})</h3>
   <div style="display:flex;gap:8px;">
    <select id="blockType">${Object.keys(blockSpecs).map(x=>`<option value="${x}">${x.toUpperCase()} block</option>`).join('')}</select>
    <button type="button" class="mini-btn" id="addBlock">+ Add Section</button>
   </div>
  </div>

  <div id="builderList"></div>

  <div class="editor-actions" style="margin-top:20px;">
   <button type="button" class="pill primary" id="saveLayout">${ico('rocket')} Publish Live Layout</button>
   <button type="button" class="pill secondary" id="saveDraft">${ico('save')} Save Draft</button>
   <button type="button" class="pill secondary" id="previewLayout">${ico('refresh-cw')} Refresh Live Preview</button>
  </div>
  <p id="builderStatus" role="status"></p>

  <h3 style="margin-top:28px;">Live Section Preview</h3>
  <div id="builderPreview" class="builder-preview"></div>

  <div class="admin-section-card" style="margin-top:32px;">
   <div class="admin-section-header"><h4>${ico('file-code')} Saved Custom Page Layouts</h4><small>All layouts saved in database</small></div>
   <div class="scroll" id="savedLayoutsList">Loading saved layouts…</div>
  </div>
 `;
 if(window.lucide)window.lucide.createIcons();

 const selector=$('#pageSelect'),slugBox=$('#customSlug');
 async function loadSavedLayoutsTable(){
  try{
   const layouts=await request('/api/admin/layouts');
   const container=$('#savedLayoutsList');
   if(!container)return;
   if(!layouts.length){container.innerHTML='<p class="notice">No custom layouts currently saved. Default coded templates are being served.</p>';return;}
   container.innerHTML=`<table><thead><tr><th>Route Slug</th><th>Page Title</th><th>Status</th><th>Last Modified</th><th>Actions</th></tr></thead><tbody>${layouts.map(l=>`<tr><td><code>/${esc(l.slug)}</code></td><td><strong>${esc(l.title)}</strong></td><td><span class="state-pill ${l.status==='published'?'published':'draft'}">${esc(l.status)}</span></td><td><small>${esc(String(l.updated_at||'').slice(0,16))}</small></td><td><div style="display:flex;gap:6px;"><button class="mini-btn" data-load-slug="${esc(l.slug)}">${ico('edit')} Edit</button><a href="/${esc(l.slug)}" data-link class="mini-btn secondary" target="_blank">${ico('external-link')} View</a></div></td></tr>`).join('')}</tbody></table>`;
   if(window.lucide)window.lucide.createIcons();
   container.querySelectorAll('[data-load-slug]').forEach(b=>b.onclick=()=>{
    const s=b.dataset.loadSlug;
    if(routesKnown.includes(s)){selector.value=s;slugBox.disabled=true;}
    else{selector.value='custom';slugBox.disabled=false;slugBox.value=s;}
    loadPage();
    el.scrollIntoView({behavior:'smooth'});
   });
  }catch(e){$('#savedLayoutsList').textContent=e.message;}
 }

 async function loadPage(){
  builderPage=selector.value==='custom'?slugBox.value:selector.value;
  if(!builderPage||!/^[a-z0-9-]+$/.test(builderPage))return;
  try{
   const row=await request('/api/admin/layout?slug='+builderPage);
   builderBlocks=clone(row?.blocks||[]);
   $('#pageTitle').value=row?.title||builderPage.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());
   $('#pageStatus').value=row?.status||'published';
   $('#pageSEO').value=row?.seo_title||'';
   $('#pageDesc').value=row?.seo_description||'';
   drawBlockList();
  }catch(err){status('#builderStatus',err.message,true);}
 }

 selector.onchange=()=>{slugBox.disabled=selector.value!=='custom';if(selector.value!=='custom')loadPage();else{builderPage='';builderBlocks=[];drawBlockList()}};
 slugBox.onchange=loadPage;
 $('#starterLayout').onclick=()=>{if(!builderPage)return status('#builderStatus','Select a page first.',true);if(builderBlocks.length&&!confirm('Replace current unsaved sections with starter layout?'))return;builderBlocks=starterFor(builderPage);drawBlockList();refreshPreview();showToast('Starter sections loaded');};
 $('#deleteLayout').onclick=async()=>{if(!builderPage||!confirm('Delete saved custom layout? Default page will appear again.'))return;try{await request('/api/admin/layout','DELETE',{slug:builderPage});builderBlocks=[];layoutCache[builderPage]=null;drawBlockList();refreshPreview();status('#builderStatus','Custom layout removed.');showToast('Layout removed');loadSavedLayoutsTable();}catch(err){status('#builderStatus',err.message,true);}};
 $('#addBlock').onclick=()=>{builderBlocks.push(defaultBlock($('#blockType').value));drawBlockList()};

 async function saveBuilder(statusVal){
  if(!builderPage)return status('#builderStatus','Select a page first.',true);
  try{
   await request('/api/admin/layout','PUT',{slug:builderPage,title:$('#pageTitle').value||builderPage,blocks:builderBlocks,status:statusVal,seo_title:$('#pageSEO').value,seo_description:$('#pageDesc').value});
   $('#pageStatus').value=statusVal;
   if(statusVal==='published'){layoutCache[builderPage]={title:$('#pageTitle').value,blocks:clone(builderBlocks)};status('#builderStatus','Saved & published live!');showToast('Layout published live!');}
   else{layoutCache[builderPage]=null;status('#builderStatus','Saved as draft.');showToast('Saved as draft.');}
   refreshPreview();
   loadSavedLayoutsTable();
  }catch(err){status('#builderStatus',err.message,true);showToast(err.message,true);}
 }
 $('#saveLayout').onclick=()=>saveBuilder('published');
 $('#saveDraft').onclick=()=>saveBuilder('draft');
 $('#previewLayout').onclick=refreshPreview;

 function refreshPreview(){const pr=$('#builderPreview');pr.innerHTML=builderBlocks.length?renderBlocks(builderBlocks):'<p class="notice">Add sections or load a starter layout to preview.</p>';if(window.lucide)window.lucide.createIcons();pr.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'))}

 function drawBlockList(){
  const list=$('#builderList');
  list.innerHTML=builderBlocks.map((b,i)=>`
   <div class="builder-block">
    <div class="builder-head"><strong>${i+1}. ${esc(b.type)}</strong><div class="editor-actions"><button type="button" class="mini-btn" data-dup="${i}" title="Duplicate block">${ico('copy')}</button><button type="button" class="mini-btn" data-up="${i}" title="Move up" ${i===0?'disabled':''}>↑</button><button type="button" class="mini-btn" data-down="${i}" title="Move down" ${i===builderBlocks.length-1?'disabled':''}>↓</button><button type="button" class="mini-btn danger" data-del="${i}" title="Delete">Delete</button></div></div>
    <div class="admin-form-grid">${blockSpecs[b.type].map(k=>`
     <div class="field ${['text','description','items'].includes(k)?'full':''}">
      <label>${esc(k==='items'?'Items (one per line; separate fields with |)':k)}</label>
      ${k==='image'?`
       <div style="display:flex;gap:8px;align-items:center;">
        <input data-i="${i}" data-k="${k}" value="${esc(b[k]||'')}" placeholder="/media/..." style="flex:1;">
        <button type="button" class="mini-btn" data-pick-block-img="${i}">${ico('image')} Choose</button>
       </div>
      `:k==='items'||['text','description'].includes(k)?`<textarea data-i="${i}" data-k="${k}">${esc(k==='items'?itemsAsText(b):b[k]||'')}</textarea>`:k==='collection'?`<select data-i="${i}" data-k="${k}">${entityTypes.map(v=>`<option value="${v}" ${b.collection===v?'selected':''}>${v}</option>`).join('')}</select>`:k==='align'?`<select data-i="${i}" data-k="${k}"><option value="normal">Text left</option><option value="reverse" ${b.align==='reverse'?'selected':''}>Image left</option></select>`:`<input data-i="${i}" data-k="${k}" value="${esc(b[k]||'')}">`}
     </div>
    `).join('')}</div>
   </div>
  `).join('');
  if(window.lucide)window.lucide.createIcons();
  list.querySelectorAll('input,textarea,select').forEach(x=>x.oninput=()=>{const b=builderBlocks[+x.dataset.i];b[x.dataset.k]=x.dataset.k==='items'?parseItems(b,x.value):x.value;refreshPreview();});
  list.querySelectorAll('[data-pick-block-img]').forEach(btn=>{
   btn.onclick=()=>{
    const idx=+btn.dataset.pickBlockImg;
    openMediaPickerModal({
     onSelect:(url)=>{
      builderBlocks[idx].image=url;
      drawBlockList();
      refreshPreview();
     }
    });
   };
  });
  list.querySelectorAll('button[data-dup]').forEach(b=>b.onclick=()=>{const i=+b.dataset.dup;const copy=clone(builderBlocks[i]);copy.id='b'+Math.random().toString(36).slice(2,12);builderBlocks.splice(i+1,0,copy);drawBlockList();});
  list.querySelectorAll('button[data-del],button[data-up],button[data-down]').forEach(b=>b.onclick=()=>{const i=+(b.dataset.del??b.dataset.up??b.dataset.down);if(b.hasAttribute('data-del'))builderBlocks.splice(i,1);else{const next=b.hasAttribute('data-up')?i-1:i+1;if(next>=0&&next<builderBlocks.length)[builderBlocks[i],builderBlocks[next]]=[builderBlocks[next],builderBlocks[i]];}drawBlockList();});
  refreshPreview();
 }
 loadPage();
 loadSavedLayoutsTable();
}

/* Media Library with In-Place Alt-Text Editing */
async function drawMedia(el){
 el.innerHTML=`<div class="panel-header"><div><h3>Media Library</h3><p>Upload and manage PNG, JPEG or WebP assets up to 4MB. Alt text is editable in-place.</p></div></div>
 <form id="uploadForm"><div class="admin-form-grid"><div class="field"><label>Select image file</label><input name="image" type="file" accept="image/png,image/jpeg,image/webp" required></div><div class="field"><label>Accessible alt text</label><input name="alt" required placeholder="Describe image..."></div></div><button class="pill primary">Upload image ${ico('upload')}</button><p id="mediaStatus" role="status"></p></form>
 <div id="mediaGrid" class="media-grid" style="margin-top:24px;"></div>`;

 async function listing(){
  try{
   const arr=await request('/api/admin/media');
   mediaCache=arr;
   $('#mediaGrid').innerHTML=arr.map(x=>`
    <div class="card" style="display:flex;flex-direction:column;gap:8px;">
     <img src="${esc(x.url)}" loading="lazy" alt="${esc(x.alt)}" style="width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;">
     <div style="display:flex;gap:6px;align-items:center;">
      <input type="text" class="media-alt-input" data-id="${x.id}" value="${esc(x.alt)}" placeholder="Alt text..." style="font-size:12px;padding:4px 8px;flex:1;">
      <button class="mini-btn" data-save-alt="${x.id}" title="Save Alt Text">Save</button>
     </div>
     <input readonly value="${esc(x.url)}" aria-label="Image URL" onclick="this.select()" style="font-size:11px;font-family:monospace;">
     <div class="editor-actions" style="margin-top:4px;">
      <button class="mini-btn" data-copy="${esc(x.url)}">Copy URL</button>
      ${me.role==='admin'?`<button class="mini-btn danger" data-remove="${x.id}">Delete</button>`:''}
     </div>
    </div>
   `).join('')||'<p class="notice">No images uploaded yet.</p>';

   $('#mediaGrid').querySelectorAll('[data-save-alt]').forEach(b=>b.onclick=async()=>{
    const id=+b.dataset.saveAlt;
    const inp=document.querySelector(`.media-alt-input[data-id="${id}"]`);
    if(!inp)return;
    try{
     await request('/api/admin/media','PATCH',{id,alt:inp.value});
     showToast('Alt text updated!');
     status('#mediaStatus','Alt text saved.');
    }catch(err){showToast(err.message,true);}
   });

   $('#mediaGrid').querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{
    try{await navigator.clipboard.writeText(b.dataset.copy);showToast('URL copied to clipboard!');}
    catch{prompt('Copy this URL:',b.dataset.copy);}
   });

   $('#mediaGrid').querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Permanently delete this image?'))return;
    try{await request('/api/admin/media','DELETE',{id:+b.dataset.remove});showToast('Image deleted');listing();}
    catch(err){status('#mediaStatus',err.message,true);showToast(err.message,true);}
   });
  }catch(err){status('#mediaStatus',err.message,true);}
 }

 $('#uploadForm').onsubmit=async ev=>{
  ev.preventDefault();const f=ev.currentTarget,file=f.elements.image.files[0];
  if(!file||file.size>4*1024*1024)return status('#mediaStatus','Maximum 4MB file size allowed.',true);
  status('#mediaStatus','Uploading…');
  try{
   const data=await new Promise((ok,fail)=>{const reader=new FileReader();reader.onload=()=>ok(reader.result);reader.onerror=fail;reader.readAsDataURL(file);});
   const out=await request('/api/admin/media','POST',{data,alt:f.elements.alt.value});
   status('#mediaStatus','Uploaded: '+out.url);
   showToast('Image uploaded successfully!');
   f.reset();listing();
  }catch(err){status('#mediaStatus',err.message,true);showToast(err.message,true);}
 };
 listing();
}

async function drawInquiries(el){
 el.innerHTML=`
  <div class="panel-header">
   <div><h3>Contact Enquiries &amp; RFQs</h3><p>Review customer communications, RFQ details, track pipeline status, and add private notes.</p></div>
   <div class="editor-actions"><button type="button" class="pill secondary mini" id="btnExportInquiries">${ico('download')} Export Enquiries (CSV)</button></div>
  </div>
  <div class="admin-form-grid" style="margin-bottom:16px;">
   <div class="field"><label>Search enquiries</label><input type="search" id="inquirySearch" placeholder="Filter by name, email, company, keyword..."></div>
   <div class="field"><label>Filter by status</label><select id="inquiryStatusFilter"><option value="">All statuses</option><option value="new">New</option><option value="in-progress">In Progress</option><option value="replied">Replied</option><option value="closed">Closed</option></select></div>
  </div>
  <div class="scroll" id="inquiriesTable">Loading…</div>
 `;
 if(window.lucide)window.lucide.createIcons();
 try{
  let allRows=await request('/api/admin/inquiries');
  function renderInquiries(){
   const q=($('#inquirySearch')?.value||'').toLowerCase().trim();
   const st=$('#inquiryStatusFilter')?.value||'';
   const filtered=allRows.filter(x=>{
    const matchQ=!q||(x.name+' '+x.email+' '+(x.company||'')+' '+(x.service||'')+' '+(x.message||'')).toLowerCase().includes(q);
    const matchSt=!st||x.status===st;
    return matchQ&&matchSt;
   });
   $('#inquiriesTable').innerHTML=`<table><thead><tr><th>Date</th><th>Contact &amp; Organization</th><th>Enquiry / RFQ Details</th><th>Status &amp; Internal Notes</th></tr></thead><tbody>${filtered.length?filtered.map(x=>`<tr><td><small>${esc(String(x.created_at||'').slice(0,16))}</small></td><td><strong>${esc(x.name)}</strong><br><a href="mailto:${esc(x.email)}" style="color:var(--burgundy);text-decoration:underline;">${esc(x.email)}</a>${x.company?`<br><small style="color:#667084">${esc(x.company)}</small>`:''}${x.service?`<br><span class="state-pill draft" style="font-size:10px;padding:2px 8px;margin-top:4px;display:inline-block;">${esc(x.service)}</span>`:''}</td><td class="long-cell">${esc(x.message)}</td><td><div style="display:flex;flex-direction:column;gap:6px;"><select data-status="${x.id}">${['new','in-progress','replied','closed'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select><textarea data-notes="${x.id}" placeholder="Internal administrative notes" rows="2" style="font-size:12px;">${esc(x.notes||'')}</textarea><div style="display:flex;gap:6px;"><button class="mini-btn" data-save="${x.id}">${ico('save')} Save</button><a href="mailto:${esc(x.email)}" class="mini-btn secondary" target="_blank">${ico('mail')} Reply</a>${me.role==='admin'?`<button class="mini-btn danger" data-inquiry-delete="${x.id}">Delete</button>`:''}</div><small class="admin-feedback" data-result="${x.id}"></small></div></td></tr>`).join(''):'<tr><td colspan="4" class="notice">No matching enquiries found.</td></tr>'}</tbody></table>`;
   if(window.lucide)window.lucide.createIcons();

   $('#inquiriesTable').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.save;
    try{
     await request('/api/admin/inquiries','PATCH',{id:+id,status:document.querySelector(`[data-status="${id}"]`).value,notes:document.querySelector(`[data-notes="${id}"]`).value});
     const r=allRows.find(x=>x.id===+id);if(r){r.status=document.querySelector(`[data-status="${id}"]`).value;r.notes=document.querySelector(`[data-notes="${id}"]`).value;}
     document.querySelector(`[data-result="${id}"]`).textContent='Saved';
     showToast('Enquiry updated!');
    }catch(err){document.querySelector(`[data-result="${id}"]`).textContent=err.message;}
   });

   $('#inquiriesTable').querySelectorAll('[data-inquiry-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Permanently delete this enquiry?'))return;
    try{
     await request('/api/admin/inquiries','DELETE',{id:+b.dataset.inquiryDelete});
     allRows=allRows.filter(x=>x.id!==+b.dataset.inquiryDelete);
     renderInquiries();
     showToast('Enquiry deleted');
    }catch(err){showToast(err.message,true);}
   });
  }

  $('#inquirySearch').oninput=renderInquiries;
  $('#inquiryStatusFilter').onchange=renderInquiries;
  $('#btnExportInquiries').onclick=()=>{
   const headers=['ID','Date','Name','Email','Company','Service','Status','Notes','Message'];
   const csv=[headers.join(',')].concat(allRows.map(r=>[
    r.id,
    `"${(r.created_at||'').replace(/"/g,'""')}"`,
    `"${(r.name||'').replace(/"/g,'""')}"`,
    `"${(r.email||'').replace(/"/g,'""')}"`,
    `"${(r.company||'').replace(/"/g,'""')}"`,
    `"${(r.service||'').replace(/"/g,'""')}"`,
    `"${(r.status||'').replace(/"/g,'""')}"`,
    `"${(r.notes||'').replace(/"/g,'""')}"`,
    `"${(r.message||'').replace(/"/g,'""')}"`
   ].join(','))).join('\n');
   const blob=new Blob([csv],{type:'text/csv'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`azaroth-enquiries-${new Date().toISOString().slice(0,10)}.csv`;a.click();
   showToast('Enquiries exported to CSV');
  };
  renderInquiries();
 }catch(err){$('#inquiriesTable').textContent=err.message;}
}

async function drawApplications(el){
 el.innerHTML=`
  <div class="panel-header">
   <div><h3>Job Applications &amp; Candidate Resumes</h3><p>Private applicant data. Résumé downloads require a signed-in account with editor permissions.</p></div>
   <div class="editor-actions"><button type="button" class="pill secondary mini" id="btnExportApps">${ico('download')} Export Applications (CSV)</button></div>
  </div>
  <div class="admin-form-grid" style="margin-bottom:16px;">
   <div class="field"><label>Search applications</label><input type="search" id="appSearch" placeholder="Filter by name, email, role..."></div>
   <div class="field"><label>Filter by status</label><select id="appStatusFilter"><option value="">All statuses</option><option value="new">New</option><option value="review">Review</option><option value="interview">Interview</option><option value="rejected">Rejected</option><option value="hired">Hired</option></select></div>
  </div>
  <div class="scroll" id="applicantsTable">Loading…</div>
 `;
 if(window.lucide)window.lucide.createIcons();
 try{
  let allRows=await request('/api/admin/applications');
  function renderApps(){
   const q=($('#appSearch')?.value||'').toLowerCase().trim();
   const st=$('#appStatusFilter')?.value||'';
   const filtered=allRows.filter(x=>{
    const matchQ=!q||(x.name+' '+x.email+' '+(x.opening_slug||x.job_slug||'')+' '+(x.message||'')).toLowerCase().includes(q);
    const matchSt=!st||x.status===st;
    return matchQ&&matchSt;
   });
   $('#applicantsTable').innerHTML=`<table><thead><tr><th>Date &amp; Role</th><th>Applicant Info</th><th>Message &amp; Resume</th><th>Pipeline Status</th></tr></thead><tbody>${filtered.length?filtered.map(x=>`<tr><td><small>${esc(String(x.created_at||'').slice(0,16))}</small><br><strong>/${esc(x.opening_slug||x.job_slug||'general')}</strong></td><td><strong>${esc(x.name)}</strong><br><a href="mailto:${esc(x.email)}" style="color:var(--burgundy);">${esc(x.email)}</a>${x.phone?`<br><small>${esc(x.phone)}</small>`:''}${x.portfolio?`<br><a href="${esc(x.portfolio)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--gold);">${esc(x.portfolio)} ↗</a>`:''}</td><td class="long-cell">${esc(x.message||x.note||'')}${x.resume_filename?`<br><a href="/api/admin/resume?id=${x.id}" target="_blank" class="mini-btn" style="display:inline-flex;margin-top:8px;">${ico('file-text')} Download PDF Resume</a>`:''}</td><td><div style="display:flex;flex-direction:column;gap:6px;"><select data-status="${x.id}">${['new','review','interview','rejected','hired'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select><div style="display:flex;gap:6px;"><button class="mini-btn" data-save="${x.id}">${ico('save')} Update</button><a href="mailto:${esc(x.email)}" class="mini-btn secondary" target="_blank">${ico('mail')} Reply</a>${me.role==='admin'?`<button class="mini-btn danger" data-application-delete="${x.id}">Delete</button>`:''}</div><small data-result="${x.id}"></small></div></td></tr>`).join(''):'<tr><td colspan="4" class="notice">No matching job applications found.</td></tr>'}</tbody></table>`;
   if(window.lucide)window.lucide.createIcons();

   $('#applicantsTable').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.save;
    try{
     await request('/api/admin/applications','PATCH',{id:+id,status:document.querySelector(`[data-status="${id}"]`).value});
     const r=allRows.find(x=>x.id===+id);if(r)r.status=document.querySelector(`[data-status="${id}"]`).value;
     document.querySelector(`[data-result="${id}"]`).textContent='Saved';
     showToast('Status saved!');
    }catch(err){document.querySelector(`[data-result="${id}"]`).textContent=err.message;}
   });

   $('#applicantsTable').querySelectorAll('[data-application-delete]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Permanently delete this application and its resume?'))return;
    try{
     await request('/api/admin/applications','DELETE',{id:+b.dataset.applicationDelete});
     allRows=allRows.filter(x=>x.id!==+b.dataset.applicationDelete);
     renderApps();
     showToast('Application deleted');
    }catch(err){showToast(err.message,true);}
   });
  }

  $('#appSearch').oninput=renderApps;
  $('#appStatusFilter').onchange=renderApps;
  $('#btnExportApps').onclick=()=>{
   const headers=['ID','Date','Role','Name','Email','Phone','Portfolio','Status','Message'];
   const csv=[headers.join(',')].concat(allRows.map(r=>[
    r.id,
    `"${(r.created_at||'').replace(/"/g,'""')}"`,
    `"${(r.opening_slug||r.job_slug||'').replace(/"/g,'""')}"`,
    `"${(r.name||'').replace(/"/g,'""')}"`,
    `"${(r.email||'').replace(/"/g,'""')}"`,
    `"${(r.phone||'').replace(/"/g,'""')}"`,
    `"${(r.portfolio||'').replace(/"/g,'""')}"`,
    `"${(r.status||'').replace(/"/g,'""')}"`,
    `"${(r.message||r.note||'').replace(/"/g,'""')}"`
   ].join(','))).join('\n');
   const blob=new Blob([csv],{type:'text/csv'});
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`azaroth-job-applications-${new Date().toISOString().slice(0,10)}.csv`;a.click();
   showToast('Applications exported to CSV');
  };
  renderApps();
 }catch(err){$('#applicantsTable').textContent=err.message;}
}

async function drawUsers(el){
 el.innerHTML=`
  <div class="panel-header"><div><h3>Admin Users &amp; Permissions</h3><p>Roles: Admin manages the entire CMS, Editor publishes content, Viewer has read-only access.</p></div></div>
  <div id="usersTable" class="scroll">Loading…</div>
  <div class="admin-section-card" style="margin-top:24px;">
   <div class="admin-section-header"><h4>${ico('user-plus')} Invite a New Administrator or Editor</h4><small>Create credentials with role-based permissions</small></div>
   <form id="newUserForm">
    <div class="admin-form-grid">
     <div class="field"><label>Email address *</label><input type="email" name="email" required placeholder="colleague@azaroth.tech"></div>
     <div class="field"><label>Temporary password (16+ characters) *</label><input type="password" name="password" required minlength="16" placeholder="Strong password..."></div>
     <div class="field"><label>System Role *</label><select name="role"><option value="viewer">Viewer (Read-only)</option><option value="editor" selected>Editor (Content &amp; Media publishing)</option><option value="admin">Admin (Full Control)</option></select></div>
    </div>
    <div class="editor-actions"><button type="submit" class="pill primary">Create user ${ico('check')}</button></div>
    <p id="userStatus" role="status"></p>
   </form>
  </div>
  <div class="admin-section-card" style="margin-top:24px;">
   <div class="admin-section-header"><h4>${ico('key-round')} Change Your Password</h4><small>Update your current login credentials</small></div>
   <form id="passwordForm">
    <div class="admin-form-grid">
     <div class="field"><label>Current password *</label><input type="password" name="current" required></div>
     <div class="field"><label>New password (16+ characters) *</label><input type="password" name="next" minlength="16" required></div>
    </div>
    <div class="editor-actions"><button type="submit" class="pill secondary">Update password</button></div>
    <p id="passwordStatus" role="status"></p>
   </form>
  </div>
 `;
 if(window.lucide)window.lucide.createIcons();
 async function listing(){
  try{
   const rows=await request('/api/admin/users');
   $('#usersTable').innerHTML=`<table><thead><tr><th>Email Account</th><th>Role</th><th>Active State</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${esc(x.email)}</strong>${x.id===me.id?' <small style="color:var(--gold);font-weight:700;">(You)</small>':''}</td><td><select data-role="${x.id}">${['viewer','editor','admin'].map(v=>`<option value="${v}" ${x.role===v?'selected':''}>${v}</option>`).join('')}</select></td><td><label style="display:flex;align-items:center;gap:6px;font-size:12px;"><input data-active="${x.id}" type="checkbox" ${x.active?'checked':''}> Active</label></td><td><div style="display:flex;gap:6px;"><button class="mini-btn" data-save="${x.id}">${ico('save')} Save</button>${x.id!==me.id&&me.role==='admin'?`<button class="mini-btn danger" data-del-user="${x.id}">${ico('trash-2')} Delete</button>`:''}<small data-result="${x.id}"></small></div></td></tr>`).join('')}</tbody></table>`;
   if(window.lucide)window.lucide.createIcons();
   $('#usersTable').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.save;
    try{
     await request('/api/admin/users','PATCH',{id:+id,role:document.querySelector(`[data-role="${id}"]`).value,active:document.querySelector(`[data-active="${id}"]`).checked});
     document.querySelector(`[data-result="${id}"]`).textContent='Saved';
     showToast('User updated');
     listing();
    }catch(err){document.querySelector(`[data-result="${id}"]`).textContent=err.message;}
   });
   $('#usersTable').querySelectorAll('[data-del-user]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Permanently delete this user account?'))return;
    try{
     await request('/api/admin/users','DELETE',{id:+b.dataset.delUser});
     showToast('User deleted');
     listing();
    }catch(err){showToast(err.message,true);}
   });
  }catch(err){$('#usersTable').textContent=err.message;}
 }
 $('#newUserForm').onsubmit=async ev=>{
  ev.preventDefault();
  try{
   await request('/api/admin/users','POST',Object.fromEntries(new FormData(ev.currentTarget)));
   status('#userStatus','User created successfully.');
   ev.currentTarget.reset();listing();showToast('New user invited!');
  }catch(err){status('#userStatus',err.message,true);}
 };
 $('#passwordForm').onsubmit=async ev=>{
  ev.preventDefault();
  try{
   await request('/api/admin/password','POST',Object.fromEntries(new FormData(ev.currentTarget)));
   status('#passwordStatus','Password updated.');ev.currentTarget.reset();showToast('Password updated!');
  }catch(err){status('#passwordStatus',err.message,true);}
 };
 listing();
}

async function drawAudit(el){
 el.innerHTML='<h3>Administrative Activity Log</h3><p>Recent actions and configuration changes.</p><div id="auditTable" class="scroll">Loading…</div>';
 try{
  const rows=await request('/api/admin/audit');
  $('#auditTable').innerHTML=`<table><thead><tr><th>Date</th><th>Account</th><th>Action</th><th>Details</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.created_at)}</td><td>${esc(x.email||'System')}</td><td>${esc(x.action)}</td><td>${esc(x.details)}</td></tr>`).join('')}</tbody></table>`;
 }catch(err){$('#auditTable').textContent=err.message;}
}

function drawAccount(el){
 el.innerHTML=`<h3>My Account</h3><p>You are signed in as <strong>${esc(me.email)}</strong>. Update your password here.</p><form id="accountPassword"><div class="admin-form-grid"><div class="field"><label>Current password</label><input name="current" type="password" required></div><div class="field"><label>New password (16+ characters)</label><input name="next" type="password" minlength="16" required></div></div><button class="pill primary">Change password</button><p id="accountStatus" role="status"></p></form>`;
 $('#accountPassword').onsubmit=async e=>{
  e.preventDefault();
  try{await request('/api/admin/password','POST',Object.fromEntries(new FormData(e.currentTarget)));e.currentTarget.reset();status('#accountStatus','Password updated successfully.');showToast('Password changed!');}
  catch(err){status('#accountStatus',err.message,true);}
 };
}

/* Luxury Interactive Cursor */
initCursor=function(){
 const fine=matchMedia('(hover:hover) and (pointer:fine)');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 if(!fine.matches||reduced.matches||content.cursorEnabled==='false')return;
 const orb=$('#orb');if(!orb)return;
 let x=-150,y=-150,px=-150,py=-150,hover=false;
 const dot=orb.querySelector('em');if(dot)dot.textContent='';

 const updatePointer=ev=>{
  if(ev.pointerType==='touch')return;
  if(!fine.matches||reduced.matches){hide();return;}
  x=ev.clientX;y=ev.clientY;
  const element=ev.target instanceof Element?ev.target:null;
  const interactive=element?.closest('a,button,[role="button"],.card,.industry-card,summary');
  const editable=element?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"],.admin');
  const disabled=location.pathname==='/admin'||!!editable||content.cursorEnabled==='false';
  hover=!!interactive&&!disabled;
  orb.classList.toggle('hover',hover);
  orb.classList.toggle('show',!disabled);
  document.body.classList.toggle('custom-cursor',!disabled);
 };
 const hide=()=>{orb.classList.remove('show','hover','click');document.body.classList.remove('custom-cursor');hover=false;};
 document.addEventListener('pointermove',updatePointer,{passive:true});
 document.addEventListener('pointerleave',hide);
 window.addEventListener('blur',hide);
 document.addEventListener('pointerdown',()=>orb.classList.add('click'));
 document.addEventListener('pointerup',()=>orb.classList.remove('click'));
 const mediaChange=()=>{if(!fine.matches||reduced.matches)hide();};
 fine.addEventListener?.('change',mediaChange);reduced.addEventListener?.('change',mediaChange);

 function frame(){
  const lag=Math.max(.12,Math.min(.5,Number(content.cursorLag)||.32));
  px+=(x-px)*lag;py+=(y-py)*lag;
  const appearance=cursorAppearance();
  const size=hover?appearance.hover:appearance.base;
  orb.style.transform=`translate3d(${(px-size/2).toFixed(2)}px,${(py-size/2).toFixed(2)}px,0)`;
  requestAnimationFrame(frame);
 }
 frame();
};

/* Initialization */
fetch('/api/content').then(r=>{if(!r.ok)throw Error('Site content unavailable ('+r.status+')');return r.json()}).then(async data=>{
 content=data;await refreshEntries();render();initCursor();
}).catch(err=>{
 console.error('[Content Load Error]:',err);
 if(!content||!content.brand){
  content={brand:'AZAROTH',brandTitle:'AZAROTH',brandSubtitle:'TECHHIVE',tagline:'Ideas. Technology. Impact.',footerBrandTitle:'AZAROTH',footerBrandSubtitle:'TECHHIVE',primary:'#900b2b',gold:'#d5a13c',orange:'#f47721',background:'#faf8f4',ink:'#171b2c'};
  render();initCursor();
 }
});
})();
