import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommanderListItem } from "../../lib/recs/recommend";
import type { SynergyState } from "../../lib/recs/synergy-state";
import type { RankedList } from "../../lib/recs/ranked-list";
import { getRankedList } from "../../lib/recs/ranked-list";
import { readCommanderProse } from "../../lib/prose/read";
import { dailyPick } from "../../lib/recs/daily-pick";
import { HeroCommander } from "./hero-commander";

vi.mock("../../lib/recs/ranked-list", () => ({
  getRankedList: vi.fn(),
}));

vi.mock("../../lib/prose/read", () => ({
  readCommanderProse: vi.fn(),
}));

const mockedGetRankedList = vi.mocked(getRankedList);
const mockedReadProse = vi.mocked(readCommanderProse);

function item(overrides: Partial<CommanderListItem> = {}): CommanderListItem {
  return {
    oracleId: "oracle-1",
    slug: "krenko-mob-boss",
    name: "Krenko, Mob Boss",
    colorIdentity: ["R"],
    colorPoolSize: 120,
    roleCounts: { ramp: 4, draw: 3, removal: 5, wipes: 1 },
    edhrecOwnedCount: 40,
    edhrecTotal: 100,
    receipts: "",
    fitPool: 12,
    fitRoles: 8,
    fitSynergy: 24,
    score: 44,
    measurableTotal: 100,
    imageUri: null,
    synergyState: "ok",
    ...overrides,
  };
}

function list(items: CommanderListItem[], degraded = false): RankedList {
  return { items, degraded, uniqueCardsRead: 500, candidateCount: items.length };
}

async function renderHero(items: CommanderListItem[], degraded = false, prose: string | null = null) {
  mockedGetRankedList.mockResolvedValue(list(items, degraded));
  mockedReadProse.mockResolvedValue(prose);
  render(await HeroCommander({ userId: "user_1" }));
}

function noSynergy(synergyState: SynergyState): CommanderListItem {
  return item({ synergyState, fitSynergy: null, measurableTotal: 40, edhrecOwnedCount: null, edhrecTotal: null });
}

beforeEach(() => {
  mockedGetRankedList.mockReset();
  mockedReadProse.mockReset();
});

describe("HeroCommander", () => {
  // The rotation is `dailyPick`'s and tested there. What this covers is only that the
  // hero is wired to it — the card shipped reading `items[0]`, and a regression to that
  // is invisible in every other test here, all of which pass a one-item list.
  it("shows the day's pick rather than the top of the ranking", async () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-09-10T09:00:00Z");
      vi.setSystemTime(now);
      const ranked = ["one", "two", "three", "four", "five"].map((n) =>
        item({ oracleId: `oracle-${n}`, slug: n, name: `Commander ${n}` }),
      );
      // Asked of `dailyPick` rather than hardcoded, so renaming or reordering the
      // candidates does not break a test whose subject is the wiring. The guard below
      // is what keeps that from being circular: on this date the pick is not rank 1, so
      // a hero that went back to `items[0]` still fails here.
      //
      // It does not survive a change to the hash. If one lands and this date starts
      // resolving to rank 1, the guard fails and the fix is to pick another date — not
      // to drop the guard, which is the only thing making the assertion mean anything.
      const expected = dailyPick(ranked, "user_1", now);
      expect(expected).not.toBe(ranked[0]);
      await renderHero(ranked);
      expect(screen.getByRole("heading", { name: expected!.name })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: ranked[0].name })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("links the whole card to the commander's detail page", async () => {
    await renderHero([item()]);
    const link = screen.getByRole("link", { name: /Krenko, Mob Boss/ });
    expect(link).toHaveAttribute("href", "/commanders/krenko-mob-boss");
  });

  it("names the link for the commander rather than dumping the card text", async () => {
    await renderHero([item()]);
    expect(
      screen.getByRole("link", { name: "Krenko, Mob Boss — view commander details" }),
    ).toBeInTheDocument();
  });

  // The bar measures a commander's top-cards list against the collection. It
  // was labelled "Deck completeness" at every layer — the section heading, the
  // aria name and the bare `40/100` — and a reader took the figure for a deck's
  // card count, which is the one thing it is not.
  it("names the bar and its figure for the commander's top cards, not a deck", async () => {
    await renderHero([item()]);
    expect(
      screen.getByRole("progressbar", { name: "Top cards you own for Krenko, Mob Boss" }),
    ).toBeInTheDocument();
    expect(screen.getByText("own 40 of top 100")).toBeInTheDocument();
  });

  // Over what a reader can actually reach — visible text and accessible names —
  // rather than the raw markup, which a future href or data attribute carrying
  // the substring would fail on while the wording stayed right.
  it("says nothing about decks in any wording the reader reaches", async () => {
    await renderHero([item()]);
    expect(screen.queryAllByText(/deck/i)).toHaveLength(0);
    for (const el of document.querySelectorAll("[aria-label]")) {
      expect(el.getAttribute("aria-label")).not.toMatch(/deck/i);
    }
  });

  it("explains an absent commander as a settled fact, with nothing to retry", async () => {
    await renderHero([noSynergy("absent")]);
    expect(
      screen.getByText(/EDHREC doesn't track this commander/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("explains a degraded commander as a temporary outage", async () => {
    await renderHero([noSynergy("degraded")], true);
    expect(screen.getByText(/couldn't reach EDHREC/i)).toBeInTheDocument();
  });

  it("falls back to a neutral note when synergy is ok but counts are missing", async () => {
    await renderHero([item({ edhrecOwnedCount: null, edhrecTotal: null })]);
    expect(screen.getByText(/top-cards list isn't ready yet/i)).toBeInTheDocument();
  });

  // The art was a 200px full-height strip with `center/cover`, which cropped a
  // band out of the middle of Scryfall's 63:88 card — and it was `hidden
  // md:block`, so the phone hero had no art at all.
  it("shows the whole card, at every width", async () => {
    await renderHero([item({ imageUri: "https://cards.scryfall.io/normal/krenko.jpg" })]);
    const art = screen.getByTestId("hero-art");
    expect(art.style.aspectRatio).toBe("63/88");
    expect(art.style.background).toContain("krenko.jpg");
    expect(art.className).not.toMatch(/(^|\s|:)hidden(\s|$)/);
  });

  it("keeps the striped placeholder for a commander with no art", async () => {
    await renderHero([item({ imageUri: null })]);
    expect(screen.getByTestId("hero-art").style.background).toContain(
      "repeating-linear-gradient",
    );
  });

  // The clamp is a CSS one, so the whole sentence has to survive into the DOM: a
  // JS truncation would put an ellipsis into the card's accessible name and into
  // any find-in-page.
  it("prints the stored sentence whole and clamps it in CSS", async () => {
    const sentence =
      "Krenko decks tend to flood the board with goblin tokens and convert them into damage in one turn.";
    await renderHero([item()], false, sentence);
    const paragraph = screen.getByText(sentence);
    expect(paragraph.style.getPropertyValue("-webkit-line-clamp")).toBe("2");
    expect(paragraph).toHaveClass("overflow-hidden");
  });

  it("draws no paragraph at all when no sentence is stored", async () => {
    await renderHero([item()], false, null);
    expect(screen.getByRole("heading", { name: "Krenko, Mob Boss" })).toBeInTheDocument();
    expect(document.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders the quiet placeholder when there are no candidates", async () => {
    await renderHero([]);
    expect(screen.getByText("No commander candidates yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
