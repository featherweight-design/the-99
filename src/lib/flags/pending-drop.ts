/*
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
 * Group 3's six switches went this way: #2567, then migration 0219; the held five #2618, then migration 0227.
 *
 * Client-safe: no imports.
 */

/**
 * Each pending name with the name it followed in the registry (`null`: it came first). The registry is not
 * sorted, so a sort rule cannot put a name back where it sat; the anchor can. An anchor may itself be pending,
 * listed earlier here.
 */
const PENDING_DROPS: readonly { name: string; after: string | null }[] = [];

/** The switches deleted from the registry that `flag_overrides_switch_check` still accepts. */
export const PENDING_DROP_SWITCHES: readonly string[] = PENDING_DROPS.map((d) => d.name);

/**
 * The names the CHECK accepts: `names` with each pending name placed right after its anchor, which is where
 * it sat in the registry, so the constraint reads exactly as the one in force and `db:generate` finds no
 * change. An anchor that is neither in `names` nor placed earlier throws: a guessed position would reorder the
 * CHECK, and the next `db:generate` would drop and re-add it unasked.
 */
export function withPendingDrops(names: readonly string[]): string[] {
  const out = [...names];
  for (const { name, after } of PENDING_DROPS) {
    const anchor = after === null ? -1 : out.indexOf(after);
    if (after !== null && anchor === -1) throw new Error(`pending drop ${name}: anchor ${after} is not placed`);
    out.splice(anchor + 1, 0, name);
  }
  return out;
}
