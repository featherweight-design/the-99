/**
 * The most oracle ids one `/api/collection-fields` request may name. 500 ids is ~18 KB of query
 * string, past what a URL can carry, so a batch this size travels as a POST body (`useCollectionFields`);
 * the GET answers `MAX_COLLECTION_FIELDS_GET` for a client that still sends one.
 */
export const MAX_COLLECTION_FIELDS_BATCH = 500;
/** The GET's own cap: 200 ids is ~7.4 KB of query string, the size it always carried. */
export const MAX_COLLECTION_FIELDS_GET = 200;
