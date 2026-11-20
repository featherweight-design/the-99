import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

// Card details as the page provides them: present on both mounts, absent where a surface has no provider. The pick lines read the
// provider itself (`useCardDetail`), which both mounts have, so that stands in for it.
const provided = { on: false };
vi.mock("../../../cards/card-detail-context", async (importActual) => ({
  ...(await importActual<typeof import("../../../cards/card-detail-context")>()),
  useCardDetail: () => ({ open: vi.fn(), registerSheet: () => () => {}, openOracleId: null, revealing: false, prefetch: () => {} }),
  useCardIntent: () => ({}),
  useCardDetailIfAny: () => (provided.on ? {} : null),
  CardDetailTrigger: ({ oracleId, children }: { oracleId: string; children: React.ReactNode }) => <button type="button" data-oracle={oracleId}>{children}</button>,
}));
vi.mock("../../../../app/decks/actions", () => ({ pullCardFromDeck: vi.fn() }));
vi.mock("../../../../lib/precons/upgrade/actions", () => ({ pickUpgradeLineAction: vi.fn(), upgradeSetBracketAction: vi.fn(async () => null) }));
import type { OfferedCommander, PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { suggestedChangesV2Copy } from "../../../../lib/copy/suggested-changes-v2";
import { combined, demoLineActions, ResultView } from "./result-view";
import type { UpgradeActionDeps } from "./upgrade-lines";

const sc = suggestedChangesV2Copy;

const lead = (key: string, name: string, isFace: boolean): OfferedCommander => ({
  key, isFace, cards: [{ oracleId: key, name, manaCost: "{2}", cmc: 4, typeLine: "Legendary Creature" }], line: null, strategies: [],
});
const panel: UpgradePanel = {
  boxBracket: 2, boxPermits: [1, 2],
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
  figures: {},
  allowance: { used: 0, limit: 5, reopensAt: null, nextAt: null },
};
const pair = (n: number, over: Partial<PanelRun["pairs"][number]> = {}) => ({ cutId: `cut${n}`, cut: `Cut ${n}`, addId: `add${n}`, add: `Add ${n}`, addCents: 120, reason: `Reason ${n}`, cutReason: `Cut why ${n}`, position: n, ...over });
const run = (over: Partial<PanelRun> = {}): PanelRun => ({
  id: "r", status: "done", strategyKey: "muddle/3/spellslinger", strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T12:00:00Z"),
  pairs: [pair(1), pair(2)], buyTotalCents: 120, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x",
  toBuy: { cards: 1, cents: 120 }, owned: 1, themes: { cut1: "Artifacts" }, deck: null, seenAt: new Date("2026-11-10T12:01:00Z"), unpicked: [], ...over,
});

const quiet = (): UpgradeActionDeps => ({ pick: vi.fn(async () => ({ ok: true as const, unpicked: [] })), setBracket: vi.fn(async () => null) });
const press = (over: Partial<{ off: boolean; note: string | null; pending: boolean }> = {}) => ({ label: (n: number) => `Start the deck with these ${n} swaps`, onPress: vi.fn(), ...over });
const bar = () => document.querySelector("[data-sc-bar]") as HTMLElement;
const apply = () => document.querySelector("[data-sc-apply]") as HTMLButtonElement;

describe("ResultView's head", () => {
  it("reads as four facts as the run found them and the commander when the run changed who leads, with no Pick on it", () => {
    render(<ResultView panel={panel} run={run({ unpicked: ["a-add1", "c-cut1"] })} lineActions={quiet()} />);
    expect(screen.getByText("2 swaps toward Spells")).toBeInTheDocument();
    expect(screen.getByText("Nov 10")).toBeInTheDocument();
    for (const l of ["Led by", "Bracket", "To buy", "Already yours"]) expect(screen.getByText(l)).toBeInTheDocument();
    expect(screen.getByText("2 → 3")).toBeInTheDocument();
    // As found: the picks move the bar, not the facts.
    expect(within(screen.getByText("To buy").parentElement!).getByText("$1.20")).toBeInTheDocument();
    const commander = screen.getByRole("heading", { name: /^Commander/ }).closest("section")!;
    expect(within(commander).getByText("Rootha takes Muddle’s place in the 99.")).toBeInTheDocument();
    expect(within(commander).queryByRole("button", { name: /Pick/ })).toBeNull();
    // The commander pair sits above the lists.
    expect(commander.compareDocumentPosition(document.querySelector("[data-sc-run]")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws no Commander group when the box's own commander still leads", () => {
    render(<ResultView panel={panel} run={run({ strategyKey: "rootha/3/spellslinger" })} lineActions={quiet()} />);
    expect(screen.queryByRole("heading", { name: /^Commander/ })).toBeNull();
  });

  it("counts a short run and says both credits are back", () => {
    render(<ResultView panel={panel} run={run({ refunded: true })} lineActions={quiet()} />);
    expect(screen.getByText(/Fewer than 12 fit at bracket 3, so both credits are back\. You can still start with these 2\./)).toBeInTheDocument();
  });

  it("retires the theme groups and the swap rows: no `Cuts from` heads", () => {
    render(<ResultView panel={panel} run={run({ themes: { cut1: "Artifacts" } })} lineActions={quiet()} />);
    expect(screen.queryByRole("heading", { name: /Cuts from/ })).toBeNull();
  });
});

describe("ResultView's lists (fresh start R2: Suggested changes' results, reused)", () => {
  it("draws Additions and Cuts with every line picked, each side counted, and no You asked box", () => {
    render(<ResultView panel={panel} run={run()} press={press()} lineActions={quiet()} />);
    const additions = screen.getByRole("region", { name: sc.results.additions });
    const cuts = screen.getByRole("region", { name: sc.results.cuts });
    expect(within(additions).getAllByRole("button", { name: /^✓ Picked/ })).toHaveLength(2);
    expect(within(cuts).getAllByRole("button", { name: /^✓ Picked/ })).toHaveLength(2);
    expect(document.querySelector('[data-sc-chip="add"]')!.textContent).toBe(sc.results.chosen(2, 2));
    expect(screen.queryByText(/You asked/i)).toBeNull();
  });

  it("puts the pair's reason on the add and the cut's own on the cut", () => {
    render(<ResultView panel={panel} run={run()} lineActions={quiet()} />);
    expect(within(screen.getByRole("article", { name: "Add 1" })).getByText("Reason 1")).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: "Cut 1" })).getByText("Cut why 1")).toBeInTheDocument();
  });

  it("draws an old run's cut with no reason line at all, never the add's", () => {
    render(<ResultView panel={panel} run={run({ pairs: [pair(1, { cutReason: null }), pair(2)] })} lineActions={quiet()} />);
    const cut = screen.getByRole("article", { name: "Cut 1" });
    expect(within(cut).queryByText("Reason 1")).toBeNull();
    expect(cut.querySelector("p")).toBeNull();
  });

  it("opens with the run's stored picks", () => {
    render(<ResultView panel={panel} run={run({ unpicked: ["c-cut2"] })} press={press()} lineActions={quiet()} />);
    expect(within(screen.getByRole("article", { name: "Cut 2" })).getByRole("button", { name: /^Pick Cut 2/ })).toBeInTheDocument();
    expect(document.querySelector('[data-sc-chip="cut"]')!.textContent).toBe(sc.results.chosen(1, 2));
  });

  it("stores a pick on the run, keeps an add and a cut apart, and hands the stored set back", async () => {
    const actions = quiet();
    vi.mocked(actions.pick).mockResolvedValue({ ok: true, unpicked: ["c-cut1"] });
    const onPicked = vi.fn();
    render(<ResultView panel={panel} run={run()} press={press()} lineActions={actions} onPicked={onPicked} />);
    fireEvent.click(within(screen.getByRole("article", { name: "Cut 1" })).getByRole("button", { name: /Picked/ }));
    await vi.waitFor(() => expect(onPicked).toHaveBeenCalledWith("r", ["c-cut1"]));
    expect(actions.pick).toHaveBeenCalledWith("r", "c-cut1", false);
    // Add 1 is still picked: a cut kept does not keep its pair's add out.
    expect(within(screen.getByRole("article", { name: "Add 1" })).getByRole("button", { name: /^✓ Picked/ })).toBeInTheDocument();
  });
});

