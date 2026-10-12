import type { SQL } from "drizzle-orm";
import type { CardBracketFlags } from "../bracket/flags-read";
import type { ModalComboPartner } from "../combos/near-miss";
// One card's full detail, for surfaces that hold nothing but an oracle id — the decklist,
// the Add panel and the builder spine (#127, #91). loadBrowseCards cannot serve them: it is
// rooted in collection_items, and a deck routinely lists cards the user does not own.

import { cache } from "react";
import type { PrintingPrices } from "../cards/price-lookup";
import type { BrowseCard, BrowsePrinting, ProxyingDeck } from "./browse";
import {
  aggregateCollection,
  coerceRarity,
  comparePrintings,
  resolveImageUri,
  resolveBackImageUri,
  resolvedPrinting,
  selectCollectionRows,
} from "./browse";

/** The `cards` columns the modal reads. */
export type CatalogCardRow = {
  oracleId: string;
  /** The printing `cards.imageUri` was ingested from — see `catalogCard`. */
  scryfallId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  cmc: number;
  oracleText: string | null;
  keywords: string[];
  rarity: string;
  colorIdentity: string[];
  imageUri: string | null;
  layout: string;
  backImageUri: string | null;
};

/** One `printings` row joined to its `sets` row. */
export type CatalogPrintingRow = {
  scryfallId: string;
  setCode: string;
  setName: string | null;
  collectorNumber: string;
  releasedAt: string | null;
  imageUri: string | null;
  /** This printing's own second face, null on every single-faced one. */
  backImageUri: string | null;
  flavorName: string | null;
};

/**
 * A BrowseCard for a card nobody owns: every printing the catalog knows, at quantity 0.
 *
 * The empty `finishes` is the honest answer rather than `{nonfoil: 0}` — the picker captions
 * a breakdown only when copies exist, and a zeroed finish would caption one that does not.
 */
