/**
 * `db:seed:precons`: replaces `precons`, `precon_cards` and `precon_tokens` from the feed (plan
 * `2026-10-11-commander-precons.md`, PR 1; brief locks 2, 3 and 5).
 *
 * `planPrecons` is pure, so every rule the publish obeys is unit tested without a database: what
 * maps, what is dropped and counted, which decks are twins, and the floors under which nothing is
 * published. `ingestPrecons` reads the ids the feed names, plans, and replaces both tables in ONE
 * transaction, so a reader never sees half a generation, then stamps the catalog generation.
 */
import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, preconCards, precons, preconTokens, printings, tokenPrintings } from "../../db/schema";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { stampFirstSeen } from "../catalog/first-seen";
import { MIN_PRECONS, PRECON_SIZE, type PreconFeed } from "./feed";

/** Unmapped copies, as a share of every copy listed: 0 of 19,700 on 2026-10-11. */
export const MAX_UNMAPPED_SHARE = 0.01;

export type PreconRow = typeof precons.$inferInsert;
export type PreconCardRow = typeof preconCards.$inferInsert;
export type PreconTokenRow = typeof preconTokens.$inferInsert;

export type PreconPlan = {
  precons: PreconRow[];
  cards: PreconCardRow[];
  tokens: PreconTokenRow[];
  report: {
    listed: number;
    kept: number;
    twins: number;
    /** Copies across the decks of the right size: the unmapped share's denominator. */
    copies: number;
    unmappedCopies: number;
    printingsMissing: number;
    /** Token copies of kept decks the token catalog lacks (markers such as The Monarch among them). */
    tokensMissing: number;
    /** Decks dropped whole, with why. */
    dropped: string[];
  };
  /** Why nothing may be published, or empty. */
  refusals: string[];
};

const COLLECTOR = /collector'?s edition/i;

/**
 * The publish, planned. A card whose oracle id the catalog lacks is dropped and counted on its
 * deck (lock 3); one whose printing the catalog lacks keeps its card with no printing. Twins are
 * decks of one set whose mapped lists are identical, commanders included (16 on 2026-10-11, every
 * one a Collector's Edition); the plain edition stands for them.
 */
export function planPrecons(
  feed: PreconFeed,
  knownOracles: ReadonlySet<string>,
  knownPrintings: ReadonlySet<string>,
  knownTokens: ReadonlySet<string>,
): PreconPlan {
  const rows: PreconRow[] = [];
  const cardRows: PreconCardRow[] = [];
  const tokenRows: PreconTokenRow[] = [];
  let tokensMissing = 0;
  const dropped: string[] = [];
  const listKey = new Map<string, string>();
  let copies = 0;
  let unmappedCopies = 0;
  let printingsMissing = 0;

  for (const deck of feed.decks) {
    const size = deck.cards.reduce((n, c) => n + c.count, 0);
    const unmapped = deck.cards.reduce((n, c) => (c.oracleId === null || !knownOracles.has(c.oracleId) ? n + c.count : n), 0);
    // The share's numerator takes every listed deck's unmapped copies, dropped or kept, so a
    // malformed deck cannot hide its own; its denominator takes only decks of the right size, so
    // a malformed deck cannot dilute the share either.
    if (size === PRECON_SIZE) copies += size;
    unmappedCopies += unmapped;
    if (size !== PRECON_SIZE) { dropped.push(`${deck.fileName}: ${size} cards, not ${PRECON_SIZE}`); continue; }
    if (!deck.cards.some((c) => c.commander)) { dropped.push(`${deck.fileName}: no commander`); continue; }

    // One row per (card, printing, commander); the feed can list one printing twice (a foil beside a
    // non-foil), so the foil copies are counted on the row rather than splitting it.
    const merged = new Map<string, { oracleId: string; scryfallId: string | null; quantity: number; foilQuantity: number; isCommander: boolean }>();
    for (const c of deck.cards) {
      if (c.oracleId === null || !knownOracles.has(c.oracleId)) continue;
      const scryfallId = c.scryfallId !== null && knownPrintings.has(c.scryfallId) ? c.scryfallId : null;
      if (scryfallId === null) printingsMissing += c.count;
      const k = `${c.oracleId}|${scryfallId ?? ""}|${c.commander}`;
      const at = merged.get(k);
      const foil = c.foil ? c.count : 0;
      if (at) { at.quantity += c.count; at.foilQuantity += foil; }
      else merged.set(k, { oracleId: c.oracleId, scryfallId, quantity: c.count, foilQuantity: foil, isCommander: c.commander });
    }
    if (![...merged.values()].some((c) => c.isCommander)) { dropped.push(`${deck.fileName}: its commander is not in the catalog`); continue; }

    rows.push({ fileName: deck.fileName, name: deck.name, setCode: deck.code, releaseDate: deck.releaseDate, twinOf: null, unmappedCount: unmapped });
    let position = 0;
    for (const c of merged.values()) cardRows.push({ fileName: deck.fileName, position: position++, ...c });
    const tokens = new Map<string, number>();
    for (const t of deck.tokens) {
      if (t.scryfallId === null || !knownTokens.has(t.scryfallId)) { tokensMissing += t.count; continue; }
      tokens.set(t.scryfallId, (tokens.get(t.scryfallId) ?? 0) + t.count);
    }
    for (const [tokenPrintingId, quantity] of tokens) tokenRows.push({ fileName: deck.fileName, tokenPrintingId, quantity });

    // The list as a multiset of cards, printing aside, within one set: twins are the same 100 cards
    // sold twice in one release (a Collector's Edition). A Commander Anthology reprinting a 2015
    // list years later is its own product and its own row, though its cards are identical.
    const byCard = new Map<string, number>();
    for (const c of merged.values()) {
      const k = `${c.oracleId}|${c.isCommander}`;
      byCard.set(k, (byCard.get(k) ?? 0) + c.quantity);
    }
    // A deck missing cards is never a twin: what it lacks has no identity to compare, so two
    // different products could otherwise match on what remains.
    listKey.set(deck.fileName, unmapped > 0 ? `unmapped:${deck.fileName}` : `${deck.code}:${[...byCard].map(([k, n]) => `${k}|${n}`).sort().join(",")}`);
  }

  let twins = 0;
  const groups = new Map<string, PreconRow[]>();
  for (const r of rows) {
    const k = listKey.get(r.fileName)!;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [lead] = [...group].sort((a, b) =>
      Number(COLLECTOR.test(a.name)) - Number(COLLECTOR.test(b.name))
      || String(a.releaseDate).localeCompare(String(b.releaseDate))
      || a.fileName.localeCompare(b.fileName));
    for (const r of group) if (r !== lead) { r.twinOf = lead.fileName; twins++; }
  }

  const refusals: string[] = [];
  if (rows.length < MIN_PRECONS) refusals.push(`${rows.length} precons kept, under the floor of ${MIN_PRECONS}`);
  if (copies > 0 && unmappedCopies / copies > MAX_UNMAPPED_SHARE) {
    refusals.push(`${unmappedCopies} of ${copies} copies are not in the catalog, over the ${MAX_UNMAPPED_SHARE * 100}% cap`);
  }

  return {
    precons: rows,
    cards: cardRows,
    tokens: tokenRows,
    report: { listed: feed.decks.length, kept: rows.length, twins, copies, unmappedCopies, printingsMissing, tokensMissing, dropped },
    refusals,
  };
}

