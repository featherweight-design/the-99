import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CoverageSection refreshes the route after a recovered retry, so the whole
// detail tree needs a router even where no test clicks Retry.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { availabilityCopy } from "../../lib/copy/availability";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { CommanderDetailScore } from "../../lib/recs/recommend";
import type { SynergyState } from "../../lib/recs/synergy-state";
import { CommanderDetail } from "./detail";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";

const noSynergyCards: SynergyCard[] = [];

const synergyCards: SynergyCard[] = [
  {
    oracleId: "oracle-goblin-bombardment",
    name: "Goblin Bombardment",
    typeLine: "Enchantment",
    facet: "enchantment",
    inclusionPct: 31,
    synergyPts: 47,
    owned: true,
    committedTo: null,
  },
  {
    oracleId: "oracle-skullclamp",
    name: "Skullclamp",
    typeLine: "Artifact — Equipment",
    facet: "artifact",
    inclusionPct: 62,
    synergyPts: null,
    owned: false,
    committedTo: null,
  },
];

function commander(overrides: Partial<CommanderDetailScore> = {}): CommanderDetailScore {
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
    overlapOwned: [], overlapOwnedIds: [],
    fitPool: 12,
    fitRoles: 8,
    fitSynergy: 24,
    score: 44,
    measurableTotal: 100,
    rankScore: 44,
    slug: "krenko-mob-boss",
    synergyState: "ok",
    committedSupport: { count: 0, topDeck: null },
    ...overrides,
  };
}

function noSynergy(synergyState: SynergyState): CommanderDetailScore {
  return commander({
    synergyState,
    fitSynergy: null,
    measurableTotal: 40,
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

describe("CommanderDetail fit hero", () => {
  // The figure and the ceiling beside it are one claim. A commander EDHREC does not
  // index is scored out of 40, and printing that 32 beside "/100" is the fabricated
  // comparability the denominator exists to close.
  it("prints the raw score over 100 when synergy was measured", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} />);
    expect(screen.getAllByText("44").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/100").length).toBeGreaterThan(0);
    expect(screen.queryByText(/measurable/)).toBeNull();
  });

  it("names the shorter ceiling when synergy was not measured", () => {
    render(
      <CommanderDetail
        commander={commander({ synergyState: "absent", fitSynergy: null, score: 20, measurableTotal: 40, rankScore: 50, edhrecOwnedCount: null, edhrecTotal: null })}
        rank={3}
        isBestFit={false}
        synergyCards={noSynergyCards}
      />,
    );
    expect(screen.getAllByText("/40 measurable").length).toBeGreaterThan(0);
    expect(screen.queryByText("/100")).toBeNull();
  });

  // The legend used to print each segment's share of the achieved total, which always
  // summed to 100% and taught nothing about the weights. Points over weight makes the
  // headline auditable by addition.
  it("prints each segment's points over its weight", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} />);
    expect(screen.getAllByLabelText("Pool, 12 of 15 points").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Roles, 8 of 25 points").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Synergy, 24 of 60 points").length).toBeGreaterThan(0);
  });

  // There is no missing third of a hundred to explain once the denominator is 40.
  it("drops the synergy legend entry rather than drawing a placeholder", () => {
    render(
      <CommanderDetail
        commander={commander({ synergyState: "absent", fitSynergy: null, score: 20, measurableTotal: 40, rankScore: 50 })}
        rank={3}
        isBestFit={false}
        synergyCards={noSynergyCards}
      />,
    );
    expect(screen.queryByText(/^Synergy —/)).toBeNull();
    expect(screen.queryByLabelText(/^Synergy,/)).toBeNull();
  });

  it("explains only the segments that were measured", () => {
    render(
      <CommanderDetail
        commander={commander({ synergyState: "absent", fitSynergy: null, score: 20, measurableTotal: 40, rankScore: 50 })}
        rank={3}
        isBestFit={false}
        synergyCards={noSynergyCards}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /What Pool, Roles and Synergy mean/i })[0]);
    expect(screen.getAllByText(/Breadth, not quality/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/most-played list/)).toBeNull();
    expect(screen.getAllByText(/12 \+ 8 = 20\./).length).toBeGreaterThan(0);
  });

  // An aria-controls pointing at an id no element carries is a broken relationship,
  // and the panel only exists while the key is open.
  it("names the panel it controls only while that panel exists", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} />);
    const trigger = screen.getAllByRole("button", { name: /What Pool, Roles and Synergy mean/i })[0];
    expect(trigger).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger);
    const panelId = screen
      .getAllByRole("button", { name: "Hide" })[0]
      .getAttribute("aria-controls");
    expect(panelId).not.toBeNull();
    expect(document.getElementById(panelId!)).not.toBeNull();
  });

  it("closes the key again", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} />);
    const trigger = screen.getAllByRole("button", { name: /What Pool, Roles and Synergy mean/i })[0];
    fireEvent.click(trigger);
    expect(screen.getAllByText(/12 \+ 8 \+ 24 = 44\./).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Hide" })[0]);
    expect(screen.queryByText(/12 \+ 8 \+ 24 = 44\./)).toBeNull();
  });
});

