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
 const bSubtitle=content.brandSubtitle||content.footerBrandSubtitle||'TECHHIVE';
 return `<header class="nav" id="nav"><a data-link href="/" class="brand" aria-label="${esc(bTitle)} ${esc(bSubtitle)} homepage"><img src="${esc(mediaURL(content.logo||'/logo.png'))}" alt="${esc(bTitle)} logo"><div class="brand-lockup"><span class="brand-title">${esc(bTitle)}</span><span class="brand-subtitle">${esc(bSubtitle)}</span></div></a><nav class="links" id="links" aria-label="Main navigation">${links.map(x=>`<a href="${esc(actionURL(x.url))}" ${x.url.startsWith('/')?'data-link':''} class="${location.pathname===x.url?'active':''}">${esc(x.label)}</a>`).join('')}</nav><div class="nav-actions"><a href="/contact" class="pill primary" data-link>Get a Quote ${ico('arrow-up-right')}</a><button class="menu-btn" aria-controls="links" aria-expanded="false" aria-label="Open menu" id="menu">${ico('menu')}</button></div></header>`;
};

footer=function(){
 const ls=navItems(),social=getJSON(content.socials,[]);
 const fTitle=content.footerBrandTitle||content.brandTitle||content.brand||'AZAROTH';
 const fSubtitle=content.footerBrandSubtitle||content.brandSubtitle||'TECHHIVE';
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
 const heading=block.title||content.homeProductsTitle||'Digital Products. Thoughtfully Designed.';
 const intro=block.description||content.homeProductsDescription||'Discover the digital platforms and products we are building to solve meaningful business challenges.';
 const headingUI=`<div class="product-section-heading reveal"><div class="section-head"><div class="eyebrow">${esc(label)}</div><h2>${title(heading)}</h2><p>${esc(intro)}</p></div><a data-link href="/products" class="product-section-link">Explore all products ${ico('arrow-up-right')}</a></div>`;
 if(!products.length)return `<section class="product-showcase" id="featured-products"><div class="wrap">${headingUI}<div class="product-empty reveal"><div class="product-empty-art">${productVisual(null)}</div><div class="product-empty-copy"><span class="product-label">A SPACE FOR WHAT'S NEXT</span><h3>Designed to solve real-world challenges.</h3><p>We create thoughtfully designed digital platforms for modern organisations. Have an idea for a tailored product? Let's build it together.</p><a data-link class="pill primary" href="/contact">Discuss Your Product ${ico('arrow-up-right')}</a></div></div></div></section>`;
 const lead=products[0],remaining=products.slice(1);
 const leadUrl='/products/'+encodeURIComponent(lead.slug);
 const details=item=>{const lines=String(item.body||'').split('\n').map(x=>x.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);return lines.slice(0,2).map(x=>`<li>${esc(x.slice(0,125))}</li>`).join('')};
 return `<section class="product-showcase" id="featured-products"><div class="wrap">${headingUI}<div class="featured-product reveal"><div class="featured-product-copy"><span class="product-label">${esc(lead.category||'FEATURED PRODUCT')}</span><h3>${esc(lead.title)}</h3><p>${esc(lead.summary)}</p>${details(lead)?`<ul class="product-detail-bullets">${details(lead)}</ul>`:''}${productTags(lead)?`<div class="product-tags">${productTags(lead)}</div>`:''}<a data-link class="pill primary" href="${esc(leadUrl)}">${esc(lead.hero_cta_label||'Discover Product')} ${ico('arrow-up-right')}</a></div><a href="${esc(leadUrl)}" data-link class="featured-product-visual" aria-label="View ${esc(lead.title)} details">${productVisual(lead)}</a></div>${remaining.length?`<div class="product-mini-grid">${remaining.map((item,i)=>{const url='/products/'+encodeURIComponent(item.slug);return `<a data-link href="${esc(url)}" class="product-mini-card reveal" style="transition-delay:${i*90}ms"><div class="product-mini-media">${productVisual(item,true)}</div><div class="product-mini-content"><span class="product-label">${esc(item.category||'DIGITAL PRODUCT')}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p>${productTags(item)?`<div class="product-tags">${productTags(item)}</div>`:''}<span class="product-arrow">View product ${ico('arrow-up-right')}</span></div></a>`}).join('')}</div>`:''}</div></section>`;
}

