import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CommanderListItem } from "../../lib/recs/recommend";
import type { SynergyState } from "../../lib/recs/synergy-state";
import { RecCard } from "./rec-card";

vi.mock("../../app/commanders/actions", () => ({
  retryRecs: vi.fn(),
}));

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

function noSynergy(synergyState: SynergyState): CommanderListItem {
  return item({ synergyState, fitSynergy: null, edhrecOwnedCount: null, edhrecTotal: null });
}

describe("RecCard synergy states", () => {
  it("shows no synergy note at all when the state is ok", () => {
    render(<RecCard commander={item()} rank={1} />);
    expect(screen.queryByText(/synergy data/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("offers Retry on both layouts when the state is degraded", () => {
    render(<RecCard commander={noSynergy("degraded")} rank={1} />);
    expect(screen.getAllByText(/Synergy data unavailable/i)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /retry/i })).toHaveLength(2);
  });

  it("renders no Retry control at all when the state is absent", () => {
    render(<RecCard commander={noSynergy("absent")} rank={1} />);
    expect(screen.getAllByText(/EDHREC doesn't track this commander/i)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("keeps the whole card linked to the detail page", () => {
    const { container } = render(<RecCard commander={item()} rank={1} />);
    const link = within(container).getByRole("link", { name: /Krenko, Mob Boss/ });
    expect(link).toHaveAttribute("href", "/commanders/krenko-mob-boss");
  });
});
