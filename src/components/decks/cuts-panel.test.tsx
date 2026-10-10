import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { MAX_CUTS_PER_RUN } from "../../lib/tuning/cuts-ask";
import type { CutItem, CutsPanel } from "../../lib/tuning/cuts-state";
import { CutsPanelView, type CutsDeps } from "./cuts-panel";

vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: vi.fn() }), useCardIntent: () => ({}) }));
vi.mock("../../app/decks/cuts-actions", () => ({
  cancelProposedCuts: vi.fn(), cutProposed: vi.fn(), keepProposedCut: vi.fn(), readCutsPanel: vi.fn(),
  restoreProposedCut: vi.fn(), runProposedCuts: vi.fn(), undoProposedCut: vi.fn(),
}));

const copy = deckCutsCopy.panel;
const item = (n: number, over: Partial<CutItem> = {}): CutItem => ({
  id: `i${n}`, cutOracleId: `c${n}`, cutName: `Card ${n}`, cutTypeLine: "Creature", cutImageUri: null,
  reason: `Reason ${n}.`, evidence: [{ kind: "role", role: "ramp", have: 14, target: 10 }], position: n, verdict: "pending", ...over,
});
const panelOf = (over: Partial<CutsPanel> = {}): CutsPanel => ({
  run: null, items: [], itemsReport: null, lastOkFingerprint: null, lastOkAt: null, modelVersionMoved: false,
  allowance: { used: 1, limit: 3, reopensAt: null, nextAt: null },
  total: 105, bodySize: 99, over: 6, commander: "Gishath", allLocked: false, lockedCount: 4, keyCount: 6,
  declaredBracket: 3, edhrecDecks: 2140, thin: false,
  rows: [{ key: "role:ramp", source: "role", label: "Ramp", figure: 14, note: "rec 10 · 4 over" }],
  chips: { medianPct: 38, flagCounts: {}, declared: 3 },
  resultCurrent: false, asked: 6, ...over,
});
const withResult = (n: number, asked: number, extra: Partial<CutsPanel> = {}) => panelOf({
  items: Array.from({ length: n }, (_, i) => item(i + 1)), asked, resultCurrent: true,
  itemsReport: { askedCount: asked, survivedCount: n, keptCount: n, over: asked, drops: [] },
  run: { id: "r1", status: "ok", errorClass: null, createdAt: new Date(), droppedCount: 0 }, ...extra,
});

function deps(read: CutsPanel | null, over: Partial<CutsDeps> = {}): CutsDeps {
  return {
    read: vi.fn(async () => read), run: vi.fn(async () => ({ ok: true as const })), cancel: vi.fn(async () => ({ ok: true as const })),
    cut: vi.fn(async () => ({ ok: true as const })), undo: vi.fn(async () => ({ ok: true as const })),
    keep: vi.fn(async () => ({ ok: true as const })), restore: vi.fn(async () => ({ ok: true as const })), ...over,
  };
}
const mount = async (d: CutsDeps) => { render(<CutsPanelView deckId="d1" deps={d} />); await screen.findByRole("heading", { name: copy.heading }); };

