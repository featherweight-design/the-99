/**
 * `pnpm probe:anthropic-cost [YYYY-MM ...]`: reads The 99 workspace's month from Anthropic's cost
 * report through the shipped, UNCACHED read (`readWorkspaceCost`, `src/lib/admin/anthropic-cost.ts`),
 * and prints what the admin Costs page would be handed. It touches no database and writes nothing.
 * With no month it reads the current one and the one before, which settles the plan's open question
 * M1 (whether a current month clamped to now is accepted) and how far back the report serves.
 *
 * It prints only the month, `ok` or the unread kind, the match count, the window it sent (and
 * whether `ending_at` was sent or omitted), the workspace, other-workspaces and org figures in
 * dollars, and the key list as a count (or its unread kind). Never an id, a key's name or hint, a
 * header or a body.
 *
 * THE KEY: `ANTHROPIC_ADMIN_KEY` is read from THIS SHELL only. This probe deliberately does not load
 * `.env`, and the key must never be put there: `scripts/lib/env.mjs` loads `.env` with
 * `override: true`, so a value in the file would silently win over the shell's, and a file is a
 * place a key leaks from. The key is Sensitive in Vercel, so `vercel env pull` cannot fetch it.
 * Type it for the one command, unechoed:
 *
 *   read -s ANTHROPIC_ADMIN_KEY && ANTHROPIC_ADMIN_KEY="$ANTHROPIC_ADMIN_KEY" pnpm probe:anthropic-cost; unset ANTHROPIC_ADMIN_KEY
 *
 * Exits 1 with no key, or when any month is unread.
 */
import { readWorkspaceCost } from "../src/lib/admin/anthropic-cost";
import { reportWindow } from "../src/lib/admin/anthropic-cost-rule";
import { monthOf, monthParam, shiftMonth, usd, type MonthKey } from "../src/lib/admin/costs-rule";

if (!process.env.ANTHROPIC_ADMIN_KEY?.trim()) {
  console.log("no_key: ANTHROPIC_ADMIN_KEY is not set in this shell");
  process.exit(1);
}

const now = new Date();
const args = process.argv.slice(2);
const months: MonthKey[] = [];
for (const arg of args) {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(arg);
  if (!m) {
    console.log(`not a month: ${arg} (YYYY-MM)`);
    process.exit(1);
  }
  months.push({ year: Number(m[1]), month: Number(m[2]) - 1 });
}
if (months.length === 0) months.push(monthOf(now), shiftMonth(monthOf(now), -1));

let unread = 0;
for (const month of months) {
  const w = reportWindow(month, now);
  const result = await readWorkspaceCost(month, now);
  const sent = `window ${w.startingAt} to ${w.endingAt ?? "(ending_at omitted)"}`;
  if (result.ok) {
    // The key list as a count and its statuses only: never a key's name, hint or id.
    const keys = result.keys.ok ? `keys ${result.keys.rows.length} (${result.keys.rows.filter((k) => k.status === "active").length} active)` : `keys ${result.keys.kind}`;
    console.log(`${monthParam(month)}  ok  match 1  ${sent}  workspace ${usd(result.workspaceMicro)}  other ${usd(result.otherMicro)}  org ${usd(result.orgMicro)}  ${keys}`);
  } else {
    unread++;
    const match = result.kind === "ambiguous_workspace" ? `match ${result.count}` : result.kind === "no_workspace" ? "match 0" : "match -";
    console.log(`${monthParam(month)}  ${result.kind}  ${match}  ${sent}`);
  }
}
process.exit(unread ? 1 : 0);
