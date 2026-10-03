// The figures. Each one mounts the app's OWN component with fixture props —
// never a drawing of it, and never a fork (STATES-about-r3.md §G3).
//
// That is what keeps this page true a year from now: a mark whose colour,
// size or glyph changes in its own component changes here on the next render,
// where a screenshot or a hand-drawn copy would quietly start lying.
//
// EVERY entry has one. That is the handoff's unit and the reason it exists:
// R2's pivot away from R1 was Design saying a page of paragraphs cannot teach
// a fit score, a doubled diamond or a dashed cell. `about.test.ts` holds a
// ledger of entries with no figure and it is EMPTY — an entry arriving without
// one fails there, which is the invariant this file now keeps.

import { AvailabilityMarker } from "../ui/availability-marker";
import { BuyTag } from "../decks/buy-tag";
import { StatusPillBadge } from "../decks/status-pill";
import { SetCell } from "../sets/set-cell";
import { RoleGroupHeader } from "../commanders/coverage-section";
import { CommitmentsCard } from "../home/commitments-card";

import { BrowseFigureBody } from "./browse-figure";
import { KeyNumeral } from "./numeral";
import { SetsColourFigure } from "./sets-colour-figure";
import { ORDER_OPTIONS } from "../commanders/rack/order-options";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { setFilterCopy, setPageCopy } from "../../lib/copy/set-collections";
import {
  ImportFigureBody,
  AddCardsFigureBody,
  FoldersFigureBody,
  LogFindingsFigureBody,
  NewDeckFigureBody,
  ProxiesFigureBody,
  ReviewAndCommitFigureBody,
  ThemesFigureBody,
  LogAGameFigureBody,
  ReservationsFigureBody,
  ResumeFigureBody,
  ExportFigureBody,
  ReadyToBuildFigureBody,
  VersionsFigureBody,
  ShoppingFigureBody,
  DeckImportFigureBody,
  UndoRemovalFigureBody,
  LockedCardsFigureBody,
  ChangeCommanderFigureBody,
  HelpMeChooseFigureBody,
  FitsYourDecksFigureBody,
  StandInsFigureBody,
  CardDetailFigureBody,
  CommanderLaneFigureBody,
  DiscoverFigureBody,
  FitLegendFigureBody,
  CommanderAvailabilityFigureBody,
  AutoFillFigureBody,
  DecklistMarksFigureBody,
  DecklistOrderFigureBody,
  ComboAwarenessFigureBody,
  InformedBuildFigureBody,
  RolesFigureBody,
  DeckPageFigureBody,
  ImportIssuesFigureBody,
  PartnerSlotFigureBody,
  PostImportFigureBody,
  DeckAnalysisFigureBody,
  CardMarksFigureBody,
} from "./ch01-figures";
import { statusBarStyle } from "../../lib/decks/status-style";
import type { StatusPill } from "../../lib/decks/status";
import { refreshCopy } from "../../lib/copy/refresh";
import { FitBar } from "../commanders/fit-bar";
import {
  Specimen,
} from "./specimen";
import type { AboutWidth } from "../../lib/copy/about";
import {
  AVAILABILITY,
  COMMITMENTS,
  COMMITMENTS_TOTAL_CARDS,
  ROLE_COUNTS,
  ROLE_TARGETS_MEASURED,
  SHOPPING,
  SET_CELLS,
  SET_HEAD,
  FIT_DEGRADED,
  FIT_DEGRADED_SCORE,
  FIT_FULL,
  FIT_FULL_SCORE,
  PRICES,
  STATUSES,
} from "../../lib/about/fixtures";

