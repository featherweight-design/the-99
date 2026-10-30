import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readTuningHistory, readTuningHub } from "../../app/decks/tuning-hub-actions";
import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import { useOpenHistory, useOpenRun, useReviewRun } from "./review-run";
import { TuningHub, type HubToolSpec } from "./tuning-hub";

vi.mock("../../app/decks/tuning-hub-actions", () => ({ readTuningHub: vi.fn(), readTuningHistory: vi.fn(), readTuningPastRun: vi.fn() }));
vi.mock("../../lib/ui/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/ui/reveal")>()),
  reveal: vi.fn(),
}));
const read = vi.mocked(readTuningHub);
const tile = suggestedChangesV2Copy.tile;

const realScrollIntoView = Element.prototype.scrollIntoView;
afterEach(() => {
  Element.prototype.scrollIntoView = realScrollIntoView;
});
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  read.mockReset();
  read.mockResolvedValue({ suggested_changes: null, proposed_cuts: null });
});

const tileOf = (tool: string) => document.querySelector(`[data-tool-tile="${tool}"]`) as HTMLElement;
const suggested = (v2: { at: number; over: number; onTopOff?: () => void } | null): HubToolSpec => ({
  tool: "suggested", panel: <h2 id="tuning-heading">Suggested changes</h2>, v2,
});
const cuts = (over: number): HubToolSpec => ({ tool: "cuts", panel: <h2 id="cuts-heading">Proposed cuts</h2>, over, total: 100 + over });

