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
  it("at 99: live, with v2's purpose line", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested({ at: 99, over: 0 }), cuts(0)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(tileOf("suggested").tagName).toBe("BUTTON");
    expect(tileOf("suggested").textContent).toContain(tile.purpose);
  });

  it("v2 off: the shipped purpose line", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(null), cuts(0)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(tileOf("suggested").textContent).toContain(tuningHubCopy.tools.suggested.purpose);
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

  it("lets the open tool reopen one of its own runs read-only, under the review note", async () => {
    function Panel() {
      const openRun = useOpenRun();
      const review = useReviewRun("suggested");
      return (
        <div>
          <h2 id="tuning-heading">Suggested changes</h2>
          <p data-testid="reviewing">{review?.runId ?? "live"}</p>
          <button type="button" onClick={() => openRun?.("suggested", "run-1", "2026-10-26T18:22:00Z")}>open it</button>
        </div>
      );
    }
    render(<TuningHub deckId="d" drawn tools={[{ tool: "suggested", panel: <Panel />, v2: { at: 99, over: 0 } }, cuts(0)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => { fireEvent.click(tileOf("suggested")); });
    expect(screen.getByTestId("reviewing").textContent).toBe("live");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "open it" })); });
    expect(screen.getByTestId("reviewing").textContent).toBe("run-1");
    expect(document.querySelector('[data-review-note="run:run-1"]')).not.toBeNull();
  });
});
