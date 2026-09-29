"use client";

// Chapter 01's composition figures — the ones whose subject is a SURFACE
// rather than the states of a mark.
//
// A client module because two of these mount route components that carry
// handlers, and a fixture built on the server would hand a function across the
// boundary — which React refuses outright while jsdom never notices. That is
// how the `browse` figure shipped throwing on every real render with every
// unit test green.
//
// The rule these follow is the one the `browse` rebuild produced: where the
// canvas and the surface disagree about something the SURFACE owns, the
// surface wins. A reference page that draws its own version of a row teaches
// a row the reader will never meet.

import { recommendedMix, type RecommendedMix } from "../../lib/decks/mix";
import {
  IMPORT_SOURCES,
  ISSUE_PARSE_ERROR,
  ISSUE_UNMATCHED,
  CONTESTED_ARRIVAL,
  ADD_RESULTS,
  CARDS,
  CONTESTED_RESERVATION,
  CREATE_COMMANDERS,
  REVIEW_IN_ROWS,
  DECK_FOLDERS,
  GAME_SUMMARY,
  RESUME_DECKS,
  SHELF_COUNTS,
  RESUME_NOW,
  SHOPPING,
  DECK_VERSIONS,
  EXPORT_DECKLIST,
  SHOPPING_ROWS,
  EXPORT_SHOPPING,
  DECKLIST_MARK_ROWS,
  ROLE_MIX_CARDS,
  FIT_LEGEND,
  LANE_DISCOVER,
  DECK_SPINE,
  DECK_TABS,
  PARTNER_PROPOSAL,
  PRICES,
  SYNERGY_ROWS,
  LANE_ROW_OWNED,
  LANE_OWNED,
  PRINTING_ROWS,
  REPLACE_ROWS,
  REPLACE_SUMMARY,
  LOCKED_ROWS,
  CHANGE_COMMANDER,
  CHOOSE,
  FITS,
  STAND_INS,
  READY_IN_USE,
  READY_SLICE,
  CARD_MARK_ROWS,
  DECK_ANALYSIS,
} from "../../lib/about/fixtures";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { collectionChassisCopy } from "../../lib/copy/collection";
import { printingPickerCopy } from "../../lib/copy/collection";
import { COSTS } from "../../lib/about/fixtures";
import { COST_PIP_SIZE, CostPips } from "../ui/cost-pips";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { ComboPartnersDetail } from "../cards/combo-partners-detail";
import { LastSlotsStrip } from "../decks/last-slots-strip";
import { DecklistRow } from "../decks/decklist-row";
import { useSyncExternalStore } from "react";
import { QuickAddBar } from "../decks/quick-add-bar";
import { GameLogForm } from "../decks/game-log-form";
import { GameFindings, GameHeadlineHeader } from "../decks/games-panel";
import { deriveHeadline } from "../../lib/decks/game-headline";
import { ProxyControl } from "../decks/proxy-control";
import { Column } from "../decks/review-changes";
import { CreatePicker } from "../decks/create-picker";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { ProxyTag } from "../decks/proxy-tag";
import { ResumeDecks } from "../home/resume-decks";
import { ShelfLine } from "../decks/shelf-line";
import { ThemeMiniature, themeInForce } from "../shell/theme-picker";
import { THEMES } from "../../lib/theme/themes";
import { PendingChangeProvider } from "../decks/pending-change";
import { ImportEntry } from "../decks/import-entry";
import { ExportDialog } from "../decks/export-dialog";
import { VersionRail } from "../decks/version-history";
import { RoleCounterStrip } from "../decks/role-counter-strip";
import { GroupToggle } from "../decks/group-toggle";
import { ContestedCardRow } from "../decks/contested-card-row";
import { FitLegend } from "../commanders/fit-legend";
import { AvailabilityControl } from "../commanders/rack/availability-control";
import { CommanderRow } from "../commanders/commander-row";
import { PartnerSlot } from "../decks/partner-slot";
import { BuilderTabs } from "../decks/builder-tabs";
import { StatusPillBadge } from "../decks/status-pill";
import { statusBarStyle } from "../../lib/decks/status-style";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import { PIP_BACKGROUND } from "../../lib/copy/filter-chassis";
import type { PipCode } from "../../lib/copy/filter-chassis";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckHeaderCopy } from "../../lib/copy/decks-builder";
import { deckBodySize } from "../../lib/decks/deck-size";
import { SynergyRow } from "../commanders/synergy-row";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { OrderControl } from "../commanders/rack/order-control";
import { ORDER_OPTIONS } from "../commanders/rack/order-options";
import { ReceiptRow } from "../collection/arrivals-summary";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  ParseErrorRowView,
  UnmatchedRowView,
} from "../collection/issue-inspector-list";
import { AnchoredNumerals, KeyNumeral, byAriaPrefix, first, leafMatching, nth, withText } from "./numeral";
import { discoverCopy } from "../../lib/copy/lanes";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { gameLogCopy } from "../../lib/copy/game-log";
import { refreshCopy } from "../../lib/copy/refresh";
import { ReadyToBuild } from "../home/ready-to-build";
import { exportLinkOutCopy, exportTabCopy } from "../../lib/copy/decks-builder";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { useIsDesktop } from "../ui/use-is-desktop";
import { EMPTY_NOTE_COUNTS } from "../../lib/bracket/card-note";
import { ChooseRow } from "../intake/choose-row";
import { FitsHolds, FitsPlate, FitsRows } from "../cards/fits-picker";
import { StandInGroup, StandInRow } from "../decks/stand-ins-sheet";
import { StandInLimit } from "../decks/stand-in-limit";
import { SwapToolsProvider } from "../../lib/swaps/context";
import { figures as chooseFigures } from "../../lib/intake/present";
import { identityGradient } from "../../lib/collection/gradients";
import { LockCardsProvider, type LockCards } from "../decks/lock-cards";
import { LockModeLine, buildMarkKeyEntries } from "../decks/decklist";
import { MarkKey } from "../decks/mark-key";
import { VerdictBlock } from "../decks/verdict-block";
import { BracketClimb } from "../decks/bracket-climb";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { declarationCopy } from "../../lib/copy/declaration";
import { LockModeButton } from "../decks/group-toggle";
import { ChangeCommanderProvider } from "../decks/change-commander-context";
import { ChangeCommanderDoor } from "../decks/change-commander-door";
import { CandidateGroupHeading, CandidateRow } from "../decks/change-commander-sheet";
import { changeCommanderCopy } from "../../lib/copy/change-commander";

export function ImportFigureBody() {
  return (
    // TRANSCRIBED from §3, not interpreted. Every value is read off the
    // canvas's own inline styles: the dashed target, its two lines, and two
    // 30px controls at `flex:1` each.
    //
    // What this replaces drew the four sources as pill plates and gave the
    // replace sentence a warning band. Design drew neither. The sentence is
    // the ENTRY'S CAPTION — a figure repeating it is the stutter the close-out
    // already recorded once — and the drop target plus its two doors is what
    // the reader will actually meet on `/collection/replace`.
    <div className="flex flex-col gap-[9px]">
      <div className="rounded-[8px] border border-dashed border-[color:var(--border-dashed)] px-[12px] py-[14px] text-center">
        {/* The ROUTE's words, not §3's. The canvas says `Drop a CSV export`,
            `Upload a CSV`, `Paste a list`; `UploadEntry` has never said any of
            them. A reference page naming controls the app does not have is the
            one failure this page cannot afford, so the drawing's LAYOUT
            transfers and its labels do not. Both forms are drawn because the
            route forks them at `md`. */}
        <div className="mb-[3px] text-[12.5px] text-[color:var(--fg-body)]">
          <span className="md:hidden">{collectionChassisCopy.upload.dropCompact}</span>
          <span className="hidden md:inline">{collectionChassisCopy.upload.dropWide}</span>
        </div>
        <div className="font-mono text-[10px] text-[color:var(--fg-faint)]">
          {IMPORT_SOURCES.join(" · ")}
        </div>
      </div>
      <div className="flex gap-[6px]">
        {/* `--fg` on `--bg` — an inversion, and the only one in chapter 01. It
            is what makes `Upload a CSV` the default door and `Paste a list`
            the other one. */}
        <span className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] bg-[color:var(--fg)] text-[11.5px] font-semibold text-[color:var(--bg)]">
          {collectionChassisCopy.upload.browse}
        </span>
        <span className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] text-[11.5px] text-[color:var(--fg-body)]">
          {collectionChassisCopy.upload.paste}
        </span>
      </div>
    </div>
  );
}

/**
 * The replace summary. The old figure printed three section headings as mono
 * strings; §3 draws the figure that makes the entry's three key lines legible —
 * the route's own heading and lede, its money sections, and Still short as the route draws
 * it: the contested row, under key 4.
 */
