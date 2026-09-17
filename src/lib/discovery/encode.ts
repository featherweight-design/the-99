// The discover payload, on a diet (#52 follow-up).
//
// `/discover` ranks every commander the collection can support — a few thousand
// rows, and when this was written most of the payload was not information: the
// field names were repeated on every row, the theme labels were drawn from a
// few hundred words but written out in full every time they appeared, and every
// art URL carried the same host.
//
// The figures that motivated it — 3,086 rows, 2.76 MB, 654 KB of keys, 984 KB of
// labels — were measured at the time and are NOT maintained here. The plain form
// has since grown past them, which is the whole hazard of a header that quotes
// results.
//
// So the list ships as a dictionary and a table. Rows become positional tuples
// under a key order the payload carries, repeated strings are filed once and
// referenced by index, and the Scryfall art stem is dropped. The result is
// comfortably under the 2 MB data-cache ceiling, which is what lets the whole
// list be cached per user rather than recomputed on every visit.
//
// NO CURRENT FIGURE IS QUOTED. This header held an encoded 1.09 MB from before
// the sentence, the gap slot and Fit were added, and kept holding it afterwards
// — understating the footprint and making the budget look safer than it was.
// `pnpm probe:payload` prints the current worst case across every account; read
// it there, where it cannot go stale.
//
// The key order and the role order travel in the payload rather than being
// implied by this module's constants, so a decoder reading an older payload
// reads the order that payload was written with.

import type { GapSlot } from "../edhrec/gap-slot";
import type { DiscoveryItem, DiscoveryList } from "./list";

const ART_STEM = "https://cards.scryfall.io/art_crop/front/";

/** RFC 3986 scheme, which every absolute URL carries and no stripped path does. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const ROW_KEYS = [
  "slug", "name", "colorIdentity", "artCropUri", "releasedAt", "deckCount",
  "rank", "price", "prose", "gapSlot", "score", "measurableTotal",
  "fitPool", "fitRoles", "fitSynergy",
] satisfies (keyof DiscoveryItem)[];

/**
 * The gap slot, as a tag and its label indices.
 *
 * The labels go through the dictionary because they are drawn from the same
 * ~399-word theme vocabulary the retired tag list drew from, and the line names at
 * most three of them — so on 3,000 rows they cost indices rather than words.
 *
 * `prose` deliberately does NOT go through the dictionary: every sentence is
 * distinct, so filing them would build a 3,000-entry table each referenced
 * once, adding the indices to the same bytes. It is the payload's largest
 * single addition and the reason the byte guard exists.
 */
const GAP_KINDS = ["unplayed", "allPlayed", "noMechanics"] as const;

export type EncodedDiscovery = Omit<DiscoveryList, "items"> & {
  /** Field names, in the order every row tuple carries its values. */
  keys: (keyof DiscoveryItem)[];
  /** Gap-slot kinds, in the order every `gapSlot` tuple's tag indexes into. */
  gapKinds: GapSlot["kind"][];
  /** Every label and deck name, filed once. Rows carry indices into this. */
  strings: string[];
  rows: unknown[][];
};

class Dictionary {
  readonly strings: string[] = [];
  private readonly index = new Map<string, number>();

  file(value: string): number {
    const seen = this.index.get(value);
    if (seen !== undefined) return seen;
    const at = this.strings.length;
    this.strings.push(value);
    this.index.set(value, at);
    return at;
  }
}

function encodeValue(
  key: keyof DiscoveryItem,
  item: DiscoveryItem,
  dict: Dictionary,
): unknown {
  switch (key) {
    // Only that exact stem, so a URL from anywhere else survives untouched
    // rather than being silently truncated into a broken relative path.
    case "artCropUri":
      return item.artCropUri?.startsWith(ART_STEM)
        ? item.artCropUri.slice(ART_STEM.length)
        : item.artCropUri;
    // A tag index and, for the one member that carries them, label indices.
    // The kind travels as its position in `GAP_KINDS` rather than as a string,
    // and `GAP_KINDS` rides in the payload for the same reason `keys` and
    // `roles` do: a decoder reading an older payload reads the order that
    // payload was written with.
    case "gapSlot":
      return item.gapSlot.kind === "unplayed"
        ? [
            GAP_KINDS.indexOf("unplayed"),
            item.gapSlot.labels.map((label) => dict.file(label)),
          ]
        : [GAP_KINDS.indexOf(item.gapSlot.kind)];
    default:
      return item[key];
  }
}

function decodeValue(
  key: keyof DiscoveryItem,
  value: unknown,
  strings: string[],
  gapKinds: readonly GapSlot["kind"][],
): unknown {
  switch (key) {
    // The encoder either stripped the stem, leaving a relative path, or left an
    // absolute URL alone. A scheme is what tells those apart — testing for
    // "http" instead would prepend the stem to an `ipfs:` or `data:` URL the
    // encoder had deliberately preserved.
    case "artCropUri":
      return typeof value === "string" && !HAS_SCHEME.test(value)
        ? ART_STEM + value
        : value;
    case "gapSlot": {
      const [kindAt, labels] = value as [number, number[] | undefined];
      const kind = gapKinds[kindAt];
      return kind === "unplayed"
        ? { kind, labels: (labels ?? []).map((i) => strings[i]) }
        : { kind };
    }
    default:
      return value;
  }
}

export function encodeDiscovery(list: DiscoveryList): EncodedDiscovery {
  const { items, ...meta } = list;
  const dict = new Dictionary();
  const rows = items.map((item) => ROW_KEYS.map((key) => encodeValue(key, item, dict)));

  return {
    ...meta,
    keys: [...ROW_KEYS],
    gapKinds: [...GAP_KINDS],
    strings: dict.strings,
    rows,
  };
}

/** The inverse of `encodeDiscovery`. */
export function decodeDiscovery(encoded: EncodedDiscovery): DiscoveryList {
  const { keys, gapKinds, strings, rows, ...meta } = encoded;

  return {
    ...meta,
    items: rows.map(
      (row) =>
        Object.fromEntries(
          keys.map((key, i) => [key, decodeValue(key, row[i], strings, gapKinds)]),
        ) as DiscoveryItem,
    ),
  };
}
