"use client";

// Deck import, state 12 — the imported list holds no legendary creature.
//
// This is a dead end, and it must read as one. A Commander deck is led by a
// legendary creature; `decks.commander_oracle_id` is notNull, so there is no
// half-made deck to fall back to. Nothing has been written by the time this
// renders, and nothing is written from here.

import { deckImportCopy } from "../../lib/copy/deck-import";
import { GhostButton, PrimaryButton } from "../ui/button";

const copy = deckImportCopy.commander;

/** One of the three cards in the mark. The front one is the dashed, unanswered slot. */
function MarkCard({
  className,
  background,
  border,
  transform,
  children,
}: {
  className: string;
  background: string;
  border: string;
  transform?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={`absolute top-0 left-1/2 rounded-[8px] flex items-center justify-center ${className}`}
      style={{
        background,
        border,
        transform: `translateX(-50%) ${transform ?? ""}`.trim(),
      }}
    >
      {children}
    </div>
  );
}

export function ImportNoCommander({
  lineCount,
  onBack,
  onStartFromCommander,
}: {
  /** The total the copy names — "none of these {n} lines is one". */
  lineCount: number;
  onBack: () => void;
  onStartFromCommander: () => void;
}) {
  const total = lineCount.toLocaleString();
  return (
    <div
      role="alert"
      className="text-center p-[44px_24px_32px] md:p-[64px_40px]"
      style={{
        backgroundImage:
          "radial-gradient(400px 220px at 50% 80%, rgba(201,162,75,0.07), transparent 70%)",
      }}
    >
      {/* Mark: three cards, the front one dashed and unanswered */}
      <div className="relative mx-auto w-[96px] h-[104px] md:w-[112px] md:h-[120px] mb-[20px] md:mb-[22px]">
        <MarkCard
          className="w-[48px] h-[68px] md:w-[56px] md:h-[78px]"
          background="#221D16"
          border="1.5px solid var(--border-strong)"
          transform="rotate(-15deg) translateX(-18px)"
        />
        <MarkCard
          className="w-[48px] h-[68px] md:w-[56px] md:h-[78px]"
          background="#2A241D"
          border="1.5px solid #4A4033"
        />
        <MarkCard
          className="w-[48px] h-[68px] md:w-[56px] md:h-[78px]"
          background="#241B12"
          border="1.5px dashed var(--warning)"
          transform="rotate(15deg) translateX(18px)"
        >
          <span
            className="font-display font-extrabold text-[20px] md:text-[24px]"
            style={{ color: "var(--warning)" }}
          >
            ?
          </span>
        </MarkCard>
      </div>

      <h2 className="font-display font-bold text-[21px] md:text-[26px] m-0 text-[color:var(--fg)]">
        {copy.noneHeading}
      </h2>
      <p className="mt-[10px] md:mt-[12px] md:mx-auto md:max-w-[420px] text-[13.5px] md:text-[15px] leading-[1.6] text-[color:var(--fg-body)]">
        <span className="md:hidden">{copy.noneBody(total)}</span>
        <span className="hidden md:inline">{copy.noneBodyDesktop(total)}</span>
      </p>

      <div className="flex flex-col md:flex-row md:justify-center gap-[10px] md:gap-[12px] mt-[24px] md:mt-[26px]">
        <PrimaryButton
          onClick={onStartFromCommander}
          className="w-full md:w-auto text-[15px] md:text-[14px] py-[13px] px-0 md:py-[12px] md:px-[22px] min-h-[44px]"
        >
          {copy.noneCta}
        </PrimaryButton>
        <GhostButton
          onClick={onBack}
          className="w-full md:w-auto text-[14px] py-[12px] px-0 md:py-[12px] md:px-[22px] min-h-[44px]"
        >
          {copy.noneBack}
        </GhostButton>
      </div>

      {/* Desktop-only in the canvas (design table caveat 15); the phone gets the
          same assurance from `noneBack` sitting right there. */}
      <p className="hidden md:block font-mono text-[11px] mt-[24px] text-[color:var(--fg-faint)]">
        {copy.noneReassurance}
      </p>
    </div>
  );
}
