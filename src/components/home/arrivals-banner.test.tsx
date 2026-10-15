import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AboutLine } from "../../lib/about/notice";
import type { ArrivalsBannerData, BannerLine } from "../../lib/precons/banner";

const dismiss = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../../app/arrivals-actions", () => ({ dismissArrivals: dismiss }));
// The checklist's live step needs the app router; About's line is what these tests read.
vi.mock("./first-run-step-one", () => ({ FirstRunStepOne: () => null }));

const { ArrivalsBanner, COLLAPSE_MS, HOME_HEADING_ID } = await import("./arrivals-banner");
const { Dashboard } = await import("./dashboard");
const { acknowledgeAbout, acknowledgeArrivals, resetArrivalsAcknowledged } = await import("./arrivals-seen");
const { FirstRunChecklist } = await import("./first-run");

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
  resetArrivalsAcknowledged();
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
    expect(dismiss).toHaveBeenCalledWith(["frc", "lists:frc"], []);
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

describe("ArrivalsBanner, after a Precons visit in this document", () => {
  it("re-mounts closed once the visit acknowledged the arrivals (Back to Home restores the router's payload)", () => {
    const data = one(TRC, ["trc", "acknowledged"]);
    const first = render(<ArrivalsBanner data={data} />);
    expect(region()).not.toBeNull();
    first.unmount();
    acknowledgeArrivals(["trc", "acknowledged"]);
    render(<ArrivalsBanner data={data} />);
    expect(region()).toBeNull();
  });

  it("still draws an arrival the visit did not cover: lists landing after the set was acknowledged", () => {
    acknowledgeArrivals(["trc2"]);
    render(<ArrivalsBanner data={one(TRC, ["trc2", "lists:trc2"])} />);
    expect(region()).not.toBeNull();
  });

  it("is no acknowledgement by itself: a link press writes nothing, so a re-mount draws it again", () => {
    const data = one(TRC, ["trc", "pressed"]);
    const first = render(<ArrivalsBanner data={data} />);
    fireEvent.click(screen.getByRole("link", { name: "See it in Precons" }));
    expect(dismiss).not.toHaveBeenCalled();
    first.unmount();
    render(<ArrivalsBanner data={data} />);
    expect(region()).not.toBeNull();
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

// About on the banner (plan 2026-10-15, PR A; `R2 - Home-About`, A1–A3).
const behind = (titles: string[], ids = titles.map((t) => t.toLowerCase().replace(/\W+/g, "-"))): AboutLine => ({
  kind: "behind",
  titles,
  ids,
});
const FIRST: AboutLine = { kind: "firstRun", ids: ["browse", "import"] };

describe("ArrivalsBanner, About's line", () => {
  it("names what is new in About in one sentence, with Show me to /about and ✕ (A1)", () => {
    render(<ArrivalsBanner data={null} about={behind(["Commander sets on the way", "Organizing decks into folders"])} />);
    const r = region()!;
    expect(r.tagName).toBe("SECTION");
    expect(r).toHaveTextContent("2 new in About: Commander sets on the way, and Organizing decks into folders.");
    expect(within(r).getByRole("link", { name: "Show me" })).toHaveAttribute("href", "/about");
    expect(within(r).getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(within(r).queryByRole("heading")).toBeNull();
  });

  it("caps the titles as the sheet did: four in full, past four three and `N more`", () => {
    const { unmount } = render(<ArrivalsBanner data={null} about={behind(["A", "B", "C", "D"])} />);
    expect(region()).toHaveTextContent("4 new in About: A, B, C, and D.");
    unmount();
    render(<ArrivalsBanner data={null} about={behind(["A", "B", "C", "D", "E", "F"])} />);
    expect(region()).toHaveTextContent("6 new in About: A, B, C, and 3 more.");
  });

  it("reads one title as one", () => {
    render(<ArrivalsBanner data={null} about={behind(["Commander sets on the way"])} />);
    expect(region()).toHaveTextContent("1 new in About: Commander sets on the way.");
  });

  it("introduces a first-run reader to the page in one line (A3)", () => {
    render(<ArrivalsBanner data={null} about={FIRST} />);
    expect(region()).toHaveTextContent(/What The\s99 does: every mark and figure in the app, and where to find it, on one page\./);
    expect(screen.getByRole("link", { name: "Show me" })).toHaveAttribute("href", "/about");
  });

  it("leads with About beside an arrival, under `New in the app`, each line with its own link (A2)", () => {
    render(<ArrivalsBanner data={one(TRC, ["trc", "a2"])} about={behind(["Commander sets on the way", "Folders"])} />);
    const r = region()!;
    expect(within(r).getByRole("heading", { level: 2, name: "New in the app" })).toBeInTheDocument();
    const items = within(r).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("2 new in About: Commander sets on the way, and Folders. Show me");
    expect(within(items[0]!).getByRole("link", { name: "Show me" })).toHaveAttribute("href", "/about");
    expect(items[1]).toHaveTextContent("Star Trek Commander is announced, with 15 commanders revealed. See it in Precons");
    expect(within(items[1]!).getByRole("link")).toHaveAttribute("href", "/decks/precons?sort=newest#announced");
    expect(within(r).getAllByRole("button", { name: "Dismiss" })).toHaveLength(1);
    expect(r.querySelector("[aria-live], [role=alert]")).toBeNull();
  });

  it("caps several arrivals beside About and closes them with one Precons link", () => {
    render(<ArrivalsBanner data={many(6)} about={behind(["Folders"])} />);
    const items = within(region()!).getAllByRole("listitem");
    // About, three arrivals, and `and 3 more` carrying the link.
    expect(items).toHaveLength(5);
    expect(items[4]).toHaveTextContent("and 3 more See them in Precons");
    expect(within(region()!).getAllByRole("link", { name: /Precons/ })).toHaveLength(1);
  });

  it("one ✕ writes both halves: the arrival keys and About's ids", () => {
    vi.useFakeTimers();
    render(<ArrivalsBanner data={one(TRC, ["trc", "both"])} about={behind(["Folders"], ["folders-both"])} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledWith(["trc", "both"], ["folders-both"]);
    act(() => vi.advanceTimersByTime(COLLAPSE_MS));
    expect(region()).toBeNull();
  });

  it("✕ on About alone writes its ids and no keys, and Back re-mounts it closed", () => {
    vi.useFakeTimers();
    const about = behind(["Folders"], ["folders-back"]);
    const first = render(<ArrivalsBanner data={null} about={about} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledWith([], ["folders-back"]);
    act(() => vi.advanceTimersByTime(COLLAPSE_MS));
    first.unmount();
    render(<ArrivalsBanner data={null} about={about} />);
    expect(region()).toBeNull();
  });

  it("drops About's line after a /about visit in this document, and keeps the arrival", () => {
    const about = behind(["Folders"], ["folders-visit"]);
    acknowledgeAbout(["folders-visit", "browse"]);
    render(<ArrivalsBanner data={one(TRC, ["trc", "visit"])} about={about} />);
    const r = region()!;
    expect(r).not.toHaveTextContent("new in About");
    expect(r).toHaveTextContent("Star Trek Commander is announced");
    expect(within(r).queryByRole("heading")).toBeNull();
  });

  it("draws nothing once a visit answered About and there are no arrivals", () => {
    acknowledgeAbout(["folders-only"]);
    render(<ArrivalsBanner data={null} about={behind(["Folders"], ["folders-only"])} />);
    expect(region()).toBeNull();
  });

  it("is a Show me press, not an acknowledgement: a re-mount draws it again", () => {
    const about = behind(["Folders"], ["folders-press"]);
    const first = render(<ArrivalsBanner data={null} about={about} />);
    fireEvent.click(screen.getByRole("link", { name: "Show me" }));
    expect(dismiss).not.toHaveBeenCalled();
    first.unmount();
    render(<ArrivalsBanner data={null} about={about} />);
    expect(region()).not.toBeNull();
  });

  it("draws no ✕ where it is not closable", () => {
    render(<ArrivalsBanner data={null} about={FIRST} closable={false} />);
    expect(region()).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("lines up with the page's own desktop gutter: 28 on the checklist, 26 on the Dashboard", () => {
    const { unmount } = render(<ArrivalsBanner data={null} about={FIRST} closable={false} gutter="checklist" />);
    expect(region()!.className).toContain("sm:mx-[28px]");
    expect(region()!.className).not.toContain("sm:mx-[26px]");
    unmount();
    render(<ArrivalsBanner data={null} about={FIRST} />);
    expect(region()!.className).toContain("sm:mx-[26px]");
  });
});

describe("About's line on both Home surfaces", () => {
  it("Dashboard draws About alone between the header and Ready to build (A1)", () => {
    const { container } = render(<Dashboard {...DASH} arrivals={null} about={behind(["Folders"], ["folders-dash"])} />);
    expect(container.querySelector("header")!.nextElementSibling).toBe(container.querySelector("[data-arrivals-banner]"));
    expect(region()).toHaveTextContent("1 new in About: Folders.");
  });

  it("Dashboard draws the first-run line for an account that imported before opening /about, with ✕", () => {
    render(<Dashboard {...DASH} arrivals={null} about={{ kind: "firstRun", ids: ["browse", "dash-first"] }} />);
    expect(region()).toHaveTextContent(/What The\s99 does:/);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("the checklist draws About's line with no ✕ and no arrivals (A3)", () => {
    render(<FirstRunChecklist about={{ kind: "firstRun", ids: ["browse", "checklist-first"] }} />);
    expect(region()).toHaveTextContent(/What The\s99 does:/);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("the checklist draws an About line for a reader behind (A1, no ✕), and nothing without one", () => {
    const { unmount } = render(<FirstRunChecklist about={behind(["Folders"], ["checklist-behind"])} />);
    expect(region()).toHaveTextContent("1 new in About: Folders.");
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    unmount();
    render(<FirstRunChecklist />);
    expect(region()).toBeNull();
  });
});