export function PostImportFigureBody() {
  const { before, after, arrived, left } = REPLACE_SUMMARY;
  const c = cardAssignmentsCopy.summary;
  const heads: Record<string, string> = {
    cleared: c.sectionCleared(61),
    still: c.sectionStill(12),
  };
  return (
    <div className="flex flex-col gap-[10px]">
      {/* Key 1 — BEFORE and AFTER, both printed, so the change is checkable
          rather than asserted. One figure alone says nothing about the rule. */}
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[3px]">
        <KeyNumeral n={1} />
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-[color:var(--fg-faint)] uppercase">
          {c.eyebrow}
        </span>
        {/* The route's own heading and lede: the after figure, then the before one beside
            what arrived and what left. Earlier versions drew figures the summary never prints. */}
        <span className="text-[12.5px] text-[color:var(--fg)]">{c.heading(after)}</span>
        <span className="basis-full text-[11.5px] leading-[1.45] text-[color:var(--fg-muted)]">
          {c.lede(before, arrived, left)}
        </span>
      </div>

      {/* Keys 2 and 3 — the two money SECTIONS (Still short is under key 4), and a row
          that is a CARD carrying the deck that wanted it. The R4 canvas draws deck rows with a count each;
          the shipped summary does not, and the three captions printed directly
          under this figure describe the sections. A figure built from the
          drawing contradicted its own key lines on the page. */}
      <div className="flex items-start gap-[8px]">
        <KeyNumeral n={2} className="mt-[3px]" />
        <ul className="m-0 min-w-0 flex-1 list-none p-0">
          {REPLACE_ROWS.map((row) => (
            <li key={row.card} className="mb-[6px] last:mb-0">
              <span className="font-mono text-[10px] tracking-[0.12em] text-[color:var(--fg-body)] uppercase">
                {heads[row.section]}
              </span>
              {/* The route's own receipt row, mounted rather than restated. */}
              <ul className="m-0 list-none p-0">
                <ReceiptRow
                  cardName={row.card}
                  deckName={row.deck}
                  reason={row.reason}
                  // NOT `warn`. `ReceiptRow` reserves `--warning` for the one
                  // reason a player can act on without buying anything, and a
                  // contested shortage is not it — the real `sectionShort`
                  // hands that case to `ContestedCardRow`, which this figure
                  // now draws below.
                />
              </ul>
            </li>
          ))}
        </ul>
        <KeyNumeral n={3} className="mt-[3px]" />
      </div>

      {/* THE CHOOSER, and it was missing entirely.
          The three sections above say what the replace cost; this is the one
          thing on the summary a reader can act on. It appears under the two
          tests the receipt itself applies — demand above supply, and at least
          two COMMITTED claimants — because a shortage with one claimant is a
          purchase rather than a choice.
          The route's own row, mounted as-is. It is inert here like every
          specimen: `Specimen` puts `pointer-events: none` over the figure, so
          the server action it imports is unreachable. */}
      <div className="flex items-start gap-[8px]">
        <KeyNumeral n={4} className="mt-[3px]" />
        <div className="min-w-0 flex-1">
          {/* Still short, as the route draws it: the section's head, then the contested row. */}
          <span className="font-mono text-[10px] tracking-[0.12em] text-[color:var(--fg-body)] uppercase">
            {c.sectionShort(2)}
          </span>
          <ContestedCardRow card={CONTESTED_ARRIVAL} />
        </div>
      </div>
    </div>
  );
}

/**
 * The inspector's two row KINDS, mounted from the route rather than described.
 * The old figure drew the two tab labels as pills, which says the inspector has
 * two tabs and nothing about the entry's actual subject — that a misspelling
 * and a printing nobody stocks read differently and are labelled differently.
 */
export function ImportIssuesFigureBody() {
  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex flex-col gap-[6px]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-[color:var(--fg-faint)] uppercase">
          {issueInspectorCopy.tabs.unmatched}
        </span>
        {/* The route's own row. `query` is empty, so `HighlightedText` draws
            the name plain — there is no search on a reference page to be
            highlighting against. */}
        <UnmatchedRowView row={ISSUE_UNMATCHED} query="" />
      </div>
      <div className="flex flex-col gap-[6px]">
        <span className="font-mono text-[10px] tracking-[0.1em] text-[color:var(--fg-faint)] uppercase">
          {issueInspectorCopy.tabs.parseErrors}
        </span>
        <ParseErrorRowView row={ISSUE_PARSE_ERROR} query="" />
      </div>
    </div>
  );
}

/**
 * The printings list, TRANSCRIBED from §3: an uppercase mono heading, then a
 * row per printing carrying a mark, the set name and the collector number, the
 * current row on `--elevated`.
 *
 * What it replaces was four legend cells of glyphs — a tick, a hollow diamond,
 * a two-faced mark and a cost — which taught the marks without ever showing
 * the list they live in.
 *
 * The MARKS are the app's. §3's legend calls the filled diamond "the printing
 * you own"; the picker has never meant that, and #653 already corrected that
 * exact claim in the caption. ✓ is `Your pick`, ◇ is `Shown now`.
 */
