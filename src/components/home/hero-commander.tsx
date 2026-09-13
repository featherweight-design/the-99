// One of the two Ready-to-build hero cards on signed-in Home.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md §ReadyCard.
// Every figure here is one the ranking already computed; nothing is derived at
// this call site and no string is written here (plan ruling 5).

import { PrimaryButton } from "@/components/ui/button";
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
          // The block's MEASURED box, which is the padded row itself: 12px of
          // padding above and below a 22px chip — the tallest thing in the row —
          // is 46 at `sm`, and 44 on a phone at 11px. Keyed to the taller, as
          // every shared wash in this round is.
          //
          // NOT the handoff's 38. That figure counts the chip and one inset and
          // forgets the row has padding on both sides, so the hold would land 8px
          // BELOW the block's own top edge — ink on a rising ramp, which is the
          // failure this round exists to remove. The rule is the handoff's;
          // this is its arithmetic corrected against the box that ships.
          labelAtPx={46}
          artCropUri={item.artCropUri}
          colorIdentity={item.colorIdentity}
        />

        {/* §ReadyCard — the block, at the foot and in ONE row: name, pips, type
            line, fit chip. Three of these were pinned separately — the name at
            the top, the pips bottom-left, the chip bottom-right — and condensing
            them is decision 7's answer for this surface: nothing is cut, the
            band just stops carrying three separate anchors. */}
        <div
          data-wash-label
          className="absolute inset-x-0 bottom-0 flex items-center gap-[8px] p-[11px] sm:p-[12px]"
        >
          {/* A div, not a span: this wraps two paragraphs, and phrasing content
              cannot hold flow content. */}
          <div className="flex min-w-0 flex-auto items-center gap-[8px]">
            <p
              className="m-0 min-w-0 truncate font-display text-[17px] font-semibold text-[color:var(--fg)] sm:text-[18px]"
              style={{ lineHeight: 1.15, textShadow: INK_SHADOW }}
            >
              {item.name}
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
            {/* Drawn at BOTH widths. STATES has this block as one row of name ·
                pips · type · fit chip, and hiding the type line on a phone would
                have been a cut dressed as a condense — decision 7 condenses this
                surface and cuts nothing from it.
                
                It is the child that gives, at a shrink factor the resume row
                already uses for the same problem: the name keeps its characters
                and the type line is what a narrow row eats into, because a
                half-truncated name reads as a different commander while a
                half-truncated type line still reads as a type line. */}
            <p
              className="m-0 min-w-0 truncate font-mono text-[10.5px] text-[color:var(--fg-body)]"
              style={{ lineHeight: 1.25, textShadow: INK_SHADOW, flexShrink: 1000 }}
            >
              {item.typeLine}
            </p>
          </div>

          {/* §ReadyCard — fit badge. Decision 3: a chip over art takes an opaque
              plate and a hairline, exactly as the status pill does — and it is
              already THE PLATE's own treatment, which is why it needs no change
              beyond joining the row. */}
          <div
            className="hero-fit-chip flex h-[22px] flex-none items-center rounded-[7px] px-[8px] font-mono text-[10.5px]"
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
            className="flex h-[44px] flex-auto items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
          >
            {c.seePool}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