export function catalogCard(
  card: CatalogCardRow,
  printingRows: CatalogPrintingRow[],
  /** The card's price read, when it arrived: it decides which printing the modal opens on. */
  prices: PrintingPrices | null = null,
): BrowseCard {
  const entries = printingRows
    .map((p) => ({
      scryfallId: p.scryfallId,
      // The printing's OWN picture. `printing.imageUri` below falls back to the oracle's, and a
      // printing drawn in another printing's art would put this one's price under that picture.
      ownArt: p.imageUri !== null,
      printing: {
        setCode: p.setCode.toUpperCase(),
        // This row IS the printing, so its id is never inferred here.
        scryfallId: p.scryfallId,
        setName: p.setName,
        collectorNumber: p.collectorNumber,
        releasedAt: p.releasedAt,
        quantity: 0,
        finishes: {},
        // Same tier order as an owned printing, minus the representative tier: this row IS the
        // exact printing, so tier 2 could only ever repeat it.
        imageUri: resolveImageUri({
          exactImageUri: p.imageUri,
          representativeImageUri: null,
          cardImageUri: card.imageUri,
        }),
        // Same shape, one tier shorter: this row IS the exact printing, so the
        // representative tier could only repeat it, and the oracle-level back is the
        // fallback a printing ingested before the column existed keeps.
        backImageUri: resolveBackImageUri({
          exactImageUri: p.imageUri,
          representativeImageUri: null,
          exactBackImageUri: p.backImageUri,
          representativeBackImageUri: null,
          backImageUri: card.backImageUri,
        }),
        // This row IS the exact printing, so its own column answers directly — no need
        // for `backImageIsOwn`'s tiering, which exists for the aggregate's three tiers.
        hasOwnBack: p.backImageUri !== null,
        flavorName: p.flavorName,
      } satisfies BrowsePrinting,
    }))
    .sort((a, b) => comparePrintings(a.printing, b.printing));
  const printings: BrowsePrinting[] = entries.map((e) => e.printing);

  const result: BrowseCard = {
    oracleId: card.oracleId,
    name: card.name,
    typeLine: card.typeLine,
    cmc: card.cmc,
    manaCost: card.manaCost,
    oracleText: card.oracleText,
    keywords: card.keywords,
    rarity: coerceRarity(card.rarity),
    colorIdentity: card.colorIdentity,
    imageUri: card.imageUri,
    // Locked decision 2: a card the player does not own keeps its oracle name.
    // There is no printing in hand to print one, and choosing among the
    // catalog's printings would assert a copy they do not have.
    printedName: null,
    layout: card.layout,
    backImageUri: card.backImageUri,
    quantity: 0,
    printings,
    setCodes: [...new Set(printings.map((p) => p.setCode))],
    primarySetCode: "",
    preferredPrinting: null,
  };

  // Art and caption come from the same printing, exactly as aggregateCollection insists.
  // A card whose printings never ingested keeps the oracle-level image and an empty set code.
  //
  // For a card nobody owns there is no preference to honour, so the primary is the printing
  // `cards.imageUri` was ingested from — `cards.scryfallId` names it exactly, and every surface
  // that shows an unowned card off the oracle row (the Consider tile, the suggestion list) is
  // already showing that art. Without this the primary fell out of `comparePrintings`, which
  // sorts by set code alphabetically: the modal opened on a different printing from the tile
  // the user had just tapped. The fallback covers the ~6% of oracle rows whose default printing
  // is not itself in `printings`.
  //
  // And the printing it opens on must be one the shop carries NOW, because the modal's price
  // tag belongs to the printing on screen. Opening on a printing the feed never stocked read
  // `no stock` over a card with five live printings (Zul Ashur: FDC #135 sorts before FDN).
  // So: the oracle's own printing when it is live, else the cheapest live printing with art,
  // else as before. Live is AGENTS.md's rule: a non-foil price at the newest `as_of`. The
  // chosen printing moves to the FRONT of the list too, because the modal resolves its art,
  // caption and price from the first printing with art (`resolvedPrinting`), not from this
  // card-level field; before, the two could name different printings.
  const oracleDefault = entries.find((e) => e.scryfallId === card.scryfallId);
  const live = (scryfallId: string) => {
    const fact = prices?.byScryfallId[scryfallId];
    return prices?.newestAsOf != null && fact !== undefined && fact.cents !== null
      && fact.asOf.getTime() === prices.newestAsOf.getTime() ? fact.cents : null;
  };
  const withArt = entries.filter((e) => e.ownArt);
  const cheapestLive = withArt
    .map((e) => ({ e, cents: live(e.scryfallId) }))
    .filter((x): x is { e: (typeof entries)[number]; cents: number } => x.cents !== null)
    .sort((a, b) => a.cents - b.cents)[0]?.e;
  const opensOn =
    (oracleDefault && oracleDefault.ownArt && live(oracleDefault.scryfallId) !== null
      ? oracleDefault
      : undefined)
    ?? cheapestLive;
  if (opensOn) {
    result.printings = [opensOn.printing, ...printings.filter((p) => p !== opensOn.printing)];
  }
  const primary = opensOn?.printing
    ?? oracleDefault?.printing
    ?? resolvedPrinting(result);
  if (primary) {
    result.primarySetCode = primary.setCode;
    result.imageUri = primary.imageUri;
  }
  return result;
}

/**
 * The Fits door's gate, in one read: whether the card is Commander-legal, and whether the reader
 * has a deck with a commander. Swallowed to an empty object on failure, which leaves the door shut.
 */
type GateReader = { execute: (q: SQL) => Promise<{ rows: unknown[] }> };
export async function fitsGate(
  userId: string,
  oracleId: string,
  on?: GateReader,
  enabled?: boolean,
): Promise<{ commanderLegal?: boolean; hasDecks?: boolean }> {
  // Nothing reads the gate while the swap tools are off, so a deployment without them pays no
  // round trip for it: the fields stay absent, which is also the door's closed state.
  if (!(enabled ?? (await import("../swaps/flag")).swapToolsEnabled())) return {};
  try {
    const reader = on ?? ((await import("../../db")).db as unknown as GateReader);
    const { sql } = await import("drizzle-orm");
    const { rows } = await reader.execute(sql`
      select c.commander_legal,
        exists (select 1 from decks d where d.user_id = ${userId} and d.commander_oracle_id is not null) as has_decks
      from cards c where c.oracle_id = ${oracleId}
    `);
    const r = rows[0] as { commander_legal: boolean; has_decks: boolean } | undefined;
    return r ? { commanderLegal: r.commander_legal, hasDecks: r.has_decks } : {};
  } catch {
    return {};
  }
}

