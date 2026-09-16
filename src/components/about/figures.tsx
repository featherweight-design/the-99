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
import { OwnershipDot } from "../ui/ownership-dot";
import { COST_PIP_CAP, COST_PIP_SIZE, COST_TRACK, CostPips } from "../ui/cost-pips";
import { BuyTag } from "../decks/buy-tag";
import { ProxyTag } from "../decks/proxy-tag";
import { StatusPillBadge } from "../decks/status-pill";
import { SetCell } from "../sets/set-cell";
import { RoleChips } from "../commanders/role-chips";
import { GameAxisCell } from "../decks/game-axis-cell";
import { CommitmentsCard } from "../home/commitments-card";
import { THEMES } from "../../lib/theme/themes";
import { discoverCopy } from "../../lib/copy/lanes";
import { addPanelCopy, exportLinkOutCopy, exportTabCopy } from "../../lib/copy/decks-builder";
import { RECOMMENDED_MIX } from "../../lib/decks/mix";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { gameLogCopy } from "../../lib/copy/game-log";
import { topOffCopy } from "../../lib/copy/top-off";
import { folderCopy } from "../../lib/copy/folders";

import { GAME_AXIS_KEYS } from "../../lib/decks/game-axes";
import { deckSortLabel } from "../../lib/about/sort-labels";
import { DECK_GROUPING_LABELS } from "../../lib/copy/deck-sort";
import { BrowseFigureBody } from "./browse-figure";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import { statusBarStyle } from "../../lib/decks/status-style";
import type { StatusPill } from "../../lib/decks/status";
import { refreshCopy } from "../../lib/copy/refresh";
import { commandersCopy } from "../../lib/copy/lanes";
import { FitBar } from "../commanders/fit-bar";
import { TwoFacedMark } from "../cards/two-faced-mark";
import {
  LegendBox,
  Specimen,
  SpecimenCell,
  SpecimenGrid,
  SpecimenResponsive,
  SpecimenRows,
} from "./specimen";
import type { AboutWidth } from "../../lib/copy/about";
import {
  AVAILABILITY,
  CARDS,
  COMMITMENTS,
  COMMITMENTS_TOTAL_CARDS,
  GAME_AXES,
  GAME_COUNT,
  ROLE_COUNTS,
  SHOPPING,
  SET_CELLS,
  COSTS,
  FIT_DEGRADED,
  FIT_DEGRADED_SCORE,
  FIT_FULL,
  FIT_FULL_SCORE,
  PRICES,
  STATUSES,
} from "../../lib/about/fixtures";

/** The four availability states, including the one that draws nothing. */
function AvailabilityFigure({ width }: { width: AboutWidth }) {
  // The caption ANNOTATES; it never repeats the mark. The marker already draws
  // its own words — `1 in a brew`, `none free`, `short 2` — so a caption
  // echoing them reads as a stutter, which is what the close-out contact sheet
  // showed: `◆ none free` sitting directly above the words `none free`.
  //
  // `free` is the exception and has to be: it draws nothing at all, so its cell
  // would be blank without a caption saying what the blank means.
  const caption: Record<string, string> = {
    free: "nothing claims it — and free carries no mark anywhere",
    soft: "a deck you have never committed wants it",
    hard: "a committed deck holds every copy",
    over: "more copies are asked for than you own",
  };
  return (
    <Specimen label="availability" width={width}>
      {/* Rows below the wide stop: `none free` and `short 2` are the longest
          labels on the page, and a two-column grid at 390px wraps both. */}
      <SpecimenResponsive>
        {AVAILABILITY.map(({ key, a }) => (
          <SpecimenCell key={key} caption={caption[key]}>
            {/* free renders null, and that IS the state — the cell keeps its
                height so the absence reads as one of the four rather than as a
                figure that failed to draw. */}
            {/* `seam` is the hairline joining the two over-diamonds and only
                reads as a seam while it matches what is BEHIND it. It defaults
                to `--bg`; the plate is `--surface-sunken`. */}
            {/* `density="row"` leaves the font to the caller, and the real
                decklist row supplies these two classes. Without them the
                marker inherits this page's body type and shows a treatment
                the reader will never meet. */}
            <span className="font-mono text-[11px] min-[1000px]:text-[11.5px]">
              <AvailabilityMarker availability={a} density="row" seam="var(--surface-sunken)" />
            </span>
          </SpecimenCell>
        ))}
      </SpecimenResponsive>
    </Specimen>
  );
}

