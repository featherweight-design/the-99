"use client";

import { useState } from "react";
import { exportLaunchList } from "../../app/admin/invites/flyer-actions";
import { flyerAdminCopy } from "../../lib/copy/admin";
import { downloadTextFile } from "../../lib/decks/download";

// Download CSV (flyer admin PR C; CSV.dc.html C3 and C4): a text button at the end of the launch card's top row (the same
// text button as Clear, 32 tall on the desktop and 44 on a phone). The file is built on the server, which names it by the
// UTC day, so this only saves what came back; the caller draws it only when the list holds an address.
//
// A press that saves nothing says why (small items 9, CSV-Failed.dc.html F1 to F7): a danger line under the card's top
// row, so the state lives in `useLaunchCsv` and the card places the button and the line apart. `failed` (the server could
// not build the file) and `off` (the trial switched off) draw a line with no retry, since the same press would end the
// same way; a thrown call (a lost reply, or the admin check refusing) draws the lost line and Try again. The button holds
// while the file is built, as shipped, and a new press clears the line.

export type LaunchCsvFailure = "failed" | "off" | "lost";

export type LaunchCsv = { pending: boolean; failure: LaunchCsvFailure | null; press: () => void };

export function useLaunchCsv(): LaunchCsv {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<LaunchCsvFailure | null>(null);

  function press() {
    setPending(true);
    setFailure(null);
    void (async () => {
      try {
        const result = await exportLaunchList();
        if (result.ok) downloadTextFile(result.filename, result.csv, "text/csv;charset=utf-8");
        else setFailure(result.error);
      } catch {
        setFailure("lost");
      } finally {
        setPending(false);
      }
    })();
  }

  return { pending, failure, press };
}

const TEXT_BUTTON =
  "inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap border-0 bg-transparent px-[6px] text-[13px] font-medium text-[color:var(--accent-text)] md:min-h-[32px]";

export function FlyerLaunchCsv({ csv }: { csv: LaunchCsv }) {
  return (
    <button type="button" data-testid="launch-csv" disabled={csv.pending} onClick={csv.press} className={TEXT_BUTTON}>
      {flyerAdminCopy.csv}
    </button>
  );
}

const FAILURE_LINE: Record<LaunchCsvFailure, string> = {
  failed: flyerAdminCopy.csvFailed,
  off: flyerAdminCopy.csvOff,
  lost: flyerAdminCopy.csvLost,
};

/** The failure line under the launch card's top row (CSV-Failed `.al9`): 12.5/1.5 danger ink, Try again on lost only. */
export function FlyerLaunchCsvAlert({ csv }: { csv: LaunchCsv }) {
  if (!csv.failure) return null;
  return (
    <p
      role="alert"
      data-testid="launch-csv-failure"
      className="m-0 flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] px-[12px] pb-[12px] text-[12.5px] leading-[1.5] text-[color:var(--danger)] md:px-[14px]"
    >
      <span>{FAILURE_LINE[csv.failure]}</span>
      {csv.failure === "lost" && (
        <button
          type="button"
          data-testid="launch-csv-retry"
          disabled={csv.pending}
          onClick={csv.press}
          className="inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 text-[12.5px] font-normal text-[color:var(--accent-text)] md:min-h-[32px]"
        >
          {flyerAdminCopy.csvRetry}
        </button>
      )}
    </p>
  );
}
