"use client";
// The setter's `Seats` in the table's head (README §3: "reopens setup with the seats kept"; boards `R1 - Read-Phone`,
// `R2 - Read-Desktop`, `.btn.gho.sm`). The press reads setup for this table through the setter's grant, opens the
// sheet, and saves through `reseatTableAction`; the page then redraws from the server.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadTableSetupAction, reseatTableAction } from "../../app/friends/table/setup-actions";
import { leaveDialogsForNavigation } from "../../lib/a11y/dialog";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { GhostButton } from "../ui/button";
import { SetupSheet, type SetupData } from "./setup-sheet";

export function SeatsButton({ tableId, className }: { tableId: string; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<{ setup: SetupData; invites: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  async function press() {
    if (busy) return;
    setBusy(true);
    try {
      const out = await loadTableSetupAction(tableId);
      // Null when the table closed or the reader is no longer its setter: the page's own next draw says which.
      if (out) setOpen(out);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <GhostButton
        type="button"
        aria-busy={busy || undefined}
        onClick={() => void press()}
        className={`inline-flex min-h-[36px] flex-none items-center justify-center whitespace-nowrap rounded-[8px] px-[13px] text-[13px] ${className ?? ""}`}
      >
        {ruleZeroCopy.page.seats}
      </GhostButton>
      {open ? (
        <SetupSheet
          setup={open.setup}
          onClose={() => setOpen(null)}
          onSave={(seats) => reseatTableAction(tableId, seats)}
          onDone={() => {
            setOpen(null);
            router.refresh();
          }}
          onInvite={
            open.invites
              ? () => {
                  // The sheet's history entry stays under /friends: released by a close, its Back would cancel the push.
                  leaveDialogsForNavigation();
                  setOpen(null);
                  router.push("/friends?invite=new");
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}
