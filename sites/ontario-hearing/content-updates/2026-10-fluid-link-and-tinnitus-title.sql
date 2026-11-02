-- Ontario Hearing Centers: ClickUp 868mn3wp6 (internal link to /fluid-in-ear/) and 868mn3wp8 (duplicated question in the tinnitus title and H1).
-- Wording as agreed with Marefe Mancha in the task comments 2026-10-28. Each statement only runs if the exact stored text is still there.
-- Apply AFTER the PR is merged:  npx wrangler d1 execute ontario-hearing-db --remote --file content-updates/2026-10-fluid-link-and-tinnitus-title.sql

-- dealing-with-pressure-in-ear: link "fluid buildup" -> https://ontariohearing.com/fluid-in-ear/
UPDATE ec_blog_posts SET content=replace(content,'which leads to fluid buildup that can promote','which leads to [fluid buildup](https://ontariohearing.com/fluid-in-ear/) that can promote') WHERE slug='dealing-with-pressure-in-ear' AND instr(content,'which leads to fluid buildup that can promote')>0;

-- what-helps-tinnitus-go-away: H1 (the post title field) and the title tag, question once
UPDATE ec_blog_posts SET title='What helps tinnitus go away?' WHERE slug='what-helps-tinnitus-go-away' AND title='What helps tinnitus go away? What helps tinnitus go away?';
UPDATE ec_blog_posts SET meta_title='What helps tinnitus go away? | Ontario Hearing Center, Rochester NY' WHERE slug='what-helps-tinnitus-go-away' AND meta_title='What helps tinnitus go away? What helps tinnitus go away? | Ontario Hearing Center, Rochester NY';
