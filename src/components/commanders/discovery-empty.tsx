// The two empty states discovery has and the owned scope does not (§6.8, §7.6).
// The third — filtered to zero — is the shipped `FilteredEmpty` with one extra
// clause, so it stays in its own file rather than being restated here.
//
// These two are opposites and the difference matters more than the shared
// styling: `NoDecksBanner` sits above a FULL list, because "no decks built" is a
// disabled sort with a stated reason, not an absence of commanders. `FloorEmpty`
// replaces the list, because the floor really did take everything.

"use client";

import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { discoverCopy } from "../../lib/copy/lanes";
import { GhostButton, PrimaryButton } from "../ui/button";
import { PendingMark } from "../ui/pending-mark";
import { ZERO_PRIMARY, ZERO_SECONDARY, ZeroState } from "../ui/zero-state";
import { laneHref } from "./list-nav";
import { usePlace } from "./place-paths";

const { empty: copy } = discoveryCopy;

/**
 * The discover lane at zero (D5). The owned lane's zero state names a control to
 * drop; this one has a boundary to name instead — the commander the reader is
 * looking for may exist and simply be on the other lane, which is the one thing
 * a spelling hint could never tell them.
 *
 * So the second affordance is a link rather than a button: it carries the same
 * query to `/commanders`, and a reader who middle-clicks it gets the lane they
 * asked for in a tab, which is what a search handoff should do.
 */
export function DiscoveryEmpty({
  query,
  total,
  onClearSearch,
}: {
  query: string;
  total: number;
  onClearSearch: () => void;
}) {
  const place = usePlace();
  return (
    <ZeroState
      heading={discoverCopy.empty.heading}
      body={discoverCopy.empty.body(query, total)}
      primary={
        <PrimaryButton onClick={onClearSearch} className={ZERO_PRIMARY}>
          {discoverCopy.empty.clearSearch}
        </PrimaryButton>
      }
      secondary={
        <GhostButton href={laneHref("owned", query, place)} className={ZERO_SECONDARY}>
          {discoverCopy.empty.otherLane}
        </GhostButton>
      }
    />
  );
}

/**
 * The list is empty and the surface does not yet know why: the typing has
 * settled but the index lookup that decides between "no commander by that name"
 * and "it is on your other lane" is still out.
 *
 * Before this, that gap rendered an empty `<ul>` — a second of blank page
 * between the last keystroke and the sentence explaining it. The house loading
 * mark holds the space the sentence will take, and says nothing: every claim
 * this surface could make here is the one still being checked.
 */
export function SearchPending() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-[22px] pt-[40px] pb-[40px] text-[color:var(--fg-faint)] sm:pt-[34px] sm:pb-[38px]"
      // Not a live region: the answer one render later is what is worth
      // announcing, and the states below it already do.
      aria-hidden
    >
      <PendingMark />
    </div>
  );
}

/**
 * State 1 — no decks built. Rendered above the list under either sort, since the
 * list beneath is the full fit ranking either way.
 *
 * The accent rule is on the left border rather than a leading icon: the banner
 * explains a control the player can see is off, so it marks itself as an aside
 * to the list rather than competing with the rows for the first read.
 */
export function NoDecksBanner() {
  return (
    <div
      className="block rounded-[10px] p-[16px_18px] bg-[color:var(--surface)] [border:1px_solid_var(--border)] [border-left:3px_solid_var(--accent)]"
    >
      <h2 className="font-display m-0 mb-[6px] text-[16px] font-semibold text-[color:var(--fg)]">
        {copy.noDecksHeading}
      </h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">
        <Emphasised text={copy.noDecksBody} clause={copy.noDecksEmphasis} />
      </p>
    </div>
  );
}

/**
 * State 2 — the novelty floor excluded every candidate. Built from
 * `EndOfRanking`'s furniture rather than a new rule of its own, but with one
 * diamond and no label: this is not the end of a ranking, and there is no total
 * to name between two of them.
 *
 * The single action offers the OTHER SORT. A "show them anyway" control is
 * forbidden — the floor is what makes `new` mean buildable, so loosening it on
 * request would leave the sort saying nothing.
 */
export function FloorEmpty({
  floorPct,
  candidateCount,
  cardsRead,
  bestPct,
  onRankByFit,
}: {
  floorPct: number;
  candidateCount: number;
  cardsRead: number;
  bestPct: number;
  onRankByFit: () => void;
}) {
  return (
    <FloorState
      heading={copy.floorHeading}
      body={copy.floorBody(floorPct, candidateCount, cardsRead, bestPct)}
      emphasis={copy.floorEmphasis(floorPct)}
      cta={copy.floorCta}
      note={copy.floorCtaNote(candidateCount)}
      onAct={onRankByFit}
    />
  );
}

function FloorState({
  heading,
  body,
  emphasis,
  cta,
  note,
  bodyWidth = 430,
  onAct,
}: {
  heading: string;
  body: string;
  emphasis: string;
  cta: string;
  note: string | null;
  bodyWidth?: number;
  onAct: () => void;
}) {
  return (
    <div className="block text-center p-[24px_16px] sm:p-[34px_24px]">
      <div className="flex items-center justify-center gap-[12px] mb-[16px]">
        <Hairline />
        <span
          aria-hidden
          className="w-[6px] h-[6px] rotate-45 shrink-0 bg-[color:var(--border-strong)]"
        />
        <Hairline />
      </div>

      <h2 className="font-display m-0 mb-[10px] text-[18px] font-semibold text-[color:var(--fg)]">
        {heading}
      </h2>

      <p
        className="mx-auto mt-0 mb-[16px] text-[13.5px] leading-[1.65] text-[color:var(--fg-body)]"
        style={{ maxWidth: bodyWidth }}
      >
        <Emphasised text={body} clause={emphasis} />
      </p>

      {/* `flex-wrap`, which the desktop drawing does not need: the CTA and its
          note are one line at 1280px and two at 390px, where no phone frame was
          drawn. Wrapping is the only reading that does not overflow. */}
      <span className="inline-flex flex-wrap items-center justify-center gap-[10px]">
        <GhostButton
          onClick={onAct}
          className="inline-flex items-center h-[40px] px-[18px] text-[13.5px]"
        >
          {cta}
        </GhostButton>
        {note ? (
          <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)]">{note}</span>
        ) : null}
      </span>
    </div>
  );
}

function Hairline() {
  return <span aria-hidden className="flex-1 h-px bg-[color:var(--border)]" />;
}

/**
 * Marks one clause of an already-built sentence. The clause is searched for
 * rather than the sentence assembled from parts, so the copy file keeps owning
 * the whole string — a sentence spliced together here would be a second place
 * the wording lives.
 *
 * A clause that is not found leaves the sentence plain rather than throwing:
 * the emphasis is presentational, and losing it is not worth losing the state.
 */
function Emphasised({ text, clause }: { text: string; clause: string }) {
  const at = text.indexOf(clause);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-semibold text-[color:var(--fg)]">{clause}</strong>
      {text.slice(at + clause.length)}
    </>
  );
}
