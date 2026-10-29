import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DECK_GROUPING_ARIA, DECK_GROUPING_KEY } from "../../lib/copy/deck-sort";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import type { LineItem, TuningLive, V2Ask } from "../../lib/tuning/state";
import type { ValidationReport } from "../../lib/tuning/validate";
import { v2Line } from "../../lib/tuning/v2/results-fixture";
import { NEW_MARK_MS, SLOW_NOTE_MS, SuggestedChangesRun, type SuggestionSetActions } from "./suggested-changes-run";

vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({ open: vi.fn(), registerSheet: () => () => {}, openOracleId: null, revealing: false }),
  useCardIntent: () => ({}),
}));

const sc = suggestedChangesV2Copy;
const RUN = "11111111-1111-4111-8111-111111111111";
const SET = "22222222-2222-4222-8222-222222222222";

const ask = (n = 3, extra: Partial<V2Ask> = {}): V2Ask => ({
  runId: RUN, requestedCount: n, request: "Cut the clunky stuff for cheaper threats.",
  bracket: { choice: "keep", target: 2 }, restrictions: { capCents: null, sets: [], ownedOnly: false }, ...extra,
});
const adds = (k: number, extra: (i: number) => Partial<LineItem> = () => ({})) =>
  Array.from({ length: k }, (_, i) => v2Line(`a${i}`, "add", { position: i, ...extra(i) }));
const cuts = (k: number, extra: (i: number) => Partial<LineItem> = () => ({})) =>
  Array.from({ length: k }, (_, i) => v2Line(`c${i}`, "cut", { position: 100 + i, ...extra(i) }));
const liveOf = (items: LineItem[], extra: Partial<TuningLive> = {}): TuningLive => ({
  runId: RUN, phase: "additions", in: { add: false, cut: false }, refilling: { add: false, cut: false }, items, newestPriceAsOf: null, ...extra,
});

type Props = Parameters<typeof SuggestedChangesRun>[0];

function setup(over: Partial<Props> = {}) {
  const actions: SuggestionSetActions & { [K in keyof SuggestionSetActions]: ReturnType<typeof vi.fn> } = {
    apply: vi.fn(async () => ({ ok: true as const, itemIds: ["x", "y"] })),
    undo: vi.fn(async () => ({ ok: true as const, itemIds: ["x", "y"] })),
    pick: vi.fn(async () => ({ ok: true })),
  };
  const onChanged = vi.fn(async () => null);
  const onAnnounce = vi.fn();
  const props = (p: Partial<Props>): Props => ({
    runId: RUN, ask: ask(), lines: [...adds(5), ...cuts(5)], live: null, startedAt: null, report: null, permits: [2],
    newestPriceAsOf: null, figures: { typeCounts: { Instants: 9 }, roles: [{ role: "removal", have: 6, target: 10 }] },
    drift: null, actions, onChanged, onAnnounce, onNewRun: vi.fn(), ...over, ...p,
  });
  const view = render(<SuggestedChangesRun {...props({})} />);
  return { actions, onChanged, onAnnounce, rerender: (p: Partial<Props>) => view.rerender(<SuggestedChangesRun {...props(p)} />) };
}

const pick = (name: string) => screen.getByRole("button", { name: `${sc.results.pick} Card ${name}` });
const pickedBtn = (name: string) => screen.getByRole("button", { name: `${sc.results.picked} Card ${name}` });
const bar = () => document.querySelector("[data-sc-bar]") as HTMLElement;
const apply = () => document.querySelector("[data-sc-apply]") as HTMLElement;
const press = async (el: HTMLElement) => act(async () => { fireEvent.click(el); });

afterEach(() => {
  vi.useRealTimers();
});

