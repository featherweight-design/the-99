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

/** A deck's pick as stored: `set_code` lowercase, `collector_number` text. */
export type DeckPick = { setCode: string; collectorNumber: string };

/** Where a resolved printing came from, in chain order. */
export type DeckPrintingSource = "deck" | "collection" | "catalog";

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
 * THROWS on a failed read. `resolveDeckPrintings` is the fail-soft form for surfaces that draw art;
 * a caller that records the answer (a commit) must not record an empty one.
 */
export async function readDeckPrintings(
  userId: string,
  deckId: string,
  oracleIds: string[],
  opts: { usePicks: boolean },
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

  const unowned = ids.filter((id) => !printings.has(id));
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
    }>(sql`
      select c.oracle_id, c.name, p.set_code, p.collector_number,
             coalesce(p.image_uri, c.image_uri) as image_uri,
             coalesce(p.art_crop_uri, c.art_crop_uri) as art_crop_uri,
             p.flavor_name
      from cards c
      left join lateral (
        select pr.set_code, pr.collector_number, pr.image_uri, pr.art_crop_uri, pr.flavor_name
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
        source: "catalog",
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
  opts: { usePicks: boolean },
): Promise<DeckPrintings> {
  return readDeckPrintings(userId, deckId, oracleIds, opts).catch(() => {
    recordSoftFailure();
    return { printings: new Map(), heldPicks: new Map() };
  });
}
