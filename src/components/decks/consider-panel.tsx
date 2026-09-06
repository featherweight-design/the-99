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
import { shelfRoleOf, type DeckSuggestion } from "../../lib/decks/suggest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { computeRoleCounts, RECOMMENDED_MIX, type MixRole } from "../../lib/decks/mix";
import type { ProvenanceForm } from "../../lib/decks/price";
import { SuggestionTile } from "./suggestion-tile";
import { ConsiderToolbar, type SortKey } from "./consider-toolbar";

// Two desktop rows, six phone rows. Named once so the cap, the `Show all N`
// count and the tests cannot drift apart.
export const SHELF_CAP = 12;

// The shelf heading's meta text, which the unowned shelf prints in two colours.
const META = "font-mono text-[10px] md:text-[11px]";

type ShelfRole = MixRole | "other";
const SHELF_ROLES: ShelfRole[] = ["ramp", "draw", "removal", "wipes", "land", "other"];

/** The card roles, plus the synergy shelf and the unowned append. */
type ShelfKey = ShelfRole | "synergy" | "unowned";

type Shelf = {
  key: ShelfKey;
  suggestions: DeckSuggestion[];
  /** Null on the "Threats & synergy" shelf, which has no target to be short of. */
  coverage: { have: number; target: number } | null;
};

function buildShelves(suggestions: DeckSuggestion[], deckCards: DeckDetailCard[]): Shelf[] {
  const counts = computeRoleCounts(deckCards);
  // A coverage shelf says "you have 2 of 10", which is a claim about cards you
  // can play tonight — so the unowned staples never mix into one.
  const owned = suggestions.filter((s) => s.owned);
  const shelves = SHELF_ROLES.map((role): Shelf => ({
    key: role,
    suggestions: owned.filter((s) => shelfRoleOf(s) === role),
    coverage: role === "other"
      ? null
      : { have: counts[role], target: RECOMMENDED_MIX[role].target },
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
  // getDeckSuggestions caps the append at five, so SHELF_CAP can never bite here.
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

function sortWithin(suggestions: DeckSuggestion[], sort: SortKey): DeckSuggestion[] {
  if (sort === "gaps") return suggestions;
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
  shelf, deckId, inDeckIds, selfClaimedIds, commanderShortName, first,
  newestAsOf, provenance,
}: {
  shelf: Shelf;
  deckId: string;
  /** A set rather than the array: every tile asks, and a deck runs to 99. */
  inDeckIds: Set<string>;
  /** `inDeckIds` plus the commander. See ConsiderPanel. */
  selfClaimedIds: Set<string>;
  commanderShortName: string;
  /** The 16px mobile gap sits between shelves, so the first one does not take it. */
  first: boolean;
  newestAsOf: Date | null;
  provenance: ProvenanceForm | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const headingId = `shelf-${shelf.key}`;
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
  const siblings = useMemo(() => shelf.suggestions.map((s) => s.oracleId), [shelf.suggestions]);

  return (
    <section
      aria-labelledby={headingId}
      className={`md:mt-0 md:mb-[20px] ${first ? "" : "mt-[16px]"}`}
    >
      <div className="flex items-baseline gap-[8px] md:gap-[10px] mb-[9px] md:mb-[11px]">
        {/* tabIndex -1: the coverage cell that sends the user here moves focus
            onto this heading, not just the scroll position. Never in the tab
            order — a programmatic focus target only. */}
        <h3
          id={headingId}
          tabIndex={-1}
          className="font-mono uppercase text-[10.5px] md:text-[11px] tracking-[0.14em]"
          style={{ color: "var(--accent)" }}
        >
          {label}
        </h3>
        {shelf.key === "unowned" ? (
          // Two colours, so two spans — but one paragraph, like every other
          // shelf. As two paragraphs the separator led a block of its own and a
          // screen reader read "dot, 1 to consider" as its own sentence; inside
          // the line it is punctuation between two clauses.
          <p className={META}>
            <span style={{ color: "var(--warning)" }}>{addPanelCopy.unowned.shelfCoverage}</span>{" "}
            <span style={{ color: "var(--fg-faint)" }}>
              {`· ${addPanelCopy.shelf.count(shelf.suggestions.length)}`}
            </span>
          </p>
        ) : isSynergyShelf ? (
          <p className={META} style={{ color: "var(--fg-faint)" }}>
            {synergyCopy.shelf.meta(String(shelf.suggestions.length))}
          </p>
        ) : (
          <p className={META} style={{ color: "var(--fg-faint)" }}>
            {shelf.coverage
              ? `${addPanelCopy.shelf.coverage(shelf.coverage.have, shelf.coverage.target)} · ${addPanelCopy.shelf.count(shelf.suggestions.length)}`
              : `${addPanelCopy.shelf.noTarget} · ${addPanelCopy.shelf.count(shelf.suggestions.length)}`}
          </p>
        )}
        {overflowing && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={
              expanded
                ? addPanelCopy.consider.collapse
                : addPanelCopy.consider.showAllAria(label.toLowerCase(), shelf.suggestions.length)
            }
            className="ml-auto p-0 font-mono text-[11px] cursor-pointer border-none bg-transparent text-accent hover:text-accent-hover"
          >
            {expanded
              ? addPanelCopy.consider.collapse
              : `${addPanelCopy.consider.showAll(shelf.suggestions.length)} →`}
          </button>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-[12px] md:grid-cols-6 md:gap-[14px]">
        {shown.map((s) => (
          <SuggestionTile
            key={s.oracleId}
            suggestion={s}
            deckId={deckId}
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
    </section>
  );
}

interface ConsiderPanelProps {
  deckId: string;
  suggestions: DeckSuggestion[];
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
  /** The newest `as_of` in `printing_prices`; the tags' liveness comparison. */
  newestAsOf?: Date | null;
  /** Server-built provenance, spoken in each priced tile's accessible name. */
  provenance?: ProvenanceForm | null;
}

export function ConsiderPanel({
  deckId, suggestions, deckCards, deckOracleIds, commanderOracleId, commanderShortName, degraded,
  sort, onSortChange, newestAsOf = null, provenance = null,
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
  const shelves = useMemo(
    () => buildShelves(suggestions, deckCards).map((shelf) => ({
      ...shelf,
      suggestions: sortWithin(shelf.suggestions, sort),
    })),
    [suggestions, deckCards, sort],
  );

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

          {shelves.map((shelf, i) => (
            <ShelfSection
              key={shelf.key}
              first={i === 0}
              shelf={shelf}
              deckId={deckId}
              inDeckIds={inDeckIds}
              selfClaimedIds={selfClaimedIds}
              commanderShortName={commanderShortName}
              newestAsOf={newestAsOf}
              provenance={provenance}
            />
          ))}
        </>
      )}
    </section>
  );
}
