"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import type { DeckClaim } from "../../lib/decks/availability";
import { pullCandidate, pullSourceChoices } from "../../lib/decks/draft-shape";
import type { SourceDeckFigure } from "../../lib/decks/read";
import { heldInOtherDecks } from "../../lib/tuning/limits";
import type { LineItem } from "../../lib/tuning/state";
import { useSheetHost } from "../ui/sheet-host";
import { PullControl } from "./pull-control";
import { ModalChrome } from "./receipt-modal";
import { Name, Thumb } from "./suggestion-line";

const copy = suggestedChangesV2Copy;
const review = deckVersioningCopy.review;


/** A held addition's Pull: the claim Review changes would offer and its full picker list (`review-changes.tsx`). */
function pullOffer(l: LineItem) {
  const a = l.availability ?? undefined;
  const claim = pullCandidate(a);
  const claims = claim ? pullSourceChoices(a) : [];
  return { claim, claims, choosable: claims.filter((c) => !c.commander && !c.locked) };
}

/**
 * Apply's confirmation (the handoff's Apply board, A and A2): the shipped `ModalChrome` with its eyebrow head at 560 on
 * desktop and the shipped sheet on a phone, capped at min(640px, 100dvh − 96px) and 88% (`cap`). Coming in and Going out
 * by name with the card, and the bracket outcome in the lead. The head and the one Apply stay; the lists scroll under a
 * bottom fade. ✕ is the only way out with nothing changed: no second cancel.
 *
 * PORTALLED out of the panel that opens it, into the shared sheet host (`sheet-host.ts`): drawn in place, its `fixed`
 * frame, the Pull's popover and the source picker's sheet were all placed against whatever ancestor held a transform
 * (the Tuning hub's tool panel arrives on `.anim-gentle-in`), so the box sat clipped above the window on desktop and the
 * phone sheet was inset to that panel's width.
 */
export function SuggestedChangesConfirm({
  adds, cuts, bracket, busy, onApply, onClose, deckId = "", ownedFromOtherDecks = false, staged = new Map(), onStage, sourceFigures,
}: {
  /** The picker's "→ N cards" per source, keyed `${deckId}:${oracleId}` (`loadSourceDeckFigures`), as Review changes
   *  passes it. Absent draws no figure. */
  sourceFigures?: Map<string, SourceDeckFigure>;
  /** The deck the set applies to: Review changes' Pull takes it, though a staged pull never sends it from here. */
  deckId?: string;
  /** The run offered copies held in other decks: each held addition carries Review changes' Pull, which STAGES. */
  ownedFromOtherDecks?: boolean;
  /** The staged pulls, by addition id: the deck each copy leaves when Apply is pressed. */
  staged?: ReadonlyMap<string, DeckClaim>;
  /** Stage a pull (a claim) or take the choice back (null). Nothing moves until Apply. */
  onStage?: (itemId: string, claim: DeckClaim | null) => void;
  adds: readonly LineItem[];
  cuts: readonly LineItem[];
  /** The bracket outcome as a sentence ("Bracket stays 2 · Core."), or empty when the set's outcome is not known. */
  bracket: string;
  busy: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  const n = adds.length;
  const anyHeld = adds.some((l) => heldInOtherDecks(l, ownedFromOtherDecks));
  const host = useSheetHost(true);
  if (!host) return null;
  return createPortal(
    <ModalChrome
      eyebrow={copy.confirm.eyebrow}
      title={copy.confirm.title(n)}
      lead={copy.confirm.lead(bracket).trimEnd()}
      closeLabel={copy.confirmClose}
      onClose={onClose}
      width={560}
      cap
      foot={
        <div className="flex flex-col items-stretch gap-[12px] px-[18px] pb-[24px] pt-[12px] md:flex-row md:items-center md:justify-end md:pb-[12px]" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Only while a held card is coming in (Other-Decks board): an unpulled card stays in its deck too. */}
          {anyHeld ? (
            <p data-sc-held-foot="" className="m-0 flex-1 text-center text-[12px] leading-[1.5] md:text-left" style={{ color: "var(--fg-muted)" }}>
              {copy.confirm.heldFoot}
            </p>
          ) : null}
          <button
            type="button"
            onClick={busy ? undefined : onApply}
            aria-disabled={busy || undefined}
            data-sc-confirm-apply=""
            className="h-[48px] w-full rounded-[8px] px-[18px] text-[13.5px] font-semibold md:h-[40px] md:w-auto bg-[color:var(--accent)] text-[color:var(--bg)] hover:bg-[color:var(--accent-hover)] transition-colors"
          >
            {busy ? copy.applying : copy.confirm.apply(n * 2)}
          </button>
        </div>
      }
    >
      <div className="relative">
        <div className="grid grid-cols-1 gap-[16px] px-[18px] py-[14px] md:grid-cols-2 md:gap-[18px]">
          <Side
            label={copy.confirm.comingIn(adds.length)}
            sign="+"
            lines={adds}
            held={{ deckId, ownedFromOtherDecks, staged, onStage, sourceFigures, busy }}
          />
          <Side label={copy.confirm.goingOut(cuts.length)} sign="−" lines={cuts} />
        </div>
        {/* The lists scroll under the foot; the fade says there is more (Apply A2). */}
        <div
          aria-hidden
          className="pointer-events-none sticky bottom-0 -mt-[24px] h-[24px]"
          style={{ background: "linear-gradient(to bottom, transparent, var(--surface-raised))" }}
        />
      </div>
    </ModalChrome>,
    host,
  );
}

