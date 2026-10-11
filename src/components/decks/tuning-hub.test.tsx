import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readTuningHistory, readTuningHub, readTuningPastRun } from "../../app/decks/tuning-hub-actions";
import { tuningHubCopy as copy } from "../../lib/copy/tuning-hub";
import type { HubTiles } from "../../lib/tuning/hub-tiles";
import { TuningHub, type HubToolSpec } from "./tuning-hub";
import { noteDeckRoute, resetDeckVisitForTests, visitBaseline } from "../../lib/decks/visit";

vi.mock("../../app/decks/tuning-hub-actions", () => ({ readTuningHub: vi.fn(), readTuningHistory: vi.fn(), readTuningPastRun: vi.fn() }));
const read = vi.mocked(readTuningHub);
const readHistoryPage = vi.mocked(readTuningHistory);
const readPast = vi.mocked(readTuningPastRun);

const empty: HubTiles = { suggested_changes: null, proposed_cuts: null };
const suggested = (panel: boolean = true): HubToolSpec => ({ tool: "suggested", panel: panel ? <h2 id="tuning-heading">Suggested changes</h2> : null });
const cuts = (over: number, total = 99 + 1 + over): HubToolSpec => ({ tool: "cuts", panel: <h2 id="cuts-heading">Proposed cuts</h2>, over, total });

function tile(tool: string) {
  return document.querySelector(`[data-tool-tile="${tool}"]`) as HTMLElement;
}

beforeEach(() => {
  read.mockReset();
  read.mockResolvedValue(empty);
});

