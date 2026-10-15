import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ArrivalsBannerData, BannerLine } from "../../lib/precons/banner";

const dismiss = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../../app/arrivals-actions", () => ({ dismissArrivals: dismiss }));

const { ArrivalsBanner, COLLAPSE_MS, HOME_HEADING_ID } = await import("./arrivals-banner");
const { Dashboard } = await import("./dashboard");

const TRC: BannerLine = { kind: "set", code: "trc", name: "Star Trek Commander", revealed: 15 };
const FRC: BannerLine = { kind: "lists", code: "frc", name: "Reality Fracture Commander", count: 4 };
const one = (line: BannerLine, keys: string[]): ArrivalsBannerData => ({
  lines: [line],
  href: line.kind === "set" ? "/decks/precons?sort=newest#announced" : "/decks/precons?sort=newest#precons-2026",
  keys,
});
const many = (n: number): ArrivalsBannerData => ({
  lines: Array.from({ length: n }, (_, i): BannerLine => ({ kind: "set", code: `s${i}x`, name: `Set ${i}`, revealed: i })),
  href: "/decks/precons?sort=newest#announced",
  keys: Array.from({ length: n }, (_, i) => `s${i}x`),
});

const DASH = {
  stats: { totalCards: 1284, uniqueCards: 900 },
  lastUpdated: null,
  ready: { shown: [], moreCount: 0, floor: null },
  inUse: new Map(),
  decks: [],
  commitments: null,
  shopping: { byDeck: new Map(), total: { copies: 0, cents: 0, pricedCopies: 0 } },
  now: "2026-10-14T12:00:00.000Z",
};

const region = () => screen.queryByRole("region", { name: "New in the app" });

