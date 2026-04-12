-- Seed entries for AudiologistDirectory emdash CMS
-- Generated from seed.json — 35 entries across 8 collections

-- ============================================================
-- ec_pages (7 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_pages (id, slug, status, created_at, updated_at, published_at, page_key, badge, headline, subheadline, body, cta_text, cta_link)
VALUES ('homepage-hero', 'homepage-hero', 'published', datetime('now'), datetime('now'), datetime('now'),
  'homepage_hero',
  'TRUSTED DIRECTORY · 4,900+ PRACTICES',
  'Find an audiologist you can trust.',
  'Browse verified audiology practices across all 50 states. Compare providers, hearing aid brands, specializations, and insurance — all in one place.',
  '',
  'Find Audiologists Near Me',
  '/search');

INSERT OR REPLACE INTO ec_pages (id, slug, status, created_at, updated_at, published_at, page_key, badge, headline, subheadline, body, cta_text, cta_link)
VALUES ('homepage-trust', 'homepage-trust', 'published', datetime('now'), datetime('now'), datetime('now'),
  'homepage_trust',
  '',
  'Verified data, not paid placements',
  '',
  'Unlike other directories, AudiologistDirectory.com does not accept payments to boost practice rankings. Our listing order is determined solely by location relevance and specialization match. We believe in providing transparent, clinical-first data to help you make the best decision for your hearing health.',
  'Read our Methodology',
  '/methodology');

INSERT OR REPLACE INTO ec_pages (id, slug, status, created_at, updated_at, published_at, page_key, badge, headline, subheadline, body, cta_text, cta_link)
VALUES ('homepage-how-heading', 'homepage-how-heading', 'published', datetime('now'), datetime('now'), datetime('now'),
  'homepage_how_heading',
  '',
  'How AudiologistDirectory works',
  '',
  '',
  '',
  '');

INSERT OR REPLACE INTO ec_pages (id, slug, status, created_at, updated_at, published_at, page_key, badge, headline, subheadline, body, cta_text, cta_link)
VALUES ('browse-states-hero', 'browse-states-hero', 'published', datetime('now'), datetime('now'), datetime('now'),
  'browse_states_hero',
  '50 STATES · 4,943 PRACTICES',
  'Browse audiologists by state',
  'Select your state below to see verified audiology practices, providers, and hearing aid specialists in your area.',
  '',
  '',
  '');

INSERT OR REPLACE INTO ec_pages (id, slug, status, created_at, updated_at, published_at, page_key, badge, headline, subheadline, body, cta_text, cta_link)
VALUES ('brands-hero', 'brands-hero', 'published', datetime('now'), datetime('now'), datetime('now'),
  'brands_hero',
  'HEARING AID BRANDS',
  'Find practices that carry your preferred brand',
  'Compare the top hearing aid manufacturers and find certified dispensing practices near you.',
  '',
  '',
  '');

INSERT OR REPLACE INTO ec_pages (id, slug, status, created_at, updated_at, published_at, page_key, badge, headline, subheadline, body, cta_text, cta_link)
VALUES ('resources-hero', 'resources-hero', 'published', datetime('now'), datetime('now'), datetime('now'),
  'resources_hero',
  'RESOURCES · CLINICAL GUIDES',
  'Learn about hearing care',
  'Plain-English guides on hearing health, hearing aids, tinnitus, and what to expect from an audiology visit.',
  '',
  '',
  '');

INSERT OR REPLACE INTO ec_pages (id, slug, status, created_at, updated_at, published_at, page_key, badge, headline, subheadline, body, cta_text, cta_link)
VALUES ('list-practice-hero', 'list-practice-hero', 'published', datetime('now'), datetime('now'), datetime('now'),
  'list_practice_hero',
  'FOR PRACTICE OWNERS · FREE LISTING',
  'List your audiology practice',
  'Reach the thousands of adults searching for trusted hearing care every month. Claim or add your practice to our verified directory in under 10 minutes.',
  '',
  'Claim your listing',
  '#claim-form');

-- ============================================================
-- ec_stats (4 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_stats (id, slug, status, created_at, updated_at, published_at, page_key, number, label, icon, sort_order)
VALUES ('stat-practices', 'stat-practices', 'published', datetime('now'), datetime('now'), datetime('now'),
  'homepage', '4,943', 'Verified Practices', 'verified_user', 1);

INSERT OR REPLACE INTO ec_stats (id, slug, status, created_at, updated_at, published_at, page_key, number, label, icon, sort_order)
VALUES ('stat-states', 'stat-states', 'published', datetime('now'), datetime('now'), datetime('now'),
  'homepage', '50', 'States Covered', 'map', 2);

INSERT OR REPLACE INTO ec_stats (id, slug, status, created_at, updated_at, published_at, page_key, number, label, icon, sort_order)
VALUES ('stat-reviews', 'stat-reviews', 'published', datetime('now'), datetime('now'), datetime('now'),
  'homepage', '12k+', 'Patient Reviews', 'reviews', 3);

INSERT OR REPLACE INTO ec_stats (id, slug, status, created_at, updated_at, published_at, page_key, number, label, icon, sort_order)
VALUES ('stat-specs', 'stat-specs', 'published', datetime('now'), datetime('now'), datetime('now'),
  'homepage', '28', 'Specializations', 'medical_services', 4);

-- ============================================================
-- ec_how_it_works (3 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_how_it_works (id, slug, status, created_at, updated_at, published_at, step_number, icon, title, description)
VALUES ('step-search', 'step-search', 'published', datetime('now'), datetime('now'), datetime('now'),
  1, 'search', 'Search', 'Enter your zip code or city to see a curated list of audiology practices in your local area.');

INSERT OR REPLACE INTO ec_how_it_works (id, slug, status, created_at, updated_at, published_at, step_number, icon, title, description)
VALUES ('step-filter', 'step-filter', 'published', datetime('now'), datetime('now'), datetime('now'),
  2, 'filter_list', 'Filter', 'Refine your search by hearing aid brands, insurance providers, and clinical specializations.');

INSERT OR REPLACE INTO ec_how_it_works (id, slug, status, created_at, updated_at, published_at, step_number, icon, title, description)
VALUES ('step-contact', 'step-contact', 'published', datetime('now'), datetime('now'), datetime('now'),
  3, 'chat_bubble', 'Contact', 'Connect directly with practices via phone or website to schedule your consultation.');

-- ============================================================
-- ec_specializations (4 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_specializations (id, slug, status, created_at, updated_at, published_at, icon, title, description, slug_path, sort_order)
VALUES ('spec-tinnitus', 'spec-tinnitus', 'published', datetime('now'), datetime('now'), datetime('now'),
  'hearing', 'Tinnitus', 'Expert management for ringing in the ears and sound sensitivity.', '/tinnitus-specialists', 1);

INSERT OR REPLACE INTO ec_specializations (id, slug, status, created_at, updated_at, published_at, icon, title, description, slug_path, sort_order)
VALUES ('spec-pediatric', 'spec-pediatric', 'published', datetime('now'), datetime('now'), datetime('now'),
  'child_care', 'Pediatric', 'Specialized hearing services for infants, children, and adolescents.', '/pediatric-specialists', 2);

INSERT OR REPLACE INTO ec_specializations (id, slug, status, created_at, updated_at, published_at, icon, title, description, slug_path, sort_order)
VALUES ('spec-cochlear', 'spec-cochlear', 'published', datetime('now'), datetime('now'), datetime('now'),
  'earbuds', 'Cochlear', 'Evaluation and mapping for advanced implantable hearing technology.', '/cochlear-specialists', 3);

INSERT OR REPLACE INTO ec_specializations (id, slug, status, created_at, updated_at, published_at, icon, title, description, slug_path, sort_order)
VALUES ('spec-vestibular', 'spec-vestibular', 'published', datetime('now'), datetime('now'), datetime('now'),
  'balance', 'Vestibular', 'Diagnosis and treatment for balance disorders and dizziness.', '/vestibular-specialists', 4);

-- ============================================================
-- ec_brands (8 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-oticon', 'brand-oticon', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Oticon', 'Danish engineering, BrainHearing technology', '/brands/oticon', 1);

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-phonak', 'brand-phonak', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Phonak', 'Swiss-engineered audiology', '/brands/phonak', 2);

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-starkey', 'brand-starkey', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Starkey', 'American-made with AI features', '/brands/starkey', 3);

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-resound', 'brand-resound', 'published', datetime('now'), datetime('now'), datetime('now'),
  'ReSound', 'Direct iPhone streaming pioneer', '/brands/resound', 4);

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-widex', 'brand-widex', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Widex', 'Natural sound, zero delay', '/brands/widex', 5);

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-signia', 'brand-signia', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Signia', 'Own Voice Processing', '/brands/signia', 6);

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-unitron', 'brand-unitron', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Unitron', 'Personalized hearing solutions', '/brands/unitron', 7);