export function CardDetailFigureBody() {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="font-mono text-[9.5px] tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        Printings
      </div>
      {PRINTING_ROWS.map((row) => {
        const current = row.state !== "plain";
        return (
          <div
            key={row.set}
            className={`flex items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] ${
              row.state === "picked" ? "bg-[color:var(--elevated)]" : ""
            }`}
          >
            <span
              aria-hidden
              className={`flex-none font-mono text-[11px] ${
                current ? "text-[color:var(--accent)]" : "text-[color:var(--fg-faint)]"
              }`}
            >
              {row.state === "picked" ? "✓" : row.state === "shown" ? "◇" : " "}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-[11.5px] ${
                row.state === "picked" ? "text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"
              }`}
            >
              {row.set}
            </span>
            {/* The state is SPOKEN, never left to the glyph: a screen reader
                gets `Your pick` and `Shown now`, which is what the picker's own
                badges say. */}
            {current && (
              <span className="sr-only">
                {row.state === "picked"
                  ? printingPickerCopy.printing.badgePicked
                  : printingPickerCopy.printing.badgeShownNow}
              </span>
            )}
            <span className="flex-none font-mono text-[10px] text-[color:var(--fg-faint)]">
              {row.collector}
            </span>
          </div>
        );
      })}

      {/* THE COST AND THE BACK FACE. The entry's caption promises both — "the
          cost beside the name is drawn with the real mana symbols, and a card
          that prints two costs shows both", and "the back of a double-faced
          card" — and the printings list alone substantiates neither. The first
          rebuild dropped them for the list, which left the figure unable to
          show what its own words claim. Same failure as the replace figure:
          an assertion about a figure cannot see the caption above it.

          `allFaces`, because the subject is a card printing TWO costs. The
          default draws the front alone, which is the right pips for the wrong
          card. */}
      <div className="mt-[3px] flex items-center gap-[10px] border-t border-solid border-[color:var(--border)] pt-[9px]">
        <CostPips cost={COSTS.twoFaced} allFaces spoken size={COST_PIP_SIZE} />
        <TwoFacedMark layout="transform" />
      </div>
    </div>
  );
}

/**
 * The fit key, expanded. `FitLegend` draws the legend row with each part's
 * points over its weight, the `Hide` trigger, and the three-column panel that
 * explains Pool, Roles and Synergy — which is the entry's whole subject and
 * was absent from the figure entirely.
 *
 * A client module because `FitLegend` holds `open` in state. `defaultOpen`
 * exists for this: a specimen is inert, so the collapsed form would show the
 * trigger and none of the three explanations.
 */
export function FitLegendFigureBody() {
  // The About page renders at 390 too, and this hardcoded the desktop branch:
  // a phone reader got the three-column key and the desktop trigger, which is
  // a treatment the commander page never shows them. `FitLegend` has an
  // explicit phone layout; the figure picks the same one the route would.
  const desktop = useIsDesktop();
  return (
    <FitLegend
      segments={FIT_LEGEND}
      score={73}
      width={desktop ? "desktop" : "phone"}
      defaultOpen
    />
  );
}



export function CommanderLaneFigureBody() {
  // BUILD FROM ALONE, not the rack.
  //
  // The rack cannot show this control at About's width. Wide, it overflows the
  // ~750px plate; compact, `AvailabilityControl` lives inside `FilterSheet`,
  // which starts closed and which an inert specimen cannot open — so the
  // figure drew a `Filters` trigger and a `Free only` chip and never the
  // choice its caption is about. Round 1 named it and Hugh ruled on
  // 2026-09-18: drop the rack, same as discover.
  //
  // `wide` because the two segments fit side by side at any About width, and
  // side by side is what makes them read as one choice with two answers.
  // The ROW stays. It was a separate ask on 2026-09-18 — a reader of this
  // entry should see what the lane actually lists — and dropping the rack is
  // not a reason to drop it.
  return (
    <div className="flex flex-col gap-[12px]">
      <AvailabilityControl value={LANE_OWNED.avail} onChange={() => {}} wide />
      <div className="border-t border-solid border-[color:var(--border)] pt-[12px]">
        <CommanderRow item={LANE_ROW_OWNED} />
      </div>
    </div>
  );
}

export function DiscoverFigureBody() {
  // THE ORDER CONTROL AND NOTHING ELSE.
  //
  // `/commanders` and `/discover` share one rack and, since #708, one row, so
  // two figures drawing both showed the same thing twice and differed by a
  // price line. This entry's caption is the five orders; the other lane's is
  // Build from. The row came out on 2026-09-18 for that reason, and the rack
  // with it.
  //
  // The panel is absolutely positioned and right-aligned to its container, so
  // in a full-width box it opened far from its own trigger and read as a
  // mistake. The container is the trigger's width instead, which puts the
  // options directly under the control that names them, and its height is
  // reserved because nothing here can dismiss a panel.
  return (
    // 380 = the trigger's 38px, the 4px it sits off, and the panel's measured
    // 320. At 330 the last order clipped against the plate's own edge by 13px,
    // which a reader reads as a list that ends early rather than as a figure
    // cut short.
    <AnchoredNumerals
      className="min-h-[380px] w-[300px]"
      marks={[
        { n: 1, find: withText('[role="menuitemradio"]', discoverCopy.order.somethingNew, true), side: "inset-tr" },
        { n: 2, find: withText('[role="menuitemradio"]', discoverCopy.order.bestFit, true), side: "inset-tr" },
        { n: 3, find: withText('[role="menuitemradio"]', discoverCopy.order.popularity, true), side: "inset-tr" },
      ]}
    >
      <OrderControl
        value={LANE_DISCOVER.order}
        options={ORDER_OPTIONS.discover}
        onChange={() => {}}
        wide
        pinnedOpen
      />
    </AnchoredNumerals>
  );
}

/** The import's partner proposal, mounted. Inert: `Specimen` blocks the taps. */
export function PartnerSlotFigureBody() {
  const p = PARTNER_PROPOSAL;
  return (
    <PartnerSlot
      primaryName={p.primaryName}
      ability={p.ability}
      partner={p.partner}
      pairableCount={p.pairableCount}
      onAdd={() => {}}
      onChange={() => {}}
      onRemove={() => {}}
    />
  );
}

/**
 * Three synergy rows from a commander page.
 *
 * The entry has no canvas — it arrived with #683, after Design's last read —
 * so the surface is the only source. Its three key lines need three different
 * rows: two owned with different claims, to show the dot never moves, and one
 * unowned, because the list PRICES what you do not own and an all-owned
 * fixture draws no price at all.
 */
const SYNERGY_NUMERAL: Record<number, number> = { 0: 1, 2: 2, 4: 3 };

export function CommanderAvailabilityFigureBody() {
  // Same fault as the fit key. `SynergyRow` has a phone layout, and forcing
  // the desktop one put its type, score, availability and toggle columns past
  // the width a narrow plate has — clipped by `Specimen`'s own
  // `overflow-hidden`, so the row simply lost its right-hand end.
  const desktop = useIsDesktop();
  return (
    // `SynergyRow` opens the card detail, so it requires the provider's
    // context — mounting it without one throws. The provider takes its fetcher
    // as a prop for tests, and a figure is the same case: `Specimen` puts
    // `pointer-events: none` over everything here, so no row can be opened and
    // the resolver is never called. It returns null rather than reaching a
    // server action a reference page has no business calling.
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex flex-col">
        {/* The free card carries key 1 (the dot and nothing else), the card with no free copy
            key 2 (the note counts copies), the unowned card key 3 (the list prices it). The
            other rows keep a spacer so the five stay in one column. */}
        {SYNERGY_ROWS.map((card, i) => (
          <div key={card.oracleId} className="flex items-center gap-[8px]">
            {SYNERGY_NUMERAL[i] ? <KeyNumeral n={SYNERGY_NUMERAL[i]} /> : <span aria-hidden className="w-[14px] flex-none" />}
            <div className="min-w-0 flex-1">
              <SynergyRow
                card={card}
                selected={false}
                onToggle={() => {}}
                siblings={[]}
                width={desktop ? "desktop" : "phone"}
                facet={card.facet}
                newestAsOf={PRICES[0].fact.asOf}
              />
            </div>
          </div>
        ))}
      </div>
    </CardDetailProvider>
  );
}

/**
 * The deck header, mounted from the route.
 *
 * `SpineDesktop` and `SpineMobile` are two components, not one responsive
 * band, so the figure picks the one the route would — the same fault the fit
 * key and the synergy rows carried into round 1 of chapter 02.
 */
export function DeckPageFigureBody() {
  // THE RIGHT-HAND COLUMN OF THE REAL BAND, cropped rather than adapted.
  //
  // The live header is two columns: art on the left, this on the right, with
  // both actions outside the art. That needs a wider row than About's ~750px
  // plate, and my first two attempts ADAPTED it — full-width art with the
  // buttons moved on top, which is where §3 puts them and where the app never
  // does. A reference page that relocates a control to make it fit is teaching
  // the wrong page.
  //
  // Hugh's call, 2026-09-18: drop the art and `Card details`, keep the column.
  // Everything left sits exactly where the deck page puts it relative to
  // everything else, and the part that could not fit is absent rather than
  // rearranged. No key line names the art.
  const { deck, counts, status, version } = DECK_SPINE;
  const body = deckBodySize(deck.partner !== null);
  const identity = deckIdentity(deck.commander.colorIdentity, null);
  return (
    <div className="flex flex-col">
      <div className="mb-[5px] flex items-center gap-[9px]">
        <span className="font-display text-[17px] font-bold text-[color:var(--fg)]">
          {deck.name}
        </span>
        <span aria-hidden className="font-mono text-[11px] text-[color:var(--fg-faint)]">
          ✎
        </span>
      </div>

      <div className="mb-[9px] flex flex-wrap items-center gap-[9px]">
        <span aria-hidden className="flex gap-[3px]">
          {identity.map((code) => (
            <span
              key={code}
              className="h-[8px] w-[8px] rounded-[2px]"
              style={{ background: PIP_BACKGROUND[code as PipCode] }}
            />
          ))}
        </span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-body)]">
          {deck.commander.name} · {colorLabel(identity)}
        </span>
        <StatusPillBadge
          status={status}
          className="flex flex-none items-center rounded-[6px] px-[8px] py-[3px] font-mono text-[10.5px]"
        />
        <KeyNumeral n={1} />
      </div>

      {/* The bar and the two actions share a row, as they do on the page. */}
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="h-[4px] w-[200px] flex-none overflow-hidden rounded-full bg-[color:var(--elevated)]">
          <span className="block h-full" style={statusBarStyle(status, counts.built, body)} />
        </span>
        <span className="font-mono text-[13px] text-[color:var(--fg)]">
          {counts.built}
          <span className="text-[color:var(--fg-faint)]"> / {body}</span>
        </span>
        <span className="ml-auto flex items-center gap-[8px]">
          <span className="flex h-[28px] items-center rounded-[7px] border border-solid border-[color:var(--border-strong)] px-[11px] text-[11.5px] text-[color:var(--fg)]">
            {deckImportCopy.update.entryLabel}
          </span>
          <span className="flex h-[28px] items-center rounded-[7px] bg-[color:var(--fg)] px-[12px] text-[11.5px] font-semibold text-[color:var(--bg)]">
            {deckHeaderCopy.export}
          </span>
        </span>
      </div>

      <div className="mt-[10px] border-t border-solid border-[color:var(--border)] pt-[8px]">
        <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{version}</span>
      </div>

      {/* Key 2 over the Games tab, which drops a zero count; key 3 over Consider. Above rather
          than beside, because the tabs sit 16px apart on a phone. */}
      <AnchoredNumerals
        className="mt-[24px]"
        marks={[
          { n: 2, find: first("#tab-games"), side: "above" },
          { n: 3, find: first("#tab-consider"), side: "above" },
        ]}
      >
        <BuilderTabs tabs={DECK_TABS} view="deck" onViewChange={() => {}} />
      </AnchoredNumerals>
    </div>
  );
}

/**
 * `auto-fill` — the Top off strip, closed.
 *
 * The canvas draws NO figure here; the entry was a three-row legend quoting
 * strings out of `topOffCopy`. The app has one surface whose whole job is the
 * sentence this entry makes, and it is this strip: it names how many slots are
 * still open, how many candidates it has for them, and how many of those arrive
 * ticked because the player already owns them.
 *
 * The strip owns its own margins (`mx-[16px] md:mx-[30px]`), which it has
 * because it sits between the ledger and the decklist on the builder page.
 * Those come with it — a crop keeps what the component draws, and respacing it
 * to sit flush in a figure would be the adaptation this page stopped making.
 *
 * `openSlots` is 5 rather than the 36 a fresh fill leaves, because the caption
 * above it says we fill most of the 99 and the rest is the player's. A strip
 * offering five candidates against thirty-six open slots would say the opposite
 * of the sentence it illustrates.
 *
 * Every handler is a no-op: `Specimen` is `inert`, so nothing here can be
 * pressed. `useTopOffDraft` only READS localStorage on mount, so the fixture
 * deck id below writes nothing.
 */
export function AutoFillFigureBody() {
  return (
    <LastSlotsStrip
      deckId="about-figure"
      openSlots={5}
      bodySize={99}
      // The shared About fixture is a `SynergyCard[]` — the shape with no deck to be a
      // candidate FOR — so the two deck-scoped fields are supplied here rather than added
      // to a fixture every other figure on this page also draws. Both null: the figure's
      // rows carry no facts, so the note renders nothing, which is what a card with no
      // facts looks like anywhere.
      candidates={SYNERGY_ROWS.map((c) => ({ ...c, facts: null, comboPartner: null }))}
      deckOracleIds={new Set()}
      declaredBracket={null}
      noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
      newestAsOf={null}
      onAnnounce={() => {}}
    />
  );
}

/**
 * `decklist-marks` — five real `DecklistRow`s.
 *
 * The page drew its own row here: a dot, a name, a cost track and a marker,
 * assembled by hand in the order the real row draws them. It was right about
 * the order and wrong about everything the row does around it — the meta line
 * under the name, the `×2` count, the auto tag, the over-committed inset ring.
 * An entry titled "every mark on a decklist" is the last one that should be
 * drawing its own approximation of the list.
 *
 * `CardDetailProvider` is the one context `DecklistRow` demands; every other
 * hook it reads (`usePendingChange`, `usePassMark`, the optimistic-deck
 * family) returns a null or a no-op with no provider above it. The fetcher
 * resolves to null because `Specimen` is `inert` and no row here can be
 * opened.
 *
 * `newestAsOf` is passed explicitly, as its own doc comment demands: a row
 * that does not receive it reads every live price as absent and draws a bare
 * `buy` with no figure.
 */
export function DecklistMarksFigureBody() {
  // Each numeral sits beside the row that draws the mark its key line names,
  // rather than under the figure with nothing to point at. The numerals are
  // this page's annotation and the rows are the app's, which is why they are
  // siblings here instead of anything reaching inside `DecklistRow`.
  // A LIST per row, not one numeral: the over-committed row draws the count
  // (key 2) AND the mark-plus-red-edge (key 3), and a single-numeral map would
  // have silently dropped whichever was written second.
  const NUMERALS: Record<string, number[]> = {
    "about-mark-free": [1],
    "about-mark-over": [2, 3],
    "about-mark-pending": [4],
  };
  return (
    <CardDetailProvider fetchCard={async () => null}>
      {/* The draft's own changed-card map. One row is in it, which is what
          gives that row the accent edge — key line 4. Without a provider the
          hook returns null, which is every deck with no draft, and the edge
          could never be drawn here at all. */}
      <PendingChangeProvider
        value={{ moves: new Map([["about-mark-pending", { from: 1, to: 2 }]]) }}
      >
        <div className="flex flex-col">
          {DECKLIST_MARK_ROWS.map((card) => (
            <div key={card.oracleId} className="flex items-center gap-[10px]">
              <span className="min-w-0 flex-1">
                <DecklistRow
                  deckId="about-figure"
                  card={card}
                  siblings={[]}
                  newestAsOf={PRICES[0].fact.asOf}
                />
              </span>
              <span className="flex w-[34px] flex-none justify-start gap-[4px]">
                {(NUMERALS[card.oracleId] ?? []).map((n) => (
                  <KeyNumeral key={n} n={n} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </PendingChangeProvider>
    </CardDetailProvider>
  );
}

/**
 * `deck-analysis` — the Analysis tab's bracket box, then its climb, for a deck whose cards permit
 * a range and whose player has not said which.
 *
 * STACKED, box first, which is the tab's own phone order. At 1300 the tab puts the two side by
 * side at 2fr to 1fr, the box in the narrow column; at About's plate width that column is about
 * 240px, which would squeeze the box into a layout the app never draws at that size. Stacking is
 * the arrangement the app already has for a narrow row, not a new one.
 *
 * Nothing else on the tab is drawn. The findings, the overview and Suggested changes are named in
 * the caption: a whole-tab figure is what cropped every earlier chapter-03 attempt.
 *
 * `onDeclare` is a no-op: `Specimen` is `inert`, so no chip can be pressed.
 */
export function DeckAnalysisFigureBody() {
  const { profile, verdict, analyzedAt, version } = DECK_ANALYSIS;
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <AnchoredNumerals
        gutter
        marks={[
          // 1: the two chips under the range, the page's one question.
          { n: 1, find: first(`[role="group"][aria-label="${declarationCopy.ask.groupAria}"]`), side: "gutter" },
          // 2: the climb, whose figures state and never open.
          { n: 2, find: first('[data-testid="climb-rung"]'), side: "gutter", align: "top" },
          // 3: the date line, which is what says a reading predates the deck's changes.
          { n: 3, find: first('[data-testid="verdict-analyzed"]'), side: "gutter" },
          // 4: the line under the face. A range asks here; a single bracket's lean sits here.
          { n: 4, find: withText("p", deckAnalysisCopy.verdict.intentHigh, true), side: "gutter", align: "top" },
        ]}
      >
        <div className="flex flex-col gap-[22px]">
          <VerdictBlock
            verdict={verdict}
            profile={profile}
            analyzedAt={analyzedAt}
            versionNumber={version}
            declaration={{ declared: null, version, previous: null, onDeclare: () => {}, refused: false }}
          />
          <BracketClimb verdict={verdict} profile={profile} locked={new Set()} />
        </div>
      </AnchoredNumerals>
    </CardDetailProvider>
  );
}

/**
 * `card-marks` — the decklist's mark key above two real `DecklistRow`s.
 *
 * The key's entries come from `buildMarkKeyEntries`, the decklist's own rule, over these two
 * rows: a deck is a closed set, so the key glosses only the marks its rows draw. Mass land denial
 * is on neither row and is therefore not in the key; the caption names it.
 */
export function CardMarksFigureBody() {
  const marks = buildMarkKeyEntries({ cards: CARD_MARK_ROWS, filter: "all", inCardView: false });
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <AnchoredNumerals
        gutter
        marks={[
          // 1: the tutor mark, on the card whose search can find anything.
          { n: 1, find: first('svg[role="img"][data-testid="card-fact-tutor"]'), side: "gutter" },
          // 2: a row carrying one mark, and so silent about the other three.
          { n: 2, find: first('svg[role="img"][data-testid="card-fact-extraTurns"]'), side: "gutter" },
          // 3: the key, which names each fact and counts none of them.
          { n: 3, find: first('[role="group"]'), side: "gutter" },
        ]}
      >
        <div className="flex flex-col gap-[10px]">
          <MarkKey marks={marks} />
          <div className="flex flex-col">
            {CARD_MARK_ROWS.map((card) => (
              <DecklistRow
                key={card.oracleId}
                deckId="about-figure"
                card={card}
                siblings={[]}
                newestAsOf={PRICES[0].fact.asOf}
              />
            ))}
          </div>
        </div>
      </AnchoredNumerals>
    </CardDetailProvider>
  );
}

/**
 * `roles` — the deck page's own `RoleCounterStrip`.
 *
 * The page drew a three-row legend here, with a note saying the strip could
 * not be mounted because it "would need a deck". It does not: the strip takes
 * `cards` and folds them with `computeRoleCounts`, which reads `role` and
 * `quantity` and nothing else. Five rows state the five counts.
 *
 * `onSeeShelf` and `rolesWithShelves` arrive together or not at all — the
 * strip's own contract, because supplying the handler alone disables every
 * short cell rather than failing. They are supplied so the short cells draw
 * their `consider →`, which the canvas draws and which a strip with no
 * handler would silently omit. The handler is a no-op: `Specimen` is `inert`,
 * so no cell can be pressed.
 *
 * It lives in this client module rather than beside the other server figures
 * for that handler alone — a function cannot cross the server boundary, and
 * the one that tried it is why this module exists.
 */
// The baseline mix, CALLED rather than copied. A literal here agrees only with itself: the
// About test asserts the labels and the source line against its own `recommendedMix(null,
// false)` and never the targets, so a transcribed 10/10/8/3/37 would keep drawing those
// numbers on the day `FLAT_TARGETS` moves, with nothing failing. Client-safe — `mix.ts`
// imports `deck-size` and a type, and no database.
const SPECIMEN_MIX: RecommendedMix = recommendedMix(null, false);

/**
 * A MEASURED mix, against the asserted one the roles figure draws.
 *
 * The specimen beside it is the same strip with `measured: false`, and the pair is the entry:
 * before, every deck was told 10 ramp, 10 draw, 8 removal, 3 wipes and 37 lands whatever it was
 * led by. These are real figures from the index — Kinnan wants twice the ramp and no wipes at
 * all — and the source line says EDHREC rather than "a common starting point" because they came
 * from somewhere.
 *
 * Hand-built rather than resolved: the About page has no commander and no deck, and a figure
 * that fetched one would make a page of prose depend on a database read.
 */
const MEASURED_MIX: RecommendedMix = {
  cells: {
    ramp: { label: "Ramp", target: 20, advisory: false },
    draw: { label: "Draw", target: 8, advisory: false },
    removal: { label: "Removal", target: 10, advisory: false },
    wipes: { label: "Wipes", target: 0, advisory: false },
    land: { label: "Land", target: 28, advisory: true },
  },
  types: null,
  measured: true,
};

export function InformedBuildFigureBody() {
  return (
    <AnchoredNumerals
      marks={[
        // 1: the land cell, measured at 28. 2: the wipes cell, whose target of 0 is an answer.
        { n: 1, find: byAriaPrefix('section[aria-label="Recommended mix"]', "Land"), side: "above", mdSide: "inset-tr" },
        { n: 2, find: byAriaPrefix('section[aria-label="Recommended mix"]', "Wipes"), side: "above", mdSide: "inset-tr" },
      ]}
    >
      <RoleCounterStrip
        mix={MEASURED_MIX}
        cards={ROLE_MIX_CARDS}
        onSeeShelf={() => {}}
        rolesWithShelves={new Set(["draw", "removal"])}
      />
    </AnchoredNumerals>
  );
}

/**
 * The card modal's combo block, with one partner in each of its three states.
 *
 * The block is the one surface in this feature that ENUMERATES, so it is the specimen that
 * shows what the feature is: a pair fact, three readings of where the other half is, and no
 * count anywhere. The inline clause the lists draw is one line of the same idea.
 *
 * REAL PARTNERS OF A REAL CARD, read off the shipped index rather than invented: Basalt
 * Monolith records twelve two-card partners producing something unbounded, and these are
 * three of them. Only the STATES are chosen, so all three appear at once.
 *
 * The first version made the subject its own partner — `Isochron Scepter` listed among
 * `Isochron Scepter`'s partners — which is a relationship the data can never return, since a
 * card is the subject and cannot be its own other half. The block does not draw the subject's
 * name, so nothing on screen contradicted itself and it would have taught the wrong shape
 * quietly.
 */
const COMBO_SPECIMEN = [
  { oracleId: "a", name: "Power Artifact", state: "inDeck" as const, popularity: 900 },
  { oracleId: "b", name: "Rings of Brighthearth", state: "owned" as const, popularity: 800 },
  { oracleId: "c", name: "Kinnan, Bonder Prodigy", state: "notOwned" as const, popularity: 700 },
];

export function ComboAwarenessFigureBody() {
  const c = comboAwarenessCopy.modal;
  return (
    <AnchoredNumerals
      gutter
      marks={[
        // 1: the heading, which carries no count. 2: the list of every partner. 3: its last row,
        // the one you would have to buy, at the far end of the order. 4: Spellbook's marker.
        { n: 1, find: withText("span", c.heading), side: "gutter" },
        { n: 2, find: first("ul"), side: "gutter", align: "top" },
        { n: 3, find: first("ul > li:last-child"), side: "gutter" },
        { n: 4, find: first(`button[aria-label="${c.boundMarkerAria}"]`), side: "after" },
      ]}
    >
      <ComboPartnersDetail
        card={
          {
            oracleId: "about-combo",
            name: "Basalt Monolith",
            comboPartners: COMBO_SPECIMEN,
          } as never
        }
        // Open, because key 4 names the Spellbook marker, which the block draws only open.
        initiallyExpanded
      />
    </AnchoredNumerals>
  );
}

export function RolesFigureBody() {
  return (
    <AnchoredNumerals
      marks={[
        // 1: ramp over its recommendation, a surplus. 2: wipes short of it, with a shelf.
        { n: 1, find: byAriaPrefix('section[aria-label="Recommended mix"]', "Ramp"), side: "inset-br", mdSide: "inset-tr" },
        { n: 2, find: byAriaPrefix('section[aria-label="Recommended mix"]', "Wipes"), side: "above", mdSide: "inset-tr" },
      ]}
    >
      <RoleCounterStrip
        // A FIXTURE mix, because this is a specimen of the strip rather than a real deck: the
        // page has no commander to resolve one for, and the figures exist to show the cells.
        // `measured: false` keeps the source line honest — the specimen quotes EDHREC at nobody.
        mix={SPECIMEN_MIX}
        cards={ROLE_MIX_CARDS}
        onSeeShelf={() => {}}
        rolesWithShelves={new Set(["wipes", "land"])}
      />
    </AnchoredNumerals>
  );
}

/**
 * `decklist-order` — the decklist's own `GroupToggle`.
 *
 * The legend here spelled four labels out of `deck-sort.ts`: the two
 * groupings, then Name, Mana value and Price. The bar those labels live on is
 * one component, and it answers the caption directly — the two section pills
 * side by side, and the order control beside them reading the live order back.
 *
 * `filter` is `shopping` deliberately. The caption's last clause is that price
 * joins the orders on the shopping filter, where money is the question being
 * asked, and that clause is about WHICH FILTER IS OPEN. A bar drawn on All
 * would illustrate the half of the sentence that excludes the other half.
 *
 * The order control's options sit behind a closed panel, which is where the
 * app keeps them. This figure draws the bar, not the sheet.
 *
 * Every handler is a no-op under `Specimen`'s `inert`. `shoppingCards` is
 * required rather than defaulted — an empty list renders the price strip with
 * no buy link — so it carries the two rows the Shopping count claims.
 */
export function DecklistOrderFigureBody() {
  return (
    <GroupToggle
      allCount={99}
      shoppingCount={2}
      filter="shopping"
      grouping="role"
      onFilterChange={() => {}}
      onGroupingChange={() => {}}
      view="list"
      onViewChange={() => {}}
      shoppingCards={[
        { name: "Dockside Extortionist", quantity: 1 },
        { name: "Cyclonic Rift", quantity: 1 },
      ]}
      sort={{ key: "price", direction: "desc" }}
      onSortChange={() => {}}
    />
  );
}

/**
 * `add-cards` — the Add panel itself.
 *
 * The figure drew the panel's RESULT ROWS and nothing else, which left the
 * caption's first clause — search what you own or all of Magic — with nothing
 * to point at. `QuickAddBar` is the whole panel: the field, the
 * owned-only toggle, and the list under them.
 *
 * It could not simply be mounted, because its rows come from `useCardSearch`
 * reaching a server action and that hook asks nothing under two characters —
 * so the bar drew a field over an empty list. Two props fix that and both
 * default to what every real mounting wants: `initialQuery` seeds the field,
 * and `search` takes the resolver. The second is the same shape and the same
 * reason as `CardDetailProvider`'s `fetchCard`, which this file already uses
 * three times over.
 *
 * The three rows are unchanged and still carry the caption's second sentence:
 * one owned, one not, and one a committed deck is holding — which still adds,
 * arriving with the mark that says so.
 */
// Module constants, not literals in the render below. `useCardSearch` lists
// `colorIdentity` in its effect dependencies and compares by identity, so a
// fresh array from every render of this figure would restart the debounce each
// time the resolver settled — a search every 150ms, for as long as the page is
// open. It does not happen today, because nothing re-renders this figure and a
// prop is only rebuilt when its PARENT renders: measured at one resolver call
// in 1.2s, and `add-cards-stable.test.tsx` pins that. Hoisting removes the trap
// rather than fixing a live hang, and costs nothing.
const ADD_IDENTITY = ["W", "U"];
// Honours its own `ownedOnly` argument rather than ignoring it. A resolver
// that returned the same three rows under either filter would draw a panel
// whose toggle contradicts its list — and the figure below turns the toggle
// OFF, because one of those rows is a card the player does not own and `Owned
// only` could never have produced it.
const ADD_SEARCH = async (
  _query: string,
  _identity: string[] | null,
  ownedOnly: boolean,
) => (ownedOnly ? ADD_RESULTS.filter((r) => r.owned) : ADD_RESULTS);

const NO_COMBOS = async () => ({});

export function AddCardsFigureBody() {
  return (
    <QuickAddBar
      deckId="about-figure"
      commanderIdentity={ADD_IDENTITY}
      deckOracleIds={[]}
      commanderShortName={DECK_SPINE.deck.commander.name.split(",")[0]}
      commanderOracleId={DECK_SPINE.deck.commander.oracleId}
      // Two characters is `useCardSearch`'s own floor for asking anything, so
      // a bar taking the default draws a field over an empty list — which is
      // the one thing this entry is not about.
      initialQuery="so"
      // `All of Magic`. The list below holds a card the player does not own,
      // which `Owned only` cannot return — and the caption's first clause is
      // about searching both.
      initialOwnedOnly={false}
      // The resolver, rather than the server action. Same shape and same
      // reason as `CardDetailProvider`'s `fetchCard`: a reference page has no
      // business reaching a server action, and these three rows are chosen to
      // say what the caption says.
      search={ADD_SEARCH}
      // Same rule for the combo map: an empty one, so the figure draws no partner — this
      // entry is about searching, and the combo entry says what a partner means.
      loadComboMap={NO_COMBOS}
      // No declaration and nothing counted: every result states `facts: null`, so no note
      // draws and these two are never read. See `ADD_RESULTS`.
      declaredBracket={null}
      noteCounts={EMPTY_NOTE_COUNTS}
    />
  );
}

/**
 * `undo-removal` — a decklist with one spent slot.
 *
 * The figure was three legend rows quoting `undo.removed`, `undo.action` and
 * the review screen's `restore.cta`. The first two are one control, and the
 * control is what the entry is about: a row that has become its own receipt.
 *
 * `DecklistRow` draws it on `spent`, which is decklist state rather than row
 * state — so the figure asks for it the way the decklist does. The rows
 * either side are ordinary, because the caption's verb is TURNS INTO: a
 * receipt shown alone is a component, and a receipt between two live rows is
 * the thing that happened to one of them.
 *
 * The review screen's `Put back` is deliberately NOT drawn. The R4 note on
 * this entry rules it a second door, named in the caption rather than shown,
 * because R3 drew one wearing the other's label.
 */
export function UndoRemovalFigureBody() {
  // Hugh's call, 2026-09-19: the over-committed row was distracting here. A
  // red edge and a `short 2` beside a receipt invite the reader to connect
  // them, and they are unrelated — this entry is about the undo and nothing
  // else. The rows either side are the two plainest in the fixture: one free,
  // one whose only distinguishing field is a draft move — and there is no
  // `PendingChangeProvider` here, so it draws no edge either. Both are fully
  // owned with no obstacle mark, which is what the entry needs beside a
  // receipt.
  const above = DECKLIST_MARK_ROWS[0];
  const spent = DECKLIST_MARK_ROWS[1];
  const below = DECKLIST_MARK_ROWS[3];
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex flex-col">
        {[above, spent, below].map((card, i) => (
          <DecklistRow
            key={card.oracleId}
            deckId="about-figure"
            card={card}
            siblings={[]}
            spent={i === 1}
            newestAsOf={PRICES[0].fact.asOf}
          />
        ))}
      </div>
    </CardDetailProvider>
  );
}

/**
 * `deck-import` — the import route's own entry surface.
 *
 * The figure was three legend rows naming the two mode labels and the update
 * route's entry label. `ImportEntry` is the surface those labels live on, it
 * takes no props, and it is what `/decks/import` renders — so the entry can
 * show its own door rather than a list of the words on it.
 *
 * `compact` drops the route's page furniture — its heading and subtitle,
 * which the entry above the figure already says in its own words, and a paste
 * box at 300px with nothing in it. At full size the figure measured 1000px,
 * taller than the viewport: a page rather than a picture of one. The canvas
 * draws the same crop.
 *
 * Nothing here can be typed into or submitted: `Specimen` is `inert` and
 * carries `pointer-events: none`, so the component's own actions are
 * unreachable.
 */
export function DeckImportFigureBody() {
  return <ImportEntry compact />;
}


/**
 * `export` — the export dialog itself, drawn as a specimen.
 *
 * It was a three-row legend for a real reason: `ExportDialog` locks body
 * scroll and traps focus, and a figure doing that on `/about` would lock that
 * page's own scroll and swallow the reader's Tab. Hugh overruled the
 * precedent on 2026-09-19, so the dialog takes an `inert` prop that suppresses
 * every one of those behaviours — see `useDialogA11y`'s own note for why that
 * is not a general escape hatch.
 *
 * The fixture is three body lines against a 99-card deck, so the preview's
 * `… 96 more` tail is a real fold rather than a number typed here. The
 * shopping list is the two cards the caption's key line is about: one not
 * owned, and one owned whose copies another deck is already holding.
 */
export function ExportFigureBody() {
  return (
    // The dialog is `position: fixed`, so mounted plainly it resolves against
    // the VIEWPORT and covers the whole page rather than sitting in the
    // figure. A `transform` on an ancestor makes that ancestor the containing
    // block for fixed descendants, which is what pins it inside this box —
    // page-side styling rather than a second production change, since where
    // the real dialog positions itself is correct and only this one caller
    // wants it somewhere else.
    //
    // The height is stated because the contained dialog centres itself in its
    // container, and a container sized by a scrim with no intrinsic height is
    // zero.
    // THE HEIGHT IS THE DIALOG'S OWN, PER WIDTH, and it has to be: the phone
    // draws a bottom SHEET anchored to its container's foot at a fixed 590px
    // (`export-dialog.tsx`), so a 470px frame clipped 120px off its TOP — the
    // title and both tabs — and left key line 1 pointing at a control that was
    // not on screen. Desktop centres a 470px dialog instead. The breakpoint is
    // `md:` because that is where the dialog itself switches, not the page's
    // own wide stop.
    <div className="relative h-[590px] overflow-hidden rounded-[8px] [transform:translateZ(0)] md:h-[470px]">
      {/* 1: the Shopping list tab. 2: the Mana Pool link. 3: Download .txt, the twin of Copy. The
          wrapper fills the box, so the numerals share the dialog's origin. */}
      <AnchoredNumerals
        className="h-full"
        marks={[
          { n: 1, find: withText("button, [role=tab]", exportTabCopy.shopping, true), side: "after" },
          { n: 2, find: withText("a", exportLinkOutCopy.shopping, true), side: "before" },
          { n: 3, find: withText("button", ".txt", true), side: "above" },
        ]}
      >
      <ExportDialog
        inert
        open
        // The SHOPPING tab, not the default: both of this entry's first two
        // key lines are about it, and `Buy these at Mana Pool` renders on that
        // tab alone. Opening on the decklist would draw a dialog whose two
        // annotations point at a control that is not on screen.
        initialTab="shopping"
        onClose={() => {}}
        deckName={DECK_SPINE.deck.name}
        commanderName={DECK_SPINE.deck.commander.name}
        partnerName={null}
        decklistCards={EXPORT_DECKLIST}
        shoppingCards={EXPORT_SHOPPING}
      />
      </AnchoredNumerals>
    </div>
  );
}

/**
 * `shopping` — the Shopping filter's own rows.
 *
 * The canvas draws a "SPOKEN FOR" panel with two priced rows and a library
 * total. That panel is a DIAGRAM of the idea rather than a surface: no route
 * renders it. The library-wide total it ends with is real, but the app draws
 * that in `CommitmentsCard`, which is already mounted whole as chapter 04's
 * `commitments` figure — putting it here too would teach a reader that there
 * are two of them.
 *
 * So the figure draws the half that IS a surface and that the caption's
 * load-bearing sentence is about: a card you own can be on this list. Both
 * rows go through `DecklistRow` with `inShopping`, which is how `/decks/[id]`
 * draws them under the Shopping filter.
 *
 * The second row is the whole point. `isShoppingCard` puts an OWNED card on
 * the list when its availability reads `over` — every copy claimed by a
 * committed deck — and `deckRowTag` then answers `buy` for it through
 * `spokenFor`. A figure of unowned rows alone would draw two buy tags and
 * substantiate nothing.
 */
export function ShoppingFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex flex-col">
        {SHOPPING_ROWS.map((card, i) => (
          <DecklistRow
            key={card.oracleId}
            deckId="about-figure"
            card={card}
            siblings={[]}
            inShopping
            // The Shopping view's EDHREC figure. `undefined` would be the All
            // view, which is not the list this entry is about; `null` is the
            // view with no figure for that card, which is a real state of it.
            shoppingFigure={i === 0 ? 34 : null}
            newestAsOf={PRICES[0].fact.asOf}
          />
        ))}
      </div>
    </CardDetailProvider>
  );
}

/**
 * `versions` — the deck's own version rail.
 *
 * The figure was six legend rows: three naming a phase (`draft`, `v2 ·
 * current`, `v1`) and three drawing the deck-state badge. The first three were
 * the rail's own rows written out as words. The last three went with the
 * feature: #738 removed those marks from the app, so main had already dropped
 * them from this figure before this branch rebased onto it.
 *
 * `VersionRail` marks the newest row `current` from its own index, so the
 * fixture states no such field — passing one would be this page deciding
 * something the rail decides.
 *
 * Drawn CLOSED, which is what the tab renders on arrival: a row's diff is
 * fetched when that row opens (`probe:versions` asserts exactly that), and a
 * reference page opens nothing.
 *
 * The canvas draws a `Review and commit` bar above the rows. The app's control
 * reads `Review N changes` (`deckVersioningCopy.reviewCta`) and lives on the
 * deck page rather than the Versions tab, so it is not drawn here.
 */
export function VersionsFigureBody() {
  return (
    <AnchoredNumerals
      gutter
      marks={[
        // 1: the older version's meta line, which carries its games on a wide screen. 2: the
        // newest version's note.
        { n: 1, find: nth("span.block.font-mono", 1), side: "gutter" },
        { n: 2, find: withText("span", DECK_VERSIONS[0].note ?? "", true), side: "gutter" },
      ]}
    >
      <VersionRail deckId="about-deck" versions={DECK_VERSIONS} />
    </AnchoredNumerals>
  );
}

/**
 * `log-a-game` — the game log form, open.
 *
 * The figure was three legend rows naming the result words, the axis count and
 * the form's own optional note. All three are things the form SAYS, and it is
 * a real surface reached from a deck's Games tab.
 *
 * `initialOpen` starts it expanded. Logging a game begins with a press
 * everywhere a player meets this, so the prop defaults to false; here the
 * collapsed button would show the door rather than the room, and this entry's
 * caption is entirely about the fields inside.
 *
 * `isFirstGame` is true, which is the state whose copy explains itself most:
 * the form introduces the axes rather than assuming them.
 */
export function LogAGameFigureBody() {
  return (
    // Measured against the form's own parts rather than fixed offsets: the offsets were right
    // at 1300 and wrong at 390, where the form restacks. 1: the pod-size row. 2: the note field.
    // 3: the second column of axes, the same eight as the first.
    <AnchoredNumerals
      marks={[
        { n: 1, find: first('[aria-labelledby="game-pod-label"]'), side: "after" },
        {
          n: 2,
          find: (r) => {
            const label = withText("label", deckTuningCopy.note.label, true)(r);
            const id = label?.getAttribute("for");
            return id ? r.querySelector(`[id="${id}"]`) : null;
          },
          side: "inset-tr",
        },
        { n: 3, find: nth("fieldset", 1), side: "inset-tr" },
      ]}
    >
      <GameLogForm
        deckId="about-figure"
        isFirstGame
        initialOpen
        onSaved={() => {}}
        onAnnounce={() => {}}
      />
    </AnchoredNumerals>
  );
}

/**
 * `resume` — Home's own resume block.
 *
 * The figure was three legend rows quoting `touched.edited`, `.committed` and
 * `.played` directly. That arrangement cannot be wrong and cannot be right:
 * the block CHOOSES its verb by ranking three stamps, so a figure that types
 * the three strings keeps printing them after the ranking changes.
 *
 * The fixture states dates instead and lets `ResumeDecks` decide the words —
 * one deck edited two hours ago, one whose newest event is its commit, one
 * played since either. `RESUME_NOW` is the page's clock rather than the real
 * one, so a screenshot of this page does not differ from the last for no
 * reason.
 */
export function ResumeFigureBody() {
  return (
    <ResumeDecks
      decks={RESUME_DECKS}
      shopping={SHOPPING}
      total={RESUME_DECKS.length}
      now={RESUME_NOW}
    />
  );
}

/**
 * `folders` — the deck list's own shelf line.
 *
 * The figure was three legend rows, one of which was the phrase "narrows,
 * never filters" — this page's paraphrase of a treatment rather than the
 * treatment. The line says it itself, and says it the way the handoff's
 * decision 3 requires: the selected segment spends NO ACCENT, taking `--fg` on
 * `--elevated` under a ring, because accent is the chassis's own "this filter
 * is on". A figure that writes the sentence cannot show that; one that draws
 * the line cannot avoid it.
 *
 * A folder is selected rather than `All decks`, for the same reason: the
 * unselected state is what every segment looks like, and the ruling is about
 * what the SELECTED one does not do.
 *
 * `menu` returns null throughout. The selected folder's `…` is a real control
 * on the route, and its absence here is deliberate — `Specimen` is `inert`, so
 * a menu drawn in a figure is an affordance that cannot be opened.
 */
export function FoldersFigureBody() {
  return (
    <ShelfLine
      folders={DECK_FOLDERS}
      counts={SHELF_COUNTS}
      shelf={DECK_FOLDERS[0].id}
      onSelect={() => {}}
      onCreate={() => {}}
    />
  );
}

/**
 * `reservations` — the contested-card row itself.
 *
 * The figure was two legend rows: the phrase "first committed" — which is this
 * page's summary of the rule rather than anything the app prints — and the
 * chooser's heading with no chooser under it. The row is the rule: two decks,
 * one copy, seniority deciding until the player picks.
 *
 * It is drawn with no `thisDeckId`. That prop tags the deck whose page the row
 * is on, and a figure has no such page — passing one would mark a deck
 * "this one" in a picture with no deck behind it.
 */
export function ReservationsFigureBody() {
  return <ContestedCardRow card={CONTESTED_RESERVATION} />;
}

/**
 * `themes` — the six tiles, as the picker draws them, with the reader's own
 * theme ticked.
 *
 * The figure drew its own tile: three coloured swatches over a name. The
 * picker draws a MINIATURE OF THE APP — a panel with `99` set in that theme's
 * display face, an accent bar, and the chrome beside it — which is the entry's
 * subject far better than three rectangles, because the claim is that a theme
 * changes the palette and not the meaning.
 *
 * `ThemeMiniature` and `themeInForce` are the picker's own, exported rather
 * than copied. THE TICK IS THE READER'S: `themeInForce` reads
 * `document.documentElement.dataset.theme`, which `applyTheme` writes, so the
 * figure marks whichever theme the page is actually being read in. A server
 * render cannot know it, so the tick appears after hydration — which is the
 * same thing the picker itself does.
 */
export function ThemesFigureBody() {
  // `useSyncExternalStore`, not an effect that sets state: the server has no
  // document, so the tick cannot be rendered on the server — and setting state
  // synchronously inside an effect is the cascading-render pattern the lint
  // rule forbids. The server snapshot is null, which is "no tick", so the
  // markup React sends and the first client paint agree.
  //
  // Nothing subscribes: `applyTheme` writes the attribute and the picker lives
  // in a menu that unmounts, so there is no event to listen for. A reader who
  // changes theme with this page open gets the whole page repainted by the
  // attribute anyway; the tick catches up on the next render.
  const active = useSyncExternalStore(
    () => () => {},
    () => themeInForce(THEMES[0].key),
    () => null,
  );
  return (
    // 1: the first tile's subtitle, its plane. 2: the second tile's miniature, whose accent is
    // the one color that moves. 3: the tile in force, remembered in this browser.
    <AnchoredNumerals
      className="grid grid-cols-3 gap-[10px] min-[1000px]:grid-cols-6"
      marks={[
        { n: 1, find: first("[data-theme-tile] [data-theme-short]"), side: "after" },
        { n: 2, find: nth("[data-theme-tile]", 1), side: "inset-tl" },
        // On the tile's name rather than its corner, where the miniature draws its own tick.
        { n: 3, find: first('[data-theme-tile="active"] [data-theme-name]'), side: "after" },
      ]}
    >
      {THEMES.map((theme) => (
        <div
          key={theme.key}
          data-theme-tile={theme.key === active ? "active" : ""}
          // The selected tile takes the PICKER'S OWN treatment, not just the
          // tick: `bg-[--elevated]` under a 1px accent outline, which is what
          // the account menu draws. The tick alone reads as a stray mark at
          // this size, and the two together are one state.
          className={`flex flex-col gap-[6px] rounded-[10px] p-[5px] ${
            theme.key === active
              ? "bg-[color:var(--elevated)] outline outline-1 outline-[color:var(--accent)]"
              : ""
          }`}
        >
          <ThemeMiniature theme={theme.key} compact={false} selected={theme.key === active} />
          <span data-theme-name className="self-start text-[12.5px] leading-[1.2] text-[color:var(--fg)]">{theme.name}</span>
          {/* The plane is the SUBTITLE, never the label: you pick Neon Rain,
              not Kamigawa, and an earlier figure had them the other way up.
              `short`, which is what the picker draws — the full plane name is
              "Kamigawa: Neon Dynasty" where the app says "Kamigawa". */}
          <span data-theme-short className="self-start font-mono text-[10px] text-[color:var(--fg-faint)]">{theme.short}</span>
        </div>
      ))}
    </AnchoredNumerals>
  );
}

/**
 * `log-findings` — the Games tab's own aggregate.
 *
 * The figure drew two `GameAxisCell`s in a column, with the bucket passed in
 * as a prop. That is a cell, not a finding: the entry is about the tab
 * SORTING what it has seen into what to fix and what to keep, and two cells
 * side by side sort nothing. Both of its key lines pointed at parts the figure
 * did not draw — the heading that describes under three games, and the Mixed
 * line for anything that has cut both ways.
 *
 * `GameFindings` is the panel's own aggregate block, extracted so this page
 * can draw it. It takes a summary and nothing else, which is what made the
 * extraction safe — the panel around it holds a deck id, a form,
 * announcements and a history, and none of them reach into this block.
 */
export function LogFindingsFigureBody() {
  // The tab's own heading above the findings, because key 1 is about the heading: without it
  // the key named a thing the figure did not draw.
  const headline = deriveHeadline(GAME_SUMMARY);
  return (
    // 1: the heading. 2: the Mixed line, the one axis stated rather than filed.
    <AnchoredNumerals
      gutter
      marks={[
        { n: 1, find: first("h3"), side: "gutter", align: "top" },
        { n: 2, find: withText("span", gameLogCopy.buckets.mixed), side: "gutter" },
      ]}
    >
      {headline && <GameHeadlineHeader headline={headline} count={GAME_SUMMARY.count} />}
      <GameFindings summary={GAME_SUMMARY} />
    </AnchoredNumerals>
  );
}

/**
 * `proxies` — the mark, and the control that sets it.
 *
 * The figure drew the `P` tag and two sentences of this page's own prose. It
 * showed what a proxy LOOKS like on a row and never where one is made, which
 * Hugh asked for on 2026-09-19: `ProxyControl` is the tick in the card sheet,
 * and it is the one surface the entry's first clause — "mark a card as one you
 * are printing" — is actually about.
 *
 * Drawn MARKED. The unmarked state is a bare tick beside a label and says
 * nothing; marked, the control prints its own second clause — the deck's slot
 * is filled, and nothing is claimed from your collection — which is the whole
 * distinction the entry exists to make.
 *
 * The row above it stays, because the two answer different halves: the control
 * is where the mark is set, the row is what it does to the list afterwards.
 */
export function ProxiesFigureBody() {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-center gap-[8px]">
        <ProxyTag variant="row" />
        <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
          leaves the buy list without joining your collection
        </span>
      </div>
      <div className="border-t border-solid border-[color:var(--border)] pt-[12px]">
        <ProxyControl
          deckId="about-figure"
          deckName={DECK_SPINE.deck.name}
          oracleId={CARDS.proxied}
          cardName={CARDS.proxied}
          proxied
          onSaved={() => {}}
        />
      </div>
    </div>
  );
}

/**
 * `review-and-commit` — the review page's `Coming in` column.
 *
 * `Column` is exported for this. The route is ~1,100 lines and every
 * chapter-03 figure that tried to draw a whole one was cropped; this column is
 * the slice carrying what no other route has — the four-bucket breakdown,
 * `Pull it`, and both pull guards.
 *
 * `claimsKnown` is true, deliberately. False is the degraded reading where the
 * claim query failed, every bucket goes null and no row can draw a control —
 * which is a real state and the wrong one to teach here.
 *
 * `contested` is empty and `onRestore` is null: the chooser belongs to the
 * contested rows, which `reservations` draws, and a column of adds has nothing
 * to put back.
 */
export function ReviewAndCommitFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      {/* 1: the breakdown beside `Coming in`. 2: the row carrying Pull it. 3: the row whose copy
          another deck holds as its commander, which says so and offers no control. */}
      <AnchoredNumerals
        gutter
        marks={[
          { n: 1, find: withText("span, p", deckVersioningCopy.review.groupInBreakdown(5, 3, 1)), side: "gutter", mdSide: "before" },
          { n: 2, find: withText("button", deckVersioningCopy.review.pull), side: "before" },
          { n: 3, find: withText("span", deckVersioningCopy.review.commanderGuardTag), side: "before" },
        ]}
      >
      <Column
        deckId="about-figure"
        columnKey="in"
        // The figure draws ONE column where the route draws a pair, so
        // `phoneHeading` is true: it tells the column that no segmented control
        // is naming the direction above it and the heading has to. The
        // description id ties the column to the caption a reader tabbing
        // straight into it would otherwise never meet.
        descriptionId="about-review-in"
        hiddenOnPhone={false}
        phoneHeading
        heading={deckVersioningCopy.review.groupIn(9)}
        headingTone="var(--success)"
        note={deckVersioningCopy.review.groupInBreakdown(5, 3, 1)}
        rows={REVIEW_IN_ROWS}
        contested={[]}
        siblings={[]}
        claimsKnown
        newestAsOf={PRICES[0].fact.asOf}
        onPulled={() => {}}
        onRestore={null}
        restoreErrors={{}}
      />
      </AnchoredNumerals>
    </CardDetailProvider>
  );
}

