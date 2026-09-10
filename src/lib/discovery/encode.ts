// The discover payload, on a diet (#52 follow-up).
//
// `/discover` ranks every commander the collection can support — 3,086 rows on
// the largest collection here, 2.76 MB of RSC payload. Most of that is not
// information: the 17 field names are repeated on every row (654 KB), the theme
// labels are drawn from a 399-word vocabulary but written out in full every time
// they appear (984 KB), and every art URL carries the same 44-character host.
//
// So the list ships as a dictionary and a table. Rows become positional tuples
// under a key order the payload carries, repeated strings are filed once and
// referenced by index, and the Scryfall art stem is dropped. The measured result
// is 1.09 MB — under the 2 MB data-cache ceiling, which is what lets the whole
// list be cached per user rather than recomputed on every visit.
//
// The key order and the role order travel in the payload rather than being
// implied by this module's constants, so a decoder reading an older payload
// reads the order that payload was written with.

import type { RoleName } from "../recs/score";
import type { DiscoveryItem, DiscoveryList } from "./list";

const ART_STEM = "https://cards.scryfall.io/art_crop/front/";

/** RFC 3986 scheme, which every absolute URL carries and no stripped path does. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const ROLES: RoleName[] = ["ramp", "draw", "removal", "wipes"];

const ROW_KEYS = [
  "slug", "name", "colorIdentity", "artCropUri", "releasedAt", "deckCount",
  "rank", "ownedSupport", "edhrecTotal", "colorPoolSize", "roleCounts", "price",
  "tagTotal", "unplayedLabels", "unplayedCount", "nearestDeck", "supportPct",
] satisfies (keyof DiscoveryItem)[];

export type EncodedDiscovery = Omit<DiscoveryList, "items"> & {
  /** Field names, in the order every row tuple carries its values. */
  keys: (keyof DiscoveryItem)[];
  /** Role names, in the order every `roleCounts` tuple carries its counts. */
  roles: RoleName[];
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
    case "roleCounts":
      return ROLES.map((role) => item.roleCounts[role]);
    case "unplayedLabels":
      return item.unplayedLabels.map((label) => dict.file(label));
    case "nearestDeck":
      return item.nearestDeck
        ? [
            dict.file(item.nearestDeck.deckName),
            item.nearestDeck.sharedLabels.map((label) => dict.file(label)),
            item.nearestDeck.extraShared,
          ]
        : null;
    default:
      return item[key];
  }
}

function decodeValue(
  key: keyof DiscoveryItem,
  value: unknown,
  roles: RoleName[],
  strings: string[],
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
    case "roleCounts": {
      const counts = value as number[];
      return Object.fromEntries(roles.map((role, i) => [role, counts[i]]));
    }
    case "unplayedLabels":
      return (value as number[]).map((i) => strings[i]);
    case "nearestDeck": {
      if (!value) return null;
      const [name, shared, extraShared] = value as [number, number[], number];
      return {
        deckName: strings[name],
        sharedLabels: shared.map((i) => strings[i]),
        extraShared,
      };
    }
    default:
      return value;
  }
}

export function encodeDiscovery(list: DiscoveryList): EncodedDiscovery {
  const { items, ...meta } = list;
  const dict = new Dictionary();
  const rows = items.map((item) => ROW_KEYS.map((key) => encodeValue(key, item, dict)));

  return { ...meta, keys: [...ROW_KEYS], roles: [...ROLES], strings: dict.strings, rows };
}

/** The inverse of `encodeDiscovery`. */
export function decodeDiscovery(encoded: EncodedDiscovery): DiscoveryList {
  const { keys, roles, strings, rows, ...meta } = encoded;

  return {
    ...meta,
    items: rows.map(
      (row) =>
        Object.fromEntries(
          keys.map((key, i) => [key, decodeValue(key, row[i], roles, strings)]),
        ) as DiscoveryItem,
    ),
  };
}
