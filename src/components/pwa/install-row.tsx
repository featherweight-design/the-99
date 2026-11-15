"use client";

// The first-run checklist's install row (install onboarding R1c, frames F1, F1s, F2): the fallback for a player who left
// the tour before its Install stop. Unnumbered, under step 3 and above the signature, Friends and news rows, in the
// Friends row's live box (radius 14, `--surface-inset` on `--border-strong`, as R1's row drew it). Two presses,
// as the header slot has: the row (this browser's how-to sheet on an iPhone, the held prompt on Android) and a bare ✕.
//
// It draws only while the header slot would (its ask is offered: an iPhone browser or an Android phone's held prompt,
// not installed, not dismissed), no first-run tour is waiting or running in this tab, and the local mark is unset (G6:
// a tour that reached the stop wrote `seen`; the row, the header button or this ✕ wrote `retired`). While it draws, the
// header slot steps aside. Its ✕ also counts as one header dismiss (`dismissOnce`).
import { useEffect, useSyncExternalStore } from "react";

import { pwaInstallCopy } from "../../lib/copy/pwa-install";
import { dismissOnce } from "../../lib/pwa/install-dismissal";
import { readRaw, subscribeToKey } from "../ui/local-store";
import { INSTALL_ROW_KEY, installServerState, installState, retireInstallRow, showInstallRow, subscribeInstall } from "./install-ask";

const c = pwaInstallCopy.row;

// `md:hidden`: the slot it stands for lives in the phone header, so from md up the checklist is as shipped (D1), even on
// a phone held sideways past the breakpoint.
const BOX =
  "flex md:hidden min-h-[56px] w-full flex-none items-center gap-[12px] rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)] p-[6px_4px_6px_15px] text-left font-sans text-[color:var(--fg-body)] sm:gap-[14px] sm:p-[7px_6px_7px_18px]";

const subscribeMark = (onChange: () => void) => subscribeToKey(INSTALL_ROW_KEY, onChange);
const readMark = () => readRaw(INSTALL_ROW_KEY);
// The server draws no row: everything it depends on is the browser's.
const serverMark = () => "server";

export function InstallRow() {
  const { ask, tour } = useSyncExternalStore(subscribeInstall, installState, installServerState);
  const mark = useSyncExternalStore(subscribeMark, readMark, serverMark);
  const draws = ask !== null && !tour && mark === null;
  useEffect(() => (draws ? showInstallRow() : undefined), [draws]);
  if (!draws) return null;
  return (
    <div data-install-row className={BOX}>
      <button
        type="button"
        onClick={() => {
          retireInstallRow();
          ask.press();
        }}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-[12px] border-0 bg-transparent p-0 text-left sm:gap-[14px]"
      >
        {/* The header slot's own glyph, in the box the numerals and Friends' + use. */}
        <span
          aria-hidden
          className="box-border flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px] border-[1.5px] border-solid border-[color:var(--accent-shadow)] text-[color:var(--accent-text)]"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7M7 9L4 6M7 9l3-3M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <b className="font-display text-[15px] font-semibold text-[color:var(--fg)] sm:text-[16px]">{c.title}</b>
          <span className="text-[12px] leading-[1.45] text-[color:var(--fg-muted)] sm:text-[12.5px]">{c.line[ask.kind]}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          retireInstallRow();
          dismissOnce();
        }}
        aria-label={c.dismissAria}
        className="inline-flex h-[44px] w-[44px] flex-none items-center justify-center border-0 bg-transparent text-[color:var(--fg-faint)]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
