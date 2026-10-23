// The job summary: figures first, then which rules fired. Markdown, for $GITHUB_STEP_SUMMARY and the issue body.

const n = (x, d = 0) => (x === null || x === undefined ? "n/a" : Number(x).toLocaleString("en-US", { maximumFractionDigits: d }));
const delta = (a, b) => (b > 0 ? `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(0)}%` : "n/a");

export function renderReport({ date, vercel, neon, neonWeek, verdict, builds }) {
  const out = [`## Weekly cost check, ${date}`, "", verdict.red ? "**RED**" : "Green", ""];
  out.push("| Rule | Fired | Detail |", "|---|---|---|");
  for (const r of verdict.rules) out.push(`| ${r.label} | ${r.skipped ? "skipped" : r.fired ? "YES" : "no"} | ${r.detail} |`);
  if (vercel) {
    const { thisWeek: w, lastWeek: p } = vercel;
    out.push("", "### Vercel (list price, team-wide)", "", "| | This week | Last week | Change |", "|---|---:|---:|---:|");
    for (const [label, key, d] of [
      ["Usage cost, $", "costUsd", 2], ["Build CPU minutes", "buildMinutes", 0], ["Build cost, $", "buildUsd", 2],
      ["Function GB-hours", "functionGbHours", 1], ["Active CPU hours", "activeCpuHours", 1], ["Invocations", "invocations", 0],
      ["Transfer GB", "transferGb", 1], ["Observability events", "observabilityEvents", 0],
    ]) out.push(`| ${label} | ${n(w[key], d)} | ${n(p[key], d)} | ${delta(w[key], p[key])} |`);
  }
  if (builds) out.push("", `Builds this week: ${Object.entries(builds).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (neon) {
    out.push("", "### Neon (billing period to date)", "",
      `Compute ${n(neon.computeSeconds / 3600, 1)} CU-hours, transfer ${n(neon.transferBytes / 1e9, 1)} GB, ${neon.branchCount} branches.`,
      neonWeek ? `Since the last snapshot (${n(neonWeek.days, 1)} days), scaled to a week: ${n(neonWeek.computeCuHours, 0)} CU-hours, ${n(neonWeek.transferGb, 1)} GB.` : "No comparison this run.",
      "", "| Branch | CU-hours | Transfer GB | Size GB |", "|---|---:|---:|---:|");
    for (const b of [...neon.branches].sort((a, c) => c.computeSeconds - a.computeSeconds))
      out.push(`| ${b.name} | ${n(b.computeSeconds / 3600, 1)} | ${n(b.transferBytes / 1e9, 2)} | ${n(b.logicalBytes / 1e9, 2)} |`);
  }
  return out.join("\n") + "\n";
}
