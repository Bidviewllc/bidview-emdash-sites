-- Insert Clark Brenneman into ec_audiologists
INSERT OR REPLACE INTO ec_audiologists (
  id, slug, status, created_at, updated_at, published_at,
  version, locale, translation_group,
  name, credentials, title,
  photo_src, photo_alt, bio,
  location_slug, location_label, location_url,
  em_class, meta_title, meta_description, sort_order
) VALUES (
  '01KS0000000000000000CLARK1',
  'clark-brenneman',
  'published',
  '2026-06-05T00:00:00.000Z',
  '2026-06-05T00:00:00.000Z',
  '2026-06-05T00:00:00.000Z',
  1,
  'en',
  '01KS0000000000000000CLARK1',
  'Clark Brenneman',
  '',
  'Hearing Instrument Specialist',
  '/assets/images/2026/06/clark-brenneman.webp',
  'Clark Brenneman, Hearing Instrument Specialist at Audiology & Hearing Center of Alpharetta',
  '<p>Clark Brenneman is a Hearing Instrument Specialist with more than seven years of experience helping patients improve their hearing and reconnect with the people and moments that matter most. He is licensed through the state of Georgia as a Hearing Aid Dispenser and specializes in accurate audiometric evaluations, personalized treatment plans, and fitting hearing devices tailored to each patient''s needs.</p>
<p>Having hearing loss himself, Clark understands firsthand the importance of better hearing and meaningful communication with family and loved ones. His personal experience gives him a unique perspective and allows him to connect closely with patients throughout their hearing journey.</p>
<p>Clark is passionate about improving quality of life through better hearing and takes pride in working one-on-one with patients to find solutions that fit their lifestyle and goals. Outside of the office, he enjoys hiking and reading.</p>',
  'alpharetta-ga',
  'Alpharetta, GA',
  '/audiologist-location/alpharetta-ga/',
  'em-4300',
  'Clark Brenneman | Hearing Instrument Specialist | Audiology & Hearing Center',
  'Clark Brenneman is a Hearing Instrument Specialist with more than seven years of experience helping patients improve their hearing in Alpharetta, GA.',
  2
);

-- SEO entry
INSERT OR REPLACE INTO _emdash_seo (
  collection, content_id, seo_title, seo_description, seo_image
) VALUES (
  'audiologists',
  '01KS0000000000000000CLARK1',
  'Clark Brenneman | Hearing Instrument Specialist | Audiology & Hearing Center',
  'Clark Brenneman is a Hearing Instrument Specialist with more than seven years of experience helping patients improve their hearing in Alpharetta, GA.',
  '/assets/images/2026/06/clark-brenneman.webp'
);
