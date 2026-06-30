const fs=require('fs');const path=require('path');const crypto=require('crypto');
const ROOT=path.resolve('local-copy');
function md5(s){return crypto.createHash('md5').update(s).digest('hex').slice(0,10)}
function rel(from,to){return path.relative(path.dirname(from),to).replace(/\\/g,'/')}
function pagePath(u){const x=new URL(u);return path.join(ROOT,x.pathname.replace(/^\/+|\/+$/g,''),'index.html')}
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'export-manifest.json'),'utf8'));
const staff=(manifest.pages||[]).map(p=>p.url).filter(u=>/(\/audiologist\/|\/hearing-instrument-specialist|\/patient-care-coordinator\/|\/audiology-assistant\/)/.test(u));
const map=[];
for(const u0 of staff){const u=u0.endsWith('/')?u0:u0+'/';const x=new URL(u);const slug=x.pathname.split('/').filter(Boolean).pop();
 const h1=md5(x.origin+x.pathname); const h2=md5(x.origin+x.pathname.replace(/\/$/,''));
 map.push({from:`assets/other/${slug}-${h1}`,to:u}); map.push({from:`assets/other/${slug}-${h2}`,to:u});
}
const files=[];(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.html'))files.push(p)}})(ROOT);
let patched=0;
for(const f of files){let t=fs.readFileSync(f,'utf8');let ch=false;for(const m of map){let r=rel(f,pagePath(m.to));if(r.endsWith('index.html'))r=r.slice(0,-10);if(!r)r='./';if(!r.endsWith('/'))r+='/';
const esc=m.from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const re=new RegExp(`(?:\.\.\/|\.\/)?${esc}`,'g');if(re.test(t)){t=t.replace(re,r);ch=true;}}
if(ch){fs.writeFileSync(f,t,'utf8');patched++;}}
console.log(`patched=${patched}`);
