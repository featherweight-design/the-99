// Which printing a deck shows for each of its cards (deck printings, collection home sub-project 3).
//
// THE CHAIN, in order: the deck's own pick, when the player still holds that printing; else the
// Collection's pick (`card_art_preferences`); else the default the Collection's resolver lands on;
// and for a card the player does not own at all, the catalog's oracle-level printing, which is the
// printing whose art those rows draw today (or, where the catalog skipped that printing, the
// card's first printing with art). Every card the catalog lists therefore resolves, which is what
// lets a version record a printing for every card it holds.
//
// A PICK THAT IS NO LONGER HELD IS IGNORED, NOT DELETED. A Replace upload deletes and re-adds the
// whole collection in one transaction, and deleting picks on a collection write would wipe every
// deck's choices on every re-upload. Reading it as absent draws exactly the handoff's state (the
// deck falls down the chain, no dormant tile, no notice); re-acquiring that printing restores it.
//
// The pick is the second step here, never a separate rule: `aggregateCollection` is where the
// Collection's own precedence lives, and asking it for the card's held printings is what keeps a
// deck pick and the Collection's pick from disagreeing about which printings exist.
import { sql } from "drizzle-orm";
import { db } from "../../db";
import {
  aggregateCollection,
  cardArt,
  matchesPreference,
  resolvedPrinting,
  selectCollectionRows,
  type BrowsePrinting,
} from "../collection/browse";
import { recordSoftFailure } from "../cache/soft-failure";
import { deckPrintingsEnabled } from "./printings-flag";
import type { PricePick } from "./price-query";

/** A deck's pick as stored: `set_code` lowercase, `collector_number` text. */
export type DeckPick = { setCode: string; collectorNumber: string };

/**
 * Where a resolved printing came from, in chain order. `catalogSubstitute` is an unowned card whose
 * oracle-level printing the catalog does not list, resolved to another printing of it: every surface
 * draws `cards.image_uri` for such a card, so the substitute names a printing nothing showed, and a
 * version never records it.
 */
export type DeckPrintingSource = "deck" | "collection" | "catalog" | "catalogSubstitute";

export type DeckPrinting = {
  /** Copies owned across EVERY printing of the card; 0 for a card the player does not own. */
  quantity: number;
  printedName: string | null;
  imageUri: string | null;
  artCropUri: string | null;
  /** Uppercased for display, as `BrowsePrinting.setCode` is. */
  setCode: string;
  collectorNumber: string;
  source: DeckPrintingSource;
};

export type DeckPrintings = {
  printings: Map<string, DeckPrinting>;
  /**
   * The deck's picks the player still holds, keyed by oracle id. A stored pick for a printing that
   * left the Collection is absent here, so a price read handed this map never prices a printing
   * the art no longer shows.
   */
  heldPicks: Map<string, DeckPick>;
};

/**
 * Every pick stored for these decks, keyed by deck then oracle id.
 *
 * Scoped to the player's own decks and to current membership (a `deck_cards` row or either
 * commander column), like every proxy read: a pick whose card has left the deck names nothing.
 * `pruneOrphanProxies` deletes such a row; this is the reading half of that pair.
 */
export async function readDeckPicks(
  userId: string,
  deckIds: string[],
): Promise<Map<string, Map<string, DeckPick>>> {
  const out = new Map<string, Map<string, DeckPick>>();
  const ids = [...new Set(deckIds)];
  if (ids.length === 0) return out;
  const { rows } = await db.execute<{
    deck_id: string;
    oracle_id: string;
    set_code: string;
    collector_number: string;
  }>(sql`
    select dp.deck_id, dp.oracle_id, dp.set_code, dp.collector_number
    from deck_printings dp
    join decks d on d.id = dp.deck_id
    where d.user_id = ${userId}
      and dp.deck_id = any(${sql.param(ids)}::uuid[])
      and (
        exists (
          select 1 from deck_cards dc
          where dc.deck_id = dp.deck_id and dc.oracle_id = dp.oracle_id
        )
        or d.commander_oracle_id = dp.oracle_id
        or d.partner_oracle_id = dp.oracle_id
      )
  `);
  for (const r of rows) {
    const deck = out.get(r.deck_id) ?? new Map<string, DeckPick>();
    deck.set(r.oracle_id, { setCode: r.set_code, collectorNumber: r.collector_number });
    out.set(r.deck_id, deck);
  }
  return out;
}

/** The held printing a pick names, or undefined when the player no longer holds it. */
export function heldPrintingFor(
  printings: BrowsePrinting[],
  pick: DeckPick | undefined,
): BrowsePrinting | undefined {
  if (!pick) return undefined;
  // `BrowsePrinting.setCode` is uppercased for display; a pick is stored lowercase.
  return printings.find((p) =>
    matchesPreference(p, { setCode: pick.setCode.toUpperCase(), collectorNumber: pick.collectorNumber }),
  );
}

