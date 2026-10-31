"use client";

import { useState } from "react";
import { exportLaunchList } from "../../app/admin/invites/flyer-actions";
import { flyerAdminCopy } from "../../lib/copy/admin";
import { downloadTextFile } from "../../lib/decks/download";

// Download CSV (flyer admin PR C; CSV.dc.html C3 and C4): a text button at the end of the launch card's top row (the same
// text button as Clear, 32 tall on the desktop and 44 on a phone). The file is built on the server, which names it by the
// UTC day, so this only saves what came back. The boards draw no failure line, so a refused or failed press saves nothing
// and the button comes back; the caller draws it only when the list holds an address.

const TEXT_BUTTON =
  "inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[6px] text-[13px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]";

export function FlyerLaunchCsv() {
  const [pending, setPending] = useState(false);

  function press() {
    setPending(true);
    void (async () => {
      try {
        const result = await exportLaunchList();
        if (result.ok) downloadTextFile(result.filename, result.csv, "text/csv;charset=utf-8");
      } catch {
        // A lost reply saves nothing; pressing again asks again.
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <button type="button" data-testid="launch-csv" disabled={pending} onClick={press} className={TEXT_BUTTON}>
      {flyerAdminCopy.csv}
    </button>
  );
}
