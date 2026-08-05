"use client";
// ConsiderPanel — discovery is a room, per design table §2 and §3.
//
// A peer tab of the decklist rather than an overlay, so the coverage strip above
// stays on screen and a shelf can say what the strip already claimed. Shelves
// are ordered by what the deck is most short of, which is the whole argument for
// showing them as shelves and not one flat list.

import { useMemo, useState } from "react";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { computeRoleCounts, RECOMMENDED_MIX, type MixRole } from "../../lib/decks/mix";
import { SuggestionTile } from "./suggestion-tile";

// Two desktop rows, six phone rows. Named once so the cap, the `Show all N`
// count and the tests cannot drift apart.
export const SHELF_CAP = 12;

type ShelfRole = MixRole | "other";
const SHELF_ROLES: ShelfRole[] = ["ramp", "draw", "removal", "wipes", "land", "other"];

type SortKey = "gaps" | "edhrec" | "cheapest";

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
    suggestions: suggestions.filter((s) => s.role === role),
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

function ShelfSection({
  shelf, deckId, deckOracleIds, commanderShortName,
}: {
  shelf: Shelf;
  deckId: string;
  deckOracleIds: string[];
  commanderShortName: string;
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
    <section aria-labelledby={headingId} className="mt-[16px] md:mt-0 md:mb-[20px]">
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
            inDeck={deckOracleIds.includes(s.oracleId)}
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
}

export function ConsiderPanel({
  deckId, suggestions, deckCards, deckOracleIds, commanderShortName, degraded,
}: ConsiderPanelProps) {
  const [sort, setSort] = useState<SortKey>("gaps");
  const shelves = useMemo(
    () => buildShelves(suggestions, deckCards).map((shelf) => ({
      ...shelf,
      suggestions: sortWithin(shelf.suggestions, sort),
    })),
    [suggestions, deckCards, sort],
  );

  return (
    <section
      role="tabpanel"
      aria-label={addPanelCopy.tabs.panelAria}
      className="px-[16px] pt-[12px] md:px-[30px] md:pt-[16px]"
    >
      {degraded && (
        <div
          className="mb-[16px] pl-[12px] py-[8px]"
          style={{ borderLeft: "3px solid var(--warning)" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "var(--fg)" }}>
            <span aria-hidden>⚠ </span>{addPanelCopy.degraded.heading}
          </p>
          <p className="text-[12.5px] mt-[3px]" style={{ color: "var(--fg-body)" }}>
            {addPanelCopy.degraded.body(commanderShortName)}
          </p>
        </div>
      )}

      {shelves.length === 0 ? (
        <div className="py-[40px] text-center">
          <h3 className="text-[16px] font-semibold" style={{ color: "var(--fg)" }}>
            {addPanelCopy.considerEmpty.heading}
          </h3>
          <p
            className="mt-[8px] mx-auto max-w-[420px] text-[13px] leading-[1.5]"
            style={{ color: "var(--fg-body)" }}
          >
            {addPanelCopy.considerEmpty.body(commanderShortName)}
          </p>
          <a
            href="/collection"
            className="inline-block mt-[16px] rounded-[8px] px-[16px] py-[9px] text-[13px] font-semibold bg-brass text-bg hover:bg-brass-hover"
          >
            {addPanelCopy.considerEmpty.cta}
          </a>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between md:justify-end gap-[12px] mb-[14px]">
            <label className="contents">
              <span className="sr-only">{addPanelCopy.consider.sortLabel}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label={addPanelCopy.consider.sortAria}
                className="rounded-[8px] px-[11px] py-[7px] md:px-[12px] text-[12px] md:text-[12.5px] font-medium cursor-pointer md:order-2"
                style={{
                  background: "var(--elevated)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--fg)",
                }}
              >
                <option value="gaps">{addPanelCopy.consider.sortGaps}</option>
                <option value="edhrec">{addPanelCopy.consider.sortEdhrec}</option>
                <option value="cheapest">{addPanelCopy.consider.sortCheapest}</option>
              </select>
            </label>
            <p
              className="font-mono text-[10px] md:text-[10.5px] md:order-1"
              style={{ color: "var(--fg-faint)" }}
            >
              {addPanelCopy.consider.provenance(suggestions.filter((s) => s.owned).length)}
            </p>
          </div>

          {shelves.map((shelf) => (
            <ShelfSection
              key={shelf.role}
              shelf={shelf}
              deckId={deckId}
              deckOracleIds={deckOracleIds}
              commanderShortName={commanderShortName}
            />
          ))}
        </>
      )}
    </section>
  );
}
