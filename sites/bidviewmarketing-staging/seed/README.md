# Bidview Marketing D1 seed

The service pages are rendered by `src/pages/[...slug].astro` from the EmDash `ec_services` table. These SQL files provide the service-page content for a fresh D1 database.

- `remote-services-full-sync.sql`: adds the `eyebrow` column if needed, clears existing service content, and inserts the published Bidview service pages.
- `remote-services-full-sync-data-only.sql`: same content insert without the `ALTER TABLE` step, for databases where the `eyebrow` column already exists.
- `staging-eyebrow-field-sync.sql`: registers the `eyebrow` field in EmDash metadata.
- `verify-remote-services.sql` and `verify-eyebrow.sql`: quick checks after import.

For an existing deployment that already points at the populated `bidviewmarketing-staging` D1 database, these seed files do not need to be reapplied.
