"use client";

// LastSlotsStrip — the last-31 box, sitting between the provenance ledger and
// the decklist in the builder.
//
// #361 deleted the two fill CTAs. The strip no longer adds cards; it opens a
// list (#360 scope 1). One door, and behind it the whole ranked pool with a
// tick per row and one commit.
//
// The strip owns the selection rather than the list, because ticks and declines
// survive the list being closed (state 9) while TopOffList unmounts on close.
// It also owns the box, the heading, the caption and the door note; everything
// from the selection head down belongs to TopOffList.

import { useEffect, useId, useRef, useState } from "react";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { topOffCopy } from "../../lib/copy/top-off";
import type { TopOffCandidate } from "../../lib/decks/last-slots";
import { useIsDesktop } from "../ui/use-is-desktop";
import { TopOffList } from "./top-off-list";

export interface LastSlotsStripProps {
  deckId: string;
  /** 99 minus the current built count from the optimistic card list. */
  openSlots: number;
  /** The whole ranked pool, uncapped, already excluding what the deck holds. */
  candidates: TopOffCandidate[];
  /** Oracle ids in the deck right now — the list names a row that went illegal
      while it was open rather than dropping it from under the cursor. */
  deckOracleIds: Set<string>;
  /** Newest price as-of, for the buy tags and the money figure. */
  newestAsOf: Date | null;
  /** Writes one message per settle to the live region in builder-shell.tsx. */
  onAnnounce: (message: string) => void;
  /** True while the commit is running. The shell uses it to disable quick-add. */
  onInflight?: (inflight: boolean) => void;
  /** Open/closed, so the shell can collapse the quick-add dock at phone widths
      (state 20) — the dock is hidden, never unmounted, so its query survives. */
  onOpenChange?: (open: boolean) => void;
}

// ── Exhausted line (state 13) ──────────────────────────────────────────────
// The strip keeps a line and loses its control. §16's plate, which is the
// shipped provenance shape with a sans sentence and the accent left border —
// accent rather than warning because an exhausted pool is honest, not alarming.
// Border-left is set via inline styles (as provenance-line.tsx does) so jsdom
// can inspect the individual longhand properties.

function ExhaustedLine({ total, shortfall }: { total: string; shortfall: string }) {
  return (
    <div
      data-testid="last-slots-exhausted"
      className="flex items-start gap-[10px] rounded-[9px] px-[13px] py-[11px]"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        borderLeftColor: "var(--accent)",
      }}
    >
      <div
        className="flex flex-none items-center justify-center rounded-full font-mono text-[10px] md:text-[11px] w-[18px] h-[18px] md:w-[20px] md:h-[20px]"
        aria-hidden
        style={{ border: "1px solid var(--accent-shadow)", color: "var(--accent)" }}
      >
        i
      </div>
      <p className="flex-1 text-[12.5px] leading-[1.6]" style={{ color: "var(--fg-body)" }}>
        {synergyCopy.lastSlots.short(total, shortfall)}
      </p>
    </div>
  );
}

// ── LastSlotsStrip ─────────────────────────────────────────────────────────

export function LastSlotsStrip(props: LastSlotsStripProps) {
  // States 10 and 14: the strip is absent at a full deck. Arithmetic, not a
  // flag. The guard lives in the outer component so the stateful inner one
  // never calls hooks conditionally — React requires hooks to run every render.
  if (props.openSlots <= 0) return null;
  return <LastSlotsStripInner {...props} />;
}

