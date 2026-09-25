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
): BrowseCard {
  const entries = printingRows
    .map((p) => ({
      scryfallId: p.scryfallId,
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
  const primary =
    entries.find((e) => e.scryfallId === card.scryfallId)?.printing ?? resolvedPrinting(result);
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
async function fitsGate(userId: string, oracleId: string): Promise<{ commanderLegal?: boolean; hasDecks?: boolean }> {
  try {
    const { db } = await import("../../db");
    const { sql } = await import("drizzle-orm");
    const { rows } = await db.execute<{ commander_legal: boolean; has_decks: boolean }>(sql`
      select c.commander_legal,
        exists (select 1 from decks d where d.user_id = ${userId} and d.commander_oracle_id is not null) as has_decks
      from cards c where c.oracle_id = ${oracleId}
    `);
    const r = rows[0];
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
  const owned = aggregateCollection(await selectCollectionRows(userId, oracleId));
  // Only for a card the user owns: the availability query is driven by the collection, so
  // an unowned card has no row there and nothing to report.
  if (owned.length > 0) {
    // The import is inside the guard so an unowned card never pays for it, and inside the
    // catch because a module that fails to resolve is as quiet a failure as a query that
    // fails to run — either way the modal omits the block rather than losing the card.
    // Started together, not one after the other: the two reads share nothing, and
    // this whole path runs on a click, so a serial pair would put both round trips
    // between the reader pressing a card and the modal filling in. Each still
    // fails on its own — `Promise.all` over two already-caught promises settles
    // with a null in the failed slot rather than rejecting the pair.
    const [availability, prices, proxiedBy, gate] = await Promise.all([
      (async () => {
        const { loadAvailability } = await import("../decks/availability-query");
        return (await loadAvailability(userId, { oracleIds: [oracleId] })).get(oracleId) ?? null;
      })().catch(() => null),
      pricesFor(oracleId),
      proxyingDecks(userId, oracleId),
      fitsGate(userId, oracleId),
    ]);
    return withComboPartners(
      await withBracketFacts({ ...owned[0], availability, prices, proxiedBy, ...gate }),
      userId,
      deckOracleIds,
    );
  }

  const { db } = await import("../../db");
  const { cards, printings, sets } = await import("../../db/schema");
  const { eq } = await import("drizzle-orm");
  const [card] = await db
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
    .where(eq(cards.oracleId, oracleId));
  if (!card) return null;

  // Started before the printings query is awaited: it depends on the oracle id
  // alone, and this path serves every unowned card and every deck row, so a serial
  // pair would add a whole round trip to the commonest open. Kicked off only after
  // the card is known to exist, so a miss costs no query at all.
  const prices = pricesFor(oracleId);
  // Started here too, not only on the owned branch. A card the player owns no
  // copy of is the COMMONEST proxy — the Ozolith case the spec is written
  // around — so a receipt that could only list printing decks for owned cards
  // would miss every one that matters.
  const proxiedBy = proxyingDecks(userId, oracleId);
  const gate = fitsGate(userId, oracleId);
  const printingRows = await db
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
    .where(eq(printings.oracleId, oracleId));
  // The unowned branch synthesises its card from the catalog, so `gameChanger` comes off
  // the `cards` row rather than from an aggregation — and without this the block never drew
  // for an unowned Game Changer at all.
  // BOTH BRANCHES, and the unowned one is the branch that matters most here. This block's
  // `you don't own it` state is by definition about cards the reader does not have — and a
  // reader following a partner into its own modal lands on exactly such a card. Enriching
  // only the owned branch left the block silently absent on the commonest open it has.
  return withComboPartners(
    await withBracketFacts({
      ...catalogCard(card, printingRows),
      facts: card.gameChanger ? ["gameChanger"] : undefined,
      prices: await prices,
      proxiedBy: await proxiedBy,
      ...(await gate),
    }),
    userId,
    deckOracleIds,
  );
});

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
