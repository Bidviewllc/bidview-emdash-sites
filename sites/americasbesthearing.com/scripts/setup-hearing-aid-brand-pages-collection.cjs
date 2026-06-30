// Backward-compatible wrapper. The brand page model now uses child collections
// for carousel images, hearing aid models, and FAQs so those records can use
// top-level EmDash image/portableText fields in the admin UI.
require('./setup-hearing-aid-brand-child-collections.cjs');
require('./setup-hearing-aid-brand-carousel-galleries.cjs');