describe("TuningHub, Suggested changes v2's tile", () => {
  it("at 99: live, with v2's purpose line and v2's cost (2 credits over 10 changes)", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested({ at: 99, over: 0 }), cuts(0)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(tileOf("suggested").tagName).toBe("BUTTON");
    expect(tileOf("suggested").textContent).toContain(tile.purpose);
    expect(tileOf("suggested").textContent).toContain(tuningHubCopy.tools.suggested.costV2);
    expect(tileOf("suggested").textContent).not.toContain(tuningHubCopy.tools.suggested.cost);
  });

  it("v2 off: the shipped purpose line and the shipped cost, never v2's", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(null), cuts(0)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(tileOf("suggested").textContent).toContain(tuningHubCopy.tools.suggested.purpose);
    expect(tileOf("suggested").textContent).toContain(tuningHubCopy.tools.suggested.cost);
    expect(tileOf("suggested").textContent).not.toContain(tuningHubCopy.tools.suggested.costV2);
  });

  it("under 99: inert, says the count, and its one link goes to Top off on Your deck", async () => {
    const onTopOff = vi.fn();
    render(<TuningHub deckId="d" drawn tools={[suggested({ at: 96, over: -3, onTopOff }), cuts(-3)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    const t = tileOf("suggested");
    expect(t.tagName).toBe("DIV");
    expect(t.hasAttribute("data-inert")).toBe(true);
    expect(t.textContent).toContain(tile.under(96));
    expect(t.textContent).not.toContain(tuningHubCopy.tools.suggested.cost);
    expect(t.textContent).not.toContain(tuningHubCopy.tools.suggested.costV2);
    fireEvent.click(screen.getByRole("button", { name: tile.topOff }));
    expect(onTopOff).toHaveBeenCalledTimes(1);
    // The tool never opened.
    expect(document.querySelector("[data-tuning-tool]")).toBeNull();
  });

  it("over 99: inert, says how far over, and its link opens Proposed cuts in place", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested({ at: 102, over: 3 }), cuts(3)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(tileOf("suggested").hasAttribute("data-inert")).toBe(true);
    expect(tileOf("suggested").textContent).toContain(tile.over(3));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: tile.proposedCuts })); });
    expect(document.querySelector('[data-tuning-tool="cuts"]')).not.toBeNull();
  });

  it("over 99 with Proposed cuts off: inert with no link", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested({ at: 102, over: 3 }), { tool: "mana", panel: <p>mana</p> }]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(tileOf("suggested").textContent).toContain(tile.over(3));
    expect(screen.queryByRole("button", { name: tile.proposedCuts })).toBeNull();
  });

  it("lets the open tool open History", async () => {
    vi.mocked(readTuningHistory).mockResolvedValue({ rows: [], nextCursor: null });
    function Panel() {
      const toHistory = useOpenHistory();
      return (
        <div>
          <h2 id="tuning-heading">Suggested changes</h2>
          <button type="button" onClick={() => toHistory?.()}>to history</button>
        </div>
      );
    }
    render(<TuningHub deckId="d" drawn tools={[{ tool: "suggested", panel: <Panel />, v2: { at: 99, over: 0 } }, { tool: "history" }]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => { fireEvent.click(tileOf("suggested")); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "to history" })); });
    expect(document.querySelector('[data-tuning-tool="history"]')).not.toBeNull();
  });

  it("lets the open tool reopen one of its own runs, which draws its own way back (History B): no note over it", async () => {
    vi.mocked(readTuningHistory).mockResolvedValue({ rows: [], nextCursor: null });
    function Panel() {
      const openRun = useOpenRun();
      const review = useReviewRun("suggested");
      return (
        <div>
          <h2 id="tuning-heading">Suggested changes</h2>
          <p data-testid="reviewing">{review?.runId ?? "live"}</p>
          <p data-testid="past">{review?.past ? `${review.past.at} ${review.past.tier}` : "none"}</p>
          <button type="button" onClick={() => openRun?.("suggested", "run-1", "2026-10-26T18:22:00Z")}>open it</button>
          <button type="button" onClick={() => openRun?.("suggested", "run-2", "2026-10-27T09:15:00Z", "refunded")}>open refunded</button>
          <button type="button" onClick={() => review?.past?.back()}>back</button>
        </div>
      );
    }
    render(<TuningHub deckId="d" drawn tools={[{ tool: "suggested", panel: <Panel />, v2: { at: 99, over: 0 } }, cuts(0), { tool: "history" }]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => { fireEvent.click(tileOf("suggested")); });
    expect(screen.getByTestId("reviewing").textContent).toBe("live");
    expect(screen.getByTestId("past").textContent).toBe("none");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "open it" })); });
    expect(screen.getByTestId("reviewing").textContent).toBe("run-1");
    expect(screen.getByTestId("past").textContent).toBe("2026-10-26T18:22:00Z credit");
    // The run draws its own `‹ History`, so the hub draws no note over it, and the phone keeps `‹ Tuning`.
    expect(document.querySelector('[data-review-note="run:run-1"]')).toBeNull();
    expect(document.querySelector("[data-history-back]")).toBeNull();
    // A refunded run's tier rides through to its head.
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "open refunded" })); });
    expect(screen.getByTestId("past").textContent).toBe("2026-10-27T09:15:00Z refunded");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "back" })); });
    expect(document.querySelector('[data-tuning-tool="history"]')).not.toBeNull();
  });

  it("a v2 row History reopens hands the tool its date and tier; a v10 row keeps the hub's note", async () => {
    const v2Row = {
      id: "run:00000000-0000-4000-8000-000000000001", tool: "suggested" as const, tier: "refunded" as const, outcome: "short" as const,
      at: "2026-10-27T09:15:00Z", summary: { kind: "suggestedV2" as const, found: { add: 8, cut: 15 }, applied: { add: 0, cut: 0 }, capCents: null },
      ask: { request: null, count: 10, phase: "cuts" as const },
    };
    const v1Row = {
      id: "run:00000000-0000-4000-8000-000000000002", tool: "suggested" as const, tier: "credit" as const, outcome: "ok" as const,
      at: "2026-09-30T09:15:00Z", summary: { kind: "suggestedOk" as const, in: 5, out: 5, added: 2, cut: 2, rejected: 4 },
    };
    vi.mocked(readTuningHistory).mockResolvedValue({ rows: [v2Row, v1Row], nextCursor: null });
    function Panel() {
      const review = useReviewRun("suggested");
      return (
        <div>
          <h2 id="tuning-heading">Suggested changes</h2>
          <p data-testid="past">{review?.past ? `${review.past.at} ${review.past.tier}` : "none"}</p>
        </div>
      );
    }
    render(<TuningHub deckId="d" drawn tools={[{ tool: "suggested", panel: <Panel />, v2: { at: 99, over: 0 } }, { tool: "history" }]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => { fireEvent.click(tileOf("history")); });
    await waitFor(() => expect(document.querySelector(`[data-history-row="${v2Row.id}"]`)).not.toBeNull());
    await act(async () => { fireEvent.click(document.querySelector(`[data-history-row="${v2Row.id}"]`)!); });
    expect(screen.getByTestId("past").textContent).toBe("2026-10-27T09:15:00Z refunded");
    expect(document.querySelector("[data-review-note]")).toBeNull();
    // Back to History by the tool's own way, then the v10 row: the shipped note, no `past`.
    await act(async () => { fireEvent.click(document.querySelector('[role="tab"][id="tuning-tab-history"]')!); });
    await waitFor(() => expect(document.querySelector(`[data-history-row="${v1Row.id}"]`)).not.toBeNull());
    await act(async () => { fireEvent.click(document.querySelector(`[data-history-row="${v1Row.id}"]`)!); });
    expect(screen.getByTestId("past").textContent).toBe("none");
    expect(document.querySelector(`[data-review-note="${v1Row.id}"]`)).not.toBeNull();
  });

  it("a run in flight (Wait A, the landing): accent edge, dot and the list it is on with its clock; no cost; History says it", async () => {
    const started = new Date(Date.now() - 41_000).toISOString();
    read.mockResolvedValue({ suggested_changes: { kind: "running", startedAt: started, phase: "cuts" }, proposed_cuts: null, history: { runs: 7, running: 1 } });
    render(<TuningHub deckId="d" drawn tools={[suggested({ at: 99, over: 0 }), cuts(0), { tool: "history" }]} />);
    await waitFor(() => expect(tileOf("suggested").hasAttribute("data-running")).toBe(true));
    const t = tileOf("suggested");
    expect(t.className).toContain("border-[var(--accent)]");
    // Wait A's `.wd`: 7px, in a 25% ring.
    const dot = t.querySelector("[data-tile-dot]") as HTMLElement;
    expect(dot.className).toContain("h-[7px] w-[7px]");
    expect(dot.style.boxShadow).toContain("25%");
    expect(t.textContent).toMatch(new RegExp(`${suggestedChangesV2Copy.history.choosingCuts} · 0:4\\d`));
    expect(t.textContent).not.toContain(tuningHubCopy.tools.suggested.cost);
    expect(tileOf("history").textContent).toContain(tuningHubCopy.tools.history.runs(7, 1));
  });

  it("a run in flight still on its additions reads the deck, in the shipped words", async () => {
    read.mockResolvedValue({ suggested_changes: { kind: "running", startedAt: new Date().toISOString(), phase: "additions" }, proposed_cuts: null });
    render(<TuningHub deckId="d" drawn tools={[suggested({ at: 99, over: 0 }), cuts(0)]} />);
    await waitFor(() => expect(tileOf("suggested").hasAttribute("data-running")).toBe(true));
    expect(tileOf("suggested").textContent).toContain(tuningHubCopy.runningWords.suggested);
    expect(tileOf("suggested").textContent).not.toContain(suggestedChangesV2Copy.history.choosingCuts);
  });

  it("v2 off: a run in flight keeps the shipped tile, cost and all", async () => {
    read.mockResolvedValue({ suggested_changes: { kind: "running", startedAt: new Date().toISOString() }, proposed_cuts: null });
    render(<TuningHub deckId="d" drawn tools={[suggested(null), cuts(0)]} />);
    await waitFor(() => expect(tileOf("suggested").hasAttribute("data-running")).toBe(true));
    expect(tileOf("suggested").textContent).toContain(tuningHubCopy.tools.suggested.cost);
  });
});