hero=function(){
 const bLogo=mediaURL(content.heroImage||content.logo||'/logo.png');
 return `<section class="hero"><div class="wrap"><div class="hero-inner"><div class="hero-copy reveal"><div class="eyebrow">${esc(content.heroEyebrow||'SOFTWARE ENGINEERING & DIGITAL SOLUTIONS')}</div><h1>${title(content.heroTitle,true)}</h1><p>${esc(content.heroDescription)}</p><div class="actions"><a data-link href="/contact" class="pill primary">Let's work together ${ico('arrow-up-right')}</a><a data-link href="/services" class="pill secondary">Explore services ${ico('arrow-right')}</a></div></div><div class="hero-art reveal"><div class="halo"></div><img src="${esc(bLogo)}" alt="${esc(content.brand||'AZAROTH')} emblem"><div class="art-tag">${esc(content.tagline||'Purposeful software, designed for tomorrow.')}</div><div class="mini-card"><div class="icon-box">${ico('sparkles')}</div><div><b>Design meets innovation</b><small>Purpose-built digital solutions</small></div></div></div></div><div class="hero-stats reveal">${arr('stats').map(s=>`<div><strong>${esc(s.value)}</strong><small>${esc(s.label)}</small></div>`).join('')}</div></div></section>`;
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

about=function(){
 const aImg=mediaURL(content.aboutImage||'/images/about_corporate_studio.jpg');
 return `<section class="page-hero about-top"><div class="wrap about-grid"><div class="reveal"><div class="eyebrow">ABOUT US</div><h1>${title(content.aboutTitle,true)}</h1><p>${esc(content.aboutDescription)}</p><div class="actions"><a href="/contact" data-link class="pill primary">Our journey starts here ${ico('arrow-up-right')}</a></div></div><div class="photo-frame reveal"><img src="${esc(aImg)}" alt="Modern collaborative office"><div class="mission-card"><div class="tile-icon">${ico('target')}</div><div><strong>Our mission</strong><p>${esc(content.mission)}</p></div></div></div></div><div class="wrap">${values()}</div></section><section><div class="wrap">${sectionHead('WHAT WE BELIEVE','Better Technology Starts with Better Thinking','We combine curiosity, craft and collaboration to create technology that works beautifully for people.') }<div class="grid grid-3"><div class="card"><div class="tile-icon mint">${ico('eye')}</div><h3>Our vision</h3><p>Make powerful digital technology more meaningful, accessible and useful.</p></div><div class="card"><div class="tile-icon peach">${ico('target')}</div><h3>Our mission</h3><p>${esc(content.mission)}</p></div><div class="card"><div class="tile-icon lavender">${ico('heart-handshake')}</div><h3>Our promise</h3><p>Thoughtful partnerships, transparent communication and quality engineering.</p></div></div></div></section>`+teamShowcase()+cta();
};

dynamicListing=function(type,label,headline,desc){
 const items=entryCache[type]||[],cats=[...new Set(items.map(x=>x.category).filter(Boolean))],locations=[...new Set(items.map(x=>x.location).filter(Boolean))];
 return pageHero(esc(label),headline,esc(desc))+`<section><div class="wrap"><div class="listing-filters"><label>Search <input id="listingSearch" type="search" placeholder="Search ${esc(type)}"></label>${cats.length?`<label>Category <select id="listingCategory"><option value="">All categories</option>${cats.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`:''}${type==='careers'&&locations.length?`<label>Location <select id="listingLocation"><option value="">All locations</option>${locations.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`:''}</div><div class="grid grid-3" id="listingCards">${items.length?items.map(x=>`<article class="card reveal listing-card" data-search="${esc((x.title+' '+x.summary+' '+x.category+' '+x.location).toLowerCase())}" data-category="${esc(x.category||'')}" data-location="${esc(x.location||'')}">${x.image?`<img class="entry-image" src="${esc(mediaURL(x.image))}" alt="${esc(x.title)}" loading="lazy">`:`<div class="tile-icon peach">${ico(type==='blog'?'book-open':type==='careers'?'briefcase-business':type==='products'?'package':'layers-3')}</div>`}${x.category?`<div class="eyebrow listing-eyebrow">${esc(x.category)}</div>`:''}<h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p>${x.location?`<p class="listing-location">${ico('map-pin')} ${esc(x.location)}</p>`:''}<a data-link class="card-arrow" href="/${type}/${encodeURIComponent(x.slug)}">View details ${ico('arrow-up-right')}</a></article>`).join(''):`<div class="empty-note"><h3>Nothing published yet</h3><p>New content will appear here after it has been approved and published in the CMS.</p></div>`}</div><p id="listingEmpty" class="notice" hidden>No results match these filters.</p></div></section>`+cta();
};

contact=function(){
 return legacyContact().replace('<button type="submit" class="pill primary">',`<label class="privacy-check"><input type="checkbox" name="consent" required> I agree to the <a href="/privacy" target="_blank" rel="noopener">privacy notice</a> and consent to my enquiry being stored for a reply.</label><button type="submit" class="pill primary">`);
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
 const routes={'/':home,'/about':about,'/services':services,'/industries':industries,'/products':products,'/careers':careers,'/blog':blog,'/projects':projects,'/contact':contact,'/privacy':privacy,'/terms':terms,'/admin':admin};
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
  try{const x=Object.fromEntries(new FormData(f));x.consent=f.elements.consent.checked;await request('/api/contact','POST',x);f.reset();status('#formResult','Thank you! Your enquiry was received.');showToast('Contact enquiry received!');}
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
 el.innerHTML='<h3>At a glance</h3><p>Your live CMS overview.</p><div id="overviewGrid" class="dash-cards"></div><p class="notice">Tip: Manage your brand identity, products, media assets and legal pages before public launch.</p>';
 try{
  const d=await request('/api/admin/overview');
  $('#overviewGrid').innerHTML=`${[['Public content',d.entries.reduce((a,x)=>a+x.count,0)],['Page layouts',d.pages],['Enquiries',d.enquiries],['Job applications',d.applications]].map(([k,v])=>`<div><strong>${v}</strong><span>${k}</span></div>`).join('')}`;
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
  ['Brand Title (AZAROTH)','brand','text'],['Brand Subtitle (TECHHIVE)','brandSubtitle','text'],['Tagline','tagline','text'],
  ['Footer brand title (defaults to Brand Title)','footerBrandTitle','text'],['Footer brand subtitle (defaults to Brand Subtitle)','footerBrandSubtitle','text'],
  ['Hero eyebrow','heroEyebrow','text'],['Hero headline','heroTitle','text'],['Hero description','heroDescription','textarea'],
  ['Homepage services eyebrow','homeServicesEyebrow','text'],['Homepage services headline','homeServicesTitle','text'],['Homepage services description','homeServicesDescription','textarea'],
  ['Homepage products headline','homeProductsTitle','text'],['Homepage products description','homeProductsDescription','textarea'],
  ['Homepage industries eyebrow','homeIndustriesEyebrow','text'],['Homepage industries headline','homeIndustriesTitle','text'],['Homepage industries description','homeIndustriesDescription','textarea'],
  ['Homepage approach eyebrow','homeApproachEyebrow','text'],['Homepage approach headline','homeApproachTitle','text'],['Homepage approach description','homeApproachDescription','textarea'],
  ['About headline','aboutTitle','text'],['About description','aboutDescription','textarea'],['Mission statement','mission','textarea'],
  ['Global CTA eyebrow','ctaEyebrow','text'],['Global CTA headline','ctaTitle','text'],['Global CTA button label','ctaButtonText','text'],['Global CTA button link','ctaButtonLink','text'],
  ['Footer description','footerDescription','textarea'],['Contact email','contactEmail','email'],['WhatsApp / Contact phone','contactPhone','text'],['Office Location','contactLocation','text'],
  ['Privacy policy notice','privacyText','textarea'],['Terms of use notice','termsText','textarea'],
  ['Cursor size tuning (24–62)','cursorSize','number'],['Cursor follow speed (0.08–0.5)','cursorLag','text']
 ];

 el.innerHTML=`<div class="panel-header"><div><h3>Brand, Content & Theme Settings</h3><p>Manage your identity, typography, headlines, colors and interactive effects. All changes save to SQLite and update live across the website.</p></div></div>
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
 <div class="admin-section-card"><div class="admin-section-header"><h4>${ico('type')} Website Copy & Identity</h4><small>All text fields support rich accent formatting</small></div>
 <div class="admin-form-grid">${textFields.map(([label,key,type])=>`<div class="field ${type==='textarea'?'full':''}"><label>${esc(label)}</label>${type==='textarea'?`<textarea name="${key}">${esc(content[key]||'')}</textarea>`:`<input type="${type}" name="${key}" value="${esc(content[key]||'')}">`}</div>`).join('')}
 <div class="field"><label>Homepage product showcase</label><select name="homeProductsEnabled"><option value="true" ${content.homeProductsEnabled!=='false'?'selected':''}>Visible</option><option value="false" ${content.homeProductsEnabled==='false'?'selected':''}>Hidden</option></select></div>
 <div class="field full"><label for="cursorStyle">Cursor design — transparent center, no text covered</label><select id="cursorStyle" name="cursorStyle">${[['gold-ring','Fine Gold Ring · Recommended'],['gold-orbit','Golden Orbit · Logo Inspired'],['micro-dot','Micro Dot · Minimal'],['glass-outline','Clear Glass Outline · Lightweight']].map(([value,label])=>`<option value="${value}" ${(!content.cursorStyle&&value==='gold-ring')||content.cursorStyle===value?'selected':''}>${label}</option>`).join('')}</select>
 <div class="cursor-style-previews" aria-hidden="true">${[['gold-ring','Fine ring'],['gold-orbit','Orbit'],['micro-dot','Micro dot'],['glass-outline','Glass outline']].map(([style,label])=>`<div class="cursor-preview-card"><span class="cursor-preview-icon ${style}"><i></i></span><small>${label}</small></div>`).join('')}</div>
 <small class="setting-help">These designs do not display a filled 64px circle or a View label over content. Text remains visible. Desktop only.</small></div>
 <div class="field"><label>Custom cursor</label><select name="cursorEnabled"><option value="true" ${content.cursorEnabled!=='false'?'selected':''}>Enabled</option><option value="false" ${content.cursorEnabled==='false'?'selected':''}>Disabled</option></select></div>
 <div class="field"><label>Animation intensity</label><select name="animationPreset">${['minimal','elegant','expressive'].map(x=>`<option ${content.animationPreset===x?'selected':''}>${x}</option>`).join('')}</select></div>
 </div></div>
 <div class="editor-actions"><button type="submit" class="pill primary">Save all settings & publish ${ico('check')}</button><a href="/" data-link class="pill secondary">Preview live website ${ico('external-link')}</a></div><p id="globalStatus" role="status"></p></form>`;
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
  table.innerHTML=items.map((x,i)=>`<div class="editable-row"><input data-idx="${i}" data-field="label" aria-label="Menu label" value="${esc(x.label)}" placeholder="Label"><input data-idx="${i}" data-field="url" aria-label="Menu URL" value="${esc(x.url)}" placeholder="/path"><button type="button" data-up="${i}" aria-label="Move up">↑</button><button type="button" data-down="${i}" aria-label="Move down">↓</button><button type="button" data-remove="${i}" aria-label="Remove">×</button></div>`).join('');
  table.querySelectorAll('input').forEach(x=>x.oninput=()=>items[Number(x.dataset.idx)][x.dataset.field]=x.value);
  table.querySelectorAll('button').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.remove??b.dataset.up??b.dataset.down);if(b.hasAttribute('data-remove'))items.splice(i,1);else{const j=b.hasAttribute('data-up')?i-1:i+1;if(j>=0&&j<items.length)[items[i],items[j]]=[items[j],items[i]];}rows()});
 }
 el.innerHTML=`<h3>Navigation Manager</h3><p>Reorder, add, remove or change navigation links. Mobile and desktop share this navigation.</p><div id="menuEdit"></div><div class="editor-actions"><button class="pill secondary" id="addMenu">Add link ${ico('plus')}</button><button class="pill primary" id="saveMenu">Publish menu ${ico('check')}</button></div><p id="navStatus" role="status"></p><h3>Social links</h3><p>Enter a JSON array of <code>{"label":"LinkedIn","url":"https://..."}</code> objects.</p><textarea id="socialJson" class="mono-text">${esc(JSON.stringify(getJSON(content.socials),null,2))}</textarea><button class="pill secondary" id="saveSocial">Save social links</button><p id="socialStatus" role="status"></p>`;
 rows();
 $('#addMenu').onclick=()=>{items.push({label:'New page',url:'/page'});rows()};
 $('#saveMenu').onclick=async()=>{if(!items.every(x=>x.label&&actionURL(x.url)!=='#'))return status('#navStatus','Please enter valid labels and URLs.',true);await saveContent({navigation:JSON.stringify(items)},'#navStatus')};
 $('#saveSocial').onclick=async()=>{try{const x=JSON.parse($('#socialJson').value);if(!Array.isArray(x)||!x.every(t=>t.label&&actionURL(t.url)!=='#'))throw Error('Invalid social links');await saveContent({socials:JSON.stringify(x)},'#socialStatus')}catch(err){status('#socialStatus',err.message,true)}};
}

