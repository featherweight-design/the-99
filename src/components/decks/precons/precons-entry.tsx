// The /decks line into the precons (handoff `design_handoff_the99_precons` R2, P1 to P4): a cell in
// the head row beside the cart's, the same box with no ring. At 390 the short title and count; at
// 640 up the full title with the newest release. A summary that could not be read drops the meta,
// never the line.

import Link from "next/link";
import { preconDate, preconsCopy } from "../../../lib/copy/precons";
import type { PreconSummary } from "../../../lib/precons/summary";
import { PendingReporter } from "../../shell/pending-reporter";

const copy = preconsCopy.door;

export function PreconsEntry({ summary }: { summary: PreconSummary | null }) {
  return (
    <Link
      href="/decks/precons"
      className="flex min-h-[52px] min-w-0 flex-1 items-center gap-[6px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[var(--surface)] p-[7px_8px_7px_12px] no-underline sm:min-h-[56px] sm:gap-[12px] sm:px-[14px] sm:py-[9px]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] sm:hidden">
        <span className="text-[13.5px] font-medium text-[color:var(--fg)]">{copy.linePhone}</span>
        {summary && <span className="whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-muted)]">{copy.lineMetaPhone(summary.count)}</span>}
      </span>
      <span className="hidden min-w-0 flex-1 flex-col gap-[3px] sm:flex">
        <span className="text-[14px] font-medium text-[color:var(--fg)]">{copy.line}</span>
        {summary && <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{copy.lineMeta(summary.count, preconDate(summary.newest))}</span>}
      </span>
      <span aria-hidden className="flex-none text-[16px] text-[color:var(--fg-muted)] sm:text-[18px]">›</span>
      <PendingReporter href="/decks/precons" />
    </Link>
  );
}