/**
 * The printing this deck shows for each card, down the chain above, plus the picks still held.
 *
 * `usePicks: false` skips the deck's step entirely, which is the switch-off path: the answer is
 * then the Collection's and the catalog's alone, exactly what every deck surface drew before.
 *
 * THROWS on a failed read. `resolveDeckPrintings` is the fail-soft form for surfaces that draw art.
 * The commit uses the fail-soft form on purpose: a version's cards are the commit and the printing
 * is a caption, so a failed read records nulls (which read as today's art) rather than refusing the
 * commit.
 */
export async function readDeckPrintings(
  userId: string,
  deckId: string,
  oracleIds: string[],
  /**
   * `ownedOnly` skips the catalog step, for a caller that drops unowned cards anyway: the owned-only
   * helpers below, which would otherwise pay a catalog read only to throw its answer away.
   */
  opts: { usePicks: boolean; ownedOnly?: boolean },
): Promise<DeckPrintings> {
  const printings = new Map<string, DeckPrinting>();
  const heldPicks = new Map<string, DeckPick>();
  const ids = [...new Set(oracleIds)];
  if (ids.length === 0) return { printings, heldPicks };

  const [picksByDeck, rows] = await Promise.all([
    opts.usePicks ? readDeckPicks(userId, [deckId]) : Promise.resolve(new Map<string, Map<string, DeckPick>>()),
    selectCollectionRows(userId, ids),
  ]);
  const picks = picksByDeck.get(deckId) ?? new Map<string, DeckPick>();

  for (const card of aggregateCollection(rows)) {
    const pick = picks.get(card.oracleId);
    const held = heldPrintingFor(card.printings, pick);
    const p = held ?? resolvedPrinting(card);
    if (!p) continue;
    if (held && pick) heldPicks.set(card.oracleId, pick);
    printings.set(card.oracleId, {
      quantity: card.quantity,
      // The Collection's own resolution already carries its printed name; a deck pick may be a
      // different printing, so its name is worked out from that printing by the one rule.
      printedName: held ? cardArt(card.name, held).printedName : card.printedName,
      imageUri: p.imageUri,
      artCropUri: p.artCropUri ?? null,
      setCode: p.setCode,
      collectorNumber: p.collectorNumber,
      source: held ? "deck" : "collection",
    });
  }

  const unowned = opts.ownedOnly ? [] : ids.filter((id) => !printings.has(id));
  if (unowned.length > 0) {
    // The oracle-level printing: `cards.scryfall_id` names one printing of the card, and that
    // printing's art is what `cards.image_uri` draws for a card nobody owns. That id is not always
    // a row in `printings` (a printing the ingest skipped), so the lateral takes it when it is and
    // otherwise the card's first printing with art; a card with no printing at all keeps its
    // oracle-level art and names no printing (`""`), which a version records as unknown.
    const { rows: catalog } = await db.execute<{
      oracle_id: string;
      name: string;
      set_code: string | null;
      collector_number: string | null;
      image_uri: string | null;
      art_crop_uri: string | null;
      flavor_name: string | null;
      exact: boolean | null;
    }>(sql`
      select c.oracle_id, c.name, p.set_code, p.collector_number, p.exact,
             coalesce(p.image_uri, c.image_uri) as image_uri,
             coalesce(p.art_crop_uri, c.art_crop_uri) as art_crop_uri,
             p.flavor_name
      from cards c
      left join lateral (
        select pr.set_code, pr.collector_number, pr.image_uri, pr.art_crop_uri, pr.flavor_name,
               -- Exact only when that printing also supplied the art: one with a null image draws
               -- the card's own art, so it names a printing no surface showed.
               (pr.scryfall_id = c.scryfall_id and pr.image_uri is not null) as exact
        from printings pr
        where pr.oracle_id = c.oracle_id
        order by (pr.scryfall_id = c.scryfall_id) desc, (pr.image_uri is null), pr.scryfall_id
        limit 1
      ) p on true
      where c.oracle_id = any(${sql.param(unowned)}::uuid[])
    `);
    for (const r of catalog) {
      printings.set(r.oracle_id, {
        quantity: 0,
        printedName: r.flavor_name !== null && r.flavor_name !== r.name ? r.flavor_name : null,
        imageUri: r.image_uri,
        artCropUri: r.art_crop_uri,
        setCode: (r.set_code ?? "").toUpperCase(),
        collectorNumber: r.collector_number ?? "",
        source: r.exact === false ? "catalogSubstitute" : "catalog",
      });
    }
  }

  return { printings, heldPicks };
}

