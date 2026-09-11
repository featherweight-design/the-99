"use client";

// Surface 1 — pending changes on the deck page. Not dismissible: a draft is a
// state the deck is in, which is why this is a sibling of UpdateStrip rather
// than a mode of it.

import Link from "next/link";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy, INLINE_CHANGE_MAX } from "../../lib/copy/deck-versioning";
import type { DraftChange } from "../../lib/decks/draft-diff";
import { changeCount, hasChanges, type DraftState } from "../../lib/decks/draft-shape";
import { formatDeckDate } from "../../lib/decks/format";

const copy = deckVersioningCopy.pending;

interface PendingBannerProps {
  state: DraftState;
  deckId: string;
  /** The draft's card count — `detail.total`, already on the page. */
  total: number;
  /** `deckBodySize(detail.partner !== null)`, computed by the page. */
  bodySize: number;
  onDiscard?: () => void;
}

// §Surfaces 5: "one commit surface, two entry points" — the sheet lives at the
// foot of the review page and the banner's CTA *navigates* to it with the sheet
// already open. So there is no `onCommit`: a second mount would be a second
// place the buy list is printed, which is the thing that ruling forbids.
const commitHref = (deckId: string) => `/decks/${deckId}/changes?commit=1`;

/**
 * What the inline list calls one change.
 *
 * A card the deck did not hold, or has cut entirely, is its name. A card whose
 * count *moved* is `Name 1 → 2` — the shipped `recountedItem`, because "+ Sol
 * Ring" on a deck that already ran one is a sentence that reads as a duplicate
 * rather than a second copy. Nothing new is authored for a fact the import diff
 * already has a string for.
 */
function changeLabel(state: DraftState, change: DraftChange): string {
  const name = state.names.get(change.oracleId) ?? change.oracleId;
  const moved = change.from > 0 && change.to > 0;
  return moved
    ? deckImportCopy.update.diff.recountedItem(name, String(change.from), String(change.to))
    : name;
}

/**
 * The one money sentence, or nothing.
 *
 * Three states, and only two of them speak. `moneyNone` is a claim that every
 * card coming in has a free copy, so it takes a read that actually happened and
 * a genuine zero. When rows are unfree but nothing could be priced, there is a
 * purchase and no figure for it — the honest banner says neither, and the review
 * page one click away names the rows.
 */
function moneyLine(state: DraftState): string | null {
  if (!state.claimsKnown) return null;
  if (state.unfreeCount === 0) return copy.moneyNone;
  if (state.total === null) return null;
  return copy.money(state.unfreeCount, state.addChanges.length, state.buyCount, state.total);
}

