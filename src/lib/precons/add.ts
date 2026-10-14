/**
 * Adding a precon to a collection (Hugh, 2026-10-13): every card at the box's own printing, its foil
 * copies as foil (`precon_cards.foil_quantity`), commanders and basics included, as ONE `add` entry
 * whose source is `precon:<file>`, with the box's tokens marked owned by that entry (`precon_tokens`).
 * Revert of the entry takes back the cards and those tokens together.
 *
 * `preconAddLines` is pure, so the split into finishes and the token sums are unit tested; the read
 * and the write are `readPreconForAdd` and `addPreconForUser`.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collectionHistory, preconCards, precons, preconTokens, printings, tokenOwnership, tokenPrintings, tokens } from "../../db/schema";
import { applyCollectionChange, type ChangeResult } from "../collection/write";
import { placedOf, type AddedPlacement } from "../collection/add-placements";
import type { PendingItem } from "../collection/pending";
import { tokenOwnershipTablesExist, type TokenHolding } from "../tokens/ownership";
import { preconSource } from "./added";
import type { Reader } from "./list-read";


export type PreconCardForAdd = {
  oracleId: string;
  quantity: number;
  foilQuantity: number;
  /** The precon's printing; null when the catalog lacks it (the card is added with no printing named). */
  printing: { scryfallId: string; setCode: string; collectorNumber: string } | null;
};

export type PreconTokenForAdd = { tokenOracleId: string; name: string; quantity: number };

/** The add's lines: one per (card, printing, finish), non-foil then foil; tokens summed per token. */
export function preconAddLines(cards: readonly PreconCardForAdd[], tokenRows: readonly PreconTokenForAdd[]) {
  const items: PendingItem[] = [];
  for (const c of cards) {
    const base = c.printing
      ? { oracleId: c.oracleId, setCode: c.printing.setCode, collectorNumber: c.printing.collectorNumber, scryfallId: c.printing.scryfallId }
      : { oracleId: c.oracleId, setCode: "", scryfallId: null };
    const nonfoil = c.quantity - c.foilQuantity;
    if (nonfoil > 0) items.push({ ...base, finish: "nonfoil", condition: null, quantity: nonfoil });
    if (c.foilQuantity > 0) items.push({ ...base, finish: "foil", condition: null, quantity: c.foilQuantity });
  }
  const sums = new Map<string, PreconTokenForAdd>();
  for (const t of tokenRows) {
    const at = sums.get(t.tokenOracleId);
    if (at) at.quantity += t.quantity;
    else sums.set(t.tokenOracleId, { ...t });
  }
  const tokenHoldings: TokenHolding[] = [...sums.values()].map(({ tokenOracleId, quantity }) => ({ tokenOracleId, quantity }));
  const tokenNames = Object.fromEntries([...sums.values()].map((t) => [t.tokenOracleId, t.name]));
  return {
    items,
    tokens: tokenHoldings,
    tokenNames,
    cards: new Set(cards.map((c) => c.oracleId)).size,
    copies: cards.reduce((n, c) => n + c.quantity, 0),
    foil: cards.reduce((n, c) => n + c.foilQuantity, 0),
  };
}

/** The precon's cards and tokens as the add takes them, or null for a file the catalog does not hold. */
export async function readPreconForAdd(fileName: string): Promise<{ cards: PreconCardForAdd[]; tokens: PreconTokenForAdd[] } | null> {
  // One snapshot: the ingest replaces precons, their cards and their tokens in one transaction, so three
  // separate reads could see a head from one generation and an empty list from the next.
  return db.transaction((tx) => readPreconIn(tx, fileName), { isolationLevel: "repeatable read" });
}

