const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { load } = require('cheerio');

const ROOT = path.resolve('local-copy');
const ASSETS = path.join(ROOT, 'assets');
const DIRS = {
  media: path.join(ASSETS, 'media'),
  styles: path.join(ASSETS, 'styles'),
  js: path.join(ASSETS, 'js'),
  fonts: path.join(ASSETS, 'fonts'),
  other: path.join(ASSETS, 'other'),
};
for (const d of Object.values(DIRS)) fs.mkdirSync(d, { recursive: true });

function md5(s){return crypto.createHash('md5').update(s).digest('hex').slice(0,10)}
function norm(u){ const x = new URL(u); x.hash=''; x.search=''; if (x.pathname !== '/' && x.pathname.endsWith('/')) x.pathname = x.pathname.slice(0,-1); x.hostname=x.hostname.toLowerCase(); return x.toString(); }
function internal(u){ const h=new URL(u).hostname.toLowerCase(); return h==='americasbesthearing.com'||h==='www.americasbesthearing.com'; }
function pagePath(u){ const x=new URL(u); if(x.pathname==='/') return path.join(ROOT,'index.html'); return path.join(ROOT, x.pathname.replace(/^\/+|\/+$/g,''), 'index.html'); }
function rel(from,to){ return path.relative(path.dirname(from),to).replace(/\\/g,'/'); }
function astroClean(s){ return s ? s.replace(/^wp-/,'astro-').replace(/wp_/g,'astro_').replace(/elementor/g,'astro') : s; }
function pickDir(assetUrl){ const ext=path.extname(new URL(assetUrl).pathname).toLowerCase(); if(['.png','.jpg','.jpeg','.gif','.svg','.webp','.avif','.ico'].includes(ext)) return DIRS.media; if(ext==='.css') return DIRS.styles; if(['.js','.mjs'].includes(ext)) return DIRS.js; if(['.woff','.woff2','.ttf','.otf','.eot'].includes(ext)) return DIRS.fonts; return DIRS.other; }
function fileForAsset(assetUrl){ const u=new URL(assetUrl); const base=path.basename(u.pathname)||'file'; const ext=path.extname(base); const stem=path.basename(base,ext).replace(/[^a-zA-Z0-9._-]/g,'-')||'file'; return path.join(pickDir(assetUrl), `${stem}-${md5(u.origin+u.pathname)}${ext}`); }