/** The four claims a buy tag makes, which are not four ways of saying "cost". */
function BuyTagFigure({ width }: { width: AboutWidth }) {
  // An inset frame is capped at 300px, which gives a four-column grid about
  // 55px a cell — `$2.10 foil` wraps, and the annotation under it wraps twice.
  const Layout = width === "inset" ? SpecimenRows : SpecimenGrid;
  const caption: Record<string, string> = {
    priced: "a figure — stocked today",
    foilOnly: "the only copies stocked are the shiny ones",
    soldOut: "stocked, none today",
    absent: "no price in the feed",
  };
  const newest = PRICES[0].fact.asOf;
  return (
    <Specimen label="buy-tag" width={width}>
      <Layout>
        {PRICES.map(({ state, fact }) => (
          <SpecimenCell key={state} caption={caption[state]}>
            <BuyTag
              variant="row"
              price={fact}
              // `soldOut` is a stale row against the newest stamp, so the
              // fixture's own date is the newest for three of the four and
              // deliberately not for that one.
              newestAsOf={state === "soldOut" ? new Date(newest.getTime() + 86_400_000) : newest}
              density="full"
            />
          </SpecimenCell>
        ))}
      </Layout>
    </Specimen>
  );
}

/**
 * All six statuses as the deck card draws them: `[badge] [count] [bar]`, and
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
function StatusFigure({ width }: { width: AboutWidth }) {
  const detail = refreshCopy.decks;
  // Only what the app actually renders. `detailCopies` was used here for
  // Building and Complete and prints `87 cards` — a string the deck card never
  // shows for either, because their figure is the count beside the bar.
  const clause: Partial<Record<StatusPill, string>> = {
    Draft: detail.detailDraft,
    Over: detail.detailOver(5),
    Unresolved: detail.detailUnresolved(2),
    "To buy": detail.detailToBuy(3, "$12.40"),
  };
  const built: Record<StatusPill, number> = {
    Draft: 0,
    Building: 87,
    Over: 104,
    Unresolved: 99,
    "To buy": 99,
    Complete: 99,
  };
  const BODY = 99;
  return (
    <Specimen label="status" width={width}>
      <div className="flex flex-col gap-[10px]">
        {STATUSES.map((status) => (
          <div key={status} className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[10px]">
              {/* The className is REQUIRED and it is the FOOTER's, not the
                  tile's: the component defaults to `TILE_CLASS`, which opens
                  `absolute bottom-[13px] left-[13px]` and would pin all six to
                  the page corner, and the deck card's own footer draws 22px
                  tall at 10.5px rather than the tile's 24px at 11px. */}
              <StatusPillBadge
                status={status}
                className="flex h-[22px] flex-none items-center rounded-[6px] px-[8px] font-mono text-[10.5px] tracking-[0.06em]"
              />
              <span className="flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                {`${built[status]} / ${BODY}`}
              </span>
              {/* The track is drawn for every status; the fill is omitted
                  entirely for Draft, which is what an empty track means. */}
              <div
                className="relative h-[3px] flex-1 rounded-full"
                style={{ background: "var(--border)" }}
              >
                {status !== "Draft" && (
                  <div
                    data-status-fill
                    className="absolute top-0 bottom-0 left-0 rounded-full"
                    style={statusBarStyle(status, built[status], BODY)}
                  />
                )}
              </div>
            </div>
            {clause[status] && (
              <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
                {clause[status]}
              </span>
            )}
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/** The bar, both shapes: three segments out of 100, and two out of 40. */
function FitFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="fit" width={width}>
      {/* No `legend`: FitBar draws it `hidden sm:flex`, so passing it would
          show one to a desktop reader and nothing to a phone, and the entry's
          key lines name the three parts for both.

          The captions are ANNOTATION — one mono line under the thing it names,
          which the grammar allows — not specimen strings. Prose inside the
          frame would be this page writing sentences the app does not ship,
          which is rule 4 of the copy file. */}
      <div className="flex flex-col gap-[14px]">
        {/* The headline beside each bar is the lane's OWN string — the entry's
            key says the sum is printed and checkable, and a caption of my own
            words would be this page inventing a figure the app renders. */}
        <SpecimenCell caption="pool + roles + synergy, and the sum is printed">
          <div className="w-full">
            <FitBar fit={FIT_FULL} />
            <p className="mt-[6px] font-mono text-[10.5px] text-[color:var(--fg-body)]">
              {FIT_FULL_SCORE}
              {commandersCopy.row.fitDenominator}
            </p>
          </div>
        </SpecimenCell>
        <SpecimenCell caption="synergy unmeasurable — two segments, and the denominator moves">
          <div className="w-full">
            <FitBar fit={FIT_DEGRADED} />
            <p className="mt-[6px] font-mono text-[10.5px] text-[color:var(--fg-body)]">
              {FIT_DEGRADED_SCORE}
              {commandersCopy.row.fitDenominatorMeasurable(40)}
            </p>
          </div>
        </SpecimenCell>
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
  const rows = [
    { name: CARDS.owned, cost: COSTS.simple, a: AVAILABILITY[0].a, note: "yours, and nothing wants it" },
    { name: CARDS.removed, cost: COSTS.crowded, a: AVAILABILITY[1].a, note: "an unfinished deck has claimed it" },
    { name: "Cyclonic Rift", cost: COSTS.simple, a: AVAILABILITY[3].a, note: "more asked for than you own" },
  ];
  return (
    <Specimen label="marks" width={width}>
      <div className="flex flex-col gap-[10px]">
        {rows.map((row) => (
          <div key={row.name} className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <OwnershipDot owned size={7} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-[color:var(--fg)]">
                {row.name}
              </span>
              {/* Cost before marker, which is the order the row draws them. */}
              <CostPips
                cost={row.cost}
                size={COST_PIP_SIZE}
                track={COST_TRACK}
                cap={COST_PIP_CAP}
              />
              {/* `density="row"` leaves the font to the caller, and the real
                  row supplies these two classes. */}
              <span className="font-mono text-[11px] min-[1000px]:text-[11.5px]">
                <AvailabilityMarker
                  availability={row.a}
                  density="row"
                  seam="var(--surface-sunken)"
                />
              </span>
            </div>
            <span className="font-mono text-[10px] leading-[1.35] text-[color:var(--fg-faint)]">
              {row.note}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-[8px]">
          <OwnershipDot owned={false} size={7} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[color:var(--fg)]">
            {CARDS.twoFaced}
          </span>
          <TwoFacedMark layout="transform" />
          {/* `collapsed`, not `full`: the row draws the shopping treatment only
              inside Shopping, and everywhere else the mark is a bare `$` —
              which is the mark this entry's key line names. */}
          <BuyTag
            variant="row"
            price={PRICES[0].fact}
            newestAsOf={PRICES[0].fact.asOf}
            density="collapsed"
          />
        </div>
        <span className="font-mono text-[10px] leading-[1.35] text-[color:var(--fg-faint)]">
          not owned — the buy mark takes the slot, and `//` says two faces
        </span>

        {/* The same slot, and the other mark that can hold it: a card you are
            printing is not bought and not owned, so `P` replaces `$` rather
            than joining it. */}
        <div className="flex items-center gap-[8px]">
          <OwnershipDot owned={false} size={7} />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[color:var(--fg)]">
            {CARDS.proxied}
          </span>
          <ProxyTag variant="row" />
        </div>
        <span className="font-mono text-[10px] leading-[1.35] text-[color:var(--fg-faint)]">
          one you are printing — `P` takes the slot instead of `$`
        </span>
      </div>
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
  const caption = [
    "owned",
    "matched by name, not by printing",
    "your only copy is foil",
    "missing — dimmed, dashed, and carrying a price",
  ];
  const newest = PRICES[0].fact.asOf;
  return (
    <Specimen label="sets" width={width}>
      {/* The header first: the completion figure is read against the BASE RUN
          while the cell count includes the extras, and the entry's key line is
          about exactly that disagreement. Four cells alone cannot teach it. */}
      <div className="mb-[12px] flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
        <span className="font-mono text-[12px] text-[color:var(--fg)]">162 / 208 · 78%</span>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
          321 cells · 171 yours, 150 missing
        </span>
      </div>
      <SpecimenGrid>
        {SET_CELLS.map((cell, i) => (
          <SpecimenCell key={cell.scryfallId} caption={caption[i]}>
            <div className="w-[88px]">
              <SetCell
                cell={cell}
                // Only the missing cell is priced: an owned one never carries a
                // figure, which is half of what tells the two apart.
                price={cell.owned ? null : PRICES[0].fact}
                newestAsOf={cell.owned ? null : newest}
              />
            </div>
          </SpecimenCell>
        ))}
      </SpecimenGrid>
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
      <div className="flex flex-col gap-[8px]">
        {["Moxfield", "Archidekt", "Deckbox", "ManaBox"].map((source) => (
          <span key={source} className="font-mono text-[11px] text-[color:var(--fg-body)]">
            {source} · CSV
          </span>
        ))}
        <span className="mt-[4px] font-mono text-[11px] text-[color:var(--warning)]">
          replaces — never adds
        </span>
      </div>
    </Specimen>
  );
}

/**
 * The post-import summary's three sections, in the app's own words. A card
 * moves between them; no deck is edited.
 */
function PostImportFigure({ width }: { width: AboutWidth }) {
  const c = cardAssignmentsCopy.summary;
  return (
    <Specimen label="post-import" width={width}>
      <div className="flex flex-col gap-[8px]">
        {[c.sectionCleared(61), c.sectionStill(12), c.sectionShort(2)].map((heading) => (
          <span key={heading} className="font-mono text-[11px] text-[color:var(--fg-body)]">
            {heading}
          </span>
        ))}
      </div>
    </Specimen>
  );
}

/** The inspector's two tabs: a name we could not match, and a line we could not read. */
function ImportIssuesFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="import-issues" width={width}>
      <div className="flex flex-wrap items-center gap-[10px]">
        {[issueInspectorCopy.tabs.unmatched, issueInspectorCopy.tabs.parseErrors].map((tab) => (
          <span
            key={tab}
            className="rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[9px] py-[4px] font-mono text-[11px] text-[color:var(--fg-body)]"
          >
            {tab}
          </span>
        ))}
      </div>
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
      <SpecimenGrid>
        <SpecimenCell caption="the printing you picked">
          <span className="font-mono text-[12px] text-[color:var(--accent)]">✓</span>
        </SpecimenCell>
        <SpecimenCell caption="the one being shown now">
          <span className="font-mono text-[12px] text-[color:var(--fg-faint)]">◇</span>
        </SpecimenCell>
        <SpecimenCell caption="two faces, and the back is castable">
          <TwoFacedMark layout="transform" />
        </SpecimenCell>
        {/* `allFaces`, because the entry's subject is a card that prints TWO
            costs — a modal DFC's back face is castable and the modal is the one
            surface drawing both. The default draws the front alone, which is
            the right pips for the wrong card. */}
        <SpecimenCell caption="both halves, when a card prints two">
          <CostPips cost={COSTS.twoFaced} allFaces size={COST_PIP_SIZE} />
        </SpecimenCell>
      </SpecimenGrid>
    </Specimen>
  );
}

/**
 * The four roles a deck is measured on, each against its own baseline — which
 * is what the entry is about: a short role is the one thing on the page that
 * names what to do next, and the fixture is short on wipes alone so the figure
 * teaches one gap rather than a list of them.
 */
function RoleCoverageFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="role-coverage" width={width}>
      {/* `RoleChips` is the commander page's own, and it colours a role that
          is SHORT of its baseline — which is the entry's subject: a 1 of 3 on
          wipes is what tells you what to fix before you commit. */}
      <RoleChips roleCounts={ROLE_COUNTS} />
    </Specimen>
  );
}

