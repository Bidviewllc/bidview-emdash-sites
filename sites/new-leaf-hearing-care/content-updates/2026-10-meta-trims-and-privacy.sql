-- New Leaf Hearing Care: ClickUp 868mn3q1x. Privacy policy site name, and meta descriptions back under 155 characters.
-- Wording as set out by Marefe Mancha in the task comment 2026-10-28. Each statement only runs if the exact stored text is still there.
-- /about/ and /contact-us/ are code pages (src/pages/about.astro and contact-us.astro), changed in the same PR.
-- Apply AFTER the PR is merged:  npx wrangler d1 execute new-leaf-hearing-care-db --remote --file content-updates/2026-10-meta-trims-and-privacy.sql

-- privacy-policy: opening sentence names the right site
UPDATE ec_internal_pages SET intro_content=replace(intro_content,'https://columbinecares.com/','https://newleafhearing.com/') WHERE slug='privacy-policy' AND instr(intro_content,'https://columbinecares.com/')>0;

-- privacy-policy: meta description
UPDATE ec_internal_pages SET meta_description='Learn how New Leaf Hearing Care collects, uses, and protects your personal information. Read our privacy policy for details on rights and data security.' WHERE slug='privacy-policy' AND meta_description='Learn how New Leaf Hearing Care collects, uses, and protects your personal information. Read our privacy policy for full details on your rights and data security.';

-- audiologist/lisa-marie-bell: meta description
UPDATE ec_team SET meta_description='Lisa Marie Davis Bell, Au.D. is an audiologist providing hearing aids, hearing tests, and hearing care services in Arvada, CO and Littleton, CO.' WHERE slug='audiologist/lisa-marie-bell' AND meta_description='Lisa Marie Davis Bell, Au.D. is an audiologist providing hearing aids, hearing tests, and professional hearing care services in Arvada, CO and Littleton, CO.';

-- patient-care-coordinator/rose-young: meta description
UPDATE ec_team SET meta_description='Meet Rose Young, Patient Care Coordinator in Arvada & Littleton, CO helping you feel seen, heard, and comfortable from your first visit.' WHERE slug='patient-care-coordinator/rose-young' AND meta_description='Meet Rose Young, Patient Care Coordinator at New Leaf Hearing Care in Arvada & Littleton, CO — helping you feel seen, heard, and comfortable from your first visit.';

-- is-sleeping-with-earplugs-bad: meta description
UPDATE ec_blog_posts SET meta_description='Is sleeping with earplugs bad? Learn when earplug use may be appropriate, how fit and hygiene matter, and when an audiologist should check your ears.' WHERE slug='is-sleeping-with-earplugs-bad' AND meta_description='Is sleeping with earplugs bad? Learn when overnight earplug use may be appropriate, how fit and hygiene matter, and when an audiologist should check your ears.';
