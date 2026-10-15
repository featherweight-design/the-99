import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { creditsCopy } from "../../lib/copy/credits";
import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { PROPOSED_CUTS } from "../../lib/about/fixtures";
import { cutsAsk } from "../../lib/tuning/cuts-ask";
import { CutsFreeCount } from "./cuts-free-count";

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
const { panel } = PROPOSED_CUTS;
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

describe("one tree, two mounts", () => {
  it("the About figure renders CutsFreeCount, and draws exactly what the component draws", async () => {
    const { FIGURES } = await import("../about/figures");
    const Figure = FIGURES["proposed-cuts"]!;
    const { container } = render(<Figure width="plate" creditLimit={5} />);
    expect(spy.calls).toBeGreaterThan(0);
    const figure = container.querySelector('[data-specimen="proposed-cuts"]')!;
    expect(figure.hasAttribute("inert")).toBe(true);
    const drawn = figure.innerHTML;
    cleanup();
    const direct = render(<CutsFreeCount panel={panel} />);
    expect(drawn).toBe(direct.container.innerHTML);

    // And by its source: the figure imports the panel's own component, never a copy of it.
    const source = readFileSync(join(process.cwd(), "src/components/about/figures.tsx"), "utf8");
    expect(source).toMatch(/import \{ CutsFreeCount \} from "\.\.\/decks\/cuts-free-count";/);
    expect(source).toMatch(/<CutsFreeCount panel=/);
  }, 60_000);

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
