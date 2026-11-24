-- REQ-0021: update the published CMS descriptions after merging this change.
-- The audiologist bio and resources index use the descriptions in source code.

UPDATE ec_blog_posts SET meta_description='Learn how to service hearing aids at home with a wax pick and brush, plus how to clean in-the-ear and behind-the-ear styles. Call Ontario Hearing Center.'
WHERE slug='how-to-service-hearing-aids' AND status='published' AND meta_description='Audiologists are trained on how to service hearing aids. If your hearing aids are not functioning normally, make sure to take them to a professional to avoid further issues or damage.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_brand_pages SET meta_description='Get Lyric hearing aids in Rochester, NY: 100% invisible, worn 24/7 for months, water resistant. Try a 30-day free trial. Call to schedule a fitting.'
WHERE slug='lyric-hearing-aids' AND status='published' AND meta_description='Lyric Hearing Aids are the preferred choice when it comes to invisible hearing aids. Ontario Hearing Center is an authorized provider of Lyric hearing aids in Rochester, NY.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_about_page SET meta_description='Book a hearing screening in Rochester with 3 doctoral audiologists at Ontario Hearing Center, on Monroe Avenue since 1956. Call to schedule a visit.'
WHERE slug='about' AND status='published' AND meta_description='Ontario Hearing Center is an audiology and hearing aid clinic with expert audiologists that provides comprehensive hearing care services, hearing tests, cochlear implants, and advanced hearing solutions in Brighton, Rochester, NY.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_service_pages SET meta_description='See how Ontario Hearing Center supports hearing missions in Zambia, the Middle East, Guatemala and Ecuador with Entheos Audiology. Donate hearing aids.'
WHERE slug='giving-back' AND status='published' AND meta_description='At Ontario Hearing Center, we''re more than just a hearing aid company. We''re committed to giving back to our local and global communities. That''s why we offer free hearing screenings and support missions trips around the world.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Learn why hearing tests matter, what an evaluation includes, from ear exam to audiogram, and how often to test. Schedule a hearing test in Rochester, NY.'
WHERE slug='importance-of-hearing-tests' AND status='published' AND meta_description='Learn the importance of hearing tests and how early detection protects communication and health. Schedule your hearing evaluation at Ontario Hearing Center today.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='See what a hearing aid clinic does and what happens at your first visit: hearing test, fitting options and follow-up care. Call to book in Rochester, NY.'
WHERE slug='what-is-a-hearing-aid-clinic-what-to-expect-before-your-first-visit' AND status='published' AND meta_description='Learn what a hearing aid clinic does, what to expect at your first visit, and how Ontario Hearing Care in Rochester, NY can help with testing, fittings, and adjustments.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_condition_pages SET meta_description='Sensorineural hearing loss causes about 90% of adult hearing loss. Learn the symptoms, degrees and treatment options. Book a hearing test in Rochester.'
WHERE slug='sensorineural-hearing-loss' AND status='published' AND meta_description='Sensorineural hearing loss is the most common type of hearing loss, caused by damage to the inner ear. Learn more about this type of hearing loss and how it can be treated.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Find out why voices sound muffled: high-frequency hearing loss makes consonants fade, so speech loses clarity. Book a hearing test in Rochester, NY.'
WHERE slug='sensorineural-hearing-loss-muffled-voices' AND status='published' AND meta_description='Voices sound muffled while everything else seems fine? Here''s what causes muffled speech, what it means for your hearing, and when to book a hearing test in Rochester, NY.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Hearing aids help people with dementia hear, not treat it. See what the ACHIEVE trial found, which styles suit memory loss. Call to book a hearing test.'
WHERE slug='hearing-aids-for-dementia' AND status='published' AND meta_description='Hearing aids help people with dementia hear. See what the research shows, which styles work, and what caregivers handle day to day. Ontario Hearing, Brighton, NY.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Compare the three types of hearing loss, sensorineural, conductive and mixed, and how each is treated. Call an audiologist in Rochester, NY today.'
WHERE slug='what-kind-of-hearing-loss-do-i-have' AND status='published' AND meta_description='Many people are unaware of or unfamiliar with the type of hearing loss they have and what steps they should take to manage it. In this blog post, we will discuss the different types of hearing loss, the various ways to address them, and why it''s essential to consult an audiologist.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Know when to wear a hearing aid: 7 signs, from missed words and loud TV to listening fatigue and tinnitus. Explore hearing aids in Rochester, NY.'
WHERE slug='when-should-you-wear-a-hearing-aid' AND status='published' AND meta_description='Learn when it''s time to wear a hearing aid. If you''re missing words in conversations, turning up the volume, or struggling in noisy places, a hearing aid can help. Read more to see if it''s right for you.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Yes, you can buy hearing aids over the counter. Compare OTC and prescription aids for fit, testing and follow-up, then book a hearing test in Rochester.'
WHERE slug='can-i-buy-hearing-aids-over-the-counter' AND status='published' AND meta_description='Wondering if you can buy hearing aids over the counter? Learn the differences between OTC and prescription hearing aids, and why a hearing test with an audiologist in Rochester, NY is still the best first step.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Compare the 5 main hearing tests: pure-tone, speech, tympanometry, OAE and ABR, and what each measures. Book a hearing test in Rochester, NY today.'
WHERE slug='what-are-the-types-of-hearing-tests' AND status='published' AND meta_description='Hearing loss can happen gradually, so it''s important to seek help from an audiologist before it becomes permanent. The results will show if you need further evaluation or if your hearing is normal.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='An audiologist tests your hearing, fits the device to your ear and adjusts it over time, which OTC aids skip. Call Ontario Hearing Center in Rochester.'
WHERE slug='is-it-better-to-get-a-hearing-aid-from-an-audiologist' AND status='published' AND meta_description='Discover why getting a hearing aid from an audiologist at Ontario Hearing Center in Rochester, NY, ensures personalized care, proper fitting, and ongoing support for your hearing health.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='A hearing doctor is an audiologist who diagnoses hearing, balance and tinnitus problems. See how they differ from an ENT and book a visit in Rochester.'
WHERE slug='what-is-a-hearing-doctor' AND status='published' AND meta_description='A hearing doctor is also commonly known as an audiologists. Audiologists diagnose and treat hearing loss and balance issues. Ontario Hearing Center have audiologists based in Rochester, NY.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Professional ear cleaning clears wax buildup that blocks hearing. See how audiologists use irrigation, suction or a curette. Call to book in Rochester.'
WHERE slug='is-it-good-to-get-your-ears-professionally-cleaned' AND status='published' AND meta_description='Audiologists are knowledgeable in every aspect of maintaining and restoring hearing health. When should you get your ears professionally cleaned? Learn more here.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Hearing aid wax guards cannot be cleaned. Replace them every 1 to 2 weeks. Learn the signs and how to swap them. Call Ontario Hearing Center today.'
WHERE slug='can-hearing-aid-wax-guards-be-cleaned' AND status='published' AND meta_description='Wondering if you can clean your hearing aid wax guards? Learn how they work, when to clean them, and when to replace them to keep your hearing aids working their best.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;

UPDATE ec_blog_posts SET meta_description='Help a loved one adjust to new hearing aids with daily wear, short sessions, clear speech and follow-up visits. Call Ontario Hearing Center in Rochester.'
WHERE slug='helping-loved-ones-adjust-to-new-hearing-aids' AND status='published' AND meta_description='Discover expert tips from audiologists in Rochester, NY, on supporting loved ones as they adjust to new hearing aids. Ontario Hearing Center is here to help.'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL;
