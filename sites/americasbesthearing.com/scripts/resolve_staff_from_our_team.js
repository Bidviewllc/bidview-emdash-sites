const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { load } = require('cheerio');

const ROOT = path.resolve('local-copy');
const html = fs.readFileSync(path.join(ROOT,'our-team','index.html'),'utf8');
const slugs = [...new Set([...html.matchAll(/assets\/other\/([a-z0-9-]+)-[a-f0-9]{10}/g)].map(m=>m[1]))];

async function fetchText(u){ const r=await fetch(u,{headers:{'user-agent':'local-copy-exporter/1.0'}}); if(!r.ok) return ''; return await r.text(); }
function norm(u){ const x=new URL(u); x.hash=''; x.search=''; if(x.pathname!=='/'&&x.pathname.endsWith('/')) x.pathname=x.pathname.slice(0,-1); return x.toString(); }
function pagePath(u){ const x=new URL(u); if(x.pathname==='/') return path.join(ROOT,'index.html'); return path.join(ROOT,x.pathname.replace(/^\/+|\/+$/g,''),'index.html'); }
function rel(from,to){ return path.relative(path.dirname(from),to).replace(/\\/g,'/'); }

(async()=>{
  const live = await fetchText('https://americasbesthearing.com/our-team/');
  const urls = [...new Set([...(live.match(/https?:\/\/(?:www\.)?americasbesthearing\.com\/[^"'\s<>]+/g)||[])
    .filter(u=>!u.includes('/wp-content/')&&!u.includes('/wp-json/')&&!u.includes('/feed')&&!u.includes('/author/'))
    .filter(u=>u.split('/').filter(Boolean).length>=4)])].map(norm);

  const bySlug = new Map();
  for (const u of urls){
    const slug = new URL(u).pathname.split('/').filter(Boolean).pop();
    if (!slug) continue;
    bySlug.set(slug, u);
  }

  let created=0;
  for (const [slug,u] of bySlug){
    const fp = pagePath(u);
    if (!fs.existsSync(fp)) {
      const r = await fetch(u,{headers:{'user-agent':'local-copy-exporter/1.0'}});
      if (!r.ok) continue;
      const t = await r.text();
      fs.mkdirSync(path.dirname(fp),{recursive:true});
      fs.writeFileSync(fp,t,'utf8');
      created++;
    }
  }

  const files = [];
  (function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(p.endsWith('.html')) files.push(p); } })(ROOT);

  let patched=0;
  for (const f of files){
    let t = fs.readFileSync(f,'utf8');
    let ch=false;
    for (const slug of slugs){
      const u = bySlug.get(slug);
      if(!u) continue;
      const pseudo = `assets/other/${slug}-${crypto.createHash('md5').update(new URL(u).origin + new URL(u).pathname.replace(/\/$/, '')).digest('hex').slice(0,10)}`;
      let r = rel(f,pagePath(u)); if(r.endsWith('index.html')) r=r.slice(0,-10); if(!r) r='./'; if(!r.endsWith('/')) r+='/';
      const re = new RegExp(`(?:\.\.\/|\.\/)?${pseudo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'g');
      if (re.test(t)){ t=t.replace(re,r); ch=true; }
    }
    if(ch){ fs.writeFileSync(f,t,'utf8'); patched++; }
  }

  console.log(`slugs=${slugs.length} liveProfiles=${bySlug.size} created=${created} patchedFiles=${patched}`);
})();
