import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const load = vi.hoisted(() => vi.fn());
const mirror = vi.hoisted(() => vi.fn());
vi.mock("../../app/announcements/actions", () => ({ loadArchivePageAction: load }));
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: mirror }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => null }));

import { ArchiveView } from "./archive-view";
import { stubViewport } from "../../test-utils/stub-viewport";
import { toMonthCounts } from "../../lib/announcements/archive-model";
import type { FeedView } from "../../lib/feed/home";

const NOW = "2026-11-08T12:00:00.000Z";
const post = (n: number, at: string, o: Partial<FeedView> = {}): FeedView => ({
  key: `post:c${n}`, kind: "wizards-news", at, unseen: false, card: null, friend: null, href: null, opens: null, outbound: `/out/wizards/c${n}`,
  post: { title: `Post ${n}`, summary: `Summary ${n}`, hero: null, lists: null }, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
});
const counts = toMonthCounts([
  { ym: "2026-11", kind: "wizards-news", n: 1 },
  { ym: "2026-10", kind: "secret-lair", n: 1 },
  { ym: "2026-10", kind: "commander-decklists", n: 1 },
  { ym: "2025-02", kind: "commander-decklists", n: 2 },
  { ym: "2015-09", kind: "wizards-news", n: 1 },
]);
const first = { items: [post(1, "2026-11-03T10:00:00Z"), post(2, "2026-10-28T10:00:00Z", { kind: "secret-lair" }), post(3, "2026-10-14T10:00:00Z", { kind: "commander-decklists", post: { title: "Post 3", summary: "S", hero: null, lists: { n: 2, of: 4 } }, href: "/decks/precons?x" })], next: "2026-10-14 10:00:00+00|00000000-0000-4000-8000-000000000003" };
const view = (o: Partial<Parameters<typeof ArchiveView>[0]> = {}) => render(<ArchiveView kind="all" anchor={null} page={first} counts={counts} now={NOW} {...o} />);

beforeEach(() => {
  load.mockReset();
  mirror.mockReset();
});

