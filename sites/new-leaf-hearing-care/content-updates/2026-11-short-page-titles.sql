-- New Leaf Hearing Care: ClickUp 868mqpmxm. Short page titles on 15 pages, wording as approved by Marefe Mancha on the task, 2026-11-04.
-- The Arvada and Littleton location pages are code pages (src/pages), changed in the same PR.
-- Each statement only runs if the exact stored title is still there.
-- Apply AFTER the PR is merged:  npx wrangler d1 execute new-leaf-hearing-care-db --remote --file content-updates/2026-11-short-page-titles.sql

UPDATE ec_internal_pages SET meta_title='Hearing Loss Testing & Treatment | New Leaf Hearing Care' WHERE slug='hearing-loss' AND meta_title='Hearing Loss in Arvada & Littleton, CO: Testing, Treatment, and Support | New Leaf Hearing Care';
UPDATE ec_team SET meta_title='Dusty Jessen, Au.D., Audiologist | New Leaf Hearing Care' WHERE slug='audiologist/dusty-jessen' AND meta_title='Dr. Dusty Jessen, Au.D. | Audiologist in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Tinnitus Evaluation & Management | New Leaf Hearing Care' WHERE slug='audiology-services/tinnitus-evaluation-management' AND meta_title='Tinnitus Evaluation and Management in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Hearing Aid Repairs & Maintenance | New Leaf Hearing Care' WHERE slug='hearing-aids-products/hearing-aid-repairs-maintenance' AND meta_title='Hearing Aid Repairs in Arvada & Littleton, CO | Fast Help at New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Communication Training Program | New Leaf Hearing Care' WHERE slug='audiology-services/communication-training-program' AND meta_title='Communication Training Program in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Hearing Tests & Assessments | New Leaf Hearing Care' WHERE slug='audiology-services/hearing-assessments' AND meta_title='Hearing Tests & Evaluations in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Custom Earmolds | New Leaf Hearing Care' WHERE slug='audiology-services/custom-earmolds' AND meta_title='Custom Earmolds & Earplugs in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Hearing Aids & Products | New Leaf Hearing Care' WHERE slug='hearing-aids-products' AND meta_title='Hearing Aids & Products in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_hearing_aids SET meta_title='ReSound Hearing Aids | New Leaf Hearing Care' WHERE slug='resound-hearing-aids' AND meta_title='ReSound Hearing Aids in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Hearing Aid Services | New Leaf Hearing Care' WHERE slug='hearing-aid-services' AND meta_title='Hearing Aid Services in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_hearing_aids SET meta_title='Oticon Hearing Aids | New Leaf Hearing Care' WHERE slug='oticon-hearing-aids' AND meta_title='Oticon Hearing Aids in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_hearing_aids SET meta_title='Phonak Hearing Aids | New Leaf Hearing Care' WHERE slug='phonak-hearing-aids' AND meta_title='Phonak Hearing Aids in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_team SET meta_title='Julie Raney, M.S., Audiologist | New Leaf Hearing Care' WHERE slug='audiologist/julie-raney' AND meta_title='Julie Raney, M.S. | Audiologist in Arvada, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='Audiology Services | New Leaf Hearing Care' WHERE slug='audiology-services' AND meta_title='Audiology Services in Arvada & Littleton, CO | New Leaf Hearing Care';
UPDATE ec_internal_pages SET meta_title='LACE AI Pro Auditory Training | New Leaf Hearing Care' WHERE slug='audiology-services/lace-ai-pro-auditory-training' AND meta_title='LACE AI Pro in Arvada & Littleton, CO | New Leaf Hearing Care';
