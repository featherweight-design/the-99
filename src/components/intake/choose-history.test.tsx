import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChooseHistoryPage, ChooseHistoryRow } from "../../lib/intake/history";

const page = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../../app/decks/new/choose/history-actions", () => ({ chooseHistoryPage: page.fn }));

const { ChooseHistory } = await import("./choose-history");

const row = (id: string, at: string, over: Partial<ChooseHistoryRow> = {}): ChooseHistoryRow => ({
  id, at, state: "ok", words: `words ${id}`, thumbs: ["o1", "o2", "o3"], thumbArt: ["https://x/1.jpg", null, "https://x/3.jpg"],
  picks: 9, pool: 164, href: `/decks/new/choose?w=${id}&v=results&r=${id}&h=1`, ...over,
});
const A = row("a", "2026-10-13T21:40:00.000Z");
const B = row("b", "2026-10-02T09:00:00.000Z", { state: "nothing", thumbs: [], thumbArt: [], picks: 0 });
const C = row("c", "2026-09-30T09:00:00.000Z", { picks: 1, thumbs: ["o1"], thumbArt: [null] });
const firstPage = (rows: ChooseHistoryRow[], nextCursor: string | null = null): ChooseHistoryPage => ({ rows, nextCursor });

beforeEach(() => { page.fn.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe("ChooseHistory", () => {
  it("lists runs under month headings as links named by the words, the date and the outcome", () => {
    render(<ChooseHistory layout="view" initial={firstPage([A, B, C])} />);
    const nav = screen.getByRole("navigation", { name: "Past runs" });
    expect(within(nav).getByText("October 2026")).toBeTruthy();
    expect(within(nav).getByText("September 2026")).toBeTruthy();
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([A.href, B.href, C.href]);
    expect(links[0].getAttribute("aria-label")).toBe("words a. October 13, 9 picks.");
    expect(links[1].getAttribute("aria-label")).toBe("words b. October 2, found nothing, no credit used.");
    expect(links[2].getAttribute("aria-label")).toBe("words c. September 30, 1 pick.");
    expect(within(links[1]).getByText("found nothing · no credit used")).toBeTruthy();
    expect(screen.getByText("Kept on your account. Opening a run uses no credit.")).toBeTruthy();
  });

  it("draws three thumbs for a run with picks, with the art where the catalog has it, and none for a run that found nothing", () => {
    const { container } = render(<ChooseHistory layout="view" initial={firstPage([A, B])} />);
    const [first, second] = container.querySelectorAll<HTMLElement>("[data-history-run]");
    const thumbs = first.querySelectorAll<HTMLElement>("span[aria-hidden] > span");
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0].style.backgroundImage).toContain("https://x/1.jpg");
    expect(thumbs[1].style.backgroundImage).toBe("");
    expect(second.querySelectorAll("span[aria-hidden] > span")).toHaveLength(0);
  });

  it("says what will land here when the player has made no read", () => {
    render(<ChooseHistory layout="column" initial={firstPage([])} />);
    expect(screen.getByText("No runs yet")).toBeTruthy();
    expect(screen.getByText("your past runs")).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("offers a retry when the runs failed to read, and lists them once the retry lands", async () => {
    page.fn.mockResolvedValue(firstPage([A]));
    render(<ChooseHistory layout="view" initial={null} />);
    expect(screen.getByText(/didn’t load\. They’re kept/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("link", { name: /words a/ })).toBeTruthy());
    expect(page.fn).toHaveBeenCalledWith(null);
  });

  it("pages with Show 20 more, drops a row it already drew, and removes the press at the end", async () => {
    page.fn.mockResolvedValue(firstPage([A, C], null));
    render(<ChooseHistory layout="view" initial={firstPage([A, B], "cur-1")} />);
    fireEvent.click(screen.getByRole("button", { name: "Show 20 more" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(3));
    expect(page.fn).toHaveBeenCalledWith("cur-1");
    expect(screen.queryByRole("button", { name: "Show 20 more" })).toBeNull();
  });

  it("keeps the rows and says so when a page fails to load, and asks again on the next press", async () => {
    page.fn.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(firstPage([C]));
    render(<ChooseHistory layout="view" initial={firstPage([A], "cur-1")} />);
    fireEvent.click(screen.getByRole("button", { name: "Show 20 more" }));
    await waitFor(() => expect(screen.getByText("Couldn’t load more runs. Try again.")).toBeTruthy());
    expect(screen.getAllByRole("link")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Show 20 more" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
  });

  it("lists a run in flight on top as reading, and settles it in place when the first page is read again", async () => {
    vi.useFakeTimers();
    const live = row("z", "2026-10-14T10:00:00.000Z", { state: "reading", thumbs: [], thumbArt: [], picks: 0 });
    const settled = row("z", "2026-10-14T10:00:00.000Z", { picks: 8 });
    page.fn.mockResolvedValue(firstPage([settled, A]));
    // C is an older row the poll's first page does not reach: it must stay drawn.
    render(<ChooseHistory layout="view" initial={firstPage([live, A, C])} />);
    expect(screen.getByText("reading")).toBeTruthy();
    expect(screen.getByText("now")).toBeTruthy();
    expect(screen.getAllByRole("link")[0].getAttribute("aria-label")).toBe("Running: words z. Opens the run’s waiting panel.");
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(page.fn).toHaveBeenCalledWith(null);
    expect(screen.queryByText("reading")).toBeNull();
    expect(screen.getAllByRole("link")[0].getAttribute("aria-label")).toBe("words z. October 14, 8 picks.");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    // Settled, nothing is read again.
    page.fn.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(page.fn).not.toHaveBeenCalled();
  });

  it("never polls while no run is in flight", async () => {
    vi.useFakeTimers();
    render(<ChooseHistory layout="column" initial={firstPage([A])} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(page.fn).not.toHaveBeenCalled();
  });

  it("draws the column's smaller targets and the view's 44px ones from the same component", () => {
    const col = render(<ChooseHistory layout="column" initial={firstPage([A], "c")} />);
    expect(col.getByRole("button", { name: "Show 20 more" }).className).toContain("min-h-[30px]");
    col.unmount();
    const view = render(<ChooseHistory layout="view" initial={firstPage([A], "c")} />);
    expect(view.getByRole("button", { name: "Show 20 more" }).className).toContain("min-h-[44px]");
    expect(view.container.textContent).toContain("›");
  });
});
