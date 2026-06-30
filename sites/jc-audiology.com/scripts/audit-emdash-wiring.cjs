const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const seed = JSON.parse(fs.readFileSync('seed/seed.json','utf8'));
const db = new Database('data.db');
function walk(dir, out=[]) { for (const f of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,f.name); if (f.isDirectory()) walk(p,out); else if (p.endsWith(path.join('index.html'))) out.push(p); } return out; }
function routeFromShell(file) { let rel = path.relative(path.join('src','shells','pages'), file).replace(/\\/g,'/'); if (rel === 'index.html') return '/'; rel = rel.replace(/\/index\.html$/, ''); return '/' + rel.replace(/^\/+|\/+$/g,'') + '/'; }
function slugForRoute(route) { return route.replace(/^\/+|\/+$/g,'').replace(/\//g,'__') || 'home'; }
function contentCollectionForRoute(route) {
  if (route === '/') return 'homepage';
  if (["/judith-l-reese-ph-d/", "/ryan-nurge-has/", "/charlie-reese/", "/graciela-wentz/"].includes(route)) return 'staff_profile_pages + staff_profiles';
  if (route === '/about/') return 'about_page + staff_profiles + site_cta_office_info';
  if (route === '/contact/') return 'contact_page + site_cta_office_info';
  if (route === '/schedule-appointment/') return 'schedule_appointment_page';
  if (route === '/blog/') return 'blog_posts listing';
  if (route.startsWith('/hearing-aids/')) return 'hearing_aid_brands';
  if (["/resources/insurance/", "/privacy-policy/", "/terms-of-service/"].includes(route)) return 'utility_pages';
  if (["/crackling-in-ear/", "/hearing-aids-for-tinnitus/", "/hearing-test-online-helpful-or-risky/", "/in-the-canal-hearing-aids-a-practical-guide/", "/rechargeable-hearing-aids/", "/swimmers-ear-causes-symptoms-treatment-prevention/"].includes(route)) return 'blog_posts';
  if (route.startsWith('/audiology-services/') || route === '/custom-hearing-protection/' || route.startsWith('/hearing-aids-products/')) return 'services';
  return null;
}
function entryExists(collection, route) {
  if (collection === 'homepage') return !!seed.entries.find(e => e.collection === 'homepage' && e.id === 'home');
  if (collection === 'blog_posts listing') return seed.entries.filter(e => e.collection === 'blog_posts').length > 0;
  if (collection?.startsWith('staff_profile_pages')) return !!seed.entries.find(e => e.collection === 'staff_profile_pages' && e.id === slugForRoute(route)) && !!seed.entries.find(e => e.collection === 'staff_profiles' && e.id === slugForRoute(route));
  if (collection?.startsWith('about_page')) return !!seed.entries.find(e => e.collection === 'about_page' && e.id === 'about');
  if (collection?.startsWith('contact_page')) return !!seed.entries.find(e => e.collection === 'contact_page' && e.id === 'contact');
  if (collection === 'schedule_appointment_page') return !!seed.entries.find(e => e.collection === 'schedule_appointment_page' && e.id === 'schedule-appointment');
  if (!collection) return false;
  return !!seed.entries.find(e => e.collection === collection && e.id === slugForRoute(route));
}
function dbRows(collection) { try { return db.prepare(`select slug from ec_${collection}`).all().map(r=>r.slug); } catch { return []; } }
const routes = walk(path.join('src','shells','pages')).map(routeFromShell).sort();
const report = routes.map(route => {
  const collection = contentCollectionForRoute(route);
  const wired = entryExists(collection, route);
  return { route, collection: collection || 'UNMAPPED', wired };
});
console.table(report);
console.log('\nCounts by collection:');
for (const c of ['homepage','services','hearing_aid_brands','utility_pages','blog_posts','staff_profiles','staff_profile_pages','about_page','contact_page','schedule_appointment_page','site_cta_office_info','homepage_services_section','homepage_hearing_solutions_section']) {
  console.log(c, 'seed entries:', seed.entries.filter(e=>e.collection===c).length, 'db rows:', dbRows(c).length);
}
console.log('\nUnmapped/missing:', report.filter(r => !r.wired || r.collection === 'UNMAPPED'));
db.close();
