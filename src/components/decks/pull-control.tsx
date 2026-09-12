"use client";

// §Surfaces 2 §Decisions 4 — the review page's one nested action, and the two
// rows where it is not offered.
//
// A pull takes a card out of somebody else's sleeved deck, so the control is
// never brass-solid: the full buy tag sits beside it, and the point is that the
// two options are weighed against each other rather than one being recommended.

import { useState, useTransition } from "react";
import { pullCardFromDeck } from "../../app/decks/actions";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckClaim } from "../../lib/decks/availability";

const copy = deckVersioningCopy.review;

/** 44px on phone, 34px above it. Never solid — see the header. */
const PULL_BUTTON =
  "inline-flex items-center justify-center min-h-[44px] md:min-h-[34px] px-[12px] " +
  "rounded-[7px] font-mono text-[12px] font-semibold text-[color:var(--accent)] " +
  "bg-transparent border border-border cursor-pointer disabled:opacity-50 disabled:cursor-default";

/** The guard's word, in the buy tag's shape: mono, uppercase, on a flat plate.
 *  Four letters beside a deck name the row already prints, rather than R1's
 *  two-line sentence — which made a guarded row a different width from a
 *  pullable one. The sentence lives in the action's accessible name. */
const GUARD_TAG =
  "font-mono rounded-[4px] px-[5px] py-[1px] text-[9.5px] uppercase tracking-[0.04em] flex-none";

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
          className={`${PULL_BUTTON} no-underline`}
          aria-label={copy.pullGuardA11y(claim.name, card.name)}
        >
          {copy.pullGuardAction}
        </a>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-[6px] flex-none">
      <button
        type="button"
        className={PULL_BUTTON}
        disabled={pending}
        onClick={(event) => {
          // The row itself opens the card. This is the row's one nested action.
          event.stopPropagation();
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
      {error && (
        <span role="alert" className="font-mono text-[11px] text-[color:var(--warning)]">
          {error}
        </span>
      )}
    </span>
  );
}
