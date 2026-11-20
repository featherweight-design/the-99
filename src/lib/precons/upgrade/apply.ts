import { and, eq, inArray } from "drizzle-orm";

import type { db } from "../../../db";
import { isCommanderCandidate } from "../../recs/score";
import { cards, deckCards, decks, preconUpgrades } from "../../../db/schema";
import { pruneOrphanLocks } from "../../decks/locks";
import { pruneOrphanProxies } from "../../decks/prune-proxies";
import { commitVersion } from "../../decks/versions";
import { isUuid } from "../../uuid";
import { MAX_SWAPS } from "./constants";
import { boxFingerprint } from "./inputs";
import { picksInRun } from "./picks";
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
  /** The adds and cuts applied, by oracle id: the player's picks (fresh start R2, #2985), or the whole run's when none were sent. */
  adds: string[];
  cuts: string[];
};

/**
 * The adds and cuts a player picked from a run, by oracle id, picked separately (README call 9): any subset of the run's adds and any
 * of its cuts, the same count each side so the deck stays at 99 (call 10).
 */
export type UpgradePicks = { adds: string[]; cuts: string[] };

/** `picks`: the picks sent are not a subset of the run, uneven, empty or malformed, or leave a card the lead can't hold. */
export type UpgradeRefusal = "gone" | "listChanged" | "picks";

/**
 * Untrusted picks, held to their shape: two arrays of oracle ids, none repeated, at most `MAX_SWAPS` a side. Null when they are
 * not. Whether they are THIS run's, even and not empty is `picksOfRun`'s, which needs the run. Pure; every action calls it first.
 */
export function picksShape(v: unknown): UpgradePicks | null {
  if (typeof v !== "object" || v === null) return null;
  const { adds, cuts } = v as Record<string, unknown>;
  const side = (x: unknown): x is string[] =>
    Array.isArray(x) && x.length <= MAX_SWAPS && x.every(isUuid) && new Set(x).size === x.length;
  return side(adds) && side(cuts) ? { adds: [...adds], cuts: [...cuts] } : null;
}

/**
 * The picks a start or an apply makes of this run, or null when they are not its to make. Sent picks are validated HERE, once (the
 * actions pass them through untouched): `picksShape`, the one picks rule (`picksInRun`: the run's own adds and cuts, none repeated),
 * the same count each side and not empty. Absent picks are the whole run (the shipped UI's press), held to the same rule: a stored
 * run that repeats a cut or an add (validation drops both, so only a corrupt or older run can) would end the deck at 100. Pure.
 */
export function picksOfRun(pairs: readonly Pick<UpgradePair, "cutId" | "addId">[], picks: UpgradePicks | undefined): UpgradePicks | null {
  if (picks === undefined) {
    const whole = { adds: pairs.map((p) => p.addId), cuts: pairs.map((p) => p.cutId) };
    return picksInRun(pairs, whole.adds, whole.cuts) ? whole : null;
  }
  const shaped = picksShape(picks);
  if (!shaped || shaped.adds.length === 0 || shaped.adds.length !== shaped.cuts.length) return null;
  return picksInRun(pairs, shaped.adds, shaped.cuts) ? shaped : null;
}

type BoxDeck = { commanderOracleId: string; partnerOracleId: string | null; cards: readonly { oracleId: string; quantity: number }[] };

/** The deck the swaps make: the box's list with the picked cuts taken out (one copy each) and the picked adds put in, and the alternate (when it leads) in the commander's seat, the box's commander(s) among the 99. Pure. */
export function upgradedDeck(box: BoxDeck, up: Pick<PreparedUpgrade, "lead" | "adds" | "cuts">): { commanderOracleId: string; partnerOracleId: string | null; cards: { oracleId: string; quantity: number }[] } {
  const qty = new Map(box.cards.map((c) => [c.oracleId, c.quantity] as const));
  if (up.lead) {
    qty.delete(up.lead);
    for (const id of [box.commanderOracleId, box.partnerOracleId]) if (id) qty.set(id, (qty.get(id) ?? 0) + 1);
  }
  for (const id of up.cuts) {
    const left = (qty.get(id) ?? 0) - 1;
    if (left > 0) qty.set(id, left);
    else qty.delete(id);
  }
  for (const id of up.adds) qty.set(id, (qty.get(id) ?? 0) + 1);
  return {
    commanderOracleId: up.lead ?? box.commanderOracleId,
    partnerOracleId: up.lead ? null : box.partnerOracleId,
    cards: [...qty].map(([oracleId, quantity]) => ({ oracleId, quantity })),
  };
}

