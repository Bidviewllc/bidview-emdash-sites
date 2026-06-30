const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const root = process.cwd();
const seedPath = path.join(root, 'seed', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const serviceDefs = [
  { slug: 'audiology-services', title: 'Audiology Services', route_path: 'http://localhost:4321/audiology-services/', raw: 'audiology-services', page: 'src/pages/audiology-services/index.astro' },
  { slug: 'ear-wax-removal', title: 'Ear Wax Removal', route_path: 'http://localhost:4321/audiology-services/ear-wax-removal/', raw: 'audiology-services__ear-wax-removal', page: 'src/pages/audiology-services/ear-wax-removal/index.astro' },
  { slug: 'hearing-aid-fittings', title: 'Hearing Aid Fittings', route_path: 'http://localhost:4321/audiology-services/hearing-aid-fittings/', raw: 'audiology-services__hearing-aid-fittings', page: 'src/pages/audiology-services/hearing-aid-fittings/index.astro' },
  { slug: 'hearing-aid-services', title: 'Hearing Aid Services', route_path: 'http://localhost:4321/audiology-services/hearing-aid-services/', raw: 'audiology-services__hearing-aid-services', page: 'src/pages/audiology-services/hearing-aid-services/index.astro' },
  { slug: 'hearing-tests', title: 'Hearing Tests', route_path: 'http://localhost:4321/audiology-services/hearing-tests/', raw: 'audiology-services__hearing-tests', page: 'src/pages/audiology-services/hearing-tests/index.astro' },
  { slug: 'custom-hearing-protection', title: 'Custom Hearing Protection', route_path: 'http://localhost:4321/custom-hearing-protection/', raw: 'custom-hearing-protection', page: 'src/pages/custom-hearing-protection/index.astro' },
  { slug: 'hearing-aids-products', title: 'Hearing Aids & Products', route_path: 'http://localhost:4321/hearing-aids-products/', raw: 'hearing-aids-products', page: 'src/pages/hearing-aids-products/index.astro' },
  { slug: 'hearing-aid-batteries', title: 'Hearing Aid Batteries', route_path: 'http://localhost:4321/hearing-aids-products/hearing-aid-batteries/', raw: 'hearing-aids-products__hearing-aid-batteries', page: 'src/pages/hearing-aids-products/hearing-aid-batteries/index.astro' },
  { slug: 'assistive-listening-devices', title: 'Assistive Listening Devices', route_path: 'http://localhost:4321/hearing-aids-products/hearing-aid-alternatives/', raw: 'hearing-aids-products__hearing-aid-alternatives', page: 'src/pages/hearing-aids-products/hearing-aid-alternatives/index.astro' },
];

const collection = {
  slug: 'service_pages',
  label: 'Service Pages',
  labelSingular: 'Service Page',
  supports: ['drafts','revisions','search','seo'],
  fields: [
    { slug: 'title', label: 'Admin Title', type: 'string', required: true, searchable: true },
    { slug: 'service_title', label: 'Service Title / H1', type: 'string', searchable: true },
    { slug: 'route_path', label: 'Route Path', type: 'url', required: true },
    { slug: 'page_title', label: 'Page Title', type: 'string' },
    { slug: 'meta_description', label: 'Meta Description', type: 'text' },
    { slug: 'intro_content', label: 'Intro Content', type: 'portableText', searchable: true },
    { slug: 'content_blocks', label: 'Content Blocks', type: 'repeater', searchable: true, validation: { subFields: [
      { slug: 'block_type', label: 'Block Type', type: 'select', required: true, options: ['heading','body','accordion_item'] },
      { slug: 'heading_level', label: 'Heading Level', type: 'select', options: ['h2','h3','h4'] },
      { slug: 'heading_text', label: 'Heading Text', type: 'string' },
      { slug: 'body_content', label: 'Body Content', type: 'text' },
      { slug: 'accordion_title', label: 'Accordion Title', type: 'string' },
      { slug: 'accordion_body', label: 'Accordion Body', type: 'text' },
    ]}},
    { slug: 'sort_order', label: 'Sort Order', type: 'integer' },
  ],
};

function id(){ return crypto.randomUUID().replace(/-/g,'').slice(0,26).toUpperCase(); }
function columnType(field){ if(field.type==='integer'||field.type==='boolean') return 'INTEGER'; if(field.type==='number') return 'REAL'; if(['multiSelect','portableText','json','repeater'].includes(field.type)) return 'JSON'; return 'TEXT'; }
function norm(v){ if(v==null) return null; return typeof v==='string'?v:JSON.stringify(v); }
function key(){ return Math.random().toString(36).slice(2,10); }
function htmlToPortableText(html){ const $=cheerio.load(`<root>${html||''}</root>`,{decodeEntities:false}); const blocks=[]; $('root').children().each((i,e)=>{const txt=$(e).text().replace(/\s+/g,' ').trim(); if(!txt) return; const tag=e.tagName?.toLowerCase(); blocks.push({_type:'block',style:/^h[2-4]$/.test(tag)?tag:'normal',_key:key(),children:[{_type:'span',text:txt,_key:key()}]});}); return blocks.length?blocks:null; }
function findContentContainer($){ const candidates=$('[data-id]').map((i,e)=>{ const el=$(e); const direct=el.children('.astro-element').filter((_,c)=>$(c).is('.astro-widget-text-editor,.astro-widget-n-accordion,.astro-widget-divider--view-line')).length; const txt=el.text().replace(/\s+/g,' ').trim(); return {el,id:el.attr('data-id'),direct,len:txt.length,toc:txt.includes('Table of Contents'),news:txt.includes('Recent News & Articles'),h1:txt.includes('Home »')}; }).get().filter(x=>x.direct>=3&&!x.toc&&!x.news&&!x.h1).sort((a,b)=>b.direct-a.direct||b.len-a.len); return candidates[0] ? $(candidates[0].el) : $(); }
function extractAccordionBlocks($, widget){ const blocks=[]; widget.find('.e-n-accordion-item').each((i,detail)=>{ const item=$(detail); const titleEl=item.find('.e-n-accordion-item-title-text').first(); const tag=(titleEl.prop('tagName')||'h3').toLowerCase(); const bodyHtml=item.find('[role="region"] .astro-widget-text-editor .astro-widget-container').first().html() || ''; blocks.push({block_type:'accordion_item', heading_level: tag, accordion_title:titleEl.text().replace(/\s+/g,' ').trim(), accordion_body: bodyHtml}); }); return blocks; }
function extractFromRaw(raw){ const rawPath=path.join(root,'src','components','raw-pages',`${raw}.html`); const $=cheerio.load(fs.readFileSync(rawPath,'utf8'),{decodeEntities:false}); const h1=$('h1.astro-heading-title').first().text().replace(/\s+/g,' ').trim(); const content=findContentContainer($); const containerId=content.attr('data-id')||''; const blocks=[]; let intro=null; content.children('.astro-element').each((i,el)=>{ const item=$(el); if(item.hasClass('astro-widget-divider--view-line')) return; if(item.hasClass('astro-widget-n-accordion')) { blocks.push(...extractAccordionBlocks($, item)); return; } if(!item.hasClass('astro-widget-text-editor')) return; const inner=item.find('> .astro-widget-container').first(); const children=inner.children().toArray(); if(!children.length) return; const firstTag=(children[0].tagName||'').toLowerCase(); if(!intro && !/^h[2-4]$/.test(firstTag)){ intro=htmlToPortableText(inner.html()); return; } let trailing=[]; children.forEach((child)=>{ const tag=(child.tagName||'').toLowerCase(); const html=$.html(child); const text=$(child).text().replace(/\s+/g,' ').trim(); if(!text) return; if(/^h[2-4]$/.test(tag)){ if(trailing.length) { blocks.push({block_type:'body', body_content: trailing.join('')}); trailing=[]; } blocks.push({block_type:'heading', heading_level:tag, heading_text:text}); } else trailing.push(html); }); if(trailing.length) blocks.push({block_type:'body', body_content: trailing.join('')}); }); return {h1, containerId, intro, blocks}; }
function ensureSeed(){ const idx=seed.collections.findIndex(c=>c.slug===collection.slug); if(idx>=0) seed.collections[idx]=collection; else seed.collections.push(collection); seed.content ||= {}; const existing=new Map((seed.content.service_pages||[]).map(i=>[i.slug||i.id,i])); seed.content.service_pages=serviceDefs.map((def,index)=>{ const ex=existing.get(def.slug)||{}; const exd=ex.data||{}; const parsed=extractFromRaw(def.raw); return {id:def.slug, slug:def.slug, status:'published', data:{ title:exd.title||`${def.title} Service Page`, service_title:exd.service_title||parsed.h1||def.title, route_path:exd.route_path||def.route_path, page_title:exd.page_title||`${def.title} | America's Best Hearing`, meta_description:exd.meta_description||`${def.title} at America's Best Hearing.`, intro_content:exd.intro_content||parsed.intro, content_blocks:exd.content_blocks||parsed.blocks, sort_order:exd.sort_order||index+1 }}; }); fs.writeFileSync(seedPath, JSON.stringify(seed,null,2)+'\n'); }
function dbPaths(){ const paths=[path.join(root,'data.db')]; const d=path.join(root,'.wrangler','state','v3','d1','miniflare-D1DatabaseObject'); if(fs.existsSync(d)) for(const f of fs.readdirSync(d)) if(f.endsWith('.sqlite')&&f!=='metadata.sqlite') paths.push(path.join(d,f)); return paths.filter(fs.existsSync); }
function tableExists(db,t){return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t)}
function colExists(db,t,c){return db.prepare(`PRAGMA table_info("${t}")`).all().some(x=>x.name===c)}
function ensureColumn(db,t,f){if(!colExists(db,t,f.slug)) db.exec(`ALTER TABLE "${t}" ADD COLUMN "${f.slug}" ${columnType(f)}`)}
function configureDb(dbPath){ const db=new Database(dbPath); const table='ec_service_pages'; const tx=db.transaction(()=>{ let row=db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(collection.slug); const cid=row?.id||id(); if(!row) db.prepare(`INSERT INTO _emdash_collections (id, slug, label, label_singular, description, icon, supports, source, created_at, updated_at, search_config, has_seo, url_pattern, comments_enabled, comments_moderation, comments_closed_after_days, comments_auto_approve_users) VALUES (@id,@slug,@label,@singular,NULL,NULL,@supports,'seed',datetime('now'),datetime('now'),@search,1,NULL,0,'first_time',90,1)`).run({id:cid,slug:collection.slug,label:collection.label,singular:collection.labelSingular,supports:JSON.stringify(collection.supports),search:JSON.stringify({enabled:true})}); if(!tableExists(db,table)) db.exec(`CREATE TABLE "${table}" ("id" TEXT PRIMARY KEY,"slug" TEXT,"status" TEXT DEFAULT 'draft',"author_id" TEXT,"primary_byline_id" TEXT,"created_at" TEXT DEFAULT (datetime('now')),"updated_at" TEXT DEFAULT (datetime('now')),"published_at" TEXT,"scheduled_at" TEXT,"deleted_at" TEXT,"version" INTEGER DEFAULT 1,"live_revision_id" TEXT,"draft_revision_id" TEXT,"locale" TEXT DEFAULT 'en' NOT NULL,"translation_group" TEXT, CONSTRAINT "${table}_slug_locale_unique" UNIQUE ("slug", "locale"))`); for(const f of collection.fields) ensureColumn(db,table,f); collection.fields.forEach((f,i)=>{ const existing=db.prepare('SELECT id FROM _emdash_fields WHERE collection_id=? AND slug=?').get(cid,f.slug); const validation=f.validation?JSON.stringify(f.validation):null; if(existing) db.prepare('UPDATE _emdash_fields SET label=?, type=?, column_type=?, required=?, searchable=?, validation=?, sort_order=? WHERE id=?').run(f.label,f.type,columnType(f),f.required?1:0,f.searchable?1:0,validation,i,existing.id); else db.prepare(`INSERT INTO _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", default_value, validation, widget, options, sort_order, created_at, searchable, translatable) VALUES (@id,@cid,@slug,@label,@type,@col,@req,0,NULL,@validation,NULL,NULL,@sort,datetime('now'),@searchable,1)`).run({id:id(),cid,slug:f.slug,label:f.label,type:f.type,col:columnType(f),req:f.required?1:0,validation,sort:i,searchable:f.searchable?1:0}); }); const cols=['id','slug','status','created_at','updated_at','published_at','version','locale',...collection.fields.map(f=>f.slug)]; const quoted=cols.map(c=>`"${c}"`).join(','); const values=cols.map(c=>`@${c}`).join(','); const insert=db.prepare(`INSERT OR REPLACE INTO "${table}" (${quoted}) VALUES (${values})`); for(const item of seed.content.service_pages){ const row={id:item.id,slug:item.slug,status:item.status,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),published_at:new Date().toISOString(),version:1,locale:'en'}; for(const f of collection.fields) row[f.slug]=norm(item.data[f.slug]); insert.run(row); } }); tx(); db.close(); return dbPath; }
ensureSeed(); for(const p of dbPaths()) configureDb(p); console.log('Service Pages ready:', seed.content.service_pages.length); console.log(seed.content.service_pages.map(i=>`${i.slug}:${i.data.content_blocks.length}`).join('\n'));