/**
 * `new-deck` — the commander picker.
 *
 * Design's R5 picks the PICKER over the pre-filled door, and the argument is
 * the one that decided it: the pre-filled door is the same act with the list
 * already answered, reached by having chosen on a surface chapter 02 covers.
 * An entry drawn on it would teach the shortcut and leave the front door
 * undocumented; drawn on the picker, the shortcut is one caption clause.
 */
export function NewDeckFigureBody() {
  return (
    // CONTAINED, for the reason the export figure is: the picker's phone
    // layout pins its selection dock with `position: fixed`, which resolves
    // against the VIEWPORT and so escaped the figure — it painted at the
    // window's full width, 16px past the frame, and sat over the app's own tab
    // bar. A `transform` on an ancestor makes that ancestor the containing
    // block for fixed descendants, so the dock lands at the foot of the figure
    // where the route puts it at the foot of the page.
    //
    // Desktop needs none of this — the dock is phone-only and the two-column
    // arrangement is in flow — so the height is phone-only too and desktop
    // sizes to its content.
    <div className="relative h-[680px] overflow-hidden [transform:translateZ(0)] md:h-auto md:transform-none">
      {/* Kotis chosen, per Design's fixture. The empty state draws `No
          commander selected` over a disabled button, which is the surface
          BEFORE anything happens rather than the one the caption describes —
          and it leaves the name field and `Create deck →` undrawn, which are
          two of the three things the entry's key lines are about. */}
      {/* 1: the first commander in the list, which holds only what you own. 2: its pool figure.
          3: the deck's name, the one thing asked for. Inside the clip, so the gutter is not cut. */}
      <AnchoredNumerals
        gutter
        marks={[
          { n: 1, find: first("ul button[aria-pressed]"), side: "gutter", align: "top" },
          { n: 2, find: leafMatching("ul button[aria-pressed]", /\d+ cards$/), side: "gutter" },
          { n: 3, find: first("#picker-deck-name, #picker-deck-name-mobile"), side: "gutter", mdSide: "before" },
        ]}
      >
        <CreatePicker
          legalCommanders={CREATE_COMMANDERS}
          initialSelectedId={CREATE_COMMANDERS[1].oracleId}
        />
      </AnchoredNumerals>
    </div>
  );
}

