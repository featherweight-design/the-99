"use client";

// Unresolved banner — state 14, §11 of the design table. Sits below the spine
// and above both the coverage strip and the tab pair, because what it says is
// that the counts underneath it are short by this many lines.
//
// Same geometry as the import failure banner, deliberately: this is the same
// species of message — something did not go the way it was meant to — and it
// reads as one.

import { deckImportCopy } from "../../lib/copy/deck-import";
import { GhostButton } from "../ui/button";

const copy = deckImportCopy.unresolved;

// The desktop sentence ends on the deck being held off `Complete`, and the
// design bolds that word so the consequence is legible without reading the
// whole line. Split on the copy rather than duplicating it here, so the two
// cannot drift.
const COMPLETE = "Complete";

function boldComplete(sentence: string) {
  const at = sentence.indexOf(COMPLETE);
  if (at === -1) return sentence;
  return (
    <>
      {sentence.slice(0, at)}
      <strong className="font-semibold" style={{ color: "var(--fg)" }}>
        {COMPLETE}
      </strong>
      {sentence.slice(at + COMPLETE.length)}
    </>
  );
}

interface UnresolvedBannerProps {
  /** Lines, not cards: the sentence describes the import, not the ledger. */
  count: number;
  onTakeALook: () => void;
}

export function UnresolvedBanner({ count, onTakeALook }: UnresolvedBannerProps) {
  if (count === 0) return null;

  return (
    <div className="px-[16px] pt-[12px] md:px-[30px] md:pt-[14px]">
      <div
        className="flex gap-[10px] rounded-[8px] p-[12px_14px] md:gap-[12px] md:rounded-[10px] md:p-[16px_18px]"
        style={{
          background: "var(--elevated-hover)",
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--warning)",
        }}
      >
        <span
          aria-hidden
          className="flex-none text-[15px] leading-[1.3] md:text-[17px] md:leading-[1.2]"
          style={{ color: "var(--warning)" }}
        >
          ⚠
        </span>

        <div className="flex-1 min-w-0">
          <p
            className="m-0 text-[12.5px] leading-[1.55] md:text-[14px] md:leading-[1.6]"
            style={{ color: "var(--fg-body)" }}
          >
            <span className="md:hidden">{copy.bannerMobile(count)}</span>
            <span className="hidden md:inline">{boldComplete(copy.banner(count))}</span>
          </p>

          {/* Phone puts the jump under the sentence as a text link; the ghost
              button below is the same action at desktop width. */}
          <button
            type="button"
            onClick={onTakeALook}
            className="md:hidden mt-[7px] font-semibold text-[12.5px] bg-transparent border-0 p-0 cursor-pointer text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] transition-colors"
          >
            {copy.bannerAction}
          </button>
        </div>

        <GhostButton
          onClick={onTakeALook}
          className="hidden md:inline-flex flex-none self-start text-[13px] px-[18px] py-[10px]"
        >
          {copy.bannerAction}
        </GhostButton>
      </div>
    </div>
  );
}
