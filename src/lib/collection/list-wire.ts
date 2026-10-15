// The `/collection` list as it crosses the wire, and back.
//
// The page ships every card the reader owns, so a byte per card is 2,820 bytes on a
// staging-shaped account, and two things repeated on every card cost far more than that
// (plans/2026-09-28-list-payload-shrink.md, PR 2):
//
//   - EACH CLAIM NAMED ITS DECK IN FULL, uuid and name, on every card that deck holds. A
//     twenty-deck account said the same twenty pairs thousands of times. The wire carries
//     each deck once, and a claim is its deck's index with its sleeved bit: `index * 2 + 1`
//     for a sleeved claim, `index * 2` for a brew's.
//   - EACH IMAGE URL REPEATED ITS HOST AND PATH. A Scryfall `normal` URL is fully determined
//     by its id and its cache stamp, so the wire carries `id?stamp` and the client puts the
//     rest back. The stamp stays: it is what makes a re-scanned image reload, and Scryfall
//     sends a one-year `max-age`. A URL of any other shape crosses unchanged.
//
// Decoding restores exactly what was encoded, nothing invented: `decodeCollection(encode…)`
// equals the list it started from, which `list-wire.test.ts` asserts on every field. One
// deliberate exception: the claim bit carries `holdsCopy`, so a brew the player gave a copy to
// decodes as `mature: true` without its `granted` (a marker asks only whether the deck holds it).
import { holdsCopy, type AvailabilitySummary } from "../decks/availability";
import type { BrowseListCard } from "./browse";

const HOST = "https://cards.scryfall.io/normal/front/";
const STEM = /^https:\/\/cards\.scryfall\.io\/normal\/front\/([0-9a-f])\/([0-9a-f])\/([0-9a-f-]{36})\.jpg(\?\d+)?$/;

/** A Scryfall `normal` URL as `id?stamp`, when its two path letters are its id's own; anything else unchanged. */
export function stemImage(uri: string): string {
  const m = STEM.exec(uri);
  if (!m || m[1] !== m[3][0] || m[2] !== m[3][1]) return uri;
  return m[3] + (m[4] ?? "");
}

/** The compact form `stemImage` writes, and nothing else: any other value crossed unchanged. */
const STEMMED = /^([0-9a-f-]{36})(\?\d+)?$/;

export function unstemImage(wire: string): string {
  const m = STEMMED.exec(wire);
  if (!m) return wire;
  const id = m[1];
  return `${HOST}${id[0]}/${id[1]}/${id}.jpg${m[2] ?? ""}`;
}

type WireAvailability = Omit<AvailabilitySummary, "claims"> & { claims: number[] };
type WireCard = Omit<BrowseListCard, "availability" | "price" | CollectionDrawKey> &
  Partial<Pick<BrowseListCard, CollectionDrawKey>> & {
    availability?: WireAvailability | null;
    /** `price`, under one letter: it rides every card, and its key alone was ~12KB of the wire. */
    p?: number;
  };

/**
 * The fields a card only DRAWS (list payload plan, PR 4): no filter, search or sort reads them, so
 * they ship for the URL's first window only and the rest arrive from `/api/collection-fields`.
 * `printedName`, `layout` and `manaCost` stay on every card: search and the name sort read the
 * first two, and the third is a few bytes.
 */
export const COLLECTION_DRAW_KEYS = ["imageUri", "facts", "comboPartner", "comboOtherPartners"] as const;
export type CollectionDrawKey = (typeof COLLECTION_DRAW_KEYS)[number];
/**
 * What a fields batch answers for a card: its draw fields, and the CAPTION its art was resolved
 * with. A card's art, printed name and set code come off one printing, and a printing picked on
 * another device moves all three while the page holds the older two. Sent together, the client
 * draws the three from one read (see `useCollectionFields`), so no art lands under another
 * printing's name, and no list-wide version has to stand guard over the batch.
 */
export type CollectionDrawFields = Partial<Pick<BrowseListCard, CollectionDrawKey>> & {
  art?: Pick<BrowseListCard, "printedName" | "primarySetCode" | "foil">;
};

/**
 * A card as the client holds it: whole, or WITHHELD, with its draw fields still to come. The mark
 * is set by the decoder from the wire card's own shape, never from the fields present on a row
 * afterwards, because a printing pick lays an `imageUri` over a row whether it was drawn or not.
 */