/**
 * `locked-cards` — the same three rows twice: at rest, where a locked row shows its lock beside
 * the ✕, and in the Lock cards mode, where every row's ✕ slot is the toggle. The mode's line and
 * `Done` sit above the second set, as they sit above the list on the deck page.
 *
 * Both are the deck page's own components (exported for this figure, unchanged), and the lock
 * state is a fixture value for `LockCardsProvider`. `toggle` is a no-op: `Specimen` is `inert`,
 * so nothing here can be pressed.
 */
const LOCKS_AT_REST: LockCards = { mode: false, toggle: () => {}, pending: new Set(), errors: new Map() };
const LOCKS_IN_MODE: LockCards = { ...LOCKS_AT_REST, mode: true };
const LOCKED_COUNT = LOCKED_ROWS.filter((c) => c.locked).length;

function LockedRows() {
  return (
    <div className="flex flex-col">
      {LOCKED_ROWS.map((card) => (
        <DecklistRow
          key={card.oracleId}
          deckId="about-figure"
          card={card}
          siblings={[]}
          newestAsOf={PRICES[0].fact.asOf}
        />
      ))}
    </div>
  );
}

export function LockedCardsFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <AnchoredNumerals
        gutter
        className="flex flex-col gap-[14px]"
        marks={[
          // 1: the closed lock at rest. 2: Lock cards, drawn as its Done. 3: the mode's count.
          { n: 1, find: first('[data-testid="row-lock-mark"]'), side: "gutter" },
          { n: 2, find: withText("button", lockedCardsCopy.mode.done), side: "before" },
          { n: 3, find: first('[data-testid="lock-mode-line"] span.font-mono'), side: "after" },
        ]}
      >
        <LockCardsProvider value={LOCKS_AT_REST}>
          <LockedRows />
        </LockCardsProvider>
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-[8px] border-b border-solid border-[color:var(--border)] pb-[8px]">
            <LockModeLine count={LOCKED_COUNT} />
            <LockModeButton lockMode onToggle={() => {}} />
          </div>
          <LockCardsProvider value={LOCKS_IN_MODE}>
            <LockedRows />
          </LockCardsProvider>
        </div>
      </AnchoredNumerals>
    </CardDetailProvider>
  );
}

