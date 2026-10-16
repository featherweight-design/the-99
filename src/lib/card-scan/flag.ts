import { collectionEditEnabled } from "../collection/edit-flag";

/**
 * Card scanning (plan `2026-10-16-card-scan.md`): the phone embeds a card and the server finds it. On only when
 * `CARD_SCAN_ENABLED` AND `COLLECTION_EDIT_ENABLED` are both `'true'`, because a scan ends in the collection's add.
 * Off: no Scan press, no About entry, and `POST /api/card-scan/match` answers 404.
 */
export function cardScanEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.CARD_SCAN_ENABLED === "true" && collectionEditEnabled(env);
}
