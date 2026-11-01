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
  // One router object for every render, as Next's is: a fresh one per call would change `read`'s identity and loop its effect.
  router: null as unknown as { refresh: () => void },
}));
m.router = { refresh: m.refresh };
vi.mock("next/navigation", () => ({ usePathname: () => m.path, useRouter: () => m.router }));
vi.mock("../../app/friends/table/actions", () => ({ unseenSeatNoticesAction: m.read, markSeatNoticeSeenAction: m.mark }));

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { named } from "../../lib/person-name/mint";
import { SEAT_NOTICE_MESSAGE, SeatNoticeHost } from "./seat-notice-host";

// The literal `public/sw.js` posts (pinned there by sw.test.ts): the host listens for exactly this.
const SW_MESSAGE = "the99:seat-notice";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const notice = (tableId: string, host: string, pod: string, since = 1000) => ({ tableId, host: named(host), podName: named(pod), since });
const sentenceOf = (host: string, pod: string) => `${host} seated you at ${pod}’s table.`;
const toastText = (id: string) => document.querySelector(`[data-seat-notice="${id}"]`)?.textContent ?? "";
const toastOf = (id: string) => document.querySelector(`[data-seat-notice="${id}"]`);

let swHandler: ((e: { data: unknown }) => void) | null;
// Reads within a second of the last are one read (a tab return fires focus and visibilitychange); tests move the clock past it.
let clock = 1_000_000;
let nowSpy: ReturnType<typeof vi.spyOn>;
const tick = () => (clock += 5000);