describe("the wait", () => {
  it("appends rows in arrival order, marks the newest for a beat, and says where each list is", async () => {
    vi.useFakeTimers();
    const started = new Date(Date.now() - 12_000);
    const t = setup({ live: liveOf(adds(2)), lines: adds(2), startedAt: started });
    expect(document.querySelector("[data-sc-run]")!.getAttribute("data-sc-run")).toBe("wait");
    expect(document.querySelector("[data-sc-clock]")!.textContent).toContain(sc.wait.soFar(2, 0));
    expect(document.querySelector('[data-sc-end="add"]')!.textContent).toContain(sc.wait.stillFinding);
    expect(document.querySelector('[data-sc-end="add"]')!.textContent).toContain(sc.wait.soFarAsked(2, 5));
    expect(document.querySelector('[data-sc-end="cut"]')!.textContent).toBe(sc.wait.cutsNext);
    // Nothing drawn at mount is new.
    expect(document.querySelector("[data-sc-new]")).toBeNull();

    act(() => t.rerender({ live: liveOf(adds(3)), lines: adds(3) }));
    const rows = [...document.querySelectorAll('[data-sc-line="add"]')].map((r) => r.getAttribute("aria-label"));
    expect(rows).toEqual(["Card a0", "Card a1", "Card a2"]);
    expect(document.querySelectorAll("[data-sc-new]")).toHaveLength(1);
    expect(screen.getByRole("article", { name: "Card a2" }).querySelector("[data-sc-new]")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(NEW_MARK_MS); });
    expect(document.querySelector("[data-sc-new]")).toBeNull();

    // The additions are in; the cuts arrive.
    const both = [...adds(5), ...cuts(1)];
    act(() => t.rerender({ live: liveOf(both, { phase: "cuts", in: { add: true, cut: false } }), lines: both }));
    expect(document.querySelector('[data-sc-end="add"]')!.textContent).toContain(sc.wait.allIn(5));
    expect(document.querySelector('[data-sc-end="cut"]')!.textContent).toContain(sc.wait.stillFinding);
    // Apply waits for both lists, whatever is picked.
    expect(apply().getAttribute("aria-disabled")).toBe("true");
    expect(bar().textContent).toContain(sc.wait.applyWaits);
    expect(bar().textContent).toContain(sc.wait.stillFindingTally);
  });

  it("stops the clock at the run's time and says done once the run is made in front of the reader (Wait E)", () => {
    vi.useFakeTimers();
    const both = [...adds(5), ...cuts(4)];
    const t = setup({ live: liveOf(both, { phase: "cuts", in: { add: true, cut: false } }), lines: both, startedAt: new Date(Date.now() - SLOW_NOTE_MS - 1000) });
    const clock = () => document.querySelector("[data-sc-clock]") as HTMLElement | null;
    expect(clock()!.textContent).toContain(sc.wait.leave);
    // The panel stops passing the start once the run is made; the clock stays, stopped, with no note or leave line.
    act(() => t.rerender({ live: null, startedAt: null, finishedHere: true }));
    expect(clock()!.getAttribute("data-sc-clock")).toBe("done");
    expect(clock()!.textContent).toContain(sc.wait.done(5, 4));
    expect(clock()!.textContent).not.toContain(sc.wait.soFar(5, 4));
    expect(clock()!.querySelector("[data-sc-wait-note]")).toBeNull();
    expect(clock()!.textContent).not.toContain(sc.wait.leave);
    const at = document.querySelector("[data-sc-elapsed]")!.textContent;
    expect(at).toBe("0:46");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(document.querySelector("[data-sc-elapsed]")!.textContent).toBe(at);
  });

  it("lets the clock go once a full run is made in front of the reader: only Wait E (short) keeps it", () => {
    const both = [...adds(5), ...cuts(5)];
    const t = setup({ live: liveOf(both, { phase: "cuts", in: { add: true, cut: false } }), lines: both, startedAt: new Date() });
    expect(document.querySelector("[data-sc-clock]")).not.toBeNull();
    act(() => t.rerender({ live: null, startedAt: null, finishedHere: true }));
    expect(document.querySelector("[data-sc-clock]")).toBeNull();
  });

  it("draws no clock on a run the reader did not watch finish", () => {
    setup({ live: null, startedAt: null });
    expect(document.querySelector("[data-sc-clock]")).toBeNull();
  });

  it("draws the 45-second note, and never a Stop", () => {
    setup({ live: liveOf(adds(1)), lines: adds(1), startedAt: new Date(Date.now() - SLOW_NOTE_MS - 1000) });
    expect(document.querySelector("[data-sc-wait-note]")!.textContent).toContain("This is taking a while.");
    expect(screen.queryByRole("button", { name: /stop/i })).toBeNull();
  });

  it("groups a side only once it is all in (N from 4), never while it is arriving", () => {
    const both = [...adds(6), ...cuts(2)];
    setup({ ask: ask(4), live: liveOf(both, { phase: "cuts", in: { add: true, cut: false } }), lines: both, startedAt: new Date() });
    expect(document.querySelector('[data-sc-side="add"] [data-sc-group]')).not.toBeNull();
    expect(document.querySelector('[data-sc-side="cut"] [data-sc-group]')).toBeNull();
  });

  it("saves picks as they are made, capped at N a side", async () => {
    const t = setup({ live: liveOf(adds(5)), lines: adds(5), startedAt: new Date() });
    await press(pick("a0"));
    await press(pick("a1"));
    await press(pick("a2"));
    expect(t.actions.pick.mock.calls).toEqual([["a0", true], ["a1", true], ["a2", true]]);
    expect(pick("a3").getAttribute("aria-disabled")).toBe("true");
    await press(pick("a3"));
    expect(t.actions.pick).toHaveBeenCalledTimes(3);
    // Unpick to swap.
    await press(pickedBtn("a0"));
    expect(t.actions.pick).toHaveBeenLastCalledWith("a0", false);
    expect(pick("a3").getAttribute("aria-disabled")).toBeNull();
  });
});