/**
 * The decks printing this card, newest first.
 *
 * Membership-scoped like every other proxy read: a row whose card has left the
 * deck names no deck here. `pruneOrphanProxies` means such a row should not
 * exist at all, and this is the reading half of that belt-and-braces pair.
 *
 * Failure is swallowed to null-ish, as the availability read beside it is: the
 * modal omits a block rather than losing the card.
 */
async function proxyingDecks(userId: string, oracleId: string): Promise<ProxyingDeck[] | null> {
  try {
    // INSIDE the try, as `pricesFor` does it: a module that fails to resolve is
    // as quiet a failure as a query that fails to run, and the block is optional
    // either way. Left outside, a rejected import took the whole card down.
    const { db } = await import("../../db");
    const { sql } = await import("drizzle-orm");
    return await db
    .execute<{ id: string; name: string }>(sql`
      select d.id, d.name
      from deck_proxies p
      join decks d on d.id = p.deck_id
      where d.user_id = ${userId}
        and p.oracle_id = ${oracleId}
        and (
          exists (
            select 1 from deck_cards dc
            where dc.deck_id = p.deck_id and dc.oracle_id = p.oracle_id
          )
          or d.commander_oracle_id = p.oracle_id
          or d.partner_oracle_id = p.oracle_id
        )
      order by p.created_at desc, d.id
    `)
    .then((r) => r.rows);
  } catch {
    // NULL, not `[]`. An empty list is a statement — *no deck prints this* — and
    // a failed read has no standing to make it: the sheet would draw an
    // unchecked toggle over an already-proxied card, and the reader's press
    // would send the idempotent mark, leaving them no way to unmark it.
    // Synchronous throws too; a db stub with no `execute` is the usual one.
    return null;
  }
}

/**
 * The two bracket facts that are not columns on `cards`, for ONE card.
 *
 * The modal is the surface that spells the facts out, so it is the one that most needs
 * them complete — and it is reached from `/collection`, a deck page and the card view
 * alike, on a click. `gameChanger` already rides whichever row produced the card; this
 * adds the joined pair.
 *
 * FAIL-SOFT, like every other read on this path: a failure omits the block rather than
 * losing the card. An absent flag row means neither fact applies and nothing more — it is
 * never a claim that the card is clear.
 */
/**
 * The card's two-card combo partners, for the modal's block.
 *
 * FAIL-SOFT and injected, exactly like `withBracketFacts` beside it and for the same reason:
 * without the seam, deleting this function leaves the whole suite green while the modal
 * silently loses its block. A failure omits the block rather than losing the card — the block
 * is a receipt, and nothing on this path depends on it to draw the rest.
 *
 * `deckOracleIds` is what makes `in this deck` sayable. Opened from `/collection` there is no
 * deck in scope and that state has no referent, which is what the block's scope line exists
 * to make visible rather than leaving it looking like an inconsistency.
 */
export async function withComboPartners(
  card: BrowseCard,
  userId: string,
  deckOracleIds?: readonly string[],
  read?: (args: {
    userId: string;
    oracleId: string;
    deckOracleIds?: readonly string[];
  }) => Promise<ModalComboPartner[]>,
): Promise<BrowseCard> {
  try {
    const load = read ?? (await import("../combos/near-miss")).loadCardComboPartners;
    const partners = await load({ userId, oracleId: card.oracleId, deckOracleIds });
    // OMITTED WHEN EMPTY rather than sent as `[]`: the block is absent entirely when nothing
    // is detected — no heading, no empty state, no reserved height — and an empty array would
    // spend payload to say what an absent field already says.
    return partners.length > 0 ? { ...card, comboPartners: partners } : card;
  } catch {
    return card;
  }
}

export async function withBracketFacts(
  card: BrowseCard,
  /**
   * The flags read, injected so the assembly is testable without a database — the same
   * seam `attachBracketFacts` takes, and for the same reason: without it, deleting this
   * function leaves the whole suite green while the modal silently loses two of the three
   * facts on both branches.
   */
  read?: (ids: readonly string[]) => Promise<Map<string, CardBracketFlags>>,
): Promise<BrowseCard> {
  try {
    const loadBracketFlags = read ?? (await import("../bracket/flags-read")).loadBracketFlags;
    const { factsFor } = await import("../bracket/facts");
    const flags = await loadBracketFlags([card.oracleId]);
    const facts = factsFor(
      card.facts?.includes("gameChanger") ?? false,
      flags.get(card.oracleId),
    );
    return facts ? { ...card, facts } : card;
  } catch {
    return card;
  }
}

