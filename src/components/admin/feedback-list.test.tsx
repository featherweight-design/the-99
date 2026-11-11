// The Feedback tab (flyer trial, admin Feedback PR B): pills and counts, the summary line, each row kind, the empty
// stand-ins, a signed-out row, the privacy class on every name and free-text node, a hostile answer drawn as text, the
// unread dot (clears and decrements on a press, reverts on a failure) and Load more.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedbackRead } from "../../lib/admin/feedback";
import type { FeedbackRow } from "../../lib/admin/feedback-rule";

vi.mock("../../app/admin/feedback/actions", () => ({ markRead: (id: unknown) => markRead(id), loadMore: (f: unknown, o: unknown) => loadMore(f, o) }));
const markRead = vi.fn<(id: unknown) => Promise<{ ok: boolean }>>();
const loadMore = vi.fn<(f: unknown, o: unknown) => Promise<{ ok: true; rows: FeedbackRow[]; hasMore: boolean } | { ok: false }>>();

const { FeedbackList } = await import("./feedback-list");
const NOW = Date.parse("2026-11-10T12:00:00Z");
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const problem = (over: Partial<FeedbackRow> = {}): FeedbackRow => ({
  id: ID(1), kind: "problem", name: "Rosa", group: "mox-boston", at: iso(2 * 3_600_000), unread: true,
  page: "/decks/thopter-works", device: "iPhone · Safari", digest: "a81f3c2e", source: "error",
  answers: { what: "The deck page went blank.", doing: "Trying Suggested changes." }, ...over,
});
const checkIn = (over: Partial<FeedbackRow> = {}): FeedbackRow => ({
  id: ID(2), kind: "check_in", name: "Jun", group: "mox-boston", at: iso(5 * 3_600_000), unread: false,
  page: null, device: null, digest: null, source: null,
  answers: { rating: 4, uses: ["Decks", "Shopping"], pod: "Already have", note: "Wish I could see the precon." }, ...over,
});
const READ = (rows: FeedbackRow[], over: Partial<FeedbackRead> = {}): FeedbackRead => ({
  rows, counts: { all: 14, problem: 6, check_in: 8 }, fresh: 2, avg: 4.16, hasMore: false, ...over,
});
const view = (read: FeedbackRead, filter: "all" | "problem" | "check_in" = "all") => render(<FeedbackList filter={filter} read={read} nowMs={NOW} />);
const rowOf = (id: string) => document.querySelector<HTMLElement>(`[data-feedback="${id}"]`)!;

beforeEach(() => {
  markRead.mockReset().mockResolvedValue({ ok: true });
  loadMore.mockReset();
});

