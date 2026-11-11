import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { groupPairs, ResultView } from "./result-view";

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
