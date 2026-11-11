/**
 * A precon's pre-written Overview, for its own page (small items 5, `Precon-Overview`): the block under
 * "You own" and the modal it opens. SERVER-ONLY, catalog data alone (`precon_synopses`, `cards`).
 *
 * THE SAME ROW A START WOULD CARRY: at the reader's contract and role basis, and current, so the page
 * shows the read a deck started from it now would open with (`carry-over.ts`). With the Analysis tab
 * off for the reader there is no Overview anywhere, so none here. No row, a row that is not current,
 * or one whose Overview section was refused is no block: the page draws no placeholder.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, preconSynopses } from "../../db/schema";
import { allEvidenceIds } from "../synopsis/based-on";
import { synopsisPreconContractVersion } from "../synopsis/limits";
import type { CheckedSynopsis } from "../synopsis/types";
import { showsPreconOverview } from "./overview-rule";

export { overviewForList, renderedPreconList, showsPreconOverview } from "./overview-rule";

export type PreconOverview = {
  content: CheckedSynopsis;
  /** The catalog art for every card it names, by oracle id (the page's own art covers the list). */
  art: Record<string, string | null>;
  /** The names its claims cite, for "Based on"; empty on a row written before contract 8. */
  evidenceNames: Record<string, string>;
  /** The contract the row was written at, which picks the Overview modal's shape. */
  contractVersion: number;
  /** The list it was written for (`list_fingerprint`): shown only beside that very list (`overviewForList`). */
  listFingerprint: string;
};

/** The row's key at the reader's switches: which contract and basis an Analyze press would write at.
 *  The basis is always labels (LABEL_ROLE_COUNTS retired, Hugh 2026-10-31). `_env` is
 *  unread since the Overview v2 switch retired; the parameter goes with the v1 code. */
export function preconOverviewKey(_env: NodeJS.ProcessEnv) {
  return { contract: synopsisPreconContractVersion(true), basis: "labels" as const };
}

/**
 * The names an overview's claims cite, by oracle id: `synopsis/read.ts`'s own query, restated here so this
 * page's read does not import the deck's synopsis reader (and the model client and allowance behind it).
 */
async function evidenceNamesOf(content: CheckedSynopsis): Promise<Record<string, string>> {
  const ids = allEvidenceIds(content);
  if (ids.length === 0) return {};
  const rows = await db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards).where(inArray(cards.oracleId, ids));
  return Object.fromEntries(rows.map((r) => [r.oracleId, r.name]));
}

export async function loadPreconOverview(fileName: string, env: NodeJS.ProcessEnv): Promise<PreconOverview | null> {
  const { contract, basis } = preconOverviewKey(env);
  const rows = await db.select({ content: preconSynopses.content, current: preconSynopses.current, listFingerprint: preconSynopses.listFingerprint, contractVersion: preconSynopses.contractVersion }).from(preconSynopses).where(and(
    eq(preconSynopses.preconFile, fileName),
    eq(preconSynopses.contractVersion, contract),
    eq(preconSynopses.roleBasis, basis),
  ));
  const shown = rows[0] ?? null;
  if (!showsPreconOverview(shown)) return null;
  const content = shown.content;
  const v2 = true; // The Overview v2 method, always (its switch is retired)
  const named = [...new Set([...Object.values(content.cards).map((c) => c.oracleId), ...(v2 ? allEvidenceIds(content) : [])])];
  const [art, evidenceNames] = await Promise.all([
    named.length === 0
      ? Promise.resolve({})
      : db.select({ oracleId: cards.oracleId, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, named))
        .then((rows) => Object.fromEntries(rows.map((r) => [r.oracleId, r.imageUri]))),
    v2 ? evidenceNamesOf(content) : Promise.resolve({}),
  ]);
  // The shown row's own contract.
  return { content, art, evidenceNames, contractVersion: shown.contractVersion, listFingerprint: shown.listFingerprint };
}