let reduce = false;
beforeEach(() => {
  dismiss.mockClear();
  reduce = false;
  vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({
    matches: q.includes("reduce") ? reduce : false,
    media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  }) as MediaQueryList);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ArrivalsBanner, one arrival", () => {
  it("says a set is announced in one sentence, with one link to the Announced group (H2)", () => {
    render(<ArrivalsBanner data={one(TRC, ["trc"])} />);
    const r = region()!;
    expect(r.tagName).toBe("SECTION");
    expect(r).toHaveTextContent("Star Trek Commander is announced, with 15 commanders revealed.");
    expect(within(r).getByRole("link", { name: "See it in Precons" })).toHaveAttribute("href", "/decks/precons?sort=newest#announced");
    expect(within(r).getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("rolls a set's decklists into one line, linked to its year (H3)", () => {
    render(<ArrivalsBanner data={one(FRC, ["frc", "lists:frc"])} />);
    expect(region()).toHaveTextContent("Reality Fracture Commander: 4 decklists listed.");
    expect(screen.getByRole("link", { name: "See them in Precons" })).toHaveAttribute("href", "/decks/precons?sort=newest#precons-2026");
  });

  it("is a labelled region, never an alert or a live region, and tabs to the link before ✕ (H8)", () => {
    const { container } = render(<ArrivalsBanner data={one(TRC, ["trc"])} />);
    expect(container.querySelector("[role=alert], [aria-live]")).toBeNull();
    const [link, close] = [screen.getByRole("link"), screen.getByRole("button", { name: "Dismiss" })];
    expect(link.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws ✕ at 32 at desktop and 44 at 390, with the accent focus ring", () => {
    render(<ArrivalsBanner data={one(TRC, ["trc"])} />);
    const close = screen.getByRole("button", { name: "Dismiss" });
    expect(close.className).toMatch(/\bh-\[44px\]/);
    expect(close.className).toMatch(/\bw-\[44px\]/);
    expect(close.className).toMatch(/sm:h-\[32px\]/);
    expect(close.className).toMatch(/sm:w-\[32px\]/);
    for (const el of [close, screen.getByRole("link")]) {
      expect(el.className).toContain("focus-visible:outline-2");
      expect(el.className).toContain("focus-visible:outline-offset-2");
      expect(el.className).toContain("focus-visible:outline-[color:var(--accent)]");
    }
  });
});

describe("ArrivalsBanner, several arrivals (H4)", () => {
  it("heads them with the count and caps the lines as the About sheet does", () => {
    render(<ArrivalsBanner data={many(5)} />);
    const r = region()!;
    expect(within(r).getByRole("heading", { name: "5 new in Commander precons" })).toBeInTheDocument();
    const items = within(r).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "Set 0 is announced.",
      "Set 1 is announced, with 1 commander revealed.",
      "Set 2 is announced, with 2 commanders revealed.",
      "and 2 more",
    ]);
    expect(within(r).getAllByRole("link")).toHaveLength(1);
    expect(within(r).getAllByRole("button")).toHaveLength(1);
  });

  it("shows four in full, so `and 1 more` never prints", () => {
    render(<ArrivalsBanner data={many(4)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByText(/more$/)).toBeNull();
  });
});

describe("ArrivalsBanner, ✕", () => {
  it("writes the keys it drew, collapses in 160ms and moves focus to Home's h1 (H6, H8)", () => {
    vi.useFakeTimers();
    render(<Dashboard {...DASH} arrivals={one(FRC, ["frc", "lists:frc"])} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledWith(["frc", "lists:frc"]);
    const wrap = document.querySelector("[data-arrivals-banner]")!;
    expect(wrap.getAttribute("data-arrivals-banner")).toBe("closing");
    expect(wrap.className).toContain("grid-rows-[0fr]");
    act(() => vi.advanceTimersByTime(COLLAPSE_MS - 1));
    expect(region()).not.toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(region()).toBeNull();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.id).toBe(HOME_HEADING_ID);
    expect(document.activeElement).toBe(h1);
  });

  it("closes at once under reduced motion", () => {
    vi.useFakeTimers();
    reduce = true;
    render(<Dashboard {...DASH} arrivals={one(TRC, ["trc"])} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    act(() => vi.advanceTimersByTime(0));
    expect(region()).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
  });

  it("stays closed when Home re-mounts the same payload in this document", () => {
    vi.useFakeTimers();
    const data = one(TRC, ["trc", "remount"]);
    const first = render(<ArrivalsBanner data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    act(() => vi.advanceTimersByTime(COLLAPSE_MS));
    first.unmount();
    render(<ArrivalsBanner data={data} />);
    expect(region()).toBeNull();
  });

  it("draws the banner again in this document when the write fails, though it closed at once", async () => {
    vi.useFakeTimers();
    dismiss.mockRejectedValueOnce(new Error("offline"));
    const data = one(TRC, ["trc", "failed-write"]);
    const first = render(<ArrivalsBanner data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(document.querySelector("[data-arrivals-banner]")?.getAttribute("data-arrivals-banner")).toBe("closing");
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(COLLAPSE_MS);
    });
    expect(region()).toBeNull();
    first.unmount();
    render(<ArrivalsBanner data={data} />);
    expect(region()).not.toBeNull();
  });

  it("draws a new batch of arrivals after an earlier one was dismissed, in the same Home", () => {
    vi.useFakeTimers();
    const view = render(<Dashboard {...DASH} arrivals={one(TRC, ["trc", "batch-1"])} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    act(() => vi.advanceTimersByTime(COLLAPSE_MS));
    expect(region()).toBeNull();
    view.rerender(<Dashboard {...DASH} arrivals={one(FRC, ["frc", "lists:frc", "batch-2"])} />);
    expect(region()).toHaveTextContent("Reality Fracture Commander: 4 decklists listed.");
  });
});

describe("ArrivalsBanner, a link press", () => {
  it("counts as a dismissal in this document: Back to Home re-mounts it closed (a Precons visit marks seen)", () => {
    const data = one(TRC, ["trc", "followed"]);
    const first = render(<ArrivalsBanner data={data} />);
    fireEvent.click(screen.getByRole("link", { name: "See it in Precons" }));
    expect(dismiss).not.toHaveBeenCalled();
    first.unmount();
    render(<ArrivalsBanner data={data} />);
    expect(region()).toBeNull();
  });
});

describe("Dashboard", () => {
  it("draws no banner and holds no slot without arrivals (H1)", () => {
    const { container } = render(<Dashboard {...DASH} arrivals={null} />);
    expect(region()).toBeNull();
    expect(container.querySelector("[data-arrivals-banner]")).toBeNull();
  });

  it("draws it between the header and Ready to build", () => {
    // Its own keys: a banner dismissed above stays closed for the rest of this module's document.
    const { container } = render(<Dashboard {...DASH} arrivals={one(TRC, ["trc", "placement"])} />);
    const header = container.querySelector("header")!;
    const banner = container.querySelector("[data-arrivals-banner]")!;
    expect(header.nextElementSibling).toBe(banner);
  });
});
