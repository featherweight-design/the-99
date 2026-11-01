// Discovery R3·5: the nudges in the deck page's existing slots. N2 (`balance mana →`) and N2b (the over row's `Cuts`)
// follow the Analysis tab (both tools' own switches are retired), with the hub on or off (R3 gap 7); N1 (`suggest swaps →`) offers Suggested changes on
// a deck at its body size. A press with the hub off lands as Try it does, through `?tool=` (R2's landing).
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";
import { tuningHubShortcutsCopy } from "../../lib/copy/tuning-hub-shortcuts";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../lib/notices/actions", () => ({ peekNotices: vi.fn(async () => null), openNotices: vi.fn(async () => null) }));
vi.mock("./analysis-panel", () => ({ AnalysisPanel: () => null }));
vi.mock("./synopsis-state", () => ({
  useDeckSynopsis: () => ({ view: { kind: "ready", state: {}, busy: false, current: true }, write: vi.fn(), retry: vi.fn() }),
}));

type Shortcuts = { onBalanceMana?: () => void; onSuggest?: () => void };
const seen = vi.hoisted(() => ({ strip: {} as Shortcuts }));
vi.mock("./role-counter-strip", () => ({
  RoleCounterStrip: (p: Shortcuts) => { seen.strip = p; return null; },
}));
vi.mock("./builder-spine", () => ({
  BuilderSpine: () => null,
}));

const { BuilderShell } = await import("./builder-shell");

const card = (i: number) => ({
  oracleId: `c-${i}`, name: `Card ${i}`, quantity: 1, typeLine: "Instant", cardTypeGroup: "Instants" as const, role: "other" as const, owned: true,
});

/** A deck of `built` cards. `{G}` in the commander's cost is a colored pip, so Mana Balance has a color to count. */
const deck = (built: number) =>
  ({
    id: "deck-1",
    name: "Omnath",
    createdAt: new Date("2026-01-01"),
    commander: {
      oracleId: "omnath", name: "Omnath", colorIdentity: ["G"], manaCost: "{2}{G}{G}", typeLine: "Legendary Creature", oracleText: null, imageUri: null,
    },
    partner: null,
    cards: Array.from({ length: built }, (_, i) => card(i)),
    built,
    ownedCount: built,
    toBuyCount: 0,
    total: built,
    unresolvedRows: [],
  }) as unknown as DeckDetail;

function draw(props: { built?: number; hub?: boolean; analysis?: boolean; tuning?: boolean }) {
  seen.strip = {};
  render(
    <BuilderShell mix={recommendedMix(null, false)} deck={deck(props.built ?? 99)} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["G"]} arrivedFromImport={false} newestAsOf={null} analysisEnabled={props.analysis ?? true} initialView="deck"
      tuningHubEnabled={props.hub ?? false}
      tuningEnabled={props.tuning ?? false} />,
  );
}

/** Every `?tool=` the shell wrote. The landing strips it straight after (no target registry here), so the writes are
 *  what is read, not the address. */
let written: string[] = [];
beforeEach(() => {
  window.history.replaceState(null, "", "/decks/deck-1");
  written = [];
  const real = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "replaceState").mockImplementation((state, unused, url) => {
    const tool = url == null ? null : new URL(String(url), window.location.href).searchParams.get("tool");
    if (tool !== null) written.push(tool);
    real(state, unused, url);
  });
});

afterEach(() => vi.restoreAllMocks());

describe("BuilderShell — nudges follow their own switch (discovery R3·5)", () => {
  it("N2: draws balance mana → with the hub off, and lands on Mana Balance through ?tool=", () => {
    draw({});
    expect(seen.strip.onBalanceMana).toBeTypeOf("function");
    act(() => seen.strip.onBalanceMana!());
    expect(written).toEqual(["mana-balance"]);
  });

  it("N2b: draws the over row's Cuts with the hub off, and lands on Proposed cuts through ?tool=", () => {
    draw({ built: 101 });
    fireEvent.click(screen.getByRole("button", { name: tuningHubShortcutsCopy.proposedCutsAria }));
    expect(written).toEqual(["proposed-cuts"]);
  });

  it("N2b: draws with the tab whatever the hub, since Proposed cuts' own switch is retired", () => {
    draw({ hub: true, built: 101 });
    expect(screen.getByRole("button", { name: tuningHubShortcutsCopy.proposedCutsAria })).toBeTruthy();
  });

  it("N2b: absent with the Analysis tab off, whatever the hub", () => {
    draw({ analysis: false, hub: true, built: 101 });
    expect(screen.queryByRole("button", { name: tuningHubShortcutsCopy.proposedCutsAria })).toBeNull();
  });

  it("N2: absent with the Analysis tab off, where Mana Balance mounts", () => {
    draw({ analysis: false });
    expect(seen.strip.onBalanceMana).toBeUndefined();
  });

  it("N2 with the hub on keeps the hub's own request, and writes no ?tool=", () => {
    draw({ hub: true });
    act(() => seen.strip.onBalanceMana!());
    expect(written).toEqual([]);
  });

  it("N1: offers Suggested changes on a deck at its body size, landing through ?tool=", () => {
    draw({ tuning: true });
    expect(seen.strip.onSuggest).toBeTypeOf("function");
    act(() => seen.strip.onSuggest!());
    expect(written).toEqual(["suggested-changes"]);
  });

  it("N1 with the hub on asks the hub back to its tiles, then lands", () => {
    draw({ tuning: true, hub: true });
    act(() => seen.strip.onSuggest!());
    expect(written).toEqual(["suggested-changes"]);
  });

  it("N1: nothing under the body size, and nothing with Tuning off", () => {
    draw({ tuning: true, built: 98 });
    expect(seen.strip.onSuggest).toBeUndefined();
    draw({ tuning: false });
    expect(seen.strip.onSuggest).toBeUndefined();
  });
});
