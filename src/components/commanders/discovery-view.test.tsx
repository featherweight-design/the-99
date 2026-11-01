import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { DiscoveryList } from "../../lib/discovery/list";
import { cutToWindow, encodeDiscovery, type EncodedDiscovery } from "../../lib/discovery/encode";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { planeCopy } from "../../lib/copy/commanders-plane";
import { commandersCopy, discoverCopy, filterCopy } from "../../lib/copy/lanes";
import { revealAnnouncement } from "./reveal-control";
import { DiscoveryView } from "./discovery-view";

// One thing on this lane navigates, and only one: a change of RANKING, which is
// two of order's five values. Everything else on the rack — search, the pips, the
// match mode, and the other three orders — narrows or reorders a list the client
// already holds, so it is read from and mirrored to the live URL through the
// History API rather than routed. The router mock is therefore also an assertion:
// a call to `replace` for anything but a ranking flip is the bug.
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

// The one thing on this surface the client cannot answer: rows the server left
// out of the payload. Mocked rather than stubbed at the fetch layer, because the
// action IS the boundary — it reaches the database, and importing it for real
// would pull the driver into a component test.
const { findExcluded, hide, unhide } = vi.hoisted(() => ({
  findExcluded: vi.fn(),
  // The row's hide and its undo (hide a commander, README §2): the real actions reach the database.
  hide: vi.fn<(oracleId: string) => Promise<boolean>>(),
  unhide: vi.fn<(oracleId: string) => Promise<boolean>>(),
}));
vi.mock("../../app/commanders/actions", () => ({
  findExcludedMatches: findExcluded,
  hideCommanderAction: hide,
  unhideCommanderAction: unhide,
}));

