-- Ontario Hearing Centers: add an opening paragraph to /hearing-aids-in-fairport-ny/ (ClickUp 868mjkqa0).
-- Add only: the new paragraph is put in front of the existing lead; nothing is removed or reworded. Fairport only, Brighton is not touched.
-- Text approved by Mary Pedrosa 2026-10-23; add-only approach approved by Vince 2026-10-26.
-- Runs once: only if the lead still starts with the original sentence and the new text is not there yet.
-- Apply AFTER the PR is merged:  npx wrangler d1 execute ontario-hearing-db --remote --file content-updates/2026-10-fairport-opening.sql
UPDATE ec_location_pages SET lead='Our audiologists at Ontario Hearing Center proudly serve and fit hearing aids for Fairport, NY patients at our Rochester office, 2210 Monroe Avenue, Brighton. They test your hearing, recommend hearing aids based on your results, and adjust the devices to your needs. A trial period and regular follow-up appointments come after the fitting. ' || lead WHERE slug='hearing-aids-in-fairport-ny' AND lead LIKE 'Hearing aids do much more than amplify sound.%' AND instr(lead,'Our audiologists at Ontario Hearing Center proudly serve')=0;
