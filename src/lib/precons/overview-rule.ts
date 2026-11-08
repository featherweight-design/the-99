/**
 * When a precon's stored Overview is shown: the rule the signed-in precon page (`overview-read.ts`) and the public
 * landing (`public/precon-overview.ts`) share. Pure, and apart from `overview-read.ts` so a public loader can take it
 * without that module's synopsis imports, which reach per-user directories.
 */
import { listFingerprint } from "../fingerprint/list";
import type { CheckedSynopsis } from "../synopsis/types";
import { preconDeckCards } from "./deck-cards";

/**
 * The fingerprint of the list the precon page RENDERS, as a start would write it: its commanders in the
 * feed's order (the lead first, as `preparePreconDeck` takes them) and its body (`preconDeckCards`).
 */
export function renderedPreconList(precon: {
  row: { commanders: readonly { oracleId: string }[] };
  cards: readonly { oracleId: string; quantity: number; isCommander: boolean }[];
}): string {
  return listFingerprint({
    commanderOracleId: precon.row.commanders[0]?.oracleId ?? "",
    partnerOracleId: precon.row.commanders[1]?.oracleId ?? null,
    cards: preconDeckCards(precon.cards),
  });
}

/**
 * Pure: the Overview only beside the list it was written for. The precon ingest replaces `precon_cards`
 * without touching `current` (a feed correction, a card newly mapped), so `current` alone cannot say the
 * row still describes the list on the page; the carry-over compares the list the same way.
 */
export function overviewForList<T extends { listFingerprint: string }>(overview: T | null, list: string): T | null {
  return overview && overview.listFingerprint === list ? overview : null;
}

/** Pure: whether a stored row is shown at all. */
export function showsPreconOverview(row: { current: boolean; content: CheckedSynopsis | null } | null): row is { current: true; content: CheckedSynopsis } {
  return !!row && row.current && !!row.content?.overview;
}
