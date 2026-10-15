import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deckCutsCopy } from "../../lib/copy/deck-cuts";
import { noteDeckRoute, resetDeckVisitForTests, visitBaseline } from "../../lib/decks/visit";
import { MAX_CUTS_PER_RUN } from "../../lib/tuning/cuts-ask";
import type { CutItem, CutsPanel } from "../../lib/tuning/cuts-state";
import { CutsPanelView, type CutsDeps } from "./cuts-panel";
import { ReviewRunProvider } from "./review-run";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";

const detail = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: detail.open }), useCardIntent: () => ({}) }));
vi.mock("../../app/decks/cuts-actions", () => ({
  cutProposed: vi.fn(), keepProposedCut: vi.fn(), readCutsPanel: vi.fn(),
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
  lastOkAt: new Date("2026-10-01T12:00:00Z"),
  run: { id: "r1", status: "ok", errorClass: null, createdAt: new Date(), droppedCount: 0 }, ...extra,
});

function deps(read: CutsPanel | null, over: Partial<CutsDeps> = {}): CutsDeps {
  return {
    read: vi.fn(async () => read), run: vi.fn(async () => ({ ok: true as const })),
    cut: vi.fn(async () => ({ ok: true as const })), undo: vi.fn(async () => ({ ok: true as const })),
    keep: vi.fn(async () => ({ ok: true as const })), restore: vi.fn(async () => ({ ok: true as const })), ...over,
  };
}
const mount = async (d: CutsDeps) => { render(<CutsPanelView deckId="d1" deps={d} />); await screen.findByRole("heading", { name: copy.heading }); };

// Every test below but the visit's own models a result produced DURING this visit to the deck:
// the visit began, and its baseline was recorded, before anything was stored (`lib/decks/visit`).
// The "a visit to the deck" block resets without this, to model a result from a previous visit.
beforeEach(() => {
  resetDeckVisitForTests();
  visitBaseline("d1", "cuts", { okKey: null, runId: null });
});

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

  it("reads again while the run it started is pending, and draws the cuts once it settles", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let seenRun = "";
      const run = vi.fn(async (_id: string, o?: { runId?: string }) => { seenRun = o?.runId ?? ""; return { ok: true as const }; });
      const pendingOf = () => panelOf({ run: { id: seenRun, status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
      const reads = [() => panelOf(), () => pendingOf(), () => pendingOf(), () => withResult(3, 6, { run: { id: seenRun, status: "ok", errorClass: null, createdAt: new Date(), droppedCount: 0 } })];
      let n = 0;
      const d = deps(null, { run, read: vi.fn(async () => reads[Math.min(n++, reads.length - 1)]()) });
      await mount(d);
      fireEvent.click(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." }));
      await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
      expect(await screen.findByText("Card 1")).toBeTruthy();
      expect((d.read as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops reading once the panel is left, while the run it started is still pending", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let seenRun = "";
      const run = vi.fn(async (_id: string, o?: { runId?: string }) => { seenRun = o?.runId ?? ""; return { ok: true as const }; });
      const pendingOf = () => panelOf({ run: { id: seenRun, status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
      let n = 0;
      const d = deps(null, { run, read: vi.fn(async () => (n++ === 0 ? panelOf() : pendingOf())) });
      const view = render(<CutsPanelView deckId="d1" deps={d} />);
      await screen.findByRole("heading", { name: copy.heading });
      fireEvent.click(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." }));
      await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
      view.unmount();
      const before = (d.read as ReturnType<typeof vi.fn>).mock.calls.length;
      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
      expect((d.read as ReturnType<typeof vi.fn>).mock.calls.length).toBe(before);
    } finally {
      vi.useRealTimers();
    }
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

  it("C2: a pending run shows the running band, with no Stop", async () => {
    const pending = panelOf({ run: { id: "r9", status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
    await mount(deps(null, { read: vi.fn().mockResolvedValue(pending) }));
    expect(screen.getByText(copy.deeper.pending)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /stop/i })).toBeNull();
  });

  it("an old cancelled run draws as it always did: no failure, and the offer back", async () => {
    const cancelled = panelOf({ run: { id: "r9", status: "cancelled", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
    await mount(deps(null, { read: vi.fn().mockResolvedValue(cancelled) }));
    expect(screen.queryByText(copy.deeper.failedHeading)).toBeNull();
    expect(screen.queryByText(copy.deeper.pending)).toBeNull();
    expect(screen.getByRole("button", { name: "Look deeper. Uses 1 credit." })).toBeTruthy();
  });

  it("keeps the last run's cuts standing under an old cancelled re-run", async () => {
    await mount(deps(withResult(3, 6, { run: { id: "r2", status: "cancelled", errorClass: null, createdAt: new Date(), droppedCount: 0 } })));
    expect(screen.queryByText(copy.deeper.failedHeading)).toBeNull();
    expect(screen.getByText("Card 1")).toBeTruthy();
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
    await waitFor(() => expect(d.cut).toHaveBeenCalledWith("i1", false));
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
    await waitFor(() => expect(d.undo).toHaveBeenCalledWith("i1", false));
    fireEvent.click(screen.getByRole("button", { name: copy.showAgain }));
    await waitFor(() => expect(d.restore).toHaveBeenCalledWith("i2"));
    expect(screen.getByText(copy.facts.dividerPart)).toBeTruthy();
  });

  it("an answered row's name opens card details, as a pending row's does", async () => {
    const p = withResult(2, 2);
    p.items = [item(1, { verdict: "accepted" }), item(2, { verdict: "dismissed" })];
    await mount(deps(p));
    for (const answered of ["answered-cut", "answered-kept"]) {
      const row = screen.getByTestId(answered);
      fireEvent.click(within(row).getByRole("button", { name: /Card [12]/ }));
    }
    expect(detail.open).toHaveBeenCalledTimes(2);
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
    const p = withResult(1, 1, { over: 0, total: 100 });
    p.items = [item(1, { verdict: "accepted", inDeck: false, quantityBefore: 1, quantityNow: 0 })];
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

  // Hugh, 2026-10-14: in the hub the tool is mounted only while open under its tab row, so at the line
  // it finishes in place (C8) even once the result has stopped being current (the first analysis
  // writes the overview's Key cards into the fingerprint), never an empty panel under the tabs.
  it("in the hub, finishes in place at the line over a result that is no longer current", async () => {
    const atTheLine = withResult(1, 1, { over: 0, total: 100, resultCurrent: false });
    atTheLine.items = [item(1, { verdict: "accepted", inDeck: false, quantityBefore: 1, quantityNow: 0 })];
    render(<CutsPanelView deckId="d1" deps={deps(atTheLine)} finishInPlace />);
    expect(await screen.findByText("Back to 99 / 99. You cut 1.")).toBeTruthy();
    expect(screen.getByText(copy.done.body)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Look deeper/ })).toBeNull();
  });

  it("in the hub, finishes in place at the line with no result at all, and counts no cuts", async () => {
    render(<CutsPanelView deckId="d1" deps={deps(panelOf({ over: 0, total: 100 }))} finishInPlace />);
    const done = await screen.findByTestId("cuts-done");
    expect(done.children[0].textContent).toBe("Back to 99 / 99.");
    expect(done.children[1].textContent).toBe(copy.done.body);
  });

  it("in the hub, a deck that reached the line by another edit says the neutral form", async () => {
    // One row never answered, and one cut whose card was put back by hand: the tool cut nothing that stands.
    const p = withResult(2, 2, { over: 0, total: 100, resultCurrent: false });
    p.items = [item(1), item(2, { verdict: "accepted", inDeck: true, quantityBefore: 1, quantityNow: 1 })];
    render(<CutsPanelView deckId="d1" deps={deps(p)} finishInPlace />);
    expect((await screen.findByTestId("cuts-done")).children[0].textContent).toBe("Back to 99 / 99.");
  });

  // Copilot, PR #1809 round 2: `over` is clamped at zero, so a deck trimmed below its size elsewhere
  // while the tool is open reads like one at the line. It must not claim `Back to 99 / 99.`
  it("in the hub, a deck trimmed below its size says only that the tool closes, never the line", async () => {
    const p = withResult(1, 1, { over: 0, total: 99, resultCurrent: false });
    p.items = [item(1, { verdict: "accepted", inDeck: false, quantityBefore: 1, quantityNow: 0 })];
    render(<CutsPanelView deckId="d1" deps={deps(p)} finishInPlace />);
    const done = await screen.findByTestId("cuts-done");
    expect(done.textContent).toBe(copy.done.body);
    expect(done.textContent).not.toMatch(/Back to/);
  });

  // A Cut removes ONE copy (`cutItem`), so a card held twice is still in the deck after its cut.
  it("counts a cut of one copy of a card the deck still holds", async () => {
    const p = withResult(1, 1, { over: 0, total: 100, resultCurrent: false });
    p.items = [item(1, { cutName: "Forest", verdict: "accepted", inDeck: true, quantityBefore: 2, quantityNow: 1 })];
    render(<CutsPanelView deckId="d1" deps={deps(p)} finishInPlace />);
    expect((await screen.findByTestId("cuts-done")).children[0].textContent).toBe("Back to 99 / 99. You cut 1.");
  });

  it("does not count a multi-copy cut whose copy was put back by hand", async () => {
    const p = withResult(1, 1, { over: 0, total: 100, resultCurrent: false });
    p.items = [item(1, { cutName: "Forest", verdict: "accepted", inDeck: true, quantityBefore: 2, quantityNow: 2 })];
    render(<CutsPanelView deckId="d1" deps={deps(p)} finishInPlace />);
    expect((await screen.findByTestId("cuts-done")).children[0].textContent).toBe("Back to 99 / 99.");
  });

  it("C8 is the drawn box: surface, a success border, radius 10, head and body on their own lines", async () => {
    const p = withResult(1, 1, { over: 0, total: 100 });
    p.items = [item(1, { verdict: "accepted", inDeck: false, quantityBefore: 1, quantityNow: 0 })];
    render(<CutsPanelView deckId="d1" deps={deps(p)} finishInPlace />);
    const done = await screen.findByTestId("cuts-done");
    expect(done.style.background).toBe("var(--surface)");
    expect(done.style.border).toBe("1px solid var(--success)");
    expect(done.className).toContain("rounded-[10px]");
    expect(done.className).toContain("px-[14px]");
    expect(done.className).toContain("py-[12px]");
    expect(done.className).toContain("gap-[4px]");
    const [head, body] = [...done.children] as HTMLElement[];
    expect(head.className).toContain("text-[13.5px]");
    expect(head.className).toContain("font-semibold");
    expect(head.style.color).toBe("var(--fg)");
    expect(body.className).toContain("text-[12.5px]");
    expect(body.className).toContain("leading-[1.55]");
    expect(body.style.color).toBe("var(--fg-body)");
  });

  it("draws nothing for a deck that is not over", async () => {
    const { container } = render(<CutsPanelView deckId="d1" deps={deps(panelOf({ over: 0, total: 100 }))} />);
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});

// The deck visit (`lib/decks/visit`, Hugh 2026-10-11): a result stays for the visit, and the next
// visit opens on the offer. Each test resets the visit WITHOUT the file's seed, so the first read
// records whatever is stored as a prior visit's.
describe("CutsPanelView: a visit to the deck", () => {
  const D1 = "11111111-1111-4111-8111-111111111111";
  const later = new Date("2026-10-11T12:00:00Z");
  const newResult = withResult(6, 6, { lastOkAt: later, run: { id: "r2", status: "ok", errorClass: null, createdAt: later, droppedCount: 0 } });
  const mountOn = async (d: CutsDeps, freshEachVisit = true) => { render(<CutsPanelView deckId={D1} deps={d} freshEachVisit={freshEachVisit} />); await screen.findByRole("heading", { name: copy.heading }); };
  const offer = "Look deeper. Uses 1 credit.";
  beforeEach(() => {
    resetDeckVisitForTests();
    noteDeckRoute(`/decks/${D1}`);
  });

  it("opens on the offer over a result stored by a previous visit, even one still current", async () => {
    await mountOn(deps(withResult(6, 6)));
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByRole("button", { name: offer })).toBeTruthy();
  });

  it("at the line, a previous visit's cuts are not counted as this tool's", async () => {
    const p = withResult(1, 1, { over: 0, total: 100 });
    p.items = [item(1, { verdict: "accepted", inDeck: false, quantityBefore: 1, quantityNow: 0 })];
    render(<CutsPanelView deckId={D1} deps={deps(p)} freshEachVisit finishInPlace />);
    expect((await screen.findByTestId("cuts-done")).children[0].textContent).toBe("Back to 99 / 99.");
  });

  it("on its own, outside the hub (no History to reach it from), still shows the stored result", async () => {
    await mountOn(deps(withResult(6, 6)), false);
    expect(screen.queryAllByRole("article")).toHaveLength(6);
  });

  it("hides a previous visit's failed run", async () => {
    await mountOn(deps(panelOf({ run: { id: "r1", status: "failed", errorClass: "timeout", createdAt: new Date(), droppedCount: 0 } })));
    expect(screen.queryByText(copy.deeper.failedHeading)).toBeNull();
    expect(screen.getByRole("button", { name: offer })).toBeTruthy();
  });

  it("Look deeper over a hidden current result runs anew and shows the new one", async () => {
    let finish: (r: { ok: true }) => void = () => {};
    const run = vi.fn(() => new Promise<{ ok: true }>((r) => { finish = r; }));
    const read = vi.fn().mockResolvedValueOnce(withResult(6, 6)).mockResolvedValue(newResult);
    await mountOn(deps(null, { read, run }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: offer })); });
    expect(run).toHaveBeenCalledWith(D1, { runId: expect.any(String) });
    expect(screen.getByText(copy.deeper.pending)).toBeTruthy();
    await act(async () => { finish({ ok: true }); });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(6));
  });

  it("a run already going when the visit began shows as running, and its result when it finishes", async () => {
    vi.useFakeTimers();
    try {
      const pending = withResult(6, 6, { run: { id: "r2", status: "pending", errorClass: null, createdAt: new Date(), droppedCount: 0 } });
      const read = vi.fn().mockResolvedValueOnce(pending).mockResolvedValue(newResult);
      render(<CutsPanelView deckId={D1} deps={deps(null, { read })} freshEachVisit />);
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(screen.getByText(copy.deeper.pending)).toBeTruthy();
      expect(screen.queryAllByRole("article")).toHaveLength(0);
      // The watch re-reads every 3s until the run settles.
      await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
      expect(screen.getAllByRole("article")).toHaveLength(6);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a result from this visit survives a remount within it, and a new visit opens on the offer", async () => {
    const read = vi.fn().mockResolvedValueOnce(panelOf()).mockResolvedValue(newResult);
    await mountOn(deps(null, { read }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: offer })); });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(6));
    cleanup();
    noteDeckRoute(`/decks/${D1}`);
    await mountOn(deps(newResult));
    expect(screen.getAllByRole("article")).toHaveLength(6);
    cleanup();
    noteDeckRoute("/decks");
    noteDeckRoute(`/decks/${D1}`);
    await mountOn(deps(newResult));
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByRole("button", { name: offer })).toBeTruthy();
  });
});

describe("a past run History reopened (re-review)", () => {
  const RUN = "33333333-3333-4333-8333-333333333333";
  const D1 = "11111111-1111-4111-8111-111111111111";
  const reviewed = (extra: Partial<CutsPanel> = {}) => withResult(3, 3, {
    // The deck has moved since: the ordinary gate would hide this result.
    resultCurrent: false,
    review: { runId: RUN, at: new Date("2026-10-01T12:00:00Z") },
    items: [item(1), item(2, { inDeck: false }), item(3, { locked: true })],
    ...extra,
  });
  const mountReview = async (d: CutsDeps, leave = vi.fn()) => {
    render(
      <ReviewRunProvider value={{ tool: "cuts", runId: RUN, leave }}>
        <CutsPanelView deckId={D1} deps={d} freshEachVisit />
      </ReviewRunProvider>,
    );
    await screen.findByRole("heading", { name: copy.heading });
    return leave;
  };

  it("reads the named run, and draws its cuts although the list has moved", async () => {
    const d = deps(reviewed());
    await mountReview(d);
    expect(d.read).toHaveBeenCalledWith(D1, RUN);
    expect(screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual(["Card 1"]);
    expect(screen.getByText("Reason 1.")).toBeTruthy();
  });

  it("draws a cut the deck has moved past as no longer applying, with no Cut to press", async () => {
    await mountReview(deps(reviewed()));
    const broken = screen.getAllByTestId("answered-broken");
    expect(broken.map((b) => b.textContent)).toEqual([
      expect.stringContaining(deckTuningCopy.lists.cutGone("Card 2")),
      expect.stringContaining(lockedCardsCopy.tuning.cutLocked("Card 3")),
    ]);
    for (const b of broken) expect(within(b).queryByRole("button")).toBeNull();
  });

  it("asks the server to re-check a Cut and an Undo card by card", async () => {
    const d = deps(reviewed({ items: [item(1), item(4, { verdict: "accepted" })] }));
    await mountReview(d);
    fireEvent.click(within(screen.getByRole("article", { name: "Card 1" })).getByRole("button", { name: copy.cut }));
    await waitFor(() => expect(d.cut).toHaveBeenCalledWith("i1", true));
    fireEvent.click(await screen.findByRole("button", { name: copy.undo }));
    await waitFor(() => expect(d.undo).toHaveBeenCalledWith("i4", true));
  });

  it("an ordinary read never asks for review mode", async () => {
    const d = deps(withResult(1, 1));
    await mount(d);
    expect(d.read).toHaveBeenCalledWith("d1", null);
    fireEvent.click(within(screen.getByRole("article", { name: "Card 1" })).getByRole("button", { name: copy.cut }));
    await waitFor(() => expect(d.cut).toHaveBeenCalledWith("i1", false));
  });

  it("draws the reopened run over a newer run that is pending or failed, with no Stop", async () => {
    const newer = (status: "pending" | "failed") => reviewed({ run: { id: "r9", status, errorClass: status === "failed" ? "upstream_busy" : null, createdAt: new Date(), droppedCount: 0 } });
    await mountReview(deps(newer("pending")));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /stop/i })).toBeNull();
    cleanup();
    await mountReview(deps(newer("failed")));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByText(copy.deeper.failedHeading)).toBeNull();
  });

  it("records no visit baseline from the reopened run: the next ordinary read does", async () => {
    resetDeckVisitForTests();
    noteDeckRoute(`/decks/${D1}`);
    await mountReview(deps(reviewed()));
    expect(visitBaseline(D1, "cuts", { okKey: "ordinary", runId: null }).okKey).toBe("ordinary");
  });

  it("still shows a reopened run on a deck now at 100", async () => {
    await mountReview(deps(reviewed({ over: 0, total: 100 })));
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});

describe("an answer flips its row at once (optimistic)", () => {
  it("draws a pressed Cut as cut before the action answers, and Keep as kept", async () => {
    let answer!: (r: { ok: true }) => void;
    const d = deps(withResult(2, 2), { cut: vi.fn(() => new Promise<{ ok: true }>((r) => { answer = r; })) });
    await mount(d);
    fireEvent.click(within(screen.getAllByRole("article")[0]).getByRole("button", { name: copy.cut }));
    // The action has not answered: the row is already drawn as cut.
    expect(screen.getByTestId("answered-cut").textContent).toContain("Card 1");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await act(async () => { answer({ ok: true }); });
  });

  it("moves the panel's lead with the flip, before the action answers", async () => {
    let answer!: (r: { ok: true }) => void;
    const d = deps(withResult(2, 2), { cut: vi.fn(() => new Promise<{ ok: true }>((r) => { answer = r; })) });
    await mount(d);
    fireEvent.click(within(screen.getAllByRole("article")[0]).getByRole("button", { name: copy.cut }));
    await waitFor(() => expect(screen.getByText(copy.leadPart(1, 0, 2, 1), { exact: false })).toBeTruthy());
    await act(async () => { answer({ ok: true }); });
  });

  it("keeps a row cut when its re-read is superseded by another row's answer", async () => {
    const stale = withResult(2, 2);
    const d = deps(stale);
    await mount(d);
    // From here every read waits, so the test decides which lands when.
    const reads: Array<(p: CutsPanel) => void> = [];
    vi.mocked(d.read).mockImplementation(() => new Promise<CutsPanel | null>((r) => { reads.push(r); }));
    const [first, second] = screen.getAllByRole("article");
    await act(async () => { fireEvent.click(within(first).getByRole("button", { name: copy.cut })); });
    await waitFor(() => expect(reads).toHaveLength(1));
    await act(async () => { fireEvent.click(within(second).getByRole("button", { name: copy.cut })); });
    await waitFor(() => expect(reads).toHaveLength(2));
    // The first row's read lands, out of date and discarded: the first row must still read as cut.
    await act(async () => { reads[0](stale); });
    expect(screen.getAllByTestId("answered-cut")).toHaveLength(2);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("rolls a refused Cut back to its row, with the refusal", async () => {
    let answer!: (r: { ok: false; message: string }) => void;
    const d = deps(withResult(1, 1), { cut: vi.fn(() => new Promise<{ ok: false; message: string }>((r) => { answer = r; })) });
    await mount(d);
    fireEvent.click(within(screen.getByRole("article")).getByRole("button", { name: copy.cut }));
    expect(screen.queryByRole("article")).toBeNull();
    await act(async () => { answer({ ok: false, message: copy.refusals.cutLocked }); });
    await waitFor(() => expect(screen.getByRole("article", { name: "Card 1" })).toBeTruthy());
    expect(screen.getByText(copy.refusals.cutLocked)).toBeTruthy();
  });
});
