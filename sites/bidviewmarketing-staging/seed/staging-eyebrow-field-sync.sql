INSERT INTO _emdash_fields (
  id,
  collection_id,
  slug,
  label,
  type,
  column_type,
  required,
  "unique",
  default_value,
  validation,
  widget,
  options,
  sort_order,
  searchable,
  translatable
)
SELECT
  'services-eyebrow-field',
  c.id,
  'eyebrow',
  'Eyebrow',
  'string',
  'TEXT',
  0,
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  1,
  0,
  1
FROM _emdash_collections c
WHERE c.slug = 'services'
  AND NOT EXISTS (
    SELECT 1
    FROM _emdash_fields f
    WHERE f.collection_id = c.id
      AND f.slug = 'eyebrow'
  );

UPDATE _emdash_fields
SET label = 'Eyebrow',
    type = 'string',
    column_type = 'TEXT',
    sort_order = 1,
    searchable = 0,
    translatable = 1
WHERE collection_id = (
    SELECT id FROM _emdash_collections WHERE slug = 'services'
  )
  AND slug = 'eyebrow';

SELECT c.slug AS collection_slug, f.slug, f.label, f.type, f.sort_order
FROM _emdash_fields f
JOIN _emdash_collections c ON c.id = f.collection_id
WHERE c.slug = 'services'
ORDER BY f.sort_order, f.created_at, f.slug;
