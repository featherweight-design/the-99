// The table, live (plan PR 4; boards S4, S5, W4, W5): the poll's answers reach the same body, a change since the
// viewer last looked carries the dot and `Since you looked`, every draw records its revision, a closed table swaps
// in place, and a table the reader lost refreshes the route.
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), seen: vi.fn(async () => true) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("../../app/friends/table/actions", () => ({ markTableSeen: m.seen }));

import { TABLES } from "../../lib/rule-zero/table-fixtures";
import type { TableView } from "../../lib/rule-zero/table-view";
import { TableBody } from "./table-body";
import { POLL_MS, TableLive } from "./table-live";

const base = TABLES.T1;
const AT = base.revision;
const later = (ms: number) => new Date(AT.getTime() + ms);
/** Colin swapped a minute after the viewer last looked. */
const swapped = (view: TableView, seenAt: Date | null): TableView => ({
  ...view,
  seenAt,
  revision: later(60_000),
  seats: view.seats.map((s) => (s.displayName === "Colin" ? { ...s, changedAt: later(60_000) } : s)),
});
const seatOf = (name: string) => screen.getByRole("article", { name: name === "You" ? "Your seat" : `${name}’s seat` });
const readCard = () => screen.getByTestId("read-card");

describe("the changed dot and Since you looked (S5, W5)", () => {
  it("marks the seat that changed since the viewer looked, and says what it changed to in place of the sentence", () => {
    const view = swapped(base, AT);
    render(<TableBody view={view} gamesEnabled now={later(120_000)} />);
    expect(within(seatOf("Colin")).getByTestId("changed")).toHaveTextContent("changed 1 min ago");
    expect(within(seatOf("Peter")).queryByTestId("changed")).toBeNull();
    expect(within(seatOf("You")).queryByTestId("changed")).toBeNull();
    const deck = view.seats.find((s) => s.displayName === "Colin")!.deck!.name;
    expect(within(readCard()).getByTestId("since")).toHaveTextContent(`Since you looked Colin swapped to ${deck}.`);
    expect(within(readCard()).getByText(deck).tagName).toBe("B");
  });

  it("marks nothing on the viewer's first look, and keeps the read's sentence", () => {
    render(<TableBody view={swapped(base, null)} gamesEnabled now={later(120_000)} />);
    expect(screen.queryAllByTestId("changed")).toHaveLength(0);
    expect(within(readCard()).queryByTestId("since")).toBeNull();
    expect(within(readCard()).getByText(/No deck sits a bracket or more from the rest/)).toBeInTheDocument();
  });
});

describe("TableLive", () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    m.refresh.mockReset();
    m.seen.mockClear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const tick = async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS);
    });
  };

  it("records the drawn revision, asks again every 20 seconds, and draws the answer against the visit's own seenAt", async () => {
    render(<TableLive initial={{ ...base, seenAt: AT }} gamesEnabled now={AT} />);
    expect(m.seen).toHaveBeenCalledWith(base.tableId, AT.toISOString());
    expect(screen.queryAllByTestId("changed")).toHaveLength(0);
    // An answer whose seenAt already holds the swap (this visit recorded it a moment ago): the visit's own still marks it.
    fetchMock.mockResolvedValueOnce(json(200, { kind: "open", view: swapped(base, later(60_000)) }));
    await tick();
    expect(fetchMock).toHaveBeenCalledWith(`/api/rule-zero/tables/${base.tableId}`, { cache: "no-store" });
    expect(within(seatOf("Colin")).getByTestId("changed")).toBeInTheDocument();
    expect(within(readCard()).getByTestId("since")).toBeInTheDocument();
    expect(within(readCard()).getByText(/^updated /)).toBeInTheDocument();
    expect(m.seen).toHaveBeenLastCalledWith(base.tableId, later(60_000).toISOString());
  });

  it("asks nothing while the page is hidden, and asks at once when it comes back", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    render(<TableLive initial={base} gamesEnabled now={AT} />);
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    fetchMock.mockResolvedValueOnce(json(200, { kind: "open", view: base }));
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });

  it("draws the closed table in place when the night has ended (L4)", async () => {
    render(<TableLive initial={base} gamesEnabled now={AT} />);
    fetchMock.mockResolvedValueOnce(json(200, { kind: "closed", closed: { podName: "Thursday night", setBy: "Colin", faces: [] } }));
    await tick();
    expect(screen.getByTestId("table-closed")).toBeInTheDocument();
    expect(screen.queryByTestId("table-body")).toBeNull();
  });

  it("refreshes the route when the reader has lost the table, and keeps drawing on a failed check", async () => {
    render(<TableLive initial={base} gamesEnabled now={AT} />);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await tick();
    expect(screen.getByTestId("table-body")).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(json(404, null));
    await tick();
    expect(m.refresh).toHaveBeenCalledTimes(1);
  });
});
