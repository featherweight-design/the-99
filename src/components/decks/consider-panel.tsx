"use client";
// ConsiderPanel — discovery is a room, per design table §2 and §3.
//
// A peer tab of the decklist rather than an overlay, so the coverage strip above
// stays on screen and a shelf can say what the strip already claimed. Shelves
// are ordered by what the deck is most short of, which is the whole argument for
// showing them as shelves and not one flat list.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GhostButton } from "../ui/button";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { shelfRoleOf, type DeckSuggestion, type DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { type MixRole, type RecommendedMix } from "../../lib/decks/mix";
import { useRoleCounter } from "./label-rows-context";
import { preferByTypeGap, tallyTypes, typeDeficits } from "../../lib/decks/fill-shape";
import type { ProvenanceForm } from "../../lib/decks/price";
import { SuggestionTile } from "./suggestion-tile";
import { AddSurfaceMarkKey } from "./add-surface-mark-key";
import type { Bracket } from "../../lib/bracket/types";
import type { NoteCounts } from "../../lib/bracket/card-note";
import { ConsiderToolbar, type SortKey } from "./consider-toolbar";
import { SHELF_CAP } from "../../lib/decks/shelf-cap";
import { useFoldedShelves } from "./use-folded-shelves";
import { CHEVRON_CLASS } from "../ui/chevron";

// Named once, in its own module, so the cap, the `Show all N` count, the server's
// unowned append and the tests cannot drift apart (#391).
export { SHELF_CAP } from "../../lib/decks/shelf-cap";

// The shelf heading's meta text, which the unowned shelf prints in two colours.
const META = "font-mono text-[10.5px] md:text-[11px]";

type ShelfRole = MixRole | "other";
const SHELF_ROLES: ShelfRole[] = ["ramp", "draw", "removal", "wipes", "land", "other"];

/** The card roles, plus the synergy shelf and the unowned append. */
type ShelfKey = ShelfRole | "synergy" | "unowned";

type Shelf = {
  key: ShelfKey;
  suggestions: DeckSuggestionWithFacts[];
  /** Null on the "Threats & synergy" shelf, which has no target to be short of. */
  coverage: { have: number; target: number } | null;
};

function buildShelves(suggestions: DeckSuggestionWithFacts[], counts: Record<MixRole, number>, mix: RecommendedMix): Shelf[] {
  // A coverage shelf says "you have 2 of 10", which is a claim about cards you
  // can play tonight — so the unowned staples never mix into one.
  const owned = suggestions.filter((s) => s.owned);
  const shelves = SHELF_ROLES.map((role): Shelf => ({
    key: role,
    suggestions: owned.filter((s) => shelfRoleOf(s) === role),
    coverage: role === "other"
      ? null
      : { have: counts[role], target: mix.cells[role].target },
  })).filter((shelf) => shelf.suggestions.length > 0);

  // Most-short-of first; the targetless shelf sorts last because it cannot be
  // short of anything.
  shelves.sort((a, b) => {
    const gap = (s: Shelf) => (s.coverage ? s.coverage.target - s.coverage.have : -Infinity);
    return gap(b) - gap(a);
  });

  // Synergy shelf: owned EDHREC picks sorted by synergyFigure descending,
  // figureless ones last. Role suggestions are excluded because they carry no
  // EDHREC figure at all — including them would duplicate the coverage shelves
  // above and bury the ranking under "no synergy figure" rows. An EDHREC pick
  // EDHREC reported no synergy for does stay, and keeping it is what makes that
  // line reachable.
  // Placed below the sorted coverage shelves and above the unowned append —
  // appended rather than ranked because it has no gap score to sort by.
  //
  // The shelf as a whole still needs one figure to exist. A figureless card sits
  // inside a ranking and reads as an exception to it; a shelf where nothing has
  // a figure is not a ranking at all, only the coverage shelves repeated under a
  // heading that promises "ranked by synergy". Surface A draws the same line —
  // with no synergy data the commander's panel is not rendered either.
  const synergySorted = owned
    .filter((s) => s.reasonType === "edhrec")
    .sort((a, b) => (b.synergyFigure ?? -Infinity) - (a.synergyFigure ?? -Infinity));
  if (synergySorted.some((s) => s.synergyFigure != null)) {
    shelves.push({ key: "synergy" as const, suggestions: synergySorted, coverage: null });
  }

  // Unowned append — below the synergy shelf, and nothing sorts below -Infinity.
  // loadDeckSuggestions trims the append to SHELF_CAP, so this shelf fills to the
  // same cap as every other one and never overflows it.
  const unowned = suggestions.filter((s) => !s.owned);
  return unowned.length > 0
    ? [...shelves, { key: "unowned" as const, suggestions: unowned, coverage: null }]
    : shelves;
}

