import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { availabilityCopy } from "../../lib/copy/availability";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { CommandersView, type AvailMode } from "./commanders-view";
import { REVEAL_STEP } from "./reveal-control";

// The reveal control is unreachable on real data by design — the beta reference
// collection yields 24 generals and REVEAL_STEP is 25. These tests are therefore
// the primary evidence that the windowing works at all.

const replace = vi.fn();
const push = vi.fn();
const params = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => params,
}));

vi.mock("../../app/commanders/actions", () => ({ retryRecs: vi.fn() }));

function results(n: number, colorIdentity: string[] = ["R"]): CommanderListItem[] {
  return Array.from({ length: n }, (_, i) => ({
    oracleId: `oracle-${i}`,
    slug: `general-${i}`,
    name: `General ${i}`,
    colorIdentity,
    colorPoolSize: 120,
    roleCounts: { ramp: 4, draw: 3, removal: 5, wipes: 1 },
    edhrecOwnedCount: 40,
    edhrecTotal: 100,
    receipts: "",
    fitPool: 12,
    fitRoles: 8,
    fitSynergy: 24,
    score: 100 - i,
    imageUri: null,
    synergyState: "ok" as const,
  }));
}

type Over = {
  avail?: AvailMode;
  freeItems?: CommanderListItem[] | null;
  availOk?: boolean;
  degraded?: boolean;
};

function el(list: CommanderListItem[], over: Over = {}) {
  const { avail = "all", freeItems = null, availOk = true, degraded = false } = over;
  return (
    <CommandersView
      results={list}
      degraded={degraded}
      uniqueCardsRead={1418}
      candidateCount={list.length}
      firstRun={false}
      avail={avail}
      freeItems={freeItems}
      availOk={availOk}
      receiptCounts={new Map()}
    />
  );
}

// `again` re-renders the SAME instance, so a test can move a prop the way the
// server does rather than mounting twice and missing the transition.
function view(list: CommanderListItem[], over: Over = {}) {
  const r = render(el(list, over));
  return {
    ...r,
    again: (next: CommanderListItem[], nextOver: Over = {}) =>
      r.rerender(el(next, nextOver)),
  };
}

const control = () => screen.queryByRole("button", { name: /^Show \d+ more commanders/ });

const cards = () =>
  screen
    .getAllByRole("listitem")
    .filter((li) => !li.querySelector("button[aria-label^='Show ']"));

// The count interleaves <b> figures with plain text, so match on the whole span.
const WINDOW_COUNT = /^(all [\d,]+ shown|[\d,]+ shown · [\d,]+ more below)$/;
const windowCounts = () =>
  screen.queryAllByText(
    (_, el) => el?.tagName === "SPAN" && WINDOW_COUNT.test(el.textContent ?? ""),
  );

beforeEach(() => {
  replace.mockClear();
  push.mockClear();
});

describe("CommandersView windowing", () => {
  it("renders one batch and a control naming what is left", () => {
    view(results(214));
    expect(cards()).toHaveLength(REVEAL_STEP);
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 189 remaining");
    expect(screen.getByText("189 remaining")).toBeInTheDocument();
  });

  it("advances by a full batch on activation", () => {
    view(results(214));
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(50);
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 164 remaining");
  });

  it("keeps the label at the constant even when fewer than a batch remain", () => {
    view(results(30));
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 5 remaining");
    expect(screen.getByText("Show 25 more")).toBeInTheDocument();
  });

  it("swaps the control for the end-of-ranking rule at exhaustion", () => {
    view(results(30));
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(30);
    expect(control()).toBeNull();
    expect(screen.getByText(/End of ranking · 30 of 30/)).toBeInTheDocument();
  });

  it("clamps to the list length rather than overshooting on rapid activations", () => {
    const { container } = view(results(60));
    fireEvent.click(control()!);
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(60);
    expect(control()).toBeNull();
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "60 shown, 0 more below. Ranks 51 to 60 added.",
    );
  });

  it("renders neither control nor rule on a list too short to window", () => {
    view(results(24));
    expect(cards()).toHaveLength(24);
    expect(control()).toBeNull();
    expect(screen.queryByText(/End of ranking/)).toBeNull();
  });

  // The live region is no longer windowing's alone — the ranking toggle
  // announces through it, and that control exists on every list length. It
  // stays mounted and empty rather than being gated on a windowed list.
  it("leaves the short-list surface untouched — empty live region, no row focus targets", () => {
    const { container } = view(results(24));
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent("");
    expect(container.querySelector("li[tabindex]")).toBeNull();
  });

  it("renders no windowing furniture at all when there are no results", () => {
    view(results(0));
    expect(control()).toBeNull();
    expect(screen.queryByText(/End of ranking/)).toBeNull();
    expect(screen.queryByText(/more below/)).toBeNull();
  });
});

