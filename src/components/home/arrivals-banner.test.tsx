import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AboutLaunch, AboutLine } from "../../lib/about/notice";
import type { ArrivalsBannerData, BannerLine } from "../../lib/precons/banner";

const dismiss = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../../app/arrivals-actions", () => ({ dismissArrivals: dismiss }));
// The checklist's live step needs the app router; About's line is what these tests read.
vi.mock("./first-run-step-one", () => ({ FirstRunStepOne: () => null }));
vi.mock("../discovery/home-tour", () => ({ HomeTour: () => null }));
// The crops' theme check asks the server again through the router (`ThemeRefresh`).
const nav = vi.hoisted(() => ({ refresh: vi.fn(), router: null as unknown }));
vi.mock("next/navigation", () => ({
  useRouter: () => (nav.router ??= { refresh: nav.refresh, push: () => {} }),
  usePathname: () => "/",
}));

const { ArrivalsBanner, BLANK_PIXEL, COLLAPSE_MS, CROP_MEDIA } = await import("./arrivals-banner");
const { HOME_HEADING_ID } = await import("./home-heading");
const { cropStyle } = await import("../../lib/about/banner-line");
const { Dashboard } = await import("./dashboard");
const { aboutFirstRunOver, acknowledgeAbout, acknowledgeArrivals, endAboutFirstRun, resetArrivalsAcknowledged } = await import("./arrivals-seen");
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

/**
 * A crop is ONE `<picture>`: the desktop capture as a `<source>` for `md` and up, the phone capture as the `<img>`, so
 * each width is eligible for exactly one capture and the browser fetches only that one (two `<img>`s, one hidden by
 * CSS, fetched both full screenshots).
 */
function expectOnePicture(crop: HTMLElement, phoneSrc: string, deskSrc: string) {
  const pictures = crop.querySelectorAll("picture");
  expect(pictures).toHaveLength(1);
  const sources = pictures[0]!.querySelectorAll("source");
  expect(sources).toHaveLength(1);
  expect(sources[0]!.getAttribute("media")).toBe(CROP_MEDIA);
  expect(sources[0]!.getAttribute("srcset")).toBe(deskSrc);
  const imgs = crop.querySelectorAll("img");
  expect(imgs).toHaveLength(1);
  expect(imgs[0]!.getAttribute("src")).toBe(phoneSrc);
  expect(imgs[0]!.parentElement!.tagName).toBe("PICTURE");
}

