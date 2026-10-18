/** Shared WUBRG palette: mana pips, rows-view, the chassis chips, card details and the public card page. */
export const WUBRG_COLOR: Record<string, string> = {
  W: "var(--w)", U: "var(--u)", B: "var(--b)", R: "var(--r)", G: "var(--g)",
};

/** The colors in WUBRG order, the order every identity is written in (`U/R`, never `R/U`). */
export const WUBRG = ["W", "U", "B", "R", "G"] as const;

export function inWubrgOrder(colors: readonly string[]): string[] {
  const rank = (c: string) => { const i = (WUBRG as readonly string[]).indexOf(c); return i === -1 ? WUBRG.length : i; };
  return [...colors].sort((a, b) => rank(a) - rank(b));
}