describe("TuningHub landing", () => {
  it("draws a tile per tool in the fixed order, Proposed cuts offered with the over figure", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    await waitFor(() => expect(read).toHaveBeenCalledWith("d"));
    const tiles = [...document.querySelectorAll("[data-tool-tile]")].map((t) => t.getAttribute("data-tool-tile"));
    expect(tiles).toEqual(["suggested", "cuts"]);
    expect(tile("cuts").tagName).toBe("BUTTON");
    expect(within(tile("cuts")).getAllByText(copy.tools.cuts.over(6)).length).toBeGreaterThan(0);
    expect(tile("cuts").getAttribute("aria-label")).toBe(`${copy.tools.cuts.name}, ${copy.tools.cuts.over(6)}`);
  });

  it("keeps Proposed cuts present and inert at 100: not a button, its reason as the purpose line", () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(0, 100)]} />);
    expect(tile("cuts").tagName).toBe("DIV");
    expect(tile("cuts").hasAttribute("data-inert")).toBe(true);
    expect(tile("cuts").textContent).toContain(copy.tools.cuts.notOffered(100));
    expect(tile("cuts").textContent).not.toContain(copy.tools.cuts.cost);
  });

  it("keeps Proposed cuts inert at 100 even with a run of it still in flight", async () => {
    read.mockResolvedValue({ suggested_changes: null, proposed_cuts: { kind: "running", startedAt: new Date().toISOString() } });
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(0, 100)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => {});
    expect(tile("cuts").tagName).toBe("DIV");
    expect(tile("cuts").hasAttribute("data-inert")).toBe(true);
  });

  it("draws Suggested changes inert, saying why, when the deck has no reading", () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(false), cuts(4)]} />);
    expect(tile("suggested").tagName).toBe("DIV");
    expect(tile("suggested").textContent).toContain(copy.tools.suggested.needsReading);
  });

  it("draws nothing when it is not drawn, and still settles the tab's loader", async () => {
    const settled = vi.fn();
    const { container } = render(<TuningHub deckId="d" drawn={false} tools={[suggested()]} onSettled={settled} />);
    expect(container.innerHTML).toBe("");
    await waitFor(() => expect(settled).toHaveBeenCalled());
  });

  it("settles the loader on a failed read too", async () => {
    read.mockRejectedValueOnce(new Error("down"));
    const settled = vi.fn();
    render(<TuningHub deckId="d" drawn tools={[suggested()]} onSettled={settled} />);
    await waitFor(() => expect(settled).toHaveBeenCalled());
    expect(tile("suggested")).not.toBeNull();
  });

  it("shows the last run and what came of it, the outcome on desktop only", async () => {
    read.mockResolvedValue({ suggested_changes: { kind: "ok", at: "2026-10-03T15:00:00Z", total: 5, accepted: 2 }, proposed_cuts: null });
    render(<TuningHub deckId="d" drawn tools={[suggested()]} />);
    // Desktop carries the outcome, the phone's copy of the line drops it (A1b).
    await waitFor(() => expect(tile("suggested").querySelector(".md\\:inline")?.textContent).toBe(copy.lastRun("Oct 3", copy.outcome.applied(2, 5))));
    expect(tile("suggested").querySelector(".md\\:hidden")?.textContent).toBe(copy.lastRun("Oct 3"));
  });

  it("marks a run in flight on its own tile, with the elapsed time ticking", async () => {
    // A fixed clock, advanced by hand: the elapsed time is read off Date.now, so a real clock
    // under a loaded machine would move it by an unknown amount.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));
      const start = new Date(Date.now() - 14_000).toISOString();
      read.mockResolvedValue({ suggested_changes: { kind: "running", startedAt: start }, proposed_cuts: null });
      render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(tile("suggested").hasAttribute("data-running")).toBe(true);
      expect(tile("suggested").textContent).toContain(copy.running(copy.runningWords.suggested, "0:14"));
      await act(async () => { vi.advanceTimersByTime(3000); await Promise.resolve(); });
      expect(tile("suggested").textContent).toContain(copy.running(copy.runningWords.suggested, "0:17"));
      // Re-read at the tools' cadence while it runs; the other tile is untouched.
      expect(read.mock.calls.length).toBeGreaterThan(1);
      expect(tile("cuts").hasAttribute("data-running")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TuningHub opening a tool", () => {
  it("draws Mana Balance second, free, with its last count's date and never a running or inert state", async () => {
    read.mockResolvedValue({ ...empty, mana: "2026-10-07T12:00:00.000Z" });
    const mana: HubToolSpec = { tool: "mana", panel: <h2 id="mana-heading">Mana Balance</h2> };
    render(<TuningHub deckId="d" drawn tools={[suggested(), mana, cuts(6), { tool: "history" }]} />);
    await waitFor(() => expect(tile("mana").textContent).toContain(copy.lastRun("Oct 7")));
    const tiles = [...document.querySelectorAll("[data-tool-tile]")].map((t) => t.getAttribute("data-tool-tile"));
    expect(tiles).toEqual(["suggested", "mana", "cuts", "history"]);
    expect(tile("mana").tagName).toBe("BUTTON");
    expect(tile("mana").textContent).toContain(copy.tools.mana.cost);
    fireEvent.click(tile("mana"));
    const heading = await screen.findByRole("heading", { name: "Mana Balance" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("draws the Mana Balance tile with no status before its first count", async () => {
    read.mockResolvedValue({ ...empty, mana: null });
    render(<TuningHub deckId="d" drawn tools={[suggested(), { tool: "mana", panel: null }]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => {});
    expect(tile("mana").getAttribute("aria-label")).toBe(copy.tools.mana.name);
  });

  it("opens a tool in place of the tiles, focuses its heading, and All tools returns to the landing", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    fireEvent.click(tile("cuts"));
    expect(document.querySelector("[data-tool-tile]")).toBeNull();
    const heading = await screen.findByRole("heading", { name: "Proposed cuts" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    const tabs = screen.getByRole("tablist");
    expect(within(tabs).getAllByRole("tab").map((t) => t.textContent)).toEqual([copy.allTools, "Suggested changes", "Proposed cuts"]);
    expect(within(tabs).getByRole("tab", { name: "Proposed cuts" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(tabs).getByRole("tab", { name: copy.allTools }));
    expect(tile("cuts")).not.toBeNull();
    // Focus comes back to the tile of the tool just left, not to nothing.
    await waitFor(() => expect(document.activeElement).toBe(tile("cuts")));
  });

  it("focuses a tool's heading that only draws once the tool's own read lands", async () => {
    function LatePanel() {
      const [ready, setReady] = useState(false);
      useEffect(() => { const t = setTimeout(() => setReady(true), 30); return () => clearTimeout(t); }, []);
      // A temporary heading while the read is pending, then the tool's own: focus must land on the
      // second, which replaces the first.
      return ready ? <section><h2 id="cuts-heading">Proposed cuts</h2></section> : <div><h2>Counting</h2></div>;
    }
    render(<TuningHub deckId="d" drawn tools={[suggested(), { tool: "cuts", panel: <LatePanel />, over: 6, total: 106 }]} />);
    fireEvent.click(tile("cuts"));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Proposed cuts" })));
  });

  it("reads again a moment after returning to the tiles, catching a run the tool just started", async () => {
    vi.useFakeTimers();
    try {
      render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
      await act(async () => { await Promise.resolve(); });
      fireEvent.click(tile("suggested"));
      read.mockResolvedValue({ suggested_changes: { kind: "running", startedAt: new Date().toISOString() }, proposed_cuts: null });
      fireEvent.click(screen.getByRole("tab", { name: copy.allTools }));
      const before = read.mock.calls.length;
      await act(async () => { vi.advanceTimersByTime(3000); await Promise.resolve(); await Promise.resolve(); });
      expect(read.mock.calls.length).toBeGreaterThan(before);
      expect(tile("suggested").hasAttribute("data-running")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads again when switching straight from one tool to another", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(tile("suggested"));
    const before = read.mock.calls.length;
    fireEvent.click(screen.getByRole("tab", { name: "Proposed cuts" }));
    await act(async () => { await Promise.resolve(); });
    expect(read.mock.calls.length).toBeGreaterThan(before);
  });

  it("gives the phone a way back and says which tool of how many", () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    fireEvent.click(tile("cuts"));
    expect(screen.getByText(copy.toolOf(2, 2))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.back }));
    expect(tile("suggested")).not.toBeNull();
  });

  it("moves between tools with the arrow keys, focus staying on the tab row", async () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    fireEvent.click(tile("suggested"));
    const tab = screen.getByRole("tab", { name: "Suggested changes" });
    fireEvent.keyDown(tab, { key: "ArrowRight" });
    const next = screen.getByRole("tab", { name: "Proposed cuts" });
    expect(next.getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByRole("heading", { name: "Proposed cuts" })).toBeTruthy();
    await act(async () => {});
    expect(document.activeElement).toBe(next);
  });

  it("answers a shortcut's request once, and a second press again", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const answered = vi.fn();
    const { rerender } = render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} request={{ tool: "cuts", nonce: 1 }} onRequestAnswered={answered} />);
    // Its owner is told, so it can drop the request before the next visit remounts the hub.
    await waitFor(() => expect(answered).toHaveBeenCalledWith(1));
    expect(screen.getByRole("heading", { name: "Proposed cuts" })).toBeTruthy();
    // The Tuning heading is brought to the top.
    expect(scroll).toHaveBeenCalledWith({ block: "start" });
    expect(scroll.mock.contexts[0]).toBe(document.querySelector("[data-tuning-hub]"));
    fireEvent.click(screen.getByRole("tab", { name: copy.allTools }));
    // A re-render with the same request leaves the landing alone.
    rerender(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} request={{ tool: "cuts", nonce: 1 }} />);
    expect(tile("cuts")).not.toBeNull();
    rerender(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} request={{ tool: "cuts", nonce: 2 }} />);
    expect(screen.getByRole("heading", { name: "Proposed cuts" })).toBeTruthy();
  });

  it("waits for a hidden tab body to be shown before it scrolls and focuses", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { container, rerender } = render(
      <div hidden><TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} request={{ tool: "cuts", nonce: 1 }} /></div>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(scroll).not.toHaveBeenCalled();
    (container.firstChild as HTMLElement).hidden = false;
    rerender(<div><TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} request={{ tool: "cuts", nonce: 1 }} /></div>);
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: "start" }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Proposed cuts" }));
  });

  it("steps the arrow keys over an inert tool's tab", () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(0, 100)]} />);
    fireEvent.click(tile("suggested"));
    fireEvent.keyDown(screen.getByRole("tab", { name: "Suggested changes" }), { key: "ArrowRight" });
    // Proposed cuts is inert at 100, so the next stop wraps to All tools: the landing.
    expect(tile("cuts")?.hasAttribute("data-inert")).toBe(true);
  });

  it("still reads and settles the tab's loader when a shortcut opens a tool on the first render", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const settled = vi.fn();
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} request={{ tool: "cuts", nonce: 1 }} onSettled={settled} />);
    // Open from the first render, but its panel waits for the hub's read, which seeds the visit.
    expect(screen.queryByRole("heading", { name: "Proposed cuts" })).toBeNull();
    expect(await screen.findByRole("heading", { name: "Proposed cuts" })).toBeTruthy();
    await waitFor(() => expect(settled).toHaveBeenCalled());
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("applies only the newest read when two overlap", async () => {
    let first!: (t: HubTiles) => void;
    let second!: (t: HubTiles) => void;
    read.mockImplementationOnce(() => new Promise((r) => { first = r; }));
    read.mockImplementationOnce(() => new Promise((r) => { second = r; }));
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    // The second read: back to the tiles from a tool.
    fireEvent.click(tile("suggested"));
    fireEvent.click(screen.getByRole("tab", { name: copy.allTools }));
    await act(async () => { second({ suggested_changes: { kind: "ok", at: "2026-10-03T15:00:00Z", total: 5, accepted: 2 }, proposed_cuts: null }); });
    await act(async () => { first({ suggested_changes: { kind: "running", startedAt: new Date().toISOString() }, proposed_cuts: null }); });
    expect(tile("suggested").hasAttribute("data-running")).toBe(false);
    expect(tile("suggested").textContent).toContain(copy.outcome.applied(2, 5));
  });

  it("labels the open tool as the selected tab's panel", () => {
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    fireEvent.click(tile("cuts"));
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(screen.getByRole("tab", { name: "Proposed cuts" }).id);
    expect(screen.getByRole("tab", { name: "Proposed cuts" }).getAttribute("aria-controls")).toBe(panel.id);
  });

  it("puts focus on the Tuning heading when the tool left has gone inert", async () => {
    const { rerender } = render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(1)]} />);
    fireEvent.click(tile("cuts"));
    // The last cut lands: the deck is at 100 and the tool is no longer offered.
    rerender(<TuningHub deckId="d" drawn tools={[suggested(), cuts(0, 100)]} />);
    fireEvent.click(screen.getByRole("tab", { name: copy.allTools }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: copy.title })));
  });

  it("stays drawn for the visit when the last cut takes an unread deck to 100", async () => {
    const { rerender } = render(<TuningHub deckId="d" drawn tools={[suggested(false), cuts(1)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => {});
    fireEvent.click(tile("cuts"));
    // No reading and no longer over: on arrival this deck would draw no hub at all.
    rerender(<TuningHub deckId="d" drawn={false} tools={[suggested(false), cuts(0, 100)]} />);
    expect(screen.getByRole("heading", { name: "Proposed cuts" })).toBeTruthy();
  });

  it("resets to the landing when it mounts again (the Analysis tabpanel unmounts on a tab switch)", () => {
    const { unmount } = render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    fireEvent.click(tile("cuts"));
    unmount();
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6)]} />);
    expect(tile("cuts")).not.toBeNull();
  });
});