describe("ResultView's bar: the flow's press in the Apply place (call 11)", () => {
  it("carries the press with the picked count and sends the picked line ids, never opening a confirmation", () => {
    const p = press();
    render(<ResultView panel={panel} run={run()} press={p} lineActions={quiet()} />);
    expect(apply()).toHaveTextContent("Start the deck with these 2 swaps");
    fireEvent.click(apply());
    expect(p.onPress).toHaveBeenCalledWith(["a-add1", "a-add2"], ["c-cut1", "c-cut2"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("turns the press off on uneven counts with the shipped line, and pressing it does nothing", () => {
    const p = press();
    render(<ResultView panel={panel} run={run({ unpicked: ["c-cut2"] })} press={p} lineActions={quiet()} />);
    expect(within(bar()).getByText(/Pick 1 more cut to apply, so the deck stays at 99\./)).toBeInTheDocument();
    expect(apply()).toHaveAttribute("aria-disabled", "true");
    expect(apply()).toHaveTextContent("Start the deck with these 2 swaps");
    fireEvent.click(apply());
    expect(p.onPress).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws `0 in · 0 out` with none picked, the press off", () => {
    render(<ResultView panel={panel} run={run({ unpicked: ["a-add1", "a-add2", "c-cut1", "c-cut2"] })} press={press()} lineActions={quiet()} />);
    expect(within(bar()).getByText(sc.run.nonePicked)).toBeInTheDocument();
    expect(apply()).toHaveAttribute("aria-disabled", "true");
  });

  it("holds an off press with its line said in the bar, and never applies on its own", () => {
    const p = press({ off: true, note: "The precon’s list changed after this upgrade, so it can’t start a deck." });
    render(<ResultView panel={panel} run={run()} press={p} lineActions={quiet()} />);
    expect(within(bar()).getByRole("note")).toHaveTextContent("The precon’s list changed");
    expect(apply()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(apply());
    expect(p.onPress).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws what follows after the lists and their bar", () => {
    render(<ResultView panel={panel} run={run()} press={press()} after={<button type="button">Try another strategy</button>} lineActions={quiet()} />);
    const another = screen.getByRole("button", { name: "Try another strategy" });
    expect(bar().compareDocumentPosition(another) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("ResultView's commander names (Hugh's bug c)", () => {
  it("open card details where the page has them, one card a side", () => {
    provided.on = true;
    try {
      render(<ResultView panel={panel} run={run({ pairs: [pair(1)] })} lineActions={quiet()} />);
      expect(screen.getByRole("button", { name: "Muddle" }).getAttribute("data-oracle")).toBe("muddle");
      expect(screen.getByRole("button", { name: "Rootha" }).getAttribute("data-oracle")).toBe("rootha");
    } finally {
      provided.on = false;
    }
  });
});

describe("ResultView's commander marks (A3 calls 7 to 11)", () => {
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
      add1: { cmc: 1, identity: ["U"], owned: false, facts: ["massLandDenial"] },
    },
  };
  const sideOf = (name: string) => screen.getAllByText(name).map((n) => n.closest("[data-name-box]")).find(Boolean) as HTMLElement;
  const markIds = (el: HTMLElement) => [...el.querySelectorAll("[data-mark]")].map((m) => m.getAttribute("data-mark"));

  it("gives a two-card commander side the union of both cards' facts, in the shipped order", () => {
    expect(combined(["p1", "p2"], marked.cards)?.facts).toEqual(["gameChanger", "tutor"]);
    render(<ResultView panel={marked} run={run({ strategyKey: "pair/3/spellslinger" })} lineActions={quiet()} />);
    expect(markIds(sideOf("Tymna + Thrasios"))).toEqual(["gameChanger", "tutor"]);
  });

  it("glosses only the commander pair's marks: the pick lines draw none, so an add's fact is not in the key", () => {
    const { unmount } = render(<ResultView panel={marked} run={run({ strategyKey: "pair/3/spellslinger" })} lineActions={quiet()} />);
    const key = screen.getByRole("group", { name: "What the marks on these cards mean" });
    expect([...key.children].map((c) => c.textContent)).toEqual(["game changer", "tutor"]);
    unmount();
    render(<ResultView panel={marked} run={run({ strategyKey: "rootha/3/spellslinger" })} lineActions={quiet()} />);
    expect(screen.queryByRole("group", { name: "What the marks on these cards mean" })).toBeNull();
  });
});

describe("ResultView in the landing demo (A5b)", () => {
  it("draws no Apply place and no apply line where the same run outside the demo draws both, and a pick still flips on screen", async () => {
    const { unmount } = render(<ResultView panel={panel} run={run()} lineActions={demoLineActions(run(), [3])} />);
    expect(apply()).not.toBeNull();
    expect(document.querySelector("[data-sc-bar-line]")).not.toBeNull();
    unmount();
    render(<ResultView panel={panel} run={run()} demo lineActions={demoLineActions(run(), [3])} />);
    expect(apply()).toBeNull();
    expect(document.querySelector("[data-sc-bar-line]")).toBeNull();
    fireEvent.click(within(screen.getByRole("article", { name: "Cut 1" })).getByRole("button", { name: /Picked/ }));
    await vi.waitFor(() => expect(within(screen.getByRole("article", { name: "Cut 1" })).queryByRole("button", { name: /^✓ Picked/ })).toBeNull());
  });

  it("answers the set bracket from the stored seed for the whole set only", async () => {
    const a = demoLineActions(run(), [2, 3]);
    expect(await a.setBracket("", "r", ["x", "y"], ["p", "q"])).toEqual({ permits: [2, 3] });
    expect(await a.setBracket("", "r", ["x"], ["p", "q"])).toBeNull();
    expect(await demoLineActions(run(), null).setBracket("", "r", ["x", "y"], ["p", "q"])).toBeNull();
    expect(await a.pick("r", "c-cut1", false)).toEqual({ ok: true, unpicked: ["c-cut1"] });
    expect(await a.pick("r", "c-cut1", true)).toEqual({ ok: true, unpicked: [] });
  });
});
