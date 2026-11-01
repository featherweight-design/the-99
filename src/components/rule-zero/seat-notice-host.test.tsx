// The in-app seat notice (Rule 0 revisions, item 6): one toast per table with the host and pod drawn as names, `Open` to the table,
// a bare ✕ that marks the notice seen and removes that toast only, none on Home or on that table's own page, and a seat push the
// service worker hands over drawing a toast.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  path: "/decks" as string,
  refresh: vi.fn(),
  read: vi.fn(),
  mark: vi.fn(async () => true),
}));
vi.mock("next/navigation", () => ({ usePathname: () => m.path, useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("../../app/friends/table/actions", () => ({ unseenSeatNoticesAction: m.read, markSeatNoticeSeenAction: m.mark }));

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { named } from "../../lib/person-name/mint";
import { SEAT_NOTICE_MESSAGE, SeatNoticeHost } from "./seat-notice-host";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const notice = (tableId: string, host: string, pod: string) => ({ tableId, host: named(host), podName: named(pod) });

let swHandler: ((e: { data: unknown }) => void) | null;

beforeEach(() => {
  m.path = "/decks";
  swHandler = null;
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      addEventListener: (_: string, fn: (e: { data: unknown }) => void) => (swHandler = fn),
      removeEventListener: () => (swHandler = null),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  m.read.mockReset();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

const mount = async () => {
  const view = render(<SeatNoticeHost />);
  await act(async () => {});
  return view;
};

describe("the seat toast", () => {
  it("draws one toast per table, each with its host and pod and an Open to its own table", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night"), notice(B, "Max", "Sunday crew")]);
    await mount();
    expect(screen.getByText("Colin seated you at Thursday night’s table.")).toBeTruthy();
    expect(screen.getByText("Max seated you at Sunday crew’s table.")).toBeTruthy();
    const opens = screen.getAllByRole("link", { name: ruleZeroCopy.notice.open });
    expect(opens.map((l) => l.getAttribute("href"))).toEqual([`/friends/table/${A}`, `/friends/table/${B}`]);
  });

  it("marks the names for analytics: the sentence sits in a ph-no-capture span", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    expect(screen.getByText("Colin seated you at Thursday night’s table.").className).toContain("ph-no-capture");
  });

  it("the ✕ marks that table's notice seen and removes that toast only", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night"), notice(B, "Max", "Sunday crew")]);
    await mount();
    const closes = screen.getAllByRole("button", { name: ruleZeroCopy.close.dismiss });
    expect(closes).toHaveLength(2);
    await act(async () => fireEvent.click(closes[0]!));
    expect(m.mark).toHaveBeenCalledTimes(1);
    expect(m.mark).toHaveBeenCalledWith(A);
    expect(screen.queryByText("Colin seated you at Thursday night’s table.")).toBeNull();
    expect(screen.getByText("Max seated you at Sunday crew’s table.")).toBeTruthy();
  });

  it("a dismissed table does not come back on a later read that still lists it", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.close.dismiss })));
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Colin seated you at Thursday night’s table.")).toBeNull();
  });

  it("draws nothing on Home, and refreshes Home when a notice arrives there", async () => {
    m.path = "/";
    m.read.mockResolvedValueOnce([]);
    await mount();
    expect(m.refresh).not.toHaveBeenCalled();
    m.read.mockResolvedValueOnce([notice(A, "Colin", "Thursday night")]);
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Colin seated you at Thursday night’s table.")).toBeNull();
    expect(m.refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh Home for a table Home already drew when it opened", async () => {
    m.path = "/";
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(m.refresh).not.toHaveBeenCalled();
  });

  it("is not drawn on that table's own page, but still is for another table", async () => {
    m.path = `/friends/table/${A}`;
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night"), notice(B, "Max", "Sunday crew")]);
    await mount();
    expect(screen.queryByText("Colin seated you at Thursday night’s table.")).toBeNull();
    expect(screen.getByText("Max seated you at Sunday crew’s table.")).toBeTruthy();
  });

  it("a seat push handed over by the service worker reads again and draws the new toast", async () => {
    m.read.mockResolvedValueOnce([]);
    await mount();
    expect(screen.queryByRole("status")).toBeNull();
    m.read.mockResolvedValueOnce([notice(A, "Colin", "Thursday night")]);
    await act(async () => swHandler?.({ data: { type: SEAT_NOTICE_MESSAGE } }));
    await waitFor(() => expect(screen.getByText("Colin seated you at Thursday night’s table.")).toBeTruthy());
  });

  it("ignores a message that is not a seat push", async () => {
    m.read.mockResolvedValue([]);
    await mount();
    const reads = m.read.mock.calls.length;
    await act(async () => swHandler?.({ data: { type: "something-else" } }));
    expect(m.read.mock.calls.length).toBe(reads);
  });

  it("has no clock: a toast stays until it is opened or ✕'d", async () => {
    vi.useFakeTimers();
    try {
      m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
      await mount();
      await act(async () => vi.advanceTimersByTime(60_000));
      expect(screen.getByText("Colin seated you at Thursday night’s table.")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
