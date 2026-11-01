// The table, live (plan PR 4; boards S4, S5, W4, W5): the poll's answers reach the same body, a change since the
// viewer last looked carries the dot and `Since you looked`, every draw records its revision, a closed table swaps
// in place, and a table the reader lost refreshes the route.
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), seen: vi.fn(async () => true), close: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("../../app/friends/table/actions", () => ({ markTableSeen: m.seen }));
vi.mock("../../app/friends/table/setup-actions", () => ({ loadTableSetupAction: vi.fn(), reseatTableAction: vi.fn(), closeTableAction: m.close }));

import { TABLES } from "../../lib/social/rule-zero-fixtures";
import type { TableView } from "../../lib/rule-zero/table-view";
import { TableBody } from "./table-body";
import { POLL_MS, TableLive } from "./table-live";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const base = TABLES.T1;
const AT = base.revision;
const later = (ms: number) => new Date(AT.getTime() + ms);
/** Colin swapped a minute after the viewer last looked. */
const swapped = (view: TableView, seenAt: Date | null): TableView => ({
  ...view,
  seenAt,
  revision: later(60_000),
  seats: view.seats.map((s) => (plain(s.displayName) === "Colin" ? { ...s, changedAt: later(60_000) } : s)),
});
const seatOf = (name: string) => screen.getByRole("article", { name: name === "You" ? "Your seat" : `${name}’s seat` });
const readCard = () => screen.getByTestId("read-card");

describe("the changed dot and Since you looked (S5, W5)", () => {
  it("marks the seat that changed since the viewer looked, and says what it changed to in place of the sentence", () => {
    const view = swapped(base, AT);
    render(<TableBody view={view} now={later(120_000)} />);
    expect(within(seatOf("Colin")).getByTestId("changed")).toHaveTextContent("changed 1 min ago");
    expect(within(seatOf("Peter")).queryByTestId("changed")).toBeNull();
    expect(within(seatOf("You")).queryByTestId("changed")).toBeNull();
    const deck = plain(view.seats.find((s) => plain(s.displayName) === "Colin")!.deck!.name);
    expect(within(readCard()).getByTestId("since")).toHaveTextContent(`Since you looked Colin swapped to ${deck}.`);
    const bold = within(readCard()).getByText(deck);
    expect(bold.closest("b")).not.toBeNull();
    expect(bold.className).toContain("ph-no-capture");
  });

  it("marks nothing on the viewer's first look, and keeps the read's sentence", () => {
    render(<TableBody view={swapped(base, null)} now={later(120_000)} />);
    expect(screen.queryAllByTestId("changed")).toHaveLength(0);
    expect(within(readCard()).queryByTestId("since")).toBeNull();
    expect(within(readCard()).getByText(/No deck sits a bracket or more from the rest/)).toBeInTheDocument();
  });
});

describe("TableLive", () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
  const open = (view: TableView) => json(200, { kind: "open", view });
  let fetchMock: ReturnType<typeof vi.fn>;
  let visibility: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    m.refresh.mockReset();
    m.seen.mockClear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });
  afterEach(() => {
    visibility.mockRestore();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const settle = async (ms = 0) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };
  const show = async (state: "visible" | "hidden") => {
    visibility.mockReturnValue(state);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
  };

  it("checks at once on arrival, records what it drew, and asks again every 20 seconds against the visit's own seenAt", async () => {
    fetchMock.mockResolvedValueOnce(open({ ...base, seenAt: AT }));
    render(<TableLive initial={{ ...base, seenAt: AT }} now={AT} />);
    await settle();
    expect(fetchMock).toHaveBeenCalledWith(`/api/rule-zero/tables/${base.tableId}`, { cache: "no-store" });
    expect(m.seen).toHaveBeenCalledWith(base.tableId, AT.toISOString());
    expect(screen.queryAllByTestId("changed")).toHaveLength(0);
    // An answer whose seenAt already holds the swap (this visit recorded it a moment ago): the visit's own still marks it.
    fetchMock.mockResolvedValueOnce(open(swapped(base, later(60_000))));
    await settle(POLL_MS);
    expect(within(seatOf("Colin")).getByTestId("changed")).toBeInTheDocument();
    expect(within(readCard()).getByTestId("since")).toBeInTheDocument();
    expect(within(readCard()).getByText(/^updated /)).toBeInTheDocument();
    expect(m.seen).toHaveBeenLastCalledWith(base.tableId, later(60_000).toISOString());
  });

  it("draws a fresh server payload at once (Seats saved, the router refreshed), keeping the visit's seenAt", async () => {
    fetchMock.mockResolvedValue(open(base));
    const { rerender } = render(<TableLive initial={base} now={AT} />);
    await settle();
    expect(seatOf("Colin")).toBeTruthy();
    const reseated = { ...base, seats: base.seats.filter((s) => plain(s.displayName) !== "Colin") };
    rerender(<TableLive initial={reseated} now={AT} />);
    expect(screen.queryByRole("article", { name: "Colin’s seat" })).toBeNull();
  });

  it("takes the visit's seenAt from its first check, not from a payload Back restored from the router's cache", async () => {
    // The cached payload is an earlier visit's: it arrived before Colin swapped. That visit saw the swap and recorded it.
    const cached = swapped(base, AT);
    fetchMock.mockResolvedValueOnce(open(swapped(base, later(60_000))));
    render(<TableLive initial={cached} now={later(120_000)} />);
    expect(m.seen).not.toHaveBeenCalled();
    await settle();
    expect(screen.queryAllByTestId("changed")).toHaveLength(0);
    expect(within(readCard()).queryByTestId("since")).toBeNull();
  });

  it("records nothing an answer brought while the page was hidden, and records it when the page comes back", async () => {
    fetchMock.mockResolvedValueOnce(open(base));
    render(<TableLive initial={base} now={AT} />);
    await settle();
    expect(m.seen).toHaveBeenCalledTimes(1);
    let land!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => { land = r; }));
    await settle(POLL_MS);
    visibility.mockReturnValue("hidden");
    await act(async () => {
      land(open(swapped(base, AT)));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(m.seen).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValueOnce(open(swapped(base, AT)));
    await show("visible");
    expect(m.seen).toHaveBeenLastCalledWith(base.tableId, later(60_000).toISOString());
  });

  it("asks nothing while the page is hidden, and asks at once when it comes back", async () => {
    visibility.mockReturnValue("hidden");
    render(<TableLive initial={base} now={AT} />);
    await settle(POLL_MS);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.seen).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(open(base));
    await show("visible");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(m.seen).toHaveBeenCalledWith(base.tableId, AT.toISOString());
  });

  it("draws the closed table in place when the night has ended (L4)", async () => {
    fetchMock.mockResolvedValueOnce(open(base));
    render(<TableLive initial={base} now={AT} />);
    await settle();
    fetchMock.mockResolvedValueOnce(json(200, { kind: "closed", closed: { tableId: base.tableId, viewerDeckId: null, podName: named("Thursday night"), setBy: named("Colin"), how: { kind: "morning", at: AT.toISOString() }, faces: [] } }));
    await settle(POLL_MS);
    expect(screen.getByTestId("table-closed")).toBeInTheDocument();
    expect(screen.queryByTestId("table-body")).toBeNull();
  });

  it("refreshes the route when the reader has lost the table, and keeps drawing on a failed check", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    render(<TableLive initial={base} now={AT} />);
    await settle();
    expect(screen.getByTestId("table-body")).toBeInTheDocument();
    expect(m.seen).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(json(404, null));
    await settle(POLL_MS);
    expect(m.refresh).toHaveBeenCalledTimes(1);
  });
});