describe("FeedbackList", () => {
  it("draws the pills with counts, the current one marked, and links that set the filter", () => {
    view(READ([problem()]), "problem");
    const nav = screen.getByRole("navigation", { name: "Filter feedback" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["All14", "Problems6", "Check-ins8"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin/feedback", "/admin/feedback?filter=problem", "/admin/feedback?filter=check_in"]);
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, "page", null]);
  });

  it("words the summary with the average to one place, and drops the average when there are no check-ins", () => {
    const { unmount } = view(READ([problem()]));
    expect(screen.getByTestId("feedback-summary")).toHaveTextContent("2 new · check-ins average 4.2 of 5");
    unmount();
    view(READ([problem()], { avg: null }));
    expect(screen.getByTestId("feedback-summary")).toHaveTextContent("2 new");
    expect(screen.getByTestId("feedback-summary")).not.toHaveTextContent("average");
  });

  it("draws a problem row: name, kind, group, time, both answers and the context chips in order", () => {
    view(READ([problem()]));
    const row = rowOf(ID(1));
    expect(within(row).getByText("Rosa")).toBeInTheDocument();
    expect(within(row).getByText("Problem")).toBeInTheDocument();
    expect(within(row).getByText("mox-boston")).toBeInTheDocument();
    expect(within(row).getByText("2h ago")).toBeInTheDocument();
    expect(within(row).getByText("What happened").nextElementSibling).toHaveTextContent("The deck page went blank.");
    expect(within(row).getByText("What I was doing").nextElementSibling).toHaveTextContent("Trying Suggested changes.");
    const chips = [...row.querySelectorAll("[data-feedback-chips] > span")].map((c) => c.textContent);
    expect(chips).toEqual(["/decks/thopter-works", "error a81f3c2e", "iPhone · Safari", "from the error screen"]);
  });

  it("says `from About` for the About source, and draws no chip for a source or field it lacks", () => {
    view(READ([problem({ source: "about", digest: null }), problem({ id: ID(3), source: "report", page: null, digest: null, device: null })]));
    expect(screen.getByText("from About")).toBeInTheDocument();
    expect(screen.queryByText(/error [0-9a-f]{8}/)).toBeNull();
    expect(rowOf(ID(3)).querySelector("[data-feedback-chips] > span")).toBeNull();
  });

  it("draws `not given` for an empty problem answer", () => {
    view(READ([problem({ answers: { what: "It broke.", doing: "" } })]));
    expect(screen.getByText("not given")).toBeInTheDocument();
  });

  it("draws a check-in row with its rating, uses, pod and note, and no context chips", () => {
    view(READ([checkIn()]));
    const row = rowOf(ID(2));
    expect(within(row).getByText("Check-in")).toBeInTheDocument();
    expect(within(row).getByText("Working for you").nextElementSibling).toHaveTextContent("4 of 5");
    expect(within(row).getByText("Uses most").nextElementSibling).toHaveTextContent("Decks, Shopping");
    expect(within(row).getByText("Tell the pod").nextElementSibling).toHaveTextContent("Already have");
    expect(within(row).getByText("Anything else").nextElementSibling).toHaveTextContent("Wish I could see the precon.");
    expect(row.querySelector("[data-feedback-chips] > span")).toBeNull();
  });

  it("draws a dash for each empty check-in answer", () => {
    view(READ([checkIn({ answers: { rating: null, uses: [], pod: "", note: "" } })]));
    for (const label of ["Working for you", "Uses most", "Tell the pod", "Anything else"]) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent("—");
    }
  });

  it("labels a signed-out row and draws no group chip on it", () => {
    view(READ([problem({ name: null, group: "mox-boston" })]));
    const row = rowOf(ID(1));
    expect(within(row).getByText("Signed out")).toBeInTheDocument();
    expect(within(row).queryByText("mox-boston")).toBeNull();
  });

  it("marks every name and free-text node ph-no-capture", () => {
    view(READ([problem(), checkIn(), problem({ id: ID(4), name: null })]));
    const captured = (el: HTMLElement) => el.closest(".ph-no-capture") !== null;
    for (const t of ["Rosa", "Jun", "Signed out", "mox-boston"]) for (const el of screen.getAllByText(t)) expect(captured(el)).toBe(true);
    for (const t of ["The deck page went blank.", "Trying Suggested changes.", "Decks, Shopping", "Already have", "Wish I could see the precon."]) {
      expect(captured(screen.getAllByText(t)[0])).toBe(true);
    }
    for (const el of screen.getAllByText("/decks/thopter-works")) expect(captured(el)).toBe(true);
  });

  it("draws a hostile answer as literal text and creates no element from it", () => {
    const evil = "<img src=x onerror=alert(1)> <a href=\"https://x.test\">click</a> **bold** https://x.test";
    view(READ([problem({ answers: { what: evil, doing: evil } })]));
    const row = rowOf(ID(1));
    expect(row.querySelector("img")).toBeNull();
    expect(row.querySelector("a")).toBeNull();
    expect(within(row).getByText("What happened").nextElementSibling!.textContent).toBe(evil);
    expect(within(row).getByText("What happened").nextElementSibling!.children).toHaveLength(0);
  });

  it("carries no account id, address or Clerk id in the markup", () => {
    const { container } = view(READ([problem(), checkIn()]));
    expect(container.innerHTML).not.toMatch(/user_|@/);
  });

  it("clears the dot and decrements the count on a press, and sends the row's own id once", async () => {
    view(READ([problem()]));
    expect(rowOf(ID(1)).hasAttribute("data-unread")).toBe(true);
    await act(async () => fireEvent.click(within(rowOf(ID(1))).getByRole("button", { name: "New. Mark as read" })));
    expect(markRead).toHaveBeenCalledTimes(1);
    expect(markRead).toHaveBeenCalledWith(ID(1));
    expect(rowOf(ID(1)).hasAttribute("data-unread")).toBe(false);
    expect(within(rowOf(ID(1))).queryByRole("button")).toBeNull();
    expect(screen.getByTestId("feedback-summary")).toHaveTextContent("1 new");
    // A press on the row after it is read sends nothing.
    await act(async () => fireEvent.click(rowOf(ID(1))));
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it("opens an unread row on a press anywhere on it, and does nothing for a read one", async () => {
    view(READ([problem(), checkIn()]));
    await act(async () => fireEvent.click(rowOf(ID(2))));
    expect(markRead).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(within(rowOf(ID(1))).getByText("Rosa")));
    expect(markRead).toHaveBeenCalledWith(ID(1));
  });

  it("puts the dot and the count back when the write is refused or throws", async () => {
    markRead.mockResolvedValueOnce({ ok: false });
    view(READ([problem(), problem({ id: ID(5), name: "Colin" })]));
    await act(async () => fireEvent.click(rowOf(ID(1))));
    expect(rowOf(ID(1)).hasAttribute("data-unread")).toBe(true);
    expect(screen.getByTestId("feedback-summary")).toHaveTextContent("2 new");
    markRead.mockRejectedValueOnce(new Error("network"));
    await act(async () => fireEvent.click(rowOf(ID(5))));
    expect(rowOf(ID(5)).hasAttribute("data-unread")).toBe(true);
    // A retry after a revert sends again.
    await act(async () => fireEvent.click(rowOf(ID(1))));
    expect(markRead).toHaveBeenCalledTimes(3);
    expect(rowOf(ID(1)).hasAttribute("data-unread")).toBe(false);
  });

  it("draws no Load more without more rows, and appends the next page from the rows already drawn", async () => {
    const { unmount } = view(READ([problem()]));
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    unmount();
    loadMore.mockResolvedValueOnce({ ok: true, rows: [checkIn()], hasMore: false });
    view(READ([problem()], { hasMore: true }), "problem");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Load more" })));
    expect(loadMore).toHaveBeenCalledWith("problem", 1);
    expect(rowOf(ID(2))).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("says so, and keeps the button, when Load more fails", async () => {
    loadMore.mockResolvedValueOnce({ ok: false });
    view(READ([problem()], { hasMore: true }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Load more" })));
    expect(screen.getByText("Couldn’t load more. Try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more" })).toBeInTheDocument();
  });

  it("draws the empty line and no list when there are no rows", () => {
    view(READ([], { counts: { all: 0, problem: 0, check_in: 0 }, fresh: 0, avg: null }));
    expect(screen.getByText("No feedback yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