/**
 * Server query — the owned view of a card when the user has one, else the catalog view.
 * Returns null only when the oracle id is not in `cards` at all.
 *
 * Availability rides along because the modal renders it and every other surface that opens
 * the modal holds only an oracle id: `/collection` joins it onto its own rows, so without
 * this the same card showed its claims there and hid them everywhere else. The vantage is
 * the default one — `free = owned − hard`, card-availability row 1.5 — with no deck
 * excluded, because the modal is off any deck's own decklist even when opened from one.
 *
 * Quiet failure matches `/collection`: a failed read leaves availability null and the modal
 * simply omits the block, rather than losing the card.
 *
 * Untested-query pattern: the SQL is logic-free and the synthesis lives in `catalogCard`,
 * which is covered by tests.
 */
export const loadCardDetail = cache(async function loadCardDetail(
  userId: string,
  oracleId: string,
  /** The deck the modal was opened from, if any. See `withComboPartners`. */
  deckOracleIds?: readonly string[],
): Promise<BrowseCard | null> {
  // TWO STAGES, and never more. Every read below is keyed on (reader, oracle id) alone, so none
  // waits on another's answer. They used to run in serial stages, each a round trip to the
  // database between a press and the modal filling in: four for an owned card (collection, then
  // availability with the three side reads, then the bracket flags, then the combo partners) and
  // five for an unowned one (collection, then the `cards` row, then printings with the three side
  // reads, then the flags, then the partners). Stage 1 is the two reads that decide
  // WHICH card this is and whether it exists at all; stage 2 is everything else, together.
  //
  // Stage 1 carries both branches' first read so an unknown id stops after two queries and
  // fires nothing else: a missing card is rare, and it is the one case where the fan-out would
  // be all waste.
  const { db } = await import("../../db");
  const { cards, printings, sets } = await import("../../db/schema");
  const { eq } = await import("drizzle-orm");
  // Both started now; only the collection is awaited before branching. An owned card never
  // reads the catalog row, so it must not wait on it either — a slow catalog read would
  // otherwise hold every owned card's modal. `settle` keeps the abandoned read from rejecting
  // with nothing listening.
  //
  // A DELIBERATE SPECULATIVE READ. An owned card pays for a `cards` lookup it discards: one
  // primary-key query and, for its length, one more pool connection (seven at most, of pg's ten).
  // Started only after the collection answered, the unowned path — every card the reader does not
  // hold, the commonest open — would take three round trips instead of two. One cheap read on the
  // owned path buys a round trip on the other one.
  const catalog = settle(() => db
      .select({
        oracleId: cards.oracleId,
        scryfallId: cards.scryfallId,
        name: cards.name,
        typeLine: cards.typeLine,
        cmc: cards.cmc,
        manaCost: cards.manaCost,
        oracleText: cards.oracleText,
        keywords: cards.keywords,
        gameChanger: cards.gameChanger,
        rarity: cards.rarity,
        colorIdentity: cards.colorIdentity,
        imageUri: cards.imageUri,
        layout: cards.layout,
        backImageUri: cards.backImageUri,
      })
      .from(cards)
      .where(eq(cards.oracleId, oracleId)));
  const owned = aggregateCollection(await selectCollectionRows(userId, oracleId));
  // The catalog row is the UNOWNED branch's card. An owned card is built from the collection's
  // own join and never reads it, so a failed catalog read there costs nothing; only the branch
  // that needs it fails with it, exactly as it did when it was the only one reading it.
  const card = owned.length === 0 ? unwrap(await catalog)[0] : undefined;
  // Not a card the catalog holds: perhaps a token, whose details the modal opens the same way (bug
  // batch 2026-10-12). Asked here so the press, the prefetch and every re-read take one path.
  // Imported here, as the database is above, so a module that imports this one for its types or
  // helpers does not pull the client in.
  if (owned.length === 0 && !card) return (await import("../tokens/detail")).loadTokenDetail(oracleId);

  // Stage 2. Each read fails on its own: every one is already caught (`pricesFor`,
  // `proxyingDecks`, `fitsGate`, the availability read) or settled here (the flags and the
  // partners, whose assembly functions own their own catch), so `Promise.all` never rejects
  // for one of them and a failed read costs the reader a block, never the card.
  const prices = pricesFor(oracleId);
  // Both branches, not only the owned one: a card the player owns no copy of is the
  // COMMONEST proxy — the Ozolith case the spec is written around.
  const proxiedBy = proxyingDecks(userId, oracleId);
  const gate = fitsGate(userId, oracleId);
  const flags = settle(async () => (await import("../bracket/flags-read")).loadBracketFlags([oracleId]));
  const partners = settle(async () =>
    (await import("../combos/near-miss")).loadCardComboPartners({ userId, oracleId, deckOracleIds }),
  );
  const assemble = async (base: BrowseCard) =>
    withComboPartners(await withBracketFacts(base, () => unsettle(flags)), userId, deckOracleIds, () => unsettle(partners));

  if (owned.length > 0) {
    // Only for a card the user owns: the availability query is driven by the collection, so
    // an unowned card has no row there and nothing to report. The import is inside the catch
    // because a module that fails to resolve is as quiet a failure as a query that fails to
    // run — either way the modal omits the block rather than losing the card.
    const availability = (async () => {
      const { loadAvailability } = await import("../decks/availability-query");
      return (await loadAvailability(userId, { oracleIds: [oracleId] })).get(oracleId) ?? null;
    })().catch(() => null);
    const [a, p, pb, g] = await Promise.all([availability, prices, proxiedBy, gate]);
    return assemble({ ...owned[0], availability: a, prices: p, proxiedBy: pb, ...g });
  }

  // `card` is known here: stage 1 returned when the unowned branch found none.
  const found = card!;
  const printingRows = db
    .select({
      scryfallId: printings.scryfallId,
      setCode: printings.setCode,
      setName: sets.name,
      collectorNumber: printings.collectorNumber,
      releasedAt: sets.releasedAt,
      imageUri: printings.imageUri,
      backImageUri: printings.backImageUri,
      flavorName: printings.flavorName,
    })
    .from(printings)
    // sets.code is the primary key, so this is at most 1:1 and multiplies no rows.
    .leftJoin(sets, eq(sets.code, printings.setCode))
    .where(eq(printings.oracleId, oracleId))
    // Fail-soft like every other stage-2 read: a card with no printings still renders, from the
    // catalog row alone, where a rejection here would have lost the card.
    .catch(() => []);
  const [pr, p, pb, g] = await Promise.all([printingRows, prices, proxiedBy, gate]);
  // The unowned branch synthesises its card from the catalog, so `gameChanger` comes off
  // the `cards` row rather than from an aggregation — and without this the block never drew
  // for an unowned Game Changer at all.
  // BOTH BRANCHES get the bracket facts and the partners, and the unowned one is the branch
  // that matters most for the partners: their `you don't own it` state is by definition about
  // cards the reader does not have — and a reader following a partner into its own modal lands
  // on exactly such a card.
  return assemble({
    ...catalogCard(found, pr, p),
    facts: found.gameChanger ? ["gameChanger"] : undefined,
    prices: p,
    proxiedBy: pb,
    ...g,
  });
});