describe("ArchiveView", () => {
  it("titles the page and computes its sub line from the data, not a drawn year", () => {
    view();
    expect(screen.getByRole("heading", { level: 1, name: "Announcements" })).toBeInTheDocument();
    expect(screen.getByText("6 posts from Wizards since 2015")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("href", "/");
  });

  it("draws month heads with their counts, rows in the shipped seen ink with the date and no ✕", () => {
    const { container } = view();
    const heads = [...container.querySelectorAll("[data-archive-month]")].map((h) => h.textContent);
    expect(heads).toEqual(["November 2026· 1", "October 2026· 2"]);
    const rows = container.querySelectorAll("[data-feed-item]");
    expect(rows).toHaveLength(3);
    expect(container.querySelector("[data-feed-unseen]")).toBeNull();
    expect(container.querySelector("[data-unseen]")).toBeNull();
    expect(screen.queryByRole("button", { name: /Hide/ })).toBeNull();
    expect(within(rows[0] as HTMLElement).getByText("Nov 3")).toBeInTheDocument();
    expect(container.querySelector("[data-feed-age]")!.textContent).toBe("Nov 3");
  });

  it("takes the post-glyph plate for a post with no hero, and a decklists post keeps its count and both presses", () => {
    const { container } = view();
    expect(container.querySelectorAll("[data-feed-post-plate]")).toHaveLength(3);
    expect(screen.getByText("2 of 4 lists so far")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the lists ›" })).toHaveAttribute("href", "/decks/precons?x");
    expect(screen.getByRole("link", { name: /Read the post/ })).toHaveAttribute("href", "/out/wizards/c3");
  });

  it("names the kinds in short at a phone and in full from md, and marks the chosen one", () => {
    view();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual(["All", "Secret Lair", "Commander decklists", "Wizards news"]);
    expect(radios.map((r) => r.querySelector(".md\\:hidden")?.textContent)).toEqual(["All", "Secret Lair", "Decklists", "News"]);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
  });

  it("shows the foot's count of the total and loads the next page in place on Show older, appending below", async () => {
    load.mockResolvedValue({ items: [post(4, "2025-02-10T10:00:00Z", { kind: "commander-decklists" })], next: null });
    const { container } = view();
    expect(screen.getByText("3 of 6")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show older" }));
    expect(container.querySelector("[data-archive-loading]")).not.toBeNull();
    await waitFor(() => expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(4));
    expect(load).toHaveBeenCalledWith("all", first.next);
    expect(screen.queryByRole("button", { name: "Show older" })).toBeNull();
    expect([...container.querySelectorAll("[data-archive-month]")].map((h) => h.getAttribute("data-archive-month"))).toEqual(["2026-11", "2026-10", "2025-02"]);
  });

  it("keeps the rows and says it failed when a page does not load, then Try again reads it", async () => {
    load.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ items: [post(4, "2025-02-10T10:00:00Z")], next: null });
    const { container } = view();
    fireEvent.click(screen.getByRole("button", { name: "Show older" }));
    expect(await screen.findByText("We couldn’t load older posts.")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(4));
    expect(screen.queryByText("We couldn’t load older posts.")).toBeNull();
  });

  it("treats a switched-off action (null) as a failed page", async () => {
    load.mockResolvedValue(null);
    view();
    fireEvent.click(screen.getByRole("button", { name: "Show older" }));
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("flips a kind in place, writes the address through mirrorUrl, and serves a held kind without reading again", async () => {
    load.mockResolvedValue({ items: [post(3, "2026-10-14T10:00:00Z", { kind: "commander-decklists" })], next: null });
    const { container } = view();
    fireEvent.click(screen.getByRole("radio", { name: "Commander decklists" }));
    expect(mirror).toHaveBeenLastCalledWith(`${window.location.pathname}?kind=commander-decklists`);
    expect(load).toHaveBeenCalledWith("commander-decklists", null);
    await waitFor(() => expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(1));
    // The month head counts that kind.
    expect(container.querySelector("[data-archive-month]")!.textContent).toBe("October 2026· 1");
    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(3);
    expect(load).toHaveBeenCalledTimes(1);
    expect(mirror).toHaveBeenLastCalledWith(window.location.pathname);
  });

  it("opens the jump sheet with years and months and their counts, empty months dashed and inert under a kind", () => {
    view({ kind: "commander-decklists", page: { items: [first.items[2]], next: null } });
    fireEvent.click(screen.getByRole("button", { name: /jump to a month/ }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: /2026/ })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: /^Oct\s*1$/ })).toBeEnabled();
    // November is empty under this kind in both open years (2026 and 2025).
    const novs = within(sheet).getAllByRole("button", { name: /^Nov\s*0$/ });
    const nov = novs[0];
    for (const n of novs) expect(n).toBeDisabled();
    expect(nov.className).toContain("dashed");
    // Older years fold to one line until pressed; the two newest start open.
    expect(within(sheet).getByRole("button", { name: /2015/ })).toHaveAttribute("aria-expanded", "false");
    expect(within(sheet).getByRole("heading", { name: /2025/ })).toBeInTheDocument();
    // The current year lists its months only through the current month: the one Dec is 2025's, not 2026's.
    expect(within(sheet).getAllByRole("button", { name: /^Dec/ })).toHaveLength(1);
    // Empty months take the disabled ink.
    expect(nov.className).toContain("var(--fg-disabled)");
  });

  it("draws the grabber on the 390 sheet, and none on the md popover", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: /jump to a month/ }));
    const sheet = screen.getByRole("dialog");
    const g = sheet.querySelector("[data-sheet-grabber]");
    expect(g).not.toBeNull();
    expect(g!.className).toContain("md:hidden");
    expect(g!.firstElementChild!.className).toContain("w-[40px]");
    expect(g!.nextElementSibling).not.toBeNull();
  });

  it("draws the current month with the accent border and a 10% accent fill", () => {
    view({ anchor: "2026-10", page: { items: [first.items[1]], next: null } });
    fireEvent.click(screen.getByRole("button", { name: /jump to a month/ }));
    const oct = within(screen.getByRole("dialog")).getByRole("button", { name: /^Oct\s*2$/ });
    expect(oct).toHaveAttribute("aria-current", "date");
    expect(oct.className).toContain("border:1px_solid_var(--accent)");
    expect(oct.className).toContain("color-mix(in_srgb,var(--accent)_10%,transparent)");
  });

  it("opens the jump as a 340px popover anchored to its button from md, and a press outside closes it", () => {
    stubViewport(1024);
    view();
    fireEvent.click(screen.getByRole("button", { name: /jump to a month/ }));
    const pop = screen.getByRole("dialog");
    expect(pop.className).toContain("w-[340px]");
    expect(pop.className).toContain("fixed");
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
    vi.restoreAllMocks();
  });

  it("jumps to a month: the list starts from it, the address says so, the newest month is no month", async () => {
    load.mockResolvedValue({ items: [post(5, "2025-02-20T10:00:00Z", { kind: "commander-decklists" })], next: null });
    const { container } = view();
    fireEvent.click(screen.getByRole("button", { name: /jump to a month/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Feb\s*2$/ }));
    expect(load).toHaveBeenCalledWith("all", "2025-03-01 00:00:00+00|00000000-0000-0000-0000-000000000000");
    expect(mirror).toHaveBeenLastCalledWith(`${window.location.pathname}?m=2025-02`);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(container.querySelector("[data-archive-month]")!.getAttribute("data-archive-month")).toBe("2025-02"));
  });

  it("says a kind has none in the month it is parked on, and goes to the nearest month that has one", async () => {
    load.mockResolvedValue({ items: [post(6, "2025-02-20T10:00:00Z", { kind: "commander-decklists" })], next: null });
    view({ kind: "commander-decklists", anchor: "2025-03", page: { items: [], next: null } });
    expect(screen.getByText("No Commander decklists in March 2025.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to February 2025 ›" }));
    expect(load).toHaveBeenCalledWith("commander-decklists", "2025-03-01 00:00:00+00|00000000-0000-0000-0000-000000000000");
    expect(mirror).toHaveBeenLastCalledWith(`${window.location.pathname}?kind=commander-decklists&m=2025-02`);
  });

  it("flipping kind while parked on a month the new kind never posted in draws the empty line without reading", () => {
    view({ anchor: "2025-03", page: { items: [post(7, "2025-03-04T10:00:00Z")], next: null } });
    fireEvent.click(screen.getByRole("radio", { name: "Commander decklists" }));
    expect(screen.getByText("No Commander decklists in March 2025.")).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it("reads Show older once for a double press and never appends the same post twice", async () => {
    let done!: (v: unknown) => void;
    load.mockReturnValue(new Promise((r) => { done = r; }));
    const { container } = view();
    const older = screen.getByRole("button", { name: "Show older" });
    fireEvent.click(older);
    fireEvent.click(older);
    expect(load).toHaveBeenCalledTimes(1);
    // The page repeats a row already held (the list moved under the reader): it is not drawn twice.
    done({ items: [first.items[2], post(4, "2025-02-10T10:00:00Z")], next: null });
    await waitFor(() => expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(4));
  });

  it("keeps the pages a reader loaded when the same view is served again", async () => {
    load.mockResolvedValue({ items: [post(4, "2025-02-10T10:00:00Z")], next: null });
    const { container, rerender } = view();
    fireEvent.click(screen.getByRole("button", { name: "Show older" }));
    await waitFor(() => expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(4));
    rerender(<ArchiveView kind="all" anchor={null} page={{ ...first }} counts={counts} now={NOW} />);
    expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(4);
  });

  it("retries a kind whose first read failed when it is entered again", async () => {
    load.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ items: [post(3, "2026-10-14T10:00:00Z", { kind: "commander-decklists" })], next: null });
    const { container } = view();
    fireEvent.click(screen.getByRole("radio", { name: "Commander decklists" }));
    expect(await screen.findByText("We couldn’t load announcements.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "All" }));
    fireEvent.click(screen.getByRole("radio", { name: "Commander decklists" }));
    expect(load).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(container.querySelectorAll("[data-feed-item]")).toHaveLength(1));
  });

  it("draws an empty month's head with no count, and no jump when there is no post at all", () => {
    const { container, unmount } = view({ kind: "commander-decklists", anchor: "2025-03", page: { items: [], next: null } });
    expect(container.querySelector("[data-archive-month]")!.textContent).toBe("March 2025");
    unmount();
    view({ counts: {}, page: { items: [], next: null } });
    expect(screen.queryByRole("button", { name: /jump to a month/ })).toBeNull();
  });

  it("names the order beside the jump at a phone, and keeps Show older at 44px at every width", () => {
    const { container } = view();
    expect(container.querySelector("[data-archive-order]")!.textContent).toBe("newest first");
    const older = screen.getByRole("button", { name: "Show older" });
    expect(older.className).toContain("min-h-[44px]");
    expect(older.className).not.toContain("md:min-h");
  });
});
