// No `import "server-only"` guard. The package is not a dependency here and no
// other module in this repo uses one; `next/headers` already refuses to resolve
// in a client component, so the guard would add a dependency to restate a rule
// the import below enforces on its own.
import { cookies } from "next/headers";
import { DEFAULT_THEME, isThemeKey, THEME_COOKIE, type ThemeKey } from "./themes";

/**
 * The theme in force for this request. Reading a cookie opts the caller into
 * dynamic rendering; see the note in the Phase 5 PR body for why that costs
 * nothing here.
 */
export async function resolveTheme(): Promise<ThemeKey> {
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemeKey(stored) ? stored : DEFAULT_THEME;
}
