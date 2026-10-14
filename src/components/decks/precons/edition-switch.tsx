"use client";

// The open precon's edition switch: Regular or Collector's Edition, drawn only for a precon whose set
// printed both. The app's text segment control (the /decks `Tiles · Stats` switch's own segments), as a
// radiogroup: one tab stop, the arrows move the choice.

import { preconsCopy } from "../../../lib/copy/precons";
import { onSegmentKeys } from "../lineup/segment-keys";
import { SEGMENT, SEGMENT_OFF, SEGMENT_ON } from "../lineup/stats-view-switch";

export type PreconEdition = "regular" | "collector";
const EDITIONS = ["regular", "collector"] as const;
const copy = preconsCopy.open.edition;
const editionId = (e: PreconEdition) => `precon-edition-${e}`;

/** `?edition=collector` names the Collector's Edition; anything else, absence included, is Regular. */
export function parseEdition(value: string | string[] | undefined): PreconEdition {
  return value === "collector" ? "collector" : "regular";
}

export function EditionSwitch({ edition, onEdition }: { edition: PreconEdition; onEdition: (e: PreconEdition) => void }) {
  const pick = (e: PreconEdition) => { if (e !== edition) onEdition(e); };
  return (
    <div
      role="radiogroup"
      aria-label={copy.aria}
      onKeyDown={(e) => onSegmentKeys(e, EDITIONS, editionId, pick)}
      className="flex w-fit flex-none gap-[2px] rounded-[9px] border border-[color:var(--border-strong)] p-[2px]"
    >
      {EDITIONS.map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          id={editionId(e)}
          aria-checked={edition === e}
          tabIndex={edition === e ? 0 : -1}
          onClick={() => pick(e)}
          className={`${SEGMENT} ${edition === e ? SEGMENT_ON : SEGMENT_OFF}`}
        >
          {e === "regular" ? copy.regular : copy.collector}
        </button>
      ))}
    </div>
  );
}