/**
 * The same read, fail-soft: a failed lookup returns empty maps, and every surface keeps the
 * oracle-level art it arrived with, which is the rendering before this existed.
 */
export async function resolveDeckPrintings(
  userId: string,
  deckId: string,
  oracleIds: string[],
  /**
   * `ownedOnly` skips the catalog step, for a caller that drops unowned cards anyway: the owned-only
   * helpers below, which would otherwise pay a catalog read only to throw its answer away.
   */
  opts: { usePicks: boolean; ownedOnly?: boolean },
): Promise<DeckPrintings> {
  return readDeckPrintings(userId, deckId, oracleIds, opts).catch(() => {
    recordSoftFailure();
    return { printings: new Map(), heldPicks: new Map() };
  });
}

/**
 * The printing this deck shows for each card the player OWNS, in `resolveOwnedPrintings`' shape:
 * a card they do not own is absent, so every caller's "fall back to the oracle-level art" stays
 * exactly as it was. The deck's step follows `DECK_PRINTINGS_ENABLED`. Fail-soft.
 */
export async function resolveDeckOwnedPrintings(
  userId: string,
  deckId: string,
  oracleIds: string[],
): Promise<Map<string, DeckPrinting>> {
  const { printings } = await resolveDeckPrintings(userId, deckId, oracleIds, { usePicks: deckPrintingsEnabled(), ownedOnly: true });
  return ownedOnly(printings);
}

/** The same, and it THROWS on a failed read, for a caller that states ownership from it. */
export async function readDeckOwnedPrintings(
  userId: string,
  deckId: string,
  oracleIds: string[],
): Promise<Map<string, DeckPrinting>> {
  const { printings } = await readDeckPrintings(userId, deckId, oracleIds, { usePicks: deckPrintingsEnabled(), ownedOnly: true });
  return ownedOnly(printings);
}

function ownedOnly(printings: Map<string, DeckPrinting>): Map<string, DeckPrinting> {
  return new Map([...printings].filter(([, p]) => p.source === "deck" || p.source === "collection"));
}

/**
 * Each deck's commander art, for a grid of deck tiles (`/decks`, Home): the deck's own pick of
 * its commander when held, else the Collection's. One collection read and one picks read for the
 * whole grid, keyed by deck id; a deck whose commander the player does not own is absent.
 * Fail-soft: an empty map keeps every tile on the oracle-level art.
 */
export async function resolveCommanderPrintingsByDeck(
  userId: string,
  rows: { deckId: string; commanderOracleId: string }[],
): Promise<Map<string, DeckPrinting>> {
  const out = new Map<string, DeckPrinting>();
  if (rows.length === 0) return out;
  try {
    const [picks, collectionRows] = await Promise.all([
      deckPrintingsEnabled()
        ? readDeckPicks(userId, rows.map((r) => r.deckId))
        : Promise.resolve(new Map<string, Map<string, DeckPick>>()),
      selectCollectionRows(userId, [...new Set(rows.map((r) => r.commanderOracleId))]),
    ]);
    const owned = new Map(aggregateCollection(collectionRows).map((c) => [c.oracleId, c]));
    for (const row of rows) {
      const card = owned.get(row.commanderOracleId);
      if (!card) continue;
      const held = heldPrintingFor(card.printings, picks.get(row.deckId)?.get(row.commanderOracleId));
      const p = held ?? resolvedPrinting(card);
      if (!p) continue;
      out.set(row.deckId, {
        quantity: card.quantity,
        printedName: held ? cardArt(card.name, held).printedName : card.printedName,
        imageUri: p.imageUri,
        artCropUri: p.artCropUri ?? null,
        setCode: p.setCode,
        collectorNumber: p.collectorNumber,
        source: held ? "deck" : "collection",
      });
    }
    return out;
  } catch {
    recordSoftFailure();
    return new Map();
  }
}

/** A printing a version recorded, as `(oracle_id, set_code, collector_number)`. */
export type RecordedPrinting = { oracleId: string; setCode: string; collectorNumber: string };

export const recordedKey = (p: RecordedPrinting) =>
  `${p.oracleId}|${p.setCode.toLowerCase()}|${p.collectorNumber}`;

/**
 * The art and printed name of printings a version recorded, keyed by `recordedKey`.
 *
 * The SAME three tiers the Collection's resolver takes (`resolveImageUri`, `resolveFlavorName`):
 * the exact printing's art, else the representative printing of that set, else the card's
 * oracle-level art, with the printed name taken from whichever printing the art came from. A
 * version therefore draws what the deck showed at commit, including for a printing whose own
 * image is null. A recorded card the catalog no longer lists at all is absent, and draws today's.
 */
