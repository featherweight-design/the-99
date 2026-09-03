import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RankedCommander } from "../../lib/recs/recommend";
import type { SynergyState } from "../../lib/recs/synergy-state";
import { CommanderDetail } from "./detail";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";

const noSynergyCards: SynergyCard[] = [];

function commander(overrides: Partial<RankedCommander> = {}): RankedCommander {
  return {
    oracleId: "oracle-1",
    name: "Krenko, Mob Boss",
    colorIdentity: ["R"],
    imageUri: null,
    typeLine: "Legendary Creature — Goblin Warrior",
    oracleText: "Tap: Create X 1/1 red Goblin creature tokens.",
    manaCost: "{2}{R}{R}",
    colorPoolSize: 120,
    edhrecOwnedCount: 40,
    edhrecTotal: 100,
    roleCounts: { ramp: 4, draw: 3, removal: 5, wipes: 1 },
    roleGaps: [],
    roleCards: { ramp: [], draw: [], removal: [], wipes: [] },
    overlapOwned: [],
    overlapMissing: [],
    fitPool: 12,
    fitRoles: 8,
    fitSynergy: 24,
    score: 44,
    slug: "krenko-mob-boss",
    synergyState: "ok",
    ...overrides,
  };
}

function noSynergy(synergyState: SynergyState): RankedCommander {
  return commander({
    synergyState,
    fitSynergy: null,
    edhrecOwnedCount: null,
    edhrecTotal: null,
  });
}

describe("CommanderDetail synergy states", () => {
  it("shows no synergy note when the state is ok", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} />);
    expect(screen.queryByText(/Synergy data unavailable/i)).toBeNull();
  });

  it("says the data is unavailable when the state is degraded", () => {
    render(<CommanderDetail commander={noSynergy("degraded")} rank={1} isBestFit={false} synergyCards={noSynergyCards} />);
    expect(screen.getAllByText(/Synergy data unavailable/i).length).toBeGreaterThan(0);
  });

  it("says the commander is not indexed, with no Retry, when the state is absent", () => {
    render(<CommanderDetail commander={noSynergy("absent")} rank={1} isBestFit={false} synergyCards={noSynergyCards} />);
    expect(screen.getAllByText(/EDHREC doesn't track this commander/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Synergy data unavailable/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });
});