/** The four availability states, including the one that draws nothing. */
function AvailabilityFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="availability" width={width}>
      {/* TRANSCRIBED from §3: FOUR ROWS, each a numeral and the marker beside
          it, not a four-column grid with a caption under every cell. The grid
          was this page's own arrangement, and it forced a caption per cell —
          which then had to say something the marker already says. The drawing
          has no per-row caption at all: the numbered lines below the figure
          carry the explanation, which is the annotation grammar the rest of
          the page follows.

          `free` is the one row that needs words of its own, because it draws
          NOTHING and a blank row would read as a figure that failed rather
          than as one of the four states. */}
      <div className="flex flex-col gap-[11px]">
        {AVAILABILITY.map(({ key, a }, i) => (
          <div key={key} className="flex items-center gap-[10px]">
            <KeyNumeral n={i + 1} />
            {key === "free" ? (
              <span className="inline-flex items-center gap-[6px]">
                <span aria-hidden className="h-[6px] w-[6px] flex-none" />
                <span className="text-[12px] text-[color:var(--fg-body)]">
                  no diamond at all
                </span>
              </span>
            ) : (
              /* `density="row"` leaves the font to the caller, and the real
                 decklist row supplies these classes. Without them the marker
                 inherits this page's body type and shows a treatment the
                 reader will never meet.

                 `seam` joins the two over-diamonds and only reads as a seam
                 while it matches what is BEHIND it. It defaults to `--bg`;
                 the plate is `--surface-sunken`. */
              <span className="font-mono text-[11px] min-[1000px]:text-[11.5px]">
                <AvailabilityMarker
                  availability={a}
                  density="row"
                  seam="var(--surface-sunken)"
                  // The decklist row it stands in for draws a bare `short` at one copy.
                  bareOne
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/** The four claims a buy tag makes, which are not four ways of saying "cost". */
function BuyTagFigure({ width }: { width: AboutWidth }) {
  // §3 draws these as a COLUMN with the caption on the tag's own line, not as
  // a grid of cells with the caption beneath. The grid was this page's own
  // arrangement and it cost the figure its readability: four tags stacked with
  // a wrapped annotation under each reads as four paragraphs, where the drawing
  // reads as one list of four claims.
  const caption: Record<string, string> = {
    priced: "a price we have",
    foilOnly: "foil only",
    soldOut: "stocked, none left",
    absent: "no figure at all",
  };
  const newest = PRICES[0].fact.asOf;
  return (
    <Specimen label="buy-tag" width={width}>
      <div className="flex flex-col gap-[9px]">
        {PRICES.map(({ state, fact }) => (
          <div key={state} className="flex items-center gap-[8px]">
            {/* The route's own tag, not the canvas's drawing of one. */}
            <BuyTag
              variant="row"
              price={fact}
              // `soldOut` is a stale row against the newest stamp, so the
              // fixture's own date is the newest for three of the four and
              // deliberately not for that one.
              newestAsOf={state === "soldOut" ? new Date(newest.getTime() + 86_400_000) : newest}
              density="full"
            />
            <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
              {caption[state]}
            </span>
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/**
 * All seven statuses as the deck card draws them: `[badge] [count] [bar]`, and
 * the clause underneath for the four statuses that have one.
 *
 * The bar is here after being declined twice. The decline assumed it meant
 * replicating `DeckCard`; it does not. `statusBarStyle` is a pure exported
 * helper returning a width and a token, and the track is a 3px div — so the
 * bar is shared code used as shared code, and refusing it left two of the six
 * statuses with nothing to explain them. Building and Complete carry NO detail
 * sentence in the app (`deck-card.tsx:84, :109`); their count and their bar are
 * the whole explanation, which is exactly why a plate without the bar could not
 * teach them.
 */
/** Key 1 is New, Draft and Building; 2 is Over and Unresolved; 3 is To buy; 4 is Complete. */
const STATUS_NUMERAL: Partial<Record<StatusPill, number>> = { New: 1, Over: 2, "To buy": 3, Complete: 4 };

function StatusFigure({ width }: { width: AboutWidth }) {
  const detail = refreshCopy.decks;
  // Only what the app actually renders. `detailCopies` was used here for
  // Building and Complete and prints `87 cards` — a string the deck card never
  // shows for either, because their figure is the count beside the bar.
  const clause: Partial<Record<StatusPill, string>> = {
    // `New` is the empty never-committed deck, which is the state `detailDraft`
    // ("created today") was always describing — the word moved to the phase and
    // the figure went with it. A `Draft` at 47 cards draws whatever its counts
    // would say, so no single specimen clause is honest for it.
    New: detail.detailDraft,
    Over: detail.detailOver(5),
    Unresolved: detail.detailUnresolved(2),
    "To buy": detail.detailToBuy(3, "$12.40"),
  };
  const built: Record<StatusPill, number> = {
    New: 0,
    Draft: 47,
    Building: 87,
    Over: 104,
    Unresolved: 99,
    "To buy": 99,
    Complete: 99,
  };
  const BODY = 99;
  return (
    <Specimen label="status" width={width}>
      {/* THREE COLUMNS, ON ONE LINE. The badge, then a fixed-width track, then
          what the deck card prints beside it. The figure used to stack the
          clause UNDER the row and give the track the rest of the width, which
          read as seven two-line blocks rather than one table a reader can scan
          down — and the third column is the whole point of the entry, since
          each status has exactly one thing to say.

          The track is fixed rather than `flex-1` for the same reason: a bar
          that changes length with the sentence beside it is comparing two
          different scales down the column. */}
      <div className="flex flex-col">
        {STATUSES.map((status, i) => (
          <div
            key={status}
            className={`flex flex-col gap-[6px] py-[9px] md:flex-row md:items-center md:gap-[12px] ${
              i > 0 ? "border-t border-solid border-[color:var(--border)]" : ""
            }`}
          >
            {/* PHONE: the badge and its sentence share a line, and the track
                gets its own beneath. THE TABLE DOES NOT FIT 390px — a fixed
                86px badge, a fixed 248px track and a sentence come to more
                than the plate has, and the first version ran the track off
                the right edge and pushed the clause out of the figure
                entirely. Desktop keeps the three columns, which is what makes
                the column scannable at the width it was designed for. */}
            <div className="flex items-center gap-[10px] md:contents">
              {/* The className is REQUIRED and it is the FOOTER's, not the
                  tile's: the component defaults to `TILE_CLASS`, which opens
                  `absolute bottom-[13px] left-[13px]` and would pin all seven
                  to the page corner, and the deck card's own footer draws 22px
                  tall at 10.5px rather than the tile's 24px at 11px. */}
              {/* Each key line's numeral sits on the first status it names; the rest keep a
                  spacer so the badges stay in one column. */}
              {STATUS_NUMERAL[status] ? (
                <KeyNumeral n={STATUS_NUMERAL[status]!} />
              ) : (
                <span aria-hidden className="w-[14px] flex-none" />
              )}
              <StatusPillBadge
                status={status}
                className="flex h-[22px] w-[86px] flex-none items-center rounded-[6px] px-[8px] font-mono text-[10.5px] tracking-[0.06em]"
              />
              {/* ONE thing per status, which is the entry's claim. A clause
                  where the card draws one; the count beside the bar where it
                  does not — and never both, because that would be two figures
                  saying the same thing.

                  Its ORDER differs by width, which is why `md:contents` is
                  here: on the phone it follows the badge, and on desktop it is
                  the third column with the track between them. `contents`
                  dissolves this wrapper into the row so the track can sit
                  between its two children. */}
              <span className="min-w-0 flex-1 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:order-3">
                {clause[status] ?? `${built[status]} / ${BODY}`}
              </span>
            </div>
            {/* The track is drawn for every status; the fill is omitted for
                the one specimen with nothing built, which is what an empty
                track means. `New` rather than `Draft` since R6 — a draft has
                a length, and this one is drawn at 47 cards.

                Full width on the phone, fixed on desktop: a bar that changes
                length with the sentence beside it is comparing two different
                scales down the column, and on the phone there is no sentence
                beside it to change with. */}
            <div
              className="relative h-[3px] w-full rounded-full md:order-2 md:w-[248px] md:flex-none"
              style={{ background: "var(--border)" }}
            >
              {built[status] > 0 && (
                <div
                  data-status-fill
                  className="absolute top-0 bottom-0 left-0 rounded-full"
                  style={statusBarStyle(status, built[status], BODY)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/** The bar, both shapes: three segments out of 100, and two out of 40. */
function FitFigure({ width }: { width: AboutWidth }) {
  const e = explainedCopy.score;
  return (
    <Specimen label="fit" width={width}>
      {/* TRANSCRIBED from §3's commander-page header: the label, the score at
          46px with its denominator and rank clause, the segmented bar, and the
          three parts named with their own points out of their own weights.

          What this replaces drew two bars with a caption apiece — which showed
          the bar and never the SUM the entry is about, and put this page's own
          sentences inside the frame. */}
      <div className="font-mono text-[10px] tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        {e.label}
      </div>
      <div className="mt-[8px] mb-[14px] flex flex-wrap items-baseline gap-[10px]">
        <span className="text-[46px] leading-none font-bold text-[color:var(--fg)]">
          {FIT_FULL_SCORE}
        </span>
        <span className="font-mono text-[15px] text-[color:var(--fg-faint)]">
          {e.denominator}
        </span>
        <span className="text-[13.5px] font-semibold text-[color:var(--success)]">
          {e.bestInPool}
        </span>
        {/* Key 3: a score means something only against your own collection, which is what
            "best in your pool" says. */}
        <KeyNumeral n={3} />
      </div>

      {/* The route's own bar, and its own legend. `legend` draws the three
          parts the entry's key lines name — passing them as captions of my own
          would be this page inventing figures the app renders. */}
      {/* The route's own bar and its own KEY. `FitLegend` draws each part's
          points over its weight and, expanded, the three explanations — which
          is what the entry is about and what the figure had none of. */}
      <FitBar fit={FIT_FULL} />
      {/* Key 2: the three parts printed with their sum. */}
      <div className="mt-[10px] flex items-start gap-[8px]">
        <KeyNumeral n={2} className="mt-[2px]" />
        <div className="min-w-0 flex-1">
          <FitLegendFigureBody />
        </div>
      </div>

      {/* THE OTHER DENOMINATOR. §3 draws one shape; key line 1 names two —
          "where synergy could not be measured the score is out of 40, and it
          is never rescaled" — and a figure showing only `/100` cannot
          substantiate that. The caption is the app's own copy, so it wins and
          the drawing goes back to Design.

          Drawn compactly rather than as a second full header: the subject here
          is the DENOMINATOR, not a second score to compare. */}
      <div className="mt-[14px] border-t border-solid border-[color:var(--border)] pt-[12px]">
        <div className="mb-[7px] flex flex-wrap items-baseline gap-[8px]">
          <span className="text-[19px] leading-none font-bold text-[color:var(--fg)]">
            {FIT_DEGRADED_SCORE}
          </span>
          <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">
            {e.denominatorMeasurable(40)}
          </span>
          <KeyNumeral n={1} />
        </div>
        <FitBar fit={FIT_DEGRADED} />
      </div>
    </Specimen>
  );
}

/**
 * The marks a decklist row can carry, and what each one means.
 *
 * **A legend, not a replica**, and that is a scope decision rather than a
 * shortcut. Two review rounds landed on this figure, and each round's findings
 * asked it to match the row more closely: the slot order, the dot's responsive
 * size, the row's phone pip treatment against its desktop one. Following that
 * to its end is a second implementation of `DecklistRow` living on a reference
 * page, drifting from the first one edit at a time — and the row cannot simply
 * be mounted, because it takes a deck id, mutation handlers and a card record
 * that a reference page has none of and must not invent.
 *
 * So: every MARK is the app's own component, in the row's order and at the
 * row's desktop treatment, and the figure claims nothing about layout. One
 * treatment per mark, because a legend shows a mark once; the row's breakpoint
 * forks are the row's business.
 */
function MarksFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="marks" width={width}>
      <DecklistMarksFigureBody />
    </Specimen>
  );
}

/**
 * A set page's cells: the four states a reader has to tell apart, and the
 * reason the grid is worth drawing at all — a missing cell keeps its name and
 * its price, so the GAPS are the page.
 *
 * `SetCell` is mounted as-is. It takes a cell, an optional price and the
 * newest stamp, and nothing else — no deck, no handlers — which is what makes
 * it one of the few whole surfaces this page can show rather than legend.
 */
function SetsFigure({ width }: { width: AboutWidth }) {
  const h = SET_HEAD;
  const newest = PRICES[0].fact.asOf;
  return (
    <Specimen label="sets" width={width}>
      {/* TRANSCRIBED from §3. What this replaces was a completion ratio, a cell
          count and four cells — which showed the marks and none of the page
          they live on. The entry's three key lines are about the cost strip's
          coverage, the dashed cell, and the base run being counted apart from
          the extras; two of those had nothing on the figure to point at. */}
      <div className="font-mono text-[9.5px] text-[color:var(--fg-faint)]">
        Collection / Sets / {h.code}
      </div>
      <div className="mt-[8px] mb-[4px] flex flex-wrap items-baseline gap-[10px]">
        <span className="font-display text-[17px] font-bold text-[color:var(--fg)]">{h.name}</span>
        <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">
          {h.have} / {h.base} · {h.percent}%
        </span>
      </div>
      <div className="mb-[11px] font-mono text-[9.5px] leading-[1.6] text-[color:var(--fg-faint)]">
        {setPageCopy.head.meta(h.code, h.released, h.base, h.extras)}
        <br />
        {setPageCopy.head.ratioNote}
      </div>

      {/* The cost strip. Key line 2 is about its COVERAGE — the figure counts
          the cards ManaPool stocks, and one that has never been stocked is
          named and left out rather than priced at zero. */}
      <div className="mb-[12px] flex items-center gap-[14px] rounded-[9px] border border-solid border-[color:var(--border)] bg-[color:var(--bg)] px-[14px] py-[12px]">
        <div className="min-w-0 flex-1">
          <div className="mb-[5px] font-mono text-[9.5px] tracking-[0.1em] text-[color:var(--fg-faint)] uppercase">
            {setPageCopy.cost.label}
          </div>
          <div className="flex flex-wrap items-baseline gap-[8px]">
            <span className="font-mono text-[17px] text-[color:var(--accent)]">{h.cost}</span>
            <span className="text-[11.5px] text-[color:var(--fg-body)]">
              {setPageCopy.cost.line(h.costPriced, h.costMissing)}
            </span>
            <KeyNumeral n={2} />
          </div>
          <div className="mt-[4px] font-mono text-[9.5px] text-[color:var(--fg-faint)]">
            {setPageCopy.cost.unpriced(h.costUnpriced)}
          </div>
        </div>
        <span className="flex h-[30px] flex-none items-center rounded-[8px] bg-[color:var(--fg)] px-[13px] text-[12px] font-semibold text-[color:var(--bg)]">
          {setPageCopy.cost.send(h.sendCount)}
        </span>
      </div>

      {/* The filter row, and the line under it that says what the denominator
          counts. Both are drawn, because key line 3 is about exactly that
          disagreement: 162 of 208 and 321 cells are both true.

          Missing and Owned (H12), mutually exclusive, plus Sort (H16), are
          key line 4 — added as an ORDINARY EDIT to this entry rather than a
          new one, this being the last Sets round (d9, 2026-10-03). No
          ABOUT_VERSION bump: Hugh's precedent on the collection surfaces. */}
      <div className="mb-[9px] flex flex-wrap items-center gap-[8px]">
        <span className="flex h-[28px] min-w-[140px] flex-1 items-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--bg)] px-[10px] text-[11px] text-[color:var(--fg-locked)]">
          {setFilterCopy.search.placeholder}
        </span>
        {/* The live row's colour control, modifier and all (H10), from a client module
            because it takes handlers. */}
        <SetsColourFigure />
        <span className="flex h-[26px] items-center gap-[6px] rounded-[7px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[9px] text-[11px] text-[color:var(--fg-muted)]">
          {setFilterCopy.rarityPanel.triggerCount(0)}
          <span aria-hidden className="text-[color:var(--fg-faint)]">▾</span>
        </span>
        <span className="flex h-[26px] items-center rounded-[7px] border border-solid border-[color:var(--border-strong)] px-[10px] text-[11px] text-[color:var(--fg-muted)]">
          {setFilterCopy.ownership.missing.label}
        </span>
        <span className="flex h-[26px] items-center rounded-[7px] border border-solid border-[color:var(--border-strong)] px-[10px] text-[11px] text-[color:var(--fg-muted)]">
          {setFilterCopy.ownership.owned.label}
        </span>
        <span className="flex h-[26px] items-center gap-[6px] rounded-[7px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[9px] text-[11px] text-[color:var(--fg-muted)]">
          {setFilterCopy.sort.panel.triggerOne(setFilterCopy.sort.options.price)}
          <KeyNumeral n={4} />
        </span>
      </div>
      <div className="mb-[10px] font-mono text-[10px] text-[color:var(--fg-faint)]">
        {h.cells} cells · {h.yours} yours, {h.missing} missing
      </div>

      <div className="mb-[9px] flex items-baseline gap-[9px]">
        <span className="font-display text-[13px] font-bold text-[color:var(--fg)]">Base run</span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">
          {h.have} / {h.base}
        </span>
        <KeyNumeral n={3} />
      </div>

      {/* SIX across, as drawn, and the route's own `SetCell` for every one.
          The price is passed to every cell and the COMPONENT decides: it
          renders the tag only for `!cell.owned`, because "a price tag is a
          thing only a missing cell has" is the route's rule, not this page's.
          Gating it here as well would look like a guard while guarding
          nothing. */}
      <div className="grid grid-cols-3 gap-[10px] min-[1000px]:grid-cols-6">
        {SET_CELLS.map((cell, i) => (
          <div key={cell.scryfallId} className="relative">
            {i === 4 && <KeyNumeral n={1} className="absolute top-[5px] left-[5px] z-10" />}
            <SetCell
              cell={cell}
              price={PRICES[0].fact}
              newestAsOf={newest}
            />
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/**
 * What a narrowing looks like once it is applied: a chip per dimension, each
 * removable on its own. `FilterChipPill` is the collection's own chip — the
 * entry's first key line is about chips being visible and removable, and a
 * drawing of one would be the page asserting that rather than showing it.
 */
function BrowseFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="browse" width={width}>
      <BrowseFigureBody />
    </Specimen>
  );
}

/**
 * The three doors a collection arrives through, and the one fact that decides
 * whether a reader is about to lose something: an import REPLACES.
 */
function ImportFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="import" width={width}>
      <ImportFigureBody />
    </Specimen>
  );
}

/**
 * The post-import summary's three sections, in the app's own words. A card
 * moves between them; no deck is edited.
 */
function PostImportFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="post-import" width={width}>
      <PostImportFigureBody />
    </Specimen>
  );
}

/** The inspector's two tabs: a name we could not match, and a line we could not read. */
function ImportIssuesFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="import-issues" width={width}>
      <ImportIssuesFigureBody />
    </Specimen>
  );
}

/**
 * The printing picker's two marks, which are the ones most often misread: a
 * tick for the printing you PICKED, a hollow diamond for the one being SHOWN.
 * Neither is about ownership, and the caption used to say it was.
 */
function CardDetailFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="card-detail" width={width}>
      <CardDetailFigureBody />
    </Specimen>
  );
}

/**
 * The four roles a deck is measured on, each against what this commander's decks run — which
 * is what the entry is about: a short role is the one thing on the page that
 * names what to do next, and the fixture is short on wipes alone so the figure
 * teaches one gap rather than a list of them.
 */
function RoleCoverageFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="role-coverage" width={width}>
      {/* The commander page's own group heads (`RoleGroupHeader`), one per role, in the form the
          page draws at narrow widths: this is an inset, about 250px of content from 1000px up, and
          the desktop head is one unwrapping row sized for the page's full column. Wipes is the
          entry's subject: 1 owned, 2 short of the 3 its decks run, is what to fix before you build. */}
      <div className="flex flex-col gap-[10px]">
        {(Object.keys(ROLE_COUNTS) as (keyof typeof ROLE_COUNTS)[]).map((role) => (
          <div
            key={role}
            className="rounded-[10px] border border-solid border-[color:var(--border)] px-[14px] py-[11px]"
          >
            <RoleGroupHeader layout="phone" role={role} count={ROLE_COUNTS[role]} targets={ROLE_TARGETS_MEASURED} listId={`about-role-${role}`} />
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/** What the log says back once there are enough games for it to say anything. */
function LogFindingsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="log-findings" width={width}>
      <LogFindingsFigureBody />
    </Specimen>
  );
}

/** Home's three figures, and the one that keeps its colour at nought. */
function CommitmentsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="commitments" width={width}>
      <CommitmentsCard
        commitments={COMMITMENTS}
        shopping={SHOPPING}
        totalCards={COMMITMENTS_TOTAL_CARDS}
      />
    </Specimen>
  );
}

/** The six themes, by the name a reader picks rather than the plane. */
function ThemesFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="themes" width={width}>
      <ThemesFigureBody />
    </Specimen>
  );
}

// ── Legends ────────────────────────────────────────────────────────────────
//
// Each of these composes real COPY and real leaf components rather than
// mounting a whole page surface. That is the settled rule from the marks
// plate: a figure that reproduces a surface becomes a second copy of it and
// drifts an edit at a time, and the surfaces below take deck ids, mutation
// handlers and card records a reference page has none of.

/** One row of a legend: the thing, then what it means. A `dt`/`dd` pair,
 *  because that is the relationship and a screen reader can then say it. */

function ReadyToBuildFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="ready-to-build" width={width}>
      {/* The ROUTE's own block, mounted whole. §3 draws Home's `Ready to
          build` — the heading, the pair of commander cards with their art,
          identity pips, fit figures and `See the pool`, then the more-above
          line and the way to the lane. The figure it replaces was three
          mark-and-meaning rows that NAMED two of those figures and showed
          neither, so the entry's three key lines had nothing to point at. */}
      <ReadyToBuildFigureBody />
    </Specimen>
  );
}

function CommanderLaneFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="commander-lane" width={width}>
      <CommanderLaneFigureBody />
    </Specimen>
  );
}


function DiscoverFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen
      label="discover"
      width={width}
      // The figure is the ONLY place the five orders and their glosses appear:
      // the caption does not list them and neither do the key lines. A
      // `Legend` was readable and this replaced one, so hiding it took the
      // entry's whole subject away from assistive technology.
      spokenAs={ORDER_OPTIONS.discover
        .map((o) => (o.gloss ? `${o.label}: ${o.gloss}` : o.label))
        .join(". ")}
    >
      <DiscoverFigureBody />
    </Specimen>
  );
}

function PartnersFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="partners" width={width}>
      {/* THE SURFACE, not an abstraction of it. §3 draws two halves and a row
          of union pips, which is a picture of nothing the app renders — Hugh
          ruled on 2026-09-18 that partners are met on DECK IMPORT, where a
          pasted list's second legend arrives as a proposal, and on the deck's
          own header afterwards.

          `PartnerSlot` is that proposal, mounted whole: the PARTNER heading,
          the card, its provenance line, and the `Change` / `Remove` pair that
          says the proposal is reversible. Inert like every specimen. */}
      <PartnerSlotFigureBody />
    </Specimen>
  );
}

function DeckPageFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="deck-page" width={width}>
      {/* §3 draws the deck's own header: the art band with `Card details`,
          `Update from a list` and `Export`, then the name, its rename glyph,
          the identity pips, the commander line and the status. The figure was
          four tab labels with counts — it named the page's sections and showed
          none of the header this entry is about. */}
      <DeckPageFigureBody />
    </Specimen>
  );
}

/** The Analysis tab's bracket box and climb, on a range the player has not answered. */
function DeckAnalysisFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="deck-analysis" width={width}>
      <DeckAnalysisFigureBody />
    </Specimen>
  );
}

/** The decklist's mark key above two rows that carry three of the four bracket facts between them. */
function CardMarksFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="card-marks" width={width}>
      <CardMarksFigureBody />
    </Specimen>
  );
}

function AutoFillFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="auto-fill" width={width}>
      <AutoFillFigureBody />
    </Specimen>
  );
}

function InformedBuildFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="informed-build" width={width}>
      <InformedBuildFigureBody />
    </Specimen>
  );
}

function ComboAwarenessFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="combo-awareness" width={width}>
      <ComboAwarenessFigureBody />
    </Specimen>
  );
}

function RolesFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="roles" width={width}>
      <RolesFigureBody />
    </Specimen>
  );
}

function DecklistOrderFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="decklist-order" width={width}>
      <DecklistOrderFigureBody />
    </Specimen>
  );
}

function AddCardsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="add-cards" width={width}>
      <AddCardsFigureBody />
    </Specimen>
  );
}

function UndoRemovalFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="undo-removal" width={width}>
      <UndoRemovalFigureBody />
    </Specimen>
  );
}

function DeckImportFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="deck-import" width={width}>
      <DeckImportFigureBody />
    </Specimen>
  );
}

function VersionsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="versions" width={width}>
      <VersionsFigureBody />
    </Specimen>
  );
}

function ExportFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="export" width={width}>
      <ExportFigureBody />
    </Specimen>
  );
}

function ShoppingFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="shopping" width={width}>
      <ShoppingFigureBody />
    </Specimen>
  );
}

function LogAGameFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="log-a-game" width={width}>
      <LogAGameFigureBody />
    </Specimen>
  );
}

function FoldersFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="folders" width={width}>
      <FoldersFigureBody />
    </Specimen>
  );
}

function ResumeFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="resume" width={width}>
      <ResumeFigureBody />
    </Specimen>
  );
}

function ReservationsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="reservations" width={width}>
      <ReservationsFigureBody />
    </Specimen>
  );
}

function ProxiesFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="proxies" width={width}>
      <ProxiesFigureBody />
    </Specimen>
  );
}

/**
 * Entry id → figure. Total: every entry in `aboutEntries` has one, and
 * `about.test.ts` fails on any that does not.
 *
 * `Partial` is kept for the LOOKUP rather than to license a gap — `FIGURES[id]`
 * on an arbitrary string is legitimately `undefined`, and a plain Record would
 * tell TypeScript otherwise.
 */