let reduce = false;
beforeEach(() => {
  resetArrivalsAcknowledged();
  dismiss.mockClear();
  nav.refresh.mockClear();
  document.documentElement.dataset.theme = "dark";
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
  it("heads them with the count and caps the lines (`bannerCap`)", () => {
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
// A launch as the server words it (`aboutLine`): a label with its region on both captures, or a rule with none.
const CROP = { src: "/about/pages/dark/phone/p-deck-games.webp", w: 780, h: 1688, box: [0.05, 0.3, 0.9, 0.1] as const };
const DCROP = { src: "/about/pages/dark/desktop/d-analysis.webp", w: 2600, h: 1800, box: [0.4, 0.4, 0.2, 0.1] as const };
const launch = (key: string, page = "Decks", text = "Matchups splits a deck’s games by who you played against.", crop = true, ack: string[] = [key]): AboutLaunch => ({
  key,
  ack,
  lead: `New on ${page}:`,
  text,
  href: `/about/${page.toLowerCase()}?lit=${encodeURIComponent(key)}#games`,
  phone: crop ? CROP : null,
  desktop: crop ? DCROP : null,
});
const behind = (...launches: AboutLaunch[]): AboutLine => ({ kind: "launches", launches, ids: launches.map((l) => l.key), theme: "dark" });
const MATCHUPS = launch("decks/games/matchups");
const SPARES = launch("shopping/list/spares", "Shopping", "Ask a friend for a spare.");
const RULE = launch("rule/credits", "Decks", "Anything written just for you costs credits.", false);
const firstRunLine = (ids: string[]): AboutLine => ({ kind: "firstRun", ids, ack: [...ids, `${ids[0]}@SOME_SWITCH`] });
const FIRST: AboutLine = firstRunLine(["home/home/help", "decks/games/matchups"]);

describe("ArrivalsBanner, one launch (call 7, Ways-In “Banner · one launch”)", () => {
  it("names the page and the unit's words, with its crop in the mark's place, Show me to the label lit, and ✕", () => {
    render(<ArrivalsBanner data={null} about={behind(MATCHUPS)} />);
    const r = region()!;
    expect(r.tagName).toBe("SECTION");
    expect(r).toHaveTextContent("New on Decks: Matchups splits a deck’s games by who you played against.");
    expect(within(r).getByRole("link", { name: "Show me" })).toHaveAttribute("href", MATCHUPS.href);
    expect(within(r).getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    expect(within(r).queryByRole("heading")).toBeNull();
    // One box, switched at md: the phone's 64x48 cut from the phone capture, the desktop's 56x38 from its own.
    const crops = r.querySelectorAll<HTMLElement>("[data-about-crop]");
    expect(crops).toHaveLength(1);
    expect(crops[0]!.className).toContain("h-[48px] w-[64px] md:h-[38px] md:w-[56px]");
    expectOnePicture(crops[0]!, CROP.src, DCROP.src);
    // Each width's place in its own box, the server's `cropStyle` of that capture at that box size.
    const vars = (k: string) => crops[0]!.style.getPropertyValue(k);
    const p = cropStyle(CROP, 64, 48);
    const d = cropStyle(DCROP, 56, 38);
    expect([vars("--pl"), vars("--pt"), vars("--pw"), vars("--ph")]).toEqual([p.left, p.top, p.width, p.height].map((n) => `${n}px`));
    expect([vars("--dl"), vars("--dt"), vars("--dw"), vars("--dh")]).toEqual([d.left, d.top, d.width, d.height].map((n) => `${n}px`));
    const img = crops[0]!.querySelector("img")!;
    expect(img.className).toContain("left-[var(--pl)] top-[var(--pt)] h-[var(--ph)] w-[var(--pw)]");
    expect(img.className).toContain("md:left-[var(--dl)] md:top-[var(--dt)] md:h-[var(--dh)] md:w-[var(--dw)]");
  });

  it("fetches only one width's capture: a width with no region gets a blank pixel and the mark in its place", () => {
    const phoneOnly = { ...MATCHUPS, key: "decks/games/phone-only", desktop: null };
    const { unmount } = render(<ArrivalsBanner data={null} about={behind(phoneOnly)} />);
    let crop = region()!.querySelector<HTMLElement>("[data-about-crop]")!;
    expect(crop.className).toContain("md:hidden");
    expectOnePicture(crop, CROP.src, BLANK_PIXEL);
    unmount();
    const deskOnly = { ...MATCHUPS, key: "decks/games/desk-only", phone: null };
    render(<ArrivalsBanner data={null} about={behind(deskOnly)} />);
    crop = region()!.querySelector<HTMLElement>("[data-about-crop]")!;
    expect(crop.className).toContain("hidden md:flex");
    expectOnePicture(crop, BLANK_PIXEL, DCROP.src);
  });

  it("keeps the diamond mark for a rule, which has no region to crop", () => {
    render(<ArrivalsBanner data={null} about={behind(RULE)} />);
    expect(region()!.querySelectorAll("[data-about-crop]")).toHaveLength(0);
    expect(region()).toHaveTextContent("New on Decks: Anything written just for you costs credits.");
  });

  it("introduces a first-run reader in one line, Show me opening the /about index (A3)", () => {
    render(<ArrivalsBanner data={null} about={FIRST} />);
    expect(region()).toHaveTextContent(/What The\s99 does: every tool, mark and figure in the app, and where to find it\./);
    expect(screen.getByRole("link", { name: "Show me" })).toHaveAttribute("href", "/about");
    expect(region()!.querySelectorAll("[data-about-crop]")).toHaveLength(0);
  });
});

describe("ArrivalsBanner, two or more launches (call 7, Ways-In “Banner · two launches”)", () => {
  it("takes the `New in the app` band, a 44x32 crop and a Show me per line, and one ✕", () => {
    render(<ArrivalsBanner data={null} about={behind(MATCHUPS, SPARES)} />);
    const r = region()!;
    expect(within(r).getByRole("heading", { level: 2, name: "New in the app" })).toBeInTheDocument();
    const items = within(r).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "New on Decks: Matchups splits a deck’s games by who you played against. Show me",
      "New on Shopping: Ask a friend for a spare. Show me",
    ]);
    expect(within(items[1]!).getByRole("link", { name: "Show me" })).toHaveAttribute("href", SPARES.href);
    for (const li of items) {
      const crops = li.querySelectorAll<HTMLElement>("[data-about-crop]");
      expect(crops).toHaveLength(1);
      expect(crops[0]!.className).toContain("h-[32px] w-[44px]");
      expect(crops[0]!.className).not.toContain("md:w-");
      expectOnePicture(crops[0]!, CROP.src, DCROP.src);
    }
    expect(within(r).getAllByRole("button", { name: "Dismiss" })).toHaveLength(1);
  });

  it("caps the lines as shipped: four in full, past four three and `and N more` to the index", () => {
    const five = ["a", "b", "c", "d", "e"].map((k) => launch(`decks/games/${k}`));
    const { unmount } = render(<ArrivalsBanner data={null} about={behind(...five.slice(0, 4))} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    unmount();
    render(<ArrivalsBanner data={null} about={behind(...five)} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[3]).toHaveTextContent("and 2 more Show me");
    expect(within(items[3]!).getByRole("link", { name: "Show me" })).toHaveAttribute("href", "/about");
  });

  it("leads with About beside an arrival, each line with its own link (A2)", () => {
    render(<ArrivalsBanner data={one(TRC, ["trc", "a2"])} about={behind(MATCHUPS)} />);
    const r = region()!;
    expect(within(r).getByRole("heading", { level: 2, name: "New in the app" })).toBeInTheDocument();
    const items = within(r).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("New on Decks: Matchups splits");
    expect(items[1]).toHaveTextContent("Star Trek Commander is announced, with 15 commanders revealed. See it in Precons");
    expect(r.querySelector("[aria-live], [role=alert]")).toBeNull();
  });

  it("a first-run line beside an arrival opens the index", () => {
    render(<ArrivalsBanner data={one(TRC, ["trc", "a2-first"])} about={FIRST} />);
    const items = within(region()!).getAllByRole("listitem");
    expect(within(items[0]!).getByRole("link", { name: "Show me" })).toHaveAttribute("href", "/about");
  });

  it("caps several arrivals beside About and closes them with one Precons link", () => {
    render(<ArrivalsBanner data={many(6)} about={behind(MATCHUPS)} />);
    const items = within(region()!).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[4]).toHaveTextContent("and 3 more See them in Precons");
    expect(within(region()!).getAllByRole("link", { name: /Precons/ })).toHaveLength(1);
  });
});

describe("ArrivalsBanner, About's ✕ and acknowledgements", () => {
  it("one ✕ writes both halves: the arrival keys and every launch key drawn", () => {
    vi.useFakeTimers();
    render(<ArrivalsBanner data={one(TRC, ["trc", "both"])} about={behind(MATCHUPS, SPARES)} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledWith(["trc", "both"], [MATCHUPS.key, SPARES.key]);
    act(() => vi.advanceTimersByTime(COLLAPSE_MS));
    expect(region()).toBeNull();
  });

  it("✕ on About alone writes its keys and no arrival keys, and Back re-mounts it closed", () => {
    vi.useFakeTimers();
    const about = behind(launch("decks/games/back"));
    const first = render(<ArrivalsBanner data={null} about={about} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledWith([], ["decks/games/back"]);
    act(() => vi.advanceTimersByTime(COLLAPSE_MS));
    first.unmount();
    render(<ArrivalsBanner data={null} about={about} />);
    expect(region()).toBeNull();
  });

  it("✕ on a first-run line claims the whole baseline it rendered, sentence keys included", () => {
    // Its own ids: a ✕ keeps its banner closed for the rest of this document.
    const first = firstRunLine(["home/home/help", "x-first"]);
    render(<ArrivalsBanner data={null} about={first} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledWith([], first.kind === "firstRun" ? first.ack : null);
  });

  it("✕ claims each launch's rendered ack, so the server can intersect it with what it announces now", () => {
    const whole = launch("shopping/deck-shopping/spare", "Shopping", "The friends mark.", true, ["shopping/deck-shopping/spare", "shopping/deck-shopping/spare@SPARE_REQUESTS_ENABLED"]);
    const sentence = launch("rule/replace@COLLECTION_SYNC_ENABLED", "Collection", "With Sync.", false);
    render(<ArrivalsBanner data={null} about={behind(whole, sentence)} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledWith([], [
      "shopping/deck-shopping/spare", "shopping/deck-shopping/spare@SPARE_REQUESTS_ENABLED", "rule/replace@COLLECTION_SYNC_ENABLED",
    ]);
  });

  it("a ✕ whose write lands with About keys ends the first run in this document; one that wrote none does not", async () => {
    dismiss.mockResolvedValueOnce(["home/home/help"] as never);
    const first = render(<ArrivalsBanner data={null} about={firstRunLine(["home/home/help", "x-landed"])} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await act(async () => {});
    expect(aboutFirstRunOver()).toBe(true);
    first.unmount();
    // Another payload of this document, its line standing for other ids: not drawn again.
    render(<ArrivalsBanner data={null} about={firstRunLine(["home/home/help", "x-other"])} />);
    expect(region()).toBeNull();
  });

  it("a ✕ that wrote no About key leaves the first run standing", async () => {
    dismiss.mockResolvedValueOnce([] as never);
    render(<ArrivalsBanner data={null} about={firstRunLine(["home/home/help", "x-none"])} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await act(async () => {});
    expect(aboutFirstRunOver()).toBe(false);
  });

  it("drops a first-run line once a visit in this document ended the reader's first run (the Reference's)", () => {
    endAboutFirstRun();
    render(<ArrivalsBanner data={null} about={FIRST} />);
    expect(region()).toBeNull();
  });

  it("drops a launch a page visit in this document acknowledged, and keeps the rest", () => {
    acknowledgeAbout([MATCHUPS.key, "decks/games/log"]);
    render(<ArrivalsBanner data={one(TRC, ["trc", "visit"])} about={behind(MATCHUPS, SPARES)} />);
    const r = region()!;
    expect(r).not.toHaveTextContent("New on Decks");
    expect(r).toHaveTextContent("New on Shopping: Ask a friend for a spare.");
    expect(r).toHaveTextContent("Star Trek Commander is announced");
  });

  it("draws nothing once visits answered every launch and there are no arrivals", () => {
    acknowledgeAbout([MATCHUPS.key]);
    render(<ArrivalsBanner data={null} about={behind(MATCHUPS)} />);
    expect(region()).toBeNull();
  });

  it("drops a first-run line once a first visit acknowledged everything it stands for", () => {
    acknowledgeAbout(FIRST.ids);
    render(<ArrivalsBanner data={null} about={FIRST} />);
    expect(region()).toBeNull();
  });

  it("is a Show me press, not an acknowledgement: a re-mount draws it again", () => {
    const about = behind(launch("decks/games/press"));
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
  it("Dashboard draws one launch between the header and Ready to build", () => {
    const { container } = render(<Dashboard {...DASH} arrivals={null} about={behind(launch("decks/games/dash"))} />);
    expect(container.querySelector("header")!.nextElementSibling).toBe(container.querySelector("[data-arrivals-banner]"));
    expect(region()).toHaveTextContent("New on Decks: Matchups splits");
  });

  it("Dashboard draws the first-run line for an account that imported before opening About, with ✕", () => {
    render(<Dashboard {...DASH} arrivals={null} about={firstRunLine(["home/home/help", "dash-first"])} />);
    expect(region()).toHaveTextContent(/What The\s99 does:/);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("the checklist draws About's line with no ✕ and no arrivals (A3)", () => {
    render(<FirstRunChecklist about={firstRunLine(["home/home/help", "checklist-first"])} />);
    expect(region()).toHaveTextContent(/What The\s99 does:/);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("the checklist draws a launch for a reader behind (no ✕), and nothing without one", () => {
    const { unmount } = render(<FirstRunChecklist about={behind(launch("decks/games/checklist"))} />);
    expect(region()).toHaveTextContent("New on Decks:");
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    unmount();
    render(<FirstRunChecklist />);
    expect(region()).toBeNull();
  });
});

describe("ArrivalsBanner, the crops' theme (ThemeRefresh)", () => {
  it("asks the server again when the theme is picked in place, so the crops are cut in the new theme", async () => {
    render(<ArrivalsBanner data={null} about={behind(MATCHUPS)} />);
    expect(nav.refresh).not.toHaveBeenCalled();
    await act(async () => {
      document.documentElement.dataset.theme = "amonkhet";
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(nav.refresh).toHaveBeenCalledOnce();
  });

  it("asks at mount when Back restores a banner drawn in an older theme", () => {
    document.documentElement.dataset.theme = "amonkhet";
    render(<ArrivalsBanner data={null} about={behind(MATCHUPS)} />);
    expect(nav.refresh).toHaveBeenCalledOnce();
  });

  it("asks nothing for a line with no crop to redraw: a rule's launch, a first-run line", () => {
    document.documentElement.dataset.theme = "amonkhet";
    const { unmount } = render(<ArrivalsBanner data={null} about={behind(RULE)} />);
    unmount();
    render(<ArrivalsBanner data={null} about={FIRST} />);
    expect(nav.refresh).not.toHaveBeenCalled();
  });
});
