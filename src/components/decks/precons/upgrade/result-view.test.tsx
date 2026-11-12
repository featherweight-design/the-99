import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Card details as the page provides them: present on both mounts, absent where a surface has no provider.
const provided = { on: false };
vi.mock("../../../cards/card-detail-context", () => ({
  useCardDetailIfAny: () => (provided.on ? {} : null),
  CardDetailTrigger: ({ oracleId, children }: { oracleId: string; children: React.ReactNode }) => <button type="button" data-oracle={oracleId}>{children}</button>,
}));
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { combined, groupPairs, ResultView } from "./result-view";
import { comboAwarenessCopy } from "../../../../lib/copy/combo-awareness";

const lead = (key: string, name: string, isFace: boolean): OfferedCommander => ({
  key, isFace, cards: [{ oracleId: key, name, manaCost: "{2}", cmc: 4, typeLine: "Legendary Creature" }], line: null, strategies: [],
});
const panel: UpgradePanel = {
  boxBracket: 2,
  commanders: [lead("rootha", "Rootha", true), lead("muddle", "Muddle", false)],
  runs: [],
  listFp: "x",
  cards: {
    rootha: { cmc: 4, identity: ["U", "R"], owned: true },
    muddle: { cmc: 4, identity: ["U", "R"], owned: false },
    cut1: { cmc: 2, identity: ["U"], owned: true },
    add1: { cmc: 1, identity: ["U"], owned: false },
    add2: { cmc: 1, identity: ["R"], owned: true },
  },
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
};
const pair = (n: number, over: Partial<PanelRun["pairs"][number]> = {}) => ({ cutId: `cut${n}`, cut: `Cut ${n}`, addId: `add${n}`, add: `Add ${n}`, addCents: 120, reason: `Reason ${n}`, position: n, ...over });
const run = (over: Partial<PanelRun> = {}): PanelRun => ({
  id: "r", status: "done", strategyKey: "muddle/3/spellslinger", strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"),
  pairs: [pair(1), pair(2)], buyTotalCents: 120, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x",
  toBuy: { cards: 1, cents: 120 }, owned: 1, themes: { cut1: "Artifacts" }, started: false, ...over,
});

describe("groupPairs", () => {
  it("groups by the theme each cut came from, in first-seen order, with the unclaimed cuts last", () => {
    const g = groupPairs(run({ pairs: [pair(2), pair(1), pair(3, { cutId: "cut3" })], themes: { cut1: "Artifacts", cut2: "Tokens" } }));
    expect(g.map((x) => [x.theme, x.pairs.length])).toEqual([["Tokens", 1], ["Artifacts", 1], ["", 1]]);
  });
});

describe("ResultView", () => {
  it("reads as four facts, the commander when the run changed who leads, then the swaps by theme", () => {
    render(<ResultView panel={panel} run={run()} />);
    expect(screen.getByText("2 swaps toward Spells")).toBeInTheDocument();
    expect(screen.getByText("Nov 10")).toBeInTheDocument();
    for (const l of ["Led by", "Bracket", "To buy", "Already yours"]) expect(screen.getByText(l)).toBeInTheDocument();
    expect(screen.getByText("2 → 3")).toBeInTheDocument();
    expect(within(screen.getByText("To buy").parentElement!).getByText("$1.20")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Commander/ })).toBeInTheDocument();
    expect(screen.getByText("Rootha takes Muddle’s place in the 99.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cuts from Artifacts/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Cuts from the rest of the deck/ })).toBeInTheDocument();
  });

  it("says an add you own is yours and prices the rest", () => {
    render(<ResultView panel={panel} run={run()} />);
    const rows = screen.getAllByRole("listitem");
    const owned = rows.find((r) => within(r).queryByText("Add 2"))!;
    const buy = rows.find((r) => within(r).queryByText("Add 1"))!;
    expect(within(owned).getByText("you own it")).toBeInTheDocument();
    expect(within(buy).getByText("$1.20")).toBeInTheDocument();
  });

  it("draws no Commander group when the box's own commander still leads", () => {
    render(<ResultView panel={panel} run={run({ strategyKey: "rootha/3/spellslinger" })} />);
    expect(screen.queryByRole("heading", { name: /^Commander/ })).toBeNull();
  });

  it("counts a short run and says both credits are back", () => {
    render(<ResultView panel={panel} run={run({ refunded: true })} />);
    expect(screen.getByText(/Fewer than 12 fit at bracket 3, so both credits are back\. You can still start with these 2\./)).toBeInTheDocument();
  });
});