beforeEach(() => {
  m.path = "/decks";
  swHandler = null;
  clock = 1_000_000;
  nowSpy = vi.spyOn(Date, "now").mockImplementation(() => clock);
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
  nowSpy.mockRestore();
  vi.clearAllMocks();
  m.read.mockReset();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

const mount = async () => {
  const view = render(<SeatNoticeHost />);
  await act(async () => {});
  return view;
};

const focus = async () => {
  tick();
  await act(async () => window.dispatchEvent(new Event("focus")));
};

describe("the seat toast", () => {
  it("listens for the literal message the service worker posts", () => {
    expect(SEAT_NOTICE_MESSAGE).toBe(SW_MESSAGE);
  });

  it("draws one toast per table, each with its host and pod and an Open to its own table", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night"), notice(B, "Max", "Sunday crew")]);
    await mount();
    expect(toastText(A)).toContain(sentenceOf("Colin", "Thursday night"));
    expect(toastText(B)).toContain(sentenceOf("Max", "Sunday crew"));
    const opens = screen.getAllByRole("link", { name: ruleZeroCopy.notice.open });
    expect(opens.map((l) => l.getAttribute("href"))).toEqual([`/friends/table/${A}`, `/friends/table/${B}`]);
  });

  it("draws the host and pod as marked, semibold names inside the plain sentence", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    const marked = toastOf(A)!.querySelectorAll(".ph-no-capture");
    expect([...marked].map((e) => e.textContent)).toEqual(["Colin", "Thursday night"]);
    for (const e of marked) expect(e.parentElement!.className).toContain("font-semibold");
  });

  it("holds a polite live region from the start, so a toast mounted into it is announced", async () => {
    m.read.mockResolvedValue([]);
    await mount();
    const region = document.querySelector("[data-seat-notice-stack]")!;
    expect(region.getAttribute("role")).toBe("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("false");
    expect(region.children).toHaveLength(0);
  });

  it("the ✕ marks that table's notice seen and removes that toast only, moving focus to the next toast's ✕", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night"), notice(B, "Max", "Sunday crew")]);
    await mount();
    const closes = screen.getAllByRole("button", { name: ruleZeroCopy.close.dismiss });
    expect(closes).toHaveLength(2);
    closes[0]!.focus();
    await act(async () => fireEvent.click(closes[0]!));
    expect(m.mark).toHaveBeenCalledTimes(1);
    expect(m.mark).toHaveBeenCalledWith(A);
    expect(toastOf(A)).toBeNull();
    expect(toastText(B)).toContain(sentenceOf("Max", "Sunday crew"));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: ruleZeroCopy.close.dismiss }));
  });

  it("the last ✕ leaves focus on the stack, not on the page's start", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    const close = screen.getByRole("button", { name: ruleZeroCopy.close.dismiss });
    close.focus();
    await act(async () => fireEvent.click(close));
    expect(document.activeElement).toBe(document.querySelector("[data-seat-notice-stack]"));
  });

  it("Open marks the notice seen and keeps it from coming back on a read that still lists it", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    await act(async () => fireEvent.click(screen.getByRole("link", { name: ruleZeroCopy.notice.open })));
    expect(m.mark).toHaveBeenCalledWith(A);
    expect(toastOf(A)).toBeNull();
    await focus();
    expect(toastOf(A)).toBeNull();
  });

  it("a dismissed table does not come back on a later read that still lists it", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.close.dismiss })));
    await focus();
    expect(toastOf(A)).toBeNull();
  });

  it("a dismissed table comes back when a read lists it with a newer since (a re-seat)", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night", 1000)]);
    await mount();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: ruleZeroCopy.close.dismiss })));
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night", 2000)]);
    await focus();
    expect(toastText(A)).toContain(sentenceOf("Colin", "Thursday night"));
  });

  it("draws nothing on Home, and refreshes Home when a notice arrives there", async () => {
    m.path = "/";
    m.read.mockResolvedValueOnce([]);
    await mount();
    expect(m.refresh).not.toHaveBeenCalled();
    m.read.mockResolvedValueOnce([notice(A, "Colin", "Thursday night")]);
    await focus();
    expect(toastOf(A)).toBeNull();
    expect(m.refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh Home for a table Home already drew when it opened", async () => {
    m.path = "/";
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night")]);
    await mount();
    await focus();
    expect(m.refresh).not.toHaveBeenCalled();
  });

  it("is not drawn on that table's own page, but still is for another table", async () => {
    m.path = `/friends/table/${A}`;
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night"), notice(B, "Max", "Sunday crew")]);
    await mount();
    expect(toastOf(A)).toBeNull();
    expect(toastText(B)).toContain(sentenceOf("Max", "Sunday crew"));
  });

  it("stacks notices oldest seat first (newest nearest the edge) whatever order the read returns them in", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night", 3000), notice(B, "Max", "Sunday crew", 1000)]);
    await mount();
    const order = [...document.querySelectorAll("[data-seat-notice]")].map((e) => e.getAttribute("data-seat-notice"));
    expect(order).toEqual([B, A]);
  });

  it("arriving on a table's page by any route drops only that table's toast, marks nothing itself, and it stays gone after leaving", async () => {
    m.read.mockResolvedValue([notice(A, "Colin", "Thursday night"), notice(B, "Max", "Sunday crew")]);
    const view = await mount();
    expect(toastOf(A)).not.toBeNull();
    m.path = `/friends/table/${A}`;
    view.rerender(<SeatNoticeHost />);
    await act(async () => {});
    m.path = "/decks";
    view.rerender(<SeatNoticeHost />);
    await act(async () => {});
    expect(toastOf(A)).toBeNull();
    expect(toastText(B)).toContain(sentenceOf("Max", "Sunday crew"));
    await focus();
    expect(toastOf(A)).toBeNull();
    expect(m.mark).not.toHaveBeenCalled();
  });

  it("a tab return that fires focus and visibilitychange together reads once", async () => {
    m.read.mockResolvedValue([]);
    await mount();
    expect(m.read).toHaveBeenCalledTimes(1);
    tick();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(m.read).toHaveBeenCalledTimes(2);
  });

  it("a seat push handed over by the service worker reads again and draws the new toast", async () => {
    m.read.mockResolvedValueOnce([]);
    await mount();
    expect(toastOf(A)).toBeNull();
    m.read.mockResolvedValueOnce([notice(A, "Colin", "Thursday night")]);
    await act(async () => swHandler?.({ data: { type: SW_MESSAGE } }));
    await waitFor(() => expect(toastText(A)).toContain(sentenceOf("Colin", "Thursday night")));
  });

  it("ignores a message that is not a seat push", async () => {
    m.read.mockResolvedValue([]);
    await mount();
    expect(m.read).toHaveBeenCalledTimes(1);
    await act(async () => swHandler?.({ data: { type: "something-else" } }));
    expect(m.read).toHaveBeenCalledTimes(1);
  });
});
