import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DiscoveryList } from "../../lib/discovery/list";
import { availabilityCopy } from "../../lib/copy/availability";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
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
});
