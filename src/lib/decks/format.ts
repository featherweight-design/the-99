// ---------------------------------------------------------------------------
// Shared deck formatting helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable colour identity label for a Magic commander.
 * Single colours → colour name; two colours → guild name; 3–4 → "Multi";
 * 5 → "5-color"; 0 → "Colorless".
 */
export function colorLabel(identity: string[]): string {
  if (identity.length === 0) return "Colorless";
  if (identity.length === 1) {
    const MAP: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
    return MAP[identity[0]] ?? identity[0];
  }
  if (identity.length === 5) return "5-color";
  if (identity.length >= 3) return "Multi";
  const key = identity.slice().sort().join("");
  const GUILDS: Record<string, string> = {
    UW: "Azorius", BU: "Dimir", BR: "Rakdos", GR: "Gruul", GW: "Selesnya",
    BW: "Orzhov", RU: "Izzet", BG: "Golgari", RW: "Boros", GU: "Simic",
  };
  return GUILDS[key] ?? "Multi";
}
