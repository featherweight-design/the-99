"use client";

// §Surfaces 2 §Decisions 4 — the review page's one nested action, and the two
// rows where it is not offered. Addendum R1 (`design_handoff_the99_pull_source`)
// adds a third shape: a card held by two or more decks that can give it up now
// opens a short list, rather than `pullCandidate()` picking silently.
//
// A pull takes a card out of somebody else's sleeved deck, so the control is
// never brass-solid: the full buy tag sits beside it, and the point is that the
// two options are weighed against each other rather than one being recommended.
//
// The click is not guarded against the review row's plate-wide handler, because
// that handler does the filtering itself: it ignores any click landing inside a
// button or a link (`update-diff-row.tsx`). One mechanism in one place beats a
// `stopPropagation` in every control the plate happens to contain.

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { pullCardFromDeck, type PullResult } from "../../app/decks/actions";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckClaim } from "../../lib/decks/availability";
import { formatShortDeckDate } from "../../lib/decks/format";
import type { SourceDeckFigure } from "../../lib/decks/read";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { useDialogA11y } from "../../lib/a11y/dialog";
import { cardDetailCopy } from "../cards/card-detail-provider";
import { ANCHORED_PANEL_CLASS, useAnchoredPanel } from "../ui/anchored-panel";
import { Sheet } from "../ui/sheet";
import { useIsDesktop } from "../ui/use-is-desktop";
import { draftAnnouncer } from "./draft-announcer";
import { MutationError } from "./mutation-error";

const copy = deckVersioningCopy.review;
const sourceCopy = copy.source;

/** The box the pull stands in: 44px on phone, 34px above it. It was shared with
 *  the guards' own link, which is gone — a guarded row now draws a tag and no
 *  control, so the two rows no longer have to be the same width. */
const ACTION_BOX =
  "inline-flex items-center justify-center min-h-[44px] md:min-h-[34px] px-[16px] md:px-[11px] " +
  "rounded-[7px] font-sans font-semibold text-[12.5px] md:text-[12px] bg-transparent " +
  "[border:1px_solid_var(--border-strong)] cursor-pointer disabled:opacity-50 disabled:cursor-default";

/** Never solid — see the header. The accent is the pull's alone: it is the one
 *  thing on this page that writes. */
const PULL_BUTTON = `${ACTION_BOX} text-[color:var(--accent)]`;

/** The guard's word, in the buy tag's shape: mono, uppercase, on a flat plate.
 *  Three words beside a deck name the row already prints, rather than R1's
 *  two-line sentence. The sentence itself lives in the row's own accessible
 *  description, because the tag has no control to hang it on. */
const GUARD_TAG =
  "font-mono rounded-[4px] px-[5px] py-[1px] text-[9.5px] uppercase tracking-[0.1em] flex-none " +
  "[border:1px_solid_var(--accent-shadow)]";

/** The row's own way into the card — a button on every deck surface in the app,
 *  and the one control on this row that the refresh keeps. It belongs to the
 *  parent row rather than to this component, so it is reached through the DOM
 *  rather than a ref: the walk stops at the first ancestor holding a trigger for
 *  this card, which is the row. */
function rowTrigger(from: HTMLElement | null, cardName: string): HTMLElement | null {
  const label = cardDetailCopy.triggerAria(cardName);
  for (let node = from?.parentElement ?? null; node; node = node.parentElement) {
    for (const candidate of node.querySelectorAll<HTMLElement>("button")) {
      if (candidate.getAttribute("aria-label") === label) return candidate;
    }
  }
  return null;
}

/** `since` as the picker's own rows draw it — same stamp `contested-card-row.tsx`
 *  uses, through the same formatter: a second one here would drift from it. */
function stamp(claim: DeckClaim): string {
  if (claim.since == null || claim.versionNumber == null) return "";
  return cardAssignmentsCopy.contested.stamp(claim.versionNumber, formatShortDeckDate(new Date(claim.since)));
}

