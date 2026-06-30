import fs from 'node:fs';
import Database from 'better-sqlite3';
import * as parse5 from 'parse5';

const now = () => new Date().toISOString();
const seedPath = 'seed/seed.json';
const dbPath = 'data.db';
const STANDARD_ROUTES = new Set([
  '/audiology-services/',
  '/audiology-services/hearing-aid-fittings/',
  '/audiology-services/hearing-aid-services/',
  '/audiology-services/hearing-tests/',
  '/audiology-services/real-ear-measurement/',
  '/audiology-services/sensorineural-hearing-loss/',
  '/audiology-services/tinnitus-evaluation-support/',
  '/custom-hearing-protection/',
  '/hearing-aids-products/',
  '/hearing-aids-products/hearing-aid-alternatives/',
  '/hearing-aids-products/hearing-aid-batteries/',
  '/resources/insurance/',
]);

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceDb = new Database(dbPath);
const serviceColumns = sourceDb.prepare('pragma table_info(ec_services)').all().map((row) => row.name);
const serviceHtmlBySlug = serviceColumns.includes('body_html')
  ? new Map(sourceDb.prepare('select slug, body_html from ec_services').all().map((row) => [row.slug, row.body_html || '']))
  : new Map();
sourceDb.close();

function fixText(input = '') {
  const replacements = [
    [String.fromCharCode(0xe2, 0x20ac, 0x2122), "'"],
    [String.fromCharCode(0xe2, 0x20ac, 0x2dc), "'"],
    [String.fromCharCode(0xe2, 0x20ac, 0x153), '"'],
    [String.fromCharCode(0xe2, 0x20ac, 0xfffd), '"'],
    [String.fromCharCode(0xe2, 0x20ac, 0x9d), '"'],
    [String.fromCharCode(0xe2, 0x20ac, 0x201c), "-"],
    [String.fromCharCode(0xe2, 0x20ac, 0x201d), "-"],
    [String.fromCharCode(0xe2, 0x20ac, 0xba), "›"],
    [String.fromCharCode(0xc2, 0xa0), " "],
    ["&nbsp;", " "],
    ["\u00a0", " "],
  ];
  let value = String(input);
  for (const [from, to] of replacements) value = value.split(from).join(to);
  return value.replace(/\s+/g, " ");
}
function key(prefix = 'k') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getAttr(node, name) {
  return node.attrs?.find((a) => a.name === name)?.value ?? '';
}
function hasClass(node, className) {
  return getAttr(node, 'class').split(/\s+/).includes(className);
}
function hasAnyClass(node, names) {
  const classes = getAttr(node, 'class').split(/\s+/);
  return names.some((n) => classes.includes(n));
}
function dataId(node) {
  return getAttr(node, 'data-id') || getAttr(node, 'id') || '';
}
function textContent(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return fixText(node.value || '');
  return (node.childNodes || []).map(textContent).join('');
}
function serializeNode(node) {
  return parse5.serialize({ childNodes: [node] });
}
function serializeChildren(node) {
  return (node.childNodes || []).map((child) => serializeNode(child)).join('');
}

