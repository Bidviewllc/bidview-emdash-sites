-- New blog post: Hearing Aids for Dementia (from the Blog-Posting-Schedule sheet, row 13)
-- Guarded: inserts only if the slug isn't there yet. Apply AFTER the PR is merged:
--   npx wrangler d1 execute ontario-hearing-db --remote --file content-updates/2026-10-blog-hearing-aids-for-dementia.sql
INSERT INTO ec_blog_posts (id, slug, status, created_at, updated_at, published_at, version, locale, title, excerpt, content,
  featured_image_url, author, date, category, read_time, meta_title, meta_description, sort_order)
SELECT 'hearing-aids-for-dementia', 'hearing-aids-for-dementia', 'published', '2026-09-16 16:01:00', '2026-09-16 16:01:00', '2026-09-16 16:01:00', 1, 'en', 'Hearing Aids for Dementia', 'Hearing aids help people with dementia hear. See what the research shows, which styles work, and what caregivers handle day to day. Ontario Hearing, Brighton, NY.', '![Older man appearing confused while reviewing notes](/assets/img/hearing-aids-for-dementia.webp)

Hearing aids help people with dementia hear. They do not treat the dementia.

We are audiologists at Ontario Hearing Centers in Brighton, and we have served the Rochester area since 1956. Learn what hearing aids do for a person with memory loss, what the current research shows, and what caregivers end up handling.

## What hearing aids do for a person with dementia

Hearing aids make speech louder and clearer, so the person gets more of each conversation. Hearing loss and memory loss are both common in older adults, and both make conversation harder.

A missed question can look like confusion when the person did not hear it.

## Can hearing aids slow cognitive decline?

One large trial found that treating hearing loss slowed cognitive decline in people at higher risk. In a preplanned subgroup of 238 people with mild to moderate hearing loss, three years of hearing intervention slowed decline by 48%. The trial is called ACHIEVE, and it was published in [The Lancet](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(23)01406-X/fulltext) in 2023. The intervention was hearing aids, a self-management toolkit, and ongoing counseling with an audiologist.

The result for everyone in the trial was negative. ACHIEVE enrolled adults aged 70 to 84 with untreated hearing loss and no substantial cognitive impairment. The 48% figure came from a subgroup with more risk factors, who declined nearly three times faster than the healthy volunteers. The healthy volunteers saw no effect. The investigators said much more research is needed. [ACHIEVE study summary from ENTnet](https://www.entnet.org/condition/hearing-loss)

The trial did not enroll people with substantial cognitive impairment, so it does not show what hearing aids do for someone who already has a dementia diagnosis. Studies in that group are few. A 2024 review in the Journal of Alzheimer’s Disease found five trials, two randomized and three crossover. Quality of life improved with hearing aids. Hearing rehabilitation was not shown to affect cognition. [Journal of Alzheimer’s Disease review](https://content.iospress.com/articles/journal-of-alzheimers-disease/jad231460)

## Hearing aid styles and features for someone with memory loss

Choose the simplest aid the person will keep in. Rechargeable models mean no tiny batteries to change, and automatic settings mean fewer buttons to learn.

Larger behind-the-ear aids are easier to handle. Smaller in-the-canal aids are discreet and easy to misplace. Many current aids stream phone calls and TV sound straight to the aid and reduce background noise.

## Why some people with dementia struggle with hearing aids

Some people with dementia take the aids out and lose them. A new aid also sounds different at first, and explaining that to someone with memory loss does not always work.

## Introducing hearing aids at home

Start in a quiet room with one person talking. Keep the first sessions short and add time as it goes well.

- Put the aids in at the same time every day, such as after breakfast.
- Take them out at the same time every night and store them in the same place.
- Watch for signs of discomfort or harsh sound, and bring the person back for an adjustment.

## What caregivers handle day to day

Caregivers do the daily care: charging the aids or changing batteries, wiping them, checking they are in the ears, and checking for wax. Ear wax blocks hearing aids. Cotton swabs push wax deeper into the canal, so have a professional remove it.

Come to the adjustment visits so you can tell us what you have seen at home.

## Book an appointment

The first step is a [hearing test](https://ontariohearing.com/hearing-test/) with an audiologist. It shows the type and degree of the hearing loss, and we fit the aids to that. Bring the caregiver or the family member who sees the person every day, since they know what the person misses at home. Tell us when you call that the person has memory loss.

Our office is at 2210 Monroe Avenue, Brighton, NY 14618. Call (585) 442-4180 to schedule.',
  '/assets/img/hearing-aids-for-dementia.webp', 'Ontario Hearing Center', 'September 16, 2026', 'Resources', '3 min read', 'Hearing Aids for Dementia in Rochester, NY | Ontario Hearing', 'Hearing aids help people with dementia hear. See what the research shows, which styles work, and what caregivers handle day to day. Ontario Hearing, Brighton, NY.',
  (SELECT COALESCE(MAX(sort_order),0)+1 FROM ec_blog_posts)
WHERE NOT EXISTS (SELECT 1 FROM ec_blog_posts WHERE slug = 'hearing-aids-for-dementia');
