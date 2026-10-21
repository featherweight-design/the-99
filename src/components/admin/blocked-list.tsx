"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearBlock } from "../../app/admin/payments/actions";
import type { ClearBlockResult } from "../../lib/payments/clear-block";
import { adminCopy } from "../../lib/copy/admin";
import { PendingBar } from "./invites-section";

// Buying paused (admin plan A3): each account a dispute paused, with Let them buy. The press opens the group editor's
// pending bar (what it will do, the open disputes it leaves standing, Undo and the press), as Grant credits does.

const c = adminCopy.payments;
export type BlockedRow = { userId: string; name: string; since: string; openDisputes: number };

const LINE = "flex min-h-[44px] flex-wrap items-center justify-between gap-[10px] border-0 border-t border-solid border-[color:var(--border)] py-[8px] first:border-t-0";
const TEXT_BUTTON = "inline-flex min-h-[44px] items-center border-0 bg-transparent px-[4px] text-[13px] font-medium text-[color:var(--accent-text)] disabled:opacity-60 md:min-h-[32px]";

export function BlockedList({ rows, emptyClassName }: { rows: readonly BlockedRow[]; emptyClassName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  async function press(row: BlockedRow) {
    setFailure(null);
    setInFlight(true);
    let result: ClearBlockResult;
    try {
      result = await clearBlock(row.userId);
    } catch {
      setInFlight(false);
      setFailure(c.clear.lost);
      router.refresh();
      return;
    }
    setInFlight(false);
    if (!result.ok) {
      setFailure(c.clear.failed);
      return;
    }
    setOpen(null);
    setSaid(result.cleared ? c.clear.done(row.name) : c.clear.already(row.name));
    // The action revalidated the page; a repeat press changed nothing, so draw the list as it stands.
    if (!result.cleared) router.refresh();
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {said && <p role="status" className="m-0 text-[13px] text-[color:var(--success)]">{said}</p>}
      {rows.length === 0 && <p className={emptyClassName}>{c.noBlocked}</p>}
      <ul data-testid="payments-blocked" className="m-0 flex list-none flex-col p-0">
        {rows.map((r) => (
          <li key={r.userId} data-account={r.userId} className="flex flex-col gap-[8px]">
            <div className={LINE}>
              <span className="text-[13.5px] text-[color:var(--fg-body)]">{c.blockedLine(r.name, r.since)}</span>
              <button
                type="button"
                className={TEXT_BUTTON}
                disabled={inFlight}
                aria-expanded={open === r.userId}
                onClick={() => {
                  setOpen(r.userId);
                  setFailure(null);
                  setSaid(null);
                }}
              >
                {c.clear.press}
              </button>
            </div>
            {open === r.userId && (
              <PendingBar
                testId="clear-pending"
                sentence={c.clear.pending(r.name, r.openDisputes)}
                failure={failure}
                press={c.clear.confirm}
                onUndo={() => {
                  setOpen(null);
                  setFailure(null);
                }}
                onPress={() => press(r)}
                inFlight={inFlight}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
