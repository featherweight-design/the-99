/**
 * Most slugs one `/api/discovery-fields` request may ask for: about 5KB of URL, well inside every
 * limit on the path. Here rather than in the route, which may export only what Next reads there.
 */
export const MAX_FIELDS_BATCH = 200;
