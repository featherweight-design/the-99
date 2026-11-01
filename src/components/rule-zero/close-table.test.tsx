// Close the table (Rule 0 revisions 5; Table board C1 to C5, T1, D1, D2): the setter's text button at the table's foot and
// never a guest's, its confirm (a sheet on the phone, a 480 modal from md) and what each answer does, the closed table the
// host's page becomes at once, and the closed copy for each way a table ends, with Log this game while it is open.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), seen: vi.fn(async () => true), close: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("../../app/friends/table/actions", () => ({ markTableSeen: m.seen, swapSeatDeckAction: vi.fn() }));
vi.mock("../../app/friends/table/setup-actions", () => ({ loadTableSetupAction: vi.fn(), reseatTableAction: vi.fn(), closeTableAction: m.close }));

import { ruleZeroCopy as copy } from "../../lib/copy/rule-zero";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import { TABLES, VIEWER_DECK_ID } from "../../lib/social/rule-zero-fixtures";
import type { ClosedTable } from "../../lib/social/rule-zero-table";
import { closesWhen } from "../../lib/social/when";
import { CloseTable } from "./close-table";
import { TableBody } from "./table-body";
import { TableClosed } from "./table-closed";
import { TableLive } from "./table-live";

const NOW = new Date("2026-10-16T21:40:00Z");
const POD = named("Thursday night");
const c = copy.close;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function wideViewport(matches: boolean) {
  const was = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({ matches, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
  return () => Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: was });
}

const press = () => act(async () => fireEvent.click(screen.getByRole("button", { name: c.action })));
const dialog = () => screen.getByRole("dialog");

