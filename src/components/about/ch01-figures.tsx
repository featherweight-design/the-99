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

import {
  IMPORT_SOURCES,
  ISSUE_PARSE_ERROR,
  ISSUE_UNMATCHED,
  CONTESTED_ARRIVAL,
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
} from "../../lib/about/fixtures";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { collectionChassisCopy } from "../../lib/copy/collection";
import { printingPickerCopy } from "../../lib/copy/collection";
import { COSTS } from "../../lib/about/fixtures";
import { COST_PIP_SIZE, CostPips } from "../ui/cost-pips";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { LastSlotsStrip } from "../decks/last-slots-strip";
import { DecklistRow } from "../decks/decklist-row";
import { RoleCounterStrip } from "../decks/role-counter-strip";
import { ContestedCardRow } from "../decks/contested-card-row";
import { FitLegend } from "../commanders/fit-legend";
import { AvailabilityControl } from "../commanders/rack/availability-control";
import { CommanderRow } from "../commanders/commander-row";
import { PartnerSlot } from "../decks/partner-slot";
import { BuilderTabs } from "../decks/builder-tabs";
import { StatusPillBadge } from "../decks/status-pill";
import { statusBarStyle } from "../../lib/decks/status-style";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import { PIP_SRC } from "../../lib/copy/filter-chassis";
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
import { KeyNumeral } from "./numeral";
import { useIsDesktop } from "../ui/use-is-desktop";

const fmt = (n: number) => n.toLocaleString("en-US");

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
 * before and after both printed, a line per deck that felt it, and a count of
 * the decks that did not.
 */
export function PostImportFigureBody() {
  const { before, after, noLongerOwned, unaffectedDecks } = REPLACE_SUMMARY;
  const c = cardAssignmentsCopy.summary;
  const heads: Record<string, string> = {
    cleared: c.sectionCleared(61),
    still: c.sectionStill(12),
    short: c.sectionShort(2),
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
        <span className="text-[12.5px] text-[color:var(--fg)]">
          {fmt(before)} → {fmt(after)} cards
        </span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {noLongerOwned} no longer owned
        </span>
        {/* Decks nothing happened to are COUNTED, never listed — the summary
            is what changed, not an inventory. The fixture carried the figure
            and the rebuild into sections dropped the line that drew it. */}
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          {unaffectedDecks} other decks unaffected
        </span>
      </div>

      {/* Keys 2 and 3 — THREE SECTIONS, and a row that is a CARD carrying the
          deck that wanted it. The R4 canvas draws deck rows with a count each;
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
    <div className="min-h-[380px] w-[300px]">
      <OrderControl
        value={LANE_DISCOVER.order}
        options={ORDER_OPTIONS.discover}
        onChange={() => {}}
        wide
        pinnedOpen
      />
    </div>
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
        {SYNERGY_ROWS.map((card) => (
          <SynergyRow
            key={card.oracleId}
            card={card}
            selected={false}
            onToggle={() => {}}
            siblings={[]}
            width={desktop ? "desktop" : "phone"}
            facet={card.facet}
            newestAsOf={PRICES[0].fact.asOf}
          />
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
              style={{ background: `center / contain no-repeat url(${PIP_SRC[code as PipCode]})` }}
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

      <div className="mt-[10px] flex items-center gap-[9px]">
        <BuilderTabs tabs={DECK_TABS} view="deck" onViewChange={() => {}} />
        <KeyNumeral n={2} />
      </div>
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
      candidates={SYNERGY_ROWS}
      deckOracleIds={new Set()}
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
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex flex-col">
        {DECKLIST_MARK_ROWS.map((card) => (
          <DecklistRow
            key={card.oracleId}
            deckId="about-figure"
            card={card}
            siblings={[]}
            newestAsOf={PRICES[0].fact.asOf}
          />
        ))}
      </div>
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
export function RolesFigureBody() {
  return (
    <RoleCounterStrip
      cards={ROLE_MIX_CARDS}
      onSeeShelf={() => {}}
      rolesWithShelves={new Set(["wipes", "land"])}
    />
  );
}