/**
 * A read started now and awaited later, held as a result rather than a promise that may reject
 * with nothing listening: a rejection that lands before anyone awaits it is an unhandled one,
 * which Node treats as fatal.
 */
type Result<T> = { ok: true; value: T } | { ok: false; error: unknown };
function settle<T>(read: () => PromiseLike<T>): Promise<Result<T>> {
  return Promise.resolve()
    .then(read)
    .then((value) => ({ ok: true as const, value }), (error) => ({ ok: false as const, error }));
}
function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw r.error;
  return r.value;
}
async function unsettle<T>(held: Promise<Result<T>>): Promise<T> {
  return unwrap(await held);
}

/**
 * The card's prices, or null. Swallowed for the same reason the availability read
 * above is: a feed that cannot be reached costs the reader a figure, never the
 * card.
 *
 * Null is NOT the same state as "the feed has never carried this printing", and
 * the two are drawn differently. Null means nobody asked the store anything, and
 * the modal draws nothing at all; a successful read with no row for this printing
 * means the store answered, and the modal draws `no stock`. What neither may ever
 * become is a price of nothing.
 */
async function pricesFor(oracleId: string): Promise<PrintingPrices | null> {
  return (async () => {
    const { loadPrintingPrices } = await import("../cards/prices");
    return loadPrintingPrices(oracleId);
  })().catch(() => null);
}
