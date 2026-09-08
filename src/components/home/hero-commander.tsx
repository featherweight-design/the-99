// One of the two Ready-to-build hero cards on signed-in Home.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md §ReadyCard.
// Every figure here is one the ranking already computed; nothing is derived at
// this call site and no string is written here (plan ruling 5).

import { GhostButton, PrimaryButton } from "@/components/ui/button";
import { ArtWash } from "@/components/ui/art-wash";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { refreshCopy } from "../../lib/copy/refresh";
import type { CommanderListItem } from "../../lib/recs/recommend";

/** §ReadyCard — "See the pool" chevron icon. Phone only; the label is the desktop form. */
function ChevronIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className="sm:hidden"
    >
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

export function HeroCommander({ item, inUse }: { item: CommanderListItem; inUse: number }) {
  const c = refreshCopy.home;
  // §ReadyCard — fit badge draws the numeral and the denominator clause in two
  // colours, so the one string has to come apart. It is split, never rebuilt:
  // a call site that assembled `${score} /${outOf} fit` from parts would be a
  // second copy of the wording, which ruling 5 forbids. The split lives here
  // and nowhere else, and falls back to one span if the shape ever changes.
  const badge = c.fit(item.score, item.measurableTotal);
  const gap = badge.indexOf(" ");
  const score = gap === -1 ? badge : badge.slice(0, gap);
  const denominator = gap === -1 ? null : badge.slice(gap + 1);

  return (
    // The band is the deck card's, exactly — same aspect, same floor. A second
    // number here would be a second answer to a question already settled.
    <div className="relative aspect-[2.2/1] min-h-[104px] overflow-hidden rounded-[14px] border border-[color:var(--border)]">
      <ArtWash strategy="cover" artCropUri={item.artCropUri} colorIdentity={item.colorIdentity} />

      {/* §ReadyCard — fit badge */}
      <div className="absolute top-[10px] left-[11px] flex h-[22px] items-center rounded-[6px] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] px-[8px] font-mono text-[10.5px] sm:top-[11px] sm:left-[12px]">
        <span className="text-[color:var(--fg)]">{score}</span>
        {denominator !== null && (
          <span className="text-[color:var(--fg-faint)]">&nbsp;{denominator}</span>
        )}
      </div>

      {/* §ReadyCard — body block */}
      <div className="absolute inset-x-0 bottom-0 p-[13px] sm:p-[14px]">
        <p className="m-0 truncate font-display text-[17px] font-semibold text-[color:var(--fg)] sm:text-[18px]">
          {item.name}
        </p>

        {/* §ReadyCard — meta row. The in-use clause is a sibling span at both
            widths rather than nesting inside the fit line on phone as the frame
            draws: the nesting exists only to carry the phone's ` · ` shorthand,
            which has no copy key and is not adopted. */}
        <div className="mt-[6px] flex items-center gap-[7px] sm:mt-[7px] sm:gap-[8px]">
          <span className="flex gap-[3px]" aria-hidden>
            {item.colorIdentity.map((color) => (
              <span
                key={color}
                // No hairline, unlike the deck tile's pips: these sit on art,
                // not on a light ground (table §colour pip note).
                className="h-[8px] w-[8px] rounded-[2px] sm:h-[9px] sm:w-[9px]"
                style={{ background: WUBRG_COLOR[color] ?? "var(--fg-faint)" }}
              />
            ))}
          </span>
          <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-body)] sm:text-[11px]">
            {c.fitLine(item.colorPoolSize)}
          </span>
          {/* Free says nothing — the clause is absent at zero, not a printed 0. */}
          {inUse > 0 && (
            <span className="font-mono text-[10.5px] whitespace-nowrap text-[color:var(--accent)] sm:text-[11px]">
              {c.inUse(inUse)}
            </span>
          )}
        </div>

        {/* §ReadyCard — actions row */}
        <div className="mt-[11px] flex gap-[8px] sm:mt-[12px]">
          {/* Ruling 14: the region's one filled button, and bone, never accent. */}
          <PrimaryButton
            href={`/decks/new?commander=${encodeURIComponent(item.oracleId)}`}
            className="flex h-[44px] flex-auto items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
          >
            {c.startDeck}
          </PrimaryButton>
          {/* One link with responsive classes, not a phone copy and a desktop
              copy behind `hidden`: two subtrees read twice to a screen reader.
              The label is carried by `aria-label` so the phone's icon-only form
              keeps the desktop name rather than none. */}
          <GhostButton
            href={`/commanders/${item.slug}`}
            aria-label={c.seePool}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--bg)_50%,transparent)] font-normal sm:h-[32px] sm:w-auto sm:justify-start sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]"
          >
            <ChevronIcon />
            <span className="hidden sm:inline">{c.seePool}</span>
          </GhostButton>
        </div>
      </div>
    </div>
  );
}
