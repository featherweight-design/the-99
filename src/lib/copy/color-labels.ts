// Single-color names
const MONO_NAMES: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

// Two-color guild names (sorted WUBRG key)
const GUILD_NAMES: Record<string, string> = {
  WU: "Azorius",
  WB: "Orzhov",
  UB: "Dimir",
  UR: "Izzet",
  BR: "Rakdos",
  BG: "Golgari",
  WR: "Boros",
  WG: "Selesnya",
  UG: "Simic",
  RG: "Gruul",
};

// Three-color shard/wedge names
const TRIO_NAMES: Record<string, string> = {
  WUB: "Esper",
  WUR: "Jeskai",
  WUG: "Bant",
  WBR: "Mardu",
  WBG: "Abzan",
  UBR: "Grixis",
  UBG: "Sultai",
  URG: "Temur",
  BRG: "Jund",
  WRG: "Naya",
};

// Four-color names
const QUAD_NAMES: Record<string, string> = {
  WUBR: "Yore-Tiller (non-Green)",
  WUBG: "Witch-Maw (non-Red)",
  WURG: "Ink-Treader (non-Black)",
  WBRG: "Dune-Brood (non-Blue)",
  UBRG: "Chaos (non-White)",
};

const COLOR_WORDS: Record<string, string> = {
  W: "white",
  U: "blue",
  B: "black",
  R: "red",
  G: "green",
};

const WUBRG = "WUBRG";

function sortWubrg(colors: string[]): string[] {
  return [...colors].sort((a, b) => WUBRG.indexOf(a) - WUBRG.indexOf(b));
}

/** Returns the guild/shard/wedge name for the given color combination,
 *  or the mono-color name, or "this filter" for empty input. */
export function guildLabel(colors: string[]): string {
  if (colors.length === 0) return "this filter";
  const sorted = sortWubrg(colors);
  const key = sorted.join("");
  if (sorted.length === 1) return MONO_NAMES[key] ?? key;
  if (sorted.length === 2) return GUILD_NAMES[key] ?? key;
  if (sorted.length === 3) return TRIO_NAMES[key] ?? key;
  if (sorted.length === 4) return QUAD_NAMES[key] ?? key;
  return "5-color"; // WUBRG
}

/** The colour names in WUBRG order — ["White", "Red"]. Sentences that list an
 *  identity join these; the pip row carries the swatches instead, which is why
 *  the codes themselves never reach prose. */
export function colorNames(colors: string[]): string[] {
  return sortWubrg(colors).map((c) => MONO_NAMES[c] ?? c);
}

/** Hyphenated color words in WUBRG order — "white-red". The richness pass's
 *  commanders copy uses this register rather than the guild name.
 *  Empty input yields "" — callers must guard. The filtered-empty state that
 *  consumes this only renders when at least one color is selected. */
export function colorWords(colors: string[]): string {
  return sortWubrg(colors)
    .map((c) => COLOR_WORDS[c] ?? c.toLowerCase())
    .join("-");
}