describe("ResultView's swap names (Hugh's bug c)", () => {
  it("open card details where the page has them: one card per side, and the box's commander pair stays text", () => {
    provided.on = true;
    try {
      render(<ResultView panel={panel} run={run({ pairs: [pair(1)] })} />);
      expect(screen.getByRole("button", { name: "Cut 1" }).getAttribute("data-oracle")).toBe("cut1");
      expect(screen.getByRole("button", { name: "Add 1" }).getAttribute("data-oracle")).toBe("add1");
      // The alternate leads: Rootha (one card) and Muddle (one card) are presses too.
      expect(screen.getByRole("button", { name: "Muddle" }).getAttribute("data-oracle")).toBe("muddle");
    } finally {
      provided.on = false;
    }
  });

  it("stay text where no card details provider is above them", () => {
    render(<ResultView panel={panel} run={run({ pairs: [pair(1)] })} />);
    expect(screen.queryByRole("button", { name: "Cut 1" })).toBeNull();
    expect(screen.getByText("Cut 1")).toBeInTheDocument();
  });
});

describe("ResultView's bracket marks (A3 calls 7 to 11)", () => {
  const marked: UpgradePanel = {
    ...panel,
    commanders: [
      { ...lead("rootha", "Rootha", true) },
      { key: "pair", isFace: false, line: null, strategies: [], cards: [
        { oracleId: "p1", name: "Tymna", manaCost: "{2}", cmc: 2, typeLine: "Legendary Creature" },
        { oracleId: "p2", name: "Thrasios", manaCost: "{2}", cmc: 2, typeLine: "Legendary Creature" },
      ] },
    ],
    cards: {
      ...panel.cards,
      p1: { cmc: 2, identity: ["W", "B"], owned: true, facts: ["tutor"] },
      p2: { cmc: 2, identity: ["G", "U"], owned: true, facts: ["gameChanger"] },
      cut1: { cmc: 2, identity: ["U"], owned: true, facts: ["massLandDenial"] },
      add1: { cmc: 1, identity: ["U"], owned: false, facts: ["gameChanger", "tutor"] },
      add2: { cmc: 1, identity: ["R"], owned: true },
    },
  };
  const rowOf = (name: string) => screen.getAllByRole("listitem").find((r) => within(r).queryByText(name))!;
  // The side's name box; a commander pair's name also reads in the Led by fact, which is no side.
  const sideOf = (name: string) => screen.getAllByText(name).map((n) => n.closest("[data-name-box]")).find(Boolean) as HTMLElement;
  const markIds = (el: HTMLElement) => [...el.querySelectorAll("[data-mark]")].map((m) => m.getAttribute("data-mark"));

  it("sits each mark right after the name, in the name's own box, before the pips", () => {
    render(<ResultView panel={marked} run={run()} />);
    const box = sideOf("Add 1");
    expect(box.firstElementChild?.textContent).toBe("Add 1");
    expect(markIds(box)).toEqual(["gameChanger", "tutor"]);
    // The box grows, the name truncates and the marks never shrink.
    expect(box.className).toMatch(/\bflex-1\b/);
    expect(box.className).toMatch(/\bmin-w-0\b/);
    expect(box.firstElementChild!.className).toMatch(/\btruncate\b/);
    expect(box.firstElementChild!.className).not.toMatch(/\bflex-1\b/);
    expect(box.querySelector("[data-mark]")!.parentElement!.className).toMatch(/\bflex-none\b/);
  });

  it("marks cuts and adds alike, and draws nothing on a side with no fact", () => {
    render(<ResultView panel={marked} run={run()} />);
    expect(markIds(sideOf("Cut 1"))).toEqual(["massLandDenial"]);
    expect(markIds(sideOf("Add 2"))).toEqual([]);
    expect(markIds(sideOf("Cut 2"))).toEqual([]);
  });

  it("gives a two-card commander side the union of both cards' facts, in the shipped order, and no combo mark", () => {
    expect(combined(["p1", "p2"], marked.cards)?.facts).toEqual(["gameChanger", "tutor"]);
    expect(combined(["add2", "cut2"], { ...marked.cards, cut2: { owned: true } })?.facts).toBeUndefined();
    render(<ResultView panel={marked} run={run({ strategyKey: "pair/3/spellslinger", pairs: [pair(2)] })} />);
    expect(markIds(sideOf("Tymna + Thrasios"))).toEqual(["gameChanger", "tutor"]);
  });

  it("draws the combo mark from the stored partners, with the swap's own sentence on an add and on a cut", () => {
    render(<ResultView panel={marked} run={run({ pairs: [
      pair(1, { addCombo: { oracleId: "x", name: "Dramatic Reversal" } }),
      pair(2, { cutCombo: { oracleId: "y", name: "Basalt Monolith", otherPartners: 2 }, addCombo: null }),
    ] })} />);
    expect(markIds(sideOf("Add 1"))).toEqual(["gameChanger", "tutor", "combo"]);
    expect(markIds(sideOf("Cut 2"))).toEqual(["combo"]);
    expect(within(rowOf("Add 1")).getByText(comboAwarenessCopy.swapTooltip.add("Dramatic Reversal"))).toHaveClass("sr-only");
    expect(within(rowOf("Cut 2")).getByText(comboAwarenessCopy.swapTooltip.cutMore("Basalt Monolith", 2))).toHaveClass("sr-only");
    expect(screen.queryByText(/Both are in this deck/)).toBeNull();
  });

  it("draws no combo mark on a run stored before partners were kept, while its facts still draw", () => {
    render(<ResultView panel={marked} run={run()} />);
    expect(document.querySelector('[data-mark="combo"]')).toBeNull();
    expect(markIds(sideOf("Add 1"))).toEqual(["gameChanger", "tutor"]);
    expect(screen.getByRole("group", { name: "What the marks on these cards mean" }).textContent).not.toContain(comboAwarenessCopy.keyWord);
  });

  it("folds a phone side of three or more marks to its first and a +N, and never folds to a +1", () => {
    render(<ResultView panel={marked} run={run({ pairs: [pair(1, { addCombo: { oracleId: "x", name: "Dramatic Reversal" } }), pair(2, { addCombo: { oracleId: "z", name: "Isochron Scepter" } })] })} />);
    const three = sideOf("Add 1");
    const kept = [...three.querySelectorAll("[data-mark]")].map((m) => m.className.includes("max-md:sr-only"));
    expect(kept).toEqual([false, true, true]);
    expect(three.querySelector("[data-fold]")!.textContent).toBe("+2");
    expect(three.querySelector("[data-fold]")!.className).toMatch(/\bmd:hidden\b/);
    // Two marks (Cut 1's one fact, or an add's fact and combo) both show: a +1 would hide no more than it stands for.
    render(<ResultView panel={{ ...marked, cards: { ...marked.cards, add2: { owned: true, facts: ["tutor"] } } }} run={run({ pairs: [pair(2, { addCombo: { oracleId: "z", name: "Isochron Scepter" } })] })} />);
    const two = screen.getAllByText("Add 2").at(-1)!.closest("[data-name-box]") as HTMLElement;
    expect(markIds(two)).toEqual(["tutor", "combo"]);
    expect([...two.querySelectorAll("[data-mark]")].some((m) => m.className.includes("sr-only"))).toBe(false);
    expect(two.querySelector("[data-fold]")).toBeNull();
  });

  it("draws the key under the facts with only the marks this result carries, and no key when it carries none", () => {
    const { unmount } = render(<ResultView panel={marked} run={run({ pairs: [pair(1, { addCombo: { oracleId: "x", name: "Dramatic Reversal" } })] })} />);
    const key = screen.getByRole("group", { name: "What the marks on these cards mean" });
    expect([...key.children].map((c) => c.textContent)).toEqual(["game changer", "mass land denial", "tutor", comboAwarenessCopy.keyWord]);
    // Under the four facts, above the first group.
    expect(key.previousElementSibling?.textContent).toContain("Already yours");
    unmount();
    render(<ResultView panel={panel} run={run({ strategyKey: "rootha/3/spellslinger" })} />);
    expect(screen.queryByRole("group", { name: "What the marks on these cards mean" })).toBeNull();
    expect(document.querySelector("[data-mark]")).toBeNull();
  });
});