describe("the Close button (T1, D1)", () => {
  it("is the setter's, under Log this game, and never a guest's", () => {
    const { unmount } = render(<TableBody view={TABLES.T5} now={NOW} onClose={async () => true} />);
    const close = screen.getByRole("button", { name: c.action });
    const log = screen.getByRole("link", { name: copy.page.log });
    expect(log.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(close).toHaveClass("text-[color:var(--danger)]");
    unmount();
    render(<TableBody view={TABLES.T1} now={NOW} onClose={async () => true} />);
    expect(screen.queryByRole("button", { name: c.action })).toBeNull();
    expect(screen.getByRole("link", { name: copy.page.log })).toBeInTheDocument();
  });
});

describe("the confirm on the phone (a sheet)", () => {
  it("asks the question, says what goes, and Keep it open leaves without closing", async () => {
    const run = vi.fn(async () => true);
    render(<CloseTable podName={POD} run={run} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await press();
    expect(within(dialog()).getByRole("heading", { level: 2 })).toHaveTextContent("Close Thursday night’s table?");
    expect(within(dialog()).getByRole("heading", { level: 2 }).querySelector(".ph-no-capture")).not.toBeNull();
    expect(dialog()).toHaveTextContent(c.body);
    fireEvent.click(within(dialog()).getByRole("button", { name: c.keep }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it("runs the close once on the danger action, and holds the button while it runs", async () => {
    let finish: (ok: boolean) => void = () => {};
    const run = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    render(<CloseTable podName={POD} run={run} />);
    await press();
    const danger = within(dialog()).getByRole("button", { name: c.action });
    await act(async () => {
      fireEvent.click(danger);
      fireEvent.click(danger);
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(danger).toBeDisabled();
    expect(danger).toHaveAttribute("aria-busy", "true");
    await act(async () => finish(true));
    expect(danger).not.toBeDisabled();
  });

  it("closes the confirm when the close did not happen, so the page's toast is seen", async () => {
    render(<CloseTable podName={POD} run={async () => false} />);
    await press();
    await act(async () => fireEvent.click(within(dialog()).getByRole("button", { name: c.action })));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the confirm from md (a 480 modal)", () => {
  it("asks in a modal with Keep it open and the danger action, and the danger action closes once", async () => {
    const restore = wideViewport(true);
    try {
      const run = vi.fn(async () => true);
      render(<CloseTable podName={POD} run={run} />);
      await press();
      expect(within(dialog()).getByRole("heading", { level: 2 })).toHaveTextContent("Close Thursday night’s table?");
      expect(dialog()).toHaveTextContent(c.body);
      fireEvent.click(within(dialog()).getByRole("button", { name: c.keep }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(run).not.toHaveBeenCalled();
      await press();
      await act(async () => fireEvent.click(within(dialog()).getByRole("button", { name: c.action })));
      expect(run).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });
});

describe("TableLive's close", () => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  const CLOSED: ClosedTable = {
    tableId: TABLES.T5.tableId,
    viewerDeckId: VIEWER_DECK_ID,
    podName: POD,
    setBy: null,
    how: { kind: "host", byYou: true, by: null, at: new Date("2026-10-16T23:52:00Z"), logOpen: true },
    faces: [{ name: "Hugh", artCropUri: null }],
  };
  let closedNow = false;
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    closedNow = false;
    m.close.mockReset();
    fetchMock = vi.fn(async () => json(closedNow ? { kind: "closed", closed: { ...CLOSED, how: { ...CLOSED.how, at: CLOSED.how.kind === "host" ? CLOSED.how.at.toISOString() : "" } } } : { kind: "open", view: TABLES.T5 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("calls the action once with the table's id and draws the closed table at once", async () => {
    m.close.mockImplementation(async () => {
      closedNow = true;
      return { ok: true };
    });
    render(<TableLive initial={TABLES.T5} now={NOW} />);
    await press();
    await act(async () => fireEvent.click(within(dialog()).getByRole("button", { name: c.action })));
    await waitFor(() => expect(screen.getByTestId("table-closed")).toBeInTheDocument());
    expect(m.close).toHaveBeenCalledTimes(1);
    expect(m.close).toHaveBeenCalledWith(TABLES.T5.tableId);
    expect(screen.queryByTestId("table-body")).toBeNull();
    expect(screen.queryByText(c.failed)).toBeNull();
    expect(screen.getByRole("link", { name: copy.page.log })).toHaveAttribute("href", `/decks/${VIEWER_DECK_ID}?tab=games&table=${TABLES.T5.tableId}`);
  });

  it("says a refused close in the shared toast, keeps the table open, and Try again closes it", async () => {
    m.close.mockResolvedValue({ ok: false });
    render(<TableLive initial={TABLES.T5} now={NOW} />);
    await press();
    await act(async () => fireEvent.click(within(dialog()).getByRole("button", { name: c.action })));
    expect(screen.getByText(c.failed)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("table-body")).toBeInTheDocument();
    expect(screen.queryByTestId("table-closed")).toBeNull();
    expect(m.close).toHaveBeenCalledTimes(1);
    m.close.mockImplementation(async () => {
      closedNow = true;
      return { ok: true };
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: c.retry })));
    await waitFor(() => expect(screen.getByTestId("table-closed")).toBeInTheDocument());
    expect(m.close).toHaveBeenCalledTimes(2);
  });

  it("says a close that threw the same way", async () => {
    m.close.mockRejectedValue(new Error("network"));
    render(<TableLive initial={TABLES.T5} now={NOW} />);
    await press();
    await act(async () => fireEvent.click(within(dialog()).getByRole("button", { name: c.action })));
    expect(screen.getByText(c.failed)).toBeInTheDocument();
    expect(screen.queryByTestId("table-closed")).toBeNull();
  });

  it("draws no Close button to a guest", () => {
    render(<TableLive initial={TABLES.T1} now={NOW} />);
    expect(screen.queryByRole("button", { name: c.action })).toBeNull();
  });
});

describe("the closed table's sentence (C3 to C5)", () => {
  const AT = new Date("2026-10-16T23:52:00Z");
  const time = closesWhen(AT, AT);
  const closed = (how: ClosedTable["how"]): ClosedTable => ({
    tableId: "table-1",
    viewerDeckId: VIEWER_DECK_ID,
    podName: POD,
    setBy: named("Colin"),
    how,
    faces: [{ name: "Hugh", artCropUri: null }],
  });

  it("says the viewer closed it, with the time", () => {
    render(<TableClosed closed={closed({ kind: "host", byYou: true, by: null, at: AT, logOpen: true })} />);
    const body = plain(copy.expired.bodyClosedByYou(POD, time));
    expect(body).toMatch(/^You closed Thursday night’s table at \d{1,2}:\d{2} [ap]m\. Games logged from it stay on each deck’s Games tab\.$/);
    expect(screen.getByText(body)).toBeInTheDocument();
  });

  it("names another closer, marked as another reader's name", () => {
    render(<TableClosed closed={closed({ kind: "host", byYou: false, by: named("Colin"), at: AT, logOpen: true })} />);
    const body = plain(copy.expired.bodyClosedBy(named("Colin"), POD, time));
    expect(body).toMatch(/^Colin closed Thursday night’s table at \d{1,2}:\d{2} [ap]m\. Games logged/);
    expect(screen.getByText(body).className).toContain("ph-no-capture");
  });

  it("keeps the morning end's own sentence", () => {
    render(<TableClosed closed={closed({ kind: "morning", at: AT })} />);
    expect(screen.getByText(plain(copy.expired.body(POD, named("Colin"))))).toBeInTheDocument();
    expect(screen.queryByText(/ closed Thursday night’s table at /)).toBeNull();
  });

  it("keeps Log this game, linked to the viewer's deck, while the host's close is log-open, and drops it after", () => {
    const { unmount } = render(<TableClosed closed={closed({ kind: "host", byYou: true, by: null, at: AT, logOpen: true })} />);
    expect(screen.getByRole("link", { name: copy.page.log })).toHaveAttribute("href", `/decks/${VIEWER_DECK_ID}?tab=games&table=table-1`);
    expect(screen.getByRole("link", { name: copy.expired.back })).toHaveAttribute("href", "/friends");
    unmount();
    render(<TableClosed closed={closed({ kind: "host", byYou: true, by: null, at: AT, logOpen: false })} />);
    expect(screen.queryByRole("link", { name: copy.page.log })).toBeNull();
    cleanup();
    render(<TableClosed closed={closed({ kind: "morning", at: AT })} />);
    expect(screen.queryByRole("link", { name: copy.page.log })).toBeNull();
  });

  it("draws no Log this game when the viewer's seat held no deck", () => {
    render(<TableClosed closed={{ ...closed({ kind: "host", byYou: true, by: null, at: AT, logOpen: true }), viewerDeckId: null }} />);
    expect(screen.queryByRole("link", { name: copy.page.log })).toBeNull();
  });
});