/**
 * The roles that actually have a shelf on Consider, which is not every short
 * role: a shelf is built from owned suggestions only and dropped when it would
 * be empty, so a deck short of wipes with nothing owned to offer has no
 * `#shelf-wipes` to scroll to. The coverage strip gates its cells on this, or
 * a short cell becomes a control whose only effect is to switch tabs.
 */
export function rolesWithShelves(suggestions: DeckSuggestion[]): ReadonlySet<MixRole> {
  const roles = new Set<MixRole>();
  for (const s of suggestions) {
    if (!s.owned) continue;
    const role = shelfRoleOf(s);
    if (role !== "other") roles.add(role);
  }
  return roles;
}

/**
 * The order WITHIN one shelf.
 *
 * `gaps` was the pass-through, so the player saw whatever the pool happened to produce. Role
 * floors and type targets are different axes that collide through the cards satisfying both —
 * of two cards closing the same role, the one closing the larger TYPE gap is the better slot,
 * and this is where that belongs.
 *
 * THE OTHER BRANCHES KEEP THEIR MEANING. `cheapest` is a promise about mana value and synergy
 * is a promise about EDHREC's figure; neither is "the deck's shape", and re-ordering them by
 * type would quietly break a control the player is using to ask a different question.
 *
 * AND TWO SHELVES ARE EXEMPT FROM `gaps` ENTIRELY, because their order is their claim. The
 * synergy shelf is built by sorting on `synergyFigure` and says so on its face — `ranked by
 * synergy · {n} to consider` — and the unowned append is EDHREC's own top picks. `gaps` is
 * the DEFAULT sort (`builder-shell.tsx`), so re-ordering them here would have shipped a
 * synergy shelf ordered by type under a heading claiming otherwise, to every reader, before
 * they touched the control. Before this change `gaps` was a pass-through and both were safe
 * by accident; now they are safe on purpose.
 */
function sortWithin<T extends DeckSuggestion>(
  suggestions: T[],
  sort: SortKey,
  mix: RecommendedMix,
  deckCards: DeckDetailCard[],
  shelfKey: ShelfKey,
): T[] {
  if (sort === "gaps") {
    if (shelfKey === "synergy" || shelfKey === "unowned") return suggestions;
    // `preferByTypeGap` from `fill-shape.ts`, never a second copy — one definition of "which
    // of these two cards closes more of the deck's shape".
    //
    // THAT IS NOT THE SAME AS AGREEING WITH THE FILL, and an earlier comment here claimed it
    // was. `planFill` uses this only as a TIE-BREAK: it orders by `closes()` first, so a
    // dual-role card covering two open floors outranks a bigger type gap; it stays inside an
    // ownership tier; it scans a bounded window; and it recomputes deficits after every
    // placement. Ramp shelf with a creature that is ramp alone against an artifact that is
    // ramp and draw with both floors open — the panel offers the creature, the fill takes the
    // artifact. Both are right about their own question. The panel ranks what is worth
    // considering NOW, against the deck as it stands; the fill builds a sequence.
    //
    // What sharing the function buys is that the two never disagree about the COMPARISON.
    // Task 20 asks for exactly that and no more.
    const deficits = typeDeficits(
      mix.types,
      // Defaulted, and honestly: `typeLine` and `quantity` are both REQUIRED on
      // `DeckDetailCard` (`grouping.ts`), so no production row can arrive without them and
      // this is unreachable there. What reaches it is this file's own `deckCard()` helper,
      // which casts `{ role, quantity }` through `as DeckDetailCard`. The default stays
      // because a crash inside an ORDERING is a page the reader cannot open over a
      // preference they cannot see — but it is belt-and-braces on a required field, not
      // cover for a payload shape that exists.
      tallyTypes(deckCards.map((c) => ({
        typeLine: c.typeLine ?? "", quantity: c.quantity ?? 1,
      }))),
    );
    // No composition is no opinion — the shelf keeps the pool's own order rather than being
    // re-sorted by a tie-break over zeroes.
    if (deficits.size === 0) return suggestions;
    return [...suggestions].sort((a, b) => preferByTypeGap(a, b, deficits));
  }
  const sorted = [...suggestions];
  if (sort === "cheapest") return sorted.sort((a, b) => a.manaValue - b.manaValue);
  // A card with no EDHREC figure sorts below every card that has one, rather
  // than tying with the least-played card at 0%.
  return sorted.sort((a, b) => (b.inclusionPct ?? -1) - (a.inclusionPct ?? -1));
}

