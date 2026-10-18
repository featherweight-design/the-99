
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { creditsCopy } from "../../lib/copy/credits";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import type { CutsPanel } from "../../lib/tuning/cuts-state";
import { cutsAsk } from "../../lib/tuning/cuts-ask";
import { CutsFrame, CutsFreeCount } from "./cuts-free-count";

// The panel imports server actions and the card-detail provider; neither runs here.
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: vi.fn() }), useCardIntent: () => ({}) }));
vi.mock("../../app/decks/cuts-actions", () => ({
  cutProposed: vi.fn(), keepProposedCut: vi.fn(), readCutsPanel: vi.fn(),
  restoreProposedCut: vi.fn(), runProposedCuts: vi.fn(), undoProposedCut: vi.fn(),
}));

// One spy over the real component, so a test can ask whether a mount went through it.
const spy = vi.hoisted(() => ({ calls: 0 }));
vi.mock("./cuts-free-count", async (orig) => {
  const real = await orig<typeof import("./cuts-free-count")>();
  return {
    ...real,
    CutsFreeCount: (props: Parameters<typeof real.CutsFreeCount>[0]) => {
      spy.calls++;
      return real.CutsFreeCount(props);
    },
  };
});

const copy = deckCutsCopy.panel;
// Staging's HD - Zombies (110 cards, 10 over the 99), Zul Ashur, Lich Lord: no partner, no locked cards, no run,
// read 2026-10-14 through the panel's own read functions and counted by `cutFacts` and `cutCounts`. A full
// allowance with no reset time.
const panel: CutsPanel = {
  run: null,
  items: [],
  itemsReport: null,
  lastOkFingerprint: null,
  lastOkAt: null,
  modelVersionMoved: false,
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
  review: null,
  total: 110,
  bodySize: 99,
  over: 10,
  commander: "Zul Ashur, Lich Lord",
  allLocked: false,
  lockedCount: 0,
  keyCount: 8,
  declaredBracket: 2,
  edhrecDecks: 3309,
  thin: false,
  rows: [
    { key: "role:draw", source: "role", label: "Card draw", figure: 8, note: "rec 7 · 1 over" },
    { key: "role:removal", source: "role", label: "Removal", figure: 9, note: "rec 7 · 2 over" },
    { key: "curve:2", source: "curve", label: "Cost 2", figure: 25, note: "the fullest slot" },
    { key: "edhrec", source: "edhrec", label: "In under 10% of Zul Ashur, Lich Lord decks", figure: 3, note: "your median card 46%" },
  ],
  chips: { medianPct: 46, flagCounts: {}, declared: 2 },
  resultCurrent: false,
  asked: 0,
};
const press = () => screen.getByRole("button", { name: "Look deeper. Uses 1 credit." });

afterEach(() => {
  cleanup();
  spy.calls = 0;
});

describe("CutsFreeCount", () => {
  it("draws the free count from HD - Zombies, every string from the copy", () => {
    render(<CutsFreeCount panel={panel} />);
    expect(screen.getByRole("heading", { name: copy.heading })).toBeTruthy();
    expect(screen.getByText(copy.sub)).toBeTruthy();
    expect(screen.getByText(copy.overLead("Ten", 99))).toBeTruthy();
    expect(screen.getByText(copy.lead)).toBeTruthy();
    expect(screen.getByRole("heading", { name: copy.deeper.offerTitle(cutsAsk(panel.over)) })).toBeTruthy();
    expect(screen.getByText(creditsCopy.standing(5, 5, null))).toBeTruthy();
    expect(screen.getByText(copy.facts.read(110, "Zul Ashur, Lich Lord", 3309, 2))).toBeTruthy();
    for (const row of panel.rows) expect(screen.getByTestId(`count-${row.key}`).textContent).toContain(String(row.figure));
    // G2: the deck's 8 Key cards, named as the panel names them.
    expect(screen.getByText(copy.neverCut("Zul Ashur, Lich Lord", 0, 8))).toBeTruthy();
    expect(press()).toBeTruthy();
  });

  it("acts on the press only when handed one", () => {
    render(<CutsFreeCount panel={panel} />);
    expect(() => fireEvent.click(press())).not.toThrow();
    cleanup();
    const onPress = vi.fn();
    render(<CutsFreeCount panel={panel} onPress={onPress} />);
    fireEvent.click(press());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("puts a band in place of the offer, and draws nothing there for null", () => {
    render(<CutsFreeCount panel={panel} band={<p>in flight</p>} />);
    expect(screen.getByText("in flight")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    render(<CutsFreeCount panel={panel} band={null} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(copy.facts.head)).toBeTruthy();
  });
});

describe("CutsFrame and the panel's mount", () => {
  it("CutsFrame is the panel's frame, without its top margin (the margin stays with CutsPanelView)", () => {
    const { container } = render(<CutsFrame><CutsFreeCount panel={panel} /></CutsFrame>);
    const frame = container.firstElementChild!;
    expect(frame.tagName).toBe("SECTION");
    expect(frame.className).toContain("rounded-[11px]");
    expect(frame.className).not.toContain("mt-");
  });

  it("CutsPanelView renders CutsFreeCount for its count", async () => {
    const { CutsPanelView } = await import("./cuts-panel");
    const read = vi.fn(async () => panel);
    const ok = vi.fn(async () => ({ ok: true as const }));
    render(<CutsPanelView deckId="d1" deps={{ read, run: ok, cut: ok, undo: ok, keep: ok, restore: ok }} />);
    await screen.findByRole("heading", { name: copy.heading });
    expect(spy.calls).toBeGreaterThan(0);
    expect(screen.getByText(copy.neverCut("Zul Ashur, Lich Lord", 0, 8))).toBeTruthy();
  });
});
