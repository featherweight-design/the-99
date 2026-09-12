"use client";

// §Surfaces 2 §Decisions 4 — the review page's one nested action, and the two
// rows where it is not offered.
//
// A pull takes a card out of somebody else's sleeved deck, so the control is
// never brass-solid: the full buy tag sits beside it, and the point is that the
// two options are weighed against each other rather than one being recommended.
//
// The click is not guarded against an ancestor's. The way into the card is the
// row's name, which is a button of its own on every deck surface in the app, so
// there is no plate-wide handler for this one to stop — and a guard against a
// listener nobody registered reads as a claim that somebody did.

import { useState, useTransition } from "react";
import { pullCardFromDeck } from "../../app/decks/actions";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckClaim } from "../../lib/decks/availability";
import { MutationError } from "./mutation-error";

const copy = deckVersioningCopy.review;

/** The box both actions stand in: 44px on phone, 34px above it. One geometry,
 *  because a guarded row and a pullable one have to be the same width and the
 *  same height — that is the whole reason the guard is a tag and a link rather
 *  than R1's sentence. */
const ACTION_BOX =
  "inline-flex items-center justify-center min-h-[44px] md:min-h-[34px] px-[16px] md:px-[11px] " +
  "rounded-[7px] font-sans font-semibold text-[12.5px] md:text-[12px] bg-transparent " +
  "[border:1px_solid_var(--border-strong)] cursor-pointer disabled:opacity-50 disabled:cursor-default";

/** Never solid — see the header. The accent is the pull's alone: it is the one
 *  thing on this page that writes. */
const PULL_BUTTON = `${ACTION_BOX} text-[color:var(--accent)]`;

/** The same box in the reading ink, because leaving a deck to release a card is
 *  navigation and not the decision the accent stands for. */
const GUARD_ACTION = `${ACTION_BOX} text-[color:var(--fg)] no-underline`;

/** The guard's word, in the buy tag's shape: mono, uppercase, on a flat plate.
 *  Four letters beside a deck name the row already prints, rather than R1's
 *  two-line sentence — which made a guarded row a different width from a
 *  pullable one. The sentence lives in the action's accessible name. */
const GUARD_TAG =
  "font-mono rounded-[4px] px-[5px] py-[1px] text-[9.5px] uppercase tracking-[0.1em] flex-none";

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
  // Held in state rather than derived, so a re-render does not re-announce a
  // pull that has already been spoken.
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Commander first, and that order is the whole ruling: a deck with pending
  // changes can be opened and released, a commander cannot. An `Open →` here
  // would lead somewhere that cannot help, so this arm draws no control at all.
  // The server refuses a commander pull as well; this is the rendering half.
  if (claim.commander) {
    return (
      <span className="inline-flex items-center flex-none">
        {/* The tag and the sentence, not one labelled the other: an `aria-label`
            on a plain span has no role to attach to and is dropped. */}
        <span
          className={GUARD_TAG}
          aria-hidden="true"
          style={{
            color: "var(--fg-muted)",
            background: "color-mix(in oklab, var(--fg-muted) 10%, transparent)",
          }}
        >
          {copy.commanderGuardTag}
        </span>
        <span className="sr-only">{copy.commanderGuardA11y(claim.name, card.name)}</span>
      </span>
    );
  }

  // The source deck has a draft of its own. Committing it here would sweep
  // somebody's half-finished tinkering into a version they never asked for, so
  // the way forward is that deck — a live link, not a disabled `Pull it`.
  if (claim.pending) {
    return (
      <span className="inline-flex items-center gap-[6px] flex-none">
        <span
          className={GUARD_TAG}
          aria-hidden="true"
          style={{
            color: "var(--warning)",
            background: "color-mix(in oklab, var(--warning) 13%, transparent)",
          }}
        >
          {copy.pullGuardTag}
        </span>
        <a
          href={`/decks/${claim.id}`}
          className={GUARD_ACTION}
          aria-label={copy.pullGuardA11y(claim.name, card.name)}
        >
          {copy.pullGuardAction}
        </a>
      </span>
    );
  }

  // A column, because the refusal is written underneath the control rather than
  // beside it: the row's name is a hand's width to the left and a message in line
  // with the button would push it out of the plate.
  return (
    <div className="inline-flex flex-col items-end flex-none">
      <span className="inline-flex items-center gap-[6px]">
        <button
          type="button"
          className={PULL_BUTTON}
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await pullCardFromDeck(claim.id, card.oracleId, deckId);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setAnnouncement(
                deckVersioningCopy.commit.pullAnnounced(
                  card.name,
                  claim.name,
                  result.buy,
                  result.total,
                ),
              );
              onPulled();
            });
          }}
        >
          {pending ? copy.pulling : copy.pull}
        </button>
        {/* Announced once. The arithmetic the pull changed — the buy count and the
            total — is the server's, read after the write, so it is spoken rather
            than only appearing when the revalidated page paints. */}
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement ?? ""}
        </span>
      </span>
      {/* The shipped refusal, not a second one written here: a pull is refused by
          the same class of race every other deck mutation is, and the row stays
          pullable so the reader can take the refusal's advice and try again. */}
      {error && <MutationError message={error} />}
    </div>
  );
}