/**
 * Whether this database has the precon tables yet, `precon_tokens` included (it arrived with
 * `precon_cards.foil_quantity`, in one migration). The catalog refresh runs the seed scripts
 * directly and never migrates, so the first run after the merge can reach a database whose deploy
 * has not applied the migration: that run skips cleanly rather than going red.
 */
export async function preconTablesExist(): Promise<boolean> {
  const res = await db.execute(sql`select to_regclass('public.precons') is not null and to_regclass('public.precon_cards') is not null
    and to_regclass('public.precon_tokens') is not null as ok`);
  return Boolean((res.rows[0] as { ok?: unknown } | undefined)?.ok);
}

const BATCH = 500;
const LOOKUP = 1000;

async function knownIds(ids: string[], read: (chunk: string[]) => Promise<string[]>): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < ids.length; i += LOOKUP) for (const id of await read(ids.slice(i, i + LOOKUP))) out.add(id);
  return out;
}

export type IngestResult = { published: true; plan: PreconPlan } | { published: false; plan: PreconPlan };

export async function ingestPrecons(feed: PreconFeed): Promise<IngestResult> {
  const oracleIds = [...new Set(feed.decks.flatMap((d) => d.cards.map((c) => c.oracleId)).filter((x): x is string => x !== null))];
  const scryfallIds = [...new Set(feed.decks.flatMap((d) => d.cards.map((c) => c.scryfallId)).filter((x): x is string => x !== null))];
  const knownOracles = await knownIds(oracleIds, async (chunk) =>
    (await db.select({ id: cards.oracleId }).from(cards).where(inArray(cards.oracleId, chunk))).map((r) => r.id));
  const knownPrintings = await knownIds(scryfallIds, async (chunk) =>
    (await db.select({ id: printings.scryfallId }).from(printings).where(inArray(printings.scryfallId, chunk))).map((r) => r.id));
  const tokenIds = [...new Set(feed.decks.flatMap((d) => d.tokens.map((t) => t.scryfallId)).filter((x): x is string => x !== null))];
  const knownTokens = await knownIds(tokenIds, async (chunk) =>
    (await db.select({ id: tokenPrintings.scryfallId }).from(tokenPrintings).where(inArray(tokenPrintings.scryfallId, chunk))).map((r) => r.id));

  const plan = planPrecons(feed, knownOracles, knownPrintings, knownTokens);
  if (plan.refusals.length > 0) return { published: false, plan };

  await db.transaction(async (tx) => {
    await tx.delete(preconTokens);
    await tx.delete(preconCards);
    await tx.delete(precons);
    for (let i = 0; i < plan.precons.length; i += BATCH) await tx.insert(precons).values(plan.precons.slice(i, i + BATCH));
    for (let i = 0; i < plan.cards.length; i += BATCH) await tx.insert(preconCards).values(plan.cards.slice(i, i + BATCH));
    for (let i = 0; i < plan.tokens.length; i += BATCH) await tx.insert(preconTokens).values(plan.tokens.slice(i, i + BATCH));
  });
  // Apart from the publish: the rows above are replaced every run, so when a precon first arrived lives in its own table.
  await stampFirstSeen("precon", plan.precons.map((p) => p.fileName));
  await stampCatalogRefresh();
  return { published: true, plan };
}