/**
 * Three diamonds standing in for a fan of cards. Decorative and hidden from
 * assistive tech: the heading below already says the deck is out of ideas, and
 * a screen reader has nothing to gain from three rotated squares.
 */
function CardFan() {
  return (
    <div className="flex gap-[8px] mb-[20px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[11px] h-[11px] rotate-45 border border-[color:var(--border-strong)]"
          style={{ background: "var(--border-strong)" }}
        />
      ))}
    </div>
  );
}

function ShelfSection({
  shelf, deckId, declaredBracket, noteCounts, inDeckIds, selfClaimedIds, commanderShortName,
  first, newestAsOf, provenance, folded, onToggleFold,
}: {
  shelf: Shelf;
  deckId: string;
  /** Straight through to each tile's card note. See `ConsiderPanelProps`. */
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;
  /** A set rather than the array: every tile asks, and a deck runs to 99. */
  inDeckIds: Set<string>;
  /** `inDeckIds` plus the commander. See ConsiderPanel. */
  selfClaimedIds: Set<string>;
  commanderShortName: string;
  /** The 16px mobile gap sits between shelves, so the first one does not take it. */
  first: boolean;
  newestAsOf: Date | null;
  provenance: ProvenanceForm | null;
  /** Whether this shelf is folded shut — owned by `ConsiderPanel`, since the one
   *  localStorage key holds every shelf's state for this deck. */
  folded: boolean;
  onToggleFold: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Folding CLEARS the expansion (handoff s4) — adjusted DURING RENDER, the
  // pattern React's own docs give for "reset state when a prop changes",
  // rather than a `useEffect` whose synchronous `setState` this codebase's
  // lint rule rejects as a cascading-render risk. `prevFolded` is the only
  // state this needs: when it disagrees with the live `folded` prop, this is
  // the first render to see that transition, so clearing `expanded` now lands
  // in the SAME commit rather than one render late.
  //
  // On EVERY transition into folded, not only one this tab's own click
  // initiated — `useFoldedShelves` also subscribes to another tab's write
  // (`subscribeToKey`'s `storage` listener), so a shelf expanded here and
  // folded from a second tab must still reopen capped, not resuming an
  // expansion that external write knows nothing about (Copilot round 1,
  // medium).
  const [prevFolded, setPrevFolded] = useState(folded);
  if (folded !== prevFolded) {
    setPrevFolded(folded);
    if (folded && expanded) setExpanded(false);
  }
  const headingId = `shelf-${shelf.key}`;
  const bodyId = `${headingId}-body`;
  // The SECTION's accessible name stays the bare label (`aria-labelledby`
  // targets this id, not the h3's own) — the disclosure button's name is
  // richer, carrying the count clause too, but "Ramp, 2 of 5, 3 to
  // consider" is not a useful region name and every coverage-cell focus
  // target and test keys off the plain label.
  const labelId = `${headingId}-label`;
  const isSynergyShelf = shelf.key === "synergy";
  const label = shelf.key === "unowned"
    ? addPanelCopy.shelf.labels.edhrec(commanderShortName)
    : isSynergyShelf
      ? synergyCopy.shelf.label(commanderShortName)
      : addPanelCopy.shelf.labels[shelf.key as ShelfRole];
  const overflowing = shelf.suggestions.length > SHELF_CAP;
  const shown = expanded ? shelf.suggestions : shelf.suggestions.slice(0, SHELF_CAP);
  // The modal pages the whole shelf, not just the tiles currently drawn — a
  // collapsed shelf is a display choice, not a shorter role group.
  const siblings = useMemo(
    () => shelf.suggestions.map((s) => ({ oracleId: s.oracleId, name: s.printedName ?? s.name, imageUri: s.imageUri })),
    [shelf.suggestions],
  );

  const clause = shelf.key === "unowned" ? (
    // Two colours, so two spans — but one run, like every other shelf's. As
    // two separate paragraphs the separator led a block of its own and a
    // screen reader read "dot, 1 to consider" as its own sentence; inline
    // it is punctuation between two clauses.
    <span className={META}>
      <span style={{ color: "var(--warning)" }}>{addPanelCopy.unowned.shelfCoverage}</span>{" "}
      <span style={{ color: "var(--fg-muted)" }}>
        {`· ${addPanelCopy.shelf.count(shelf.suggestions.length)}`}
      </span>
    </span>
  ) : isSynergyShelf ? (
    <span className={META} style={{ color: "var(--fg-muted)" }}>
      {synergyCopy.shelf.meta(String(shelf.suggestions.length))}
    </span>
  ) : (
    <span className={META} style={{ color: "var(--fg-muted)" }}>
      {shelf.coverage
        ? `${addPanelCopy.shelf.coverage(shelf.coverage.have, shelf.coverage.target)} · ${addPanelCopy.shelf.count(shelf.suggestions.length)}`
        : `${addPanelCopy.shelf.noTarget} · ${addPanelCopy.shelf.count(shelf.suggestions.length)}`}
    </span>
  );

  return (
    <section
      data-testid="consider-shelf"
      data-shelf-key={shelf.key}
      aria-labelledby={labelId}
      className={`md:mt-0 md:mb-[20px] border-t border-border-strong ${first ? "" : "mt-[16px]"}`}
    >
      <div className="flex items-baseline gap-[8px] md:gap-[10px] mb-[9px] md:mb-[11px] md:min-h-[44px]">
        {/* tabIndex -1: the coverage cell that sends the user here moves focus
            onto this heading, not just the scroll position. Never in the tab
            order — a programmatic focus target only. The disclosure button
            lives INSIDE it and carries the normal tab stop. */}
        <h3 id={headingId} tabIndex={-1} className="m-0 flex-1">
          <button
            type="button"
            aria-expanded={!folded}
            // `undefined` when folded: the `<ul id={bodyId}>` below is UNMOUNTED, not
            // hidden, so a bare `aria-controls={bodyId}` would name an id no element in
            // the document carries — the same dangling-reference guard `builder-tabs.tsx`,
            // `unresolved-row.tsx`, `combo-partners-detail.tsx` and `issue-inspector.tsx`
            // already apply to their own disclosures (pre-open review).
            aria-controls={folded ? undefined : bodyId}
            onClick={onToggleFold}
            className="flex items-baseline gap-x-[8px] md:gap-x-[10px] min-h-[52px] md:min-h-[44px] p-0 border-none bg-transparent cursor-pointer text-left"
          >
            <span
              aria-hidden
              className={`inline-block ${CHEVRON_CLASS} transition-transform duration-150 ${folded ? "" : "rotate-90"}`}
              style={{ color: "var(--fg-muted)" }}
            >
              ▸
            </span>
            {/* Label and clause share ONE group, not two flex-wrap siblings of the
                button: a flex-wrap item that wraps starts at the CONTAINER's edge,
                under the chevron, not under the preceding sibling — which is not
                what "the clause wraps under the label" means (Copilot round 2,
                medium "previously missed"). Column on phone, row from `md`. */}
            <span className="flex flex-col md:flex-row md:items-baseline gap-x-[10px] gap-y-[2px]">
              <span
                id={labelId}
                data-testid="shelf-label"
                className="font-sans font-semibold text-[16px] md:text-[17px] leading-[1.2]"
                style={{ color: "var(--fg)" }}
              >
                {label}
              </span>
              {clause}
            </span>
          </button>
        </h3>
        {!folded && overflowing && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={
              expanded
                ? addPanelCopy.consider.collapse
                : addPanelCopy.consider.showAllAria(label.toLowerCase(), shelf.suggestions.length)
            }
            className="ml-auto p-0 font-mono text-[11.5px] text-fg-body cursor-pointer border-none bg-transparent min-h-[44px] inline-flex items-center"
          >
            {expanded
              ? addPanelCopy.consider.collapse
              : `${addPanelCopy.consider.showAll(shelf.suggestions.length)} →`}
          </button>
        )}
      </div>
      {folded ? null : (
      <ul id={bodyId} className="grid grid-cols-2 gap-[12px] md:grid-cols-6 md:gap-[14px]">
        {shown.map((s) => (
          <SuggestionTile
            key={s.oracleId}
            suggestion={s}
            deckId={deckId}
            declaredBracket={declaredBracket}
            noteCounts={noteCounts}
            inDeck={inDeckIds.has(s.oracleId)}
            selfClaimed={selfClaimedIds.has(s.oracleId)}
            siblings={siblings}
            commanderShortName={commanderShortName}
            showNoSynergy={isSynergyShelf}
            newestAsOf={newestAsOf}
            provenance={provenance}
          />
        ))}
      </ul>
      )}
    </section>
  );
}