// The rack mounts exactly one treatment, chosen in JS off `CHASSIS_WIDE_MIN_PX`, so a
// test that does not say which width it is at gets the phone — where the pips
// live inside a sheet that has to be opened first. Every test here runs at the
// rack width unless it says otherwise.
function stubWidth(wide: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: wide,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

// Encoded on the way in, because that is what the view is handed. Every test
// below therefore runs the real decode, and a field the encoder drops fails here
// as well as in the round-trip suite.
const list = (over: Partial<DiscoveryList> = {}): EncodedDiscovery =>
  encodeDiscovery({
    items: [],
    candidateCount: 0,
    hiddenCount: 0,
    cardsRead: 2805,
    freePoolSize: 2805,
    bestPct: null,
    floorExcluded: 0,
    poolExcluded: 0,
    unmeasured: 0,
    hasDecks: true,
    deckIdentities: [],
    availOk: true,
    priceOk: true,
    sort: "fit",
    ...over,
  });

const item = (over: Partial<DiscoveryList["items"][number]>): DiscoveryList["items"][number] => ({
  slug: "a",
  name: "A Commander",
  colorIdentity: ["G"],
  artCropUri: null,
  releasedAt: null,
  deckCount: 1209,
  rank: 1,
  price: { kind: "absent" },
  prose: null,
  gapSlot: { kind: "noMechanics" },
  score: 58,
  measurableTotal: 100,
  fitPool: 12,
  fitRoles: 20,
  fitSynergy: 26,
  ...over,
});

// The rack's controls, by the names they actually carry. The pips are
// `role="switch"` pips labelled with the colour alone — the shared `ColourPips`
// contract, which this rack took when the last of the three old colour controls
// was retired. The match mode beside them is a
// radiogroup whose radios announce the full phrase at either width, even where
// the rack draws the short one.
const pip = (name: string) => screen.getByRole("switch", { name });
const mode = (label: string) => screen.getByRole("radio", { name: label });
const field = () => screen.getByRole("searchbox", { name: filterCopy.search.placeholderWide });
const orderTrigger = (label: string = discoverCopy.order.bestFit) =>
  screen.getByRole("button", { name: filterCopy.order.trigger(label) });

describe("DiscoveryView", () => {
  beforeEach(() => {
    stubWidth(true);
    replace.mockClear();
    findExcluded.mockReset();
    findExcluded.mockResolvedValue([]);
    window.history.replaceState(null, "", "/discover");
  });

  afterEach(() => vi.unstubAllGlobals());

  // ── Defect 2: one note, one control ───────────────────────────────────
  // 40 commanders. "druid" alone matches 9. Of those 9, Any-of-BG matches 6 and
  // Exactly-BG matches 2. The aside must say 4, never a figure that has the name
  // search folded into it — over the whole list the same subtraction comes to
  // 12, which is what the shipped composition printed.
  const DRUID_IDENTITIES = [
    ["B", "G"],
    ["B", "G"],
    ["B", "G", "U"],
    ["B", "G", "R"],
    ["B", "G", "W"],
    ["B", "G", "U", "R"],
    ["G"],
    ["B"],
    ["U"],
  ];
  const fixture = [
    ...DRUID_IDENTITIES.map((colorIdentity, i) =>
      item({ slug: `d${i}`, name: `Druid ${i}`, colorIdentity, rank: i + 1 }),
    ),
    // Golgari and more, but named nothing like the query: these are what a
    // figure counted over the unsearched list would sweep in.
    ...Array.from({ length: 8 }, (_, i) =>
      item({
        slug: `x${i}`,
        name: `Sultai Sage ${i}`,
        colorIdentity: ["B", "G", "U"],
        rank: 10 + i,
      }),
    ),
    ...Array.from({ length: 23 }, (_, i) =>
      item({
        slug: `w${i}`,
        name: `Plains Walker ${i}`,
        colorIdentity: ["W"],
        rank: 18 + i,
      }),
    ),
  ];

  it("counts only its own control in the Exactly aside", () => {
    window.history.replaceState(null, "", "/discover?q=druid&c=b,g&m=exact");
    render(<DiscoveryView basis="classifier" encoded={list({ items: fixture, candidateCount: 40 })} />);
    // Scoped to the result line itself: a bare `textContent.includes` matcher
    // also matches every ancestor of the line, up to `<body>`.
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          (el.textContent?.includes(filterCopy.match.excludedAside(4)) ?? false),
      ),
    ).toBeInTheDocument();
  });

  // The other half of the same rule: the result line's ratio counts every
  // control, because that is the question it asks.
  it("counts every control in the ratio the aside is appended to", () => {
    window.history.replaceState(null, "", "/discover?q=druid&c=b,g&m=exact");
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: fixture, candidateCount: 40 })} />,
    );
    expect(container.textContent).toContain(discoverCopy.result.filtered(2, 40));
  });

  // A "0 excluded" aside is noise, and so is one under a mode that is not on.
  it("says nothing about Exactly when it is off, or when it costs no row", () => {
    window.history.replaceState(null, "", "/discover?q=druid&c=b,g");
    const { container, unmount } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: fixture, candidateCount: 40 })} />,
    );
    expect(container.textContent).not.toContain("Exactly excludes");
    unmount();

    // Exact, and every match is already exact: the two modes agree.
    window.history.replaceState(null, "", "/discover?q=plains&c=w&m=exact");
    const only = render(<DiscoveryView basis="classifier" encoded={list({ items: fixture, candidateCount: 40 })} />);
    expect(only.container.textContent).not.toContain("Exactly excludes");
  });

  // ── The rack's own controls ───────────────────────────────────────────
  it("gives the lane its own orders, and no availability control", () => {
    render(<DiscoveryView basis="classifier" encoded={list()} />);
    expect(orderTrigger()).toBeInTheDocument();
    // The owned lane's control, named here only so this file can assert its absence.
    expect(
      screen.queryByRole("radiogroup", { name: commandersCopy.availability.legend }),
    ).toBeNull();
  });

  // Two of order's five values reach the server, and they are the only things on
  // this surface allowed to route. `bestfit` is the default and serialises as an
  // absence, so the URL a flip writes names the ranking and nothing else.
  it("navigates on a ranking flip, and on nothing else", () => {
    render(<DiscoveryView basis="classifier" encoded={list()} />);
    fireEvent.click(orderTrigger());
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: discoverCopy.order.somethingNew }),
    );
    expect(replace).toHaveBeenCalledWith("/discover?o=new", { scroll: false });
  });

  it("reorders on the client rather than asking the server for a second ranking", () => {
    const items = [
      item({ slug: "a", name: "Old Legend", releasedAt: "1994-08-01" }),
      item({ slug: "b", name: "New Legend", releasedAt: "2024-02-02", rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 2 })} />,
    );
    fireEvent.click(orderTrigger());
    fireEvent.click(screen.getByRole("menuitemradio", { name: discoverCopy.order.recent }));
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?o=recent");
    expect(container.textContent?.indexOf("New Legend")).toBeLessThan(
      container.textContent?.indexOf("Old Legend") ?? -1,
    );
  });

  // `Popularity` ranks on the deck count the row prints under that name. It is
  // not "whatever the server sent": the server ranks on fit or on novelty, so a
  // pass-through here would print the label over a different ordering entirely.
  // The fixture makes them disagree, with the server's rank 1 second on deck count.
  it("orders by the deck count under Popularity, not by the served ranking", () => {
    window.history.replaceState(null, "", "/discover?o=popularity");
    const items = [
      item({ slug: "a", name: "Server First", deckCount: 12 }),
      item({ slug: "b", name: "Most Built", deckCount: 9000, rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 2 })} />,
    );
    expect(container.textContent?.indexOf("Most Built")).toBeLessThan(
      container.textContent?.indexOf("Server First") ?? -1,
    );
  });

  // An uncounted commander is an absence, and ordering it as a zero would be the
  // claim that nobody has built it. It sorts last instead, which is where the
  // undated set sorts under `Recently released` for the same reason.
  it("sorts an uncounted commander last rather than as a zero", () => {
    window.history.replaceState(null, "", "/discover?o=popularity");
    const items = [
      item({ slug: "a", name: "Uncounted", deckCount: null }),
      item({ slug: "b", name: "Counted", deckCount: 1, rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 2 })} />,
    );
    expect(container.textContent?.indexOf("Counted")).toBeLessThan(
      container.textContent?.indexOf("Uncounted") ?? -1,
    );
  });

  // Call 1 of the handoff: with no pip lit the mode is greyed IN PLACE, never
  // removed. The shipped bar dropped it, which made the stack jump and taught
  // nothing about what the mode belongs to.
  it("greys the match mode until a pip is lit, without taking it out of the tree", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: [item({})], candidateCount: 1 })} />);
    const group = () => screen.getByRole("radiogroup", { name: filterCopy.match.legend });
    expect(group().getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(group().getAttribute("aria-disabled")).toBeNull();
  });

  // The floor's exclusions are already gone from `items`, so the count the rack
  // shows is the one the server ranked, not a client-side subtraction.
  it("counts the items it carries, and filters them by colour", () => {
    const items = [
      item({ slug: "a", colorIdentity: ["G"] }),
      item({ slug: "b", colorIdentity: ["U"], rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 2 })} />,
    );
    // At rest the line states the lane rather than printing `2 of 2`.
    expect(container.textContent).toContain(discoverCopy.result.rest(2));

    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(container.textContent).toContain(discoverCopy.result.filtered(1, 2));
  });

  // The lane flip carries `?c=` across, so this list has to read it — otherwise
  // the URL says Golgari and the pips say nothing.
  it("opens with the colours the incoming URL names", () => {
    window.history.replaceState(null, "", "/discover?c=b,g");
    const items = [
      item({ slug: "a", colorIdentity: ["B", "G"] }),
      item({ slug: "b", colorIdentity: ["U"], rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 2 })} />,
    );
    expect(container.textContent).toContain(discoverCopy.result.filtered(1, 2));
    expect(pip(filterCopy.colour.names.g).getAttribute("aria-checked")).toBe("true");
  });

  // The header used to report the count and is now a fixed title and gloss, so
  // the ranked count survives in exactly one place: the rack's result line. The
  // pre-exclusion candidate count is not it — a reader counts the rows they can
  // see, not the ones the novelty floor removed before the page was drawn.
  it("counts the ranked rows on the result line, not the pre-exclusion candidates", () => {
    const items = [
      item({ slug: "a", colorIdentity: ["B", "G"] }),
      item({ slug: "b", colorIdentity: ["U"] }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier"
        encoded={list({ items, candidateCount: 40, sort: "new", floorExcluded: 38 })}
      />,
    );
    expect(container.textContent).toContain(discoverCopy.result.rest(2));
    expect(container.textContent).not.toContain(discoverCopy.result.rest(40));
  });

  it("mirrors a colour choice into the URL without routing for it", () => {
    render(<DiscoveryView basis="classifier" encoded={list()} />);
    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(window.location.search).toBe("?c=g");
    expect(replace).not.toHaveBeenCalled();
  });

  // The mode outlives the pips: it is inert with none lit, but a reader who
  // lights one again gets back the mode they chose rather than the default.
  it("mirrors the mode into the URL, and keeps it when the last pip goes out", () => {
    render(<DiscoveryView basis="classifier" encoded={list()} />);
    fireEvent.click(pip(filterCopy.colour.names.g));
    fireEvent.click(mode(filterCopy.match.exactly));
    expect(window.location.search).toBe("?c=g&m=exact");

    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(window.location.search).toBe("?m=exact");
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens under the mode the incoming URL names", () => {
    window.history.replaceState(null, "", "/discover?c=g&m=exact");
    const items = [
      item({ slug: "a", colorIdentity: ["G"] }),
      item({ slug: "b", colorIdentity: ["B", "G"], rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 2 })} />,
    );
    expect(container.textContent).toContain(discoverCopy.result.filtered(1, 2));
  });

  it("announces a re-rank on its own live region once the new ordering lands", () => {
    const { rerender } = render(<DiscoveryView basis="classifier" encoded={list()} />);
    rerender(<DiscoveryView basis="classifier" encoded={list({ sort: "new" })} />);
    expect(screen.getByText(discoveryCopy.sort.announce("new", 0))).toBeTruthy();
  });

  // ── The three empty states ────────────────────────────────────────────
  const empty = discoveryCopy.empty;

  // State 1 sits ABOVE a full list: with no decks built the fit ranking is
  // complete and only the novelty ordering is unavailable.
  it("banners the no-decks reason without emptying the list", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: [item({})], hasDecks: false })} />);
    expect(screen.getByText(empty.noDecksHeading)).toBeTruthy();
    expect(screen.getAllByText("A Commander").length).toBeGreaterThan(0);
  });

  it("explains an empty novelty ranking with the floor that emptied it", () => {
    window.history.replaceState(null, "", "/discover?s=new");
    render(
      <DiscoveryView basis="classifier"
        encoded={list({ sort: "new", candidateCount: 3334, floorExcluded: 3334, bestPct: 18 })}
      />,
    );
    expect(screen.getByText(empty.floorHeading)).toBeTruthy();
    // The CTA moves the order back to the fit ranking, which this visit has not been
    // served — so it falls through the cache to a navigation.
    fireEvent.click(screen.getByRole("button", { name: empty.floorCta }));
    expect(replace).toHaveBeenCalledWith("/discover", { scroll: false });
  });

  // An empty list the floor did not empty is a different fact — nothing had a
  // distance to measure — and the floor copy would name a floor that took nobody.
  it("does not blame the floor for an empty list it never excluded from", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ sort: "new" })} />);
    expect(screen.queryByText(empty.floorHeading)).toBeNull();
  });

  it("blames the colours when the filter is what emptied the list, and names the built decks", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView basis="classifier" encoded={list({ items, deckIdentities: [["B", "G"], ["R"]] })} />,
    );
    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(screen.getByText(empty.filteredHeading)).toBeTruthy();
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el.textContent ===
            `${empty.filteredBody("green", 1)} ${empty.filteredBuiltClause(1, 2, "Green")}`,
      ),
    ).toBeTruthy();
    // The escape to the other lane is a route, so it is a link with no search
    // to carry — nothing has been typed here.
    expect(screen.getByRole("link", { name: empty.filteredScopeLink })).toHaveAttribute(
      "href",
      "/commanders",
    );
  });

  // The clause claims those decks would have been in THIS list had they been
  // unbuilt, so with none matching there is nothing to explain the absence with.
  it("omits the built clause when no built deck matches the filter", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(<DiscoveryView basis="classifier" encoded={list({ items, deckIdentities: [["R"]] })} />);
    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(screen.getByText(empty.filteredBody("green", 1))).toBeTruthy();
  });

  // The floor is a server-side exclusion the pips played no part in, so a colour
  // that matches nothing must not be answered with "none of the 3,334 candidates
  // cleared the floor".
  it("blames the colours, not the floor, when the pips are what emptied the list", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView basis="classifier"
        encoded={list({
          items,
          sort: "new",
          candidateCount: 3334,
          floorExcluded: 3333,
          bestPct: 18,
        })}
      />,
    );
    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(screen.queryByText(empty.floorHeading)).toBeNull();
    expect(screen.getByText(empty.filteredHeading)).toBeTruthy();
  });

  // The one genuinely new reason this state has under discovery, so the design
  // marks the whole clause rather than a phrase inside it.
  it("emphasises the built clause", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(<DiscoveryView basis="classifier" encoded={list({ items, deckIdentities: [["G"]] })} />);
    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(screen.getByText(empty.filteredBuiltClause(1, 1, "Green")).tagName).toBe("STRONG");
  });

  // The clause counts decks whose identity CONTAINS the filter, so it says those
  // decks cover the colours rather than that they are them.
  it("counts a wider deck identity, and does not call it the filtered one", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(<DiscoveryView basis="classifier" encoded={list({ items, deckIdentities: [["G", "W"]] })} />);
    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(screen.getByText(empty.filteredBuiltClause(1, 1, "Green"))).toBeTruthy();
    expect(screen.queryByText(/decks is Green/)).toBeNull();
  });

  it("does not say one of your 1 decks", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(<DiscoveryView basis="classifier" encoded={list({ items, deckIdentities: [["G"]] })} />);
    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(screen.getByText(/^Your only deck covers Green/)).toBeTruthy();
  });

  // ── The window ────────────────────────────────────────────────────────
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      item({ slug: `s${i}`, name: `Commander ${i}`, rank: i + 1 }),
    );

  it("opens on one step and reveals the next, naming the band it is about to show", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: many(60), candidateCount: 60 })} />);
    expect(screen.queryByText("Commander 25")).toBeNull();
    expect(screen.getByText(discoveryCopy.window.revealBand(26, 50, 60))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getAllByText("Commander 25").length).toBeGreaterThan(0);
    expect(screen.getByText(discoveryCopy.window.revealBand(51, 60, 60))).toBeTruthy();
  });

  // The reveal control counts the window; the rack's result line counts the
  // filters. Two different questions, which is why the rack must not restate it,
  // and why the header's `WindowCount` went with the bar the rack replaced.
  it("counts the window in its own control, and speaks each reveal on the live region", () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: many(60), candidateCount: 60 })} />,
    );
    expect(container.textContent).toContain("35 remaining");
    expect(container.textContent).not.toContain("more below");

    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(container.textContent).toContain("10 remaining");
    expect(screen.getByText(revealAnnouncement(50, 60, 25))).toBeTruthy();
  });

  // A reveal whose rows' fields have not arrived has not happened yet: the control keeps counting
  // the rows on screen and naming the band it is waiting to show, rather than the one after it.
  it("counts from the rows on screen while a reveal waits for its rows", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const whole = list({ items: many(60), candidateCount: 60 });
    const firstWindow = new Set(many(25).map((r) => r.slug));
    const { container } = render(<DiscoveryView basis="classifier" encoded={cutToWindow(whole, firstWindow)} />);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    const control = screen.getByRole("button", { name: /Show 25 more commanders, 35 remaining/ });
    expect(control.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText(discoveryCopy.window.revealBand(26, 50, 60))).toBeTruthy();
    expect(container.textContent).not.toContain("10 remaining");
    vi.unstubAllGlobals();
  });

  // The rows held on screen while a new ranking's rows arrive are the rows as DRAWN: resolved
  // against the new ranking's fields, the ones fetched for the old ranking would drop out.
  it("keeps the rows it drew while another ranking’s rows arrive", async () => {
    const fields = vi.fn((url: string) => {
      const slugs = new URL(url, "http://x").searchParams.get("s")!.split(",");
      const byslug = new Map(many(60).map((r) => [r.slug, r]));
      return Promise.resolve(new Response(JSON.stringify({
        fields: Object.fromEntries(slugs.map((sl) => {
          const { slug: _s, name: _n, colorIdentity: _c, releasedAt: _r, deckCount: _d, ...f } = byslug.get(sl)!;
          return [sl, f];
        })),
      })));
    });
    vi.stubGlobal("fetch", fields);
    const firstWindow = new Set(many(25).map((r) => r.slug));
    const fit = cutToWindow(list({ items: many(60), candidateCount: 60 }), firstWindow);
    const { rerender } = render(<DiscoveryView basis="classifier" encoded={fit} />);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    await waitFor(() => expect(screen.getAllByText("Commander 49").length).toBeGreaterThan(0));
    // Another ranking arrives with none of its rows drawn, and its fields never come.
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    window.history.replaceState(null, "", "/discover?o=new");
    rerender(<DiscoveryView basis="classifier" encoded={cutToWindow(list({ items: many(60), candidateCount: 60, sort: "new" }), new Set())} />);
    expect(screen.getAllByText("Commander 49").length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/discover");
  });

  // A list too short to have been windowed has no window to count, and its rows
  // never receive the reveal's focus move, so they are not tab stops.
  it("leaves an unwindowed list’s rows out of the tab order", () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: many(10), candidateCount: 10 })} />,
    );
    expect(container.querySelectorAll("li[tabindex]").length).toBe(0);
  });

  it("rules off a list that was windowed once it is fully revealed", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: many(30), candidateCount: 30 })} />);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getByText("End of ranking · 30")).toBeTruthy();
  });

  // The only thing separating the control from the last card is the list's own
  // row gap, so outside the `<ul>` it sits flush against the card above it.
  it("keeps the reveal control inside the list, where the row gap reaches it", () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: many(60), candidateCount: 60 })} />,
    );
    const control = screen.getByRole("button", { name: /Show 25 more commanders/ });
    expect(control.closest("ul")).toBe(container.querySelector("ul"));
  });

  // A length that is not a multiple of the step makes the last reveal overshoot,
  // and the live region is the one reader who would hear it: it speaks the raw
  // window, where the count line and the band are both clamped by their callers.
  it("stops the window at the end of the list on a final short step", () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: many(30), candidateCount: 30 })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getByText(revealAnnouncement(30, 30, 25))).toBeTruthy();
    // The window overshot to 50; the list, and the rule under it, stop at 30.
    expect(container.querySelectorAll("li").length).toBe(30);
    expect(screen.getByText("End of ranking · 30")).toBeTruthy();
  });

  // A re-rank returns a differently ordered list under the same mounted
  // component, so a deep window would open it part-way down an unseen ranking.
  it("returns the window to the top when the ordering underneath it changes", () => {
    const items = many(60);
    const { rerender } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 60 })} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getAllByText("Commander 25").length).toBeGreaterThan(0);

    rerender(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 60, sort: "new" })} />);
    expect(screen.queryByText("Commander 25")).toBeNull();
  });

  it("returns the window to the top when a colour filter narrows the list", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: many(60), candidateCount: 60 })} />);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getAllByText("Commander 25").length).toBeGreaterThan(0);

    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(screen.queryByText("Commander 25")).toBeNull();
  });

  // The same rule as a re-rank, for the order the client owns. Asserted on the
  // window's own figure rather than a row name: a name sort keeps every one of
  // these 60 rows, only in a different order, so "is row N gone" says nothing.
  it("returns the window to the top when the order changes under it", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: many(60), candidateCount: 60 })} />);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getByRole("button", { name: /Show 25 more commanders, 10 remaining/ })).toBeTruthy();

    fireEvent.click(orderTrigger());
    fireEvent.click(screen.getByRole("menuitemradio", { name: discoverCopy.order.name }));
    expect(screen.getByRole("button", { name: /Show 25 more commanders, 35 remaining/ })).toBeTruthy();
  });

  // #339. Every ranking flip is a server round-trip, and before this a reader
  // toggling back to a ranking they had just been looking at paid for it twice.
  // The payloads are kept as they arrive, so the second ask is free.
  //
  // The key used to be a (sort, availability) pair. Availability went with the
  // control and the scope was folded into order, so the ranking is the whole of
  // it — the coverage is the same contract read against the parameter that
  // survived.
  describe("the client cache", () => {
    const fitList = list({
      items: [item({ name: "Fit Ranked", slug: "fit-ranked" })],
      candidateCount: 1,
    });
    const newList = list({
      items: [item({ name: "New Ranked", slug: "new-ranked" })],
      candidateCount: 1,
      sort: "new",
    });
    const flip = (label: string) => {
      fireEvent.click(screen.getByRole("button", { name: /^Order · / }));
      fireEvent.click(screen.getByRole("menuitemradio", { name: label }));
    };

    it("routes on a ranking it has not seen and serves one it has", () => {
      const { rerender } = render(<DiscoveryView basis="classifier" encoded={fitList} />);
      // Plural queries throughout: a row renders its name once per breakpoint
      // subtree, so the singular form matches two nodes and throws.
      expect(screen.getAllByText("Fit Ranked").length).toBeGreaterThan(0);

      // Miss: nothing has ranked `new` this visit, so it has to be fetched.
      flip(discoverCopy.order.somethingNew);
      expect(replace).toHaveBeenCalledTimes(1);

      window.history.replaceState(null, "", "/discover?o=new");
      rerender(<DiscoveryView basis="classifier" encoded={newList} />);
      expect(screen.getAllByText("New Ranked").length).toBeGreaterThan(0);

      // Hit: the fit ranking is still in hand. No second request, and the URL
      // still names what is on screen so a copied link opens on it.
      flip(discoverCopy.order.bestFit);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText("Fit Ranked").length).toBeGreaterThan(0);
      expect(window.location.search).toBe("");
    });

    // A cached flip writes the URL itself, so it has to write it the way the
    // navigating path does — defaults as absences, and every parameter the lane
    // does not own copied off the live URL rather than rebuilt.
    it("leaves parameters it does not own alone when it serves from cache", () => {
      window.history.replaceState(null, "", "/discover?c=b,g&utm=x");
      const { rerender } = render(<DiscoveryView basis="classifier" encoded={fitList} />);
      flip(discoverCopy.order.somethingNew);
      window.history.replaceState(null, "", "/discover?c=b,g&utm=x&o=new");
      rerender(<DiscoveryView basis="classifier" encoded={newList} />);

      flip(discoverCopy.order.bestFit);
      const params = new URLSearchParams(window.location.search);
      expect(params.get("c")).toBe("b,g");
      expect(params.get("utm")).toBe("x");
      expect(params.has("o")).toBe(false);
    });

    // Admin PR 6d-2 (Copilot round 2). A ranking served back out of the cache was counted by the
    // basis of the payload that filed it, and an app-wide flip of LABEL_ROLE_COUNTS_ENABLED can land
    // between two navigations: `fit` filed under the classifier, the flip, an uncached `new` served
    // under labels, then back to the cached `fit`. Its withheld rows must be asked for under the
    // classifier, the basis they were counted by, not the latest payload's.
    it("asks for a cached ranking’s fields under the basis it was filed with", async () => {
      const urls: string[] = [];
      // Never answered, and rejected on abort as a real fetch is, so a batch the view gives up on
      // releases its rows to be asked for again.
      vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => {
        urls.push(url);
        return new Promise<Response>((_resolve, reject) =>
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
      }));
      try {
        const fitCut = cutToWindow(list({ items: many(30), candidateCount: 30 }), new Set());
        const { rerender } = render(<DiscoveryView basis="classifier" encoded={fitCut} />);
        await waitFor(() => expect(urls.length).toBeGreaterThan(0));

        const asked = () => urls.splice(0).map((u) => new URL(u, "http://x").searchParams);
        const bases = (ps: URLSearchParams[]) => [...new Set(ps.map((p) => `${p.get("sort")}/${p.get("b")}`))];
        expect(bases(asked())).toEqual(["fit/classifier"]);

        // The fresh payload is filed under ITS basis (a fresh payload always wins, basis and all).
        flip(discoverCopy.order.somethingNew);
        window.history.replaceState(null, "", "/discover?o=new");
        const newCut = cutToWindow(list({ items: many(30), candidateCount: 30, sort: "new" }), new Set());
        rerender(<DiscoveryView basis="labels" encoded={newCut} />);
        await waitFor(() => expect(urls.length).toBeGreaterThan(0));
        expect(bases(asked())).toEqual(["new/labels"]);

        // Back to the cached `fit`: still the classifier's, whatever the latest payload said.
        flip(discoverCopy.order.bestFit);
        await waitFor(() => expect(urls.length).toBeGreaterThan(0));
        expect(bases(asked())).toEqual(["fit/classifier"]);

        // And forward to the cached `new`: still the labels'.
        flip(discoverCopy.order.somethingNew);
        await waitFor(() => expect(urls.length).toBeGreaterThan(0));
        expect(bases(asked())).toEqual(["new/labels"]);
      } finally {
        vi.unstubAllGlobals();
        window.history.replaceState(null, "", "/discover");
      }
    });

    // The payload the server just produced is the truth, whatever the cache
    // holds for that ranking — an upload or a new deck re-ranks everything.
    it("takes a fresh payload over a cached one for the same ranking", () => {
      const { rerender } = render(<DiscoveryView basis="classifier" encoded={fitList} />);
      const rebuilt = list({
        items: [item({ name: "Re-Ranked", slug: "re-ranked" })],
        candidateCount: 1,
      });
      rerender(<DiscoveryView basis="classifier" encoded={rebuilt} />);
      expect(screen.getAllByText("Re-Ranked").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Fit Ranked").length).toBe(0);
    });

    // The ranking the server settled on is reconciled during render, not in an
    // effect: an effect would paint the control on the ranking that was asked for
    // once before correcting it to the one that came back. `loadDiscovery`
    // downgrades `new` to fit with no decks built, so the two really can differ.
    it("shows the ranking that came back, not the one that was asked for", () => {
      window.history.replaceState(null, "", "/discover?s=new");
      render(<DiscoveryView basis="classifier" encoded={list({ hasDecks: false })} />);
      expect(orderTrigger()).toBeInTheDocument();
    });
  });

  // ── The search field ──────────────────────────────────────────────────
  const search = planeCopy.search;

  const named = () => [
    item({ slug: "a", name: "Yarok, the Desecrated" }),
    item({ slug: "b", name: "Meren of Clan Nel Toth", rank: 2 }),
  ];

  // The list narrows on the keystroke, with no wait — the rows are already in
  // memory, and that feedback is the point. Only the URL, the window reset and
  // the server lookup wait for the typing to stop.
  it("narrows the list on the keystroke, not on the debounce", () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />);
    fireEvent.change(field(), { target: { value: "yarok" } });
    expect(screen.queryByText("Meren of Clan Nel Toth")).toBeNull();
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
    // The proof the two are separate: the list has moved and the URL has not.
    expect(window.location.search).toBe("");
  });

  it("mirrors the settled query as ?q=, and drops it when the field is cleared", async () => {
    render(<DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />);
    fireEvent.change(field(), { target: { value: "yarok" } });
    expect(window.location.search).toBe("");

    await waitFor(() => expect(window.location.search).toBe("?q=yarok"));
    expect(replace).not.toHaveBeenCalled();

    // The field's own clear, not the query chip's — both carry the same label,
    // because both do the same thing to the same parameter.
    const inField = within(field().closest("label") as HTMLElement);
    fireEvent.click(inField.getByRole("button", { name: filterCopy.search.clear }));
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("opens under the query the incoming URL names", () => {
    window.history.replaceState(null, "", "/discover?q=meren");
    render(<DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />);
    expect(screen.getAllByText("Meren of Clan Nel Toth").length).toBeGreaterThan(0);
    expect(screen.queryByText("Yarok, the Desecrated")).toBeNull();
  });

  // The floor takes rows out of `items` but not out of the pool the search
  // covered, so under the novelty sort the ranked count would understate where
  // we looked.
  it("names the whole unbuilt pool, not the ranked count, under the novelty sort", async () => {
    const { container } = render(
      <DiscoveryView basis="classifier"
        encoded={list({ items: named(), candidateCount: 40, sort: "new", floorExcluded: 38 })}
      />,
    );
    fireEvent.change(field(), { target: { value: "krenko" } });
    await waitFor(() =>
      expect(container.textContent).toContain(discoverCopy.empty.body("krenko", 40)),
    );
  });

  // The name is in nothing this reader can see, so the state says where we
  // looked and offers the one correction that could help.
  it("names the query when nothing is called that, and clears the search rather than the colours", async () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.click(pip(filterCopy.colour.names.g));
    fireEvent.change(field(), { target: { value: "krenko" } });

    await waitFor(() => expect(container.textContent).toContain(discoverCopy.empty.heading));

    // The field's ✕ carries a different name from the state's button, so the
    // one with the visible label is unambiguous.
    const cta = screen
      .getAllByRole("button", { name: discoverCopy.empty.clearSearch })
      .find((b) => b.textContent === discoverCopy.empty.clearSearch);
    fireEvent.click(cta as HTMLElement);
    // The pips survive: the button cleared what the reader typed, and clearing
    // the colours too would undo a filter this state never blamed.
    await waitFor(() =>
      expect(pip(filterCopy.colour.names.g).getAttribute("aria-checked")).toBe("true"),
    );
  });

  // Every sentence this surface could write about a miss waits on the lookup,
  // and the branch below the empties is a list with no rows in it. That gap used
  // to paint blank for as long as the round trip took.
  it("holds the space with the loading mark while the lookup is out", async () => {
    findExcluded.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "krenko" } });

    await waitFor(() =>
      expect(container.querySelector("[data-pending-mark]")).toBeInTheDocument(),
    );
    // And says nothing while it waits: the claim is the thing being checked.
    expect(container.textContent).not.toContain(discoverCopy.empty.heading);
  });

  // ── The excluded match ────────────────────────────────────────────────
  const excluded = planeCopy.excluded;

  // A name that IS in the list and was removed by a pip is a colour exclusion,
  // not a miss — telling the reader to check the spelling would be wrong, and
  // the colour empty state would not say which row went missing.
  it("names the commander a pip excluded, and clears the filter that took it", async () => {
    const items = [
      item({ slug: "a", name: "Yarok, the Desecrated", colorIdentity: ["U"] }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 1 })} />,
    );
    fireEvent.click(pip(filterCopy.colour.names.g));
    fireEvent.change(field(), { target: { value: "yarok" } });

    await waitFor(() =>
      expect(container.textContent).toContain(search.heldHeading("Yarok, the Desecrated")),
    );
    expect(container.textContent).not.toContain(search.noneHeading("yarok"));
    expect(container.textContent).not.toContain(discoveryCopy.empty.filteredHeading);
    expect(container.textContent).toContain(search.heldAside(1));

    fireEvent.click(screen.getByRole("button", { name: excluded.colorsCta }));
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
  });

  // The mode, not the pips: the row survives `Any of these`, so clearing the
  // colour filter would undo more than the reader needs.
  it("names the mode when the mode is what removed the only match", async () => {
    const items = [
      item({
        slug: "a",
        name: "Yarok, the Desecrated",
        colorIdentity: ["B", "G", "U"],
      }),
    ];
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 1 })} />,
    );
    fireEvent.click(pip(filterCopy.colour.names.g));
    fireEvent.click(mode(filterCopy.match.exactly));
    fireEvent.change(field(), { target: { value: "yarok" } });

    await waitFor(() =>
      expect(container.textContent).toContain(search.heldHeading("Yarok, the Desecrated")),
    );
    fireEvent.click(screen.getByRole("button", { name: excluded.joinCta }));
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
  });

  // The row is not in the payload at all, so only the server can say why.
  it("reports a match the server held back, once the typing settles", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "built", pct: null },
    ]);
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "atraxa" } });
    // Nothing is claimed until the server has answered: "no commander is named
    // that" is a statement about the index, and printing it here would be a
    // sentence the very next render contradicts.
    expect(container.textContent).not.toContain(search.noneHeading("atraxa"));

    await waitFor(() =>
      expect(container.textContent).toContain(search.heldHeading("Atraxa, Praetors' Voice")),
    );
    expect(container.textContent).toContain(excluded.heldScope);
    // The one cause this lane cannot undo in place: the owned list is another
    // route, so the correction is a link carrying the search, not a control.
    expect(screen.getByRole("link", { name: excluded.scopeCta })).toHaveAttribute(
      "href",
      "/commanders?q=atraxa",
    );
    // No `avail` in the ask: this lane scores the whole collection, so the
    // lookup has only one pool it could be asking about.
    expect(findExcluded).toHaveBeenCalledWith("atraxa", { sort: "fit" });
  });

  // Hide a commander, README §4: a hidden commander is out of the list, so typing its name lands here,
  // and its page still opens.
  it("names a match the player hid, and opens its page", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "g", name: "Ghalta, Primal Hunger", cause: "hidden", pct: null, slug: "ghalta-primal-hunger" },
    ]);
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "ghal" } });
    await waitFor(() =>
      expect(container.textContent).toContain("Ghalta, Primal Hunger is here. You hid it"),
    );
    expect(container.textContent).toContain(
      "It matches, but you hid it, so it stays out of your lists.",
    );
    expect(container.textContent).toContain("1 match, 0 shown");
    expect(screen.getByRole("link", { name: "Open its page" })).toHaveAttribute(
      "href",
      "/commanders/ghalta-primal-hunger",
    );
  });

  it("offers no page for a hidden match no list holds a slug for", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "g", name: "Ghalta, Primal Hunger", cause: "hidden", pct: null, slug: null },
    ]);
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "ghal" } });
    await waitFor(() =>
      expect(container.textContent).toContain(excluded.heldHiddenHeading("Ghalta, Primal Hunger")),
    );
    expect(screen.queryByRole("link", { name: excluded.hiddenCta })).toBeNull();
    expect(screen.queryByRole("button", { name: excluded.hiddenCta })).toBeNull();
  });

  it("says a hidden match in one sentence above a live list, linking its page", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "g", name: "Ghalta, the Desecrated", cause: "hidden", pct: null, slug: "ghalta-the-desecrated" },
    ]);
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "the" } });
    await waitFor(() =>
      expect(container.textContent).toContain(excluded.hiddenAlso("Ghalta, the Desecrated")),
    );
    expect(screen.getByRole("link", { name: excluded.hiddenCta })).toHaveAttribute(
      "href",
      "/commanders/ghalta-the-desecrated",
    );
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
  });

  // Edges state 11: every candidate this lane would show is hidden.
  it("says everything here is hidden when the player hid every candidate", () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: [], candidateCount: 0, hiddenCount: 2 })} />,
    );
    expect(container.textContent).toContain(planeCopy.allHidden.heading);
    expect(container.textContent).toContain(planeCopy.allHidden.discover(2));
    // The Hidden list's route does not exist yet, so there is no button to it.
    expect(screen.queryByRole("link", { name: planeCopy.allHidden.cta })).toBeNull();
  });

  it("keeps the all-hidden state off a list with candidates still in it", () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2, hiddenCount: 3 })} />,
    );
    expect(container.textContent).not.toContain(planeCopy.allHidden.heading);
  });

  // The same correction above a live list, where the aside draws it rather than
  // the zero state. Both call sites, because the link is the whole fix and a
  // button here would be the bug again.
  it("links the aside’s correction to the owned lane when a deck already holds the match", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "built", pct: null },
    ]);
    render(<DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />);
    fireEvent.change(field(), { target: { value: "the" } });

    await waitFor(() =>
      expect(screen.getByRole("link", { name: excluded.scopeCta })).toHaveAttribute(
        "href",
        "/commanders?q=the",
      ),
    );
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
  });

  // A failed lookup is not an answer. "No commander is named that" covers the
  // whole index, and a round trip that never came back checked none of it.
  it("makes no claim about the index when the lookup fails", async () => {
    findExcluded.mockRejectedValue(new Error("down"));
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "atraxa" } });
    await waitFor(() => expect(container.textContent).toContain(search.unknownHeading("atraxa")));
    expect(container.textContent).not.toContain(search.noneHeading("atraxa"));
  });

  // A query matching more names than the action counts comes back null, and an
  // uncounted set is not an empty one.
  it("makes no claim about the index when the lookup declines to answer", async () => {
    findExcluded.mockResolvedValue(null);
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "atraxa" } });
    await waitFor(() => expect(container.textContent).toContain(search.unknownHeading("atraxa")));
    expect(container.textContent).not.toContain(search.noneHeading("atraxa"));
  });

  // The action declines a one-character query, so the index is unchecked for it
  // in exactly the way a failure leaves it unchecked.
  it("keeps the index out of it when the query is too short to ask about", async () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "z" } });
    await waitFor(() => expect(container.textContent).toContain(search.unknownHeading("z")));
    expect(container.textContent).not.toContain(search.noneHeading("z"));
    expect(findExcluded).not.toHaveBeenCalled();
  });

  // Clearing the colours would surface nothing, because nothing in the list is
  // named that. The colour state offers a control that changes the screen, so a
  // query that empties the list on its own outranks it.
  it("does not blame the colours for a query that matches nothing either", async () => {
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.click(pip(filterCopy.colour.names.g));
    fireEvent.change(field(), { target: { value: "z" } });
    await waitFor(() => expect(container.textContent).toContain(search.unknownHeading("z")));
    expect(screen.queryByText(empty.filteredHeading)).toBeNull();
  });

  // Some matches survive: the report sits above them rather than replacing them.
  it("puts the aside above a live list, and counts the group rather than naming it", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "y", name: "Meren of Clan Nel Toth", cause: "floor", pct: 12 },
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "floor", pct: 9 },
    ]);
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "the" } });

    await waitFor(() =>
      expect(container.textContent).toContain(search.asideMore(2, excluded.control.floor(30))),
    );
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain(search.heldAside(2));
  });

  // A report is written about one query. Carrying it into the next would name a
  // commander the reader is no longer asking about.
  it("drops the server’s answer when the query changes", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "built", pct: null },
    ]);
    const { container } = render(
      <DiscoveryView basis="classifier" encoded={list({ items: named(), candidateCount: 2 })} />,
    );
    fireEvent.change(field(), { target: { value: "atraxa" } });
    await waitFor(() =>
      expect(container.textContent).toContain(search.heldHeading("Atraxa, Praetors' Voice")),
    );

    findExcluded.mockResolvedValue([]);
    fireEvent.change(field(), { target: { value: "yarok" } });
    await waitFor(() =>
      expect(container.textContent).not.toContain(search.heldHeading("Atraxa, Praetors' Voice")),
    );
  });

  // ── The exclusion line ────────────────────────────────────────────────
  it("prints the list’s receipt in tier order, and nothing when nothing was excluded", () => {
    const items = [
      item({ slug: "a", colorIdentity: ["G"] }),
      item({ slug: "b", colorIdentity: ["U"], rank: 2 }),
    ];
    const discovery = list({
      items,
      candidateCount: 214,
      sort: "new",
      floorExcluded: 1047,
      unmeasured: 212,
      bestPct: 22,
    });
    const { container, rerender } = render(<DiscoveryView basis="classifier" encoded={discovery} />);
    // The floor alone, so the nearest miss has room.
    expect(container.textContent).toContain(
      planeCopy.exclusion.floorAloneWithUnmeasured(1047, 212, 30, 22),
    );

    fireEvent.click(pip(filterCopy.colour.names.g));
    expect(container.textContent).toContain(
      planeCopy.exclusion.join2(
        planeCopy.exclusion.colors(1, ["G"]),
        planeCopy.exclusion.floorWithUnmeasured(1047, 212, 30),
      ),
    );

    rerender(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 2, sort: "new" })} />);
    expect(container.textContent).not.toContain("support floor");
  });

  // The one-report rule: one thing below the rack explains the list at 375px,
  // and it is the aside. The line stays in the DOM for the widths that have
  // room, as one element rather than a duplicated subtree.
  it("hands the phone to the aside when both would explain the list", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "floor", pct: 9 },
    ]);
    const { container } = render(
      <DiscoveryView basis="classifier"
        encoded={list({
          items: named(),
          candidateCount: 214,
          sort: "new",
          floorExcluded: 1047,
          unmeasured: 212,
          bestPct: 22,
        })}
      />,
    );
    const lineText = planeCopy.exclusion.floorAloneWithUnmeasured(1047, 212, 30, 22);
    const lineNode = () =>
      Array.from(container.querySelectorAll("div")).find((el) => el.textContent === lineText);
    expect(lineNode()?.className).not.toContain("hidden");

    fireEvent.change(field(), { target: { value: "the" } });
    await waitFor(() => expect(lineNode()?.className).toContain("hidden sm:flex"));
    // One element, not two: the sentence is in the DOM once at either width.
    expect(
      Array.from(container.querySelectorAll("div")).filter((el) => el.textContent === lineText),
    ).toHaveLength(1);
  });
});

