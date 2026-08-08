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
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { RECOMMENDED_MIX } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";

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

// jsdom has no layout, so scrollIntoView is not implemented on the prototype.
Element.prototype.scrollIntoView = vi.fn();

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

const suggestions: DeckSuggestion[] = [
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
  } as unknown as DeckSuggestion,
];

describe("coverage cell arrival", () => {
  it("switches to Consider and lands focus on the role's shelf heading", async () => {
    render(
      <BuilderShell
        deck={deck}
        suggestions={suggestions}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: addPanelCopy.strip.cellLinkAria(
          RECOMMENDED_MIX.ramp.label,
          0,
          RECOMMENDED_MIX.ramp.target,
        ),
      }),
    );

    await waitFor(() => {
      const heading = document.getElementById("shelf-ramp");
      expect(heading).not.toBeNull();
      expect(heading).toHaveFocus();
    });
  });
});
