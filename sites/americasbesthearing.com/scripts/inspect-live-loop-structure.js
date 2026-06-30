const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true});
 const p=await b.newPage({viewport:{width:1366,height:900}});
 await p.goto('https://americasbesthearing.com/',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForTimeout(2500);
 const data=await p.evaluate(()=>{
   const root=document.querySelector('.elementor-element-3df0900');
   const viewport=root.querySelector('.swiper');
   const track=root.querySelector('.swiper-wrapper');
   const firstSlides=[...root.querySelectorAll('.swiper-slide')].slice(0,8).map((s,i)=>({
     i,
     cls:s.className,
     style:s.getAttribute('style'),
     title:s.querySelector('.elementor-heading-title')?.textContent.trim(),
     aria:s.getAttribute('aria-label')
   }));
   return {
     viewportClass: viewport?.className,
     viewportStyle: viewport?.getAttribute('style'),
     trackClass: track?.className,
     trackStyle: track?.getAttribute('style'),
     slides:firstSlides,
     paginationClass: root.querySelector('.swiper-pagination')?.className,
     prevClass: root.querySelector('.elementor-swiper-button-prev')?.className,
     nextClass: root.querySelector('.elementor-swiper-button-next')?.className
   };
 });
 console.log(JSON.stringify(data,null,2));
 await b.close();
})();
