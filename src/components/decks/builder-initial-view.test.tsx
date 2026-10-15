// The tab the arrival opens on. Nothing in the app writes `?tab=` — the tab row
// is a row of buttons and switching is component state — so the parameter
// answers a URL written by hand or held in a bookmark. Parsing it is covered in
// `builder-view.test.ts`; what is only answerable through the shell is whether
// the parsed value actually decides which tab is selected on the first render.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { gameLogCopy } from "../../lib/copy/game-log";
import type { DeckDetail } from "../../lib/decks/read";
import type { BuilderView } from "../../lib/decks/builder-view";
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
      cmc: 1,
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

async function mount(initialView: BuilderView, stats = false) {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <BuilderShell mix={TEST_MIX}
        deck={DECK}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        initialView={initialView}
        statsEnabled={stats}
        statsData={stats ? { commanders: [] } : null}
       newestAsOf={null}/>,
    );
  });
  return view;
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

  // Stats is the deck list's second body. It survives the builder's own tab switches (the list
  // remounts on each) and must not survive opening another deck.
  it("keeps Stats across an in-deck tab switch, and opens a freshly opened deck on its list", async () => {
    window.localStorage.setItem("the99:deck-panel", "stats");
    const first = await mount("deck", true);
    expect(document.querySelector("[data-deck-stats]")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: deckStatsCopy.segment.aria }));
    expect(document.querySelector("[data-deck-stats]")).not.toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: new RegExp(gameLogCopy.tab.label) }));
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(addPanelCopy.tabs.deck) }));
    expect(document.querySelector("[data-deck-stats]")).not.toBeNull();

    first.unmount();
    window.localStorage.removeItem("the99:deck-panel");
    await mount("deck", true);
    expect(document.querySelector("[data-deck-stats]")).toBeNull();
  });
});

// The grouping persists per reader, as the List / Card view does (segmented-switch plan, d9's ruling 3): one key
// for every deck, read after hydration, and written on every choice.
describe("BuilderShell — the grouping it opens on", () => {
  it("opens By type with nothing stored, keeps a choice, and opens the next deck on it", async () => {
    window.localStorage.removeItem("the99:deck-grouping");
    const first = await mount("deck");
    expect(screen.getByRole("radio", { name: "By type" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "By role" }));
    expect(window.localStorage.getItem("the99:deck-grouping")).toBe("role");
    expect(screen.getByRole("radio", { name: "By role" })).toHaveAttribute("aria-checked", "true");
    first.unmount();
    await mount("deck");
    expect(screen.getByRole("radio", { name: "By role" })).toHaveAttribute("aria-checked", "true");
    window.localStorage.removeItem("the99:deck-grouping");
  });
});