describe("DiscoveryView Printed in", () => {
  beforeEach(() => {
    stubWidth(true);
    findExcluded.mockReset();
    findExcluded.mockResolvedValue([]);
  });
  afterEach(() => vi.unstubAllGlobals());

  const items = [
    item({ slug: "a", name: "Alpha", colorIdentity: ["G"] }),
    item({ slug: "b", name: "Beta", colorIdentity: ["G"], rank: 2 }),
    item({ slug: "c", name: "Gamma", colorIdentity: ["R"], rank: 3 }),
  ];
  // Aligned to the rows by position: Alpha and Beta in HOB, Gamma in CMM.
  const printedIn = {
    sets: [
      { code: "hob", name: "The Hobbit" },
      { code: "cmm", name: "Commander Masters" },
    ],
    rows: [[0], [0], [1]],
  };
  const shown = () => ["Alpha", "Beta", "Gamma"].filter((n) => screen.queryByText(n) !== null);

  it("keeps the commanders printed in the chosen set", () => {
    window.history.replaceState(null, "", "/discover?p=hob");
    render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} printedIn={printedIn} />);
    expect(shown()).toEqual(["Alpha", "Beta"]);
  });

  it("applies nothing, and draws no chip, when the page shipped no index", () => {
    window.history.replaceState(null, "", "/discover?p=hob");
    render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} />);
    expect(shown()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(screen.queryByRole("button", { name: /Printed in HOB/ })).not.toBeInTheDocument();
  });

  it("drops the filter when a later payload arrives with no index", () => {
    window.history.replaceState(null, "", "/discover?p=hob");
    const { rerender } = render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} printedIn={printedIn} />);
    expect(shown()).toEqual(["Alpha", "Beta"]);
    rerender(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} />);
    expect(shown()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(screen.queryByRole("button", { name: /Printed in HOB/ })).not.toBeInTheDocument();
  });

  it("names the set filter when it alone emptied the list", () => {
    window.history.replaceState(null, "", "/discover?p=zzz");
    render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} printedIn={printedIn} />);
    expect(screen.getByText(discoveryCopy.empty.filteredSetsHeading)).toBeInTheDocument();
    expect(screen.getByText(discoveryCopy.empty.filteredSetsBody("Printed in ZZZ", 3))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: discoveryCopy.empty.filteredSetsCta }));
    expect(shown()).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  // Green with CMM leaves nothing, though each alone keeps rows: the body names the pair rather
  // than blaming either, and the primary clears CMM, which gives back two where green gives one.
  it("names both when the combination emptied the list, and clears the one that gives back more", () => {
    window.history.replaceState(null, "", "/discover?c=g&p=cmm");
    render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} printedIn={printedIn} />);
    expect(screen.getByText(discoveryCopy.empty.filteredTogetherHeading)).toBeInTheDocument();
    expect(screen.getByText("None of the 3 you don’t own is green and printed in CMM.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: discoveryCopy.empty.filteredSetsCta }));
    expect(shown()).toEqual(["Alpha", "Beta"]);
  });

  // Red with HOB: dropping red gives back two, dropping HOB one.
  it("clears the colors when dropping them gives back more", () => {
    window.history.replaceState(null, "", "/discover?c=r&p=hob");
    render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} printedIn={printedIn} />);
    fireEvent.click(screen.getByRole("button", { name: discoveryCopy.empty.filteredCta }));
    expect(shown()).toEqual(["Alpha", "Beta"]);
  });

  // Black with a set nobody here was printed in: neither alone gives anything back, so clearing
  // one would land on a second empty state. The primary clears both.
  it("clears both when neither alone gives anything back", () => {
    window.history.replaceState(null, "", "/discover?c=b&p=zzz");
    render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 3 })} printedIn={printedIn} />);
    fireEvent.click(screen.getByRole("button", { name: discoveryCopy.empty.filteredBothCta }));
    expect(shown()).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});

