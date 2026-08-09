import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommanderListItem } from "../../lib/recs/recommend";
import type { SynergyState } from "../../lib/recs/synergy-state";
import type { RankedList } from "../../lib/recs/ranked-list";
import { getRankedList } from "../../lib/recs/ranked-list";
import { HeroCommander } from "./hero-commander";

vi.mock("../../lib/recs/ranked-list", () => ({
  getRankedList: vi.fn(),
}));

const mockedGetRankedList = vi.mocked(getRankedList);

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
    imageUri: null,
    synergyState: "ok",
    ...overrides,
  };
}

function list(items: CommanderListItem[], degraded = false): RankedList {
  return { items, degraded, uniqueCardsRead: 500, candidateCount: items.length };
}

async function renderHero(items: CommanderListItem[], degraded = false) {
  mockedGetRankedList.mockResolvedValue(list(items, degraded));
  render(await HeroCommander({ userId: "user_1" }));
}

function noSynergy(synergyState: SynergyState): CommanderListItem {
  return item({ synergyState, fitSynergy: null, edhrecOwnedCount: null, edhrecTotal: null });
}

beforeEach(() => {
  mockedGetRankedList.mockReset();
});

describe("HeroCommander", () => {
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

  it("renders the quiet placeholder when there are no candidates", async () => {
    await renderHero([]);
    expect(screen.getByText("No commander candidates yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
