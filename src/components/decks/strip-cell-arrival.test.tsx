// Focus on arrival (#184).
//
// Activating a short coverage cell is a jump across the whole builder: it
// switches to Consider, scrolls to the role's shelf, and — the part that is
// easy to leave out — moves focus onto the shelf heading. Scrolling alone
// leaves a keyboard user's focus back on the strip, tabbing the whole way down
// to the thing they just asked for. Asserted end to end through the shell,
// because the three steps live in three different components.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

// The Consider panel's degraded banner re-fetches the page rather than owning
// a retry, so the panel needs a router even in the happy path.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { BuilderShell } = await import("./builder-shell");

// jsdom implements no layout, so it ships no scrollIntoView. Patch only when it
// is genuinely missing, as `filter-panel.test.tsx` and `arrival-chrome.test.tsx`
// do — an unconditional assignment outlives this file and makes run order matter
// for anything that spies on the same prototype method.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const deck = {
  id: "deck-1",
  name: "Korvold",
  createdAt: new Date("2026-01-01"),
  commander: {
    oracleId: "korvold",
    name: "Korvold, Fae-Cursed King",
    colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}",
    typeLine: "Legendary Creature — Dragon Noble",
    oracleText: null,
    imageUri: null,
  },
  cards: [],
  built: 0,
  ownedCount: 0,
  toBuyCount: 0,
  total: 0,
  unresolvedRows: [],
} as unknown as DeckDetail;

const suggestions: DeckSuggestionWithFacts[] = [
  {
    oracleId: "sol-ring",
    name: "Sol Ring",
    reason: "edhrec",
    reasonType: "coverage",
    reasonLabel: "Ramp",
    owned: true,
    inDeck: false,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "ramp",
    imageUri: null,
    manaCost: "{1}",
    manaValue: 1,
    inclusionPct: 80,
    lift: null,
  } as unknown as DeckSuggestionWithFacts,
];

describe("coverage cell arrival", () => {
  it.each([
    ["Analysis off", false],
    ["Analysis on", true],
  ])("switches to Consider and lands focus on the role's shelf heading (%s)", async (_label, analysisEnabled) => {
    render(
      <BuilderShell mix={TEST_MIX}
        deck={deck}
        suggestions={suggestions}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        analysisEnabled={analysisEnabled}
       newestAsOf={null}/>,
    );

    const cells = screen.getAllByRole("button", {
      name: addPanelCopy.strip.cellLinkAria(
        TEST_MIX.cells.ramp.label,
        0,
        TEST_MIX.cells.ramp.target,
      ),
    });
    expect(cells).toHaveLength(1);
    fireEvent.click(cells[0]);

    await waitFor(() => {
      const heading = document.getElementById("shelf-ramp");
      expect(heading).not.toBeNull();
      expect(heading).toHaveFocus();
    });
  });

  it("keeps one strip, and its cell still works, while the Analysis tab is open", async () => {
    render(
      <BuilderShell mix={TEST_MIX}
        deck={deck}
        suggestions={suggestions}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        analysisEnabled
        initialView="analysis"
       newestAsOf={null}/>,
    );

    expect(document.getElementById("panel-analysis")).not.toBeNull();
    expect(screen.getAllByLabelText("Recommended mix")).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", {
        name: addPanelCopy.strip.cellLinkAria(
          TEST_MIX.cells.ramp.label,
          0,
          TEST_MIX.cells.ramp.target,
        ),
      }),
    );

    await waitFor(() => {
      expect(document.getElementById("panel-analysis")).toBeNull();
      expect(document.getElementById("shelf-ramp")).toHaveFocus();
    });
  });
});