async function readPreconIn(db: Reader, fileName: string): Promise<{ cards: PreconCardForAdd[]; tokens: PreconTokenForAdd[] } | null> {
  const [precon] = await db.select({ fileName: precons.fileName }).from(precons).where(eq(precons.fileName, fileName));
  if (!precon) return null;
  const rows = await db
    .select({
      oracleId: preconCards.oracleId,
      quantity: preconCards.quantity,
      foilQuantity: preconCards.foilQuantity,
      scryfallId: printings.scryfallId,
      setCode: printings.setCode,
      collectorNumber: printings.collectorNumber,
    })
    .from(preconCards)
    .leftJoin(printings, eq(printings.scryfallId, preconCards.scryfallId))
    .where(eq(preconCards.fileName, fileName))
    .orderBy(preconCards.position);
  const tokenRows = await db
    .select({ tokenOracleId: tokenPrintings.tokenOracleId, name: tokens.name, quantity: preconTokens.quantity })
    .from(preconTokens)
    .innerJoin(tokenPrintings, eq(tokenPrintings.scryfallId, preconTokens.tokenPrintingId))
    .innerJoin(tokens, eq(tokens.oracleId, tokenPrintings.tokenOracleId))
    .where(eq(preconTokens.fileName, fileName));
  return {
    cards: rows.map((r) => ({
      oracleId: r.oracleId,
      quantity: r.quantity,
      foilQuantity: r.foilQuantity,
      printing: r.scryfallId && r.setCode && r.collectorNumber
        ? { scryfallId: r.scryfallId, setCode: r.setCode, collectorNumber: r.collectorNumber }
        : null,
    })),
    tokens: tokenRows,
  };
}

export type PreconAddResult =
  | {
      ok: true;
      entryId: string;
      cards: number;
      copies: number;
      foil: number;
      placed: AddedPlacement[];
      tokens: { marked: number; names: string[] };
    }
  | { ok: false; reason: "notFound" | "failed" };

/**
 * Adds the precon for one player as one entry. `actionId` is the idempotency id: a retry finds the
 * committed entry and answers from it: no placements (the first request's read is gone), and the
 * tokens it marked read back from `token_ownership`, where each carries the entry's id. A token a later
 * upload took over, or a revert removed, is no longer the entry's, so a retry after either reports it
 * no longer; a retry is the same request repeated within seconds, before either can happen.
 */
export async function addPreconForUser(
  userId: string,
  fileName: string,
  actionId: string,
  env: NodeJS.ProcessEnv,
  placements: boolean,
): Promise<PreconAddResult> {
  const precon = await readPreconForAdd(fileName);
  if (!precon) return { ok: false, reason: "notFound" };
  const lines = preconAddLines(precon.cards, precon.tokens);
  const result: ChangeResult = await applyCollectionChange(
    userId,
    { kind: "add", items: lines.items, preconTokens: lines.tokens },
    { id: actionId, env, source: preconSource(fileName), ...(placements ? { placements } : {}) },
  );
  const base = { cards: lines.cards, copies: lines.copies, foil: lines.foil };
  if (result.status === "applied") {
    const names = Object.fromEntries(result.entry.rows.map((r) => [r.oracleId, r.name]));
    const marked = result.tokensMarked ?? [];
    return {
      ok: true,
      entryId: result.entry.id,
      ...base,
      placed: result.raised ? placedOf(result.raised, names) : [],
      tokens: { marked: marked.length, names: marked.map((id) => lines.tokenNames[id] ?? "").filter(Boolean) },
    };
  }
  if (result.status === "alreadyApplied") {
    // The ledger knows a retry by player and kind alone, so an id reused from another add (a card's,
    // or another precon's) lands here too: only an entry this precon wrote is this action's success.
    const [entry] = await db.select({ source: collectionHistory.source }).from(collectionHistory)
      .where(and(eq(collectionHistory.id, result.entry.id), eq(collectionHistory.userId, userId)));
    if (entry?.source !== preconSource(fileName)) return { ok: false, reason: "failed" };
    const held = !(await tokenOwnershipTablesExist()) ? [] : await db.select({ id: tokenOwnership.tokenOracleId }).from(tokenOwnership)
      .where(and(eq(tokenOwnership.userId, userId), eq(tokenOwnership.entryId, result.entry.id)));
    return {
      ok: true, entryId: result.entry.id, ...base, placed: [],
      tokens: { marked: held.length, names: held.map((h) => lines.tokenNames[h.id] ?? "").filter(Boolean) },
    };
  }
  return { ok: false, reason: "failed" };
}
