// The Tuning hub and its three tools are loaded on demand (tuning-tools.tsx) and WARMED, so opening
// the Analysis tab never waits on their code: at idle once the deck page has loaded, on intent (the
// Analysis tab or a shortcut into a tool), and on the press itself. Each case counts how often the
// four tools have arrived, read from `tuningToolsReady()` of the module instance the shell itself uses.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";

const hub = vi.hoisted(() => ({ requests: [] as unknown[] }));
vi.mock("./tuning-hub", () => ({
  TuningHub: (p: { request?: unknown }) => { hub.requests.push(p.request ?? null); return <p>hub drawn</p>; },
}));
vi.mock("./tuning-panel", () => ({ TuningPanel: () => <p>suggested drawn</p> }));
vi.mock("./cuts-panel", () => ({ CutsPanelView: () => <p>cuts drawn</p> }));
vi.mock("./mana-balance-panel", () => ({ ManaBalancePanel: () => <p>mana drawn</p> }));
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(), getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(), removeCardFromDeck: vi.fn(), deleteDeck: vi.fn(), renameDeck: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../lib/notices/actions", () => ({ peekNotices: vi.fn(async () => null), openNotices: vi.fn(async () => null) }));
// The Analysis tab, drawing only the hub slot: what the shell hands it is what a reader would see.
vi.mock("./analysis-panel", () => ({
  AnalysisPanel: (p: { hub?: (permits: null) => React.ReactNode }) => <div>{p.hub?.(null)}</div>,
}));

const DECK = {
  id: "deck-1",
  name: "Korvold",
  createdAt: new Date("2026-01-01"),
  commander: {
    oracleId: "korvold", name: "Korvold, Fae-Cursed King", colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}", typeLine: "Legendary Creature — Dragon Noble", oracleText: null, imageUri: null,
  },
  partner: null,
  cards: [{ oracleId: "sol-ring", name: "Sol Ring", quantity: 1, typeLine: "Artifact", cardTypeGroup: "Artifacts" as const, role: "other" as const, owned: true }],
  built: 1,
  ownedCount: 1,
  toBuyCount: 0,
  total: 1,
  unresolvedRows: [],
} as unknown as DeckDetail;

const NONE = [false, false, false, false];
const ALL = [true, true, true, true];
const loaded = async () => Object.values((await import("./tuning-tools")).tuningToolsReady());
const settle = () => new Promise((r) => setTimeout(r, 50));

beforeEach(() => {
  vi.resetModules();
  hub.requests.length = 0;
});
// Unmounted before the stubs go: the shell cancels its idle callback on unmount.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderShell(flags: Record<string, boolean>, initialView: "deck" | "analysis" = "deck") {
  const { BuilderShell } = await import("./builder-shell");
  render(
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      analysisEnabled initialView={initialView} {...flags} />,
  );
}

describe("warming the Tuning tools", () => {
  it("loads nothing until something asks", async () => {
    await import("./tuning-tools");
    await settle();
    expect(await loaded()).toEqual(NONE);
  });

  it("loads all four at idle once the deck page has loaded, with a tool switch on", async () => {
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal("cancelIdleCallback", (id: number) => clearTimeout(id));
    await renderShell({ tuningEnabled: true });
    await vi.waitFor(async () => expect(await loaded()).toEqual(ALL));
  });

  it("loads nothing with every tool switch off", async () => {
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal("cancelIdleCallback", (id: number) => clearTimeout(id));
    await renderShell({});
    await settle();
    expect(await loaded()).toEqual(NONE);
  });

  it("loads them when a pointer rests on the Analysis tab, before any idle time", async () => {
    // An idle callback that never comes: only the intent can load them here.
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    await renderShell({ tuningEnabled: true });
    await settle();
    expect(await loaded()).toEqual(NONE);
    fireEvent.pointerOver(screen.getByRole("tab", { name: /analysis/i }));
    await vi.waitFor(async () => expect(await loaded()).toEqual(ALL));
  });

  it("does not load them for a pointer on another tab", async () => {
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    await renderShell({ tuningEnabled: true });
    fireEvent.pointerOver(screen.getByRole("tab", { name: /games/i }));
    await settle();
    expect(await loaded()).toEqual(NONE);
  });

  it("loads them when focus reaches a shortcut into a tool", async () => {
    const { warmTuningToolsOnIntent } = await import("./tuning-tools");
    render(<button type="button" {...warmTuningToolsOnIntent}>Proposed cuts</button>);
    fireEvent.focusIn(screen.getByRole("button", { name: "Proposed cuts" }));
    await vi.waitFor(async () => expect(await loaded()).toEqual(ALL));
  });

  it("draws nothing for a tool until its code has arrived, then draws it", async () => {
    const { TuningHub, tuningToolsReady } = await import("./tuning-tools");
    expect(tuningToolsReady().hub).toBe(false);
    const hubProps = { deckId: "d", drawn: true, tools: [] } as unknown as Parameters<typeof TuningHub>[0];
    render(<TuningHub {...hubProps} />);
    // The mount itself asks for the code, so it arrives; until then nothing is drawn.
    await screen.findByText("hub drawn");
    expect(tuningToolsReady().hub).toBe(true);
  });

  it("keeps a shortcut's ask for the hub until the hub has loaded, then hands it over", async () => {
    // Nothing warms it: no idle time, and the press is the first intent. The hub arrives after the ask.
    vi.stubGlobal("requestIdleCallback", () => 0);
    vi.stubGlobal("cancelIdleCallback", () => {});
    const over = { ...DECK, built: 101, cards: Array.from({ length: 101 }, (_, i) => ({ ...DECK.cards[0], oracleId: `c${i}`, name: `Card ${i}` })) } as unknown as DeckDetail;
    const { BuilderShell } = await import("./builder-shell");
    render(
      <BuilderShell mix={recommendedMix(null, false)} deck={over} suggestions={[]} degraded={false} firstRun={false}
        commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
        analysisEnabled tuningEnabled proposedCutsEnabled tuningHubEnabled />,
    );
    fireEvent.click(document.querySelector("[data-shortcut='proposed-cuts']") as HTMLElement);
    // The press itself loads the tools (the wrapper asks for its code on mount), then the hub draws.
    await screen.findByText("hub drawn");
    expect(hub.requests.at(-1)).toMatchObject({ tool: "cuts" });
  });
});