async function fetchText(u){ const r=await fetch(u,{headers:{'user-agent':'local-copy-exporter/1.0'}}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return {text:await r.text(), type:r.headers.get('content-type')||''}; }
async function fetchBin(u){ try{ const r=await fetch(u,{headers:{'user-agent':'local-copy-exporter/1.0'}}); if(!r.ok) return; const fp=fileForAsset(u); if(fs.existsSync(fp)) return; fs.writeFileSync(fp, Buffer.from(await r.arrayBuffer())); }catch{} }

async function discoverStaff(){
  const seeds = [
    'https://americasbesthearing.com/our-team/',
    'https://americasbesthearing.com/all-locations/'
  ];
  const out = new Set();
  const rx = /https?:\/\/(?:www\.)?americasbesthearing\.com\/[^"'\s<>]+/g;
  for (const s of seeds){
    const {text} = await fetchText(s);
    for (const m of text.match(rx) || []) {
      const u = norm(m);
      const p = new URL(u).pathname;
      if (p.includes('/wp-content/') || p.includes('/wp-json/') || p.includes('/feed') || p.includes('/author/')) continue;
      const segs = p.split('/').filter(Boolean);
      if (segs.length === 2 && segs[0] !== 'category' && segs[0] !== 'tag' && segs[0] !== 'location') out.add(u);
    }
  }
  return [...out].sort();
}

async function localizePage(u){
  const {text,type} = await fetchText(u);
  if(!type.includes('text/html')) return false;
  const $ = load(text, { decodeEntities:false });
  const out = pagePath(u);
  fs.mkdirSync(path.dirname(out), { recursive:true });

  $('script[src]').each((_,el)=>{const src=($(el).attr('src')||'').toLowerCase(); if(src.includes('wp-json')||src.includes('elementor')||src.includes('wp-content/plugins')||src.includes('emoji')||src.includes('jetpack')||src.includes('wpcf7')) $(el).remove();});

  for (const el of $('a[href]').toArray()) {
    const href=$(el).attr('href'); if(!href) continue; let abs; try{abs=norm(new URL(href,u).toString())}catch{continue}
    if(!internal(abs)) continue;
    const p = new URL(abs).pathname;
    if (/\/(hearing-instrument-specialist(?:-trainee)?|audiologist)\//i.test(p) || fs.existsSync(pagePath(abs))) {
      let r = rel(out, pagePath(abs));
      if (r.endsWith('index.html')) r = r.slice(0,-10);
      if (!r) r='./';
      if (!r.endsWith('/')) r+='/';
      $(el).attr('href', r);
    } else {
      await fetchBin(abs);
      $(el).attr('href', rel(out, fileForAsset(abs)));
    }
  }

  for (const tag of ['img','source','script','video','audio','iframe']) {
    for (const el of $(`${tag}[src]`).toArray()){
      const v=$(el).attr('src'); if(!v) continue; let abs; try{abs=norm(new URL(v,u).toString())}catch{continue}
      if(!internal(abs)) continue; await fetchBin(abs); $(el).attr('src', rel(out,fileForAsset(abs)));
    }
  }

  for (const el of $('link[href]').toArray()) {
    const v=$(el).attr('href'); if(!v) continue; let abs; try{abs=norm(new URL(v,u).toString())}catch{continue}
    if(!internal(abs)) continue; await fetchBin(abs); $(el).attr('href', rel(out,fileForAsset(abs)));
  }

  for (const el of $('[srcset]').toArray()) {
    const items = (($(el).attr('srcset')||'').split(',').map(x=>x.trim()).filter(Boolean));
    const outItems=[];
    for (const it of items){ const b=it.split(/\s+/); let abs; try{abs=norm(new URL(b[0],u).toString())}catch{outItems.push(it);continue}
      if(internal(abs)){ await fetchBin(abs); b[0]=rel(out,fileForAsset(abs)); }
      outItems.push(b.join(' '));
    }
    $(el).attr('srcset', outItems.join(', '));
  }

  for (const form of $('form').toArray()){ $(form).attr('action','javascript:void(0)'); $(form).attr('method','get'); $(form).attr('onsubmit','return false;'); }

  $('*').each((_,el)=>{
    const cls=(($(el).attr('class')||'').split(/\s+/).filter(Boolean).map(astroClean)); if(cls.length) $(el).attr('class',cls.join(' '));
    const id=$(el).attr('id'); if(id) $(el).attr('id',astroClean(id));
    const attrs = el.attribs || {};
    for (const k of Object.keys(attrs)){ let nk=k; if(nk.includes('elementor')) nk=nk.replace(/elementor/g,'astro'); if(nk.startsWith('data-wp-')) nk=nk.replace(/^data-wp-/,'data-astro-'); if(nk!==k){ const vv=$(el).attr(k); $(el).removeAttr(k); $(el).attr(nk,vv);} }
  });

  fs.writeFileSync(out, $.html(), 'utf8');
  return true;
}

function walk(dir,out=[]){ for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else out.push(p);} return out; }

(async()=>{
  const staff = await discoverStaff();
  let created = 0;
  for (const u of staff){
    const ok = await localizePage(u);
    if (ok) created++;
  }

  const map = new Map();
  for (const u of staff){
    const x = new URL(u);
    const slug = x.pathname.split('/').filter(Boolean).pop();
    const pseudo = `assets/other/${slug}-${md5(x.origin + x.pathname.replace(/\/$/,''))}`;
    map.set(pseudo, u);
  }

  const htmls = walk(ROOT).filter(f=>f.endsWith('.html'));
  for (const f of htmls){
    let t = fs.readFileSync(f,'utf8');
    let changed = false;
    for (const [pseudo,u] of map.entries()){
      const target = pagePath(u);
      let r = rel(f,target); if(r.endsWith('index.html')) r=r.slice(0,-10); if(!r) r='./'; if(!r.endsWith('/')) r+='/';
      const esc = pseudo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re = new RegExp(`(?:\.\.\/|\.\/)?${esc}`,'g');
      if (re.test(t)) { t = t.replace(re, r); changed = true; }
    }
    if (changed) fs.writeFileSync(f,t,'utf8');
  }

  // update manifest
  const mPath = path.join(ROOT,'export-manifest.json');
  let m = { base:'https://americasbesthearing.com/', pages:[] };
  if (fs.existsSync(mPath)) m = JSON.parse(fs.readFileSync(mPath,'utf8'));
  const existing = new Set((m.pages||[]).map(p=>p.url.replace(/\/$/,'')));
  for (const u of staff){
    const n = u.replace(/\/$/,'');
    if (!existing.has(n) && fs.existsSync(pagePath(u))) {
      (m.pages ||= []).push({ url:n, file:path.relative(ROOT,pagePath(u)).replace(/\\/g,'/') });
    }
  }
  m.page_count = (m.pages||[]).length;
  m.discovered_page_count = Math.max(m.discovered_page_count||0, m.page_count);
  fs.writeFileSync(mPath, JSON.stringify(m,null,2));

  console.log(`staff_found=${staff.length} staff_created=${created}`);
})();