describe("CutsPanelView", () => {
  it("C1: the count, Look deeper first, no card named", async () => {
    await mount(deps(panelOf()));
    expect(screen.getByText("Six over the ninety-nine.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." })).toBeTruthy();
    expect(screen.getByTestId("count-role:ramp").textContent).toContain("14");
    expect(screen.getByText(copy.neverCut("Gishath", 4, 6))).toBeTruthy();
    expect(screen.queryByText("Suggestion")).toBeNull();
  });

  it("C5: thin EDHREC offers the lead that names the gap", async () => {
    await mount(deps(panelOf({ thin: true })));
    expect(screen.getByText(copy.deeper.offerLeadThin)).toBeTruthy();
  });

  it("a press runs with its own run id and then reads the result", async () => {
    const d = deps(panelOf());
    await mount(d);
    fireEvent.click(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." }));
    await waitFor(() => expect(d.run).toHaveBeenCalledWith("d1", { runId: expect.stringMatching(/^[0-9a-f-]{36}$/) }));
    await waitFor(() => expect(d.read).toHaveBeenCalledTimes(2));
  });

  it("disables the press, with no segment, when credits are used up", async () => {
    await mount(deps(panelOf({ allowance: { used: 3, limit: 3, reopensAt: null, nextAt: null } })));
    const b = screen.getByRole("button", { name: "Look deeper. No credits left." }) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    expect(b.textContent).not.toContain(copy.deeper.credit);
  });

  it("C6c: all locked draws the neutral note and no offer", async () => {
    await mount(deps(panelOf({ allLocked: true })));
    expect(screen.getByText(copy.allLocked("Gishath"))).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Look deeper/ })).toBeNull();
  });

  it("C2: a pending run shows the running band and Stop cancels exactly that run", async () => {
    const pending = panelOf({ run: { id: "r9", status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
    const after = panelOf({ run: { id: "r9", status: "cancelled", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
    const read = vi.fn().mockResolvedValueOnce(pending).mockResolvedValue(after);
    const d = deps(null, { read });
    await mount(d);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.deeper.stop })); });
    await waitFor(() => expect(d.cancel).toHaveBeenCalledWith("d1", "r9"));
  });

  it("C3: six named, each with the Suggestion tag, a sentence and chips quoting the figure", async () => {
    await mount(deps(withResult(6, 6)));
    expect(screen.getAllByText("Suggestion")).toHaveLength(6);
    expect(screen.getByText("Six to cut")).toBeTruthy();
    expect(screen.getAllByText("ramp 14 · rec 10")).toHaveLength(6);
    expect(screen.queryAllByTestId("short-slot")).toHaveLength(0);
  });

  it("C4: a shortfall is a dashed slot, never padded", async () => {
    await mount(deps(withResult(5, 6)));
    expect(screen.getAllByTestId("short-slot")).toHaveLength(1);
    expect(screen.getByText(`– ${copy.deeper.shortRow(6)}`)).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });

  it("Cut and Keep call their verdicts and re-read", async () => {
    const d = deps(withResult(2, 2));
    await mount(d);
    const first = screen.getAllByRole("article")[0];
    fireEvent.click(within(first).getByRole("button", { name: copy.cut }));
    await waitFor(() => expect(d.cut).toHaveBeenCalledWith("i1"));
    await waitFor(() => expect(d.read).toHaveBeenCalledTimes(2));
    fireEvent.click(within(screen.getAllByRole("article")[1]).getByRole("button", { name: copy.keep }));
    await waitFor(() => expect(d.keep).toHaveBeenCalledWith("i2"));
    await waitFor(() => expect(d.read).toHaveBeenCalledTimes(3));
  });

  it("a refused cut says so on its own row and changes nothing", async () => {
    const d = deps(withResult(1, 1), { cut: vi.fn(async () => ({ ok: false as const, message: copy.refusals.cutLocked })) });
    await mount(d);
    fireEvent.click(screen.getByRole("button", { name: copy.cut }));
    expect(await screen.findByText(copy.refusals.cutLocked)).toBeTruthy();
  });

  it("answered rows collapse in their slots, with Undo and Show it again", async () => {
    const p = withResult(3, 3);
    p.items = [item(1, { verdict: "accepted" }), item(2, { verdict: "dismissed" }), item(3)];
    const d = deps(p);
    await mount(d);
    expect(screen.getByTestId("answered-cut")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.undo }));
    await waitFor(() => expect(d.undo).toHaveBeenCalledWith("i1"));
    fireEvent.click(screen.getByRole("button", { name: copy.showAgain }));
    await waitFor(() => expect(d.restore).toHaveBeenCalledWith("i2"));
    expect(screen.getByText(copy.facts.dividerPart)).toBeTruthy();
  });

  it("re-offer: a result for a list that has since moved is not shown, and the offer is back", async () => {
    await mount(deps(withResult(3, 3, { resultCurrent: false })));
    expect(screen.queryByText("Suggestion")).toBeNull();
    expect(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." })).toBeTruthy();
  });

  it("C6: an ungrounded run is a neutral refusal with the offer still there", async () => {
    await mount(deps(panelOf({ run: { id: "r", status: "failed", errorClass: "ungrounded", createdAt: new Date(), droppedCount: 3 } })));
    expect(screen.getByText(copy.deeper.refused)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." })).toBeTruthy();
  });

  it("C7: a failure carries the mark, one sentence and Try again with the credit", async () => {
    await mount(deps(panelOf({ run: { id: "r", status: "failed", errorClass: "upstream_busy", createdAt: new Date(), droppedCount: 0 } })));
    expect(screen.getByRole("img", { name: copy.deeper.failedTag })).toBeTruthy();
    expect(screen.getByText(copy.deeper.failedBody)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again. Uses 1 credit." }).textContent).toContain(copy.deeper.retry);
  });

  it("a run that hit the per-run cap says how many are still over", async () => {
    await mount(deps(withResult(MAX_CUTS_PER_RUN, MAX_CUTS_PER_RUN, { over: 47, total: 147 })));
    expect(screen.getByTestId("cuts-more").textContent).toBe(copy.deeper.resultMore(47 - MAX_CUTS_PER_RUN));
  });

  it("cards the player kept still count as named, so they are not 'more'", async () => {
    const p = withResult(MAX_CUTS_PER_RUN, MAX_CUTS_PER_RUN, { over: MAX_CUTS_PER_RUN, total: 100 + MAX_CUTS_PER_RUN });
    p.items = p.items.map((it, i) => (i < 5 ? { ...it, verdict: "dismissed" as const } : it));
    await mount(deps(p));
    expect(screen.queryByTestId("cuts-more")).toBeNull();
  });

  it("a run under the cap says nothing about more", async () => {
    await mount(deps(withResult(6, 6)));
    expect(screen.queryByTestId("cuts-more")).toBeNull();
  });

  it("offers to name the per-run cap for a deck far over, not the whole overage", async () => {
    await mount(deps(panelOf({ over: 47, total: 147, asked: MAX_CUTS_PER_RUN })));
    expect(screen.getByText(copy.deeper.offerTitle(MAX_CUTS_PER_RUN))).toBeTruthy();
  });

  it("C8: the last cut finishes the tool in place", async () => {
    const p = withResult(1, 1, { over: 0, total: 99 });
    p.items = [item(1, { verdict: "accepted" })];
    await mount(deps(p));
    expect(screen.getByText(copy.done.head(99, 1))).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Look deeper/ })).toBeNull();
  });

  it("a first read that throws draws the count-failed state, not a vanished panel or a counting frame", async () => {
    const d = deps(null, { read: vi.fn(async () => { throw new Error("down"); }) });
    render(<CutsPanelView deckId="d1" deps={d} />);
    expect(await screen.findByText(copy.failed.heading)).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.failed.tag })).toBeTruthy();
  });

  it("a partner deck's lead names its own body", async () => {
    await mount(deps(panelOf({ bodySize: 98, over: 5, total: 103 })));
    expect(screen.getByText("Five over the ninety-eight.")).toBeTruthy();
  });

  it("reads again when the page's revision moves, so a result for a list that has gone retires", async () => {
    const d = deps(withResult(2, 2));
    const { rerender } = render(<CutsPanelView deckId="d1" deps={d} revision="a" />);
    await screen.findByRole("heading", { name: copy.heading });
    expect(d.read).toHaveBeenCalledTimes(1);
    rerender(<CutsPanelView deckId="d1" deps={d} revision="b" />);
    await waitFor(() => expect(d.read).toHaveBeenCalledTimes(2));
    rerender(<CutsPanelView deckId="d1" deps={d} revision="b" />);
    expect(d.read).toHaveBeenCalledTimes(2);
  });

  it("a refusal keeps its reason after the reread retires the result that drew it", async () => {
    const stale = panelOf();
    const read = vi.fn().mockResolvedValueOnce(withResult(1, 1)).mockResolvedValue(stale);
    const d = deps(null, { read, cut: vi.fn(async () => ({ ok: false as const, message: copy.refusals.stale })) });
    await mount(d);
    fireEvent.click(screen.getByRole("button", { name: copy.cut }));
    await waitFor(() => expect(screen.queryByRole("article")).toBeNull());
    expect(screen.getByText(copy.refusals.stale)).toBeTruthy();
  });

  it("Stop on a run whose pending row does not exist yet keeps cancelling until the request answers", async () => {
    let answer: (r: { ok: true }) => void = () => {};
    const run = vi.fn(() => new Promise<{ ok: true }>((r) => { answer = r; }));
    const cancelled = { id: "x", status: "cancelled" as const, errorClass: null, createdAt: new Date(), droppedCount: 0 };
    let reads = 0;
    const read = vi.fn(async () => {
      reads += 1;
      // The row appears only on the ninth read, long after five misses.
      return reads < 9 ? panelOf() : panelOf({ run: { ...cancelled, id: lastRun } });
    });
    let lastRun = "";
    const d = deps(null, { read, run: vi.fn((id: string, o?: { runId?: string }) => { lastRun = o?.runId ?? ""; return run(); }), cancel: vi.fn(async () => ({ ok: true as const })) });
    await mount(d);
    fireEvent.click(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." }));
    await waitFor(() => expect(d.run).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: copy.deeper.stop }));
    await waitFor(() => expect((d.cancel as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(5), { timeout: 8000 });
    answer({ ok: true });
  }, 15000);

  it("Stop cannot be entered twice while it is still cancelling", async () => {
    const pending = panelOf({ run: { id: "r9", status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    const cancel = vi.fn(async () => { await gate; return { ok: true as const }; });
    const read = vi.fn().mockResolvedValue(pending);
    const d = deps(null, { read, cancel });
    await mount(d);
    const stop = screen.getByRole("button", { name: copy.deeper.stop }) as HTMLButtonElement;
    fireEvent.click(stop);
    await waitFor(() => expect(stop.disabled).toBe(true));
    fireEvent.click(stop);
    expect(cancel).toHaveBeenCalledTimes(1);
    release();
  });

  it("a read that fails after a good one draws the count-failed state, not the old panel", async () => {
    const read = vi.fn().mockResolvedValueOnce(panelOf()).mockRejectedValue(new Error("down"));
    const d = deps(null, { read });
    const { rerender } = render(<CutsPanelView deckId="d1" deps={d} revision="a" />);
    await screen.findByRole("button", { name: "Look deeper. Uses 1 credit." });
    rerender(<CutsPanelView deckId="d1" deps={d} revision="b" />);
    expect(await screen.findByText(copy.failed.heading)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Look deeper. Uses 1 credit." })).toBeNull();
  });

  it("a refused cut reads again, so a stale result does not stay stuck", async () => {
    const d = deps(withResult(1, 1), { cut: vi.fn(async () => ({ ok: false as const, message: copy.refusals.stale })) });
    await mount(d);
    fireEvent.click(screen.getByRole("button", { name: copy.cut }));
    expect(await screen.findByText(copy.refusals.stale)).toBeTruthy();
    await waitFor(() => expect(d.read).toHaveBeenCalledTimes(2));
  });

  it("draws nothing for a deck that is not over", async () => {
    const { container } = render(<CutsPanelView deckId="d1" deps={deps(panelOf({ over: 0, total: 99 }))} />);
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