// `Partial`, because it IS partial: a plain Record tells TypeScript every
// entry id has a renderer, which makes `FIGURES[id]` look non-nullable and
/**
 * The commander page's own reading of a claim: a dot that says only whether you
 * own the card, and a marker beside it that says what is claiming it.
 *
 * The pairing is the point, so both are drawn together on every row. Before this
 * feature the dot carried both facts and said the wrong one — a card with three
 * spare copies read the same as a card sleeved into a committed deck — and a
 * figure showing the marker alone would teach the half that was never broken.
 *
 * Real components, real fixtures: `OwnershipDot` and `AvailabilityMarker` are
 * the ones the panel mounts, so a change to either lands here on the next
 * render rather than leaving this page quietly out of date.
 */
function CommanderAvailabilityFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="owned, and what is claiming it" width={width}>
      {/* The SURFACE. This entry has no canvas — it arrived with #683, after
          Design's last read of `main` — so there was nothing to transcribe.
          The figure it replaces was four cells this page captioned in its own
          words; these are the commander page's own rows, and the three key
          lines are each visible in one of them. */}
      <CommanderAvailabilityFigureBody />
    </Specimen>
  );
}
function ReviewAndCommitFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="review-and-commit" width={width}>
      <ReviewAndCommitFigureBody />
    </Specimen>
  );
}

function NewDeckFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="new-deck" width={width}>
      <NewDeckFigureBody />
    </Specimen>
  );
}

function LockedCardsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="locked-cards" width={width}>
      <LockedCardsFigureBody />
    </Specimen>
  );
}

function ChangeCommanderFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="change-commander" width={width}>
      <ChangeCommanderFigureBody />
    </Specimen>
  );
}

function HelpMeChooseFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="help-me-choose" width={width}>
      <HelpMeChooseFigureBody />
    </Specimen>
  );
}

function FitsYourDecksFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="fits-your-decks" width={width}>
      <FitsYourDecksFigureBody />
    </Specimen>
  );
}

function StandInsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="stand-ins" width={width}>
      <StandInsFigureBody />
    </Specimen>
  );
}


// would let a caller invoke a missing one with no type error.
export const FIGURES: Partial<
  Record<string, (props: { width: AboutWidth }) => React.JSX.Element>
> = {
  availability: AvailabilityFigure,
  "commander-availability": CommanderAvailabilityFigure,
  "buy-tag": BuyTagFigure,
  statuses: StatusFigure,
  "fit-score": FitFigure,
  "decklist-marks": MarksFigure,
  sets: SetsFigure,
  browse: BrowseFigure,
  import: ImportFigure,
  "post-import": PostImportFigure,
  "import-issues": ImportIssuesFigure,
  "card-detail": CardDetailFigure,
  "role-coverage": RoleCoverageFigure,
  "log-findings": LogFindingsFigure,
  commitments: CommitmentsFigure,
  themes: ThemesFigure,
  "ready-to-build": ReadyToBuildFigure,
  "commander-lane": CommanderLaneFigure,
  discover: DiscoverFigure,
  partners: PartnersFigure,
  "deck-page": DeckPageFigure,
  "deck-analysis": DeckAnalysisFigure,
  "card-marks": CardMarksFigure,
  "auto-fill": AutoFillFigure,
  roles: RolesFigure,
  "combo-awareness": ComboAwarenessFigure,
  "informed-build": InformedBuildFigure,
  "decklist-order": DecklistOrderFigure,
  "add-cards": AddCardsFigure,
  "review-and-commit": ReviewAndCommitFigure,
  "new-deck": NewDeckFigure,
  "undo-removal": UndoRemovalFigure,
  "locked-cards": LockedCardsFigure,
  "change-commander": ChangeCommanderFigure,
  "help-me-choose": HelpMeChooseFigure,
  "fits-your-decks": FitsYourDecksFigure,
  "stand-ins": StandInsFigure,
  "deck-import": DeckImportFigure,
  versions: VersionsFigure,
  export: ExportFigure,
  shopping: ShoppingFigure,
  "log-a-game": LogAGameFigure,
  folders: FoldersFigure,
  resume: ResumeFigure,
  reservations: ReservationsFigure,
  proxies: ProxiesFigure,
};