describe("CommanderDetail hidden-receipts note", () => {
  // The note names an outage. The panel also stays down for a commander EDHREC
  // does not index and for one whose rows are all excluded, and calling either
  // of those an outage promises a recovery that will never come.
  it("keeps the outage note off an absent commander", () => {
    render(
      <CommanderDetail commander={noSynergy("absent")} rank={1} isBestFit={false} synergyCards={noSynergyCards} />,
    );
    expect(screen.queryByText(/EDHREC data unavailable/i)).toBeNull();
  });

  it("keeps the outage note off a commander whose rows are all excluded", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} />,
    );
    expect(screen.queryByText(/EDHREC data unavailable/i)).toBeNull();
  });

  it("still shows the outage note when EDHREC is unreachable", () => {
    render(
      <CommanderDetail commander={noSynergy("degraded")} rank={1} isBestFit={false} synergyCards={noSynergyCards} />,
    );
    expect(screen.getAllByText(/EDHREC data unavailable/i).length).toBeGreaterThan(0);
  });
});

// The panel mounts twice — once per width — and both mounts read the same
// selection provider. These exercise the wiring the three state tests above skip
// by passing an empty card list.
describe("CommanderDetail synergy panel", () => {
  it("says the sub-caption once per width, and never beside the heading as well", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} />,
    );
    expect(screen.getAllByText(synergyCopy.panel.subcaption("2"))).toHaveLength(1);
    expect(screen.getAllByText(synergyCopy.panel.subcaptionMobile("2"))).toHaveLength(1);
  });

  it("toggles a row through the provider, the bridge and the panel together", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} />,
    );
    const addLabel = synergyCopy.select.addAria("Goblin Bombardment");
    const removeLabel = synergyCopy.select.removeAria("Goblin Bombardment");

    // One toggle per mount, both resting unselected.
    const resting = screen.getAllByRole("button", { name: addLabel });
    expect(resting).toHaveLength(2);
    for (const button of resting) expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(resting[0]);

    // Both mounts flip, because the state is one provider and not two useStates.
    const pressed = screen.getAllByRole("button", { name: removeLabel });
    expect(pressed).toHaveLength(2);
    for (const button of pressed) expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: addLabel })).toBeNull();

    // The row itself reads as selected — the panel passed `selected` down.
    const row = screen.getAllByRole("listitem", {
      name: /^Goblin Bombardment\./,
    })[0];
    expect(within(row).getByRole("button", { name: removeLabel })).toBeInTheDocument();

    fireEvent.click(pressed[0]);
    expect(screen.getAllByRole("button", { name: addLabel })).toHaveLength(2);
  });

  it("leaves the Build href unchanged while nothing is selected", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} />,
    );
    for (const link of screen.getAllByRole("link", { name: /Build this deck/i })) {
      expect(link).toHaveAttribute("href", `/decks?commander=${commander().oracleId}`);
    }
  });

  it("carries the selected oracle ids into the Build href", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} />,
    );
    const rows = screen.getAllByRole("listitem");
    fireEvent.click(within(rows[0]).getByRole("button", { name: /^Add / }));
    fireEvent.click(within(rows[1]).getByRole("button", { name: /^Add / }));
    const href = screen.getAllByRole("link", { name: /Build this deck/i })[0].getAttribute("href");
    expect(href).toContain(`commander=${commander().oracleId}`);
    expect(new URL(href!, "http://x").searchParams.get("select")?.split(",")).toHaveLength(2);
  });
});

describe("CommanderDetail availability mode", () => {
  // The page can be reached from either ranking, and the score it draws is only
  // comparable to the list the reader came from. Naming the pool is the whole
  // difference between the two figures.
  it("names the free pool the score was measured against", () => {
    render(
      <CommanderDetail
        commander={commander()}
        rank={1}
        isBestFit
        avail="free"
        synergyCards={noSynergyCards}
      />,
    );
    expect(screen.getAllByText(availabilityCopy.ranking.freeNote).length).toBeGreaterThan(0);
  });

  it("says nothing about availability in the canonical mode", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} />);
    expect(screen.queryByText(availabilityCopy.ranking.freeNote)).toBeNull();
  });
});