export function PendingBanner({ state, deckId, total, bodySize, onDiscard }: PendingBannerProps) {
  const n = changeCount(state);
  const next = (state.version?.number ?? 0) + 1;

  // A brew: nothing to say until the list is a deck, and then only the offer.
  if (state.version === null) {
    if (total < bodySize) return null;
    return (
      <div className={STRIP}>
        <p className="flex-1 m-0 text-[13.5px] text-[color:var(--fg-body)]">
          {copy.firstCommitNote}
        </p>
        {/* Outline, not solid: making a deck's claims hard is a real
            consequence and not the app's goal for the player. */}
        <Link href={commitHref(deckId)} className={OUTLINE_CTA}>
          {copy.firstCommitCta}
        </Link>
      </div>
    );
  }

  // Committed and clean: one line, and it is the whole permanent footprint.
  // `hasChanges` and not `n === 0`, because a draft that moved only basics has
  // no nameable change and is still a draft — taking the clean branch on it
  // would leave a real edit with no route to a commit.
  if (!hasChanges(state)) {
    return (
      <div className={STRIP}>
        <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          {copy.versionLine(state.version.number, formatDeckDate(state.version.committedAt))}
        </span>
      </div>
    );
  }

  const inline = n <= INLINE_CHANGE_MAX;

  return (
    <div className={STRIP}>
      <span className="font-mono uppercase text-[9px] md:text-[10px] tracking-[0.12em] text-[color:var(--accent)]">
        {copy.label}
      </span>

      <div className="flex-1 min-w-0">
        {inline ? (
          <ul className="m-0 p-0 list-none flex flex-wrap gap-x-[14px] gap-y-[2px]">
            {state.addChanges.map((c) => (
              <li key={c.oracleId} className="text-[13px] text-[color:var(--fg-body)]">
                + {changeLabel(state, c)}
              </li>
            ))}
            {state.removes.map((c) => (
              <li key={c.oracleId} className="text-[13px] text-[color:var(--fg-faint)]">
                − {changeLabel(state, c)}{" "}
                <span className="font-mono text-[10.5px]">{copy.removeHint}</span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="m-0 font-mono text-[12px] text-[color:var(--fg-body)]">
              {copy.counts(state.addChanges.length, state.removes.length)}
              {" · "}
              {copy.since(n, state.version.number)}
            </p>
            {/* Exactly one money sentence, and only when there is a figure to
                state. The free-copy sentence is a claim about the claim model,
                so it needs `claimsKnown` and a real zero — an unpriceable
                purchase and an unread one both draw no line at all rather than
                telling the player the commit asks for nothing. The pull clause
                is a second line only because it is a different offer, not a
                second total. */}
            {moneyLine(state) && (
              <p className="m-0 text-[13px] text-[color:var(--fg-faint)]">
                {moneyLine(state)}
                {state.pullableCount > 0 && ` ${copy.moneyPulls(state.pullableCount)}`}
              </p>
            )}
          </>
        )}
      </div>

      {/* The body count is stated, never enforced: an over-size draft is a
          thing the player is mid-way through fixing, and refusing the commit
          would strand them in it. --warning, and no disabled control. */}
      <span
        className="font-mono text-[11px] tabular-nums flex-none"
        style={{ color: total > bodySize ? "var(--warning)" : "var(--fg-faint)" }}
      >
        {total} / {bodySize}
      </span>

      {inline ? (
        <Link href={`/decks/${deckId}/changes`} className={REVIEW_LINK}>
          {copy.reviewLink}
        </Link>
      ) : (
        <Link href={`/decks/${deckId}/changes`} className={SOLID_CTA}>
          {copy.reviewCta(n)}
        </Link>
      )}
      {inline && (
        <Link href={commitHref(deckId)} className={SOLID_CTA}>
          {copy.commitCta(next)}
        </Link>
      )}
      {onDiscard && (
        <button type="button" onClick={onDiscard} className={GHOST_CTA}>
          {copy.discardCta}
        </button>
      )}
    </div>
  );
}

const STRIP =
  "flex flex-wrap md:flex-nowrap items-center gap-[10px] md:gap-[12px] " +
  "px-[16px] py-[10px] md:px-[30px] md:py-[12px] bg-[color:var(--surface-rail)] " +
  "[border-bottom:1px_solid_var(--border)]";
// Brass fill on the act, outline on the first-commit offer: v1 changes nothing
// about the deck, so it does not get the weight of a decision.
const SOLID_CTA =
  "flex-none inline-flex items-center min-h-[44px] md:min-h-[30px] px-[14px] rounded-[7px] " +
  "font-mono text-[12px] text-[color:var(--bg)] bg-[color:var(--accent)] border-0 cursor-pointer no-underline";
const OUTLINE_CTA =
  "flex-none inline-flex items-center min-h-[44px] md:min-h-[30px] px-[14px] rounded-[7px] " +
  "font-mono text-[12px] text-[color:var(--accent)] bg-transparent border border-[color:var(--accent)] cursor-pointer no-underline";
const GHOST_CTA =
  "flex-none inline-flex items-center min-h-[44px] md:min-h-[30px] px-[12px] rounded-[7px] " +
  "font-mono text-[12px] text-[color:var(--fg-body)] bg-transparent border border-border-strong cursor-pointer";
const REVIEW_LINK = "flex-none font-mono text-[11.5px] text-[color:var(--accent)] underline";