interface ConsiderPanelProps {
  /** What this deck is compared to, resolved once per request by the route. A PROP rather than
   *  an import: the targets are per-commander now, and a component reaching for a module
   *  constant would draw one deck's recommendation on every deck. */
  mix: RecommendedMix;
  deckId: string;
  /**
   * The deck's live declaration and what its list already holds of each note-bearing kind —
   * the card note's two deck-level inputs, threaded to every tile.
   *
   * REQUIRED here for the reason `newestAsOf` below is required here: the tile requires them,
   * so leaving the boundary optional at the panel would put the hole one level up, where a
   * caller compiles and every tile draws its ordinals from zero. A wrong figure rather than a
   * missing prop, and silent.
   */
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;
  suggestions: DeckSuggestionWithFacts[];
  /**
   * The optimistic decklist, so the coverage figures move the moment a card is
   * added. Membership is not read from here: `deckOracleIds` is the committed
   * truth behind each tile's inDeck, and a tile that flipped optimistically
   * would un-flip if the server rejected the add.
   */
  deckCards: DeckDetailCard[];
  deckOracleIds: string[];
  /**
   * The commander is not a `deck_cards` row (availability-query.ts:25), so it
   * is absent from `deckOracleIds` while the availability query still counted
   * its claim. Without it, a suggested commander reads as another deck's claim.
   */
  commanderOracleId: string;
  commanderShortName: string;
  degraded: boolean;
  /** Owned by the shell: the desktop toolbar rides the tab row, outside this panel. */
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  /**
   * The newest `as_of` in `printing_prices`; the tags' liveness comparison.
   *
   * REQUIRED, with no default. This is the BOUNDARY: `SuggestionTile` below it is
   * required, so making only the tile required left the hole one level up — a
   * caller could omit it here, compile, and render every live suggestion price as
   * `absent`. That is the same silent bare-buy failure this sweep exists to
   * prevent, reached through the parent instead of the child.
   */
  newestAsOf: Date | null;
  /** Server-built provenance, spoken in each priced tile's accessible name. */
  provenance?: ProvenanceForm | null;
}