export type PullControlProps = {
  /** The deck being reviewed — the one that gains the copy. */
  deckId: string;
  card: { oracleId: string; name: string };
  /** Every claim a reader could be asked to pick between — `pullSourceChoices`'s
   *  full list, guards included for display. */
  claims: DeckClaim[];
  /** Today's pick (`pullCandidate(...).id`) — always one of `claims`. Preselected
   *  when the list opens, and the single-tap source when there is only one. */
  defaultId: string;
  /** "→ {n} cards" per candidate, keyed `${deckId}:${oracleId}` — see
   *  `loadSourceDeckFigures`. A candidate absent from this map draws no figure. */
  sourceFigures?: Map<string, SourceDeckFigure>;
  /** The row's parent, so it can react to the copy having moved. The figures in
   *  the announcement are the server's; this is not where they arrive. */
  onPulled: () => void;
};

export function PullControl({ deckId, card, claims, defaultId, sourceFigures, onPulled }: PullControlProps) {
  // "Only sources that can be chosen count" (design call 5): a locked or
  // commander row is drawn for display, but it is never one more tap, so it
  // does not turn a single-source row into a two-or-more one.
  const choosable = claims.filter((c) => !c.commander && !c.locked);

  if (choosable.length <= 1) {
    // Today's shape, unchanged: one claim, which is either the single source
    // that can be chosen, or — when there is none — the guard (commander takes
    // precedence over locked, `pullCandidate`'s own order) this row has instead.
    const claim = choosable[0] ?? claims.find((c) => c.commander) ?? claims.find((c) => c.locked) ?? null;
    if (!claim) return null;
    return <SinglePull deckId={deckId} card={card} claim={claim} onPulled={onPulled} />;
  }

  return (
    <SourcePicker
      deckId={deckId}
      card={card}
      claims={claims}
      defaultId={defaultId}
      sourceFigures={sourceFigures}
      onPulled={onPulled}
    />
  );
}

