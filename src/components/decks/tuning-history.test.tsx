import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readTuningHistory, readTuningPastRun } from "../../app/decks/tuning-hub-actions";
import { tuningHubCopy } from "../../lib/copy/tuning-hub";
import type { HistoryRow, PastRun } from "../../lib/tuning/history";
import { historyDate, PastRunView, summaryText, TuningHistory } from "./tuning-history";

vi.mock("../../app/decks/tuning-hub-actions", () => ({ readTuningHistory: vi.fn(), readTuningPastRun: vi.fn() }));
const readPage = vi.mocked(readTuningHistory);
const readPast = vi.mocked(readTuningPastRun);
const copy = tuningHubCopy.history;

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows: HistoryRow[] = [
  { id: `run:${U(1)}`, tool: "suggested", tier: "credit", outcome: "running", at: "2026-10-09T15:42:00Z", summary: { kind: "none" } },
  { id: `run:${U(2)}`, tool: "cuts", tier: "deeper", outcome: "ok", at: "2026-10-09T15:36:00Z", summary: { kind: "cutsDeeperOk", named: 5, asked: 6, cut: 2, kept: 1 } },
  { id: `count:${U(3)}`, tool: "cuts", tier: "free", outcome: "ok", at: "2026-10-09T15:30:00Z", summary: { kind: "cutsFree", over: 6, roles: [{ label: "ramp", over: 4 }, { label: "draw", over: 2 }] } },
  { id: `run:${U(4)}`, tool: "suggested", tier: "credit", outcome: "ok", at: "2026-10-03T21:12:00Z", summary: { kind: "suggestedOk", in: 5, out: 5, added: 2, cut: 2, rejected: 1 } },
  { id: `run:${U(5)}`, tool: "suggested", tier: "credit", outcome: "failed", at: "2026-09-26T18:50:00Z", summary: { kind: "none" } },
];

/** The hub owns the open past run; this stands in for it. */
function Host({ tools = ["suggested", "cuts"] as const }: { tools?: readonly ("suggested" | "mana" | "cuts")[] }) {
  const [past, setPast] = useState<HistoryRow | null>(null);
  return <TuningHistory deckId="d" tools={tools} past={past} onOpenPast={setPast} />;
}

const rowEls = () => [...document.querySelectorAll("[data-history-row]")] as HTMLElement[];

beforeEach(() => {
  readPage.mockReset();
  readPast.mockReset();
  readPage.mockResolvedValue({ rows, nextCursor: null });
});

describe("summaryText", () => {
  it("writes each tool's line as the canvas fixtures do", () => {
    expect(summaryText(rows[1])).toBe("5 of 6 named · 2 cut, 1 kept");
    expect(summaryText(rows[2])).toBe("6 over · ramp 4 over, draw 2 over");
    expect(summaryText(rows[3])).toBe("5 in, 5 out · 2 added, 2 cut, 1 rejected");
    expect(summaryText(rows[0])).toBe("Reading your deck");
    expect(summaryText(rows[4])).toBe("didn’t finish · credit back");
    expect(summaryText({ ...rows[3], outcome: "stopped" })).toBe("stopped while reading · credit back");
    expect(summaryText({ ...rows[3], summary: { kind: "suggestedOk", in: 4, out: 4, added: 0, cut: 0, rejected: 0 } })).toBe("4 in, 4 out");
  });
});

describe("historyDate", () => {
  it("is US short, month first, with the time", () => {
    expect(historyDate("2026-10-07T21:40:00")).toBe("Oct 7 · 9:40 PM");
  });
});