type HeldProps = {
  deckId: string;
  ownedFromOtherDecks: boolean;
  staged: ReadonlyMap<string, DeckClaim>;
  onStage?: (itemId: string, claim: DeckClaim | null) => void;
  sourceFigures?: Map<string, SourceDeckFigure>;
  /** Apply is in flight: Pull it, the picker and Undo hold until it settles. */
  busy: boolean;
};

function Side({ label, sign, lines, held }: { label: string; sign: "+" | "−"; lines: readonly LineItem[]; held?: HeldProps }) {
  return (
    <section aria-label={label} className="flex min-w-0 flex-col">
      <h3 className="m-0 mb-[6px] font-mono text-[10px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>{label}</h3>
      <ul className="m-0 flex list-none flex-col p-0">
        {lines.map((l) => held && heldInOtherDecks(l, held.ownedFromOtherDecks) ? (
          <HeldRow key={l.id} line={l} held={held} />
        ) : (
          <li key={l.id} className="flex min-h-[30px] items-center gap-[8px]">
            <span aria-hidden className="w-[10px] flex-none font-mono text-[13px] font-semibold" style={{ color: sign === "+" ? "var(--accent-text)" : "var(--fg-faint)" }}>
              {sign}
            </span>
            <Thumb item={l} small />
            {/* The thumbnail is pointer-only (`Thumb`): the name is the keyboard's way to the card, as on the line. */}
            <span className="min-w-0 truncate"><Name item={l} strike={false} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The undo of a staged choice, in the Pull's own box (`.pbt.mu`): muted, never the accent, since it writes nothing. */
const UNSTAGE_BUTTON =
  "ml-auto inline-flex flex-none items-center justify-center min-h-[44px] md:min-h-[34px] px-[16px] md:px-[11px] "
  + "rounded-[7px] font-sans font-medium text-[12.5px] md:text-[12px] bg-transparent cursor-pointer "
  + "disabled:opacity-50 disabled:cursor-default "
  + "[border:1px_solid_var(--border-strong)] text-[color:var(--fg-muted)]";

/**
 * A held addition (Other-Decks board, the confirmation's `.cr2.hd`): the name over its holder (`in HD - Gishath`, `in 2
 * decks`) with Review changes' Pull, which stages the choice; staged, the line reads `pulls from {deck}` in the accent
 * and Undo takes the choice back. A commander or locked copy draws the Pull's own guard and no control.
 */
function HeldRow({ line: l, held }: { line: LineItem; held: HeldProps }) {
  const { claim, claims, choosable } = pullOffer(l);
  const chosen = held.staged.get(l.id) ?? null;
  // The pressed control unmounts as the row redraws (Pull it becomes Undo, and back), so focus follows the row to its
  // replacement rather than falling to the page. Set only by a press here, never on a first draw.
  const moveFocus = useRef<"undo" | "pull" | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const pullSlot = useRef<HTMLSpanElement>(null);
  const chosenId = chosen?.id ?? null;
  // A commander or locked holder draws the Pull's guard tag, which is aria-hidden: its sentence is the name's
  // description, as on Review changes' row.
  const guardId = useId();
  const guard = chosen ? null : claim?.commander
    ? review.commanderGuardA11y(claim.name, l.cardName)
    : claim?.locked ? lockedCardsCopy.pull.a11y(claim.name, l.cardName) : null;
  useEffect(() => {
    const to = moveFocus.current;
    moveFocus.current = null;
    if (to === "undo") undoRef.current?.focus();
    else if (to === "pull") pullSlot.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [chosenId]);
  const holder = claim?.name ?? l.availability?.claims[0]?.name ?? null;
  const sub = chosen
    ? copy.confirm.pullsFrom(chosen.name)
    : choosable.length > 1 ? review.heldByMany(choosable.length) : holder ? review.heldBy(holder) : null;
  return (
    <li data-sc-held={l.id} className="flex min-h-[52px] items-center gap-[8px] py-[6px] md:min-h-[44px] md:py-[5px]">
      <span aria-hidden className="w-[10px] flex-none font-mono text-[13px] font-semibold" style={{ color: "var(--accent-text)" }}>+</span>
      <Thumb item={l} small />
      <span className="flex min-w-0 flex-1 flex-col gap-[2px] py-[3px]">
        {guard ? <span id={guardId} data-sc-held-guard="" className="sr-only">{guard}</span> : null}
        <span className="min-w-0 truncate"><Name item={l} strike={false} describedBy={guard ? guardId : undefined} /></span>
        {sub ? (
          <span data-sc-held-sub={chosen ? "staged" : "held"} className="self-start font-mono text-[10.5px]" style={{ color: chosen ? "var(--accent-text)" : "var(--fg-muted)" }}>
            {sub}
          </span>
        ) : null}
      </span>
      {chosen ? (
        <button
          ref={undoRef}
          type="button"
          className={UNSTAGE_BUTTON}
          aria-label={copy.confirm.unstageA11y(l.cardName, chosen.name)}
          disabled={held.busy}
          onClick={() => {
            if (held.busy) return;
            moveFocus.current = "pull";
            held.onStage?.(l.id, null);
          }}
        >
          {copy.confirm.unstage}
        </button>
      ) : claim && held.onStage ? (
        <span ref={pullSlot} className="ml-auto flex-none">
          <PullControl
            deckId={held.deckId}
            card={{ oracleId: l.cardOracleId, name: l.cardName }}
            claims={claims}
            defaultId={(choosable[0] ?? claim).id}
            sourceFigures={held.sourceFigures}
            disabled={held.busy}
            onPulled={() => undefined}
            onChoose={(c) => {
              moveFocus.current = "undo";
              held.onStage?.(l.id, c);
            }}
          />
        </span>
      ) : null}
    </li>
  );
}
