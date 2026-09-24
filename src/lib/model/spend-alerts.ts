/**
 * Where a spend alarm goes: the server log, and nowhere else. No workflow, no issue, no network
 * — a settle must never wait on, or fail because of, telling someone about it. Vercel's log
 * search is where it is read; the line is shaped to be found by `[model] spend`.
 */
export function reportSpendThreshold(args: { env: string; pct: number; spentUsd: number; capUsd: number }): void {
  console.warn(
    `[model] spend ${args.env}: month-to-date $${args.spentUsd.toFixed(2)} crossed ${args.pct}% of the $${args.capUsd} budget`,
  );
}
