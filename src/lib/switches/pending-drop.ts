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
/**
 * Each pending name with the name it followed in the registry (`null`: it came first). The registry is not
 * sorted, so a sort rule cannot put a name back where it sat; the anchor can. An anchor may itself be pending,
 * listed earlier here. Group 3's held five go this way, as the six did.
 */
const PENDING_DROPS: readonly { name: string; after: string | null }[] = [
  { name: "ANALYSIS_TAB_ENABLED", after: null },
  { name: "HELP_ME_CHOOSE_ENABLED", after: "FEEDBACK_ENABLED" },
  { name: "PROPOSED_CUTS_ENABLED", after: "PUSH_ENABLED" },
  { name: "SWAP_TOOLS_ENABLED", after: "SUGGESTED_CHANGES_V2_ENABLED" },
  { name: "TUNING_ENABLED", after: "SWAP_TOOLS_ENABLED" },
];

export const PENDING_DROP_SWITCHES: readonly string[] = PENDING_DROPS.map((d) => d.name);

/**
 * The names the CHECK accepts: `names` with each pending name placed right after its anchor, which is where
 * it sat in the registry, so the constraint reads exactly as the one in force and `db:generate` finds no
 * change. A missing anchor puts the name last.
 */
export function withPendingDrops(names: readonly string[]): string[] {
  const out = [...names];
  for (const { name, after } of PENDING_DROPS) {
    const anchor = after === null ? -1 : out.indexOf(after);
    out.splice(after === null ? 0 : anchor === -1 ? out.length : anchor + 1, 0, name);
  }
  return out;
}
