import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { CommandersView } from "./commanders-view";
import { REVEAL_STEP } from "./reveal-control";

// The reveal control is unreachable on real data by design — the beta reference
// collection yields 24 generals and REVEAL_STEP is 25. These tests are therefore
// the primary evidence that the windowing works at all.

const replace = vi.fn();
const params = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
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

function view(list: CommanderListItem[]) {
  return render(
    <CommandersView
      results={list}
      degraded={false}
      uniqueCardsRead={1418}
      candidateCount={list.length}
      firstRun={false}
    />,
  );
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

  it("renders neither control nor rule on a list too short to window", () => {
    view(results(24));
    expect(cards()).toHaveLength(24);
    expect(control()).toBeNull();
    expect(screen.queryByText(/End of ranking/)).toBeNull();
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

describe("CommandersView reveal a11y", () => {
  it("announces the new range against the filtered length", () => {
    const { container } = view(results(214));
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent("");
    fireEvent.click(control()!);
    expect(live).toHaveTextContent("50 shown, 164 more below. Ranks 26 to 50 added.");
  });

  it("moves focus to the first revealed row, not to the control", () => {
    view(results(214));
    fireEvent.click(control()!);
    expect(document.activeElement).toBe(cards()[REVEAL_STEP]);
  });
});