/** What the log says back once there are enough games for it to say anything. */
function LogFindingsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="log-findings" width={width}>
      <div className="flex flex-col gap-[10px]">
        {GAME_AXES.map((tally, i) => (
          <GameAxisCell
            key={tally.key}
            tally={tally}
            gameCount={GAME_COUNT}
            // Seven games clears PATTERN_MIN, so the cells take their buckets.
            // Below it every cell is neutral, and a figure drawn there would
            // teach the waiting state while the caption talks about findings.
            bucket={i === 0 ? "fix" : "keep"}
          />
        ))}
      </div>
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
      <div className="grid grid-cols-2 gap-[8px] min-[1000px]:grid-cols-3">
        {THEMES.map((theme) => (
          <div
            key={theme.key}
            className="flex flex-col gap-[4px] rounded-[8px] border border-solid border-[color:var(--border)] px-[10px] py-[8px]"
            data-theme={theme.key}
          >
            {/* The swatch is the entry's subject — a theme changes the palette
                and nothing else — and a grid of names alone does not show it.
                `data-theme` puts each tile in its own theme's tokens, which is
                the same mechanism the app uses. */}
            <span className="flex gap-[3px]">
              {["--accent", "--success", "--danger"].map((token) => (
                <span
                  key={token}
                  className="h-[8px] w-[14px] rounded-[2px]"
                  style={{ background: `var(${token})` }}
                />
              ))}
            </span>
            <span className="text-[12.5px] text-[color:var(--fg)]">{theme.name}</span>
            {/* The plane is the SUBTITLE, never the label: you pick Neon Rain,
                not Kamigawa, and an earlier figure had them the other way up. */}
            {/* `short`, which is what the picker draws — the full plane name
                is "Kamigawa: Neon Dynasty" where the app says "Kamigawa". */}
            <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
              {theme.short}
            </span>
          </div>
        ))}
      </div>
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
function Line({ mark, meaning }: { mark: React.ReactNode; meaning: string }) {
  return (
    <div className="flex items-baseline gap-[10px]">
      <dt className="flex-none font-mono text-[11px] text-[color:var(--fg-body)]">{mark}</dt>
      <dd className="m-0 font-mono text-[10px] leading-[1.4] text-[color:var(--fg-faint)]">
        {meaning}
      </dd>
    </div>
  );
}

