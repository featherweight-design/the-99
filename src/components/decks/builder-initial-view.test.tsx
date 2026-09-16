// The tab the arrival opens on. Nothing in the app writes `?tab=` — the tab row
// is a row of buttons and switching is component state — so the parameter
// answers a URL written by hand or held in a bookmark. Parsing it is covered in
// `builder-view.test.ts`; what is only answerable through the shell is whether
// the parsed value actually decides which tab is selected on the first render.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { gameLogCopy } from "../../lib/copy/game-log";
import type { DeckDetail } from "../../lib/decks/read";
import type { BuilderView } from "../../lib/decks/builder-view";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { BuilderShell } = await import("./builder-shell");

const DECK = {
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
  partner: null,
  cards: [
    {
      oracleId: "sol-ring",
      name: "Sol Ring",
      quantity: 1,
      typeLine: "Artifact",
      cardTypeGroup: "Artifacts" as const,
      role: "other" as const,
      owned: true,
    },
  ],
  built: 1,
  ownedCount: 1,
  toBuyCount: 0,
  total: 1,
  unresolvedRows: [],
} as unknown as DeckDetail;

async function mount(initialView: BuilderView) {
  await act(async () => {
    render(
      <BuilderShell
        deck={DECK}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        initialView={initialView}
       newestAsOf={null}/>,
    );
  });
}

describe("BuilderShell — the tab it opens on", () => {
  it("opens on the deck by default", async () => {
    await mount("deck");
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
      addPanelCopy.tabs.deck,
    );
  });

  // The defect this guards: a route can link to `?tab=games` and be parsed
  // correctly while the shell still paints the decklist, which reads as the
  // link having gone nowhere.
  it("opens on the games log when the arrival names it", async () => {
    await mount("games");
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
      gameLogCopy.tab.label,
    );
  });

  it("opens on the consider panel when the arrival names it", async () => {
    await mount("consider");
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
      addPanelCopy.tabs.consider,
    );
  });
});
