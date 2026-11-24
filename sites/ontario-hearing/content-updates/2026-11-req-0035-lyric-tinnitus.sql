-- REQ-0035: move the tinnitus benefit into an answer section on the published Lyric page.
UPDATE ec_brand_pages
SET content = replace(
  content,
  '**Tinnitus relief**– [Tinnitus](https://ontariohearing.com/tinnitus/) is _that_‘ringing in the ear’ disturbance that can be really annoying if left unmanaged. You’d be glad to know that Lyric hearing aids are equipped to handle and reduce tinnitus disturbances, providing tinnitus relief – something that not all hearing aids can do.',
  '## Can Lyric hearing aids help with tinnitus?

Yes. Lyric hearing aids are equipped to handle and reduce tinnitus disturbances, [providing tinnitus relief](https://ontariohearing.com/tinnitus/), something that not all hearing aids can do. Tinnitus is that ringing in the ear disturbance that can be really annoying if left unmanaged. Ontario Hearing Center is an official provider of Lyric hearing aids in Rochester, NY.'
)
WHERE slug = 'lyric-hearing-aids'
  AND status = 'published'
  AND live_revision_id IS NULL AND draft_revision_id IS NULL
  AND length(content) - length(replace(content, '**Tinnitus relief**– [Tinnitus](https://ontariohearing.com/tinnitus/) is _that_‘ringing in the ear’ disturbance that can be really annoying if left unmanaged. You’d be glad to know that Lyric hearing aids are equipped to handle and reduce tinnitus disturbances, providing tinnitus relief – something that not all hearing aids can do.', '')) = 333
  AND instr(content, '## Can Lyric hearing aids help with tinnitus?') = 0;