function makeSpan(text, marks = []) {
  return { _type: 'span', _key: key('s'), text: fixText(text), marks };
}
function compactSpans(spans) {
  return spans.filter((span) => span.text && span.text.replace(/\s+/g, '').length > 0);
}
function inlineChildren(node, marks = [], markDefs = []) {
  if (!node) return [];
  if (node.nodeName === '#text') return [makeSpan(node.value || '', marks)];
  if (!node.childNodes) return [];
  const tag = node.tagName;
  if (tag === 'br') return [makeSpan('\n', marks)];
  let nextMarks = [...marks];
  if (tag === 'strong' || tag === 'b') nextMarks.push('strong');
  if (tag === 'em' || tag === 'i') nextMarks.push('em');
  if (tag === 'a') {
    const href = getAttr(node, 'href');
    if (href) {
      const mKey = key('link');
      markDefs.push({ _key: mKey, _type: 'link', href });
      nextMarks.push(mKey);
    }
  }
  return node.childNodes.flatMap((child) => inlineChildren(child, nextMarks, markDefs));
}
function makeBlockFromNode(node, style = 'normal', listItem, level = 1) {
  const markDefs = [];
  const children = compactSpans(inlineChildren(node, [], markDefs));
  if (!children.length) return null;
  const block = { _type: 'block', _key: key('b'), style, markDefs, children };
  if (listItem) {
    block.listItem = listItem;
    block.level = level;
  }
  return block;
}
function parseListItem(li, listItem, level) {
  const pseudo = { ...li, childNodes: [] };
  const nestedLists = [];
  for (const child of li.childNodes || []) {
    if (child.tagName === 'ul' || child.tagName === 'ol') nestedLists.push(child);
    else pseudo.childNodes.push(child);
  }
  const blocks = [];
  const main = makeBlockFromNode(pseudo, 'normal', listItem, level);
  if (main) blocks.push(main);
  for (const list of nestedLists) blocks.push(...htmlNodesToPortableText(list.childNodes || [], list.tagName === 'ol' ? 'number' : 'bullet', level + 1));
  return blocks;
}
function htmlNodesToPortableText(nodes, currentListItem = null, level = 1) {
  const blocks = [];
  for (const node of nodes || []) {
    if (node.nodeName === '#text') {
      if (fixText(node.value || '').trim()) {
        const b = makeBlockFromNode({ childNodes: [node] }, 'normal', currentListItem, level);
        if (b) blocks.push(b);
      }
      continue;
    }
    const tag = node.tagName;
    if (!tag) continue;
    if (/^h[1-6]$/.test(tag)) {
      const b = makeBlockFromNode(node, tag);
      if (b) blocks.push(b);
    } else if (tag === 'p' || tag === 'div') {
      const b = makeBlockFromNode(node, 'normal', currentListItem, level);
      if (b) blocks.push(b);
    } else if (tag === 'ul' || tag === 'ol') {
      const itemType = tag === 'ol' ? 'number' : 'bullet';
      for (const li of (node.childNodes || []).filter((n) => n.tagName === 'li')) {
        blocks.push(...parseListItem(li, itemType, level));
      }
    } else if (tag === 'li') {
      blocks.push(...parseListItem(node, currentListItem || 'bullet', level));
    } else if (tag === 'blockquote') {
      const b = makeBlockFromNode(node, 'blockquote');
      if (b) blocks.push(b);
    } else if (tag === 'br') {
      continue;
    } else {
      blocks.push(...htmlNodesToPortableText(node.childNodes || [], currentListItem, level));
    }
  }
  return blocks;
}
function htmlToPortableText(html) {
  const fragment = parse5.parseFragment(html || '');
  return htmlNodesToPortableText(fragment.childNodes || []);
}
function findFirst(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes || []) {
    const found = findFirst(child, predicate);
    if (found) return found;
  }
  return null;
}
function parseAccordion(node, serviceSlug, groupIndex) {
  const groupKey = `${serviceSlug}-accordion-${String(groupIndex).padStart(2, '0')}`;
  const items = [];
  let itemIndex = 0;
  function walk(n) {
    if (n.tagName === 'details') {
      itemIndex++;
      const titleNode = findFirst(n, (x) => hasClass(x, 'e-n-accordion-item-title-text'));
      const answerNode = findFirst(n, (x) => hasClass(x, 'astro-widget-text-editor'));
      const answerContainer = findFirst(n, (x) => getAttr(x, 'role') === 'region');
      const question = fixText(textContent(titleNode).trim());
      const answerHtml = answerNode ? serializeChildren(answerNode) : '';
      const sourceId = dataId(answerContainer) || getAttr(n, 'id');
      const answerWidgetId = dataId(answerNode);
      items.push({
        collection: 'service_accordion_items',
        id: `${groupKey}-${String(itemIndex).padStart(2, '0')}`,
        status: 'published',
        data: {
          title: question,
          service_slug: serviceSlug,
          group_key: groupKey,
          question,
          answer_content: htmlToPortableText(answerHtml),
          source_element_id: sourceId,
          answer_widget_id: answerWidgetId,
          sort_order: itemIndex,
        },
      });
      return;
    }
    for (const child of n.childNodes || []) walk(child);
  }
  walk(node);
  return { groupKey, items };
}
function shellBodyHtmlForRoute(route) {
  const rel = route.replace(/^\//, '').replace(/\/$/, '') || 'index';
  const shellPath = rel === 'index' ? 'src/shells/pages/index.html' : `src/shells/pages/${rel}/index.html`;
  if (!fs.existsSync(shellPath)) return '';
  const fragment = parse5.parseFragment(fs.readFileSync(shellPath, 'utf8'));
  const root = findFirst(fragment, (n) => hasClass(n, 'astro-element-69dc79d'));
  return root ? serializeNode(root) : '';
}

function extractBlocksFromBodyHtml(bodyHtml, serviceSlug) {
  const fragment = parse5.parseFragment(bodyHtml || '');
  const root = findFirst(fragment, (n) => hasClass(n, 'astro-element-69dc79d')) || fragment;
  const blocks = [];
  const accordionItems = [];
  let sort = 0;
  let accordionIndex = 0;
  function addBlock(data) {
    sort++;
    const id = `${serviceSlug}-block-${String(sort).padStart(3, '0')}`;
    blocks.push({ collection: 'service_content_blocks', id, status: 'published', data: { ...data, sort_order: sort } });
  }
  function walk(node, insideAccordion = false) {
    if (!node || node.nodeName === '#text') return;
    if (!insideAccordion && hasClass(node, 'astro-widget-text-editor')) {
      const source = dataId(node);
      const content = htmlToPortableText(serializeChildren(node));
      if (content.length) {
        const label = textContent(node).trim().slice(0, 80) || 'Text Content';
        addBlock({
          title: fixText(label),
          service_slug: serviceSlug,
          block_type: 'rich_text',
          content,
          accordion_group_key: '',
          source_element_id: source,
        });
      }
      return;
    }
    if (!insideAccordion && hasClass(node, 'astro-widget-divider')) {
      addBlock({
        title: 'Divider',
        service_slug: serviceSlug,
        block_type: 'divider',
        content: [],
        accordion_group_key: '',
        source_element_id: dataId(node),
      });
      return;
    }
    if (!insideAccordion && hasClass(node, 'astro-widget-n-accordion')) {
      accordionIndex++;
      const parsed = parseAccordion(node, serviceSlug, accordionIndex);
      accordionItems.push(...parsed.items);
      addBlock({
        title: `Accordion Group ${accordionIndex}`,
        service_slug: serviceSlug,
        block_type: 'accordion_group',
        content: [],
        accordion_group_key: parsed.groupKey,
        source_element_id: dataId(node),
      });
      return;
    }
    for (const child of node.childNodes || []) walk(child, insideAccordion || hasClass(node, 'astro-widget-n-accordion'));
  }
  walk(root);
  return { blocks, accordionItems };
}
function ensureCollection(collection) {
  const idx = seed.collections.findIndex((c) => c.name === collection.name || c.slug === collection.slug);
  if (idx >= 0) seed.collections[idx] = collection;
  else seed.collections.push(collection);
}
function field(name, type, label = name.replace(/_/g, ' ')) {
  return { name, slug: name, type, label };
}

// Clean service schema: no raw body_html in admin.
const servicesCollection = seed.collections.find((c) => c.slug === 'services');
if (!servicesCollection) throw new Error('Missing services collection');
servicesCollection.fields = servicesCollection.fields.filter((f) => f.slug !== 'body_html');
if (!servicesCollection.fields.some((f) => f.slug === 'body_content')) {
  servicesCollection.fields.push(field('body_content', 'portableText', 'Body Content'));
}

ensureCollection({
  name: 'service_content_blocks',
  slug: 'service_content_blocks',
  label: 'Service Content Blocks',
  fields: [
    field('title', 'string', 'Editor Label'),
    field('service_slug', 'string', 'Service Slug'),
    field('block_type', 'string', 'Block Type'),
    field('content', 'portableText', 'Rich Text Content'),
    field('accordion_group_key', 'string', 'Accordion Group Key'),
    field('source_element_id', 'string', 'Source Element ID'),
    field('sort_order', 'number', 'Sort Order'),
  ],
});
ensureCollection({
  name: 'service_accordion_items',
  slug: 'service_accordion_items',
  label: 'Service Accordion Items',
  fields: [
    field('title', 'string', 'Editor Label'),
    field('service_slug', 'string', 'Service Slug'),
    field('group_key', 'string', 'Accordion Group Key'),
    field('question', 'string', 'Question'),
    field('answer_content', 'portableText', 'Answer'),
    field('source_element_id', 'string', 'Source Element ID'),
    field('answer_widget_id', 'string', 'Answer Widget ID'),
    field('sort_order', 'number', 'Sort Order'),
  ],
});

const allNewEntries = [];
for (const entry of seed.entries.filter((e) => e.collection === 'services' && STANDARD_ROUTES.has(e.data?.route))) {
  const serviceSlug = entry.id;
  const bodyHtml = entry.data.body_html || entry.data.body_content?.find?.((b) => b._type === 'htmlBlock')?.html || serviceHtmlBySlug.get(serviceSlug) || shellBodyHtmlForRoute(entry.data.route) || '';
  const { blocks, accordionItems } = extractBlocksFromBodyHtml(bodyHtml, serviceSlug);
  const combined = blocks.filter((b) => b.data.block_type === 'rich_text').flatMap((b) => b.data.content);
  entry.data.body_content = combined;
  delete entry.data.body_html;
  allNewEntries.push(...blocks, ...accordionItems);
}
seed.entries = seed.entries.filter((e) => !['service_content_blocks', 'service_accordion_items'].includes(e.collection));
seed.entries.push(...allNewEntries);
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n');
console.log(`Updated seed with ${allNewEntries.filter(e=>e.collection==='service_content_blocks').length} service blocks and ${allNewEntries.filter(e=>e.collection==='service_accordion_items').length} accordion items.`);

const db = new Database(dbPath);
const tx = db.transaction(() => {
  const col = db.prepare("select id from _emdash_collections where slug='services'").get();
  if (col) db.prepare("delete from _emdash_fields where collection_id=? and slug='body_html'").run(col.id);

  function upsertCollection(slug, label) {
    const existing = db.prepare('select id from _emdash_collections where slug=?').get(slug);
    const id = existing?.id || `local_${slug}`;
    if (existing) {
      db.prepare('update _emdash_collections set label=?, updated_at=? where slug=?').run(label, now(), slug);
    } else {
      db.prepare('insert into _emdash_collections (id, slug, label, supports, source, has_seo, comments_enabled, created_at, updated_at) values (?, ?, ?, ?, ?, 0, 0, ?, ?)').run(id, slug, label, JSON.stringify(['drafts','preview']), 'manual', now(), now());
    }
    return id;
  }
  function upsertField(collectionId, slug, label, type, columnType, sortOrder) {
    const existing = db.prepare('select id from _emdash_fields where collection_id=? and slug=?').get(collectionId, slug);
    if (existing) {
      db.prepare('update _emdash_fields set label=?, type=?, column_type=?, sort_order=? where id=?').run(label, type, columnType, sortOrder, existing.id);
    } else {
      db.prepare('insert into _emdash_fields (id, collection_id, slug, label, type, column_type, required, "unique", sort_order, searchable, translatable) values (?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 1)').run(`field_${collectionId}_${slug}`, collectionId, slug, label, type, columnType, sortOrder);
    }
  }
  function ensureTable(table, columns) {
    db.prepare(`CREATE TABLE IF NOT EXISTS ${table} ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text, "draft_revision_id" text, "locale" text default 'en' not null, "translation_group" text, constraint "${table}_slug_locale_unique" unique ("slug", "locale"))`).run();
    const existingCols = new Set(db.prepare(`pragma table_info(${table})`).all().map((r) => r.name));
    for (const [name, sqlType] of columns) {
      if (!existingCols.has(name)) db.prepare(`ALTER TABLE ${table} ADD COLUMN "${name}" ${sqlType}`).run();
    }
  }
  const blockColId = upsertCollection('service_content_blocks', 'Service Content Blocks');
  const itemColId = upsertCollection('service_accordion_items', 'Service Accordion Items');
  const blockFields = [
    ['title','Editor Label','string','TEXT'], ['service_slug','Service Slug','string','TEXT'], ['block_type','Block Type','string','TEXT'], ['content','Rich Text Content','portableText','JSON'], ['accordion_group_key','Accordion Group Key','string','TEXT'], ['source_element_id','Source Element ID','string','TEXT'], ['sort_order','Sort Order','number','REAL']
  ];
  const itemFields = [
    ['title','Editor Label','string','TEXT'], ['service_slug','Service Slug','string','TEXT'], ['group_key','Accordion Group Key','string','TEXT'], ['question','Question','string','TEXT'], ['answer_content','Answer','portableText','JSON'], ['source_element_id','Source Element ID','string','TEXT'], ['sort_order','Sort Order','number','REAL']
  ];
  blockFields.forEach((f,i)=>upsertField(blockColId, f[0], f[1], f[2], f[3], i));
  itemFields.forEach((f,i)=>upsertField(itemColId, f[0], f[1], f[2], f[3], i));
  ensureTable('ec_service_content_blocks', blockFields.map(f=>[f[0], f[3]]));
  ensureTable('ec_service_accordion_items', itemFields.map(f=>[f[0], f[3]]));
  db.prepare('delete from ec_service_content_blocks').run();
  db.prepare('delete from ec_service_accordion_items').run();

  const serviceRows = db.prepare('select id, slug, body_content from ec_services').all();
  const updateService = db.prepare('update ec_services set body_content=?, updated_at=?, version=version+1 where id=?');
  for (const row of serviceRows) {
    const seedEntry = seed.entries.find((e) => e.collection === 'services' && (e.id === row.slug || e.id === row.id));
    if (!seedEntry || !STANDARD_ROUTES.has(seedEntry.data.route)) continue;
    updateService.run(JSON.stringify(seedEntry.data.body_content || []), now(), row.id);
  }
  const insertBlock = db.prepare('insert into ec_service_content_blocks (id, slug, status, created_at, updated_at, published_at, title, service_slug, block_type, content, accordion_group_key, source_element_id, sort_order) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertItem = db.prepare('insert into ec_service_accordion_items (id, slug, status, created_at, updated_at, published_at, title, service_slug, group_key, question, answer_content, source_element_id, answer_widget_id, sort_order) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const e of allNewEntries) {
    if (e.collection === 'service_content_blocks') {
      insertBlock.run(e.id, e.id, e.status, now(), now(), now(), e.data.title, e.data.service_slug, e.data.block_type, JSON.stringify(e.data.content || []), e.data.accordion_group_key, e.data.source_element_id, e.data.sort_order);
    } else {
      insertItem.run(e.id, e.id, e.status, now(), now(), now(), e.data.title, e.data.service_slug, e.data.group_key, e.data.question, JSON.stringify(e.data.answer_content || []), e.data.source_element_id, e.data.answer_widget_id, e.data.sort_order);
    }
  }
});
tx();
console.log('Updated local data.db service content model.');