export type CollectionRow =
  | BrowseListCard
  | (Omit<BrowseListCard, CollectionDrawKey> & CollectionDrawFields & { withheld: true });

export const isCollectionDrawn = (row: CollectionRow): row is BrowseListCard => !("withheld" in row);

export type CollectionWire = {
  /** Each deck a claim names, once: `[id, name]`. */
  decks: [string, string][];
  cards: WireCard[];
};

export function encodeCollection(
  cards: BrowseListCard[],
  // A full `Availability` is one of these; only what a marker reads is shipped.
  availability: Map<string, AvailabilitySummary> | null,
): CollectionWire {
  const decks: [string, string][] = [];
  const index = new Map<string, number>();
  const deck = (id: string, name: string) => {
    let i = index.get(id);
    if (i === undefined) {
      i = decks.length;
      index.set(id, i);
      decks.push([id, name]);
    }
    return i;
  };
  return {
    decks,
    cards: cards.map((card) => {
      // The list never carries an availability of its own (the page reads it alongside), so the
      // one on `card`, if a caller set it, is dropped rather than shipped twice.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to drop it
      const { availability: _own, price, ...rest } = card;
      const wire: WireCard = { ...rest, imageUri: card.imageUri === null ? null : stemImage(card.imageUri) };
      if (price !== undefined) wire.p = price;
      const a = availability?.get(card.oracleId);
      if (a) {
        const { claims, ...figures } = a;
        wire.availability = {
          owned: figures.owned,
          hard: figures.hard,
          soft: figures.soft,
          free: figures.free,
          // The bit is `holdsCopy`, the one question a marker asks of it: a brew the player gave a
          // copy to holds it as a committed deck does, so it decodes as `mature`.
          claims: claims.map((c) => deck(c.id, c.name) * 2 + (holdsCopy(c) ? 1 : 0)),
        };
      } else {
        wire.availability = null;
      }
      return wire;
    }),
  };
}

export function decodeCollection(wire: CollectionWire): CollectionRow[] {
  return wire.cards.map((card) => {
    // `imageUri` is on every whole card, null or not, and on no withheld one.
    const whole = Object.hasOwn(card, "imageUri");
    const { imageUri, p, ...rest } = card;
    const list = {
      ...rest,
      ...(p === undefined ? {} : { price: p }),
      ...(whole ? { imageUri: imageUri == null ? null : unstemImage(imageUri) } : { withheld: true as const }),
      availability: null,
    } as CollectionRow;
    if (card.availability) {
      const { claims, ...figures } = card.availability;
      list.availability = {
        ...figures,
        claims: claims.map((code) => {
          const [id, name] = wire.decks[code >> 1];
          return { id, name, mature: (code & 1) === 1 };
        }),
      };
    }
    return list;
  });
}

/**
 * The wire with every card outside `keep` cut to the columns filtering, search and sort read. The
 * entry it was given is not touched: the cached list is shared by every URL, and the window
 * belongs to one.
 */
export function cutCollectionWindow(wire: CollectionWire, keep: ReadonlySet<string>): CollectionWire {
  return {
    ...wire,
    cards: wire.cards.map((card) => {
      if (keep.has(card.oracleId)) return card;
      const cut = { ...card };
      for (const key of COLLECTION_DRAW_KEYS) delete cut[key];
      return cut;
    }),
  };
}

/** The draw fields of the cards named, as the fields route answers them: an id not in `cards` is absent. */
export function collectionDrawFieldsFor(
  cards: BrowseListCard[],
  ids: ReadonlySet<string>,
): Record<string, CollectionDrawFields> {
  const out: Record<string, CollectionDrawFields> = {};
  for (const card of cards) {
    if (!ids.has(card.oracleId)) continue;
    const fields: CollectionDrawFields = {};
    for (const key of COLLECTION_DRAW_KEYS) {
      if (Object.hasOwn(card, key)) (fields as Record<string, unknown>)[key] = card[key];
    }
    fields.art = { printedName: card.printedName, primarySetCode: card.primarySetCode };
    // Absent when there is no film: a batch whose `foil` differs from the row's (either way) is a holding
    // that changed since the page was read, and `disagrees` reads the page again rather than patching it.
    if (card.foil) fields.art.foil = card.foil;
    out[card.oracleId] = fields;
  }
  return out;
}
