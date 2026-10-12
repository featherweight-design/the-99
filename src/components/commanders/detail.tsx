// Commander Detail — §Commander Detail Page design table.
// Desktop: sticky left column (63/88 card + oracle glass + build button) + scrolling right column.
// Mobile: art header band (1.6:1, the shared art wash + overlay text) + sticky bottom Build bar + sections.

import { drawsMarker } from "../../lib/decks/availability";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR, cssUrl } from "../../lib/collection/browse";
import { fitSegments } from "../../lib/recs/format";
import { colorLabel } from "../../lib/decks/format";
import { POOL_WEIGHT, ROLES_WEIGHT, SYNERGY_WEIGHT } from "../../lib/recs/score";
import type { CommanderDetailScore, RankedCommander } from "../../lib/recs/recommend";
import { explainedCopy, heroNoteEdits } from "../../lib/copy/commander-explained";
import { availabilityCopy } from "../../lib/copy/availability";
import { FitLegend, type FitLegendSegment } from "./fit-legend";
import { WhySection } from "./why-section";
import { FullCardTrigger } from "./full-card-trigger";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import { IdentityPips } from "./commander-art";
import { ArtWash, COVER_INK_SHADOW } from "../ui/art-wash";
import { CARD_ART_RING } from "../ui/commander-thumb";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { CoverageSection } from "./coverage-section";
import { retryCoverageFigures } from "../../app/commanders/[slug]/coverage-action";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import {
  SynergySelectionProvider,
  SelectableSynergyPanel,
  SelectableSynergySelection,
  SelectableBuildButton,
  SelectableLiveAnnouncer,
} from "./synergy-selection";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import { PRIMARY } from "../ui/button";

// ─── Fit Hero (right column top section) ─────────────────────────────────────

type FitHeroProps = {
  // `printedName` widens `RankedCommander` rather than being added to it: the scorer never
  // produces one — the page applies it through `withOwnedCardArt` after the fact.
  //
  // DOCUMENTARY, not load-bearing: `commanderDisplayName` takes an optional field, so it
  // typechecks against a `RankedCommander` and reads the property at runtime either way.
  // Written down so the next reader knows the object can carry it, rather than being
  // surprised by a name that has no declaration behind it.
  commander: RankedCommander & { printedName?: string | null };
  rank: number;
  isBestFit: boolean;
  avail: "all" | "free";
  width: "desktop" | "phone";
};

