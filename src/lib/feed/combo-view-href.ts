/**
 * Where a new-combo feed item's second press goes: the Collection's combos view (own both) with the pair the item
 * announced tagged NEW (`?new`). An item with no variant (a legacy row) still opens the view, untagged.
 */
export function comboViewHref(variantId: string | null | undefined): string {
  const params = new URLSearchParams({ combos: "both" });
  if (variantId) params.set("new", variantId);
  return `/collection?${params.toString()}`;
}
