// Which tabs the builder draws, and in what order.
//
// A PURE SEAM, extracted from `builder-shell.tsx` when the Analysis tab arrived. Three of the
// five cells are conditional — Versions is absent on a brew, Games drops its count at zero, and
// Analysis exists only where `ANALYSIS_TAB_ENABLED` is set — and the shell is far too heavy to
// mount in jsdom to find out which ones drew. The rules live here so a test can ask them
// directly, exactly as `buildMarkKeyEntries` does for the mark key.

import type { BuilderTabSpec } from "../../components/decks/builder-tabs";
import { addPanelCopy } from "../copy/decks-builder";
import { deckVersioningCopy, historyOriginCopy } from "../copy/deck-versioning";
import { gameLogCopy } from "../copy/game-log";

export function builderTabSpecs({
  built,
  suggestionCount,
  gameCount,
  versionCount,
  hasOrigin = false,
  analysisEnabled,
}: {
  built: number;
  suggestionCount: number;
  gameCount: number;
  versionCount: number;
  /** A linked deck's v0 (precons R3 K14): a row in the rail, so the tab draws on a linked brew. */
  hasOrigin?: boolean;
  analysisEnabled: boolean;
}): BuilderTabSpec[] {
  const rows = versionCount + (hasOrigin ? 1 : 0);
  return [
    {
      id: "deck",
      label: addPanelCopy.tabs.deck,
      count: built,
      accessibleName: addPanelCopy.tabs.deckAria(built),
    },
    // SECOND, per Round 0: the tab row is a reading order rather than a shelf, and analysis
    // answers the question between reading the list and going shopping. Fifth position would
    // put the newest tab behind the phone row's scroll.
    ...(analysisEnabled
      ? [
          {
            id: "analysis" as const,
            label: addPanelCopy.tabs.analysis,
            // No count. This tab carries a verdict rather than a number of things, and a
            // figure beside it would be read as one of the counts inside it.
            accessibleName: addPanelCopy.tabs.analysisAria,
          },
        ]
      : []),
    {
      id: "consider",
      label: addPanelCopy.tabs.consider,
      count: suggestionCount,
      accessibleName: addPanelCopy.tabs.considerAria(suggestionCount),
    },
    {
      id: "games",
      label: gameLogCopy.tab.label,
      // Omitted rather than zero: a tab reading "Games · 0" advertises its own emptiness.
      count: gameCount > 0 ? gameCount : undefined,
      accessibleName:
        gameCount > 0 ? gameLogCopy.tab.aria(String(gameCount)) : gameLogCopy.tab.ariaNone,
    },
    // Absent on a brew rather than empty: a deck with no version has no history, and a tab
    // saying so advertises its own emptiness (§Decisions 4). A LINKED brew has v0, so it is drawn
    // with a count of 1 (precons R3 K14) and the deck stays a brew. The count is the rail's rows.
    ...(rows > 0
      ? [
          {
            id: "versions" as const,
            label: deckVersioningCopy.history.tab,
            count: rows,
            accessibleName: hasOrigin
              ? historyOriginCopy.tabAria(versionCount)
              : deckVersioningCopy.history.tabAria(versionCount),
          },
        ]
      : []),
  ];
}
