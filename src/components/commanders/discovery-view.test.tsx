import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { DiscoveryList } from "../../lib/discovery/list";
import { availabilityCopy } from "../../lib/copy/availability";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { planeCopy } from "../../lib/copy/commanders-plane";
import { revealAnnouncement } from "./reveal-control";
import { DiscoveryView } from "./discovery-view";

// Every control on this surface navigates: the scope flip swaps which list the
// route renders, and the sort and availability flips change what the server
// ranks. None of them is a client-side re-sort, so the router is the whole API.
// The colour filter is the exception, and it is not a navigation: it narrows a
// list the server already ranked, so it is read from and mirrored to the live
// URL rather than routed.
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

// The one thing on this surface the client cannot answer: rows the server left
// out of the payload. Mocked rather than stubbed at the fetch layer, because the
// action IS the boundary — it reaches the database, and importing it for real
// would pull the driver into a component test.
const { findExcluded } = vi.hoisted(() => ({ findExcluded: vi.fn() }));
vi.mock("../../app/commanders/actions", () => ({ findExcludedMatches: findExcluded }));

const list = (over: Partial<DiscoveryList> = {}): DiscoveryList => ({
  items: [],
  candidateCount: 0,
  cardsRead: 2805,
  freePoolSize: 2805,
  bestPct: null,
  floorExcluded: 0,
  poolExcluded: 0,
  unmeasured: 0,
  hasDecks: true,
  deckIdentities: [],
  availOk: true,
  sort: "fit",
  ...over,
});

const item = (over: Partial<DiscoveryList["items"][number]>): DiscoveryList["items"][number] => ({
  oracleId: "a",
  slug: "a",
  name: "A Commander",
  colorIdentity: ["G"],
  imageUri: null,
  rank: 1,
  owned: false,
  ownedSupport: 12,
  edhrecTotal: 40,
  colorPoolSize: 34,
  roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 },
  counts: null,
  price: { kind: "absent" },
  tagTotal: 4,
  unplayedLabels: [],
  unplayedCount: 0,
  nearestDeck: null,
  supportPct: null,
  ...over,
});

