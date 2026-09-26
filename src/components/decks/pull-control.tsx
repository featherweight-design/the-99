"use client";

// §Surfaces 2 §Decisions 4 — the review page's one nested action, and the two
// rows where it is not offered.
//
// A pull takes a card out of somebody else's sleeved deck, so the control is
// never brass-solid: the full buy tag sits beside it, and the point is that the
// two options are weighed against each other rather than one being recommended.
//
// The click is not guarded against the review row's plate-wide handler, because
// that handler does the filtering itself: it ignores any click landing inside a
// button or a link (`update-diff-row.tsx`). One mechanism in one place beats a
// `stopPropagation` in every control the plate happens to contain.

import { useEffect, useRef, useState, useTransition } from "react";
import { pullCardFromDeck, type PullResult } from "../../app/decks/actions";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckClaim } from "../../lib/decks/availability";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { cardDetailCopy } from "../cards/card-detail-provider";
import { draftAnnouncer } from "./draft-announcer";
import { MutationError } from "./mutation-error";

const copy = deckVersioningCopy.review;

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

export type PullControlProps = {
  /** The deck being reviewed — the one that gains the copy. */
  deckId: string;
  card: { oracleId: string; name: string };
  /** The claim the pull would release. Its `id` is the source deck, which is
   *  why the caller passes a claim and not `DraftState.pullFrom`: that map
   *  carries a deck NAME and the write needs an id. */
  claim: DeckClaim;
  /** The row's parent, so it can react to the copy having moved. The figures in
   *  the announcement are the server's; this is not where they arrive. */
  onPulled: () => void;
};

export function PullControl({ deckId, card, claim, onPulled }: PullControlProps) {
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
