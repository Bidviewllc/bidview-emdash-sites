-- Add missing columns
ALTER TABLE ec_services ADD COLUMN hero_image TEXT;
ALTER TABLE ec_services ADD COLUMN features_json TEXT;
ALTER TABLE ec_services ADD COLUMN process_json TEXT;
ALTER TABLE ec_services ADD COLUMN faqs_json TEXT;
ALTER TABLE ec_services ADD COLUMN case_study_label TEXT;
ALTER TABLE ec_services ADD COLUMN case_study_headline TEXT;
ALTER TABLE ec_services ADD COLUMN case_study_body TEXT;
ALTER TABLE ec_services ADD COLUMN case_study_stats_json TEXT;
ALTER TABLE ec_services ADD COLUMN cta_heading TEXT;
ALTER TABLE ec_services ADD COLUMN cta_subtext TEXT;
