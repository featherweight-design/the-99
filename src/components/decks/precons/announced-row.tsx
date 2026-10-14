"use client";

// One announced set in the rows view (handoff R2 Q2–Q3; design table: Set row). A precon row in a dashed shell:
// a thumb (the first revealed card, or the empty plate), the name and its countdown, the first commander `and N
// more`, then the set's dots, code and date. The row is its own disclosure, closed every visit: a press opens its
// cards under a dashed rule. A set with nothing revealed has no chevron and does not open.

import { useState } from "react";
import { preconDate, preconsCopy } from "../../../lib/copy/precons";
import { colorNames } from "../../../lib/copy/color-labels";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { countdown, type AnnouncedMatch } from "../../../lib/precons/arrivals";
import { CommanderThumb } from "../../ui/commander-thumb";
import { FOCUS_RING, NEW_TAG, RevealedStrip } from "./announced-parts";

const copy = preconsCopy.upcoming;

/** Line 2: every name for one or two, the first and how many more past that, or none revealed yet. */
export function namesLine(m: AnnouncedMatch): string {
  const names = m.commanders.map((c) => c.name);
  if (names.length === 0) return copy.noneRow;
  return names.length <= 2 ? copy.names(names) : copy.more(names[0], names.length - 1);
}

export function AnnouncedRow({ match, today, isNew, identity }: {
  match: AnnouncedMatch;
  today: string;
  isNew: boolean;
  /** The set's dots, from its revealed commanders. */
  identity: string[];
}) {
  const [open, setOpen] = useState(false);
  const { set, commanders } = match;
  const lead = commanders[0];
  const c = countdown(set.releasesOn, today);
  const when = c.kind === "out" ? copy.outShort : copy.until(c);
  const canOpen = commanders.length > 0;
  const regionId = `announced-row-${set.code}`;

  const body = (
    <>
      {lead ? (
        <CommanderThumb imageUri={lead.imageUriSmall} colorIdentity={lead.colorIdentity} size="list" lazy />
      ) : (
        <span aria-hidden className="block h-[48px] w-[34px] flex-none rounded-[4px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)]" data-testid="row-plate" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-baseline justify-between gap-[10px]">
          <span className="flex min-w-0 items-center gap-[8px]">
            <span className="truncate font-display text-[14.5px] leading-[1.3] text-[color:var(--fg)] md:text-[16px]">{set.name}</span>
            {isNew && <span className={NEW_TAG}>{copy.newTag}</span>}
          </span>
          <span className="flex-none whitespace-nowrap font-mono text-[11px] text-[color:var(--fg-body)] md:text-[12px]">
            {when}
            {canOpen && <span aria-hidden className="ml-[4px] text-[color:var(--fg-faint)]">{open ? "▾" : "▸"}</span>}
          </span>
        </span>
        <span className="truncate font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)]">{namesLine(match)}</span>
        <span className="flex items-center gap-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {identity.length > 0 && (
            <>
              <span className="sr-only">{colorNames(identity).join(", ")}</span>
              <span aria-hidden className="flex gap-[3px]">
                {identity.map((x) => (
                  <span key={x} className="h-[9px] w-[9px] rounded-full md:h-[11px] md:w-[11px]" style={{ background: WUBRG_COLOR[x] }} />
                ))}
              </span>
            </>
          )}
          {copy.rowMeta(set.code.toUpperCase(), preconDate(set.releasesOn))}
        </span>
      </span>
    </>
  );

  return (
    <li className="flex flex-col rounded-[10px] border border-dashed border-[color:var(--border-dashed)] md:rounded-[11px]" data-testid="announced-row">
      {/* The name is the row's heading, as a set block's is (each set an `<h3>`). */}
      <h3 className="m-0 font-normal">
        {canOpen ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={regionId}
            onClick={() => setOpen((o) => !o)}
            className={`flex min-h-[44px] w-full cursor-pointer items-center gap-[11px] rounded-[10px] border-0 bg-transparent p-[10px_8px_10px_12px] text-left md:gap-[14px] md:rounded-[11px] md:p-[11px_12px_11px_15px] ${FOCUS_RING}`}
          >
            {body}
          </button>
        ) : (
          <span className="flex min-h-[44px] items-center gap-[11px] p-[10px_8px_10px_12px] md:gap-[14px] md:p-[11px_12px_11px_15px]">{body}</span>
        )}
      </h3>
      {canOpen && (
        <div id={regionId} hidden={!open} className="border-x-0 border-b-0 border-t-[1px] border-dashed border-t-[color:var(--border-strong)] p-[12px_0_12px_12px] md:mx-0 md:p-[12px_15px_14px_15px]">
          <RevealedStrip commanders={commanders} />
        </div>
      )}
    </li>
  );
}