function Legend({
  label,
  width,
  rows,
}: {
  label: string;
  width: AboutWidth;
  rows: { mark: React.ReactNode; meaning: string }[];
}) {
  return (
    <LegendBox label={label} width={width}>
      {rows.map((row, i) => (
        <Line key={i} mark={row.mark} meaning={row.meaning} />
      ))}
    </LegendBox>
  );
}

function ReadyToBuildFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="ready-to-build"
      width={width}
      rows={[
        { mark: refreshCopy.home.fitLine(1615), meaning: "how much of your collection fits" },
        { mark: refreshCopy.home.inUse(550), meaning: "and how much of that is sleeved elsewhere" },
        {
          mark: refreshCopy.home.moreAbove(7, 61),
          meaning: "the nine are a rank cut — the floor moves with your collection",
        },
      ]}
    />
  );
}

function CommanderLaneFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="commander-lane"
      width={width}
      rows={[
        { mark: commandersCopy.availability.all, meaning: "scored against everything you own" },
        {
          mark: commandersCopy.availability.free,
          meaning: "scored against what no finished deck is holding",
        },
        {
          mark: commandersCopy.row.fitDenominatorMeasurable(40),
          meaning: "where a commander's most-played list could not be read",
        },
      ]}
    />
  );
}

function DiscoverFigure({ width }: { width: AboutWidth }) {
  const o = discoverCopy.order;
  return (
    <Legend
      label="discover"
      width={width}
      rows={[
        { mark: o.bestFit, meaning: o.bestFitGloss },
        { mark: o.somethingNew, meaning: o.somethingNewGloss },
        { mark: o.popularity, meaning: o.popularityGloss },
        { mark: o.name, meaning: o.nameGloss },
        { mark: o.recent, meaning: o.recentGloss },
      ]}
    />
  );
}

function PartnersFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="partners"
      width={width}
      rows={[
        { mark: "99", meaning: "a single commander and the ninety-nine behind it" },
        { mark: "98", meaning: "a pair deck is still a hundred cards, so its 99 is 98" },
      ]}
    />
  );
}

function DeckPageFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="deck-page"
      width={width}
      rows={[
        { mark: `${addPanelCopy.tabs.deck} · 99`, meaning: "the list itself" },
        { mark: `${addPanelCopy.tabs.consider} · 80`, meaning: "cards this commander wants that are not in it yet" },
        { mark: gameLogCopy.tab.label, meaning: "no count until one is logged — the absence is the signal" },
        { mark: `${deckVersioningCopy.history.tab} · 1`, meaning: "what you committed, and when" },
      ]}
    />
  );
}

function AutoFillFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="auto-fill"
      width={width}
      rows={[
        { mark: "63 / 99", meaning: "assembled from what you own the moment you pick a commander" },
        { mark: topOffCopy.strip.open("36"), meaning: "fills what is left, from your collection, in one pass" },
        { mark: recommendationsCopy.auto.clearAll("36"), meaning: "and undoes the lot if you would rather pick yourself" },
      ]}
    />
  );
}

function RolesFigure({ width }: { width: AboutWidth }) {
  // A LEGEND, not `RoleChips`. That component is the commander page's own
  // (role-chips.tsx:1-3) and this entry is about the DECK page, which draws
  // `RoleCounterStrip` — five cells including Land, and the rationale as a real
  // disclosure button. Mounting the commander chips here taught a surface the
  // deck page never draws, and mounting the strip would need a deck.
  return (
    <Legend
      label="roles"
      width={width}
      rows={[
        { mark: `${RECOMMENDED_MIX.ramp.label} · 12 of ${RECOMMENDED_MIX.ramp.target}`, meaning: "a surplus, not an error — nothing here is capped" },
        { mark: `${RECOMMENDED_MIX.wipes.label} · 1 of ${RECOMMENDED_MIX.wipes.target}`, meaning: "a short role is the one thing that names what to do next" },
        {
          mark: addPanelCopy.strip.rationaleToggle,
          meaning: "and the baselines are the format's, not this commander's",
        },
      ]}
    />
  );
}

function DecklistOrderFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="decklist-order"
      width={width}
      rows={[
        {
          mark: `${DECK_GROUPING_LABELS.role} / ${DECK_GROUPING_LABELS.type}`,
          meaning: "the list is always in sections — that is how a deck is short",
        },
        {
          mark: deckSortLabel("name"),
          meaning: "and the order you pick applies inside them",
        },
        { mark: deckSortLabel("mana"), meaning: "curve up, or curve down" },
        {
          mark: deckSortLabel("price"),
          meaning: "offered on the shopping filter only, where money is the question",
        },
      ]}
    />
  );
}

function AddCardsFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="add-cards" width={width}>
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <OwnershipDot owned size={7} />
          <span className="text-[12.5px] text-[color:var(--fg)]">{CARDS.owned}</span>
        </div>
        <div className="flex items-center gap-[8px]">
          <OwnershipDot owned={false} size={7} />
          <span className="text-[12.5px] text-[color:var(--fg)]">{CARDS.proxied}</span>
        </div>
        <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
          the dot is on every result, whether you own it or not
        </span>
      </div>
    </Specimen>
  );
}

function UndoRemovalFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="undo-removal"
      width={width}
      rows={[
        { mark: addPanelCopy.undo.removed(CARDS.removed), meaning: "the row becomes its own undo" },
        { mark: addPanelCopy.undo.action, meaning: "and the count, the total and the claim all come back together" },
        { mark: deckVersioningCopy.restore.cta, meaning: "the same thing on the review screen, for a cut of one copy" },
      ]}
    />
  );
}

function DeckImportFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="deck-import"
      width={width}
      rows={[
        { mark: deckImportCopy.entry.modePaste, meaning: "a list from anywhere" },
        { mark: deckImportCopy.entry.modeFile, meaning: "or the file you exported" },
        { mark: deckImportCopy.update.entryLabel, meaning: "the same route updates a deck you already have" },
      ]}
    />
  );
}

function VersionsFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="versions"
      width={width}
      rows={[
        { mark: "draft", meaning: "every add and cut, until you commit" },
        { mark: `v2 · ${deckVersioningCopy.history.current}`, meaning: "what the deck is sleeved as" },
        { mark: "v1", meaning: "and what it was, with the change between them readable" },
      ]}
    />
  );
}

function ExportFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="export"
      width={width}
      rows={[
        { mark: exportTabCopy.decklist, meaning: "the whole 99, as text a deckbuilding site will read" },
        { mark: exportTabCopy.shopping, meaning: "or only what this deck has to buy" },
        { mark: exportLinkOutCopy.shopping, meaning: "a link out, in a new tab, with nothing of yours attached" },
      ]}
    />
  );
}

function ShoppingFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="shopping"
      width={width}
      rows={[
        { mark: refreshCopy.decks.detailToBuy(23, "$124.40"), meaning: "across the library, not one deck at a time" },
        { mark: "own it, still buying", meaning: "an older finished deck is holding your only copy" },
      ]}
    />
  );
}

function LogAGameFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="log-a-game"
      width={width}
      rows={[
        { mark: `${gameLogCopy.form.won} / ${gameLogCopy.form.lost} / ${gameLogCopy.form.draw}`, meaning: "and how big the pod was" },
        { mark: `${GAME_AXIS_KEYS.length} axes`, meaning: "each markable as what worked or what let you down" },
        // The form says this itself, in one line, so the figure says it in the
        // form's own words rather than a paraphrase of them.
        { mark: gameLogCopy.form.optionalNote, meaning: "the form says so, under the axes" },
      ]}
    />
  );
}

function FoldersFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="folders"
      width={width}
      rows={[
        { mark: folderCopy.shelves.all, meaning: "every deck, which is where you start" },
        { mark: "a shelf", meaning: "a deck sits on one or on none" },
        { mark: "narrows, never filters", meaning: "it spends no accent and no chip, and Clear all leaves it alone" },
      ]}
    />
  );
}

function ResumeFigure({ width }: { width: AboutWidth }) {
  const c = refreshCopy.home.touched;
  return (
    <Legend
      label="resume"
      width={width}
      rows={[
        { mark: c.edited(refreshCopy.home.elapsed.hours(2)), meaning: "you changed the draft" },
        { mark: c.committed(refreshCopy.home.elapsed.yesterday), meaning: "you cut a version" },
        { mark: c.played(refreshCopy.home.elapsed.days(2)), meaning: "you logged a game" },
      ]}
    />
  );
}

function ReservationsFigure({ width }: { width: AboutWidth }) {
  return (
    <Legend
      label="reservations"
      width={width}
      rows={[
        { mark: "first committed", meaning: "holds the copy by default" },
        { mark: cardAssignmentsCopy.contested.headingSpare, meaning: "and you can override that whenever you like" },
      ]}
    />
  );
}

function ProxiesFigure({ width }: { width: AboutWidth }) {
  return (
    <Specimen label="proxies" width={width}>
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <ProxyTag variant="row" />
          <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
            leaves the buy list without joining your collection
          </span>
        </div>
        <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">
          set completion does not move — a proxy is a card you can play with, not one you have
        </span>
      </div>
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
 * spare copies read the same as a card sleeved into a finished deck — and a
 * figure showing the marker alone would teach the half that was never broken.
 *
 * Real components, real fixtures: `OwnershipDot` and `AvailabilityMarker` are
 * the ones the panel mounts, so a change to either lands here on the next
 * render rather than leaving this page quietly out of date.
 */
function CommanderAvailabilityFigure({ width }: { width: AboutWidth }) {
  // The caption annotates; it never repeats the mark. `free` is the exception
  // for the reason `AvailabilityFigure` gives: it draws nothing, so its cell
  // would be blank without a caption saying the blank is the state.
  const caption: Record<string, string> = {
    free: "owned, with a copy to spare — and a spare copy is drawn as silence",
    soft: "owned, and a deck you have not committed wants it",
    hard: "owned, and every copy is in a committed deck",
    over: "your committed decks want more copies than you own",
  };
  return (
    <Specimen label="owned, and what is claiming it" width={width}>
      <SpecimenResponsive>
        {AVAILABILITY.map(({ key, a }) => (
          <SpecimenCell key={key} caption={caption[key]}>
            <span className="inline-flex items-center" style={{ gap: 6 }}>
              {/* The dot is the same at all four readings. That IS the change:
                  it is ownership and nothing else now, so the four cells differ
                  only in what the marker beside it says. */}
              <OwnershipDot owned size={6} className="block" />
              {/* The chip's own type, not this page's: 10.5px mono is what the
                  Role Coverage chip supplies, and without it the marker would
                  show a treatment the reader never meets. */}
              <span className="font-mono text-[10.5px] font-[600] tracking-[0.02em]">
                <AvailabilityMarker
                  availability={a}
                  nameless
                  spoken={false}
                  seam="var(--surface-sunken)"
                />
              </span>
            </span>
          </SpecimenCell>
        ))}
      </SpecimenResponsive>
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
  "auto-fill": AutoFillFigure,
  roles: RolesFigure,
  "decklist-order": DecklistOrderFigure,
  "add-cards": AddCardsFigure,
  "undo-removal": UndoRemovalFigure,
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