describe("DiscoveryView — the rows' art and their place in the list", () => {
  it("draws the first screen’s art at once and holds the rows below it", () => {
    // An observer that never reports, so a held row stays held while the test reads it.
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    try {
      const items = Array.from({ length: 8 }, (_, i) =>
        item({ slug: `art-${i}`, name: `Art Commander ${i}`, rank: i + 1, artCropUri: `https://cards.scryfall.io/art_crop/front/${i}.jpg` }),
      );
      const { container } = render(<DiscoveryView basis="classifier" encoded={list({ items, candidateCount: 8 })} />);
      const layers = [...container.querySelectorAll<HTMLElement>(".art-wash-art")];
      expect(layers.length).toBeGreaterThan(5);
      expect(layers.slice(0, 5).every((l) => l.style.backgroundImage.includes("art_crop"))).toBe(true);
      expect(layers[5].style.backgroundImage).toBe("");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// Hide a commander on Discover (design_handoff_the99_hide_commander README §1-2): the same glyph and Undo row as For
// you, and a client cache of rankings that must not hand a hidden row back on a sort flip.
describe("DiscoveryView · hiding a row", () => {
  beforeEach(() => {
    stubWidth(true);
    replace.mockClear();
    findExcluded.mockReset();
    findExcluded.mockResolvedValue([]);
    hide.mockReset();
    unhide.mockReset();
    window.history.replaceState(null, "", "/discover");
  });
  afterEach(() => vi.unstubAllGlobals());

  const rows3 = [
    item({ slug: "a", name: "Alpha", rank: 1 }),
    item({ slug: "b", name: "Bravo", rank: 2 }),
    item({ slug: "c", name: "Charlie", rank: 3 }),
  ];
  // As the page ships them: every row whole, with the oracle id the row's Hide hands the action.
  const shipped = (over: Partial<DiscoveryList>) => {
    const encoded = list(over);
    const slugs = (over.items ?? []).map((r) => r.slug);
    return cutToWindow(encoded, new Set(slugs), slugs.map((slug) => `oracle-${slug}`));
  };
  const cardsNow = () => screen.getAllByRole("listitem");
  const glyph = (name: string) => screen.getByRole("button", { name: `Hide ${name}` });
  const undo = (name: string) => screen.queryByRole("button", { name: `Undo hiding ${name}` });
  const rowLink = (name: string) => screen.queryByRole("link", { name: new RegExp(`^${name} · `) });
  const flip = (label: string) => {
    fireEvent.click(screen.getByRole("button", { name: /^Order · / }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: label }));
  };

  it("hides the oracle id the drawn row shipped with, and keeps the Undo row and the ranks below through the next payload", async () => {
    hide.mockResolvedValue(true);
    const { rerender } = render(
      <DiscoveryView basis="classifier" encoded={shipped({ items: rows3, candidateCount: 3 })} />,
    );

    await act(async () => {
      fireEvent.click(glyph("Bravo"));
    });
    expect(hide).toHaveBeenCalledWith("oracle-b");
    expect(cardsNow()[1]).toHaveTextContent("Bravo hidden");
    expect(undo("Bravo")).toHaveFocus();
    expect(rowLink("Bravo")).toBeNull();

    // The server's next payload leaves Bravo out and ranks Charlie 2. The Undo row stands where Bravo was, and
    // Charlie keeps the 3 the reader saw until the next load.
    rerender(
      <DiscoveryView
        basis="classifier"
        encoded={shipped({ items: [rows3[0], { ...rows3[2], rank: 2 }], candidateCount: 2 })}
      />,
    );
    expect(cardsNow()[1]).toHaveTextContent("Bravo hidden");
    expect(within(cardsNow()[2]).getAllByText("3").length).toBeGreaterThan(0);

    // Undo hands back the oracle id the hide answered: no payload carries the slug any longer.
    unhide.mockResolvedValue(true);
    await act(async () => {
      fireEvent.click(undo("Bravo")!);
    });
    expect(unhide).toHaveBeenCalledWith("oracle-b");
    expect(rowLink("Bravo")).toBeInTheDocument();
    expect(within(cardsNow()[1]).getAllByText("2").length).toBeGreaterThan(0);
    expect(glyph("Bravo")).toHaveFocus();
  });

  it("never brings a hidden row back from a ranking cached before the hide", async () => {
    hide.mockResolvedValue(true);
    const fit = shipped({ items: rows3, candidateCount: 3 });
    const fresh = shipped({
      items: [item({ slug: "b", name: "Bravo", rank: 1 }), item({ slug: "a", name: "Alpha", rank: 2 })],
      candidateCount: 2,
      sort: "new",
    });
    const { rerender } = render(<DiscoveryView basis="classifier" encoded={fit} />);
    // Rank `new` once, so it sits in the client cache with Bravo in it.
    flip(discoverCopy.order.somethingNew);
    window.history.replaceState(null, "", "/discover?o=new");
    rerender(<DiscoveryView basis="classifier" encoded={fresh} />);
    flip(discoverCopy.order.bestFit);
    expect(replace).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(glyph("Bravo"));
    });

    // Served again from the cache, no request: Bravo is the Undo row there too, never the row.
    flip(discoverCopy.order.somethingNew);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(rowLink("Bravo")).toBeNull();
    expect(cardsNow()[0]).toHaveTextContent("Bravo hidden");
  });

  it("brings a refused hide's row back with the shared toast, and points to Hidden when the undo is refused", async () => {
    hide.mockResolvedValue(false);
    render(<DiscoveryView basis="classifier" encoded={shipped({ items: rows3, candidateCount: 3 })} />);
    await act(async () => {
      fireEvent.click(glyph("Alpha"));
    });
    expect(rowLink("Alpha")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t hide Alpha.");

    hide.mockResolvedValue(true);
    unhide.mockRejectedValue(new Error("down"));
    await act(async () => {
      fireEvent.click(glyph("Charlie"));
    });
    await act(async () => {
      fireEvent.click(undo("Charlie")!);
    });
    expect(screen.getByText("Charlie hidden")).toBeInTheDocument();
    expect(undo("Charlie")).toBeNull();
    expect(screen.getByText("Couldn’t bring that back. Unhide it from Hidden.")).toHaveAttribute("role", "alert");
  });

  it("drops a ranking read after the hide once the hide is undone, so the flip reads it fresh", async () => {
    hide.mockResolvedValue(true);
    unhide.mockResolvedValue(true);
    const { rerender } = render(<DiscoveryView basis="classifier" encoded={shipped({ items: rows3, candidateCount: 3 })} />);
    await act(async () => {
      fireEvent.click(glyph("Bravo"));
    });

    // `new` is read after the hide, so it lacks Bravo, and is filed in the cache that way.
    flip(discoverCopy.order.somethingNew);
    expect(replace).toHaveBeenCalledTimes(1);
    window.history.replaceState(null, "", "/discover?o=new");
    rerender(
      <DiscoveryView
        basis="classifier"
        encoded={shipped({ items: [item({ slug: "c", name: "Charlie", rank: 1 }), item({ slug: "a", name: "Alpha", rank: 2 })], candidateCount: 2, sort: "new" })}
      />,
    );
    expect(rowLink("Bravo")).toBeNull();
    // Back to the ranking the hide was pressed in, from the cache: the Undo row stands there.
    flip(discoverCopy.order.bestFit);
    expect(replace).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(undo("Bravo")!);
    });
    expect(rowLink("Bravo")).toBeInTheDocument();

    // `new` without Bravo is no longer served from the cache: the flip asks the server again.
    flip(discoverCopy.order.somethingNew);
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it("places a retried hide in the list as it stands at the retry", async () => {
    hide.mockResolvedValue(false);
    const { rerender } = render(<DiscoveryView basis="classifier" encoded={shipped({ items: rows3, candidateCount: 3 })} />);
    await act(async () => {
      fireEvent.click(glyph("Alpha"));
    });
    // A fresh payload moves Alpha to third before the reader presses Try again.
    const moved = [{ ...rows3[1], rank: 1 }, { ...rows3[2], rank: 2 }, { ...rows3[0], rank: 3 }];
    rerender(<DiscoveryView basis="classifier" encoded={shipped({ items: moved, candidateCount: 3 })} />);
    hide.mockResolvedValue(true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    // The next payload leaves Alpha out: its Undo row stands where it stood at the retry, not where it first was.
    rerender(<DiscoveryView basis="classifier" encoded={shipped({ items: moved.slice(0, 2), candidateCount: 2 })} />);
    expect(cardsNow()[2]).toHaveTextContent("Alpha hidden");
  });

  it("treats an Undo of a hide the server refused as nothing to undo", async () => {
    let refuseHide: (ok: boolean) => void = () => {};
    hide.mockReturnValue(new Promise<boolean>((r) => (refuseHide = r)));
    render(<DiscoveryView basis="classifier" encoded={shipped({ items: rows3, candidateCount: 3 })} />);
    await act(async () => {
      fireEvent.click(glyph("Bravo"));
    });
    // Undo pressed while the hide is still in flight, and the hide then refused.
    await act(async () => {
      fireEvent.click(undo("Bravo")!);
    });
    await act(async () => {
      refuseHide(false);
    });
    expect(unhide).not.toHaveBeenCalled();
    expect(rowLink("Bravo")).toBeInTheDocument();
    expect(undo("Bravo")).toBeNull();
  });

  it("never sends a superseded Undo's unhide after a newer Hide of the same row", async () => {
    let answerFirstHide: (ok: boolean) => void = () => {};
    hide.mockReturnValueOnce(new Promise<boolean>((r) => (answerFirstHide = r)));
    hide.mockResolvedValue(true);
    unhide.mockResolvedValue(true);
    render(<DiscoveryView basis="classifier" encoded={shipped({ items: rows3, candidateCount: 3 })} />);
    await act(async () => {
      fireEvent.click(glyph("Bravo"));
    });
    // Undo while the first hide is still in flight: the row comes back at once.
    await act(async () => {
      fireEvent.click(undo("Bravo")!);
    });
    expect(rowLink("Bravo")).toBeInTheDocument();
    // Hide again, and only then does the first hide answer.
    await act(async () => {
      fireEvent.click(glyph("Bravo"));
    });
    await act(async () => {
      answerFirstHide(true);
    });
    expect(hide).toHaveBeenCalledTimes(2);
    expect(unhide).not.toHaveBeenCalled();
    // The newer hide governs: the Undo row stands.
    expect(rowLink("Bravo")).toBeNull();
    expect(screen.getByText("Bravo hidden")).toBeInTheDocument();
    expect(undo("Bravo")).toBeInTheDocument();
  });
});
