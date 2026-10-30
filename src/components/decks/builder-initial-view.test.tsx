// The tab the arrival opens on. The tab row never writes `?tab=` — it is a row
// of buttons and switching is component state — so the parameter answers a
// Rule 0 table's `Log this game` link (`?tab=games`), or a URL written by hand
// or held in a bookmark. Parsing it is covered in
// `builder-view.test.ts`; what is only answerable through the shell is whether
// the parsed value actually decides which tab is selected on the first render.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
const { LandingKeyed } = await import("./landing-keyed");
const { BuilderScreenContext } = await import("./builder-screen");

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

async function mount(initialView: BuilderView) {
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
        statsData={{ commanders: [] }}
       newestAsOf={null}/>,
    );
  });
  return view;
}

describe("BuilderShell — a landing on the mounted shell (discovery R2 E11)", () => {
  // As the page renders it: the landing's tab as the opening view, under `LandingKeyed`.
  const shell = (landingRequest: string | null) => (
    <LandingKeyed request={landingRequest}>
      <BuilderShell mix={TEST_MIX}
        deck={DECK}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        initialView={landingRequest === null ? "deck" : "games"}
        statsData={null}
        newestAsOf={null}
        landing={landingRequest === null ? null : { tool: "matchups", target: "matchups", moment: "matchups", lands: { kind: "deck", tab: "games" } }}
        landingRequest={landingRequest}/>
    </LandingKeyed>
  );
  const selected = () => within(screen.getAllByRole("tablist")[0]).getByRole("tab", { selected: true });

  it("opens the tool's tab when a client navigation to the same deck brings a new ?tool=, and only once per request", async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(shell(null));
    });
    expect(selected()).toHaveTextContent(addPanelCopy.tabs.deck);
    await act(async () => view.rerender(shell("r1")));
    expect(selected()).toHaveTextContent(gameLogCopy.tab.label);
    // The reader moves on; a refresh carrying the same request leaves their tab alone.
    const deckTab = within(screen.getAllByRole("tablist")[0]).getAllByRole("tab").find((t) => t.textContent?.includes(addPanelCopy.tabs.deck))!;
    await act(async () => deckTab.click());
    await act(async () => view.rerender(shell("r1")));
    expect(selected()).toHaveTextContent(addPanelCopy.tabs.deck);
    await act(async () => view.rerender(shell("r2")));
    expect(selected()).toHaveTextContent(gameLogCopy.tab.label);
  });
});

describe("BuilderShell — a Shopping landing over the Stats panel (discovery R2 E11)", () => {
  it("puts Your deck back on its list when a same-deck ?tool= lands on Shopping", async () => {
    window.localStorage.setItem("the99:deck-panel", "stats");
    const shell = (landingRequest: string | null) => (
      <LandingKeyed request={landingRequest}>
        <BuilderShell mix={TEST_MIX}
          deck={DECK}
          suggestions={[]}
          degraded={false}
          firstRun={false}
          commanderIdentity={["B", "R", "G"]}
          arrivedFromImport={false}
          initialView="deck"
          statsData={{ commanders: [] }}
          newestAsOf={null}
          landing={landingRequest === null ? null : { tool: "stand-ins", target: "stand-ins", moment: "stand-ins", lands: { kind: "deck", tab: "deck", view: "shopping" } }}
          landingRequest={landingRequest}/>
      </LandingKeyed>
    );
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(shell(null));
    });
    fireEvent.click(screen.getByRole("tab", { name: deckStatsCopy.segment.aria }));
    expect(document.querySelector("[data-deck-stats]")).not.toBeNull();
    await act(async () => view.rerender(shell("r1")));
    expect(document.querySelector("[data-deck-stats]")).toBeNull();
    window.localStorage.removeItem("the99:deck-panel");
  });
});

describe("BuilderShell — the tab it opens on", () => {
  it("opens on the deck by default", async () => {
    await mount("deck");
    expect(within(screen.getAllByRole("tablist")[0]).getByRole("tab", { selected: true })).toHaveTextContent(
      addPanelCopy.tabs.deck,
    );
  });

  // The defect this guards: a route can link to `?tab=games` and be parsed
  // correctly while the shell still paints the decklist, which reads as the
  // link having gone nowhere.
  it("opens on the games log when the arrival names it", async () => {
    await mount("games");
    expect(within(screen.getAllByRole("tablist")[0]).getByRole("tab", { selected: true })).toHaveTextContent(
      gameLogCopy.tab.label,
    );
  });

  it("opens on the consider panel when the arrival names it", async () => {
    await mount("consider");
    expect(within(screen.getAllByRole("tablist")[0]).getByRole("tab", { selected: true })).toHaveTextContent(
      addPanelCopy.tabs.consider,
    );
  });

  // Stats is the deck list's second body. It survives the builder's own tab switches (the list
  // remounts on each) and must not survive opening another deck.
  it("keeps Stats across an in-deck tab switch, and opens a freshly opened deck on its list", async () => {
    window.localStorage.setItem("the99:deck-panel", "stats");
    const first = await mount("deck");
    expect(document.querySelector("[data-deck-stats]")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: deckStatsCopy.segment.aria }));
    expect(document.querySelector("[data-deck-stats]")).not.toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: new RegExp(gameLogCopy.tab.label) }));
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(addPanelCopy.tabs.deck) }));
    expect(document.querySelector("[data-deck-stats]")).not.toBeNull();

    first.unmount();
    window.localStorage.removeItem("the99:deck-panel");
    await mount("deck");
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

// `?panel=` (About visual PR 6a): the ?'s "Back to {deck}" returns to Shopping, Stats or Notes, which are builder state.
// What the builder publishes to the ? is the view it opened on, read through the same `deckViewOf` the ? reads.
describe("BuilderShell — the body Your deck opens on (?panel=)", () => {
  async function opened(initialView: BuilderView, initialBody: "shopping" | "stats" | "notes" | null) {
    const publish = vi.fn();
    await act(async () => {
      render(
        <BuilderScreenContext.Provider value={publish}>
          <BuilderShell mix={TEST_MIX}
            deck={DECK}
            suggestions={[]}
            degraded={false}
            firstRun={false}
            commanderIdentity={["B", "R", "G"]}
            arrivedFromImport={false}
            initialView={initialView}
            initialBody={initialBody}
            statsData={{ commanders: [] }}
            newestAsOf={null}/>
        </BuilderScreenContext.Provider>,
      );
    });
    return publish;
  }
  const last = (publish: ReturnType<typeof vi.fn>) => publish.mock.calls.at(-1)?.[0]?.view;

  it("opens on the body the address names", async () => {
    expect(last(await opened("deck", "shopping"))).toBe("shopping");
    cleanup();
    expect(last(await opened("deck", "stats"))).toBe("stats");
    cleanup();
    expect(last(await opened("deck", "notes"))).toBe("notes");
    cleanup();
    expect(last(await opened("deck", null))).toBe("your-deck");
  });

  it("publishes Consider as its own tab, reading as Your deck (Copilot round 2)", async () => {
    const publish = await opened("consider", null);
    expect(publish.mock.calls.at(-1)?.[0]).toEqual({ view: "your-deck", tab: "consider" });
  });

  it("ignores it on any other tab: the deck tab, once chosen, opens on its list", async () => {
    const publish = await opened("games", "stats");
    expect(last(publish)).toBe("games");
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(addPanelCopy.tabs.deck) }));
    expect(last(publish)).toBe("your-deck");
  });
});