describe("CommandersView window count", () => {
  it("shows the hidden remainder at both viewports, never as 'showing N of M'", () => {
    view(results(214));
    const counts = windowCounts();
    expect(counts).toHaveLength(2);
    for (const c of counts) expect(c).toHaveTextContent("25 shown · 189 more below");
    // The colour filter's own count owns that phrasing; the window must not echo it.
    expect(screen.getByText(/Showing 214 of 214/)).toBeInTheDocument();
  });

  it("switches to the exhausted form once everything is revealed", () => {
    view(results(30));
    fireEvent.click(control()!);
    const counts = windowCounts();
    expect(counts).toHaveLength(2);
    for (const c of counts) expect(c).toHaveTextContent("all 30 shown");
  });

  it("is omitted entirely on a short list, leaving the shipped meta line alone", () => {
    view(results(24));
    expect(windowCounts()).toHaveLength(0);
    expect(screen.getByText("Order: Fit ↓ · fixed")).toBeInTheDocument();
  });
});

describe("CommandersView windowing under the colour filter", () => {
  function filterToRed() {
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Red" })[0]);
  }

  it("resets the window and recounts against the filtered length", () => {
    const mixed = [...results(40, ["R"]), ...results(40, ["U"]).map((r, i) => ({
      ...r,
      slug: `blue-${i}`,
      oracleId: `blue-${i}`,
    }))];
    view(mixed);
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(50);

    filterToRed();
    expect(cards()).toHaveLength(REVEAL_STEP);
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 15 remaining");
  });

  it("does not renumber ranks — they stay global Fit ranks", () => {
    const mixed = [
      ...results(3, ["U"]).map((r, i) => ({ ...r, slug: `blue-${i}`, oracleId: `blue-${i}` })),
      ...results(2, ["R"]),
    ];
    view(mixed);
    filterToRed();
    const [first] = cards();
    // Three blue generals were filtered out, so the first red row keeps rank 4.
    expect(within(first).getAllByText("4").length).toBeGreaterThan(0);
  });
});