INSERT OR REPLACE INTO ec_brands (id, slug, status, created_at, updated_at, published_at, name, tagline, slug_path, sort_order)
VALUES ('brand-bernafon', 'brand-bernafon', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Bernafon', 'Swiss precision audiology', '/brands/bernafon', 8);

-- ============================================================
-- ec_resources (3 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_resources (id, slug, status, created_at, updated_at, published_at, tag, title, blurb, image_url, slug_path, sort_order)
VALUES ('resource-first-appointment', 'resource-first-appointment', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Clinical Guide',
  'What to expect at your first audiology appointment',
  'A step-by-step guide to hearing evaluations, from history-taking to diagnostic testing.',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC17XFnmrjB9acxknEoys6zb7b3bRYlKolJbO4HOj0PSP2ZxQfGXUasT_rgFy6lw2EYt_cBKCKmJAMLO6nJZscKIEWUkzH-11Pfbwp_HPfvPeWbAtEkjo8slEqk4i25ag6n7lhCPnvE8mofUt2k91oiy66U5eGXkVAy8KTdTgU9rKjlUd1jVBAhgncdIEmueADJhKjUQALl88Z55LNWf3Vy6Mmci_tV8oyFIwXnVyagMkICJ_EMGEbCFnBLh3f72cP4Z83u7JYzqoc',
  '/resources/first-appointment', 1);

INSERT OR REPLACE INTO ec_resources (id, slug, status, created_at, updated_at, published_at, tag, title, blurb, image_url, slug_path, sort_order)
VALUES ('resource-rechargeable-vs-battery', 'resource-rechargeable-vs-battery', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Technology',
  'Comparing rechargeable vs. battery hearing aids',
  'An honest look at the pros and cons of modern power solutions for hearing technology.',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBM8YVJc4AJn_kHbajb-IwlB8LqNCvx3JRIBm8NbcFggVOToRYU6SyPHwlU8Pe9n-4QNg_Jiiw13clv8Qxc-By0483vksBDDI2LlQ-fFaAnoUXIhS8ci21evtqQ_JWEl71Zb-EB_05lEyytowv0-LqjA7Fa_OZ1IZAouV6FmfcliK17jrPNXNV-KPwLVpYcO6F5SbbbJcbr57t2EYfT60d58RUo9nyuXPlx5NQ83dylFYhBIMdixLVwhEaFBo-MBH37iViSLgAzy7k',
  '/resources/rechargeable-vs-battery', 2);

INSERT OR REPLACE INTO ec_resources (id, slug, status, created_at, updated_at, published_at, tag, title, blurb, image_url, slug_path, sort_order)
VALUES ('resource-tinnitus-therapy', 'resource-tinnitus-therapy', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Tinnitus',
  'New breakthroughs in tinnitus sound therapy',
  'Recent clinical research on sound masking and cognitive habituation for ringing ears.',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB7B1vbUX_MT_FPpM0KwIgLuPc5ej4dMe-wv6RokNpQOq5FMdTM3S8-RH9dPQJfvUUJlOEb_1_TjhXXqqgGfFpC7RGfvsmp5cEu82UTBiEIiXplxBf_x1yrFudN-_eQ9FvSUT84CQTHqgLjaJiSuZOSgvxDRsYryNmxp4Eda17eUSOVMifWkS3X0MLuR8fvfkStkIrR2fel1uTRSLwU-DS26mxP3pDhtTJEpVlUmOUP78lwiM5O0rNTwKtcEfVeF5lBbAtUwuLubKg',
  '/resources/tinnitus-therapy', 3);

-- ============================================================
-- ec_faqs (5 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_faqs (id, slug, status, created_at, updated_at, published_at, question, answer, scope, sort_order)
VALUES ('faq-what-is-audiologist', 'faq-what-is-audiologist', 'published', datetime('now'), datetime('now'), datetime('now'),
  'What does an audiologist do?',
  'An audiologist is a healthcare professional who specializes in diagnosing and treating hearing and balance disorders. They hold a Doctor of Audiology (Au.D.) degree and are licensed to perform hearing evaluations, fit hearing aids, manage tinnitus, and provide cochlear implant services.',
  'global', 1);

INSERT OR REPLACE INTO ec_faqs (id, slug, status, created_at, updated_at, published_at, question, answer, scope, sort_order)
VALUES ('faq-cost', 'faq-cost', 'published', datetime('now'), datetime('now'), datetime('now'),
  'How much does a hearing test cost?',
  'A comprehensive hearing evaluation typically costs between $100 and $250 without insurance. Many insurance plans, including Medicare Part B, cover diagnostic hearing tests when ordered by a physician. Check with your specific provider for coverage details.',
  'global', 2);

INSERT OR REPLACE INTO ec_faqs (id, slug, status, created_at, updated_at, published_at, question, answer, scope, sort_order)
VALUES ('faq-hearing-aid-brands', 'faq-hearing-aid-brands', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Which hearing aid brand is best?',
  'The best hearing aid brand depends on your specific hearing loss, lifestyle, and budget. Major manufacturers like Oticon, Phonak, Starkey, ReSound, Widex, and Signia each have strengths in different areas. An audiologist can help you compare options based on your audiogram results and daily listening needs.',
  'global', 3);

INSERT OR REPLACE INTO ec_faqs (id, slug, status, created_at, updated_at, published_at, question, answer, scope, sort_order)
VALUES ('faq-insurance', 'faq-insurance', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Does insurance cover hearing aids?',
  'Coverage varies widely. Some private insurance plans include hearing aid benefits, typically $1,000–$2,500 per ear every 3–5 years. Medicare does not cover hearing aids but does cover diagnostic testing. Medicaid coverage varies by state. Many practices offer financing plans for out-of-pocket costs.',
  'global', 4);

INSERT OR REPLACE INTO ec_faqs (id, slug, status, created_at, updated_at, published_at, question, answer, scope, sort_order)
VALUES ('faq-tinnitus', 'faq-tinnitus', 'published', datetime('now'), datetime('now'), datetime('now'),
  'Can an audiologist help with tinnitus?',
  'Yes. Audiologists trained in tinnitus management can provide sound therapy, cognitive behavioral strategies, and hearing aid-based tinnitus masking. Many practices in our directory list tinnitus as a specialization — use the specialization filter to find providers near you.',
  'global', 5);

-- ============================================================
-- ec_landing_intros (2 entries)
-- ============================================================

INSERT OR REPLACE INTO ec_landing_intros (id, slug, status, created_at, updated_at, published_at, page_type, slug_match, heading, intro_prose)
VALUES ('intro-california', 'intro-california', 'published', datetime('now'), datetime('now'), datetime('now'),
  'state',
  'california',
  'Audiology Care Across the Golden State',
  'California leads the nation in audiology access, with nearly 500 verified practices spanning from San Diego to the Bay Area. The state''s diverse population drives demand for multilingual providers and culturally sensitive hearing care.

California audiologists are licensed by the Speech-Language Pathology and Audiology and Hearing Aid Dispensers Board. Most hold Doctor of Audiology (Au.D.) degrees from accredited programs including USC, UCSD, and San Jose State University.

Medi-Cal provides limited hearing aid coverage for adults, while children under 21 have broader benefits through EPSDT. Many California practices participate in major commercial networks including Kaiser Permanente, Blue Shield, and Anthem.');

INSERT OR REPLACE INTO ec_landing_intros (id, slug, status, created_at, updated_at, published_at, page_type, slug_match, heading, intro_prose)
VALUES ('intro-california-la', 'intro-california-la', 'published', datetime('now'), datetime('now'), datetime('now'),
  'city',
  'california/los-angeles',
  'Expert Hearing Care in the City of Angels',
  'Navigating the audiology landscape in Los Angeles requires understanding the diverse range of specialized clinics available, from world-renowned research institutes in Westwood to boutique private practices in Beverly Hills. With 87 verified locations, LA residents have access to some of the nation''s top diagnostic equipment and hearing aid technology.

Providers in the Los Angeles metropolitan area typically hold Doctor of Audiology (Au.D.) degrees and are licensed by the California Speech-Language Pathology and Audiology and Hearing Aid Dispensers Board. Many leading clinicians maintain dual certifications as both audiologists and hearing aid dispensers, ensuring a holistic approach to auditory rehabilitation.

Insurance coverage in Los Angeles is comprehensive, with a majority of providers participating in major networks including Kaiser Permanente, L.A. Care, and Blue Shield of California. Specialized veterans care is heavily concentrated near the VA West Los Angeles Medical Center, with over a dozen community care partners facilitating local treatment.');
