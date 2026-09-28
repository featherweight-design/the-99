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
// equals the list it started from, which `list-wire.test.ts` asserts on every field.
import type { AvailabilitySummary } from "../decks/availability";
import type { BrowseListCard } from "./browse";

const HOST = "https://cards.scryfall.io/normal/front/";
const STEM = /^https:\/\/cards\.scryfall\.io\/normal\/front\/([0-9a-f])\/([0-9a-f])\/([0-9a-f-]{36})\.jpg(\?\d+)?$/;

/** A Scryfall `normal` URL as `id?stamp`, when its two path letters are its id's own; anything else unchanged. */
export function stemImage(uri: string): string {
  const m = STEM.exec(uri);
  if (!m || m[1] !== m[3][0] || m[2] !== m[3][1]) return uri;
  return m[3] + (m[4] ?? "");
}

export function unstemImage(wire: string): string {
  if (wire.startsWith("https://")) return wire;
  const id = wire.slice(0, 36);
  return `${HOST}${id[0]}/${id[1]}/${id}.jpg${wire.slice(36)}`;
}

type WireAvailability = Omit<AvailabilitySummary, "claims"> & { claims: number[] };
type WireCard = Omit<BrowseListCard, "availability"> & { availability?: WireAvailability | null };

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
      const { availability: _own, ...rest } = card;
      const wire: WireCard = { ...rest, imageUri: card.imageUri === null ? null : stemImage(card.imageUri) };
      const a = availability?.get(card.oracleId);
      if (a) {
        const { claims, ...figures } = a;
        wire.availability = {
          owned: figures.owned,
          hard: figures.hard,
          soft: figures.soft,
          free: figures.free,
          claims: claims.map((c) => deck(c.id, c.name) * 2 + (c.mature ? 1 : 0)),
        };
      } else {
        wire.availability = null;
      }
      return wire;
    }),
  };
}

export function decodeCollection(wire: CollectionWire): BrowseListCard[] {
  return wire.cards.map((card) => {
    const list: BrowseListCard = {
      ...card,
      imageUri: card.imageUri === null ? null : unstemImage(card.imageUri),
      availability: null,
    };
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