export function ConsiderPanel({
  mix,
  deckId, declaredBracket, noteCounts, suggestions, deckCards, deckOracleIds,
  commanderOracleId, commanderShortName, degraded,
  sort, onSortChange, newestAsOf, provenance = null,
}: ConsiderPanelProps) {
  const router = useRouter();
  const inDeckIds = useMemo(() => new Set(deckOracleIds), [deckOracleIds]);
  // Distinct from `inDeckIds`, which drives each tile's "In deck" state: this
  // answers "did the excluded query drop a claim of ours", which is the only
  // thing `selfExcluded` is allowed to mean.
  const selfClaimedIds = useMemo(
    () => new Set([...deckOracleIds, commanderOracleId]),
    [deckOracleIds, commanderOracleId],
  );
  const countRoles = useRoleCounter();
  const shelves = useMemo(
    () => buildShelves(suggestions, countRoles(deckCards), mix).map((shelf) => ({
      ...shelf,
      suggestions: sortWithin(shelf.suggestions, sort, mix, deckCards, shelf.key),
    })),
    // `mix` is a dependency: `buildShelves` counts coverage against its targets, so a
    // refreshed mix with the same suggestions and cards would otherwise leave every shelf
    // reading against the previous commander's figures.
    [suggestions, deckCards, sort, mix, countRoles],
  );
  const { isFolded, toggleFold } = useFoldedShelves(deckId);

  return (
    <section
      id="panel-consider"
      role="tabpanel"
      // The tab is the panel's name, and aria-labelledby wins over aria-label
      // regardless — a second name here would simply never be read.
      aria-labelledby="tab-consider"
      className="px-[16px] pt-[12px] md:px-[30px] md:pt-[16px]"
    >
      {degraded && (
        <div
          className="flex items-start gap-[11px] mb-[16px] rounded-[9px] px-[15px] py-[11px] bg-[color:var(--surface-sunken)] border border-[color:var(--border)] border-l-[3px] border-l-[color:var(--warning)]"
        >
          <span
            aria-hidden
            className="text-[13px] leading-[1.3] text-[color:var(--warning)]"
          >
            ⚠
          </span>
          <p className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
            <span className="font-semibold text-[color:var(--fg)]">
              {addPanelCopy.degraded.heading}
            </span>{" "}
            {addPanelCopy.degraded.body(commanderShortName)}{" "}
            {/* Inline at the end of the body, not a block button: the outage is a
                sentence, and the way out of it belongs in that sentence. */}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="p-0 text-[12.5px] underline border-none bg-transparent cursor-pointer text-accent hover:text-accent-hover"
            >
              {addPanelCopy.degraded.retry}
            </button>
          </p>
        </div>
      )}

      {shelves.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center px-[30px] py-[28px]"
          style={{
            background:
              "radial-gradient(320px 180px at 50% 70%, color-mix(in oklab, var(--accent) 6%, transparent), transparent 70%)",
          }}
        >
          <CardFan />
          <h3
            className="font-display font-semibold text-[18px] mb-[10px]"
            style={{ color: "var(--fg)" }}
          >
            {addPanelCopy.considerEmpty.heading}
          </h3>
          <p
            className="mx-auto max-w-[420px] text-[13.5px] leading-[1.6]"
            style={{ color: "var(--fg-body)" }}
          >
            {addPanelCopy.considerEmpty.body(commanderShortName)}
          </p>
          {/* Secondary, per the §404 CTA contract: running out of suggestions is
              a compliment, not a task the deck is waiting on. */}
          <GhostButton
            href="/collection"
            className="mt-[22px] rounded-[8px] px-[20px] py-[11px] text-[14px]"
          >
            {addPanelCopy.considerEmpty.cta}
          </GhostButton>
        </div>
      ) : (
        <>
          {/* Phone only: at desktop width the same toolbar is mounted on the tab
              row by the shell, per §1. */}
          <div className="flex md:hidden items-center justify-between gap-[12px] mb-[14px]">
            <ConsiderToolbar
              sort={sort}
              onSortChange={onSortChange}
              ownedCount={suggestions.filter((s) => s.owned).length}
              unownedCount={suggestions.filter((s) => !s.owned).length}
              degraded={degraded}
            />
          </div>

          {/* THE KEY, once for the panel rather than once per shelf — the marks are one
              vocabulary and a reader learns it once. Above the shelves, so it is met before
              the first glyph rather than after the last.

              Unconditional, unlike the decklist's: a shelf is a WINDOW capped at `SHELF_CAP`
              behind a `Show all`, so "no Game Changer on this screen" is not "none among the
              candidates". See `AddSurfaceMarkKey`. */}
          <AddSurfaceMarkKey className="mb-[14px]" />

          {shelves.map((shelf, i) => (
            <ShelfSection
              // Keyed on deckId too, not just the shelf key: `BuilderShell` is
              // retained across a deck-to-deck navigation (the same component
              // instance re-renders with a new `deck` prop rather than
              // unmounting), so a `ShelfSection` for the same role would
              // otherwise carry deck A's `expanded` state — a local "Show
              // all" that is never persisted — straight into deck B's shelf
              // of the same key (Copilot round 3, medium "previously
              // missed"). The deckId in the key forces a fresh mount, which
              // resets every bit of this component's local state at once
              // rather than tracking one more "did this prop change" case.
              key={`${deckId}-${shelf.key}`}
              first={i === 0}
              shelf={shelf}
              deckId={deckId}
              declaredBracket={declaredBracket}
              noteCounts={noteCounts}
              inDeckIds={inDeckIds}
              selfClaimedIds={selfClaimedIds}
              commanderShortName={commanderShortName}
              newestAsOf={newestAsOf}
              provenance={provenance}
              folded={isFolded(shelf.key)}
              onToggleFold={() => toggleFold(shelf.key)}
            />
          ))}
        </>
      )}
    </section>
  );
}
