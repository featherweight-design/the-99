// One of the two Ready-to-build hero cards on signed-in Home.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md §ReadyCard.
// Every figure here is one the ranking already computed; nothing is derived at
// this call site and no string is written here (plan ruling 5).

import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";
import { PrimaryButton } from "@/components/ui/button";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import { ArtWash, INK_SHADOW } from "@/components/ui/art-wash";
import { WUBRG_COLOR } from "../../lib/collection/browse";
import { refreshCopy } from "../../lib/copy/refresh";
import type { CommanderListItem } from "../../lib/recs/recommend";


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
    // §4 — the wash owns one band and nothing else. The card frame moved up from
    // the band to this root, so the footer below the divider sits inside the
    // same rounded corner.
    <div
      className="relative min-w-0 overflow-hidden rounded-[14px] border border-[color:var(--border)]"
      style={{ background: "var(--surface-inset)" }}
    >
      {/* The page header band, 288px, stated. The 2.2:1 ratio with a 104px floor
          made this band a function of the column Home happened to give it, and
          it is the same number the deck tile used to take — which was the right
          instinct and the wrong shape: a hero and a grid cell are different jobs
          and now take different bands. */}
      <div className="hero-band relative overflow-hidden" style={{ height: 288 }}>
        <ArtWash
          strategy="cover"
          height={288}
          // The block's MEASURED box — its own height, which is what the ramp
          // has to clear, so BOTH insets count. Keyed to the taller (desktop)
          // arm as every shared wash in this round is: 12 of padding above, a
          // 21px name line at 1.15, a 4px gap, a 22px row 2 (the fit chip is the
          // tallest thing in it) and 12 of padding below gives 71.
          //
          // The single-row block this replaced measured 46 for the same reason —
          // padding on both sides of one 22px row — and a name truncated to
          // `Preston Garvey, Minutema…` is what split it in two.
          labelAtPx={71}
          artCropUri={item.artCropUri}
          colorIdentity={item.colorIdentity}
        />

        {/* §ReadyCard — the block, at the foot and in TWO rows: name and pips,
            then the type line with the fit chip at its right. Three of these
            were pinned separately — the name at the top, the pips bottom-left,
            the chip bottom-right — and condensing them is decision 7's answer for
            this surface: nothing is cut, the band just stops carrying three
            separate anchors.

            Two rows rather than the one it first condensed to, because one row
            truncated the name to `Preston Garvey, Minutema…` at 390px and a
            half-truncated name reads as a different commander. */}
        <div
          data-wash-label
          // No right reservation here, and the distinction is worth writing down:
          // the `hero` placement of the card-details control belongs to the
          // commander DETAIL page's phone band, not to this card — Home's
          // ready-to-build hero renders no trigger at all. Reserving 46px for it
          // narrowed both rows and brought back the truncation this split fixed.
          className="absolute inset-x-0 bottom-0 flex flex-col gap-[4px] p-[11px] sm:p-[12px]"
        >
          {/* Row 1 — the name and its pips. Two rows, not one: at 390px a
              condensed single row truncated the name to `Preston Garvey,
              Minutema…`, and a half-truncated name reads as a different
              commander. `min-w-0` on the row so the name is what shrinks. */}
          <div className="flex min-w-0 items-center gap-[8px]">
            <p
              className="m-0 min-w-0 truncate font-display text-[17px] font-semibold text-[color:var(--fg)] sm:text-[18px]"
              style={{ lineHeight: 1.15, textShadow: INK_SHADOW }}
            >
              {commanderDisplayName(item)}
            </p>
            <span className="flex flex-none gap-[3px]" aria-hidden>
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
          </div>

          {/* Row 2 — the type line, with the fit chip at its right. Drawn at
              BOTH widths: hiding the type line on a phone would be a cut dressed
              as a condense. The type line is the child that gives, because a
              half-truncated type line still reads as a type line. */}
          <div className="flex min-w-0 items-center gap-[8px]">
            <p
              className="m-0 min-w-0 truncate font-mono text-[10.5px] text-[color:var(--fg-body)]"
              style={{ lineHeight: 1.25, textShadow: INK_SHADOW, flexShrink: 1000 }}
            >
              {item.typeLine}
            </p>
            {/* §ReadyCard — fit badge. Decision 3: a chip over art takes an opaque
              plate and a hairline, exactly as the status pill does — and it is
              already THE PLATE's own treatment, which is why it needs no change
              beyond joining the row. */}
            <div
              className="hero-fit-chip ml-auto flex h-[22px] flex-none items-center rounded-[7px] px-[8px] font-mono text-[10.5px]"
              style={{ background: "var(--bg)", border: "1px solid var(--border-strong)" }}
            >
              <span className="text-[color:var(--fg)]">{score}</span>
              {denominator !== null && (
                <span className="tracking-[0.1em] text-[color:var(--fg-faint)]">
                  &nbsp;{denominator}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* The art opens the commander's page (H4), the same destination as See the
            pool below. One extra press target over the whole band, drawn last so it
            sits above the block. Hidden from the accessibility tree and out of the tab
            order: See the pool is the named link to the same place, and a second one
            would be read twice. */}
        <Link
          href={`/commanders/${item.slug}`}
          aria-hidden
          tabIndex={-1}
          data-testid="hero-art-link"
          className="absolute inset-0 z-[1]"
        >
          <PendingReporter href={`/commanders/${item.slug}`} />
        </Link>
      </div>

      {/* §4 — below the divider, on flat ground: the pool clause and the actions. */}
      <div
        className="hero-footer p-[13px] sm:p-[14px]"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* §ReadyCard — meta row. The in-use clause is a sibling span at both
            widths rather than nesting inside the fit line on phone as the frame
            draws: the nesting exists only to carry the phone's ` · ` shorthand,
            which has no copy key and is not adopted. */}
        <div className="flex items-center gap-[7px] sm:gap-[8px]">
          <span className="truncate font-mono text-[10.5px] text-[color:var(--fg-faint)] sm:text-[11px]">
            {c.fitLine(item.colorPoolSize)}
          </span>
          {/* Free says nothing — the clause is absent at zero, not a printed 0. */}
          {inUse > 0 && (
            <span className="font-mono text-[10.5px] whitespace-nowrap text-[color:var(--accent)] sm:text-[11px]">
              {c.inUse(inUse)}
            </span>
          )}
        </div>

        {/* §ReadyCard — actions row. `Start this deck` is cut: nobody builds a
            deck automatically without seeing the pool first, so the second
            action was the one being offered in the wrong order. `See the pool`
            takes the filled treatment as the only action left — ruling 14's one
            filled button per region, and bone rather than accent.

            One link with responsive classes, never a phone copy and a desktop
            copy behind `hidden`: two subtrees read the label twice to a screen
            reader. It keeps its words at both widths now that it is the primary,
            so the icon-only phone form and its `aria-label` crutch both go. */}
        <div className="mt-[11px] flex gap-[8px] sm:mt-[12px]">
          <PrimaryButton
            href={`/commanders/${item.slug}`}
            // Full width at both widths: it is the card's only action, and a
            // button sized to its words left the footer reading as a row that had
            // lost its second control — which is what happened when
            // `Start this deck` was cut.
            className="flex h-[44px] w-full items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:rounded-[8px] sm:text-[12.5px]"
          >
            {c.seePool}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
