# Collection setup guide — create these in `/_emdash/admin`

Open `/_emdash/admin` → **Collections** → **Create Collection** for each entry below.

For each field, use **Add Field** with the listed slug + label + type. Field types in emdash:
- `string` — single line of text (titles, names, labels)
- `text` — multi-line text (paragraphs, descriptions)
- `portableText` — rich text / markdown editor (body content)
- `image` — image upload (stored in R2)
- `number` / `integer` — numeric
- `datetime` — date+time

When in doubt, use `text` for paragraphs and `string` for short labels. Leave "Required" off for all fields (we want graceful empty rendering).

After all 13 are created, **stop and run the seed**:
```bash
cd emdash
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN \
CLOUDFLARE_ACCOUNT_ID=239e9d015c7a3a39cdc2e9400312f553 \
npx wrangler d1 execute ontario-hearing-db --file=seed/seed-entries.sql --remote
```

---

## 1. `site_settings`  (Label: "Site Settings", Singular: "Site Setting")
Fields: phone (string), email (string), address_street (string), address_city_state (string), hours_mon_thu (string), hours_fri (string), google_maps_url (string)

## 2. `homepage`  (Label: "Homepage", Singular: "Homepage")
Fields:
- hero_eyebrow, hero_heading, hero_lead, hero_cta_text — all `string`/`text`
- reviews_count — string
- about_eyebrow, about_heading, about_body, about_body2, about_badge_title — text
- about_years_num, about_years_label, about_doctors_num, about_doctors_label, about_brands_num, about_brands_label — string
- team_eyebrow, team_heading, team_subhead — text
- cochlear_eyebrow, cochlear_heading, cochlear_body — text
- diag_eyebrow, diag_heading, diag_subhead — text
- ha_eyebrow, ha_heading — text
- brands_eyebrow, brands_heading, brands_subhead — text
- testimonials_eyebrow, testimonials_heading — text
- faq_eyebrow, faq_heading, faq_subhead — text
- blog_eyebrow, blog_heading — text
- hero_image — image

## 3. `about_page`  (Label: "About Page", Singular: "About Page")
Fields:
- story_eyebrow, story_heading, story_body1, story_body2, story_image_caption — text
- story_stat1_num, story_stat1_label, story_stat2_num, story_stat2_label, story_stat3_num, story_stat3_label — string
- philosophy_eyebrow, philosophy_heading, philosophy_body1, philosophy_body2, philosophy_body3, philosophy_body4, philosophy_image_caption — text
- team_eyebrow, team_heading, team_subhead — text
- meta_title, meta_description — string
- story_image, philosophy_image — image

## 4. `contact_page`  (Label: "Contact Page", Singular: "Contact Page")
Fields:
- intro_eyebrow, intro_heading, intro_body1, intro_body2 — text
- meta_title, meta_description — string

## 5. `team_members`  (Label: "Team Members", Singular: "Team Member")
Fields:
- name, role, credentials — string
- bio_short — text
- bio_full — portableText (markdown body)
- meta_title, meta_description — string
- sort_order — integer
- photo — image

## 6. `blog_posts`  (Label: "Blog Posts", Singular: "Blog Post")
Fields:
- title — string
- excerpt — text
- content — portableText
- author, date, category, read_time — string
- meta_title, meta_description — string
- sort_order — integer
- featured_image — image

## 7. `testimonials`  (Label: "Testimonials", Singular: "Testimonial")
Fields:
- quote — text
- author, city — string
- rating — integer
- sort_order — integer

## 8. `faqs`  (Label: "FAQs", Singular: "FAQ")
Fields:
- question — string
- answer — text
- sort_order — integer

## 9. `service_pages`  (Label: "Service Pages", Singular: "Service Page")
Fields:
- title — string
- meta_title, meta_description — string
- lead — text
- content — portableText
- hero_image_url — string (we'll switch to image type later when uploaded to R2)
- sort_order — integer
- hero_image — image

## 10. `brand_pages`  (Label: "Brand Pages", Singular: "Brand Page")
Fields:
- brand_name, title — string
- meta_title, meta_description — string
- lead — text
- content — portableText
- hero_image_url — string
- sort_order — integer
- brand_logo — image

## 11. `location_pages`  (Label: "Location Pages", Singular: "Location Page")
Fields:
- location_name, title — string
- meta_title, meta_description — string
- lead — text
- content — portableText
- hero_image_url — string
- sort_order — integer

## 12. `resource_pages`  (Label: "Resource Pages", Singular: "Resource Page")
Fields:
- title — string
- meta_title, meta_description — string
- lead — text
- content — portableText
- hero_image_url — string
- sort_order — integer

## 13. `condition_pages`  (Label: "Condition Pages", Singular: "Condition Page")
Fields:
- title — string
- meta_title, meta_description — string
- lead — text
- content — portableText
- hero_image_url — string
- sort_order — integer

## 14. `legal_pages`  (Label: "Legal Pages", Singular: "Legal Page")
Fields:
- title — string
- meta_title, meta_description — string
- content — portableText

---

## Notes

- emdash will auto-create the `ec_<collection_slug>` table when you create each collection.
- Adding a field after the table exists adds a column or extends the JSON shape — emdash handles this.
- Run the seed after **all 14** are created (faster than partial seeding).
- The `.astro` pages are already wired to read from these collections via `getEmDashEntry/getEmDashCollection`. They fall back to static `pages.json` content when D1 is empty, so nothing breaks during setup.