/** One claim: the shipped one-tap path, or a guard tag with no control. */
function SinglePull({
  deckId,
  card,
  claim,
  onPulled,
}: {
  deckId: string;
  card: { oracleId: string; name: string };
  claim: DeckClaim;
  onPulled: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // The region has to be in the document before any text reaches it, which is why
  // it is put there on mount rather than on the click that fills it.
  useEffect(() => {
    draftAnnouncer();
  }, []);

  // Commander first: no route releases one, so this arm draws no control at all.
  // The server refuses a commander pull as well; this is the rendering half.
  if (claim.commander) {
    return (
      <span className="inline-flex items-center flex-none">
        {/* Four letters and no accessible name of its own, exactly as the locked
            guard's tag is: the sentence behind them is the row's, carried in the
            name trigger's `aria-describedby` (`review-changes.tsx`). That trigger
            is the only focusable thing on this arm, so describing it is the one
            place a reader tabbing the row hears why no pull is offered — and a
            second utterance here read the whole sentence twice per row. */}
        <span
          aria-hidden="true"
          className={GUARD_TAG}
          style={{ color: "var(--fg-muted)" }}
        >
          {copy.commanderGuardTag}
        </span>
      </span>
    );
  }

  // The player locked the card in the source deck (L2). The server refuses that pull too
  // (`PULL_REFUSED_LOCKED`), so no control is drawn: the tag sits beside the holding deck's name,
  // which the row already prints, and the sentence is the row's description, as for the
  // commander guard above it.
  if (claim.locked) {
    return (
      <span className="inline-flex items-center flex-none">
        <span aria-hidden="true" className={GUARD_TAG} style={{ color: "var(--fg-muted)" }}>
          {lockedCardsCopy.pull.tag}
        </span>
      </span>
    );
  }

  // No guard for a source with a draft of its own (Hugh, 2026-09-27): a pull no longer commits,
  // it joins that draft, so there is nothing of the owner's to sweep into a version.

  // A column, because the refusal is written underneath the control rather than
  // beside it: the row's name is a hand's width to the left and a message in line
  // with the button would push it out of the plate.
  return (
    <div className="inline-flex flex-col items-end flex-none" ref={wrapperRef}>
      <span className="inline-flex items-center gap-[6px]">
        <button
          type="button"
          className={PULL_BUTTON}
          // Named, because the visible two words repeat down the column: out of
          // context they say nothing about which card leaves which deck.
          aria-label={copy.pullA11y(card.name, claim.name)}
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              let result: PullResult;
              try {
                result = await pullCardFromDeck(claim.id, card.oracleId, deckId);
              } catch {
                // A throw rather than a refusal — a network or database failure,
                // or the server's ownership guard — and the same fallback every
                // other deck mutation gives that class of failure. The removal's
                // wording, because a pull that threw is a removal that did not
                // happen: the copy is still sleeved where it was.
                setError(DECK_REMOVE_FALLBACK_MESSAGE);
                return;
              }
              if (!result.ok) {
                setError(result.message);
                return;
              }
              // Announced once, into the region that outlives this control. The
              // arithmetic is the server's, read after the write, so it is spoken
              // rather than only appearing when the revalidated page paints — and
              // a failed read of it says nothing about buying at all.
              draftAnnouncer().textContent =
                result.buy === null
                  ? deckVersioningCopy.commit.pullAnnouncedBuyUnknown(card.name, claim.name)
                  : deckVersioningCopy.commit.pullAnnounced(
                      card.name,
                      claim.name,
                      result.buy,
                      result.total,
                    );
              // Focus moves BEFORE the refresh, while this control is still in the
              // document: the refreshed row is no longer a pullable one, so the
              // button the reader is standing on is about to be removed and focus
              // would fall to the body. The row's own card trigger survives the
              // refresh, so a reader is left where they were reading.
              rowTrigger(wrapperRef.current, card.name)?.focus();
              onPulled();
            });
          }}
        >
          {pending ? copy.pulling : copy.pull}
        </button>
      </span>
      {/* The shipped refusal, not a second one written here: a pull is refused by
          the same class of race every other deck mutation is, and the row stays
          pullable so the reader can take the refusal's advice and try again. */}
      {error && <MutationError message={error} />}
    </div>
  );
}

const POPOVER_WIDTH = 372;

/** 2+ choosable sources: a popover at ≥ md, a bottom sheet below it (design
 *  call 1). One `open` state and one body — `useIsDesktop` decides the shell
 *  that wraps it, never both at once (the same rule `filter-panel.tsx` states
 *  for its own popover/sheet split: a hidden duplicate corrupts the
 *  accessibility tree). */