describe("CommandersView ranking toggle", () => {
  // The control switches the data, not a panel, so it is a radiogroup rather
  // than the tablist its shape suggests.
  // The segments are labelled by their aria strings, not their visible text.
  const segments = (name: RegExp) => screen.getAllByRole("radio", { name });
  const ALL = /everything you own/;
  const FREE = /not already in a finished deck|What.s free is unavailable/;

  it("marks the shipped ranking as the checked segment", () => {
    view(results(3));
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "false");
  });

  // A colour filter is client-side; a re-rank is not, because rankFree runs on
  // the server. The flip must push, and must carry the colours already applied.
  it("pushes the free ranking, keeping the colour filter in the URL", () => {
    view(results(3));
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Red" })[0]);
    fireEvent.click(segments(FREE)[0]);
    expect(push).toHaveBeenCalledWith("/commanders?c=R&avail=free", { scroll: false });
  });

  // The mirror effect writes the mode it is CARRYING. Driven by the server prop
  // instead, a pip clicked while the flip was still in the air would replace to
  // a bare `?c=W` and both drop the mode and race the push fetching it.
  it("keeps the mode when a colour lands after the flip", () => {
    view(results(3), { avail: "free", freeItems: results(3) });
    replace.mockClear();
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Red" })[0]);
    expect(replace).toHaveBeenCalledWith("/commanders?c=R&avail=free", { scroll: false });
  });

  it("ranks against the free list once the server sends one", () => {
    const all = results(3);
    const free = [all[2], all[0], all[1]];
    view(all, { avail: "free", freeItems: free });
    expect(cards()[0]).toHaveTextContent("General 2");
  });

  // Unlike the colour filter, this changes the score itself, so frozen numerals
  // would read 3, 1, 2 down a page whose own order contradicts them.
  it("renumbers on a re-rank, where the colour filter would not", () => {
    const all = results(3);
    view(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });
    expect(within(cards()[0]).getAllByText("1").length).toBeGreaterThan(0);
  });

  // Only the arriving server render announces. On mount there is no re-rank to
  // report, and a page that announces itself the moment it loads is noise.
  it("announces the re-rank, and says nothing on first paint", () => {
    const { container, again } = view(results(3));
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent("");
    again(results(3), { avail: "free", freeItems: results(2) });
    expect(live).toHaveTextContent("Re-ranked by what’s free · 2 commanders");
  });

  it("strikes the free segment out when we cannot read the decks", () => {
    view(results(3), { availOk: false });
    for (const s of segments(FREE)) {
      expect(s).toHaveAttribute("aria-disabled", "true");
    }
    fireEvent.click(segments(FREE)[0]);
    expect(push).not.toHaveBeenCalled();
  });

  // The one navigation that does not move `avail`: a flip to free the server
  // answers with a degraded `all`. An override keyed on `avail` alone would
  // strand here, drawing the struck-out segment as checked.
  it("drops the optimistic press when the flip comes back degraded", () => {
    view(results(3));
    fireEvent.click(segments(FREE)[0]);
    expect(push).toHaveBeenCalled();
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "false");
  });

  it("is one tab stop, and the arrows move within it", () => {
    view(results(3));
    const all = segments(ALL)[0];
    expect(all).toHaveAttribute("tabindex", "0");
    expect(segments(FREE)[0]).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(all, { key: "ArrowRight" });
    expect(push).toHaveBeenCalledWith("/commanders?avail=free", { scroll: false });
  });

  it("leaves the arrows inert while the free ranking is unavailable", () => {
    view(results(3), { availOk: false });
    fireEvent.keyDown(segments(ALL)[0], { key: "ArrowRight" });
    expect(push).not.toHaveBeenCalled();
  });

  // The struck segment says a control is gone; the banner is the only thing
  // that says why, and offers the way back.
  it("banners the failed deck read", () => {
    view(results(3), { availOk: false });
    // Two, and exactly two: the banner always renders both width branches, so an
    // exact count is what catches a second banner sneaking in.
    expect(screen.getAllByText(availabilityCopy.degraded.heading)).toHaveLength(2);
    expect(screen.queryByText("Synergy data unavailable")).toBeNull();
  });

  // Two failures are one "try again" to the player, and `retryRecs` re-runs the
  // whole page — so stacking two banners would put two identical buttons on it.
  it("folds two failures into one banner", () => {
    view(results(3), { availOk: false, degraded: true });
    expect(
      screen.getAllByText(availabilityCopy.degraded.bodyWithSynergy),
    ).toHaveLength(2);
    expect(screen.queryByText("Synergy data unavailable")).toBeNull();
  });

  it("leaves the synergy banner alone when only EDHREC is down", () => {
    view(results(3), { degraded: true });
    expect(screen.getAllByText("Synergy data unavailable")).toHaveLength(2);
    expect(screen.queryByText(availabilityCopy.degraded.heading)).toBeNull();
  });

  it("explains the exclusion only while the free ranking is on", () => {
    const { again } = view(results(3));
    expect(screen.queryByText(/don.t count toward these scores/)).toBeNull();
    again(results(3), { avail: "free", freeItems: results(3) });
    expect(screen.getAllByText(/don.t count toward these scores/).length).toBeGreaterThan(0);
  });
});

describe("CommandersView reveal a11y", () => {
  it("announces the new range against the filtered length", () => {
    const { container } = view(results(214));
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent("");
    fireEvent.click(control()!);
    expect(live).toHaveTextContent("50 shown, 164 more below. Ranks 26 to 50 added.");
  });

  it("clears the announcement when a filter resets the window", () => {
    const mixed = [...results(40, ["R"]), ...results(40, ["U"]).map((r, i) => ({
      ...r,
      slug: `blue-${i}`,
      oracleId: `blue-${i}`,
    }))];
    const { container } = view(mixed);
    const live = container.querySelector('[aria-live="polite"]')!;
    fireEvent.click(control()!);
    expect(live).toHaveTextContent(/Ranks 26 to 50 added/);
    fireEvent.click(screen.getAllByRole("button", { name: "Filter by Red" })[0]);
    expect(live).toHaveTextContent("");
  });

  it("moves focus to the first revealed row, not to the control", () => {
    view(results(214));
    fireEvent.click(control()!);
    expect(document.activeElement).toBe(cards()[REVEAL_STEP]);
  });
});