describe("HistoryList", () => {
  it("draws every row newest first under its month, with tier and outcome", async () => {
    render(<Host />);
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    expect(readPage).toHaveBeenCalledWith("d", null, null);
    expect(screen.getByText("October 2026")).toBeTruthy();
    expect(screen.getByText("September 2026")).toBeTruthy();
    expect(rowEls().map((r) => r.getAttribute("data-outcome"))).toEqual(["running", "ok", "ok", "ok", "failed"]);
    expect(within(rowEls()[1]).getByText(copy.tier.deeper)).toBeTruthy();
    expect(within(rowEls()[2]).getByText(copy.tier.free)).toBeTruthy();
    expect(rowEls()[0].className).toContain("border-[var(--accent)]");
    // The failed row carries the failure mark before its word.
    expect(rowEls()[4].querySelector("svg path[fill-rule='evenodd']")).not.toBeNull();
    expect(screen.getByText(copy.foot)).toBeTruthy();
  });

  it("offers a chip per drawn tool, single select, and reads that tool's page on a press", async () => {
    render(<Host />);
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    const group = screen.getByRole("radiogroup");
    const chips = within(group).getAllByRole("radio");
    expect(chips.map((c) => c.textContent)).toEqual([copy.filterAll, tuningHubCopy.tools.suggested.name, tuningHubCopy.tools.cuts.name]);
    expect(chips[0].getAttribute("aria-checked")).toBe("true");
    readPage.mockResolvedValueOnce({ rows: rows.filter((r) => r.tool === "cuts"), nextCursor: null });
    fireEvent.click(chips[2]);
    await waitFor(() => expect(readPage).toHaveBeenLastCalledWith("d", "cuts", null));
    await waitFor(() => expect(rowEls()).toHaveLength(2));
    expect(within(screen.getByRole("radiogroup")).getAllByRole("radio")[2].getAttribute("aria-checked")).toBe("true");
  });

  it("draws the Mana Balance chip only when that tool is drawn", async () => {
    render(<Host tools={["suggested", "mana", "cuts"]} />);
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    expect(within(screen.getByRole("radiogroup")).getAllByRole("radio")).toHaveLength(4);
  });

  it("shows Show 20 more only when another page exists, and appends it", async () => {
    readPage.mockResolvedValueOnce({ rows: rows.slice(0, 2), nextCursor: "c1" });
    render(<Host />);
    await waitFor(() => expect(rowEls()).toHaveLength(2));
    readPage.mockResolvedValueOnce({ rows: rows.slice(2), nextCursor: null });
    fireEvent.click(screen.getByText(copy.more));
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    expect(readPage).toHaveBeenLastCalledWith("d", null, "c1");
    expect(screen.queryByText(copy.more)).toBeNull();
  });

  it("is empty with no chips when the deck has no runs", async () => {
    readPage.mockResolvedValue({ rows: [], nextCursor: null });
    render(<Host />);
    await waitFor(() => expect(screen.getByText(copy.empty.head)).toBeTruthy());
    expect(screen.getByText(copy.empty.body)).toBeTruthy();
    expect(screen.getByText(copy.subEmpty)).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("keeps the chips and says so when a filter has no runs", async () => {
    render(<Host />);
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    readPage.mockResolvedValueOnce({ rows: [], nextCursor: null });
    fireEvent.click(within(screen.getByRole("radiogroup")).getAllByRole("radio")[1]);
    await waitFor(() => expect(screen.getByText(copy.emptyFiltered)).toBeTruthy());
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(screen.queryByText(copy.empty.body)).toBeNull();
  });

  it("keeps the chips up while All reloads, so the pressed chip keeps focus", async () => {
    render(<Host />);
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    fireEvent.click(within(screen.getByRole("radiogroup")).getAllByRole("radio")[1]);
    await waitFor(() => expect(within(screen.getByRole("radiogroup")).getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true"));
    readPage.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(within(screen.getByRole("radiogroup")).getAllByRole("radio")[0]);
    expect(screen.getByRole("radiogroup")).toBeTruthy();
  });

  it("says when the list failed to arrive, and Try again reads it again", async () => {
    readPage.mockRejectedValueOnce(new Error("down"));
    render(<Host />);
    await waitFor(() => expect(screen.getByRole("img", { name: copy.loadFailed.tag })).toBeTruthy());
    expect(screen.getByText(copy.loadFailed.body)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    await waitFor(() => expect(rowEls()).toHaveLength(5));
  });

  it("opens a past run in place and comes back to the list with the same filter", async () => {
    const past: PastRun = {
      kind: "suggested", at: rows[3].at, outcome: "ok", readVersion: 3, moved: 8,
      lines: [
        { cut: "Rampant Growth", add: "Nature’s Lore", verdict: "applied", reason: "r1", cites: ["games 7"] },
        { cut: "Wildgrowth Walker", add: "Ranging Raptors", verdict: "rejected", reason: "r2", cites: [] },
        { cut: "Cultivate", add: "Farseek", verdict: "open", reason: "r3", cites: [] },
      ],
    };
    readPast.mockResolvedValue(past);
    render(<Host />);
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    readPage.mockResolvedValueOnce({ rows: rows.filter((r) => r.tool === "suggested"), nextCursor: null });
    fireEvent.click(within(screen.getByRole("radiogroup")).getAllByRole("radio")[1]);
    await waitFor(() => expect(rowEls()).toHaveLength(3));
    fireEvent.click(rowEls()[1]);
    await waitFor(() => expect(document.querySelectorAll("[data-past-line]")).toHaveLength(3));
    expect(readPast).toHaveBeenCalledWith("d", `run:${U(4)}`);
    expect(screen.getByText(copy.pastNote(8))).toBeTruthy();
    expect(screen.getByText(copy.pastMeta(historyDate(rows[3].at), 3, copy.tier.credit))).toBeTruthy();
    const calls = readPage.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: copy.back }));
    await waitFor(() => expect(rowEls()).toHaveLength(3));
    // The list kept its filter and did not read again.
    expect(within(screen.getByRole("radiogroup")).getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
    expect(readPage.mock.calls.length).toBe(calls);
  });
});

describe("PastRun", () => {
  it("says what the run settled to, not the running state the list drew it in", async () => {
    readPast.mockResolvedValue({ kind: "suggested", at: rows[0].at, outcome: "failed", readVersion: null, moved: null, lines: [] });
    render(<PastRunView deckId="d" row={rows[0]} onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText(copy.summary.failed)).toBeTruthy());
    expect(screen.queryByText(copy.summary.running.suggested)).toBeNull();
  });

  it("draws its lines in the answered tones and carries no write control", async () => {
    readPast.mockResolvedValue({
      kind: "cutsDeeper", at: rows[1].at, outcome: "ok", readVersion: null, moved: null,
      lines: [
        { cut: "Cultivate", reason: "Ramp runs 4 over.", verdict: "applied", cites: ["ROLE ramp 14 · rec 10"] },
        { cut: "Farseek", reason: "Low inclusion.", verdict: "rejected", cites: [] },
        { cut: "Explore", reason: "Cheap.", verdict: "open", cites: [] },
      ],
    });
    render(<Host />);
    await waitFor(() => expect(rowEls()).toHaveLength(5));
    fireEvent.click(rowEls()[1]);
    await waitFor(() => expect(document.querySelectorAll("[data-past-line]")).toHaveLength(3));
    const lines = [...document.querySelectorAll("[data-past-line]")] as HTMLElement[];
    expect(lines.map((l) => l.getAttribute("data-past-line"))).toEqual(["applied", "rejected", "open"]);
    expect(lines[0].className).toContain("border-[var(--success)]");
    expect(lines[2].className).toContain("border-dashed");
    expect(lines.map((l) => l.textContent)).toEqual([
      expect.stringContaining(copy.verdict.cut), expect.stringContaining(copy.verdict.kept), expect.stringContaining(copy.leftOpen),
    ]);
    // No version and no count to say: the note reads without a figure.
    expect(screen.getByText(copy.pastNoteUncounted)).toBeTruthy();
    // Nothing writes: every button is the way back or a line opening to its reason.
    const writes = screen.getAllByRole("button").filter((b) => !b.hasAttribute("aria-expanded") && b.textContent !== copy.back);
    expect(writes).toEqual([]);
    for (const w of ["Apply", "Cut", "Keep", "Reject", "Undo", "Show it again"]) {
      expect(screen.queryByRole("button", { name: w })).toBeNull();
    }
    fireEvent.click(within(lines[0]).getByRole("button"));
    expect(within(lines[0]).getByText("Ramp runs 4 over.")).toBeTruthy();
    // Its chips, as they read that day.
    expect(within(lines[0]).getByText("ROLE ramp 14 · rec 10")).toBeTruthy();
  });
});

describe("TuningHistory: a run in flight", () => {
  it("re-reads while a listed run is running, and the row settles in place", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const running: HistoryRow = { ...rows[0], outcome: "running" };
      const settled: HistoryRow = { ...rows[0], outcome: "ok" };
      readPage.mockResolvedValueOnce({ rows: [running, ...rows.slice(1)], nextCursor: null });
      readPage.mockResolvedValue({ rows: [settled, ...rows.slice(1)], nextCursor: null });
      render(<Host />);
      const runningText = tuningHubCopy.history.summary.running.suggested;
      await waitFor(() => expect(rowEls()[0].textContent).toContain(runningText));
      await vi.advanceTimersByTimeAsync(3000);
      await waitFor(() => expect(rowEls()[0].textContent).not.toContain(runningText));
      expect(rowEls()).toHaveLength(rows.length);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never starts a re-read while one is still out, so an older snapshot cannot land over a newer one", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      readPage.mockResolvedValueOnce({ rows, nextCursor: null });
      render(<Host />);
      await waitFor(() => expect(rowEls()).toHaveLength(rows.length));
      readPage.mockReturnValue(new Promise(() => {}));
      const before = readPage.mock.calls.length;
      await vi.advanceTimersByTimeAsync(3000 * 3);
      expect(readPage.mock.calls.length - before).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
