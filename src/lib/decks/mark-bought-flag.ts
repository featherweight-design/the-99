import { collectionEditEnabled } from "../collection/edit-flag";

/**
 * Whether a Shopping row's buy tag takes "I got it" (collection home sub-project 4, plan
 * `2026-10-10-i-got-it.md`). On only when `SHOPPING_MARK_BOUGHT_ENABLED` AND
 * `COLLECTION_EDIT_ENABLED` are both `'true'`, because the purchase is a ledger write and the
 * ledger is the collection-edit line's. With either off the tag is a plain span, and the action
 * refuses.
 *
 * The same shape as the other release switches: server-side, read per request, OFF for anything
 * but the exact string `'true'`.
 */
export function shoppingMarkBoughtEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SHOPPING_MARK_BOUGHT_ENABLED === "true" && collectionEditEnabled(env);
}
