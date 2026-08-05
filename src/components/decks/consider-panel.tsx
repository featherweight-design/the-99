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
import { computeRoleCounts, RECOMMENDED_MIX, type MixRole } from "../../lib/decks/mix";
import { SuggestionTile } from "./suggestion-tile";
import { ConsiderToolbar, type SortKey } from "./consider-toolbar";

// Two desktop rows, six phone rows. Named once so the cap, the `Show all N`
// count and the tests cannot drift apart.
export const SHELF_CAP = 12;

type ShelfRole = MixRole | "other";
const SHELF_ROLES: ShelfRole[] = ["ramp", "draw", "removal", "wipes", "land", "other"];

type Shelf = {
  role: ShelfRole;
  suggestions: DeckSuggestion[];
  /** Null on the "Threats & synergy" shelf, which has no target to be short of. */
  coverage: { have: number; target: number } | null;
};

function buildShelves(suggestions: DeckSuggestion[], deckCards: DeckDetailCard[]): Shelf[] {
  const counts = computeRoleCounts(deckCards);
  const shelves = SHELF_ROLES.map((role): Shelf => ({
    role,
    suggestions: suggestions.filter((s) => shelfRoleOf(s) === role),
    coverage: role === "other"
      ? null
      : { have: counts[role], target: RECOMMENDED_MIX[role].target },
  })).filter((shelf) => shelf.suggestions.length > 0);

  // Most-short-of first; the targetless shelf sorts last because it cannot be
  // short of anything.
  return shelves.sort((a, b) => {
    const gap = (s: Shelf) => (s.coverage ? s.coverage.target - s.coverage.have : -Infinity);
    return gap(b) - gap(a);
  });
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
          style={{ background: "#3A3229" }}
        />
      ))}
    </div>
  );
}

function ShelfSection({
  shelf, deckId, inDeckIds, commanderShortName, first,
}: {
  shelf: Shelf;
  deckId: string;
  /** A set rather than the array: every tile asks, and a deck runs to 99. */
  inDeckIds: Set<string>;
  commanderShortName: string;
  /** The 16px mobile gap sits between shelves, so the first one does not take it. */
  first: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const headingId = `shelf-${shelf.role}`;
  const label = addPanelCopy.shelf.labels[shelf.role];
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
        <h3
          id={headingId}
          className="font-mono uppercase text-[10.5px] md:text-[11px] tracking-[0.14em]"
          style={{ color: "var(--brass)" }}
        >
          {label}
        </h3>
        <p className="font-mono text-[10px] md:text-[11px]" style={{ color: "var(--fg-faint)" }}>
          {shelf.coverage
            ? `${addPanelCopy.shelf.coverage(shelf.coverage.have, shelf.coverage.target)} · ${addPanelCopy.shelf.count(shelf.suggestions.length)}`
            : `${addPanelCopy.shelf.noTarget} · ${addPanelCopy.shelf.count(shelf.suggestions.length)}`}
        </p>
        {overflowing && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={
              expanded
                ? addPanelCopy.consider.collapse
                : addPanelCopy.consider.showAllAria(label.toLowerCase(), shelf.suggestions.length)
            }
            className="ml-auto p-0 font-mono text-[11px] cursor-pointer border-none bg-transparent text-brass hover:text-brass-hover"
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
            siblings={siblings}
            commanderShortName={commanderShortName}
          />
        ))}
      </ul>
    </section>
  );
}

interface ConsiderPanelProps {
  deckId: string;
  suggestions: DeckSuggestion[];
  /** The server's decklist. Feeds both the coverage figures and each tile's inDeck. */
  deckCards: DeckDetailCard[];
  deckOracleIds: string[];
  commanderShortName: string;
  degraded: boolean;
  /** Owned by the shell: the desktop toolbar rides the tab row, outside this panel. */
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

export function ConsiderPanel({
  deckId, suggestions, deckCards, deckOracleIds, commanderShortName, degraded,
  sort, onSortChange,
}: ConsiderPanelProps) {
  const router = useRouter();
  const inDeckIds = useMemo(() => new Set(deckOracleIds), [deckOracleIds]);
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
      aria-labelledby="tab-consider"
      aria-label={addPanelCopy.tabs.panelAria}
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
              className="p-0 text-[12.5px] underline border-none bg-transparent cursor-pointer text-brass hover:text-brass-hover"
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
              "radial-gradient(320px 180px at 50% 70%, rgba(201,162,75,0.06), transparent 70%)",
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
              degraded={degraded}
            />
          </div>

          {shelves.map((shelf, i) => (
            <ShelfSection
              key={shelf.role}
              first={i === 0}
              shelf={shelf}
              deckId={deckId}
              inDeckIds={inDeckIds}
              commanderShortName={commanderShortName}
            />
          ))}
        </>
      )}
    </section>
  );
}
