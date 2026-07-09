SELECT COUNT(*) AS total_services FROM ec_services;
SELECT COUNT(*) AS null_eyebrow_count FROM ec_services WHERE eyebrow IS NULL OR TRIM(eyebrow) = '';
SELECT slug, eyebrow FROM ec_services WHERE slug IN ('audiology-marketing/audiology-seo','pediatrics-marketing-services','ophthalmologist-marketing-services/digital-marketing');