function drawCollections(el){
 el.innerHTML=`<h3>Featured cards & process steps</h3><p>Edit cards without writing code. These are default cards until you publish dedicated service or industry entries.</p><div class="field"><label>Collection</label><select id="collectionType"><option value="services">Homepage services</option><option value="industries">Industries</option><option value="stats">Hero stats / process</option></select></div><div id="collectionItems"></div><div class="editor-actions"><button id="addCollection" class="pill secondary">Add card ${ico('plus')}</button><button id="saveCollection" class="pill primary">Save cards ${ico('check')}</button></div><p id="collectionStatus" role="status"></p>`;
 let type='services',items=clone(arr(type));
 function renderItems(){
  const fields=type==='stats'?['value','label']:type==='services'?['name','description','icon']:['name','description','icon','tone'];
  $('#collectionItems').innerHTML=items.map((item,i)=>`<div class="builder-block"><div class="builder-head"><strong>Card ${i+1}</strong><button data-remove="${i}" type="button">Remove</button></div><div class="admin-form-grid">${fields.map(key=>`<div class="field"><label>${key}</label><input data-i="${i}" data-k="${key}" value="${esc(item[key]||'')}"></div>`).join('')}</div></div>`).join('');
  document.querySelectorAll('#collectionItems input').forEach(x=>x.oninput=()=>items[+x.dataset.i][x.dataset.k]=x.value);
  document.querySelectorAll('#collectionItems [data-remove]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.remove,1);renderItems()});
 }
 $('#collectionType').onchange=ev=>{type=ev.target.value;items=clone(arr(type));renderItems()};
 $('#addCollection').onclick=()=>{items.push(type==='stats'?{value:'01',label:'New step'}:{name:'New card',description:'Write the description',icon:'sparkles',tone:'peach'});renderItems()};
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
     <div class="product-tab-pane active" id="pane_general">
      <div class="admin-form-grid">
       <div class="field"><label>URL Slug (lowercase & hyphens) *</label><input name="slug" id="entrySlugInput" pattern="[a-z0-9]+(-[a-z0-9]+)*" required value="${esc(item.slug||'')}"></div>
       <div class="field"><label>Product / Item Title *</label><input name="title" id="entryTitleInput" required maxlength="180" value="${esc(item.title||'')}"></div>
       <div class="field"><label>Category / Architecture Family</label><input name="category" value="${esc(item.category||'')}"></div>
       <div class="field"><label>Publishing Status</label><select name="status"><option value="published" ${item.status==='published'?'selected':''}>Published (Live)</option><option value="draft" ${item.status==='draft'?'selected':''}>Draft (Hidden)</option></select></div>
       <div class="field full"><label>Summary / Elevator Pitch</label><textarea name="summary" maxlength="1300" rows="3">${esc(item.summary||'')}</textarea></div>
       <div class="field full"><label>Detailed Overview / Architecture Body</label><textarea name="body" rows="6">${esc(item.body||'')}</textarea></div>
       <div class="field"><label>Technology Stack Tags (comma separated)</label><input name="technology" value="${esc(item.technology||'')}"></div>
       ${!isProduct?`
        <div class="field"><label>Location</label><input name="location" value="${esc(item.location||'')}"></div>
        <div class="field"><label>Job Type</label><input name="job_type" value="${esc(item.job_type||'')}"></div>
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

  // Clear button
  editorContainer.querySelector('#btnClearEntry').onclick=()=>{
   editingRecord=null;
   initEditorForm({type:typeSelect.value,status:'published'});
  };

  // Submit handler
  const saveEntry=async(overrideStatus)=>{
   const f=editorContainer.querySelector('#entryCustomForm');
   const formData=Object.fromEntries(new FormData(f));
   if(overrideStatus)formData.status=overrideStatus;
   formData.type=typeSelect.value;
   formData.image=currentImage;
   formData.gallery=JSON.stringify(currentGallery);
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
 el.innerHTML=`<h3>Visual Page Builder</h3><p>Build editable sections, reorder them and publish. Publishing a page layout replaces its standard page design and goes live instantly.</p><div class="admin-form-grid"><div class="field"><label>Choose page</label><select id="pageSelect">${routesKnown.map(x=>`<option value="${x}">${x==='home'?'/':'/'+x}</option>`).join('')}<option value="custom">+ Create custom page</option></select></div><div class="field"><label>Custom URL slug (when creating)</label><input id="customSlug" placeholder="new-landing-page" disabled></div></div><div class="admin-form-grid"><div class="field"><label>Page title</label><input id="pageTitle" value="Home"></div><div class="field"><label>Publish status</label><select id="pageStatus"><option value="published" selected>Published (Live on Website)</option><option value="draft">Draft (Private / Hidden)</option></select></div><div class="field"><label>SEO title</label><input id="pageSEO"></div><div class="field"><label>SEO description</label><input id="pageDesc"></div></div><div class="editor-actions"><button class="pill secondary" id="starterLayout">Load starter sections</button><button class="pill secondary" id="deleteLayout">Remove custom layout</button></div><div class="builder-heading"><h3>Page sections</h3><div><select id="blockType">${Object.keys(blockSpecs).map(x=>`<option value="${x}">${x}</option>`).join('')}</select><button class="mini-btn" id="addBlock">+ Add section</button></div></div><div id="builderList"></div><div class="editor-actions"><button class="pill primary" id="saveLayout">Publish Live ${ico('rocket')}</button><button class="pill secondary" id="saveDraft">Save Draft ${ico('save')}</button><button class="pill secondary" id="previewLayout">Refresh preview</button></div><p id="builderStatus" role="status"></p><h3>Live section preview</h3><div id="builderPreview" class="builder-preview"></div>`;
 const selector=$('#pageSelect'),slugBox=$('#customSlug');
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
 $('#deleteLayout').onclick=async()=>{if(!builderPage||!confirm('Delete saved custom layout? Default page will appear again.'))return;try{await request('/api/admin/layout','DELETE',{slug:builderPage});builderBlocks=[];layoutCache[builderPage]=null;drawBlockList();refreshPreview();status('#builderStatus','Custom layout removed.');showToast('Layout removed');}catch(err){status('#builderStatus',err.message,true);}};
 $('#addBlock').onclick=()=>{builderBlocks.push(defaultBlock($('#blockType').value));drawBlockList()};
 async function saveBuilder(statusVal){
  if(!builderPage)return status('#builderStatus','Select a page first.',true);
  try{
   await request('/api/admin/layout','PUT',{slug:builderPage,title:$('#pageTitle').value||builderPage,blocks:builderBlocks,status:statusVal,seo_title:$('#pageSEO').value,seo_description:$('#pageDesc').value});
   $('#pageStatus').value=statusVal;
   if(statusVal==='published'){layoutCache[builderPage]={title:$('#pageTitle').value,blocks:clone(builderBlocks)};status('#builderStatus','Saved & published live!');showToast('Layout published live!');}
   else{layoutCache[builderPage]=null;status('#builderStatus','Saved as draft.');showToast('Saved as draft.');}
   refreshPreview();
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
    <div class="builder-head"><strong>${i+1}. ${esc(b.type)}</strong><div class="editor-actions"><button class="mini-btn" data-up="${i}" title="Move up">↑</button><button class="mini-btn" data-down="${i}" title="Move down">↓</button><button class="mini-btn danger" data-del="${i}" title="Delete">Delete</button></div></div>
    <div class="admin-form-grid">${blockSpecs[b.type].map(k=>`
     <div class="field ${['text','description','items'].includes(k)?'full':''}">
      <label>${esc(k==='items'?'Items (one per line; separate fields with |)':k)}</label>
      ${k==='image'?`
       <div style="display:flex;gap:8px;align-items:center;">
        <input data-i="${i}" data-k="${k}" value="${esc(b[k]||'')}" placeholder="/media/..." style="flex:1;">
        <button type="button" class="mini-btn" data-pick-block-img="${i}">${ico('image')} Choose</button>
       </div>
      `:k==='items'||['text','description'].includes(k)?`<textarea data-i="${i}" data-k="${k}">${esc(k==='items'?itemsAsText(b):b[k]||'')}</textarea>`:k==='collection'?`<select data-i="${i}" data-k="${k}">${['services','industries','products','projects','blog','careers'].map(v=>`<option value="${v}" ${b.collection===v?'selected':''}>${v}</option>`).join('')}</select>`:k==='align'?`<select data-i="${i}" data-k="${k}"><option value="normal">Text left</option><option value="reverse" ${b.align==='reverse'?'selected':''}>Image left</option></select>`:`<input data-i="${i}" data-k="${k}" value="${esc(b[k]||'')}">`}
     </div>
    `).join('')}</div>
   </div>
  `).join('');
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
  list.querySelectorAll('button[data-del],button[data-up],button[data-down]').forEach(b=>b.onclick=()=>{const i=+(b.dataset.del??b.dataset.up??b.dataset.down);if(b.hasAttribute('data-del'))builderBlocks.splice(i,1);else{const next=b.hasAttribute('data-up')?i-1:i+1;if(next>=0&&next<builderBlocks.length)[builderBlocks[i],builderBlocks[next]]=[builderBlocks[next],builderBlocks[i]];}drawBlockList()});
  refreshPreview();
 }
 loadPage();
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
 el.innerHTML='<h3>Contact Enquiries</h3><p>Track incoming enquiries and add private administrative notes.</p><div class="scroll" id="inquiriesTable">Loading…</div>';
 try{
  const rows=await request('/api/admin/inquiries');
  $('#inquiriesTable').innerHTML=`<table><thead><tr><th>Submitted</th><th>Contact</th><th>Message</th><th>Status & Notes</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.created_at)}</td><td><strong>${esc(x.name)}</strong><br><a href="mailto:${esc(x.email)}">${esc(x.email)}</a><br>${esc(x.company)}<br>${esc(x.service)}</td><td class="long-cell">${esc(x.message)}</td><td><select data-status="${x.id}">${['new','in-progress','replied','closed'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select><textarea data-notes="${x.id}" placeholder="Internal notes">${esc(x.notes)}</textarea><button class="mini-btn" data-save="${x.id}">Save</button>${me.role==='admin'?`<button class="mini-btn danger" data-inquiry-delete="${x.id}">Delete</button>`:''}<small class="admin-feedback" data-result="${x.id}"></small></td></tr>`).join('')}</tbody></table>`;
  $('#inquiriesTable').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
   const id=b.dataset.save;
   try{await request('/api/admin/inquiries','PATCH',{id:+id,status:document.querySelector(`[data-status="${id}"]`).value,notes:document.querySelector(`[data-notes="${id}"]`).value});document.querySelector(`[data-result="${id}"]`).textContent='Saved';showToast('Enquiry updated!');}
   catch(err){document.querySelector(`[data-result="${id}"]`).textContent=err.message;}
  });
  $('#inquiriesTable').querySelectorAll('[data-inquiry-delete]').forEach(b=>b.onclick=async()=>{
   if(!confirm('Permanently delete this enquiry?'))return;
   try{await request('/api/admin/inquiries','DELETE',{id:+b.dataset.inquiryDelete});drawInquiries(el);showToast('Enquiry deleted');}
   catch(err){showToast(err.message,true);}
  });
 }catch(err){$('#inquiriesTable').textContent=err.message;}
}

async function drawApplications(el){
 el.innerHTML='<h3>Job Applications</h3><p>Private applicant data. Résumé downloads require a signed-in account with editor permissions.</p><div class="scroll" id="applicantsTable">Loading…</div>';
 try{
  const rows=await request('/api/admin/applications');
  $('#applicantsTable').innerHTML=`<table><thead><tr><th>Date / Role</th><th>Applicant</th><th>Note / Resume</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.created_at)}<br><b>${esc(x.job_slug)}</b></td><td>${esc(x.name)}<br><a href="mailto:${esc(x.email)}">${esc(x.email)}</a><br>${esc(x.portfolio)}</td><td>${esc(x.message)}${x.resume_filename?`<br><a href="/api/admin/resume?id=${x.id}" target="_blank">Download résumé PDF</a>`:''}</td><td><select data-status="${x.id}">${['new','review','interview','rejected','hired'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select><button class="mini-btn" data-save="${x.id}">Update</button>${me.role==='admin'?`<button class="mini-btn danger" data-application-delete="${x.id}">Delete</button>`:''}<small data-result="${x.id}"></small></td></tr>`).join('')}</tbody></table>`;
  $('#applicantsTable').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
   const id=b.dataset.save;
   try{await request('/api/admin/applications','PATCH',{id:+id,status:document.querySelector(`[data-status="${id}"]`).value});document.querySelector(`[data-result="${id}"]`).textContent='Saved';showToast('Status saved!');}
   catch(err){document.querySelector(`[data-result="${id}"]`).textContent=err.message;}
  });
  $('#applicantsTable').querySelectorAll('[data-application-delete]').forEach(b=>b.onclick=async()=>{
   if(!confirm('Permanently delete this application and its resume?'))return;
   try{await request('/api/admin/applications','DELETE',{id:+b.dataset.applicationDelete});drawApplications(el);showToast('Application deleted');}
   catch(err){showToast(err.message,true);}
  });
 }catch(err){$('#applicantsTable').textContent=err.message;}
}

