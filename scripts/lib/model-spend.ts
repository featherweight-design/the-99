export type SpendRow = { origin: string; feature: string; status: string; costMicroUsd: number | null };

export type SpendGroup = { origin: string; feature: string; calls: number; unpriced: number; micro: number };

/**
 * Dollars by origin and feature. Every recorded cost counts, refunded or not (credits count
 * successes, dollars count everything billed: the same rule as the spend cap). A row with no
 * recorded cost is counted in `unpriced`, never as zero dollars silently.
 */
export function groupSpend(rows: readonly SpendRow[]): SpendGroup[] {
  const by = new Map<string, SpendGroup>();
  for (const r of rows) {
    const k = `${r.origin}\u0000${r.feature}`;
    const g = by.get(k) ?? { origin: r.origin, feature: r.feature, calls: 0, unpriced: 0, micro: 0 };
    g.calls += 1;
    if (r.costMicroUsd === null) g.unpriced += 1;
    else g.micro += r.costMicroUsd;
    by.set(k, g);
  }
  return [...by.values()].sort((a, b) => a.origin.localeCompare(b.origin) || b.micro - a.micro || a.feature.localeCompare(b.feature));
}

const usd = (micro: number) => `$${(micro / 1_000_000).toFixed(4)}`;

export function formatSpend(groups: readonly SpendGroup[]): string {
  if (groups.length === 0) return "No model calls in this window.";
  const lines = ["origin  feature   calls  unpriced  spend"];
  for (const g of groups) {
    lines.push(`${g.origin.padEnd(7)} ${g.feature.padEnd(9)} ${String(g.calls).padStart(5)}  ${String(g.unpriced).padStart(8)}  ${usd(g.micro)}`);
  }
  const origins = new Map<string, number>();
  for (const g of groups) origins.set(g.origin, (origins.get(g.origin) ?? 0) + g.micro);
  for (const [o, m] of [...origins].sort()) lines.push(`${o.padEnd(7)} total                          ${usd(m)}`);
  return lines.join("\n");
}
