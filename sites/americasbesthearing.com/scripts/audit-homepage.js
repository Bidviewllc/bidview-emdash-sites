const { chromium } = require('playwright');
const urls = {
  local: 'http://127.0.0.1:4173/index.html',
  live: 'https://americasbesthearing.com/'
};
const sections=['b4c8e33','6e2ff94','dd08e84','e992fea','314368ad','68060980','5fd9ea80','58eb8d9e'];
(async()=>{
 const browser=await chromium.launch({headless:true});
 for (const [name,url] of Object.entries(urls)) {
   const page=await browser.newPage({viewport:{width:1366,height:1200}});
   try {
     await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
     await page.waitForTimeout(2500);
     console.log('\n==',name,url,'==');
     console.log('title',await page.title());
     console.log('locText',await page.locator('text=/Locations in Michigan/').first().textContent().catch(e=>'missing'));
     console.log('header',await page.locator('header').first().evaluate(el=>getComputedStyle(el).position).catch(e=>'missing'));
     for (const id of sections) {
       const sel = name==='live' ? `.elementor-element-${id}` : `.astro-element-${id}`;
       const count=await page.locator(sel).count();
       if(!count){ console.log(id,'missing'); continue; }
       const info=await page.locator(sel).first().evaluate(el=>{
         const cs=getComputedStyle(el);
         const r=el.getBoundingClientRect();
         const sw=el.querySelectorAll('.swiper-slide').length;
         const tabs=el.querySelectorAll('[role="tab"], .e-n-tab-title').length;
         const panels=el.querySelectorAll('[role="tabpanel"], [id*="tab-content"]').length;
         const details=el.querySelectorAll('details').length;
         const imgs=[...el.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'), display:getComputedStyle(i).display, opacity:getComputedStyle(i).opacity, w:i.getBoundingClientRect().width, h:i.getBoundingClientRect().height})).slice(0,8);
         return {classes:el.className, display:cs.display, opacity:cs.opacity, visibility:cs.visibility, rect:{w:r.width,h:r.height,top:r.top}, slides:sw,tabs,panels,details,imgs};
       });
       console.log(id, JSON.stringify(info));
     }
   } catch(e) {
     console.log('\n==',name,url,'FAILED ==');
     console.log(e.message);
   } finally { await page.close(); }
 }
 await browser.close();
})();