/**
 * `change-commander` — the door on the commander's art band, then one candidate under each of
 * the sheet's two groups.
 *
 * The band carries the route's own art placeholder rather than an image: a reference page does not
 * fetch commander art. The door is drawn with its card-details half (`hasCrop`), as it sits on a
 * deck whose commander has art, which is nearly every deck. The rows and headings are the sheet's
 * own (E2); the sheet itself is not mounted, because it reads its candidates when it opens.
 */
const NAYA = ["R", "G", "W"];

export function ChangeCommanderFigureBody() {
  const desktop = useIsDesktop();
  const { deckName, current, yours, inDeck, toBuy } = CHANGE_COMMANDER;
  const siblings = [yours, inDeck, toBuy].flatMap((c) => c.halves.map((h) => h.oracleId));
  const row = (c: typeof yours) => (
    <CandidateRow
      candidate={c}
      pair={false}
      current={current}
      newestAsOf={PRICES[0].fact.asOf}
      siblings={siblings}
      open={false}
      onToggle={() => {}}
      onChoose={() => {}}
    />
  );
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <ChangeCommanderProvider deckId="about-figure" deckName={deckName} pair={false} hasVersion>
        {/* 1: the art band, in this deck's colors, where the door sits. 2: the first candidate's
            overlap figure. 3: the To buy group, after the ones you own. 4: the candidate already
            in the 99, which trades places with the commander. */}
        <AnchoredNumerals
          gutter
          className="flex flex-col gap-[14px]"
          marks={[
            { n: 1, find: first('[data-figure-band]'), side: "gutter", align: "top" },
            { n: 2, find: first('[data-testid="change-commander-row"] button[aria-controls]'), side: "before" },
            { n: 3, find: withText("h3", changeCommanderCopy.sheet.groupBuy(1), true), side: "gutter" },
            // The mark whose own first words are "in this deck" (the separator is a child span).
            {
              n: 4,
              find: (r) =>
                [...r.querySelectorAll("span")].find((el) => el.firstChild?.textContent === changeCommanderCopy.sheet.inDeck.split(" · ")[0]) ?? null,
              side: "gutter",
            },
          ]}
        >
          <div
            data-figure-band
            className="relative h-[150px] overflow-hidden rounded-[8px] border border-solid border-[color:var(--border)] md:h-[120px]"
            style={{ background: identityGradient(NAYA) }}
          >
            <ChangeCommanderDoor oracleId="about-gishath" width={desktop ? "desktop" : "mobile"} hasCrop />
          </div>
          <section>
            <CandidateGroupHeading
              label={changeCommanderCopy.sheet.groupYours(2)}
              note={changeCommanderCopy.sheet.groupNote}
            />
            {row(yours)}
            {row(inDeck)}
          </section>
          <section>
            <CandidateGroupHeading
              label={changeCommanderCopy.sheet.groupBuy(1)}
              note={changeCommanderCopy.sheet.groupNote}
            />
            {row(toBuy)}
          </section>
        </AnchoredNumerals>
      </ChangeCommanderProvider>
    </CardDetailProvider>
  );
}