function FitHero({ commander: c, rank, isBestFit, avail, width }: FitHeroProps) {
  const isPhone = width === "phone";
  const fit = fitSegments(c);
  const hasSynergy = c.fitSynergy !== null;

  // The same three-step ramp the fit bar draws, so it takes the same three
  // tokens. Reading these two as --accent-shadow and --accent-strong would
  // split one gradient across two token families, and Phase 3 moves those
  // families independently.
  const SEGMENT_COLORS: Record<"pool" | "roles" | "synergy", string> = {
    pool: "var(--accent-dim)",
    roles: "var(--accent-mid)",
    synergy: "var(--accent)",
  };
  const legendSegments: FitLegendSegment[] = [
    { key: "pool", points: c.fitPool, weight: POOL_WEIGHT },
    { key: "roles", points: c.fitRoles, weight: ROLES_WEIGHT },
    ...(c.fitSynergy === null
      ? []
      : ([
          { key: "synergy", points: c.fitSynergy, weight: SYNERGY_WEIGHT },
        ] as FitLegendSegment[])),
  ];

  const rankClause = isBestFit ? (
    <span
      className="font-sans font-[600]"
      style={{ fontSize: 13, color: "var(--success)", marginLeft: isPhone ? 0 : 6 }}
    >
      {explainedCopy.score.bestInPool}
    </span>
  ) : (
    <span className="font-mono" style={{ fontSize: 13, color: "var(--fg-faint)" }}>
      Rank #{rank}
    </span>
  );

  return (
    <div
      className="rounded-[14px]"
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border)",
        padding: "22px 24px",
      }}
    >
      {/* "FIT FOR YOUR COLLECTION" label */}
      <p
        className="m-0 font-mono uppercase"
        style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--fg-faint)" }}
      >
        {explainedCopy.score.label}
      </p>

      {/* Which pool the figure below was scored against. Only the free mode says
          so: the canonical one is what "your collection" in the label already
          means, and a page that names its scope only when the scope is unusual
          is the one where naming it carries information. */}
      {avail === "free" && (
        <p
          className="m-0 font-mono"
          style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 6, lineHeight: 1.45 }}
        >
          {availabilityCopy.ranking.freeNote}
        </p>
      )}

      {/* Score row. On phone the figure and its denominator take the full content box,
          so the rank clause drops to its own line rather than shrinking. */}
      <div className="mt-[8px]">
        <div className="flex items-baseline gap-[8px]">
          <span className="sr-only">
            {explainedCopy.score.scoreAria(c.score, c.measurableTotal)}
          </span>
          <span
            className="font-mono font-[600]"
            style={{ fontSize: 52, color: "var(--fg)", lineHeight: 0.9 }}
            aria-hidden
          >
            {c.score}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 16, color: "var(--fg-faint)" }}
            aria-hidden
          >
            {hasSynergy
              ? explainedCopy.score.denominator
              : explainedCopy.score.denominatorMeasurable(c.measurableTotal)}
          </span>
          {!isPhone && rankClause}
        </div>
        {isPhone && <div style={{ marginTop: 6 }}>{rankClause}</div>}
      </div>

      {/* Fit bar — 12px height for detail hero */}
      <div
        className="overflow-hidden flex rounded-full"
        style={{ height: 12, background: "var(--elevated)", marginTop: 18 }}
      >
        <div className="anim-grow-x origin-left flex h-full" style={{ width: `${fit.pct}%` }}>
          {fit.segments.map((seg) => (
            <div
              key={seg.key}
              className="h-full"
              style={{
                flexGrow: seg.grow,
                background: SEGMENT_COLORS[seg.key],
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend, and the key that explains what the three weights are. There is no
          placeholder Synergy entry when synergy was not measured: the denominator
          already says the ceiling moved, so there is no missing third to explain. */}
      <FitLegend segments={legendSegments} score={c.score} width={width} />

      {/* Per-commander note when there is no synergy data. "absent" is permanent
          — EDHREC does not index the commander — so it must not read as an outage. */}
      {c.synergyState !== "ok" && (
        <div
          className="flex items-center gap-[9px] rounded-[8px] mt-[16px]"
          style={{
            background: "var(--elevated-hover)",
            border: "1px solid var(--border-strong)",
            borderLeft: "2px solid var(--fg-faint)",
            padding: "9px 13px",
          }}
        >
          <span style={{ color: "var(--fg-faint)", fontSize: 13 }}>⚠</span>
          <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
            {(() => {
              const note =
                c.synergyState === "degraded"
                  ? heroNoteEdits.degraded
                  : heroNoteEdits.absent;
              return (
                <>
                  <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>
                    {note.heading}
                  </strong>{" "}
                  {isPhone
                    ? note.bodyMobile(c.measurableTotal)
                    : note.body(c.measurableTotal)}
                </>
              );
            })()}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type CommanderDetailProps = {
  commander: CommanderDetailScore;
  rank: number;
  isBestFit: boolean;
  /**
   * Which pool the score and the rank above were computed against.
   *
   * REQUIRED, with no default, since it now also decides the pool a RETRY scores
   * against. A render that omitted it got a free-mode page whose retry silently
   * returned the whole collection — the defect this chain exists to close, one
   * link above where it was found.
   */
  avail: "all" | "free";
  synergyCards: SynergyCard[];
  /**
   * The newest `as_of` in the price table, for the synergy panel's buy tags.
   *
   * ONE per surface rather than one per card: liveness is a property of the
   * table, not of a row, and `top-off-list.tsx` already threads it this way.
   */
  /**
   * REQUIRED, and for the reason the panel chain below it is: a default turns a
   * missed integration into a wrong price rather than a type error. This is the
   * level the original miss lived at — the page passed it to one of two panels —
   * so leaving it optional here would have left the same hole one step above the
   * place it was closed.
   */
  newestAsOf: Date | null;
  /** The stored sentence, or null when none has been accepted for this commander. */
  prose?: string | null;
};

export function CommanderDetail({
  commander: c,
  rank,
  isBestFit,
  avail,
  synergyCards,
  newestAsOf,
  prose = null,
}: CommanderDetailProps) {
  // THE PAGE-LEVEL ANSWER, computed once over every card either panel draws.
  //
  // The dot key asserts "Owned and available." — a claim about the commander,
  // not about the list beneath it — so it cannot be computed from one panel's
  // cards. `drawsMarker` is the shared definition: free says nothing, and an
  // unowned synergy row draws a buy tag rather than a marker.
  //
  // A future panel that draws markers joins this expression. It does not reopen
  // the key's ruling.
  // Only the synergy panel's half. Role Coverage computes its own from the cards
  // it is currently showing, which a successful retry replaces — see `DotKey`.
  const markerElsewhere = synergyCards.some(drawsMarker);

  const gradient = commanderGradient(c.colorIdentity);
  // No back chrome here: the rail and the tab bar are the route back at both
  // widths, and a 30px glyph over card art is the second way to do one thing
  // that the refresh removes. `avail` still rides into the hero, which is what
  // decides whether the free-ranked clause prints.

  return (
    // One card-detail modal for the whole page, so the role chips below open the
    // same modal the deck builder uses rather than a second implementation of it.
    // The synergy selection sits beside it at the same level, so Task 7's promise
    // line and Build href can read the picks as siblings of the panel.
    <CardDetailProvider>
      <SynergySelectionProvider>
      {/* Live region — outside both breakpoint containers so it is present
          at every width. Exactly one instance in the DOM. */}
      <SelectableLiveAnnouncer cards={synergyCards} />
      {/* ── Mobile: art header band ─────────────────────────────────── */}
      <div
        // A page header, stated in px. The 1.6/1 ratio made this band 244px at
        // 390 and 328px on a 520px phone — a header whose height was a function
        // of the device rather than of the job, and the taller of the two
        // scaled its own darkness with it.
        className="sm:hidden relative flex-none overflow-hidden"
        style={{ height: 288 }}
      >
        <ArtWash
          strategy="cover"
          height={288}
          // The block's MEASURED height, counted line by line at its ceiling:
          // a 15px bottom inset, a 15px type line at 12.5/1.2, its 4px margin,
          // two clamped name lines at 19/1.15 for 44, another 4px margin and a
          // 14px rank line at 11/1.2 — 96. Measured, never intended: the same
          // block was 110 while the name was 25px, which is the 109 that
          // shipped, and the round's own failure is a `labelAt` that describes a
          // block other than the one drawn.
          //
          // NOT the handoff's 57, which is the one figure in that package that
          // cannot be reconciled with the block it describes: a single 25px name
          // line was 29px on its own, and this block carries a rank line and a
          // type line besides. The rule is the handoff's — measure the block, key
          // the ramp to its wrapped height — and only its arithmetic was wrong,
          // which its own open item 2 predicted by asking for this to be
          // measured rather than trusted.
          labelAtPx={96}
          artCropUri={c.artCropUri}
          colorIdentity={c.colorIdentity}
        />

        {/* ⛶ Card details trigger (client component). Its `hero` placement moves
            to the bottom-right corner in this same change, because this is the
            change that empties the top edge — the pips are in the block now —
            and the change that reserves the corner with the block's own right
            padding. */}
        <FullCardTrigger oracleId={c.oracleId} />

        {/* Art header overlay (bottom) — pointer-events-none so taps fall
            through to the full-band card-details trigger.

            `paddingRight` clears the 44px target in the corner, the way the deck
            tile's block clears its overflow control. Without it the name would
            run under a plate drawn over it. */}
        <div
          // The hook a browser probe reads to find the label block. Shape cannot
          // find it: a band's own breakpoint wrapper is a positioned child that
          // spans the whole band, so a probe picking the lowest child measures
          // the band and reports a block starting at its top edge.
          data-wash-label
          className="absolute pointer-events-none"
          style={{ left: 16, right: 16, bottom: 15, paddingRight: 40 }}
        >
          {/* --fg-body, not --accent: the accent measured below the floor on art. */}
          <p
            className="m-0 font-mono uppercase"
            style={{
              fontSize: 11,
              // Stated, not inherited. `labelAtPx` is this block's measured
              // height, and a line box inheriting the app's 1.5 makes that
              // measurement a function of a global — change the body leading and
              // the ramp lands inside the name.
              lineHeight: 1.2,
              letterSpacing: "0.14em",
              color: "var(--fg-body)",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            Rank {rank}
            {isBestFit ? " · your best fit" : ""}
          </p>
          {/* The pips arrive here from the band's top edge. Beside the name, as
              every other band in the app already draws them — five plated
              swatches in a corner would be five plates for a decorative
              `aria-hidden` read, and moving them is what leaves this band's top
              edge empty. `items-end`, NOT `items-baseline`: a flex container
              baseline-aligns to a multi-line item's FIRST baseline, so the very
              two-line name this block is sized for would have put the swatches
              beside line one. Bottom-aligning holds them on the last line, which
              is the only line they sit beside on a single-line name too. */}
          <div className="flex items-end gap-[8px]" style={{ marginTop: 4 }}>
            <h1
              className="font-display font-[700] m-0 min-w-0"
              style={{
                // 19, not 25. At 25 a two-word commander already filled the
                // phone's width and anything longer took both clamped lines,
                // which pushed the pips off the visible row and made the block
                // the tallest thing on the band. This is the home hero's own
                // size, and the two surfaces draw the same thing.
                fontSize: 19,
                color: "var(--fg)",
                lineHeight: 1.15,
                textShadow: COVER_INK_SHADOW,
                // Two lines is a CEILING, not an estimate — which is what makes
                // `labelAtPx` a measurement rather than a hope. Without the
                // clamp a long name on a narrow phone grows the block past 95
                // and the hold starts below its top edge, printing the first line
                // on a rising ramp: the round's own failure, from the other
                // direction.
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {commanderDisplayName(c)}
            </h1>
            <IdentityPips colorIdentity={c.colorIdentity} size={10} />
          </div>
          <p
            // One line, for the same reason the name is clamped to two: a type
            // line that wraps is a block taller than the ramp was measured for.
            className="m-0 truncate"
            style={{
              fontSize: 12.5,
              lineHeight: 1.2,
              color: "var(--fg-body)",
              marginTop: 4,
              textShadow: COVER_INK_SHADOW,
            }}
          >
            {c.typeLine}
          </p>
        </div>
      </div>

      {/* ── Mobile: scrolling body ──────────────────────────────────── */}
      <div
        className="sm:hidden flex flex-col gap-[16px] overflow-y-auto"
        // The bar below is in flow, not fixed — it always sits under the last
        // section rather than over it. The 100px spacer that used to end this
        // column was reserving room for an overlay that does not exist, and drew
        // as a band of nothing between the synergy panel and the Build bar. The
        // bottom padding here is the gap that band was hiding.
        style={{ flex: 1, padding: "16px 14px 16px" }}
      >
        {/* Fit Hero (mobile) */}
        <FitHero commander={c} rank={rank} isBestFit={isBestFit} avail={avail} width="phone" />

        <WhySection
          prose={prose}
          edhrecOwnedCount={c.edhrecOwnedCount}
          edhrecTotal={c.edhrecTotal}
          roleCounts={c.roleCounts}
          roleTargets={c.roleTargets}
          committedSupport={c.committedSupport}
          width="phone"
        />

        {/* The Pool section */}
        <div>
          <div className="mb-[12px]">
            <h2
              className="font-display font-[600] m-0"
              style={{ fontSize: 20, color: "var(--fg)" }}
            >
              The Pool
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "var(--fg-faint)" }}
            >
              {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} fit this
              identity
            </p>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: "var(--fg-body)",
                lineHeight: 1.6,
                margin: "8px 0 0",
                maxWidth: 640,
              }}
            >
              Cards from your collection that fit within{" "}
              {commanderDisplayName(c)}&apos;s color identity and could slot into the 99.
            </p>
          </div>
        </div>

        {/* Role Coverage section */}
        <CoverageSection
          width="phone"
          slug={c.slug}
          markerElsewhere={markerElsewhere}
          roleCards={c.roleCards}
          roleCounts={c.roleCounts}
          roleTargets={c.roleTargets}
          synergyState={c.synergyState}
          avail={avail}
          retryCoverageFigures={retryCoverageFigures}
        />

        {/* EDHREC Synergy section (mobile) */}
        {c.fitSynergy !== null && c.edhrecTotal !== null && synergyCards.length > 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "16px 14px",
            }}
          >
            <div className="mb-[12px]">
              <h2
                className="font-display font-[600] m-0"
                style={{ fontSize: 20, color: "var(--fg)" }}
              >
                EDHREC Synergy
              </h2>
              {/* The sub-caption belongs to the panel (brief §panel structure);
                  printing it here as well drew it twice. */}
            </div>
            <SelectableSynergyPanel
              width="phone"
              cards={synergyCards}
              newestAsOf={newestAsOf}
              ownedCount={c.edhrecOwnedCount ?? 0}
              edhrecTotal={c.edhrecTotal}
            />
          </div>
        ) : c.synergyState === "degraded" ? (
          /* Only an outage gets the outage sentence. The panel also stays down
             for a commander EDHREC does not index and for one whose rows are
             all excluded, and neither is EDHREC being unreachable — the
             FitHero note above already names those states correctly. */
          <div
            className="flex items-center gap-[8px] rounded-[7px]"
            style={{
              background: "var(--elevated-hover)",
              border: "1px solid var(--border-strong)",
              padding: "7px 11px",
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "var(--fg-locked)" }}
            >
              Synergy receipts hidden: EDHREC data unavailable
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Mobile: bottom Build bar ───────────────────────────────── */}
      <div
        className="sm:hidden flex-none flex items-center gap-[12px]"
        style={{
          borderTop: "1px solid var(--border-strong)",
          background: "var(--surface-rail)",
          padding: "12px 16px 24px",
        }}
      >
        <div className="flex flex-col flex-1">
          <span
            className="font-mono"
            style={{ fontSize: 10, color: "var(--fg-faint)" }}
          >
            {recommendationsCopy.build.stickyLabel}
          </span>
          <span style={{ fontSize: 12, color: "var(--fg-body)" }}>
            {recommendationsCopy.build.stickyPromise}
          </span>
          <SelectableSynergySelection cards={synergyCards} width="phone" />
        </div>
        <SelectableBuildButton
          oracleId={c.oracleId}
          // brand focus-visible outline treatment inherited from globals.css
          className={`font-sans font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-default ${PRIMARY} text-[14px] p-[12px_20px] text-center whitespace-nowrap`}
        />
      </div>

      {/* ── Desktop: two-column layout ──────────────────────────────── */}
      <div
        className="hidden sm:grid"
        style={{
          gridTemplateColumns: "344px 1fr",
          gap: 36,
          marginTop: 20,
          alignItems: "start",
          padding: "26px 36px 40px",
        }}
      >
        {/* Left column — sticky */}
        <div
          className="sticky flex flex-col gap-[16px]"
          style={{ top: 20 }}
        >
          {/* Commander card frame — 63/88 aspect. Image when available;
              gradient is the fallback.

              It carries the same `⛶ Card details` trigger the phone's art header
              does. Without one this column was the only place a commander's card
              was drawn that could not be opened, so on desktop there was no way
              to reach the printings, the rulings, or the flip control a two-faced
              commander's back face lives behind. `relative` is what the pill and
              the band-wide tap layer position against. */}
          <div
            className="relative rounded-[14px] overflow-hidden"
            style={{
              aspectRatio: "63/88",
              background: c.imageUri ? undefined : gradient,
              backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              // One ring alpha across every card face and thumb in the app: `.4`
              // is `IdentityPips`' own, and this face shipped `.3` while two
              // thumbs shipped `.35`.
              boxShadow: `${CARD_ART_RING}, 0 20px 50px rgba(0,0,0,0.5)`,
            }}
          >
            <FullCardTrigger oracleId={c.oracleId} placement="commander-desktop" />
          </div>

          {/* Name + type line, below the card rather than over it. The card
              scan prints both itself, but the desktop column needs a real
              heading — the other h1 in this file is the mobile header and is
              sm:hidden. */}
          <div className="flex flex-col gap-[2px]">
            <h1
              className="font-display font-[700] m-0"
              style={{ fontSize: 21, color: "var(--fg)", lineHeight: 1.15 }}
            >
              {commanderDisplayName(c)}
            </h1>
            <p className="m-0" style={{ fontSize: 12.5, color: "var(--fg-body)" }}>
              {c.typeLine}
            </p>
          </div>

          {/* Identity pip row (below card) */}
          {c.colorIdentity.length > 0 && (
            <div className="flex items-center gap-[5px]">
              {c.colorIdentity.map((color) => (
                <span
                  key={color}
                  className="block rounded-full shrink-0"
                  style={{
                    width: 16,
                    height: 16,
                    background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                  }}
                />
              ))}
              {/* The identity's NAME, not its letters. `GRU` is the pips again
                  in a second alphabet — the swatches beside it already carry the
                  colours — where `Temur` is the word a player uses for the
                  combination. `colorLabel` is the same namer every deck surface
                  uses, so a commander and the deck it leads cannot disagree. */}
              <span
                className="font-mono ml-[4px]"
                style={{ fontSize: 12, color: "var(--fg-faint)" }}
              >
                {colorLabel(c.colorIdentity)}
              </span>
            </div>
          )}

          {/* Build this deck button */}
          <SelectableBuildButton
            oracleId={c.oracleId}
            // brand focus-visible outline treatment inherited from globals.css
            className={`font-sans font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-default ${PRIMARY} text-[15px] p-[14px_0] text-center block w-full`}
          />

          {/* Seed note */}
          <p
            className="m-0 font-mono text-center"
            style={{
              fontSize: 10.5,
              color: "var(--fg-locked)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {recommendationsCopy.build.seedNote}
          </p>

          {/* Promise line + clear, below seed note — desktop width */}
          <SelectableSynergySelection cards={synergyCards} width="desktop" />
        </div>

        {/* Right column — scrolling */}
        <div className="flex flex-col gap-[32px]">
          {/* Fit Hero */}
          <FitHero commander={c} rank={rank} isBestFit={isBestFit} avail={avail} width="desktop" />

          <WhySection
            prose={prose}
            edhrecOwnedCount={c.edhrecOwnedCount}
            edhrecTotal={c.edhrecTotal}
            roleCounts={c.roleCounts}
            roleTargets={c.roleTargets}
            committedSupport={c.committedSupport}
            width="desktop"
          />

          {/* The Pool section */}
          <div>
            <h2
              className="font-display font-[600] m-0"
              style={{ fontSize: 20, color: "var(--fg)" }}
            >
              The Pool
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "var(--fg-faint)" }}
            >
              {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} fit this
              identity
            </p>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: "var(--fg-body)",
                lineHeight: 1.6,
                margin: "8px 0 0",
                maxWidth: 640,
              }}
            >
              Cards from your collection that fit within{" "}
              {commanderDisplayName(c)}&apos;s color identity and could slot into the 99.
            </p>
          </div>

          {/* Role Coverage section */}
          <CoverageSection
            width="desktop"
            slug={c.slug}
            markerElsewhere={markerElsewhere}
            roleCards={c.roleCards}
            roleCounts={c.roleCounts}
            roleTargets={c.roleTargets}
            synergyState={c.synergyState}
            avail={avail}
            retryCoverageFigures={retryCoverageFigures}
          />

          {/* EDHREC Synergy section */}
          {c.fitSynergy !== null && c.edhrecTotal !== null && synergyCards.length > 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "26px 28px",
              }}
            >
              <h2
                className="font-display font-[600] m-0"
                style={{ fontSize: 20, color: "var(--fg)" }}
              >
                EDHREC Synergy
              </h2>
              {/* The sub-caption belongs to the panel (brief §panel structure);
                  printing it here as well drew it twice. */}
              <SelectableSynergyPanel
                width="desktop"
                cards={synergyCards}
                newestAsOf={newestAsOf}
                ownedCount={c.edhrecOwnedCount ?? 0}
                edhrecTotal={c.edhrecTotal}
              />
            </div>
          ) : c.synergyState === "degraded" ? (
            /* Same gate as the phone column: the outage sentence is for an
               outage, not for every reason the panel might not mount. */
            <div
              className="flex items-center gap-[9px] rounded-[7px]"
              style={{
                background: "var(--elevated-hover)",
                border: "1px solid var(--border-strong)",
                padding: "7px 11px",
                width: "fit-content",
              }}
            >
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "var(--fg-faint)" }}
              >
                Synergy receipts hidden: EDHREC data unavailable
              </span>
            </div>
          ) : null}
        </div>
      </div>
      </SynergySelectionProvider>
    </CardDetailProvider>
  );
}
