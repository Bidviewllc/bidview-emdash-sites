const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const root = path.resolve('local-copy');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'export-manifest.json'),'utf8'));
const shotDir = path.resolve('local-copy-qa');
fs.mkdirSync(shotDir,{recursive:true});

const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p='/index.html';
  let file = path.join(root,p);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  if (!fs.existsSync(file) && !path.extname(file)) file = path.join(file,'index.html');
  if (!fs.existsSync(file)) {res.statusCode=404;res.end('not found');return;}
  const ext = path.extname(file).toLowerCase();
  res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});

server.listen(4173,'127.0.0.1', async ()=>{
  const browser = await chromium.launch({headless:true});
  const pages = manifest.pages.map(u=>new URL(u).pathname);
  const viewports = [
    {name:'desktop-1440',w:1440,h:2600},
    {name:'desktop-1280',w:1280,h:2400},
    {name:'tablet-768',w:768,h:2200},
    {name:'mobile-375',w:375,h:2200},
  ];

  for (const route of pages){
    const slug = route === '/' ? 'home' : route.replace(/^\//,'').replace(/\/$/,'').replace(/[\/]+/g,'__');
    for (const vp of viewports){
      const context = await browser.newContext({viewport:{width:vp.w,height:vp.h}});
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4173${route}`, {waitUntil:'networkidle', timeout:120000});
      await page.screenshot({path:path.join(shotDir,`${slug}--${vp.name}.png`), fullPage:true});
      await context.close();
      console.log('shot', route, vp.name);
    }
  }

  await browser.close();
  server.close();
  console.log('screenshots done');
});
