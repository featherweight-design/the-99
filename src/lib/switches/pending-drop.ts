/**
 * Switches deleted from the registry whose names `flag_overrides_switch_check` still accepts, until a
 * follow-up migration drops their rows and narrows the CHECK. Empty between retirements: group 3's six
 * were dropped by migration 0219, a deploy after the code that stopped reading them.
 *
 * Two steps because migrations apply during the production build, before the new code serves: a
 * migration that deleted these rows in the same deploy would turn them off under the old code for the
 * whole build window (production's env has them at `false`, on only through app-wide rows), and an old
 * admin page could write a name the narrowed CHECK refuses. So this deploy only stops reading them, and
 * the next one deletes the rows and drops the names here.
 *
 * Nothing reads or writes these names: the admin write path validates against the registry
 * (`isOverrideName`), which no longer has them. Client-safe: no imports.
 */
export const PENDING_DROP_SWITCHES: readonly string[] = [];

/**
 * The names the CHECK accepts: `names` with each pending name placed before the first name that sorts
 * after it, which is where it sat in the registry, so the constraint reads exactly as the one in force
 * and `db:generate` finds no change.
 */
export function withPendingDrops(names: readonly string[]): string[] {
  const out = [...names];
  for (const p of PENDING_DROP_SWITCHES) {
    const at = out.findIndex((n) => n > p && !(PENDING_DROP_SWITCHES as readonly string[]).includes(n));
    out.splice(at === -1 ? out.length : at, 0, p);
  }
  return out;
}