describe("DiscoveryView", () => {
  beforeEach(() => {
    replace.mockClear();
    findExcluded.mockReset();
    findExcluded.mockResolvedValue([]);
    window.history.replaceState(null, "", "/commanders?scope=play");
  });

  it("puts the sort menu in the bar's order slot", () => {
    render(<DiscoveryView discovery={list()} avail="free" />);
    expect(
      screen.getAllByRole("button", {
        name: discoveryCopy.sort.triggerAria(discoveryCopy.sort.fit),
      }).length,
    ).toBeGreaterThan(0);
  });

  // `fit` is the default and is written as an absence, so a link shared from the
  // default ordering carries no `sort` at all.
  it("navigates on a sort choice, keeping the scope it is under", () => {
    render(<DiscoveryView discovery={list()} avail="free" />);
    fireEvent.click(screen.getAllByRole("button", { name: /Sort:/ })[0]);
    fireEvent.click(
      screen.getAllByRole("menuitemradio", { name: discoveryCopy.sort.newAria })[0],
    );
    expect(replace).toHaveBeenCalledWith("?scope=play&sort=new", { scroll: false });
  });

  it("navigates on an availability choice rather than re-ranking on the client", () => {
    render(<DiscoveryView discovery={list()} avail="free" />);
    fireEvent.click(
      screen.getAllByRole("radio", { name: availabilityCopy.ranking.allAria })[0],
    );
    expect(replace).toHaveBeenCalledWith("?scope=play&avail=all", { scroll: false });
  });

  // The floor's exclusions are already gone from `items`, so the count the bar
  // shows is the one the server ranked, not a client-side subtraction.
  it("counts the items it carries, and filters them by colour", () => {
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["U"], rank: 2 }),
    ];
    render(<DiscoveryView discovery={list({ items, candidateCount: 2 })} avail="free" />);
    expect(screen.getAllByText("Showing 2 of 2").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.getAllByText("Showing 1 of 2").length).toBeGreaterThan(0);
  });

  // The scope flip carries `?c=` across, so this list has to read it — otherwise
  // the URL says Golgari and the pips say nothing.
  it("opens with the colours the incoming URL names", () => {
    window.history.replaceState(null, "", "/commanders?c=BG&scope=play");
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["B", "G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["U"], rank: 2 }),
    ];
    render(<DiscoveryView discovery={list({ items, candidateCount: 2 })} avail="free" />);
    expect(screen.getAllByText("Showing 1 of 2").length).toBeGreaterThan(0);
  });

  it("heads the page with the ranked count, not the pre-exclusion candidate count", () => {
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["B", "G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["U"] }),
    ];
    render(
      <DiscoveryView
        discovery={list({ items, candidateCount: 40, sort: "new", floorExcluded: 38 })}
        avail="free"
      />,
    );
    const subtitle = `${discoveryCopy.scope.subtitlePlay(2, 2805, "new")} · ${
      discoveryCopy.scope.subtitleFree
    }`;
    expect(screen.getAllByText(subtitle).length).toBeGreaterThan(0);
  });

  it("mirrors a colour choice into the URL without dropping the server's params", () => {
    render(<DiscoveryView discovery={list()} avail="free" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(window.location.search).toBe("?scope=play&c=G");
    expect(replace).not.toHaveBeenCalled();
  });

  it("announces a re-rank on its own live region once the new ordering lands", () => {
    const { rerender } = render(<DiscoveryView discovery={list()} avail="free" />);
    rerender(<DiscoveryView discovery={list({ sort: "new" })} avail="free" />);
    expect(screen.getByText(discoveryCopy.sort.announce("new", 0))).toBeTruthy();
  });

  // ── The three empty states ────────────────────────────────────────────
  const empty = discoveryCopy.empty;

  // State 1 sits ABOVE a full list: with no decks built the fit ranking is
  // complete and only the novelty ordering is unavailable.
  it("banners the no-decks reason without emptying the list", () => {
    const items = [item({})];
    render(<DiscoveryView discovery={list({ items, hasDecks: false })} avail="free" />);
    expect(screen.getByText(empty.noDecksHeading)).toBeTruthy();
    expect(screen.getAllByText("A Commander").length).toBeGreaterThan(0);
  });

  it("explains an empty novelty ranking with the floor that emptied it", () => {
    // The URL is what put the list on `sort=new`, so the CTA's flip back to the
    // default is a real change rather than the active option re-chosen.
    window.history.replaceState(null, "", "/commanders?scope=play&sort=new");
    render(
      <DiscoveryView
        discovery={list({ sort: "new", candidateCount: 3334, floorExcluded: 3334, bestPct: 18 })}
        avail="free"
      />,
    );
    expect(screen.getByText(empty.floorHeading)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: empty.floorCta }));
    expect(replace).toHaveBeenCalledWith("?scope=play", { scroll: false });
  });

  // An empty list the floor did not empty is a different fact — nothing had a
  // distance to measure — and the floor copy would name a floor that took nobody.
  it("does not blame the floor for an empty list it never excluded from", () => {
    render(<DiscoveryView discovery={list({ sort: "new" })} avail="free" />);
    expect(screen.queryByText(empty.floorHeading)).toBeNull();
  });

  it("blames the colours when the filter is what emptied the list, and names the built decks", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView
        discovery={list({ items, deckIdentities: [["B", "G"], ["R"]] })}
        avail="free"
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.getByText(empty.filteredHeading)).toBeTruthy();
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el.textContent ===
            `${empty.filteredBody("green", 1)} ${empty.filteredBuiltClause(1, 2, "Green")}`,
      ),
    ).toBeTruthy();
  });

  // The clause claims those decks would have been in THIS list had they been
  // unbuilt, so with none matching there is nothing to explain the absence with.
  it("omits the built clause when no built deck matches the filter", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView discovery={list({ items, deckIdentities: [["R"]] })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.getByText(empty.filteredBody("green", 1))).toBeTruthy();
  });

  // The floor is a server-side exclusion the pips played no part in, so a
  // colour that matches nothing must not be answered with "none of the 3,334
  // candidates cleared the floor".
  it("blames the colours, not the floor, when the pips are what emptied the list", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView
        discovery={list({
          items,
          sort: "new",
          candidateCount: 3334,
          floorExcluded: 3333,
          bestPct: 18,
        })}
        avail="free"
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.queryByText(empty.floorHeading)).toBeNull();
    expect(screen.getByText(empty.filteredHeading)).toBeTruthy();
  });

  // The one genuinely new reason this state has under discovery, so the design
  // marks the whole clause rather than a phrase inside it.
  it("emphasises the built clause", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView discovery={list({ items, deckIdentities: [["G"]] })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    const clause = screen.getByText(empty.filteredBuiltClause(1, 1, "Green"));
    expect(clause.tagName).toBe("STRONG");
  });

  // The clause counts decks whose identity CONTAINS the filter, so it says those
  // decks cover the colours rather than that they are them.
  it("counts a wider deck identity, and does not call it the filtered one", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView discovery={list({ items, deckIdentities: [["G", "W"]] })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.getByText(empty.filteredBuiltClause(1, 1, "Green"))).toBeTruthy();
    expect(screen.queryByText(/decks is Green/)).toBeNull();
  });

  it("does not say one of your 1 decks", () => {
    const items = [item({ colorIdentity: ["U"] })];
    render(
      <DiscoveryView discovery={list({ items, deckIdentities: [["G"]] })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.getByText(/^Your only deck covers Green/)).toBeTruthy();
  });

  // ── The window ────────────────────────────────────────────────────────
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      item({ oracleId: `o${i}`, slug: `s${i}`, name: `Commander ${i}`, rank: i + 1 }),
    );

  it("opens on one step and reveals the next, naming the band it is about to show", () => {
    render(<DiscoveryView discovery={list({ items: many(60), candidateCount: 60 })} avail="free" />);
    expect(screen.queryByText("Commander 25")).toBeNull();
    expect(screen.getByText(discoveryCopy.window.revealBand(26, 50, 60))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getAllByText("Commander 25").length).toBeGreaterThan(0);
    expect(screen.getByText(discoveryCopy.window.revealBand(51, 60, 60))).toBeTruthy();
  });

  // The count line and the reveal band are one feature: a windowed list says
  // how much of itself is showing, and the reveal says what it just added.
  it("counts the window in the bar, and speaks each reveal on the live region", () => {
    // The count's figures are their own `<b>` elements, so this reads the
    // sentence they sit in rather than looking for one text node.
    const { container } = render(
      <DiscoveryView discovery={list({ items: many(60), candidateCount: 60 })} avail="free" />,
    );
    expect(container.textContent).toContain("25 shown · 35 more below");

    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(container.textContent).toContain("50 shown · 10 more below");
    expect(screen.getByText(revealAnnouncement(50, 60, 25))).toBeTruthy();
  });

  // A list too short to have been windowed has no window to count, and its rows
  // never receive the reveal's focus move, so they are not tab stops.
  it("leaves an unwindowed list's rows out of the tab order", () => {
    const { container } = render(
      <DiscoveryView discovery={list({ items: many(10), candidateCount: 10 })} avail="free" />,
    );
    expect(container.querySelectorAll("li[tabindex]").length).toBe(0);
  });

  it("rules off a list that was windowed once it is fully revealed", () => {
    render(<DiscoveryView discovery={list({ items: many(30), candidateCount: 30 })} avail="free" />);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getByText(/End of ranking · 30 of 30/)).toBeTruthy();
  });

  // The only thing separating the control from the last card is the list's own
  // row gap, so outside the `<ul>` it sits flush against the card above it.
  it("keeps the reveal control inside the list, where the row gap reaches it", () => {
    const { container } = render(
      <DiscoveryView discovery={list({ items: many(60), candidateCount: 60 })} avail="free" />,
    );
    const control = screen.getByRole("button", { name: /Show 25 more commanders/ });
    expect(control.closest("ul")).toBe(container.querySelector("ul"));
  });

  // A length that is not a multiple of the step makes the last reveal overshoot,
  // and the live region is the one reader who would hear it: it speaks the raw
  // window, where the count line and the band are both clamped by their callers.
  it("stops the window at the end of the list on a final short step", () => {
    const { container } = render(
      <DiscoveryView discovery={list({ items: many(30), candidateCount: 30 })} avail="free" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getByText(revealAnnouncement(30, 30, 25))).toBeTruthy();
    expect(container.textContent).toContain("all 30 shown");
  });

  // A re-rank returns a differently ordered list under the same mounted
  // component, so a deep window would open it part-way down an unseen ranking.
  it("returns the window to the top when the ordering underneath it changes", () => {
    const items = many(60);
    const { rerender } = render(
      <DiscoveryView discovery={list({ items, candidateCount: 60 })} avail="free" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getAllByText("Commander 25").length).toBeGreaterThan(0);

    rerender(
      <DiscoveryView discovery={list({ items, candidateCount: 60, sort: "new" })} avail="free" />,
    );
    expect(screen.queryByText("Commander 25")).toBeNull();
  });

  it("returns the window to the top when a colour filter narrows the list", () => {
    render(<DiscoveryView discovery={list({ items: many(60), candidateCount: 60 })} avail="free" />);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getAllByText("Commander 25").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.queryByText("Commander 25")).toBeNull();
  });

  // #339. Every flip on this surface is a server round-trip, and before this a
  // reader toggling back to a ranking they had just been looking at paid for it
  // twice. The payloads are kept as they arrive, so the second ask is free.
  describe("the client cache", () => {
    const freeList = list({
      items: [item({ name: "Free Ranked", slug: "free-ranked" })],
      candidateCount: 1,
    });
    const allList = list({
      items: [item({ name: "All Ranked", slug: "all-ranked" })],
      candidateCount: 1,
    });
    const clickAvail = (aria: string) =>
      fireEvent.click(screen.getAllByRole("radio", { name: aria })[0]);

    it("routes on a pair it has not seen and serves one it has", () => {
      const { rerender } = render(<DiscoveryView discovery={freeList} avail="free" />);
      // Plural queries throughout: a row renders its name once per breakpoint
      // subtree, so the singular form matches two nodes and throws.
      expect(screen.getAllByText("Free Ranked").length).toBeGreaterThan(0);

      // Miss: nothing has ever ranked `all`, so this has to be fetched.
      clickAvail(availabilityCopy.ranking.allAria);
      expect(replace).toHaveBeenCalledTimes(1);

      // The navigation lands, and the page re-renders with the server's answer.
      window.history.replaceState(null, "", "/commanders?scope=play&avail=all");
      rerender(<DiscoveryView discovery={allList} avail="all" />);
      expect(screen.getAllByText("All Ranked").length).toBeGreaterThan(0);

      // Hit: the free ranking is still in hand. No second request, and the URL
      // still names what is on screen so a copied link opens on it.
      clickAvail(availabilityCopy.ranking.freeAria);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText("Free Ranked").length).toBeGreaterThan(0);
      expect(window.location.search).toBe("?scope=play");
    });

    // A cached flip writes the URL itself, so it has to write it the way the
    // navigating path does — defaults as absences. Otherwise `list-nav`'s guards,
    // which read the live URL, would stop telling a default from a choice.
    it("leaves parameters it does not own alone when it serves from cache", () => {
      window.history.replaceState(null, "", "/commanders?scope=play&c=BG");
      const { rerender } = render(<DiscoveryView discovery={freeList} avail="free" />);
      clickAvail(availabilityCopy.ranking.allAria);
      window.history.replaceState(null, "", "/commanders?scope=play&c=BG&avail=all");
      rerender(<DiscoveryView discovery={allList} avail="all" />);

      clickAvail(availabilityCopy.ranking.freeAria);
      const params = new URLSearchParams(window.location.search);
      expect(params.get("c")).toBe("BG");
      expect(params.get("scope")).toBe("play");
      expect(params.has("avail")).toBe(false);
    });

    // The payload the server just produced is the truth, whatever the cache holds
    // for that pair — an upload or a new deck re-ranks everything.
    it("takes a fresh payload over a cached one for the same pair", () => {
      const { rerender } = render(<DiscoveryView discovery={freeList} avail="free" />);
      const rebuilt = list({
        items: [item({ name: "Re-Ranked", slug: "re-ranked" })],
        candidateCount: 1,
      });
      rerender(<DiscoveryView discovery={rebuilt} avail="free" />);
      expect(screen.getAllByText("Re-Ranked").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Free Ranked").length).toBe(0);
    });

    // The availability is half the key a payload is filed under, so it has to be
    // watched as closely as the payload. A server render makes a new list object
    // every time, which means these two normally move together — but that holds
    // because of how the framework renders, not because of anything this hook
    // enforces, and the day it stops holding the ranking would be filed under the
    // wrong pair and the control would disagree with the list beneath it.
    it("follows the availability even when the payload object is unchanged", () => {
      const same = list({
        items: [item({ name: "Same Payload", slug: "same-payload" })],
        candidateCount: 1,
      });
      const { rerender } = render(<DiscoveryView discovery={same} avail="free" />);
      rerender(<DiscoveryView discovery={same} avail="all" />);

      // Watching the payload alone, the view would still be reporting `free` here
      // while the server had moved on to `all`.
      expect(
        screen
          .getAllByRole("radio", { name: availabilityCopy.ranking.allAria })[0]
          .getAttribute("aria-checked"),
      ).toBe("true");

      // And the pair is filed under `fit:all`, not overwriting `fit:free` — the
      // seeded entry is still there to be served without a request.
      clickAvail(availabilityCopy.ranking.freeAria);
      expect(replace).not.toHaveBeenCalled();
      expect(
        screen
          .getAllByRole("radio", { name: availabilityCopy.ranking.freeAria })[0]
          .getAttribute("aria-checked"),
      ).toBe("true");
    });
  });

  // ── The colour match mode (§7) ────────────────────────────────────────
  const join = planeCopy.join;

  // Absent, not disabled: with no pip lit there is nothing for a mode to join,
  // and a disabled control would invite a hunt for whatever would enable it.
  it("does not render the mode until a pip is lit", () => {
    render(<DiscoveryView discovery={list({ items: [item({})], candidateCount: 1 })} avail="free" />);
    expect(screen.queryByRole("radio", { name: join.exactlyAria })).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.getAllByRole("radio", { name: join.exactlyAria }).length).toBeGreaterThan(0);
  });

  it("narrows the list to the identities that are the selection and nothing else", () => {
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["B", "G"], rank: 2 }),
    ];
    render(<DiscoveryView discovery={list({ items, candidateCount: 2 })} avail="free" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(screen.getAllByText("Showing 2 of 2").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    expect(screen.getAllByText("Showing 1 of 2").length).toBeGreaterThan(0);
  });

  // `exact` in the URL, `exactly` in the code. The param is a word the player can
  // see and edit; the mapping lives in `parseJoin` and nowhere else.
  it("mirrors the mode into the URL as ?join=exact, and reads it back", () => {
    render(<DiscoveryView discovery={list()} avail="free" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    expect(window.location.search).toBe("?scope=play&c=G&join=exact");
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens under the mode the incoming URL names", () => {
    window.history.replaceState(null, "", "/commanders?scope=play&c=G&join=exact");
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["B", "G"], rank: 2 }),
    ];
    render(<DiscoveryView discovery={list({ items, candidateCount: 2 })} avail="free" />);
    expect(screen.getAllByText("Showing 1 of 2").length).toBeGreaterThan(0);
  });

  // A mode with no pip to modify changes no row, so leaving it in the URL would
  // be a filter the player cannot see and cannot clear.
  it("drops the mode from the URL when the last pip goes out", () => {
    render(<DiscoveryView discovery={list()} avail="free" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(window.location.search).toBe("?scope=play");
  });

  it("announces the mode with the count the flip produced", () => {
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["B", "G"], rank: 2 }),
    ];
    render(<DiscoveryView discovery={list({ items, candidateCount: 2 })} avail="free" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    expect(screen.getByText(join.announce("exactly", 1, ["G"]))).toBeTruthy();
  });

  // Both notes are asserted through `textContent`: the figures inside them are
  // emphasised, so the sentence is split across spans and no single text node
  // holds it.
  it("says what the mode did, under the control, only while it is exact", () => {
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["B", "G"], rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView discovery={list({ items, candidateCount: 2 })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(container.textContent).not.toContain(join.exactNote(2, 2, ["G"]));

    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    expect(container.textContent).toContain(join.exactNote(1, 2, ["G"]));
    expect(container.textContent).toContain(join.exactNoteShort(1, 2, ["G"]));
  });

  it("returns the window to the top when the mode narrows the list", () => {
    render(<DiscoveryView discovery={list({ items: many(60), candidateCount: 60 })} avail="free" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Show 25 more commanders/ }));
    expect(screen.getAllByText("Commander 25").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    expect(screen.queryByText("Commander 25")).toBeNull();
  });

  // ── The search field (§4.3) ───────────────────────────────────────────
  const search = planeCopy.search;
  const field = () => screen.getAllByRole("searchbox", { name: search.inputAria })[0];

  const named = () => [
    item({ oracleId: "a", slug: "a", name: "Yarok, the Desecrated" }),
    item({ oracleId: "b", slug: "b", name: "Meren of Clan Nel Toth", rank: 2 }),
  ];

  it("narrows the list by name as the reader types", () => {
    render(<DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />);
    fireEvent.change(field(), { target: { value: "yarok" } });
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
    expect(screen.queryByText("Meren of Clan Nel Toth")).toBeNull();
  });

  // The URL waits for the typing to settle. Mirroring per keystroke would write
  // seven history entries for one word, and Phase 5's lookup hangs off the same
  // settled value.
  it("mirrors the settled query as ?q=, and drops it when the field is cleared", async () => {
    render(<DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />);
    fireEvent.change(field(), { target: { value: "yarok" } });
    expect(window.location.search).toBe("?scope=play");

    await waitFor(() => expect(window.location.search).toBe("?scope=play&q=yarok"));
    expect(replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: search.clearAria })[0]);
    await waitFor(() => expect(window.location.search).toBe("?scope=play"));
  });

  it("opens under the query the incoming URL names", () => {
    window.history.replaceState(null, "", "/commanders?scope=play&q=meren");
    render(<DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />);
    expect(screen.getAllByText("Meren of Clan Nel Toth").length).toBeGreaterThan(0);
    expect(screen.queryByText("Yarok, the Desecrated")).toBeNull();
  });

  it("announces the match count once the typing settles", async () => {
    render(<DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />);
    fireEvent.change(field(), { target: { value: "yarok" } });
    await waitFor(() => expect(screen.getByText(search.announce(1, 2))).toBeTruthy());
  });

  // The floor takes rows out of `items` but not out of the pool the search
  // covered, so under the novelty sort the ranked count would understate where
  // we looked.
  it("names the whole unbuilt pool, not the ranked count, under the novelty sort", async () => {
    const { container } = render(
      <DiscoveryView
        discovery={list({ items: named(), candidateCount: 40, sort: "new", floorExcluded: 38 })}
        avail="free"
      />,
    );
    fireEvent.change(field(), { target: { value: "krenko" } });
    await waitFor(() => expect(container.textContent).toContain(search.noneEmphasis(40)));
    expect(container.textContent).toContain(search.announce(0, 40));
  });

  // The name is in nothing this reader can see, so the state says where we
  // looked and offers the one correction that could help.
  it("names the query when nothing is called that, and clears the search rather than the colours", async () => {
    const { container } = render(
      <DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.change(field(), { target: { value: "krenko" } });

    await waitFor(() => expect(container.textContent).toContain(search.noneHeading("krenko")));
    expect(container.textContent).toContain(search.announce(0, 2));

    // The field's ✕ carries the same accessible name as the state's button, so
    // the one with the visible label is the state's.
    const cta = screen
      .getAllByRole("button", { name: search.noneCta })
      .find((b) => b.textContent === search.noneCta);
    fireEvent.click(cta as HTMLElement);
    // The pips survive: the button cleared what the reader typed, and clearing
    // the colours too would undo a filter this state never blamed.
    expect(screen.getAllByText("Showing 2 of 2").length).toBeGreaterThan(0);
  });

  // ── The excluded match (§2) ───────────────────────────────────────────
  const excluded = planeCopy.excluded;

  // A name that IS in the list and was removed by a pip is a colour exclusion,
  // not a miss — telling the reader to check the spelling would be wrong, and
  // the colour empty state would not say which row went missing.
  it("names the commander a pip excluded, and clears the filter that took it", () => {
    const items = [
      item({ oracleId: "a", slug: "a", name: "Yarok, the Desecrated", colorIdentity: ["U"] }),
    ];
    const { container } = render(
      <DiscoveryView discovery={list({ items, candidateCount: 1 })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.change(field(), { target: { value: "yarok" } });

    expect(container.textContent).not.toContain(search.noneHeading("yarok"));
    expect(container.textContent).not.toContain(discoveryCopy.empty.filteredHeading);
    expect(container.textContent).toContain(search.heldHeading("Yarok, the Desecrated"));
    expect(container.textContent).toContain(search.heldAside(1));

    fireEvent.click(screen.getByRole("button", { name: excluded.colorsCta }));
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
  });

  // The mode, not the pips: the row survives `Contains`, so `Clear the colour
  // filter` would undo more than the reader needs.
  it("names the mode when the mode is what removed the only match", () => {
    const items = [
      item({ oracleId: "a", slug: "a", name: "Yarok, the Desecrated", colorIdentity: ["B", "G", "U"] }),
    ];
    const { container } = render(
      <DiscoveryView discovery={list({ items, candidateCount: 1 })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    fireEvent.change(field(), { target: { value: "yarok" } });

    expect(container.textContent).toContain(search.heldHeading("Yarok, the Desecrated"));
    fireEvent.click(screen.getByRole("button", { name: excluded.joinCta }));
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
  });

  // The row is not in the payload at all, so only the server can say why.
  it("reports a match the server held back, once the typing settles", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "scope", pct: null },
    ]);
    const { container } = render(
      <DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />,
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
    expect(findExcluded).toHaveBeenCalledWith("atraxa", { sort: "fit", avail: "free" });
  });

  // A failed lookup is not an answer. "No commander is named that" covers the
  // whole index, and a round trip that never came back checked none of it.
  it("makes no claim about the index when the lookup fails", async () => {
    findExcluded.mockRejectedValue(new Error("down"));
    const { container } = render(
      <DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />,
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
      <DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />,
    );
    fireEvent.change(field(), { target: { value: "atraxa" } });
    await waitFor(() => expect(container.textContent).toContain(search.unknownHeading("atraxa")));
    expect(container.textContent).not.toContain(search.noneHeading("atraxa"));
  });

  // A one-character query matches most of the index, so it never asks.
  it("asks the server only about a query worth a round trip", async () => {
    render(<DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />);
    fireEvent.change(field(), { target: { value: "y" } });
    await waitFor(() => expect(window.location.search).toBe("?scope=play&q=y"));
    expect(findExcluded).not.toHaveBeenCalled();
  });

  // Some matches survive: the report sits above them rather than replacing them.
  it("puts the aside above a live list, and counts the group rather than naming it", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "y", name: "Meren of Clan Nel Toth", cause: "floor", pct: 12 },
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "floor", pct: 9 },
    ]);
    const { container } = render(
      <DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />,
    );
    fireEvent.change(field(), { target: { value: "the" } });

    await waitFor(() =>
      expect(container.textContent).toContain(
        search.asideMore(2, excluded.control.floor(30)),
      ),
    );
    // The rows are still on screen, and the aside is above them.
    expect(screen.getAllByText("Yarok, the Desecrated").length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain(search.heldAside(2));
  });

  // ── The exclusion line (§4) ───────────────────────────────────────────
  it("prints the list's receipt in tier order, and nothing when nothing was excluded", () => {
    const items = [
      item({ oracleId: "a", slug: "a", colorIdentity: ["G"] }),
      item({ oracleId: "b", slug: "b", colorIdentity: ["U"], rank: 2 }),
    ];
    const discovery = list({
      items,
      candidateCount: 214,
      sort: "new",
      floorExcluded: 1047,
      unmeasured: 212,
      bestPct: 22,
    });
    const { container, rerender } = render(<DiscoveryView discovery={discovery} avail="free" />);
    // The floor alone, so the nearest miss has room.
    expect(container.textContent).toContain(
      planeCopy.exclusion.floorAloneWithUnmeasured(1047, 212, 30, 22),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    expect(container.textContent).toContain(
      planeCopy.exclusion.join2(
        planeCopy.exclusion.colors(1, ["G"]),
        planeCopy.exclusion.floorWithUnmeasured(1047, 212, 30),
      ),
    );

    rerender(
      <DiscoveryView
        discovery={list({ items, candidateCount: 2, sort: "new" })}
        avail="free"
      />,
    );
    expect(container.textContent).not.toContain("support floor");
  });

  // The one-report rule: one thing below the bar explains the list at 375px, and
  // it is the aside. The line stays in the DOM for the widths that have room,
  // as one element rather than a duplicated subtree.
  it("hands the phone to the aside when both would explain the list", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "floor", pct: 9 },
    ]);
    const { container } = render(
      <DiscoveryView
        discovery={list({
          items: named(),
          candidateCount: 214,
          sort: "new",
          floorExcluded: 1047,
          unmeasured: 212,
          bestPct: 22,
        })}
        avail="free"
      />,
    );
    const lineText = planeCopy.exclusion.floorAloneWithUnmeasured(1047, 212, 30, 22);
    const lineNode = () =>
      Array.from(container.querySelectorAll("div")).find(
        (el) => el.textContent === lineText,
      );
    expect(lineNode()?.className).not.toContain("hidden");

    fireEvent.change(field(), { target: { value: "the" } });
    await waitFor(() => expect(lineNode()?.className).toContain("hidden sm:flex"));
    // One element, not two: the sentence is in the DOM once at either width.
    expect(
      Array.from(container.querySelectorAll("div")).filter((el) => el.textContent === lineText),
    ).toHaveLength(1);
  });

  // The other half of the rule: the report already names the mode, so the note
  // under the control would print the same fact twice on one phone screen.
  it("drops the mobile exact note when a report names the mode", () => {
    const items = [
      item({ oracleId: "a", slug: "a", name: "Yarok, the Desecrated", colorIdentity: ["B", "G", "U"] }),
      item({ oracleId: "b", slug: "b", name: "Meren of Clan Nel Toth", colorIdentity: ["G"], rank: 2 }),
    ];
    const { container } = render(
      <DiscoveryView discovery={list({ items, candidateCount: 2 })} avail="free" />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Green" })[0]);
    fireEvent.click(screen.getAllByRole("radio", { name: join.exactlyAria })[0]);
    expect(container.textContent).toContain(join.exactNoteShort(1, 2, ["G"]));

    fireEvent.change(field(), { target: { value: "yarok" } });
    expect(container.textContent).not.toContain(join.exactNoteShort(0, 2, ["G"]));
    // Desktop keeps its own note: it has the width, and no viewport problem.
    expect(container.textContent).toContain(join.exactNote(0, 2, ["G"]));
  });

  // ── The pool floor state (§5) ─────────────────────────────────────────
  // The floor took everything, and the pool is why: the other sort is the wrong
  // door when the rows would clear against the whole collection.
  it("offers the other pool, not the other sort, when the pool is the cause", () => {
    const { container } = render(
      <DiscoveryView
        discovery={list({
          items: [],
          candidateCount: 3326,
          sort: "new",
          floorExcluded: 3114,
          unmeasured: 212,
          poolExcluded: 41,
          bestPct: 22,
          freePoolSize: 1190,
        })}
        avail="free"
      />,
    );
    expect(container.textContent).toContain(planeCopy.floorPool.heading);
    expect(container.textContent).toContain(
      planeCopy.floorPool.body(30, 3114, 212, 3326, 1190, 41),
    );
    expect(container.textContent).not.toContain(discoveryCopy.empty.floorHeading);
  });

  // Nothing would clear elsewhere, so the pool is not the cause and the shipped
  // state stands.
  it("keeps the sort's own floor state when no row would clear against the collection", () => {
    const { container } = render(
      <DiscoveryView
        discovery={list({
          items: [],
          candidateCount: 3326,
          sort: "new",
          floorExcluded: 3114,
          poolExcluded: 0,
          bestPct: 22,
        })}
        avail="free"
      />,
    );
    expect(container.textContent).toContain(discoveryCopy.empty.floorHeading);
    expect(container.textContent).not.toContain(planeCopy.floorPool.heading);
  });

  // A report is written about one query. Carrying it into the next would name a
  // commander the reader is no longer asking about.
  it("drops the server's answer when the query changes", async () => {
    findExcluded.mockResolvedValue([
      { oracleId: "z", name: "Atraxa, Praetors' Voice", cause: "scope", pct: null },
    ]);
    const { container } = render(
      <DiscoveryView discovery={list({ items: named(), candidateCount: 2 })} avail="free" />,
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
});