/**
 * `help-me-choose` — two results, drawn by the results screen's own `ChooseRow`, each with its
 * ownership line settled (`trial` ready), in the order the screen would give them.
 *
 * The figures come from `figures()`, the function the screen calls, so which one is lit SETS RANK
 * is the shipped rule's answer rather than a fixture's claim. `retry` is a no-op and the row's
 * link cannot be followed: `Specimen` is `inert`.
 */
export function HelpMeChooseFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      {/* Key 1 on the figure that sets a row's rank, key 2 on the ownership line beside it. */}
      <AnchoredNumerals
        gutter
        marks={[
          { n: 1, find: first("[data-sets-rank]"), side: "gutter", mdSide: "before" },
          { n: 2, find: first('[data-testid="ownership-line"]'), side: "gutter" },
        ]}
      >
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        {CHOOSE.rows.map(({ row, trial }) => (
          <ChooseRow
            key={row.oracleId}
            row={row}
            figures={chooseFigures(row, "fit", CHOOSE.labels)}
            owned={false}
            params={CHOOSE.params}
            cardName={CHOOSE.labels.card}
            trial={{ state: "ready", figures: trial }}
            retry={() => {}}
          />
        ))}
      </ul>
      </AnchoredNumerals>
    </CardDetailProvider>
  );
}