async function drawUsers(el){
 el.innerHTML=`<h3>Admin Users & Permissions</h3><p>Roles: Admin manages the entire CMS, Editor publishes content, Viewer has read-only access.</p><div id="usersTable" class="scroll">Loading…</div><h3>Invite a new admin team member</h3><form id="newUserForm"><div class="admin-form-grid"><div class="field"><label>Email</label><input type="email" name="email" required></div><div class="field"><label>Temporary password (16+ characters)</label><input type="password" name="password" required minlength="16"></div><div class="field"><label>Role</label><select name="role"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></div></div><button class="pill primary">Create user</button><p id="userStatus" role="status"></p></form><h3>Change your password</h3><form id="passwordForm"><div class="admin-form-grid"><div class="field"><label>Current password</label><input type="password" name="current" required></div><div class="field"><label>New password (16+ characters)</label><input type="password" name="next" minlength="16" required></div></div><button class="pill secondary">Update password</button><p id="passwordStatus" role="status"></p></form>`;
 async function listing(){
  try{
   const rows=await request('/api/admin/users');
   $('#usersTable').innerHTML=`<table><thead><tr><th>Email</th><th>Role</th><th>Active</th><th>Manage</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.email)}</td><td><select data-role="${x.id}">${['viewer','editor','admin'].map(v=>`<option value="${v}" ${x.role===v?'selected':''}>${v}</option>`).join('')}</select></td><td><input data-active="${x.id}" type="checkbox" ${x.active?'checked':''}></td><td><button class="mini-btn" data-save="${x.id}">Save</button><small data-result="${x.id}"></small></td></tr>`).join('')}</tbody></table>`;
   $('#usersTable').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.save;
    try{await request('/api/admin/users','PATCH',{id:+id,role:document.querySelector(`[data-role="${id}"]`).value,active:document.querySelector(`[data-active="${id}"]`).checked});document.querySelector(`[data-result="${id}"]`).textContent='Saved';showToast('User updated');listing();}
    catch(err){document.querySelector(`[data-result="${id}"]`).textContent=err.message;}
   });
  }catch(err){$('#usersTable').textContent=err.message;}
 }
 $('#newUserForm').onsubmit=async ev=>{
  ev.preventDefault();
  try{await request('/api/admin/users','POST',Object.fromEntries(new FormData(ev.currentTarget)));status('#userStatus','User created successfully.');ev.currentTarget.reset();listing();showToast('New user invited!');}
  catch(err){status('#userStatus',err.message,true);}
 };
 $('#passwordForm').onsubmit=async ev=>{
  ev.preventDefault();
  try{await request('/api/admin/password','POST',Object.fromEntries(new FormData(ev.currentTarget)));status('#passwordStatus','Password updated.');ev.currentTarget.reset();showToast('Password updated!');}
  catch(err){status('#passwordStatus',err.message,true);}
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
