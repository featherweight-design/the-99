import { collectionEditEnabled } from "./edit-flag";

/**
 * Whether a copy the player adds says where it went, with a Change that moves it (plan
 * `plan-added-copy-2026-10-12`, the re-scope: no Keep it free). On only when `ADDED_COPY_ENABLED`
 * AND `COLLECTION_EDIT_ENABLED` are both `'true'`, because every surface that reports an add
 * (the upload summary, Add Cards, I got it) is the collection-edit line's. Off, every surface
 * draws exactly what it drew before this line existed.
 *
 * The same shape as the other release switches: server-side, read per request, OFF for anything
 * but the exact string `'true'`.
 */
export function addedCopyEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.ADDED_COPY_ENABLED === "true" && collectionEditEnabled(env);
}
