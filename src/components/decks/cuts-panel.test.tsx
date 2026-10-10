import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deckCutsCopy } from "../../lib/copy/deck-cuts";
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
    expect(screen.getByRole("button", { name: copy.deeper.actionAria })).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: copy.deeper.actionAria }));
    await waitFor(() => expect(d.run).toHaveBeenCalledWith("d1", { runId: expect.stringMatching(/^[0-9a-f-]{36}$/) }));
    await waitFor(() => expect(d.read).toHaveBeenCalledTimes(2));
  });

  it("disables the press, with no segment, when credits are used up", async () => {
    await mount(deps(panelOf({ allowance: { used: 3, limit: 3, reopensAt: null, nextAt: null } })));
    const b = screen.getByRole("button", { name: copy.deeper.actionAriaSpent }) as HTMLButtonElement;
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
    fireEvent.click(within(screen.getAllByRole("article")[1]).getByRole("button", { name: copy.keep }));
    await waitFor(() => expect(d.keep).toHaveBeenCalledWith("i2"));
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
    expect(screen.getByRole("button", { name: copy.deeper.actionAria })).toBeTruthy();
  });

  it("C6: an ungrounded run is a neutral refusal with the offer still there", async () => {
    await mount(deps(panelOf({ run: { id: "r", status: "failed", errorClass: "ungrounded", createdAt: new Date(), droppedCount: 3 } })));
    expect(screen.getByText(copy.deeper.refused)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.deeper.actionAria })).toBeTruthy();
  });

  it("C7: a failure carries the mark, one sentence and Try again with the credit", async () => {
    await mount(deps(panelOf({ run: { id: "r", status: "failed", errorClass: "upstream_busy", createdAt: new Date(), droppedCount: 0 } })));
    expect(screen.getByRole("img", { name: copy.deeper.failedTag })).toBeTruthy();
    expect(screen.getByText(copy.deeper.failedBody)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.deeper.actionAria }).textContent).toContain(copy.deeper.retry);
  });

  it("C8: the last cut finishes the tool in place", async () => {
    const p = withResult(1, 1, { over: 0, total: 99 });
    p.items = [item(1, { verdict: "accepted" })];
    await mount(deps(p));
    expect(screen.getByText(copy.done.head(99, 1))).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Look deeper/ })).toBeNull();
  });

  it("draws nothing for a deck that is not over", async () => {
    const { container } = render(<CutsPanelView deckId="d1" deps={deps(panelOf({ over: 0, total: 99 }))} />);
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
