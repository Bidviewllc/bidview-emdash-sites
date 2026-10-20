-- Ontario Hearing Centers: internal links for the unindexed-posts task (ClickUp 868mjkr27) and the Greece audiologists page (ClickUp 868mjkr26).
-- Links and anchors as agreed with Marefe Mancha in the task comments 2026-10-20. Each statement only runs if its exact sentence is still in the stored page.
-- Apply AFTER the PR is merged:  npx wrangler d1 execute ontario-hearing-db --remote --file content-updates/2026-10-ontario-internal-links.sql

-- what-kind-of-hearing-loss-do-i-have: link "hearing loss due to exposure to loud noises" -> https://ontariohearing.com/is-hearing-loss-a-disability/
UPDATE ec_blog_posts SET content=replace(content,'are at risk of hearing loss due to exposure to loud noises. In short','are at risk of [hearing loss due to exposure to loud noises](https://ontariohearing.com/is-hearing-loss-a-disability/). In short') WHERE slug='what-kind-of-hearing-loss-do-i-have' AND instr(content,'are at risk of hearing loss due to exposure to loud noises. In short')>0;

-- best-way-to-clean-ears: link "risk of poking or injuring your ear" -> https://ontariohearing.com/ear-candles-are-they-any-good/
UPDATE ec_blog_posts SET content=replace(content,'You may also be at risk of poking or injuring your ear','You may also be at [risk of poking or injuring your ear](https://ontariohearing.com/ear-candles-are-they-any-good/)') WHERE slug='best-way-to-clean-ears' AND instr(content,'You may also be at risk of poking or injuring your ear')>0;

-- is-it-good-to-get-your-ears-professionally-cleaned: link "routine ear cleaning" -> https://ontariohearing.com/ear-candles-are-they-any-good/
UPDATE ec_blog_posts SET content=replace(content,'most individuals think that routine ear cleaning is needed.','most individuals think that [routine ear cleaning](https://ontariohearing.com/ear-candles-are-they-any-good/) is needed.') WHERE slug='is-it-good-to-get-your-ears-professionally-cleaned' AND instr(content,'most individuals think that routine ear cleaning is needed.')>0;

-- can-a-deaf-person-hear: link "severe or profound hearing loss" -> https://ontariohearing.com/is-hearing-loss-a-disability/
UPDATE ec_blog_posts SET content=replace(content,'The word deaf is often used for severe or profound hearing loss, but','The word deaf is often used for [severe or profound hearing loss](https://ontariohearing.com/is-hearing-loss-a-disability/), but') WHERE slug='can-a-deaf-person-hear' AND instr(content,'The word deaf is often used for severe or profound hearing loss, but')>0;

-- hearing-aids-in-greece-ny: link "Audiologists at Ontario Hearing Center" -> https://ontariohearing.com/audiologists-in-greece-ny/
UPDATE ec_location_pages SET content=replace(content,'Audiologists at Ontario Hearing Center are committed to guiding you','[Audiologists at Ontario Hearing Center](https://ontariohearing.com/audiologists-in-greece-ny/) are committed to guiding you') WHERE slug='hearing-aids-in-greece-ny' AND instr(content,'Audiologists at Ontario Hearing Center are committed to guiding you')>0;

-- hearing-tests-in-greece-ny: link "the audiologist" -> https://ontariohearing.com/audiologists-in-greece-ny/
UPDATE ec_location_pages SET content=replace(content,'After the tests, the audiologist will discuss the results with you.','After the tests, [the audiologist](https://ontariohearing.com/audiologists-in-greece-ny/) will discuss the results with you.') WHERE slug='hearing-tests-in-greece-ny' AND instr(content,'After the tests, the audiologist will discuss the results with you.')>0;

-- tinnitus-in-greece-ny: link "guidance of an audiologist" -> https://ontariohearing.com/audiologists-in-greece-ny/
UPDATE ec_location_pages SET content=replace(content,'seeking the guidance of an audiologist can be the first step','seeking the [guidance of an audiologist](https://ontariohearing.com/audiologists-in-greece-ny/) can be the first step') WHERE slug='tinnitus-in-greece-ny' AND instr(content,'seeking the guidance of an audiologist can be the first step')>0;