describe("TuningHub History", () => {
  const history: HubToolSpec = { tool: "history" };
  const row = {
    id: "run:00000000-0000-4000-8000-000000000001", tool: "suggested" as const, tier: "credit" as const, outcome: "ok" as const,
    at: "2026-10-03T21:12:00Z", summary: { kind: "suggestedOk" as const, in: 5, out: 5, added: 2, cut: 2, rejected: 1 },
  };

  it("draws History as the last tile, its status counting every run and the runs in flight", async () => {
    read.mockResolvedValue({ ...empty, history: { runs: 12, running: 1 } });
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6), history]} />);
    const tiles = [...document.querySelectorAll("[data-tool-tile]")].map((t) => t.getAttribute("data-tool-tile"));
    expect(tiles).toEqual(["suggested", "cuts", "history"]);
    // Literal figures, so a swap of the two fields (or the wrong field) cannot pass.
    await waitFor(() => expect(tile("history").textContent).toContain("12 runs · 1 running"));
    expect(copy.tools.history.runs(1, 0)).toBe("1 run");
    expect(tile("history").textContent).toContain(copy.tools.history.purpose);
  });

  it("opens History in place, a past run inside it, and the phone's switch slot goes back to the list", async () => {
    readHistoryPage.mockResolvedValue({ rows: [row], nextCursor: null });
    readPast.mockResolvedValue({ kind: "suggested", at: row.at, outcome: "ok", readVersion: 3, moved: 2, lines: [] });
    render(<TuningHub deckId="d" drawn tools={[suggested(), cuts(6), history]} />);
    fireEvent.click(tile("history"));
    expect(screen.getByText(copy.toolOf(3, 3))).toBeTruthy();
    await waitFor(() => expect(document.querySelector("[data-history-row]")).not.toBeNull());
    expect(readHistoryPage).toHaveBeenCalledWith("d", null, null);
    // The chips name the hub's other tools only.
    expect(within(screen.getByRole("radiogroup")).getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(document.querySelector("[data-history-row]")!);
    await waitFor(() => expect(document.querySelector("[data-past-run]")).not.toBeNull());
    // Phone: `‹ History` in place of `‹ Tuning`.
    expect(screen.queryByRole("button", { name: copy.back })).toBeNull();
    fireEvent.click(document.querySelector("[data-history-back]")!);
    await waitFor(() => expect(document.querySelector("[data-history-row]")).not.toBeNull());
    expect(screen.getByRole("button", { name: copy.back })).toBeTruthy();
  });
});

describe("TuningHub and the visit baseline", () => {
  it("records each drawn tool's state as the visit's baseline from its own read, before any tool opens", async () => {
    resetDeckVisitForTests();
    noteDeckRoute("/decks/11111111-1111-4111-8111-111111111111");
    read.mockResolvedValue({ ...empty, seen: { suggested: { okKey: "100", runId: "r1" }, cuts: { okKey: null, runId: null } } });
    render(<TuningHub deckId="11111111-1111-4111-8111-111111111111" drawn tools={[suggested(), cuts(6)]} />);
    await waitFor(() => expect(read).toHaveBeenCalled());
    await act(async () => {});
    // A later first read by the tool itself (a run settled meanwhile) gets the hub's baseline back.
    expect(visitBaseline("11111111-1111-4111-8111-111111111111", "suggested", { okKey: "200", runId: "r2" })).toEqual({ okKey: "100", runId: "r1" });
  });
});