/**
 * The run a start names, checked against the box it would be applied to, or why not. The run is the reader's own, done (a short run
 * that was refunded is startable), made over THIS list (`list_fp`), its swaps still fit it, and a lead commander is a card of the box
 * that is legal to lead. `picks` are the adds and cuts the player kept (`picksOfRun`; absent, the whole run). Anything else is a
 * refusal the dialog says in words; nothing is half applied.
 */
export async function prepareUpgradeIn(tx: Tx, userId: string, fileName: string, runId: string, box: BoxDeck, picks?: UpgradePicks): Promise<PreparedUpgrade | UpgradeRefusal> {
  const [run] = await tx.select({ strategyKey: preconUpgrades.strategyKey, pairs: preconUpgrades.pairs, listFp: preconUpgrades.listFp })
    .from(preconUpgrades)
    .where(and(eq(preconUpgrades.id, runId), eq(preconUpgrades.userId, userId), eq(preconUpgrades.preconFile, fileName), eq(preconUpgrades.status, "done")));
  if (!run) return "gone";
  const picked = picksOfRun(run.pairs as UpgradePair[], picks);
  // No picks sent and still none to make: the stored run itself repeats an id, so it no longer applies as it stands ("listChanged",
  // which re-reads the panel), not a stale pick of the player's ("picks", which would tell them to pick again when they picked nothing).
  if (!picked) return picks === undefined ? "listChanged" : "picks";
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
  const up: PreparedUpgrade = { runId, lead, ...picked };

  // Identity (the app's own add rule): the lead's colors must cover every card the swapped deck holds, the box's 99 and the adds both.
  const made = upgradedDeck(box, up);
  const leadIds = [made.commanderOracleId, ...(made.partnerOracleId ? [made.partnerOracleId] : [])];
  const rows = await tx.select({ id: cards.oracleId, identity: cards.colorIdentity }).from(cards).where(inArray(cards.oracleId, [...new Set([...leadIds, ...made.cards.map((c) => c.oracleId)])]));
  const allowed = new Set(rows.filter((r) => leadIds.includes(r.id)).flatMap((r) => r.identity));
  // A subset the lead can't hold (a cut of an off-color card left out) is the player's pick, refused as "picks"; the whole run
  // failing it means the list or the lead moved under it.
  if (rows.some((r) => !r.identity.every((c) => allowed.has(c)))) return picks === undefined ? "listChanged" : "picks";

  // Every cut is still a card of the list the swaps run over, and no add already is.
  const held = new Set(upgradedDeck(box, { lead, adds: [], cuts: [] }).cards.map((c) => c.oracleId));
  if (up.cuts.some((id) => !held.has(id)) || up.adds.some((id) => held.has(id)) || new Set(up.adds).size !== up.adds.length) return "listChanged";
  return up;
}

const INSERT_BATCH = 500;

/** A deck's whole 99, written after the caller's `deck_cards` delete, in batches; the caller prunes after it (`prune-proxies.test.ts`). */
export async function insertDeckList(tx: Tx, deckId: string, rows: readonly { oracleId: string; quantity: number; auto?: boolean }[]): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    await tx.insert(deckCards).values(rows.slice(i, i + INSERT_BATCH).map((c) => ({ deckId, oracleId: c.oracleId, quantity: c.quantity, auto: c.auto ?? false })));
  }
}

/** Rewrites the deck's list and commander to the swapped deck, links it to the run, and commits v1. Runs after v0 (the box) has committed. */
export async function applyUpgradeIn(tx: Tx, deckId: string, box: BoxDeck, up: PreparedUpgrade): Promise<void> {
  const made = upgradedDeck(box, up);
  await tx.delete(deckCards).where(eq(deckCards.deckId, deckId));
  await insertDeckList(tx, deckId, made.cards);
  await tx.update(decks).set({ commanderOracleId: made.commanderOracleId, partnerOracleId: made.partnerOracleId, builtFromUpgradeId: up.runId }).where(eq(decks.id, deckId));
  // A cut card keeps no printing pin or proxy mark: they were written for the box's list (the one prune every deck_cards delete takes).
  await pruneOrphanProxies(tx, deckId);
  await pruneOrphanLocks(tx, deckId);
  await commitVersion(deckId, null, tx, undefined);
}
