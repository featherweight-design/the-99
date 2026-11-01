/**
 * Switches deleted from the registry whose names `flag_overrides_switch_check` still accepts, until a
 * follow-up migration drops their rows and narrows the CHECK. Empty between retirements.
 *
 * Retiring a switch whose override rows a reader depends on takes two deploys, because migrations
 * apply during the production build, while the previous deployment still serves. Deleting the rows in
 * the same deploy as the code would turn the switch off under the old code for the whole build window,
 * and an old admin page could write a name the narrowed CHECK refuses. So:
 * 1. The code PR removes the switch from the registry and lists its name here. The resolver ignores
 *    rows for names outside the registry, and the admin write path refuses them.
 * 2. Once that deploy is live, a migration deletes the rows, narrows the CHECK and empties this list.
 * Group 3's six switches went this way: #2567, then migration 0219.
 *
 * Client-safe: no imports.
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
    const at = out.findIndex((n) => n > p && !PENDING_DROP_SWITCHES.includes(n));
    out.splice(at === -1 ? out.length : at, 0, p);
  }
  return out;
}
