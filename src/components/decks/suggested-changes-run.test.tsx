import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { pullCardFromDeck } from "../../app/decks/actions";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { DECK_GROUPING_ARIA, DECK_GROUPING_KEY } from "../../lib/copy/deck-sort";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import type { LineItem, TuningLive, V2Ask } from "../../lib/tuning/state";
import type { ValidationReport } from "../../lib/tuning/validate";
import { v2Line } from "../../lib/tuning/v2/results-fixture";
import { NEW_MARK_MS, SLOW_NOTE_MS, SuggestedChangesRun, type SuggestionSetActions } from "./suggested-changes-run";
import { historyDay } from "./tuning-history";

const openCard = vi.hoisted(() => vi.fn());
vi.mock("../cards/card-detail-provider", async (importActual) => ({
  // The rest of the module as shipped: the confirmation's Pull (Small items 4, item 2) names the row's card trigger.
  ...(await importActual<typeof import("../cards/card-detail-provider")>()),
  useCardDetail: () => ({ open: openCard, registerSheet: () => () => {}, openOracleId: null, revealing: false }),
  useCardIntent: () => ({}),
}));
vi.mock("../../app/decks/actions", () => ({ pullCardFromDeck: vi.fn() }));

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
    setBracket: vi.fn(async () => ({ permits: [3] })),
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

  // Small items 4, item 2: a held addition's pull is staged in the confirmation and sent with the set, never on its own.
  it("sends a staged pull with the set, and only for a held addition", async () => {
    const GISHATH = { id: "d-gishath", name: "HD - Gishath", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const held = { owned: 1, hard: 1, soft: 0, free: -1, claims: [GISHATH] } as unknown as NonNullable<LineItem["availability"]>;
    const otherDecks = ask(3, { restrictions: { capCents: null, sets: [], ownedOnly: true, otherDecks: true } });
    const t = setup({
      ask: otherDecks,
      lines: [...adds(5, (i) => ({ picked: i < 2, availability: i === 0 ? held : null })), ...cuts(5, (i) => ({ picked: i < 2 }))],
    });
    await press(apply());
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain(sc.confirm.heldFoot);
    await press(within(dialog).getByRole("button", { name: deckVersioningCopy.review.pullA11y("Card a0", GISHATH.name) }));
    expect(dialog.textContent).toContain(sc.confirm.pullsFrom(GISHATH.name));
    expect(pullCardFromDeck).not.toHaveBeenCalled();
    await press(within(dialog).getByRole("button", { name: sc.confirm.apply(4) }));
    expect(t.actions.apply).toHaveBeenCalledWith(
      RUN, ["a0", "a1"], ["c0", "c1"], expect.stringMatching(/^[0-9a-f-]{36}$/), [{ itemId: "a0", sourceDeckId: GISHATH.id }],
    );
  });

  it("says a refused pull's own reason in the toast and unstages it, so Apply again sends the set without it", async () => {
    const GISHATH = { id: "d-gishath", name: "HD - Gishath", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const held = { owned: 1, hard: 1, soft: 0, free: -1, claims: [GISHATH] } as unknown as NonNullable<LineItem["availability"]>;
    const otherDecks = ask(3, { restrictions: { capCents: null, sets: [], ownedOnly: true, otherDecks: true } });
    const t = setup({
      ask: otherDecks,
      lines: [...adds(5, (i) => ({ picked: i === 0, availability: i === 0 ? held : null })), ...cuts(5, (i) => ({ picked: i === 0 }))],
    });
    const reason = "That card is that deck’s commander.";
    t.actions.apply.mockResolvedValueOnce({
      ok: false, message: deckTuningCopy.lists.applyRefused, refusal: { kind: "pull", itemId: "a0", message: reason },
    });
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: deckVersioningCopy.review.pullA11y("Card a0", GISHATH.name) }));
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(2) }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(sc.applyFailed.title);
    expect(alert.textContent).toContain(reason);
    expect(alert.textContent).not.toContain(sc.applyFailed.detail);

    // The retry: the row offers Pull it again, and the set goes without the refused pull.
    await press(apply());
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).not.toContain(sc.confirm.pullsFrom(GISHATH.name));
    await press(within(dialog).getByRole("button", { name: sc.confirm.apply(2) }));
    expect(t.actions.apply).toHaveBeenLastCalledWith(RUN, ["a0"], ["c0"], expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  // The pressed control unmounts as the row redraws, so focus follows the row to its replacement, never to the page.
  it("moves focus to the staged row's Undo after Pull it, and back to Pull it after Undo", async () => {
    const GISHATH = { id: "d-gishath", name: "HD - Gishath", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const held = { owned: 1, hard: 1, soft: 0, free: -1, claims: [GISHATH] } as unknown as NonNullable<LineItem["availability"]>;
    setup({
      ask: ask(3, { restrictions: { capCents: null, sets: [], ownedOnly: true, otherDecks: true } }),
      lines: [...adds(5, (i) => ({ picked: i === 0, availability: i === 0 ? held : null })), ...cuts(5, (i) => ({ picked: i === 0 }))],
    });
    await press(apply());
    const pullName = deckVersioningCopy.review.pullA11y("Card a0", GISHATH.name);
    await press(screen.getByRole("button", { name: pullName }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: sc.confirm.unstageA11y("Card a0", GISHATH.name) }));
    await press(screen.getByRole("button", { name: sc.confirm.unstageA11y("Card a0", GISHATH.name) }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: pullName }));
  });

  it("moves focus to the staged row's Undo after the picker's Pull from {deck}, and back to Pull it ▾ after Undo", async () => {
    const claim = (id: string, name: string, since: number) =>
      ({ id, name, quantity: 1, mature: true, pending: false, commander: false, senior: true, since });
    const KRATOS = claim("d-kratos", "HD - Kratos", 1);
    const THORIN = claim("d-thorin", "HD - Thorin", 2);
    const held = { owned: 2, hard: 2, soft: 0, free: -1, claims: [KRATOS, THORIN] } as unknown as NonNullable<LineItem["availability"]>;
    setup({
      ask: ask(3, { restrictions: { capCents: null, sets: [], ownedOnly: true, otherDecks: true } }),
      lines: [...adds(5, (i) => ({ picked: i === 0, availability: i === 0 ? held : null })), ...cuts(5, (i) => ({ picked: i === 0 }))],
    });
    await press(apply());
    const manyName = deckVersioningCopy.review.pullManyA11y("Card a0", 2);
    await press(screen.getByRole("button", { name: manyName }));
    await press(screen.getByRole("radio", { name: new RegExp(THORIN.name) }));
    await press(screen.getByRole("button", { name: deckVersioningCopy.review.source.confirm(THORIN.name) }));
    const undo = screen.getByRole("button", { name: sc.confirm.unstageA11y("Card a0", THORIN.name) });
    expect(document.activeElement).toBe(undo);
    await press(undo);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: manyName }));
  });

  it("reads the picker's source figures for the held additions once the confirmation opens", async () => {
    const GISHATH = { id: "d-gishath", name: "HD - Gishath", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const held = { owned: 1, hard: 1, soft: 0, free: -1, claims: [GISHATH] } as unknown as NonNullable<LineItem["availability"]>;
    const sourceFigures = vi.fn(async () => [[`${GISHATH.id}:o-a0`, { built: 99, inDraft: true }]] as [string, { built: number; inDraft: boolean }][]);
    const t = setup({
      ask: ask(3, { restrictions: { capCents: null, sets: [], ownedOnly: true, otherDecks: true } }),
      lines: [...adds(5, (i) => ({ picked: i === 0, availability: i === 0 ? held : null })), ...cuts(5, (i) => ({ picked: i === 0 }))],
    });
    t.actions.sourceFigures = sourceFigures;
    t.rerender({});
    expect(sourceFigures).not.toHaveBeenCalled();
    await press(apply());
    expect(sourceFigures).toHaveBeenCalledWith([{ deckId: GISHATH.id, oracleId: "o-a0" }]);
    // Closed and opened again: read again, never the first opening's figures.
    await press(screen.getByRole("button", { name: sc.confirmClose }));
    await press(apply());
    expect(sourceFigures).toHaveBeenCalledTimes(2);
  });

  it("takes a staged pull back with Undo, and then sends none", async () => {
    const GISHATH = { id: "d-gishath", name: "HD - Gishath", quantity: 1, mature: true, pending: false, commander: false, senior: true };
    const held = { owned: 1, hard: 1, soft: 0, free: -1, claims: [GISHATH] } as unknown as NonNullable<LineItem["availability"]>;
    const otherDecks = ask(3, { restrictions: { capCents: null, sets: [], ownedOnly: true, otherDecks: true } });
    const t = setup({
      ask: otherDecks,
      lines: [...adds(5, (i) => ({ picked: i === 0, availability: i === 0 ? held : null })), ...cuts(5, (i) => ({ picked: i === 0 }))],
    });
    await press(apply());
    const dialog = screen.getByRole("dialog");
    await press(within(dialog).getByRole("button", { name: deckVersioningCopy.review.pullA11y("Card a0", GISHATH.name) }));
    await press(within(dialog).getByRole("button", { name: sc.confirm.unstageA11y("Card a0", GISHATH.name) }));
    expect(dialog.textContent).not.toContain(sc.confirm.pullsFrom(GISHATH.name));
    await press(within(dialog).getByRole("button", { name: sc.confirm.apply(2) }));
    expect(t.actions.apply).toHaveBeenCalledWith(RUN, ["a0"], ["c0"], expect.stringMatching(/^[0-9a-f-]{36}$/));
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

  it("a second refused apply arrives as a newer alert, not the first one left standing (small items 3, item 8)", async () => {
    const t = setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    t.actions.apply.mockResolvedValue({ ok: false, message: "refused" });
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(2) }));
    const first = screen.getByRole("alert");
    await new Promise((r) => setTimeout(r, 5));
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(2) }));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).not.toBe(first);
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

  it("lets only a row's latest save roll it back: Pick, unpick, Pick with the first save failing last stays picked", async () => {
    const t = setup();
    const replies: Array<(r: { ok: boolean }) => void> = [];
    t.actions.pick.mockImplementation(() => new Promise((res) => { replies.push(res); }));
    await press(pick("a0"));
    await press(pickedBtn("a0"));
    await press(pick("a0"));
    expect(t.actions.pick.mock.calls).toEqual([["a0", true], ["a0", false], ["a0", true]]);
    await act(async () => { replies[1]({ ok: true }); replies[2]({ ok: true }); });
    await act(async () => { replies[0]({ ok: false }); });
    expect(pickedBtn("a0")).toBeTruthy();
    // The latest save failing still rolls back.
    await press(pickedBtn("a0"));
    await act(async () => { replies[3]({ ok: false }); });
    expect(pickedBtn("a0")).toBeTruthy();
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

  it("names each card in the confirmation as a keyboard way to its details (the thumbnail is pointer-only)", async () => {
    setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    await press(apply());
    const dialog = screen.getByRole("dialog");
    openCard.mockClear();
    await press(within(dialog).getByRole("button", { name: deckTuningCopy.lists.open("Card c0") }));
    expect(openCard).toHaveBeenCalledWith("o-c0", expect.anything(), undefined, expect.anything());
    expect(within(dialog).getByRole("button", { name: deckTuningCopy.lists.open("Card a0") })).toBeTruthy();
  });

  it("gives an undone set back its eligibility when the read after the Undo fails: its picks apply again", async () => {
    // The read after the Apply landed: the set's rows are accepted and no longer apply (the add in, the cut out).
    const done = (side: "add" | "cut") => (): Partial<LineItem> => ({ verdict: "accepted", applySet: SET, picked: true, applies: false, inDeck: side === "add" });
    const t = setup({ lines: [...adds(3, done("add")), ...cuts(3, done("cut"))] });
    t.actions.undo.mockResolvedValueOnce({ ok: true, itemIds: ["a0", "a1", "a2", "c0", "c1", "c2"] });
    await press(screen.getByRole("button", { name: sc.bar.undo(6) }));
    // `onChanged` resolved with nothing new: the rows still read accepted, applies false, from the panel.
    expect(document.querySelector('[data-sc-chip="add"]')!.textContent).toBe(sc.results.chosen(3, 3));
    expect(apply().getAttribute("aria-disabled")).toBeNull();
    expect(apply().textContent).toBe(sc.bar.apply(6));
  });

  it("does not count a saved pick the deck has moved past (its cut locked since): Apply stays off", () => {
    setup({
      lines: [
        ...adds(5, (i) => ({ picked: i < 2 })),
        ...cuts(5, (i) => ({ picked: i < 2, ...(i === 0 ? { applies: false, locked: true } : {}) })),
      ],
    });
    expect(apply().getAttribute("aria-disabled")).toBe("true");
    expect(bar().textContent).toContain(sc.bar.unequal(2, 1, 1, "cut"));
  });

  it("asks the server for a set the flags cannot settle, and claims its outcome only for the picks it read (follow-up b)", async () => {
    vi.useFakeTimers();
    const up = ask(3, { bracket: { choice: "up", target: 3 } });
    const two = (i: number) => ({ picked: i < 2 });
    const t = setup({ ask: up, lines: [...adds(5, two), ...cuts(5, two)] });
    expect(bar().textContent).not.toContain(sc.bar.bracketReached(2, 3, "Upgraded"));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(t.actions.setBracket).toHaveBeenCalledWith(RUN, ["a0", "a1"], ["c0", "c1"]);
    expect(bar().textContent).toContain(sc.bar.bracketReached(2, 3, "Upgraded"));
    // The same picks after the deck moved (an Apply elsewhere): the old read no longer speaks for them.
    const moved = [...adds(5, two), ...cuts(5, two), v2Line("x", "add", { verdict: "accepted", applySet: SET })];
    t.rerender({ ask: up, lines: moved });
    expect(bar().textContent).not.toContain(sc.bar.bracketReached(2, 3, "Upgraded"));
    t.rerender({ ask: up, lines: [...adds(5, two), ...cuts(5, two)] });
    // Other picks: the read for the old set no longer speaks for them.
    t.rerender({ ask: up, lines: [...adds(5, (i) => ({ picked: i === 2 || i === 3 })), ...cuts(5, two)] });
    expect(bar().textContent).not.toContain(sc.bar.bracketReached(2, 3, "Upgraded"));
  });

  it("asks nothing while the run is still streaming", async () => {
    vi.useFakeTimers();
    const two = (i: number) => ({ picked: i < 2 });
    const both = [...adds(5, two), ...cuts(3, two)];
    const t = setup({ live: liveOf(both, { phase: "cuts", in: { add: true, cut: false } }), lines: both, startedAt: new Date() });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(t.actions.setBracket).not.toHaveBeenCalled();
  });

  it("asks nothing for a set of one line a side", async () => {
    vi.useFakeTimers();
    const t = setup({ lines: [...adds(5, (i) => ({ picked: i === 0 })), ...cuts(5, (i) => ({ picked: i === 0 }))] });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(t.actions.setBracket).not.toHaveBeenCalled();
  });

  it("says Keep over a range as the intake offered it (follow-up d)", () => {
    setup({ ask: ask(3, { bracket: { choice: "keep", target: 2, low: 1 } }), permits: [1, 2] });
    expect(document.querySelector("[data-sc-asked]")!.textContent).toContain(sc.run.askedKeepRange(1, 2, "Exhibition or Core"));
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

describe("History: a run reopened from History", () => {
  const h = sc.history;
  // Three of each applied as one set, two of each left open (History B's fixture).
  const appliedLines = () => [
    ...adds(5, (i) => (i < 3 ? { verdict: "accepted", applySet: SET } : {})),
    ...cuts(5, (i) => (i < 3 ? { verdict: "accepted", applySet: SET } : {})),
  ];

  it("same version (History B): its note, You asked beside the lead, when it was applied, its Undo and the rest still pickable", () => {
    setup({ lines: appliedLines(), past: { date: "Oct 26", stale: false }, readFrom: <span data-testid="read-from">read from</span> });
    expect(document.querySelector("[data-sc-past-note]")!.textContent).toBe(tuningHubCopy.history.review.note.suggested("Oct 26"));
    const sbs = document.querySelector("[data-sc-side-by-side]") as HTMLElement;
    expect(sbs.className).toContain("md:grid-cols-2");
    expect(sbs.querySelector("[data-sc-asked]")).not.toBeNull();
    expect(sbs.querySelector("[data-testid=read-from]")).not.toBeNull();
    expect(sbs.querySelector("[data-sc-lead]")!.textContent).toBe(`${h.oldRunLead(3, "Oct 26")} ${h.oldRunRest(4)}`);
    expect(sbs.querySelector("[data-sc-lead] b")!.textContent).toBe(h.oldRunLead(3, "Oct 26"));
    expect(document.querySelectorAll("[data-sc-lead]")).toHaveLength(1);
    // No version known: one line at every width.
    expect(document.querySelector("[data-sc-lead-wide]")).toBeNull();
    expect(bar().textContent).toContain(sc.bar.undo(6));
    expect(pick("a3")).toBeTruthy();
    expect(document.querySelector('[data-sc-chip="add"]')!.textContent).toBe(sc.results.applied(3));
    // The figure and its word are one inline box inside the chip's inline-flex, so the space between them stays.
    const box = document.querySelector('[data-sc-chip="add"] > [data-sc-lead-count]')!;
    expect(box.textContent).toBe("3 applied");
    expect(document.querySelector('[data-sc-chip="add"]')!.childNodes).toHaveLength(1);
  });

  it("same version on desktop (History B): the lead names the version; the phone keeps the shorter line", () => {
    setup({ lines: appliedLines(), past: { date: "Oct 26", stale: false, version: 4 } });
    const narrow = document.querySelector("[data-sc-lead-narrow]") as HTMLElement;
    const wide = document.querySelector("[data-sc-lead-wide]") as HTMLElement;
    expect(narrow.textContent).toBe(` ${h.oldRunRest(4)}`);
    expect(narrow.className).toContain("md:hidden");
    expect(wide.textContent).toBe(` ${h.oldRunRestVersion(4, 4)}`);
    expect(wide.className).toContain("hidden md:inline");
    expect(h.oldRunRestVersion(4, 4)).toBe("The other 4 are still pickable while the deck is on version 4.");
  });

  it("says the applied set's own day, its newest answered line, not the run's (History B and C)", () => {
    // Applied Oct 28 (UTC noon, so every zone agrees on the day), from a run of Oct 26.
    const applied = [
      ...adds(5, (i) => (i < 3 ? { verdict: "accepted", applySet: SET, verdictAt: i === 2 ? "2026-10-28T12:00:00.000Z" : "2026-10-27T12:00:00.000Z" } : {})),
      ...cuts(5, (i) => (i < 3 ? { verdict: "accepted", applySet: SET, verdictAt: "2026-10-27T12:00:00.000Z" } : {})),
    ];
    const t = setup({ lines: applied, past: { date: "Oct 26", stale: false } });
    expect(document.querySelector("[data-sc-lead] b")!.textContent).toBe(h.oldRunLead(3, "Oct 28"));
    act(() => t.rerender({ readOnly: true, past: { date: "Oct 26", stale: true } }));
    expect(document.querySelector("[data-sc-lead]")!.textContent).toContain(h.staleApplied(h.pair(3, 3), "Oct 28"));
    // No line says when: the run's day.
    act(() => t.rerender({ readOnly: false, past: { date: "Oct 26", stale: false }, lines: applied.map((l) => ({ ...l, verdictAt: null })) }));
    expect(document.querySelector("[data-sc-lead] b")!.textContent).toBe(h.oldRunLead(3, "Oct 26"));
  });

  it("says today for a set this visit applied, though the follow-up read never came (History B)", async () => {
    // The run's day is any day but today, so the lead can only say today by reading the write's own time.
    const today = historyDay(new Date().toISOString());
    const runDay = today === "Oct 26" ? "Oct 25" : "Oct 26";
    const t = setup({ lines: [...adds(5, (i) => ({ picked: i < 3 })), ...cuts(5, (i) => ({ picked: i < 3 }))], past: { date: runDay, stale: false } });
    t.actions.apply.mockResolvedValueOnce({ ok: true, itemIds: ["a0", "a1", "a2", "c0", "c1", "c2"] });
    await press(apply());
    await press(within(screen.getByRole("dialog")).getByRole("button", { name: sc.confirm.apply(6) }));
    expect(document.querySelector("[data-sc-lead] b")!.textContent).toBe(h.oldRunLead(3, today));
  });

  it("same version with one row left: singular; with none left: the clause is left out at both widths", () => {
    const one = [
      ...adds(4, (i) => (i < 3 ? { verdict: "accepted", applySet: SET } : {})),
      ...cuts(3, () => ({ verdict: "accepted", applySet: SET })),
    ];
    const t = setup({ lines: one, past: { date: "Oct 26", stale: false, version: 4 } });
    expect(document.querySelector("[data-sc-lead-narrow]")!.textContent).toBe(" The other one is still pickable.");
    expect(document.querySelector("[data-sc-lead-wide]")!.textContent).toBe(" The other one is still pickable while the deck is on version 4.");
    const none = [...adds(3, () => ({ verdict: "accepted", applySet: SET })), ...cuts(3, () => ({ verdict: "accepted", applySet: SET }))];
    act(() => t.rerender({ lines: none }));
    expect(document.querySelector("[data-sc-lead]")!.textContent).toBe(h.oldRunLead(3, "Oct 26"));
    expect(document.querySelector("[data-sc-lead-wide]")).toBeNull();
    expect(h.oldRunRest(0)).toBe("");
    expect(h.oldRunRestVersion(0, 4)).toBe("");
  });

  it("stale (History C): the past-run note, no Picks and no bar, rows Added / Cut / Not picked, and what was applied when", () => {
    const lines = [
      ...adds(5, (i) => (i < 2 ? { verdict: "accepted", applySet: SET } : {})),
      ...cuts(5, (i) => (i < 2 ? { verdict: "accepted", applySet: SET } : {})),
    ];
    setup({ lines, readOnly: true, past: { date: "Oct 19", stale: true } });
    expect(document.querySelector("[data-sc-past-note]")!.textContent).toBe(tuningHubCopy.history.pastNoteUncounted);
    expect(document.querySelector("[data-sc-pick]")).toBeNull();
    expect(bar()).toBeNull();
    expect(document.querySelector("[data-sc-apply]")).toBeNull();
    expect(screen.getByRole("article", { name: "Card a0" }).textContent).toContain(sc.results.added);
    expect(screen.getByRole("article", { name: "Card c0" }).textContent).toContain(sc.results.cut);
    expect(screen.getByRole("article", { name: "Card a4" }).textContent).toContain(sc.results.notPicked);
    const lead = document.querySelector("[data-sc-lead]")!;
    expect(lead.textContent).toBe(`${h.staleLists(5, 5)}${h.staleApplied(h.pair(2, 2), "Oct 19")}`);
    expect(lead.querySelector("b")!.textContent).toBe(h.staleLists(5, 5));
    // The chip says what was applied, in quiet ink; the phone halves count the rows.
    const chip = document.querySelector('[data-sc-chip="add"]') as HTMLElement;
    expect(chip.textContent).toBe(sc.results.applied(2));
    expect(chip.style.color).toBe("var(--fg-muted)");
    expect(screen.getByRole("tab", { name: /Additions/ }).textContent).toContain("5");
  });

  it("stale with a counted list (History C): the note says how many cards the list has changed by", () => {
    setup({ readOnly: true, past: { date: "Oct 19", stale: true, moved: 7 } });
    expect(document.querySelector("[data-sc-past-note]")!.textContent).toBe(tuningHubCopy.history.pastNote(7));
    expect(tuningHubCopy.history.pastNote(7)).toBe("A past run, read-only. The list has changed by 7 cards since; nothing here can be applied now.");
  });

  it("stale with no count (a run saved before its list was stored): the uncounted note", () => {
    setup({ readOnly: true, past: { date: "Oct 19", stale: true, moved: null } });
    expect(document.querySelector("[data-sc-past-note]")!.textContent).toBe(tuningHubCopy.history.pastNoteUncounted);
  });

  it("stale with nothing applied: the lists alone, and no chip", () => {
    setup({ readOnly: true, past: { date: "Oct 19", stale: true } });
    expect(document.querySelector("[data-sc-lead]")!.textContent).toBe(h.staleListsOnly(5, 5));
    expect(document.querySelector("[data-sc-chip]")).toBeNull();
  });

  it("a set applied in this visit (Results-3 D) keeps its own lead, and the phone halves say what was applied", () => {
    setup({ lines: appliedLines() });
    expect(document.querySelector("[data-sc-past-note]")).toBeNull();
    expect(document.querySelector("[data-sc-side-by-side]")).toBeNull();
    expect(document.querySelector("[data-sc-lead]")!.textContent).toBe(sc.run.appliedLead(3, 4));
    expect(screen.getByRole("tab", { name: /Additions/ }).textContent).toContain(sc.results.applied(3));
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

  it("states the cut call's stored ask on the cuts' end line (follow-up c)", () => {
    // Five additions kept would imply an ask of 8; the cut call asked 15, and the line says so.
    const both = [...adds(5), ...cuts(4)];
    setup({ ask: ask(10), live: liveOf(both, { phase: "cuts", in: { add: true, cut: true }, cutAsk: 15 }), lines: both, startedAt: new Date() });
    const end = document.querySelector('[data-sc-end="cut"]') as HTMLElement;
    expect(end.textContent).toContain(sc.wait.askedFor(15));
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
