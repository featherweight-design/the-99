// The theme registry. One list, shared by the picker, the root layout and the
// tests, so a seventh theme is one row here and one block in globals.css.

export const THEME_COOKIE = "the99_theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Ixalan and Eldraine take the grid slots Innistrad and Duskmourn vacated, so
// the four survivors keep the positions they shipped in. The handoff's copy file
// lists the renamed four before the new two, but that is how it groups its own
// annotations — it says nothing about layout, and following it would move four
// chips a returning user already knows the position of.
//
// `short` is what a ~90px chip can show. The full `plane` is what the option is
// announced as, so nothing is lost to a screen reader. Held here rather than
// derived in the picker: a rule ("take the part before the colon") happens to
// shorten Kamigawa and does nothing at all for Wilds of Eldraine, which then
// truncates mid-word to "Wilds of Eldra…".
export const THEMES = [
  { key: "amonkhet", name: "Low Sun", plane: "Amonkhet", short: "Amonkhet" },
  { key: "kamigawa", name: "Neon Rain", plane: "Kamigawa: Neon Dynasty", short: "Kamigawa" },
  { key: "ixalan", name: "Canopy", plane: "Ixalan", short: "Ixalan" },
  { key: "phyrexia", name: "Oil Haze", plane: "New Phyrexia", short: "New Phyrexia" },
  { key: "eldraine", name: "Witching Hour", plane: "Wilds of Eldraine", short: "Eldraine" },
  { key: "kaldheim", name: "First Frost", plane: "Kaldheim", short: "Kaldheim" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

// Amonkhet lives in :root rather than its own attribute block, so an
// unrecognised value degrades to a complete theme rather than to bare tokens.
export const DEFAULT_THEME: ThemeKey = "amonkhet";

export function isThemeKey(value: string | undefined): value is ThemeKey {
  return !!value && THEMES.some((t) => t.key === value);
}

/**
 * Two ids stopped existing. `data-theme` is persisted per user, so a value that
 * no longer matches a block would paint bare `:root` under a name the picker
 * cannot show as selected.
 *
 * The survivor is the nearest theme, never the default: someone who chose
 * Moonlit chose a cool desaturated theme, and dropping them into brass is the
 * loudest possible wrong answer. Both were retired *for* sitting 15° and 25°
 * from a survivor, which is what makes the move nearly invisible.
 */
export const RETIRED_THEMES = {
  innistrad: { was: "Moonlit", survivor: "phyrexia" },
  duskmourn: { was: "Screen Glow", survivor: "kaldheim" },
} as const satisfies Record<string, { was: string; survivor: ThemeKey }>;

export type RetiredThemeKey = keyof typeof RETIRED_THEMES;

export function isRetiredThemeKey(value: string | undefined): value is RetiredThemeKey {
  // Own properties only. The value comes from a cookie, and `in` would accept
  // `toString` or `__proto__` — which then resolve to a prototype member with no
  // `survivor` on it, so the caller paints `undefined` or throws.
  return !!value && Object.hasOwn(RETIRED_THEMES, value);
}

/** The persisted theme id in a `document.cookie` string, as written; undefined when absent. */
export function themeCookieValue(cookie: string): string | undefined {
  return cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${THEME_COOKIE}=`))
    ?.slice(THEME_COOKIE.length + 1);
}

/** The theme to paint for a persisted value, retired ids included. */
export function themeFor(persisted: string | undefined): ThemeKey {
  if (isThemeKey(persisted)) return persisted;
  if (isRetiredThemeKey(persisted)) return RETIRED_THEMES[persisted].survivor;
  return DEFAULT_THEME;
}