describe("the results", () => {
  it("keeps Apply off on unequal counts and names the fix, and applies an equal set through the confirmation", async () => {
    const t = setup();
    expect(bar().textContent).toContain(sc.bar.none(3));
    for (const id of ["a0", "a1", "a2", "c0", "c1"]) await press(pick(id));
    expect(document.querySelector('[data-sc-chip="add"]')!.textContent).toBe(sc.results.chosen(3, 3));
    expect(pick("a3").getAttribute("aria-disabled")).toBe("true");
    expect(bar().textContent).toContain(sc.bar.wouldGo(100));
    expect(bar().textContent).toContain(sc.bar.unequal(3, 2, 1, "cut"));
    expect(apply().getAttribute("aria-disabled")).toBe("true");
    await press(apply());
    expect(screen.queryByRole("dialog")).toBeNull();

    await press(pick("c2"));
    expect(apply().textContent).toBe(sc.bar.apply(6));
    // Three a side: the single-line flags cannot settle the set's bracket, so none is claimed.
    expect(bar().textContent).not.toContain("bracket");
    t.actions.apply.mockResolvedValueOnce({ ok: true, itemIds: ["c0", "c1", "c2", "a0", "a1", "a2"] });
    await press(apply());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(sc.confirm.title(3))).toBeTruthy();
    expect(dialog.textContent).toContain(sc.confirm.lead("").trimEnd());
    expect(dialog.textContent).not.toContain("Bracket");
    expect(dialog.textContent).toContain(sc.confirm.comingIn(3));
    expect(dialog.textContent).toContain(sc.confirm.goingOut(3));
    // ✕ only: no second cancel.
    expect(within(dialog).getAllByRole("button").filter((b) => b.textContent === "Cancel")).toHaveLength(0);
    await press(within(dialog).getByRole("button", { name: sc.confirm.apply(6) }));
    expect(t.actions.apply).toHaveBeenCalledWith(RUN, ["a0", "a1", "a2"], ["c0", "c1", "c2"], expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(t.onAnnounce).toHaveBeenCalledWith(sc.run.appliedLead(3, 4));
    expect(t.onChanged).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the confirmation with nothing changed", async () => {
    const t = setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    await press(apply());
    await press(screen.getByRole("button", { name: sc.confirmClose }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(t.actions.apply).not.toHaveBeenCalled();
  });

  it("treats an applied-then-undone set id (ok, no lines) as already done", async () => {
    const t = setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    t.actions.apply.mockResolvedValueOnce({ ok: true, itemIds: [] });
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(2) }));
    expect(t.onChanged).toHaveBeenCalled();
    // Nothing was written: no "Applied" is said for it.
    expect(t.onAnnounce).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Undo all/ })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says a failed apply in the shared toast and keeps the picks", async () => {
    const t = setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    t.actions.apply.mockResolvedValueOnce({ ok: false, message: "refused" });
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(2) }));
    expect(screen.getByRole("alert").textContent).toContain(sc.applyFailed.title);
    expect(pickedBtn("a0")).toBeTruthy();
    expect(t.onChanged).not.toHaveBeenCalled();
  });

  it("holds an applied set's one Undo, keeps the rest pickable, and says it was undone", async () => {
    const applied = (i: number) => (i < 3 ? { verdict: "accepted" as const, applySet: SET, picked: true } : {});
    const t = setup({ lines: [...adds(5, applied), ...cuts(5, applied)] });
    expect(document.querySelector("[data-sc-lead]")!.textContent).toBe(sc.run.appliedLead(3, 4));
    expect(bar().textContent).toContain(sc.bar.applied);
    expect(bar().textContent).toContain(sc.bar.appliedLine);
    expect(screen.getByRole("article", { name: "Card a0" }).textContent).toContain(sc.results.added);
    expect(screen.getByRole("article", { name: "Card c0" }).textContent).toContain(sc.results.cut);
    expect(pick("a3").getAttribute("aria-disabled")).toBeNull();
    t.actions.undo.mockResolvedValueOnce({ ok: true, itemIds: ["a0", "a1", "a2", "c0", "c1", "c2"] });
    await press(screen.getByRole("button", { name: sc.bar.undo(6) }));
    expect(t.actions.undo).toHaveBeenCalledWith(SET);
    expect(document.querySelector('[data-sc-notice="undone"]')!.textContent).toBe(sc.undone(6));
    expect(t.onChanged).toHaveBeenCalled();
  });

  it("offers the Undo of the set this visit applied, not the first set found", async () => {
    const OLD = "33333333-3333-4333-8333-333333333333";
    const before = (i: number) => (i === 0 ? { verdict: "accepted" as const, applySet: OLD, picked: true } : i < 3 ? { picked: true } : {});
    const t = setup({ lines: [...adds(5, before), ...cuts(5, before)] });
    t.actions.apply.mockResolvedValueOnce({ ok: true, itemIds: ["a1", "a2", "c1", "c2"] });
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(4) }));
    const setId = t.actions.apply.mock.calls[0][3] as string;
    const after = (i: number) =>
      i === 0 ? { verdict: "accepted" as const, applySet: OLD, picked: true } : i < 3 ? { verdict: "accepted" as const, applySet: setId, picked: true } : {};
    act(() => t.rerender({ lines: [...adds(5, after), ...cuts(5, after)] }));
    await press(screen.getByRole("button", { name: sc.bar.undo(4) }));
    expect(t.actions.undo).toHaveBeenCalledWith(setId);
  });

  it("rolls a refused pick back and says so", async () => {
    const t = setup();
    t.actions.pick.mockResolvedValueOnce({ ok: false });
    await press(pick("a0"));
    expect(pick("a0")).toBeTruthy();
    expect(document.body.textContent).toContain(sc.run.pickRefused);
  });

  it("stays flat at N = 3 and groups from N = 4 under the deck page's stored switch", async () => {
    setup();
    expect(document.querySelector("[data-sc-group]")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: DECK_GROUPING_ARIA })).toBeNull();
  });

  it("groups by type with the deck's count, and By role writes the deck page's choice", async () => {
    setup({ ask: ask(4), lines: [...adds(6), ...cuts(6)] });
    const head = document.querySelector('[data-sc-side="add"] [data-sc-group="Instants"] h4') as HTMLElement;
    expect(head.textContent).toContain(sc.results.typeHead(9));
    await press(pick("a0"));
    expect((document.querySelector('[data-sc-side="add"] [data-sc-group="Instants"] h4') as HTMLElement).textContent)
      .toContain(sc.results.withPicks(10));
    await press(screen.getByRole("radio", { name: "By role" }));
    expect(localStorage.getItem(DECK_GROUPING_KEY)).toBe("role");
    expect((document.querySelector('[data-sc-side="add"] [data-sc-group="removal"] h4') as HTMLElement).textContent)
      .toContain(sc.results.roleHead(6, 10));
  });

  it("draws a short run's count and what bound it, and every count follows the shorter list", () => {
    const report: ValidationReport = {
      askedCount: 0, survivedCount: 0, keptCount: 0,
      drops: Array.from({ length: 19 }, (_, i) => ({ side: "add" as const, position: i, rule: "overCap" as const })),
      v2: {
        requestHash: "h", restrictions: { capCents: 200, sets: [], ownedOnly: false }, in: { add: true, cut: true }, refilling: { add: false, cut: false },
        shortReason: { add: "overCap", cut: null }, charge: { outcome: "spent" },
      },
    };
    setup({ ask: ask(20, { restrictions: { capCents: 200, sets: [], ownedOnly: false } }), lines: [...adds(14), ...cuts(21)], report });
    expect(document.querySelector("[data-sc-short]")!.textContent).toContain("Found 14 additions under your $2.00 cap");
    expect(document.querySelector("[data-sc-short]")!.textContent).toContain(sc.short.capCredit);
    expect(document.querySelector("[data-sc-lead]")!.textContent).toBe(sc.run.shortLead(14, 21, 14));
    expect(document.querySelector('[data-sc-chip="cut"]')!.textContent).toBe(sc.results.chosen(0, 14));
    expect(document.querySelector("[data-sc-asked]")!.textContent).toContain(sc.run.askedCap("$2.00"));
  });

  it("says a refunded short run gave the credit back", () => {
    const report: ValidationReport = {
      askedCount: 0, survivedCount: 0, keptCount: 0, refunded: true,
      v2: { requestHash: "h", restrictions: { capCents: null, sets: [], ownedOnly: false }, in: { add: true, cut: true }, refilling: { add: false, cut: false } },
    };
    setup({ ask: ask(10, { request: null }), lines: [...adds(8), ...cuts(12)], report });
    expect(document.querySelector('[data-sc-short="refunded"]')!.textContent).toContain(sc.short.refundCredit);
    expect(document.querySelector("[data-sc-asked]")!.textContent).toContain(sc.results.noRequest);
  });

  it("reads a run whose cut call failed (plan P4) with its additions and nothing to apply", () => {
    const report: ValidationReport = {
      askedCount: 0, survivedCount: 0, keptCount: 0, refunded: true,
      v2: {
        requestHash: "h", restrictions: { capCents: null, sets: [], ownedOnly: false }, in: { add: true, cut: true }, refilling: { add: false, cut: false },
        cutsFailed: { errorClass: "timeout" },
      },
    };
    setup({ lines: adds(5), report });
    expect(document.querySelector('[data-sc-short="noCuts"], [data-sc-notice="no-cuts"]')).not.toBeNull();
    expect(pick("a0").getAttribute("aria-disabled")).toBe("true");
    expect(apply().getAttribute("aria-disabled")).toBe("true");
  });

  it("holds Apply off a deck that drifted off 99, with the drift line and its link", () => {
    const onTopOff = vi.fn();
    setup({
      lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))],
      drift: { at: 98, over: -1, onTopOff },
    });
    expect(apply().getAttribute("aria-disabled")).toBe("true");
    expect(document.querySelector("[data-sc-drift]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: sc.tile.topOff }));
    expect(onTopOff).toHaveBeenCalled();
  });

  it("reports the bracket aim reached by a flagged addition, and missed without one (Apply still on)", async () => {
    const up = ask(3, { bracket: { choice: "up", target: 3 } });
    const lines = [...adds(5, (i) => ({ picked: i === 0, bracketAfter: i === 0 ? [3] : null })), ...cuts(5, (i) => ({ picked: i === 0 }))];
    const t = setup({ ask: up, lines });
    expect(document.querySelector("[data-sc-asked]")!.textContent).toContain(sc.results.aimed(3, "Upgraded"));
    expect(screen.getByRole("article", { name: "Card a0" }).querySelector("[data-sc-asked-flag]")!.textContent).toBe(sc.results.flagAsked);
    expect(bar().textContent).toContain(sc.bar.bracketReached(2, 3, "Upgraded"));
    t.rerender({ ask: up, lines: [...adds(5, (i) => ({ picked: i === 1 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    expect(bar().textContent).toContain(sc.bar.bracketMissed(3, "Upgraded", 2));
    expect(apply().getAttribute("aria-disabled")).toBeNull();
  });

  it("says a one-pair set keeps the bracket, in the bar and the confirmation", async () => {
    setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    expect(bar().textContent).toContain(sc.bar.bracketStays(2, "Core"));
    await press(apply());
    expect(screen.getByRole("dialog").textContent).toContain(sc.confirm.lead("Bracket stays 2 · Core."));
  });

  it("holds Apply off a failed cut call even with a cut picked while the cuts were arriving", () => {
    const report: ValidationReport = {
      askedCount: 0, survivedCount: 0, keptCount: 0, refunded: true,
      v2: {
        requestHash: "h", restrictions: { capCents: null, sets: [], ownedOnly: false }, in: { add: true, cut: true }, refilling: { add: false, cut: false },
        cutsFailed: { errorClass: "timeout" },
      },
    };
    setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(1, () => ({ picked: true }))], report });
    expect(document.querySelector('[data-sc-notice="no-cuts"]')).not.toBeNull();
    expect(apply().getAttribute("aria-disabled")).toBe("true");
  });

  it("holds Apply off picks an Undo gave back past the cap, and says how many a set takes", () => {
    // N = 3: a set of 3 undone beside 2 picked since leaves 5 picked a side; the server refuses more than N (`planPicks`).
    setup({ lines: [...adds(5, () => ({ picked: true })), ...cuts(5, () => ({ picked: true }))] });
    expect(apply().getAttribute("aria-disabled")).toBe("true");
    expect(bar().textContent).toContain(sc.bar.none(3));
  });

  it("keeps an applied set applied, with its Undo, when the read after it fails; and an undone one undone", async () => {
    const t = setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    t.actions.apply.mockResolvedValueOnce({ ok: true, itemIds: ["c0", "a0"] });
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(2) }));
    // `onChanged` resolved with nothing new: the rows still read pending from the panel.
    expect(screen.getByRole("article", { name: "Card a0" }).textContent).toContain(sc.results.added);
    expect(screen.getByRole("button", { name: sc.bar.undo(2) })).toBeTruthy();
    expect(document.querySelector("[data-sc-apply]")).toBeNull();
    t.actions.undo.mockResolvedValueOnce({ ok: true, itemIds: ["c0", "a0"] });
    await press(screen.getByRole("button", { name: sc.bar.undo(2) }));
    expect(screen.queryByRole("button", { name: /^Undo all/ })).toBeNull();
    expect(screen.getByRole("article", { name: "Card a0" }).textContent).not.toContain(sc.results.added);
  });

  it("says the Keep the run was asked, not the deck's bracket today", () => {
    setup({ permits: [3] });
    expect(document.querySelector("[data-sc-asked]")!.textContent).toContain(sc.run.askedKeep(2, "Core"));
  });

  it("draws a run the deck moved past read-only: no Pick, no bar, open lines Not picked", () => {
    setup({ readOnly: true, lines: [...adds(2, (i) => (i === 0 ? { verdict: "accepted", applySet: SET } : {})), ...cuts(2)] });
    expect(document.querySelector("[data-sc-pick]")).toBeNull();
    expect(bar()).toBeNull();
    expect(screen.getByRole("article", { name: "Card a1" }).textContent).toContain(sc.results.notPicked);
  });
});

