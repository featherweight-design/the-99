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