export async function readRecordedPrintingArt(
  recorded: RecordedPrinting[],
): Promise<Map<string, { imageUri: string | null; artCropUri: string | null; printedName: string | null }>> {
  const out = new Map<string, { imageUri: string | null; artCropUri: string | null; printedName: string | null }>();
  const wanted = [...new Map(recorded.map((r) => [recordedKey(r), r])).values()];
  if (wanted.length === 0) return out;
  const { rows } = await db.execute<{
    oracle_id: string; set_code: string; collector_number: string; name: string;
    image_uri: string | null; art_crop_uri: string | null; flavor_name: string | null;
  }>(sql`
    select w.oracle_id, w.set_code, w.collector_number, c.name,
           coalesce(e.image_uri, r.image_uri, c.image_uri) as image_uri,
           -- The crop of whichever printing supplied the art (resolveArtCropUri), never another's.
           case
             when e.image_uri is not null then coalesce(e.art_crop_uri, c.art_crop_uri)
             when r.image_uri is not null then coalesce(r.art_crop_uri, c.art_crop_uri)
             else c.art_crop_uri
           end as art_crop_uri,
           case
             when e.image_uri is not null then e.flavor_name
             when r.image_uri is not null then r.flavor_name
           end as flavor_name
    from unnest(
      ${sql.param(wanted.map((w) => w.oracleId))}::uuid[],
      ${sql.param(wanted.map((w) => w.setCode.toLowerCase()))}::text[],
      ${sql.param(wanted.map((w) => w.collectorNumber))}::text[]
    ) as w(oracle_id, set_code, collector_number)
    join cards c on c.oracle_id = w.oracle_id
    left join printings e
      on e.oracle_id = w.oracle_id and e.set_code = w.set_code and e.collector_number = w.collector_number
    left join printings r
      on r.oracle_id = w.oracle_id and r.set_code = w.set_code and r.is_representative
    -- A recorded printing whose set the catalog no longer lists at all answers nothing, so the row
    -- keeps today's resolver rather than the card's oracle-level art.
    where e.oracle_id is not null or r.oracle_id is not null
  `);
  for (const r of rows) {
    out.set(recordedKey({ oracleId: r.oracle_id, setCode: r.set_code, collectorNumber: r.collector_number }), {
      imageUri: r.image_uri,
      artCropUri: r.art_crop_uri,
      printedName: r.flavor_name !== null && r.flavor_name !== r.name ? r.flavor_name : null,
    });
  }
  return out;
}

/**
 * The version columns for the printing a card showed at commit: lowercase set code as stored, or
 * both null when nothing resolved, the catalog lists no printing for the card (`""`), or the
 * printing is a substitute no surface drew.
 */
export function recordedColumns(
  shown: Map<string, DeckPrinting>,
  oracleId: string | null,
): { setCode: string | null; collectorNumber: string | null } {
  const p = oracleId ? shown.get(oracleId) : undefined;
  return p && p.setCode !== "" && p.source !== "catalogSubstitute"
    ? { setCode: p.setCode.toLowerCase(), collectorNumber: p.collectorNumber }
    : { setCode: null, collectorNumber: null };
}

/**
 * Every pick these decks hold that the player still owns, as the price read takes them
 * (`loadPrices(ids, picks)`). Empty with the switch off, so every figure is today's. Membership-
 * scoped like `readDeckPicks`, and HELD: a pick whose printing left the Collection is not passed,
 * so no figure prices a printing the art no longer shows. Fail-soft to no picks, which is
 * today's figure on every row.
 */
export async function readHeldPricePicks(userId: string, deckIds: string[]): Promise<PricePick[]> {
  const ids = [...new Set(deckIds)];
  if (!deckPrintingsEnabled() || ids.length === 0) return [];
  try {
    const { rows } = await db.execute<{
      deck_id: string; oracle_id: string; set_code: string; collector_number: string;
    }>(sql`
      select dp.deck_id, dp.oracle_id, dp.set_code, dp.collector_number
      from deck_printings dp
      join decks d on d.id = dp.deck_id
      where d.user_id = ${userId}
        and dp.deck_id = any(${sql.param(ids)}::uuid[])
        and (
          exists (
            select 1 from deck_cards dc
            where dc.deck_id = dp.deck_id and dc.oracle_id = dp.oracle_id
          )
          or d.commander_oracle_id = dp.oracle_id
          or d.partner_oracle_id = dp.oracle_id
        )
        and exists (
          select 1 from collection_items ci
          where ci.user_id = d.user_id
            and ci.oracle_id = dp.oracle_id
            and lower(ci.set_code) = dp.set_code
            and ci.collector_number = dp.collector_number
            and ci.quantity > 0
        )
    `);
    return rows.map((r) => ({
      deckId: r.deck_id, oracleId: r.oracle_id, setCode: r.set_code, collectorNumber: r.collector_number,
    }));
  } catch {
    recordSoftFailure();
    return [];
  }
}