describe("the design-review fixes", () => {
  it("says what an all-in side asked for, and keeps the end lines on a run that finished short in front of the reader (Wait D, E)", () => {
    const both = [...adds(5), ...cuts(4)];
    const t = setup({ live: liveOf(both, { phase: "cuts", in: { add: true, cut: false } }), lines: both, startedAt: new Date() });
    const end = (side: string) => document.querySelector(`[data-sc-end="${side}"]`) as HTMLElement | null;
    expect(end("add")!.getAttribute("data-sc-end-state")).toBe("in");
    expect(end("add")!.textContent).toContain(sc.wait.askedFor(5));
    act(() => t.rerender({ live: null, startedAt: null, finishedHere: true }));
    expect(document.querySelector('[data-sc-notice="finished-short"]')).not.toBeNull();
    expect(end("cut")!.getAttribute("data-sc-end-state")).toBe("in");
    expect(end("cut")!.textContent).toContain(sc.wait.allIn(4));
    expect(end("cut")!.textContent).toContain(sc.wait.askedFor(5));
  });

  it("drops the end lines once a full run is made", () => {
    const both = [...adds(5), ...cuts(5)];
    const t = setup({ live: liveOf(both, { phase: "cuts", in: { add: true, cut: false } }), lines: both, startedAt: new Date() });
    act(() => t.rerender({ live: null, startedAt: null, finishedHere: true }));
    expect(document.querySelector("[data-sc-end]")).toBeNull();
  });

  it("dims a whole row once its side is full, never a picked one", async () => {
    setup();
    for (const id of ["a0", "a1", "a2"]) await press(pick(id));
    const row = (id: string) => screen.getByRole("article", { name: `Card ${id}` });
    expect(row("a3").style.opacity).toBe("0.78");
    expect(row("a0").style.opacity).toBe("");
    expect(row("c0").style.opacity).toBe("");
  });

  it("strikes a cut's name only once it is made", () => {
    setup({ lines: [...adds(2, (i) => (i === 0 ? { verdict: "accepted", applySet: SET } : {})), ...cuts(2, (i) => (i === 0 ? { verdict: "accepted", applySet: SET } : {}))] });
    const name = (id: string) => screen.getByRole("article", { name: `Card ${id}` }).querySelector("button[aria-label]:not([data-sc-pick])") as HTMLElement;
    expect(name("c1").className).not.toContain("line-through");
    expect(name("c0").className).toContain("line-through");
  });

  it("draws only the quiet count with nothing picked, then the signed tally", async () => {
    setup();
    const tallyEl = () => document.querySelector("[data-sc-tally]") as HTMLElement;
    expect(document.querySelector("[data-sc-tally-quiet]")!.textContent).toBe(sc.run.nonePicked);
    expect(tallyEl().textContent).toBe(sc.run.nonePicked);
    await press(pick("a0"));
    expect(document.querySelector("[data-sc-tally-quiet]")).toBeNull();
    expect(tallyEl().textContent).toContain("+1 in");
  });

  it("says how many credits are left once a short run gave its credit back", () => {
    const report: ValidationReport = {
      askedCount: 0, survivedCount: 0, keptCount: 0, refunded: true,
      v2: { requestHash: "h", restrictions: { capCents: null, sets: [], ownedOnly: false }, in: { add: true, cut: true }, refilling: { add: false, cut: false } },
    };
    setup({ ask: ask(10), lines: [...adds(8), ...cuts(12)], report, credits: { left: 5, total: 5 } });
    expect(document.querySelector('[data-sc-short="refunded"]')!.textContent).toContain(sc.short.refundCreditLeft(5, 5));
  });
});