/**
 * `fits-your-decks` — the body of Find a deck for it, drawn by the picker's own parts: the card plate, the
 * decks that could take it (a combo reason, then a theme reason, as `shapeFits` orders them) and the
 * decks that already hold it. The picker itself is not mounted: it reads its decks when it opens.
 * `onAdd` is a no-op; `Specimen` is `inert`.
 */
export function FitsYourDecksFigureBody() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex flex-col gap-[14px]">
        <FitsPlate
          name={FITS.card.name}
          imageUri={FITS.card.imageUri}
          colorIdentity={FITS.card.colorIdentity}
          owned={FITS.owned}
          freeNow={FITS.free}
          countsKnown
        />
        {/* 1: the group's heading, the decks that could take it. 2: the order note at its right.
            3: the first row's reason. 4: the first row's need. */}
        <AnchoredNumerals
          gutter
          marks={[
            { n: 1, find: withText("h3", swapToolsCopy.fits.groupJoin), side: "after" },
            { n: 2, find: withText("span", swapToolsCopy.fits.orderReasons), side: "before" },
            { n: 3, find: first('[data-testid="fits-reason"]'), side: "gutter" },
            { n: 4, find: first('[data-testid="fits-reason-need"]'), side: "after" },
          ]}
        >
          <FitsRows
            rows={FITS.rows}
            staple={false}
            cardName={FITS.card.name}
            freeNow={FITS.free}
            busy={null}
            refused={null}
            noteFor={() => null}
            onAdd={() => {}}
          />
        </AnchoredNumerals>
        <FitsHolds holds={FITS.holds} />
      </div>
    </CardDetailProvider>
  );
}

/**
 * `stand-ins` — Shopping's limit line over the one row it marks (Plateau, over the default limit),
 * then the first group of that row's stand-ins, drawn by the sheet's own group and rows. The sheet
 * itself is not mounted: it reads its stand-ins when it opens. Take is a no-op; `Specimen` is `inert`.
 */
const PLATEAU: DeckDetailCard = {
  ...DECKLIST_MARK_ROWS[0],
  oracleId: "about-plateau",
  name: "Plateau",
  typeLine: "Land \u2014 Mountain Plains",
  cardTypeGroup: "Lands",
  role: "other",
  cmc: 0,
  owned: false,
  manaCost: null,
  availability: null,
  price: { cents: 29_384, foilCents: null, etchedCents: null, asOf: PRICES[0].fact.asOf },
};
// No Take: nothing on /about edits a deck, and a row whose Take is null draws none (as after a take).
const NO_TAKE = { onTake: null, taking: false, busy: false, refused: null, error: null, cut: "Plateau" };

export function StandInsFigureBody() {
  const siblings = STAND_INS.group.rows.map((r) => r.oracleId);
  const spellSiblings = STAND_INS.spell.group.rows.map((r) => r.oracleId);
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <SwapToolsProvider deckId="about-figure" deckName={STAND_INS.deckName} storedLimitCents={null}>
        {/* 1: the limit line. 2: the marked row's ⇄. 4: the land group, ordered by its mana. */}
        <AnchoredNumerals
          gutter
          className="flex flex-col gap-[6px]"
          marks={[
            { n: 1, find: first('[data-testid="stand-in-limit"]'), side: "gutter" },
            { n: 2, find: withText("button", "⇄", true), side: "gutter" },
            { n: 3, find: first("[data-stand-in-spells]"), side: "gutter", align: "top" },
            { n: 4, find: first("[data-stand-in-group]"), side: "gutter", align: "top" },
          ]}
        >
          <StandInLimit shoppingCount={STAND_INS.shoppingCount} overCount={STAND_INS.overCount} />
          <div className="mt-[6px] border-t border-solid border-[color:var(--border)]">
            <DecklistRow deckId="about-figure" card={PLATEAU} siblings={[]} inShopping newestAsOf={PRICES[0].fact.asOf} />
          </div>
          {/* A spell's stand-ins: the sheet's own lead for the card, then its group, each row
              comparing itself as keeps / gains / loses. Key 3. */}
          <div data-stand-in-spells className="mt-[10px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] px-[12px] pt-[10px]">
            <p className="m-0 mb-[8px] text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">
              {swapToolsCopy.sheet.leadSpellsJob(STAND_INS.spell.card, STAND_INS.spell.jobs)}
            </p>
            <StandInGroup group={STAND_INS.spell.group} keep={null}>
              {(row) => <StandInRow key={row.oracleId} row={row} newestAsOf={PRICES[0].fact.asOf} take={NO_TAKE} siblings={spellSiblings} />}
            </StandInGroup>
          </div>
          {/* The sheet's own group, in the box the canvas draws it in. No title: the sheet's shipped
              one is "Cheaper stand-ins", which is this entry's own title one line up. */}
          <div data-stand-in-group className="mt-[10px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] px-[12px] pt-[10px]">
            <StandInGroup group={STAND_INS.group} keep={null}>
              {(row) => <StandInRow key={row.oracleId} row={row} newestAsOf={PRICES[0].fact.asOf} take={NO_TAKE} siblings={siblings} />}
            </StandInGroup>
          </div>
        </AnchoredNumerals>
      </SwapToolsProvider>
    </CardDetailProvider>
  );
}

/** `ready-to-build` — Home's own block, with its numerals measured onto the parts it draws. */
export function ReadyToBuildFigureBody() {
  return (
    <AnchoredNumerals
      gutter
      marks={[
        // 1: the top 28 is a ranking, under the block's own heading.
        { n: 1, find: withText("h2", refreshCopy.home.readyHeading), side: "gutter" },
        // 2: the fit line and the in-use clause, on the first card's meta row.
        { n: 2, find: first(".hero-footer > div"), side: "gutter" },
        // 3: the pair, which changes daily: the first card.
        { n: 3, find: first(".grid > *"), side: "gutter", align: "top" },
        // 4: the `N more scored X or better` line.
        { n: 4, find: withText("span", "more scored", true), side: "after" },
      ]}
    >
      <ReadyToBuild ready={READY_SLICE} inUse={READY_IN_USE} />
    </AnchoredNumerals>
  );
}
