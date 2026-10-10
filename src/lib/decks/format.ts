// ---------------------------------------------------------------------------
// Shared deck formatting helpers
// ---------------------------------------------------------------------------

const COLOR_NAMES: Record<string, string> = {
  W: "White", U: "Blue", B: "Black", R: "Red", G: "Green",
};

/** Keyed by the identity's letters sorted alphabetically. */
const GUILDS: Record<string, string> = {
  UW: "Azorius", BU: "Dimir", BR: "Rakdos", GR: "Gruul", GW: "Selesnya",
  BW: "Orzhov", RU: "Izzet", BG: "Golgari", RW: "Boros", GU: "Simic",
};

/** Shards and wedges, same alphabetical keying. */
const TRIOMES: Record<string, string> = {
  GUW: "Bant", BUW: "Esper", BRU: "Grixis", BGR: "Jund", GRW: "Naya",
  BGW: "Abzan", RUW: "Jeskai", BGU: "Sultai", BRW: "Mardu", GRU: "Temur",
};

/**
 * Own-property lookup. Plain `map[key]` reaches the Object prototype, so an
 * identity of `["toString"]` would otherwise yield a function from a map of
 * strings.
 */
function lookup(map: Record<string, string>, key: string): string | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

/** The order an identity is printed in, and the order the pips draw. */
const WUBRG = ["W", "U", "B", "R", "G"];

/**
 * The deck's identity: one commander's, or the union of a pair's.
 *
 * Sorted WUBRG rather than left in concatenation order, because `IdentityPips`
 * draws the array as given and a Boros partner behind a Jeskai primary would
 * otherwise put red after white. A single commander is ordered by the same
 * rule, so one deck's pips never draw in a different order from another's. A
 * letter outside WUBRG survives at the end instead of being dropped —
 * `colorLabel` deliberately refuses to name an identity it does not recognise,
 * and losing the letter here would hand it a combination the deck does not
 * have.
 */
export function deckIdentity(primary: string[], partner: string[] | null): string[] {
  const set = new Set([...primary, ...(partner ?? [])]);
  return [
    ...WUBRG.filter((c) => set.has(c)),
    ...[...set].filter((c) => !WUBRG.includes(c)),
  ];
}

/**
 * Returns a human-readable color identity label for a Magic commander.
 *
 * Four-color identities are named for the color they are missing rather than by
 * their Nephilim names (Glint-Eye, Dune-Brood, …). Those names exist, but almost
 * nobody uses them, and "Non-green" is legible without a lookup.
 */
export function colorLabel(identity: string[]): string {
  if (identity.length === 0) return "Colorless";
  if (identity.length === 1) return lookup(COLOR_NAMES, identity[0]) ?? identity[0];

  // Every branch below names a specific combination, so an unrecognized code has
  // to fall out here — otherwise ["W","U","B","X"] reads "Non-red", naming a
  // combination the card does not have.
  if (identity.some((c) => lookup(COLOR_NAMES, c) === undefined)) return "Multi";
  // Every branch below reads length as a count of distinct colors, so a repeat
  // would misname the identity: ["W","U","B","R","R"] is four colors, not five.
  if (new Set(identity).size !== identity.length) return "Multi";
  if (identity.length === 5) return "5-color";

  const key = identity.slice().sort().join("");
  if (identity.length === 2) return lookup(GUILDS, key) ?? "Multi";
  if (identity.length === 3) return lookup(TRIOMES, key) ?? "Multi";

  // Named explicitly rather than left as the fallthrough, so the assertion below
  // rests on this branch rather than on nothing having reached it.
  if (identity.length === 4) {
    const missing = Object.keys(COLOR_NAMES).find((c) => !identity.includes(c))!;
    return `Non-${COLOR_NAMES[missing].toLowerCase()}`;
  }
  return "Multi";
}

/**
 * A committed date, as a version line and the history list print it: `1 Sep 2026`.
 *
 * The year is always carried, unlike the game log's own `formatPlayed`, which
 * drops it inside the current year to fit a fixed meta slot. A version is a
 * historical record a player reads years later, and the one thing it must never
 * be is ambiguous about which September.
 *
 * Composed rather than handed whole to Intl, and `en-US` rather than `en-GB`,
 * for the reason the game log gives: en-GB abbreviates September as `Sept`.
 * UTC, because `committed_at` is stamped by the database in UTC and a local
 * boundary would render one day on the server and another in the browser.
 */
export function formatDeckDate(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

/**
 * The same date without its year, for a stamp that sits beside a version number in a fixed
 * slot — `v7 · 2 Aug`.
 *
 * Shares the rules above rather than restating them, and both of them matter here too: en-US
 * months because en-GB writes `Sept`, and UTC because `deck_version_cards.since` is a
 * `timestamp` WITHOUT time zone written by the database's clock. That second one is not a
 * nicety on this stamp — it is the evidence behind `first committed wins`, so a reader west of
 * UTC seeing `1 Aug` for a card committed on the 2nd is a wrong answer to the only question
 * the stamp exists to answer.
 */
export function formatShortDeckDate(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${date.getUTCDate()} ${month}`;
}

// "12 Aug" — the design's locator. The year appears only when it is not the
// current one, so a log read in the same season stays short.
// Composed rather than handed whole to Intl: en-GB abbreviates September as
// "Sept", which is correct but a character wider than the fixed meta slot was
// drawn for.
export function formatPlayed(date: Date, now: Date = new Date()): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const stem = `${date.getDate()} ${month}`;
  return date.getFullYear() === now.getFullYear() ? stem : `${stem} ${date.getFullYear()}`;
}
