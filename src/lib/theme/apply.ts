import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ThemeKey } from "./themes";

/**
 * Paint the choice and remember it. Lives outside any component because it touches the document rather than React state,
 * and the compiler's immutability rule rightly objects to that happening in a component's own scope. Shared by the account
 * menu's picker and the public landing's theme switch, which cannot read or set a cookie on the server.
 */
export function applyTheme(key: ThemeKey) {
  document.documentElement.dataset.theme = key;
  // Secure over HTTPS only: on plain-HTTP localhost the attribute makes the
  // browser drop the cookie outright, so setting it unconditionally would
  // reintroduce the flash of the default theme in development.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${key}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}
