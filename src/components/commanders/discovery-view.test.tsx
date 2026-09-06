import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DiscoveryList } from "../../lib/discovery/list";
import { availabilityCopy } from "../../lib/copy/availability";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
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
  bestPct: null,
  floorExcluded: 0,
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
  floorPct: null,
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
});
