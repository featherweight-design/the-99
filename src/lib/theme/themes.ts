// The theme registry. One list, shared by the picker, the root layout and the
// tests, so a seventh theme is one row here and one block in globals.css.

export const THEME_COOKIE = "the99_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = [
  { key: "amonkhet", name: "Gilded Stone", plane: "Amonkhet" },
  { key: "kamigawa", name: "Neon Rain", plane: "Kamigawa: Neon Dynasty" },
  { key: "innistrad", name: "Moonlit", plane: "Innistrad" },
  { key: "phyrexia", name: "Oil and Iron", plane: "New Phyrexia" },
  { key: "duskmourn", name: "Screen Glow", plane: "Duskmourn" },
  { key: "kaldheim", name: "Rune Frost", plane: "Kaldheim" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

// Amonkhet lives in :root rather than its own attribute block, so an
// unrecognised value degrades to a complete theme rather than to bare tokens.
export const DEFAULT_THEME: ThemeKey = "amonkhet";

export function isThemeKey(value: string | undefined): value is ThemeKey {
  return !!value && THEMES.some((t) => t.key === value);
}
