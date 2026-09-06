// The two empty states discovery has and the owned scope does not (§6.8, §7.6).
// The third — filtered to zero — is the shipped `FilteredEmpty` with one extra
// clause, so it stays in its own file rather than being restated here.
//
// These two are opposites and the difference matters more than the shared
// styling: `NoDecksBanner` sits above a FULL list, because "no decks built" is a
// disabled sort with a stated reason, not an absence of commanders. `FloorEmpty`
// replaces the list, because the floor really did take everything.

import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { GhostButton } from "../ui/button";

const { empty: copy } = discoveryCopy;

/**
 * State 1 — no decks built. Rendered above the list under either sort, since the
 * list beneath is the full fit ranking either way.
 *
 * The accent rule is on the left border rather than a leading icon: the banner
 * explains a control the player can see is off, so it marks itself as an aside
 * to the list rather than competing with the rows for the first read.
 */
export function NoDecksBanner({ cardsRead }: { cardsRead: number }) {
  const body = copy.noDecksBody(cardsRead);
  return (
    <div
      className="block rounded-[10px] p-[16px_18px] bg-[color:var(--surface)] [border:1px_solid_var(--border)] [border-left:3px_solid_var(--accent)]"
    >
      <h2 className="font-display m-0 mb-[6px] text-[16px] font-semibold text-[color:var(--fg)]">
        {copy.noDecksHeading}
      </h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-body)]">
        <Emphasised text={body} clause={copy.noDecksEmphasis} />
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
  const body = copy.floorBody(floorPct, candidateCount, cardsRead, bestPct);
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
        {copy.floorHeading}
      </h2>

      <p className="mx-auto mt-0 mb-[16px] max-w-[430px] text-[13.5px] leading-[1.65] text-[color:var(--fg-body)]">
        <Emphasised text={body} clause={copy.floorEmphasis(floorPct)} />
      </p>

      {/* `flex-wrap`, which the desktop drawing does not need: the CTA and its
          note are one line at 1280px and two at 390px, where no phone frame was
          drawn. Wrapping is the only reading that does not overflow. */}
      <span className="inline-flex flex-wrap items-center justify-center gap-[10px]">
        <GhostButton
          onClick={onRankByFit}
          className="inline-flex items-center h-[40px] px-[18px] text-[13.5px] [border:1px_solid_var(--accent)] text-[color:var(--accent)]"
        >
          {copy.floorCta}
        </GhostButton>
        <span className="font-mono text-[11.5px] text-[color:var(--fg-faint)]">
          {copy.floorCtaNote(candidateCount)}
        </span>
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
