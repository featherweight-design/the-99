// The demo's tab rule, as pure logic: which tab a key moves to. Local state only, so a press on a tab changes what the demo
// draws and nothing else; the rule lives here so it is tested without a component.

/** The tab a key moves to from `current`: arrows step (wrapping), Home and End jump, any other key stays. */
export function nextTab<T extends string>(ids: readonly T[], current: T, key: string): T {
  const at = ids.indexOf(current);
  if (at < 0 || ids.length === 0) return current;
  if (key === "ArrowRight" || key === "ArrowDown") return ids[(at + 1) % ids.length];
  if (key === "ArrowLeft" || key === "ArrowUp") return ids[(at - 1 + ids.length) % ids.length];
  if (key === "Home") return ids[0];
  if (key === "End") return ids[ids.length - 1];
  return current;
}