function LastSlotsStripInner({
  deckId,
  openSlots,
  candidates,
  deckOracleIds,
  newestAsOf,
  onAnnounce,
  onInflight,
  onOpenChange,
}: LastSlotsStripProps) {
  const listId = useId();
  const doorRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();

  const [open, setOpen] = useState(false);
  // A pass landed in this visit, so the door note stops describing a first
  // open. Session state rather than a server figure: the note is about what
  // the player just did and what their selection still holds, and both are
  // things only this component knows. A reload has neither, and the first-open
  // note is the honest thing to say then.
  const [passed, setPassed] = useState(false);

  // Held here rather than in TopOffList: both survive the list being closed and
  // reopened (state 9), and the list unmounts on close.
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  // Ticks are seeded on the FIRST open only. Reopening restores the selection
  // the player left, which is the promise strip.doorNoteAgain makes.
  const seeded = useRef(false);

  const ownedIds = candidates.filter((c) => c.owned).map((c) => c.oracleId);

  function openList() {
    let seedTicked = ticked;
    if (!seeded.current) {
      seeded.current = true;
      seedTicked = new Set(ownedIds.slice(0, openSlots));
      setTicked(seedTicked);
    }
    setOpen(true);
    onOpenChange?.(true);
    // One message per settle, and opening at phone settles two facts at once —
    // so they are one message. Two calls would leave only the second in the
    // live region, and the one that would survive is the lesser of the two.
    const opened = topOffCopy.announce.opened(
      String(candidates.length),
      String(openSlots),
      String(seedTicked.size),
    );
    onAnnounce(isDesktop ? opened : `${opened} ${topOffCopy.dock.retiredAnnounce}`);
  }

  // Focus returns to the door on close (§1e), and only then — opening does not
  // move focus. The door does not exist at the moment close is asked for, so
  // the move waits for the render that puts it back.
  const returnFocus = useRef(false);
  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    doorRef.current?.focus();
  }, [open]);

  function closeList(reason: "cancel" | "committed") {
    returnFocus.current = true;
    if (reason === "committed") setPassed(true);
    setOpen(false);
    onOpenChange?.(false);
  }

  // State 13: nothing left to offer. The line replaces the caption and the
  // door both — a control with nothing to do is absent, not disabled.
  const exhausted = candidates.length === 0;

  const doorNote = !passed
    ? topOffCopy.strip.doorNote(String(ownedIds.length))
    : ownedIds.length === 0
      ? topOffCopy.strip.doorNoteAgain(String(candidates.length))
      : topOffCopy.strip.doorNoteAgainOwned(
          String(ownedIds.length),
          String(candidates.length),
        );

  return (
    <div
      className={[
        "mx-[16px] md:mx-[30px] mt-[10px] md:mt-[12px] md:mb-[16px] rounded-[10px]",
        // The open panel is tighter at phone, where the list beneath it carries
        // its own spacing; desktop padding does not change between the two.
        open ? "px-[12px] pt-[12px] pb-[10px]" : "px-[14px] py-[13px]",
        "md:px-[16px] md:py-[14px]",
      ].join(" ")}
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border-strong)",
      }}
    >
      {/* Heading and caption. One baseline row at desktop, two blocks at phone;
          `Close the list` joins that row while the list is open. */}
      <div className="md:flex md:items-baseline md:gap-[10px] md:mb-[11px]">
        <p
          className="font-mono uppercase text-[10px] md:text-[10.5px] mb-[4px] md:mb-0"
          style={{ letterSpacing: ".14em", color: "var(--accent)" }}
        >
          {topOffCopy.strip.heading(String(openSlots))}
        </p>

        {!exhausted && (
          <p
            className="font-mono text-[10px] md:text-[10.5px] mb-[11px] md:mb-0"
            style={{ color: "var(--fg-faint)" }}
          >
            <span className="md:hidden">
              {topOffCopy.strip.captionMobile(
                String(openSlots),
                String(candidates.length),
              )}
            </span>
            <span className="hidden md:inline">
              {topOffCopy.strip.caption(String(openSlots), String(candidates.length))}
            </span>
          </p>
        )}

        {open && (
          <button
            type="button"
            onClick={() => closeList("cancel")}
            // `Close` is a visual truncation at 390px, not a second label, and
            // both spans are in the DOM at every width — so without this the
            // spoken name is the two of them run together.
            aria-label={topOffCopy.strip.close}
            className="ml-auto flex-none inline-flex items-center min-h-[44px] md:min-h-0 font-mono text-[10px] md:text-[11px] bg-transparent cursor-pointer [color:var(--fg-faint)] [border-bottom:1px_dashed_var(--border-dashed)]"
          >
            {/* Shortened at 390px, where the strip head has one line to give.
                One element with responsive spans, not two mounted controls. */}
            <span className="md:hidden">Close</span>
            <span className="hidden md:inline">{topOffCopy.strip.close}</span>
          </button>
        )}
      </div>

      {exhausted ? (
        <ExhaustedLine total={String(99 - openSlots)} shortfall={String(openSlots)} />
      ) : !open ? (
        <div className="md:flex md:items-center md:gap-[12px] md:flex-wrap">
          <button
            ref={doorRef}
            type="button"
            onClick={openList}
            aria-expanded={false}
            aria-controls={listId}
            aria-label={topOffCopy.strip.openAria(String(openSlots))}
            className={[
              "flex md:inline-flex items-center justify-center md:justify-start",
              "gap-[8px] md:gap-[9px] w-full md:w-auto min-h-[44px] md:min-h-0",
              "md:px-[16px] md:py-[10px] rounded-[8px] bg-transparent",
              "font-semibold text-[14px] md:text-[13px] cursor-pointer",
              "[border:1px_solid_var(--accent)] [color:var(--accent)]",
            ].join(" ")}
          >
            {topOffCopy.strip.open(String(openSlots))}
            <span aria-hidden className="font-mono text-[12px]" style={{ color: "var(--fg-faint)" }}>
              {"↓"}
            </span>
          </button>
          <p
            className="font-mono text-[10px] md:text-[10.5px] leading-[1.55] md:leading-[1.6] mt-[9px] md:mt-0 md:flex-1 md:min-w-[240px]"
            style={{ color: "var(--fg-locked)" }}
          >
            {doorNote}
          </p>
        </div>
      ) : (
        <TopOffList
          deckId={deckId}
          listId={listId}
          openSlots={openSlots}
          candidates={candidates}
          deckOracleIds={deckOracleIds}
          ticked={ticked}
          onTickedChange={setTicked}
          declined={declined}
          onDeclinedChange={setDeclined}
          newestAsOf={newestAsOf}
          onAnnounce={onAnnounce}
          onInflight={(v) => onInflight?.(v)}
          onClose={closeList}
        />
      )}
    </div>
  );
}
