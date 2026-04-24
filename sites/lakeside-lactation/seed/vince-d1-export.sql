PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE IF NOT EXISTS "_emdash_migrations" ("name" varchar(255) not null primary key, "timestamp" varchar(255) not null);
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('001_initial','2026-04-06T11:19:18.332Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('002_media_status','2026-04-06T11:19:18.573Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('003_schema_registry','2026-04-06T11:19:19.110Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('004_plugins','2026-04-06T11:19:19.538Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('005_menus','2026-04-06T11:19:20.003Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('006_taxonomy_defs','2026-04-06T11:19:20.251Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('007_widgets','2026-04-06T11:19:20.582Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('008_auth','2026-04-06T11:19:21.846Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('009_user_disabled','2026-04-06T11:19:22.082Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('011_sections','2026-04-06T11:19:22.497Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('012_search','2026-04-06T11:19:22.739Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('013_scheduled_publishing','2026-04-06T11:19:22.904Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('014_draft_revisions','2026-04-06T11:19:23.027Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('015_indexes','2026-04-06T11:19:23.697Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('016_api_tokens','2026-04-06T11:19:24.474Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('017_authorization_codes','2026-04-06T11:19:24.846Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('018_seo','2026-04-06T11:19:25.178Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('019_i18n','2026-04-06T11:19:25.513Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('020_collection_url_pattern','2026-04-06T11:19:25.685Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('021_remove_section_categories','2026-04-06T11:19:26.015Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('022_marketplace_plugin_state','2026-04-06T11:19:26.394Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('023_plugin_metadata','2026-04-06T11:19:26.676Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('024_media_placeholders','2026-04-06T11:19:26.912Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('025_oauth_clients','2026-04-06T11:19:27.127Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('026_cron_tasks','2026-04-06T11:19:27.599Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('027_comments','2026-04-06T11:19:28.620Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('028_drop_author_url','2026-04-06T11:19:28.787Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('029_redirects','2026-04-06T11:19:29.446Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('030_widen_scheduled_index','2026-04-06T11:19:29.570Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('031_bylines','2026-04-06T11:19:30.251Z');
INSERT INTO "_emdash_migrations" ("name","timestamp") VALUES('032_rate_limits','2026-04-06T11:19:30.573Z');
CREATE TABLE IF NOT EXISTS "_emdash_migrations_lock" ("id" varchar(255) not null primary key, "is_locked" integer default 0 not null);
INSERT INTO "_emdash_migrations_lock" ("id","is_locked") VALUES('migration_lock',0);
CREATE TABLE IF NOT EXISTS "revisions" ("id" text primary key, "collection" text not null, "entry_id" text not null, "data" text not null, "author_id" text, "created_at" text default (datetime('now')));
CREATE TABLE IF NOT EXISTS "taxonomies" ("id" text primary key, "name" text not null, "slug" text not null, "label" text not null, "parent_id" text, "data" text, constraint "taxonomies_name_slug_unique" unique ("name", "slug"), constraint "taxonomies_parent_fk" foreign key ("parent_id") references "taxonomies" ("id") on delete set null);
CREATE TABLE IF NOT EXISTS "content_taxonomies" ("collection" text not null, "entry_id" text not null, "taxonomy_id" text not null, constraint "content_taxonomies_pk" primary key ("collection", "entry_id", "taxonomy_id"), constraint "content_taxonomies_taxonomy_fk" foreign key ("taxonomy_id") references "taxonomies" ("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "media" ("id" text primary key, "filename" text not null, "mime_type" text not null, "size" integer, "width" integer, "height" integer, "alt" text, "caption" text, "storage_key" text not null, "content_hash" text, "created_at" text default (datetime('now')), "author_id" text, "status" text default 'ready' not null, blurhash TEXT, dominant_color TEXT);
CREATE TABLE IF NOT EXISTS "options" ("name" text primary key, "value" text not null);
INSERT INTO "options" ("name","value") VALUES('emdash:exclusive_hook:comment:moderate','"emdash-default-comment-moderator"');
INSERT INTO "options" ("name","value") VALUES('site:title','"Lakeside Lactation"');
INSERT INTO "options" ("name","value") VALUES('site:tagline','"Helping you build confidence and reach the breastfeeding goals that matter to you."');
INSERT INTO "options" ("name","value") VALUES('emdash:site_url','"https://lakeside-lactation.vince-75c.workers.dev"');
INSERT INTO "options" ("name","value") VALUES('emdash:setup_complete','true');
CREATE TABLE IF NOT EXISTS "audit_logs" ("id" text primary key, "timestamp" text default (datetime('now')), "actor_id" text, "actor_ip" text, "action" text not null, "resource_type" text, "resource_id" text, "details" text, "status" text);
CREATE TABLE IF NOT EXISTS "_emdash_collections" ("id" text primary key, "slug" text not null unique, "label" text not null, "label_singular" text, "description" text, "icon" text, "supports" text, "source" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "search_config" text, has_seo INTEGER NOT NULL DEFAULT 0, url_pattern TEXT, "comments_enabled" integer default 0, "comments_moderation" text default 'first_time', "comments_closed_after_days" integer default 90, "comments_auto_approve_users" integer default 1);
INSERT INTO "_emdash_collections" ("id","slug","label","label_singular","description","icon","supports","source","created_at","updated_at","search_config","has_seo","url_pattern","comments_enabled","comments_moderation","comments_closed_after_days","comments_auto_approve_users") VALUES('01KNH8T8WK0TXT24X4EMZZ3QBQ','testimonials','Testimonials',NULL,NULL,NULL,'[]','seed','2026-04-06 11:28:30','2026-04-06 11:28:30',NULL,0,NULL,0,'first_time',90,1);
INSERT INTO "_emdash_collections" ("id","slug","label","label_singular","description","icon","supports","source","created_at","updated_at","search_config","has_seo","url_pattern","comments_enabled","comments_moderation","comments_closed_after_days","comments_auto_approve_users") VALUES('01KNH8TBNKZA5GZY2KXEBAD040','faqs','FAQs',NULL,NULL,NULL,'[]','seed','2026-04-06 11:28:32','2026-04-06 11:28:32',NULL,0,NULL,0,'first_time',90,1);
INSERT INTO "_emdash_collections" ("id","slug","label","label_singular","description","icon","supports","source","created_at","updated_at","search_config","has_seo","url_pattern","comments_enabled","comments_moderation","comments_closed_after_days","comments_auto_approve_users") VALUES('01KNH8TE5AQE3MW6GRGAP29TV9','services','Services',NULL,NULL,NULL,'[]','seed','2026-04-06 11:28:35','2026-04-06 11:28:35',NULL,0,NULL,0,'first_time',90,1);
INSERT INTO "_emdash_collections" ("id","slug","label","label_singular","description","icon","supports","source","created_at","updated_at","search_config","has_seo","url_pattern","comments_enabled","comments_moderation","comments_closed_after_days","comments_auto_approve_users") VALUES('01KNH8TJAJNHCXR6K65VESMK7X','form_submissions','Form Submissions',NULL,NULL,NULL,'[]','seed','2026-04-06 11:28:39','2026-04-06 11:28:39',NULL,0,NULL,0,'first_time',90,1);
CREATE TABLE IF NOT EXISTS "_emdash_fields" ("id" text primary key, "collection_id" text not null, "slug" text not null, "label" text not null, "type" text not null, "column_type" text not null, "required" integer default 0, "unique" integer default 0, "default_value" text, "validation" text, "widget" text, "options" text, "sort_order" integer default 0, "created_at" text default (datetime('now')), "searchable" integer default 0, translatable INTEGER NOT NULL DEFAULT 1, constraint "fields_collection_fk" foreign key ("collection_id") references "_emdash_collections" ("id") on delete cascade);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TABC5HVN68TG06GFVWMJ','01KNH8T8WK0TXT24X4EMZZ3QBQ','name','Client Name','string','TEXT',0,0,NULL,NULL,NULL,NULL,0,'2026-04-06 11:28:31',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TATA09AQGD54DB0YK3DX','01KNH8T8WK0TXT24X4EMZZ3QBQ','quote','Quote','text','TEXT',0,0,NULL,NULL,NULL,NULL,1,'2026-04-06 11:28:32',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TB8EYMZV91P5H1YBWBKM','01KNH8T8WK0TXT24X4EMZZ3QBQ','role','Role','string','TEXT',0,0,NULL,NULL,NULL,NULL,2,'2026-04-06 11:28:32',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TD71T88WZ5X7SB6VYW3S','01KNH8TBNKZA5GZY2KXEBAD040','question','Question','string','TEXT',0,0,NULL,NULL,NULL,NULL,0,'2026-04-06 11:28:34',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TDQ4P0G5S5QKW7MJ45GW','01KNH8TBNKZA5GZY2KXEBAD040','answer','Answer','text','TEXT',0,0,NULL,NULL,NULL,NULL,1,'2026-04-06 11:28:35',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TFN0RBQ9K1THBV6X9N1R','01KNH8TE5AQE3MW6GRGAP29TV9','title','Service Title','string','TEXT',0,0,NULL,NULL,NULL,NULL,0,'2026-04-06 11:28:37',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TG5MH61A6P22CKE0CRWD','01KNH8TE5AQE3MW6GRGAP29TV9','description','Description','text','TEXT',0,0,NULL,NULL,NULL,NULL,1,'2026-04-06 11:28:37',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TGKNGZ7Y3E493EPKNCFW','01KNH8TE5AQE3MW6GRGAP29TV9','duration','Duration','string','TEXT',0,0,NULL,NULL,NULL,NULL,2,'2026-04-06 11:28:38',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TH2HQE9HESWHPPJS0FJG','01KNH8TE5AQE3MW6GRGAP29TV9','format','Format','string','TEXT',0,0,NULL,NULL,NULL,NULL,3,'2026-04-06 11:28:38',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8THFXSK0G7FW9H0C9QCJS','01KNH8TE5AQE3MW6GRGAP29TV9','price','Price','string','TEXT',0,0,NULL,NULL,NULL,NULL,4,'2026-04-06 11:28:38',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8THWJF8E4V0KGB2BR6JWC','01KNH8TE5AQE3MW6GRGAP29TV9','sort_order','Sort Order','number','REAL',0,0,NULL,NULL,NULL,NULL,5,'2026-04-06 11:28:39',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TKQGTJCTH0BKDC8S0Y84','01KNH8TJAJNHCXR6K65VESMK7X','title','Title','string','TEXT',0,0,NULL,NULL,NULL,NULL,0,'2026-04-06 11:28:41',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TM5CF8R1489D98S61JFP','01KNH8TJAJNHCXR6K65VESMK7X','name','Name','string','TEXT',0,0,NULL,NULL,NULL,NULL,1,'2026-04-06 11:28:41',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TMMX1KT6WAS3T1SXSWYA','01KNH8TJAJNHCXR6K65VESMK7X','email','Email','string','TEXT',0,0,NULL,NULL,NULL,NULL,2,'2026-04-06 11:28:42',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TN305TZQQEZNM41M9SEN','01KNH8TJAJNHCXR6K65VESMK7X','phone','Phone','string','TEXT',0,0,NULL,NULL,NULL,NULL,3,'2026-04-06 11:28:42',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TNM8K92M50BM2D52KF2K','01KNH8TJAJNHCXR6K65VESMK7X','message','Message','text','TEXT',0,0,NULL,NULL,NULL,NULL,4,'2026-04-06 11:28:43',0,1);
INSERT INTO "_emdash_fields" ("id","collection_id","slug","label","type","column_type","required","unique","default_value","validation","widget","options","sort_order","created_at","searchable","translatable") VALUES('01KNH8TP3HX9YG5P5Q84MR350M','01KNH8TJAJNHCXR6K65VESMK7X','read_status','Status','string','TEXT',0,0,NULL,NULL,NULL,NULL,5,'2026-04-06 11:28:43',0,1);
CREATE TABLE IF NOT EXISTS "_plugin_storage" ("plugin_id" text not null, "collection" text not null, "id" text not null, "data" text not null, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), constraint "pk_plugin_storage" primary key ("plugin_id", "collection", "id"));
CREATE TABLE IF NOT EXISTS "_plugin_state" ("plugin_id" text primary key, "version" text not null, "status" text default 'installed' not null, "installed_at" text default (datetime('now')), "activated_at" text, "deactivated_at" text, "data" text, source TEXT NOT NULL DEFAULT 'config', marketplace_version TEXT, display_name TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS "_plugin_indexes" ("plugin_id" text not null, "collection" text not null, "index_name" text not null, "fields" text not null, "created_at" text default (datetime('now')), constraint "pk_plugin_indexes" primary key ("plugin_id", "collection", "index_name"));
CREATE TABLE IF NOT EXISTS "_emdash_menus" ("id" text primary key, "name" text not null unique, "label" text not null, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')));
INSERT INTO "_emdash_menus" ("id","name","label","created_at","updated_at") VALUES('01KNH8TPGJY0AZV4SMGV6CVE07','primary','Primary Navigation','2026-04-06T11:28:44.050Z','2026-04-06T11:28:44.050Z');
CREATE TABLE IF NOT EXISTS "_emdash_menu_items" ("id" text primary key, "menu_id" text not null, "parent_id" text, "sort_order" integer default 0 not null, "type" text not null, "reference_collection" text, "reference_id" text, "custom_url" text, "label" text not null, "title_attr" text, "target" text, "css_classes" text, "created_at" text default (datetime('now')), constraint "menu_items_menu_fk" foreign key ("menu_id") references "_emdash_menus" ("id") on delete cascade, constraint "menu_items_parent_fk" foreign key ("parent_id") references "_emdash_menu_items" ("id") on delete cascade);
INSERT INTO "_emdash_menu_items" ("id","menu_id","parent_id","sort_order","type","reference_collection","reference_id","custom_url","label","title_attr","target","css_classes","created_at") VALUES('01KNH938GZYZEJDSW61EEZ1M3S','01KNH8TPGJY0AZV4SMGV6CVE07',NULL,0,'custom',NULL,NULL,'#about','About',NULL,NULL,NULL,'2026-04-06T11:33:24.639Z');
INSERT INTO "_emdash_menu_items" ("id","menu_id","parent_id","sort_order","type","reference_collection","reference_id","custom_url","label","title_attr","target","css_classes","created_at") VALUES('01KNH938KF3QMW5YE8Y0D1C8AE','01KNH8TPGJY0AZV4SMGV6CVE07',NULL,1,'custom',NULL,NULL,'#testimonials','Testimonials',NULL,NULL,NULL,'2026-04-06T11:33:24.719Z');
INSERT INTO "_emdash_menu_items" ("id","menu_id","parent_id","sort_order","type","reference_collection","reference_id","custom_url","label","title_attr","target","css_classes","created_at") VALUES('01KNH938PRD2H2W2ANCMMKK663','01KNH8TPGJY0AZV4SMGV6CVE07',NULL,2,'custom',NULL,NULL,'#services','Services',NULL,NULL,NULL,'2026-04-06T11:33:24.824Z');
INSERT INTO "_emdash_menu_items" ("id","menu_id","parent_id","sort_order","type","reference_collection","reference_id","custom_url","label","title_attr","target","css_classes","created_at") VALUES('01KNH938S4E3F1JZJ1WM25KBNF','01KNH8TPGJY0AZV4SMGV6CVE07',NULL,3,'custom',NULL,NULL,'#faq','FAQ',NULL,NULL,NULL,'2026-04-06T11:33:24.900Z');
INSERT INTO "_emdash_menu_items" ("id","menu_id","parent_id","sort_order","type","reference_collection","reference_id","custom_url","label","title_attr","target","css_classes","created_at") VALUES('01KNH938VPQY7Y5VSRGGGRCQHM','01KNH8TPGJY0AZV4SMGV6CVE07',NULL,4,'custom',NULL,NULL,'#contact','Contact',NULL,NULL,NULL,'2026-04-06T11:33:24.982Z');
CREATE TABLE IF NOT EXISTS "_emdash_taxonomy_defs" ("id" text primary key, "name" text not null unique, "label" text not null, "label_singular" text, "hierarchical" integer default 0, "collections" text, "created_at" text default (datetime('now')));
INSERT INTO "_emdash_taxonomy_defs" ("id","name","label","label_singular","hierarchical","collections","created_at") VALUES('taxdef_category','category','Categories','Category',1,'["posts"]','2026-04-06 11:19:20');
INSERT INTO "_emdash_taxonomy_defs" ("id","name","label","label_singular","hierarchical","collections","created_at") VALUES('taxdef_tag','tag','Tags','Tag',0,'["posts"]','2026-04-06 11:19:20');
CREATE TABLE IF NOT EXISTS "_emdash_widget_areas" ("id" text primary key, "name" text not null unique, "label" text not null, "description" text, "created_at" text default CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "_emdash_widgets" ("id" text primary key, "area_id" text not null references "_emdash_widget_areas" ("id") on delete cascade, "sort_order" integer default 0 not null, "type" text not null, "title" text, "content" text, "menu_name" text, "component_id" text, "component_props" text, "created_at" text default CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "users" ("id" text primary key, "email" text not null unique, "name" text, "avatar_url" text, "role" integer default 10 not null, "email_verified" integer default 0 not null, "data" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), disabled INTEGER NOT NULL DEFAULT 0);
INSERT INTO "users" ("id","email","name","avatar_url","role","email_verified","data","created_at","updated_at","disabled") VALUES('01KNH93VTN7JVG5VMRE6NXCFW7','vince@bidviewmarketing.com','Vince',NULL,50,0,NULL,'2026-04-06T11:33:44.405Z','2026-04-06T11:33:44.405Z',0);
CREATE TABLE IF NOT EXISTS "credentials" ("id" text primary key, "user_id" text not null, "public_key" blob not null, "counter" integer default 0 not null, "device_type" text not null, "backed_up" integer default 0 not null, "transports" text, "name" text, "created_at" text default (datetime('now')), "last_used_at" text default (datetime('now')), constraint "credentials_user_fk" foreign key ("user_id") references "users" ("id") on delete cascade);
INSERT INTO "credentials" ("id","user_id","public_key","counter","device_type","backed_up","transports","name","created_at","last_used_at") VALUES('5MsPO-TOZNqqyPv2CL_HZA','01KNH93VTN7JVG5VMRE6NXCFW7',X'049dadc49645954aaa3b522f20f5142703184b6bc19f71627eab032e886e6b0d8949b8df9e664307ba802b4a08e0aa0a6b2659804044c522c6770ff428a9a2a67a',0,'singleDevice',0,'["hybrid","internal"]','Setup passkey','2026-04-06T11:33:44.568Z','2026-04-06T11:34:08.296Z');
CREATE TABLE IF NOT EXISTS "auth_tokens" ("hash" text primary key, "user_id" text, "email" text, "type" text not null, "role" integer, "invited_by" text, "expires_at" text not null, "created_at" text default (datetime('now')), constraint "auth_tokens_user_fk" foreign key ("user_id") references "users" ("id") on delete cascade, constraint "auth_tokens_invited_by_fk" foreign key ("invited_by") references "users" ("id") on delete set null);
CREATE TABLE IF NOT EXISTS "oauth_accounts" ("provider" text not null, "provider_account_id" text not null, "user_id" text not null, "created_at" text default (datetime('now')), constraint "oauth_accounts_pk" primary key ("provider", "provider_account_id"), constraint "oauth_accounts_user_fk" foreign key ("user_id") references "users" ("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "allowed_domains" ("domain" text primary key, "default_role" integer default 20 not null, "enabled" integer default 1 not null, "created_at" text default (datetime('now')));
CREATE TABLE IF NOT EXISTS "auth_challenges" ("challenge" text primary key, "type" text not null, "user_id" text, "data" text, "expires_at" text not null, "created_at" text default (datetime('now')));
INSERT INTO "auth_challenges" ("challenge","type","user_id","data","expires_at","created_at") VALUES('led4rKl2I3IPz16nAB12p3HHup8GcP9oO0RNW95cJgk','registration','setup-1775475214857',NULL,'2026-04-06T11:38:34.857Z','2026-04-06 11:33:34');
INSERT INTO "auth_challenges" ("challenge","type","user_id","data","expires_at","created_at") VALUES('IzhX9hKpB-U3RU1SpPCyArfA0m1d0YZYVJZ8D4IQtyo','authentication',NULL,NULL,'2026-04-06T11:39:08.214Z','2026-04-06 11:34:08');
CREATE TABLE IF NOT EXISTS "_emdash_sections" ("id" text primary key, "slug" text not null unique, "title" text not null, "description" text, "keywords" text, "content" text not null, "preview_media_id" text, "source" text default 'user' not null, "theme_id" text, "created_at" text default CURRENT_TIMESTAMP, "updated_at" text default CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "_emdash_api_tokens" ("id" text primary key, "name" text not null, "token_hash" text not null unique, "prefix" text not null, "user_id" text not null, "scopes" text not null, "expires_at" text, "last_used_at" text, "created_at" text default (datetime('now')), constraint "api_tokens_user_fk" foreign key ("user_id") references "users" ("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "_emdash_oauth_tokens" ("token_hash" text primary key, "token_type" text not null, "user_id" text not null, "scopes" text not null, "client_type" text default 'cli' not null, "expires_at" text not null, "refresh_token_hash" text, "created_at" text default (datetime('now')), client_id TEXT, constraint "oauth_tokens_user_fk" foreign key ("user_id") references "users" ("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "_emdash_device_codes" ("device_code" text primary key, "user_code" text not null unique, "scopes" text not null, "user_id" text, "status" text default 'pending' not null, "expires_at" text not null, "interval" integer default 5 not null, "created_at" text default (datetime('now')), "last_polled_at" text);
CREATE TABLE IF NOT EXISTS "_emdash_authorization_codes" ("code_hash" text primary key, "client_id" text not null, "redirect_uri" text not null, "user_id" text not null, "scopes" text not null, "code_challenge" text not null, "code_challenge_method" text default 'S256' not null, "resource" text, "expires_at" text not null, "created_at" text default (datetime('now')), constraint "auth_codes_user_fk" foreign key ("user_id") references "users" ("id") on delete cascade);
CREATE TABLE IF NOT EXISTS "_emdash_seo" ("collection" text not null, "content_id" text not null, "seo_title" text, "seo_description" text, "seo_image" text, "seo_canonical" text, "seo_no_index" integer default 0 not null, "created_at" text default (datetime('now')) not null, "updated_at" text default (datetime('now')) not null, constraint "_emdash_seo_pk" primary key ("collection", "content_id"));
CREATE TABLE IF NOT EXISTS "_emdash_oauth_clients" ("id" text primary key, "name" text not null, "redirect_uris" text not null, "scopes" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')));
CREATE TABLE IF NOT EXISTS "_emdash_cron_tasks" ("id" text primary key, "plugin_id" text not null, "task_name" text not null, "schedule" text not null, "is_oneshot" integer default 0 not null, "data" text, "next_run_at" text not null, "last_run_at" text, "status" text default 'idle' not null, "locked_at" text, "enabled" integer default 1 not null, "created_at" text default (datetime('now')), constraint "uq_cron_tasks_plugin_task" unique ("plugin_id", "task_name"));
CREATE TABLE IF NOT EXISTS "_emdash_comments" ("id" text primary key, "collection" text not null, "content_id" text not null, "parent_id" text references "_emdash_comments" ("id") on delete cascade, "author_name" text not null, "author_email" text not null, "author_user_id" text references "users" ("id") on delete set null, "body" text not null, "status" text default 'pending' not null, "ip_hash" text, "user_agent" text, "moderation_metadata" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')));
CREATE TABLE IF NOT EXISTS "_emdash_redirects" ("id" text primary key, "source" text not null, "destination" text not null, "type" integer default 301 not null, "is_pattern" integer default 0 not null, "enabled" integer default 1 not null, "hits" integer default 0 not null, "last_hit_at" text, "group_name" text, "auto" integer default 0 not null, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')));
CREATE TABLE IF NOT EXISTS "_emdash_404_log" ("id" text primary key, "path" text not null, "referrer" text, "user_agent" text, "ip" text, "created_at" text default (datetime('now')));
CREATE TABLE IF NOT EXISTS "_emdash_bylines" ("id" text primary key, "slug" text not null unique, "display_name" text not null, "bio" text, "avatar_media_id" text references "media" ("id") on delete set null, "website_url" text, "user_id" text references "users" ("id") on delete set null, "is_guest" integer default 0 not null, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')));
CREATE TABLE IF NOT EXISTS "_emdash_content_bylines" ("id" text primary key, "collection_slug" text not null, "content_id" text not null, "byline_id" text not null references "_emdash_bylines" ("id") on delete cascade, "sort_order" integer default 0 not null, "role_label" text, "created_at" text default (datetime('now')), constraint "content_bylines_unique" unique ("collection_slug", "content_id", "byline_id"));
CREATE TABLE IF NOT EXISTS "_emdash_rate_limits" ("key" text not null, "window" text not null, "count" integer default 1 not null, constraint "pk_rate_limits" primary key ("key", "window"));
INSERT INTO "_emdash_rate_limits" ("key","window","count") VALUES('2001:4455:165:b00:20ed:8a7d:3342:474d:passkey/options','2026-04-06T11:33:00.000Z',1);
INSERT INTO "_emdash_rate_limits" ("key","window","count") VALUES('2001:4455:165:b00:20ed:8a7d:3342:474d:passkey/options','2026-04-06T11:34:00.000Z',1);
CREATE TABLE IF NOT EXISTS "ec_testimonials" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "name" TEXT, "quote" TEXT, "role" TEXT, constraint "ec_testimonials_slug_locale_unique" unique ("slug", "locale"));
CREATE TABLE IF NOT EXISTS "ec_faqs" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "question" TEXT, "answer" TEXT, constraint "ec_faqs_slug_locale_unique" unique ("slug", "locale"));
CREATE TABLE IF NOT EXISTS "ec_services" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "title" TEXT, "description" TEXT, "duration" TEXT, "format" TEXT, "price" TEXT, "sort_order" REAL, constraint "ec_services_slug_locale_unique" unique ("slug", "locale"));
CREATE TABLE IF NOT EXISTS "ec_form_submissions" ("id" text primary key, "slug" text, "status" text default 'draft', "author_id" text, "primary_byline_id" text, "created_at" text default (datetime('now')), "updated_at" text default (datetime('now')), "published_at" text, "scheduled_at" text, "deleted_at" text, "version" integer default 1, "live_revision_id" text references "revisions" ("id"), "draft_revision_id" text references "revisions" ("id"), "locale" text default 'en' not null, "translation_group" text, "title" TEXT, "name" TEXT, "email" TEXT, "phone" TEXT, "message" TEXT, "read_status" TEXT, constraint "ec_form_submissions_slug_locale_unique" unique ("slug", "locale"));
CREATE INDEX "idx_revisions_entry" on "revisions" ("collection", "entry_id");
CREATE INDEX "idx_taxonomies_name" on "taxonomies" ("name");
CREATE INDEX "idx_media_content_hash" on "media" ("content_hash");
CREATE INDEX "idx_audit_actor" on "audit_logs" ("actor_id");
CREATE INDEX "idx_audit_action" on "audit_logs" ("action");
CREATE INDEX "idx_audit_timestamp" on "audit_logs" ("timestamp");
CREATE INDEX "idx_media_status" on "media" ("status");
CREATE UNIQUE INDEX "idx_fields_collection_slug" on "_emdash_fields" ("collection_id", "slug");
CREATE INDEX "idx_fields_collection" on "_emdash_fields" ("collection_id");
CREATE INDEX "idx_fields_sort" on "_emdash_fields" ("collection_id", "sort_order");
CREATE INDEX "idx_plugin_storage_list" on "_plugin_storage" ("plugin_id", "collection", "created_at");
CREATE INDEX "idx_menu_items_menu" on "_emdash_menu_items" ("menu_id", "sort_order");
CREATE INDEX "idx_menu_items_parent" on "_emdash_menu_items" ("parent_id");
CREATE INDEX "idx_widgets_area" on "_emdash_widgets" ("area_id", "sort_order");
CREATE INDEX "idx_users_email" on "users" ("email");
CREATE INDEX "idx_credentials_user" on "credentials" ("user_id");
CREATE INDEX "idx_auth_tokens_email" on "auth_tokens" ("email");
CREATE INDEX "idx_oauth_accounts_user" on "oauth_accounts" ("user_id");
CREATE INDEX "idx_auth_challenges_expires" on "auth_challenges" ("expires_at");
CREATE INDEX "idx_users_disabled" on "users" ("disabled");
CREATE INDEX "idx_sections_source" on "_emdash_sections" ("source");
CREATE INDEX "idx_media_mime_type" on "media" ("mime_type");
CREATE INDEX "idx_media_filename" on "media" ("filename");
CREATE INDEX "idx_media_created_at" on "media" ("created_at");
CREATE INDEX "idx_content_taxonomies_term" on "content_taxonomies" ("taxonomy_id");
CREATE INDEX "idx_taxonomies_parent" on "taxonomies" ("parent_id");
CREATE INDEX "idx_audit_resource" on "audit_logs" ("resource_type", "resource_id");
CREATE INDEX "idx_api_tokens_token_hash" on "_emdash_api_tokens" ("token_hash");
CREATE INDEX "idx_api_tokens_user_id" on "_emdash_api_tokens" ("user_id");
CREATE INDEX "idx_oauth_tokens_user_id" on "_emdash_oauth_tokens" ("user_id");
CREATE INDEX "idx_oauth_tokens_expires" on "_emdash_oauth_tokens" ("expires_at");
CREATE INDEX "idx_auth_codes_expires" on "_emdash_authorization_codes" ("expires_at");
CREATE INDEX idx_emdash_seo_collection
		ON _emdash_seo (collection)
	;
CREATE INDEX idx_plugin_state_source
		ON _plugin_state (source)
		WHERE source = 'marketplace'
	;
CREATE INDEX "idx_cron_tasks_due" on "_emdash_cron_tasks" ("enabled", "status", "next_run_at");
CREATE INDEX "idx_cron_tasks_plugin" on "_emdash_cron_tasks" ("plugin_id");
CREATE INDEX "idx_comments_content" on "_emdash_comments" ("collection", "content_id", "status");
CREATE INDEX "idx_comments_parent" on "_emdash_comments" ("parent_id");
CREATE INDEX "idx_comments_status" on "_emdash_comments" ("status", "created_at");
CREATE INDEX "idx_comments_author_email" on "_emdash_comments" ("author_email");
CREATE INDEX "idx_comments_author_user" on "_emdash_comments" ("author_user_id");
CREATE INDEX "idx_redirects_source" on "_emdash_redirects" ("source");
CREATE INDEX "idx_redirects_enabled" on "_emdash_redirects" ("enabled");
CREATE INDEX "idx_redirects_group" on "_emdash_redirects" ("group_name");
CREATE INDEX "idx_404_log_path" on "_emdash_404_log" ("path");
CREATE INDEX "idx_404_log_created" on "_emdash_404_log" ("created_at");
CREATE UNIQUE INDEX "idx_bylines_user_id_unique"
		ON "_emdash_bylines" (user_id)
		WHERE user_id IS NOT NULL
	;
CREATE INDEX "idx_bylines_slug" on "_emdash_bylines" ("slug");
CREATE INDEX "idx_bylines_display_name" on "_emdash_bylines" ("display_name");
CREATE INDEX "idx_content_bylines_content" on "_emdash_content_bylines" ("collection_slug", "content_id", "sort_order");
CREATE INDEX "idx_content_bylines_byline" on "_emdash_content_bylines" ("byline_id");
CREATE INDEX "idx_rate_limits_window" on "_emdash_rate_limits" ("window");
CREATE INDEX "idx_ec_testimonials_status" 
			ON "ec_testimonials" (status)
		;
CREATE INDEX "idx_ec_testimonials_slug" 
			ON "ec_testimonials" (slug)
		;
CREATE INDEX "idx_ec_testimonials_created" 
			ON "ec_testimonials" (created_at)
		;
CREATE INDEX "idx_ec_testimonials_deleted" 
			ON "ec_testimonials" (deleted_at)
		;
CREATE INDEX "idx_ec_testimonials_scheduled" 
			ON "ec_testimonials" (scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX "idx_ec_testimonials_live_revision" 
			ON "ec_testimonials" (live_revision_id)
		;
CREATE INDEX "idx_ec_testimonials_draft_revision" 
			ON "ec_testimonials" (draft_revision_id)
		;
CREATE INDEX "idx_ec_testimonials_author" 
			ON "ec_testimonials" (author_id)
		;
CREATE INDEX "idx_ec_testimonials_primary_byline" 
			ON "ec_testimonials" (primary_byline_id)
		;
CREATE INDEX "idx_ec_testimonials_updated" 
			ON "ec_testimonials" (updated_at)
		;
CREATE INDEX "idx_ec_testimonials_locale" 
			ON "ec_testimonials" (locale)
		;
CREATE INDEX "idx_ec_testimonials_translation_group" 
			ON "ec_testimonials" (translation_group)
		;
CREATE INDEX "idx_ec_faqs_status" 
			ON "ec_faqs" (status)
		;
CREATE INDEX "idx_ec_faqs_slug" 
			ON "ec_faqs" (slug)
		;
CREATE INDEX "idx_ec_faqs_created" 
			ON "ec_faqs" (created_at)
		;
CREATE INDEX "idx_ec_faqs_deleted" 
			ON "ec_faqs" (deleted_at)
		;
CREATE INDEX "idx_ec_faqs_scheduled" 
			ON "ec_faqs" (scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX "idx_ec_faqs_live_revision" 
			ON "ec_faqs" (live_revision_id)
		;
CREATE INDEX "idx_ec_faqs_draft_revision" 
			ON "ec_faqs" (draft_revision_id)
		;
CREATE INDEX "idx_ec_faqs_author" 
			ON "ec_faqs" (author_id)
		;
CREATE INDEX "idx_ec_faqs_primary_byline" 
			ON "ec_faqs" (primary_byline_id)
		;
CREATE INDEX "idx_ec_faqs_updated" 
			ON "ec_faqs" (updated_at)
		;
CREATE INDEX "idx_ec_faqs_locale" 
			ON "ec_faqs" (locale)
		;
CREATE INDEX "idx_ec_faqs_translation_group" 
			ON "ec_faqs" (translation_group)
		;
CREATE INDEX "idx_ec_services_status" 
			ON "ec_services" (status)
		;
CREATE INDEX "idx_ec_services_slug" 
			ON "ec_services" (slug)
		;
CREATE INDEX "idx_ec_services_created" 
			ON "ec_services" (created_at)
		;
CREATE INDEX "idx_ec_services_deleted" 
			ON "ec_services" (deleted_at)
		;
CREATE INDEX "idx_ec_services_scheduled" 
			ON "ec_services" (scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX "idx_ec_services_live_revision" 
			ON "ec_services" (live_revision_id)
		;
CREATE INDEX "idx_ec_services_draft_revision" 
			ON "ec_services" (draft_revision_id)
		;
CREATE INDEX "idx_ec_services_author" 
			ON "ec_services" (author_id)
		;
CREATE INDEX "idx_ec_services_primary_byline" 
			ON "ec_services" (primary_byline_id)
		;
CREATE INDEX "idx_ec_services_updated" 
			ON "ec_services" (updated_at)
		;
CREATE INDEX "idx_ec_services_locale" 
			ON "ec_services" (locale)
		;
CREATE INDEX "idx_ec_services_translation_group" 
			ON "ec_services" (translation_group)
		;
CREATE INDEX "idx_ec_form_submissions_status" 
			ON "ec_form_submissions" (status)
		;
CREATE INDEX "idx_ec_form_submissions_slug" 
			ON "ec_form_submissions" (slug)
		;
CREATE INDEX "idx_ec_form_submissions_created" 
			ON "ec_form_submissions" (created_at)
		;
CREATE INDEX "idx_ec_form_submissions_deleted" 
			ON "ec_form_submissions" (deleted_at)
		;
CREATE INDEX "idx_ec_form_submissions_scheduled" 
			ON "ec_form_submissions" (scheduled_at)
			WHERE scheduled_at IS NOT NULL
		;
CREATE INDEX "idx_ec_form_submissions_live_revision" 
			ON "ec_form_submissions" (live_revision_id)
		;
CREATE INDEX "idx_ec_form_submissions_draft_revision" 
			ON "ec_form_submissions" (draft_revision_id)
		;
CREATE INDEX "idx_ec_form_submissions_author" 
			ON "ec_form_submissions" (author_id)
		;
CREATE INDEX "idx_ec_form_submissions_primary_byline" 
			ON "ec_form_submissions" (primary_byline_id)
		;
CREATE INDEX "idx_ec_form_submissions_updated" 
			ON "ec_form_submissions" (updated_at)
		;
CREATE INDEX "idx_ec_form_submissions_locale" 
			ON "ec_form_submissions" (locale)
		;
CREATE INDEX "idx_ec_form_submissions_translation_group" 
			ON "ec_form_submissions" (translation_group)
		;
