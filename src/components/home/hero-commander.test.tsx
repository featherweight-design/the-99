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

  it("shows the completeness bar when EDHREC data is present", async () => {
    await renderHero([item()]);
    expect(screen.getByRole("progressbar", { name: "Deck completeness" })).toBeInTheDocument();
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
    expect(screen.getByText(/Deck completeness isn't available/i)).toBeInTheDocument();
  });

  it("renders the quiet placeholder when there are no candidates", async () => {
    await renderHero([]);
    expect(screen.getByText("No commander candidates yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
