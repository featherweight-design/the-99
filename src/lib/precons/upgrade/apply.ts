import { and, eq, inArray } from "drizzle-orm";

import type { db } from "../../../db";
import { isCommanderCandidate } from "../../recs/score";
import { cards, deckCards, deckPrintings, decks, preconUpgrades } from "../../../db/schema";
import { commitVersion } from "../../decks/versions";
import { boxFingerprint } from "./inputs";
import type { UpgradePair } from "./validate";

/**
 * "Start the deck with these swaps" (Upgrade this precon, PR 6): a deck started from a kept run is the box as v0, then the run's
 * swaps committed as v1, in one transaction, so the box stays the deck's own first version. Not a "use server" module: it takes a
 * user id. The reads and writes are split so a start reads the run in the SAME snapshot as the box (`prepareUpgradeIn`), and the
 * write is `applyUpgradeIn`, run inside the start's transaction after v0 commits.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PreparedUpgrade = {
  runId: string;
  /** The alternate commander that leads, or null when the box's own commander(s) do. */
  lead: string | null;
  pairs: { cutId: string; addId: string }[];
};

export type UpgradeRefusal = "gone" | "listChanged";

type BoxDeck = { commanderOracleId: string; partnerOracleId: string | null; cards: readonly { oracleId: string; quantity: number }[] };

/** The deck the swaps make: the box's list with the pairs applied, and the alternate (when it leads) in the commander's seat, the box's commander(s) among the 99. Pure. */
export function upgradedDeck(box: BoxDeck, up: Pick<PreparedUpgrade, "lead" | "pairs">): { commanderOracleId: string; partnerOracleId: string | null; cards: { oracleId: string; quantity: number }[] } {
  const qty = new Map(box.cards.map((c) => [c.oracleId, c.quantity] as const));
  if (up.lead) {
    qty.delete(up.lead);
    for (const id of [box.commanderOracleId, box.partnerOracleId]) if (id) qty.set(id, (qty.get(id) ?? 0) + 1);
  }
  for (const p of up.pairs) {
    const left = (qty.get(p.cutId) ?? 0) - 1;
    if (left > 0) qty.set(p.cutId, left);
    else qty.delete(p.cutId);
    qty.set(p.addId, (qty.get(p.addId) ?? 0) + 1);
  }
  return {
    commanderOracleId: up.lead ?? box.commanderOracleId,
    partnerOracleId: up.lead ? null : box.partnerOracleId,
    cards: [...qty].map(([oracleId, quantity]) => ({ oracleId, quantity })),
  };
}

/**
 * The run a start names, checked against the box it would be applied to, or why not. The run is the reader's own, done (a short run
 * that was refunded is startable), made over THIS list (`list_fp`), its swaps still fit it, and a lead commander is a card of the box
 * that is legal to lead. Anything else is a refusal the dialog says in words; nothing is half applied.
 */
export async function prepareUpgradeIn(tx: Tx, userId: string, fileName: string, runId: string, box: BoxDeck): Promise<PreparedUpgrade | UpgradeRefusal> {
  const [run] = await tx.select({ strategyKey: preconUpgrades.strategyKey, pairs: preconUpgrades.pairs, listFp: preconUpgrades.listFp })
    .from(preconUpgrades)
    .where(and(eq(preconUpgrades.id, runId), eq(preconUpgrades.userId, userId), eq(preconUpgrades.preconFile, fileName), eq(preconUpgrades.status, "done")));
  if (!run) return "gone";
  if (run.listFp === null || run.listFp !== boxFingerprint(box.cards.map((c) => ({ ...c, isCommander: false })))) return "listChanged";

  const ids = run.strategyKey.split("/")[0].split("+");
  const face = [box.commanderOracleId, ...(box.partnerOracleId ? [box.partnerOracleId] : [])];
  const sameAsFace = ids.length === face.length && ids.every((id) => face.includes(id));
  let lead: string | null = null;
  if (!sameAsFace) {
    if (ids.length !== 1 || box.partnerOracleId || !box.cards.some((c) => c.oracleId === ids[0])) return "listChanged";
    // The same checks a start makes of any commander (`preparePreconDeckIn`).
    const [c] = await tx.select().from(cards).where(eq(cards.oracleId, ids[0]));
    if (!c || !c.commanderLegal || !isCommanderCandidate(c)) return "listChanged";
    lead = ids[0];
  }
  const up: PreparedUpgrade = { runId, lead, pairs: run.pairs.map((p: UpgradePair) => ({ cutId: p.cutId, addId: p.addId })) };

  // Identity (the app's own add rule): the lead's colors must cover every card the swapped deck holds, the box's 99 and the adds both.
  const made = upgradedDeck(box, up);
  const leadIds = [made.commanderOracleId, ...(made.partnerOracleId ? [made.partnerOracleId] : [])];
  const rows = await tx.select({ id: cards.oracleId, identity: cards.colorIdentity }).from(cards).where(inArray(cards.oracleId, [...new Set([...leadIds, ...made.cards.map((c) => c.oracleId)])]));
  const allowed = new Set(rows.filter((r) => leadIds.includes(r.id)).flatMap((r) => r.identity));
  if (rows.some((r) => !r.identity.every((c) => allowed.has(c)))) return "listChanged";

  // Every cut is still a card of the list the swaps run over, and no add already is.
  const held = new Map(upgradedDeck(box, { lead, pairs: [] }).cards.map((c) => [c.oracleId, c.quantity] as const));
  for (const p of up.pairs) {
    if (!held.has(p.cutId) || held.has(p.addId)) return "listChanged";
    held.set(p.addId, 1);
  }
  return up;
}

const INSERT_BATCH = 500;

/** Rewrites the deck's list and commander to the swapped deck, links it to the run, and commits v1. Runs after v0 (the box) has committed. */
export async function applyUpgradeIn(tx: Tx, deckId: string, box: BoxDeck, up: PreparedUpgrade): Promise<void> {
  const made = upgradedDeck(box, up);
  await tx.delete(deckCards).where(eq(deckCards.deckId, deckId));
  for (let i = 0; i < made.cards.length; i += INSERT_BATCH) {
    await tx.insert(deckCards).values(made.cards.slice(i, i + INSERT_BATCH).map((c) => ({ deckId, oracleId: c.oracleId, quantity: c.quantity })));
  }
  // A cut card keeps no printing pin: the pins were written for the box's list.
  const kept = new Set([made.commanderOracleId, ...made.cards.map((c) => c.oracleId)]);
  const cut = up.pairs.map((p) => p.cutId).filter((id) => !kept.has(id));
  if (cut.length > 0) await tx.delete(deckPrintings).where(and(eq(deckPrintings.deckId, deckId), inArray(deckPrintings.oracleId, cut)));
  await tx.update(decks).set({ commanderOracleId: made.commanderOracleId, partnerOracleId: made.partnerOracleId, builtFromUpgradeId: up.runId }).where(eq(decks.id, deckId));
  await commitVersion(deckId, null, tx, undefined);
}
