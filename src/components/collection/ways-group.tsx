"use client";
// The "ways" group (no-collection entry S1, S13, S15; README call 1, design table `no-collection-entry.md`): one
// quiet group under the upload, `No file? Start another way`, holding Precons I own, Import a deck and Add cards.
// ONE component for both surfaces that draw it, first run's step 1 and the empty Collection, so the two teach one
// order. Drawn only with NO_COLLECTION_ENTRY_ENABLED; the caller decides that.
//
// Text presses, never a fill or a border: the upload above stays the only fill (ruling 1, loosened). Desktop (`sm`,
// where step 1's card goes to its row layout) draws three columns, each a 13/600 label with a faint `›` over one
// 12px sub-line; the phone draws three hairline-separated 44px rows, label and `›` only. Precons I own is absent,
// never disabled, with `PRECONS_ENABLED` off (S15), and the other two keep their columns.

import Link from "next/link";
import { useId } from "react";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { PICK_PARAM, PICK_VALUE } from "../../lib/precons/pick";
import { PendingReporter } from "../shell/pending-reporter";

/**
 * Where the group is drawn. `step1`: first run's card, under a 1px rule, with the full sub-lines and `Add cards by
 * hand`. `empty`: the empty Collection, under its Upload tile with no rule, with the short sub-lines (its column is
 * narrower) and the empty state's own `Add cards`; the pick it opens reads `‹ Collection`.
 */
export type WaysSurface = "step1" | "empty";

/** The pick's address from each surface. `from=collection` gives the pick its `‹ Collection` way back (PR 3). */
export function preconsPickHref(surface: WaysSurface): string {
  const base = `/decks/precons?${PICK_PARAM}=${PICK_VALUE}`;
  return surface === "empty" ? `${base}&from=collection` : base;
}

export const IMPORT_DECK_HREF = "/decks/import";

// The press, at both widths. On the phone a 44px row with a hairline under every row but the last; from `sm` a
// column whose press reaches 10px past its text on the left, so the label lines up with the kicker above it.
const PRESS =
  "flex min-h-[44px] w-full items-center justify-between gap-[8px] border-b-[1px] border-[color:var(--border)] bg-transparent px-[2px] text-left font-sans last:border-b-0 hover:bg-[color:var(--surface-sunken)] focus-visible:shadow-[0_0_0_2px_var(--accent)] focus-visible:outline-none sm:-ml-[10px] sm:flex-col sm:items-start sm:justify-start sm:gap-[2px] sm:rounded-[8px] sm:border-b-0 sm:px-[10px] sm:py-[7px]";

function WayText({ label, sub }: { label: string; sub: string }) {
  return (
    <>
      <span className="text-[14px] font-semibold text-[color:var(--fg)] sm:text-[13px]">
        {label}
        {/* The desktop chevron rides the label; the phone's sits at the row's end. */}
        <span aria-hidden="true" className="ml-[4px] hidden font-normal text-[color:var(--fg-faint)] sm:inline">
          ›
        </span>
      </span>
      <span aria-hidden="true" className="font-normal text-[color:var(--fg-faint)] sm:hidden">
        ›
      </span>
      <span className="hidden text-[12px] leading-[1.45] text-[color:var(--fg-muted)] sm:block">{sub}</span>
    </>
  );
}

export function WaysGroup({
  surface,
  precons,
  onAddCards,
  disabled = false,
}: {
  surface: WaysSurface;
  /** `PRECONS_ENABLED`, resolved for this reader: Precons I own is drawn only with it (S15). */
  precons: boolean;
  /** Opens the shipped `AddCardsSheet`; the press is handed in so the sheet returns focus to it. */
  onAddCards: (trigger: HTMLElement) => void;
  /** While the upload above is reading a file, Add cards waits with it, as the shipped button did. */
  disabled?: boolean;
}) {
  const c = collectionEditCopy.ways;
  const kickerId = useId();
  const short = surface === "empty";
  const pickHref = preconsPickHref(surface);

  return (
    <div
      role="group"
      aria-labelledby={kickerId}
      data-ways-group={surface}
      className={`flex w-full flex-col text-left sm:gap-[6px] ${
        surface === "step1" ? "mt-[4px] border-t border-[color:var(--border)] pt-[12px] sm:mt-[12px]" : "mt-[16px]"
      }`}
    >
      <span
        id={kickerId}
        className="mb-[2px] font-mono text-[9.5px] font-medium tracking-[0.14em] text-[color:var(--fg-faint)] uppercase sm:mb-0"
      >
        {c.kicker}
      </span>
      <div className={`flex flex-col sm:grid sm:gap-[4px] ${precons ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {precons ? (
          <Link href={pickHref} className={`${PRESS} no-underline`}>
            <WayText label={c.precons} sub={short ? c.preconsSubShort : c.preconsSub} />
            <PendingReporter href={pickHref} />
          </Link>
        ) : null}
        <Link href={IMPORT_DECK_HREF} className={`${PRESS} no-underline`}>
          <WayText label={c.importDeck} sub={short ? c.importDeckSubShort : c.importDeckSub} />
          <PendingReporter href={IMPORT_DECK_HREF} />
        </Link>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => onAddCards(e.currentTarget)}
          className={`${PRESS} disabled:cursor-wait disabled:opacity-60`}
        >
          <WayText label={short ? c.addCards : c.addByHand} sub={short ? c.addSubShort : c.addSub} />
        </button>
      </div>
    </div>
  );
}