function SourcePicker({
  deckId,
  card,
  claims,
  defaultId,
  sourceFigures,
  onPulled,
}: {
  deckId: string;
  card: { oracleId: string; name: string };
  claims: DeckClaim[];
  defaultId: string;
  sourceFigures?: Map<string, SourceDeckFigure>;
  onPulled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isDesktop = useIsDesktop();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { at, place, triggerRef, panelRef } = useAnchoredPanel({ open, width: POPOVER_WIDTH });

  useEffect(() => {
    draftAnnouncer();
  }, []);

  // The popover has no backdrop (desktop only — the sheet has its own scrim and
  // dismisses through `useDialogA11y`/`Sheet`'s own wiring), so an outside press
  // is what dismisses it, scoped to the wrapper so the trigger's own toggle is
  // reached first.
  useEffect(() => {
    if (!isDesktop || !open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) close(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `close` is stable in shape, not identity
  }, [isDesktop, open]);

  function close(restoreFocus = true) {
    // Design state 8: pulling disables Cancel too, and Esc/the scrim do nothing.
    if (pending) return;
    setOpen(false);
    setSelectedId(defaultId);
    setError(null);
    if (restoreFocus) triggerRef.current?.focus();
  }

  const chosen = claims.find((c) => c.id === selectedId) ?? null;

  function confirm() {
    if (!chosen || pending) return;
    setError(null);
    startTransition(async () => {
      let result: PullResult;
      try {
        result = await pullCardFromDeck(chosen.id, card.oracleId, deckId);
      } catch {
        setError(DECK_REMOVE_FALLBACK_MESSAGE);
        return;
      }
      if (!result.ok) {
        // Design state 9: refused, the list stays open with the pick kept — the
        // reader can try again or choose a different source.
        setError(result.message);
        return;
      }
      draftAnnouncer().textContent =
        result.buy === null
          ? deckVersioningCopy.commit.pullAnnouncedBuyUnknown(card.name, chosen.name)
          : deckVersioningCopy.commit.pullAnnounced(card.name, chosen.name, result.buy, result.total);
      rowTrigger(wrapperRef.current, card.name)?.focus();
      setOpen(false);
      onPulled();
    });
  }

  const body = (
    <SourcePickerBody
      titleId={titleId}
      card={card}
      claims={claims}
      selectedId={selectedId}
      onSelect={setSelectedId}
      pending={pending}
      error={error}
      sourceFigures={sourceFigures}
      chosenName={chosen?.name ?? ""}
      chosenPending={chosen?.pending ?? false}
      onCancel={() => close()}
      onConfirm={confirm}
    />
  );

  return (
    <div className="inline-flex flex-col items-end flex-none" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={copy.pullManyA11y(card.name, claims.filter((c) => !c.commander && !c.locked).length)}
        className={PULL_BUTTON}
        onClick={() => {
          if (!open) place();
          setOpen((o) => !o);
          setSelectedId(defaultId);
          setError(null);
        }}
      >
        {copy.pull} <span aria-hidden="true">▾</span>
      </button>
      {open && isDesktop && (
        <Popover ref={panelRef} at={at} titleId={titleId} onDismiss={close}>
          {body}
        </Popover>
      )}
      {open && !isDesktop && (
        <Sheet
          open={open}
          onDismiss={close}
          ariaLabel={sourceCopy.title(card.name)}
          panelRef={panelRef}
        >
          {body}
        </Sheet>
      )}
    </div>
  );
}

function Popover({
  ref,
  at,
  titleId,
  onDismiss,
  children,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  at: { top: number; left: number } | null;
  titleId: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  // `lockScroll: false` — a non-modal popover with no backdrop; an outside press
  // dismisses it (above), the same exemption the account menu and the deck ⋯
  // menu's own panel take.
  useDialogA11y(ref, onDismiss, { lockScroll: false });
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${titleId}-title`}
      tabIndex={-1}
      style={{ width: POPOVER_WIDTH, ...(at ? { position: "fixed", top: at.top, left: at.left } : {}) }}
      className={`absolute top-full right-0 mt-[6px] p-[14px] ${ANCHORED_PANEL_CLASS}`}
    >
      {children}
    </div>
  );
}

/** The list, the consequence sentence and the confirm/cancel row — shared by
 *  the popover and the sheet, so the two shells can never draw different rows. */
function SourcePickerBody({
  titleId,
  card,
  claims,
  selectedId,
  onSelect,
  pending,
  error,
  sourceFigures,
  chosenName,
  chosenPending,
  onCancel,
  onConfirm,
}: {
  titleId: string;
  card: { oracleId: string; name: string };
  claims: DeckClaim[];
  selectedId: string;
  onSelect: (id: string) => void;
  pending: boolean;
  error: string | null;
  sourceFigures?: Map<string, SourceDeckFigure>;
  chosenName: string;
  chosenPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  function onKeyDown(e: React.KeyboardEvent) {
    const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!delta || pending) return;
    e.preventDefault();
    // Skip disabled (locked/commander) rows — the roving order is the
    // choosable rows only (design state 4: "arrows rove and skip disabled rows").
    const choosableIds = claims.filter((c) => !c.commander && !c.locked).map((c) => c.id);
    const at = choosableIds.indexOf(selectedId);
    const next = choosableIds[(at + delta + choosableIds.length) % choosableIds.length];
    if (next) {
      onSelect(next);
      document.getElementById(`${titleId}-${next}`)?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <p id={`${titleId}-title`} className="m-0 font-sans text-[13px] font-semibold text-[color:var(--fg)]">
        {sourceCopy.title(card.name)}
      </p>
      <div role="radiogroup" aria-labelledby={`${titleId}-title`} className="flex flex-col gap-[6px]">
        {claims.map((claim, i) => {
          const disabled = claim.commander || claim.locked;
          const checked = claim.id === selectedId;
          const figure = sourceFigures?.get(`${claim.id}:${card.oracleId}`);
          const leaves = figure ? (figure.inDraft ? figure.built - 1 : figure.built) : null;
          const reason = claim.commander ? sourceCopy.commanderReason : sourceCopy.lockedReason;
          return (
            <button
              key={claim.id}
              id={`${titleId}-${claim.id}`}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={disabled || undefined}
              tabIndex={checked || (i === 0 && !claims.some((c) => c.id === selectedId && !c.commander && !c.locked)) ? 0 : -1}
              disabled={pending}
              onClick={() => !disabled && onSelect(claim.id)}
              onKeyDown={onKeyDown}
              aria-label={
                disabled
                  ? lockedCardsCopy.pull.a11y(claim.name, card.name)
                  : sourceCopy.optionA11y(claim.name, stamp(claim), leaves ?? claim.quantity, claim.pending)
              }
              className={`flex items-center justify-between gap-[10px] rounded-[8px] px-[10px] py-[8px] text-left font-sans text-[12.5px] ${
                disabled
                  ? "cursor-default border border-dashed border-[color:var(--border-strong)] opacity-60"
                  : checked
                    ? "cursor-pointer border border-solid border-[color:var(--accent)] bg-[color:var(--elevated)]"
                    : "cursor-pointer border border-solid border-[color:var(--border-strong)] hover:bg-[color:var(--surface-raised)]"
              }`}
            >
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="truncate font-medium text-[color:var(--fg)]">{claim.name}</span>
                <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">
                  {stamp(claim)}
                  {leaves !== null && ` · ${sourceCopy.leaves(leaves)}`}
                  {!disabled && (claim.pending ? ` · ${sourceCopy.joinsDraft}` : ` · ${sourceCopy.newDraft}`)}
                </span>
              </span>
              {disabled && (
                <span className="flex flex-col items-end gap-[2px] flex-none">
                  <span aria-hidden="true" className={GUARD_TAG} style={{ color: "var(--fg-muted)" }}>
                    {claim.commander ? copy.commanderGuardTag : lockedCardsCopy.pull.tag}
                  </span>
                  <span className="font-mono text-[9.5px] text-[color:var(--fg-faint)]">{reason}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="m-0 font-sans text-[11.5px] leading-[1.4] text-[color:var(--fg-body)]">
        {chosenPending
          ? sourceCopy.consequenceJoins(chosenName, card.name)
          : sourceCopy.consequenceNew(chosenName, card.name)}
      </p>
      <div className="flex gap-[8px]">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="h-[36px] flex-1 cursor-pointer rounded-[7px] border border-solid border-[color:var(--border-strong)] bg-transparent font-sans text-[12.5px] text-[color:var(--fg-body)] disabled:cursor-default disabled:opacity-50"
        >
          {sourceCopy.cancel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className={`h-[36px] flex-1 rounded-[7px] font-sans text-[12.5px] font-semibold text-[color:var(--accent)] [border:1px_solid_var(--border-strong)] disabled:cursor-default disabled:opacity-50`}
        >
          {pending ? copy.pulling : sourceCopy.confirm(chosenName)}
        </button>
      </div>
      {error && <MutationError message={error} />}
    </div>
  );
}
