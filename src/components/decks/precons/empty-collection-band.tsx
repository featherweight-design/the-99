// The band a reader with no collection sees above the precons (handoff L2, and O5 on an open
// precon): every count reads 0 until the collection is in, and the way to put it in.

import Link from "next/link";
import { preconsCopy } from "../../../lib/copy/precons";
import { PendingReporter } from "../../shell/pending-reporter";

const copy = preconsCopy.empty;

export function EmptyCollectionBand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-[8px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[12px_14px] ${className}`}>
      <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-body)]">{copy.body}</p>
      <Link href="/collection/replace" className="font-sans text-[13px] font-medium text-[color:var(--fg)]">{copy.action}<PendingReporter href="/collection/replace" /></Link>
    </div>
  );
}
