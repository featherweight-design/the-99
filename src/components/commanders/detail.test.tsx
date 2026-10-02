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
import { explainedCopy } from "../../lib/copy/commander-explained";
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
    imageUri: null,
    owned: true,
    committedTo: null, availability: null, price: null,
    manaCost: null,
  },
  {
    oracleId: "oracle-skullclamp",
    name: "Skullclamp",
    typeLine: "Artifact — Equipment",
    facet: "artifact",
    inclusionPct: 62,
    synergyPts: null,
    imageUri: null,
    owned: false,
    committedTo: null, availability: null, price: null,
    manaCost: null,
  },
];

function commander(overrides: Partial<CommanderDetailScore> = {}): CommanderDetailScore {
  return {
    oracleId: "oracle-1",
    roleTargets: { of: "flat", targets: { ramp: 10, draw: 10, removal: 8, wipes: 3 } },
    name: "Krenko, Mob Boss",
    colorIdentity: ["R"],
    imageUri: null,
    artCropUri: null,
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
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
    expect(screen.queryByText(/Synergy data unavailable/i)).toBeNull();
  });

  it("says the data is unavailable when the state is degraded", () => {
    render(<CommanderDetail commander={noSynergy("degraded")} rank={1} isBestFit={false} synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
    expect(screen.getAllByText(/Synergy data unavailable/i).length).toBeGreaterThan(0);
  });

  it("says the commander is not indexed, with no Retry, when the state is absent", () => {
    render(<CommanderDetail commander={noSynergy("absent")} rank={1} isBestFit={false} synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
    expect(screen.getAllByText(/EDHREC doesn't track this commander/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Synergy data unavailable/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });
});

// The page is the row's own link target: a row captioned with the copy the reader owns
// must not lead to a head carrying the oracle name. `queryByText` over the whole render
// covers every site that draws the name — the head and both widths of `FitHero` — which
// is what makes the second case meaningful: it is the same sweep asserting the oracle
// name IS drawn when no printed one was supplied.
describe("CommanderDetail · a renamed copy", () => {
  it("heads the page with the name printed on the card", () => {
    render(
      <CommanderDetail
        commander={commander({
          name: "Iroas, God of Victory",
          printedName: "Freya, Queen of the Valkyries",
        })}
        rank={1}
        isBestFit
        synergyCards={noSynergyCards}
        newestAsOf={null}
        avail="all"
      />,
    );

    expect(screen.getAllByText(/Freya, Queen of the Valkyries/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Iroas, God of Victory/)).toBeNull();
  });

  it("keeps the oracle name for a commander the reader does not own", () => {
    render(
      <CommanderDetail
        commander={commander()}
        rank={1}
        isBestFit
        synergyCards={noSynergyCards}
        newestAsOf={null}
        avail="all"
      />,
    );

    expect(screen.getAllByText(/Krenko, Mob Boss/).length).toBeGreaterThan(0);
  });
});

describe("CommanderDetail fit hero", () => {
  // The figure and the ceiling beside it are one claim. A commander EDHREC does not
  // index is scored out of 40, and printing that 32 beside "/100" is the fabricated
  // comparability the denominator exists to close.
  it("prints the raw score over 100 when synergy was measured", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
    expect(screen.getAllByText("44").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/100").length).toBeGreaterThan(0);
    expect(screen.queryByText(/measurable/)).toBeNull();
  });

  it("names the shorter ceiling when synergy was not measured", () => {
    render(
      <CommanderDetail
        commander={commander({ synergyState: "absent", fitSynergy: null, score: 20, measurableTotal: 40, rankScore: 20, edhrecOwnedCount: null, edhrecTotal: null })}
        rank={3}
        isBestFit={false}
        synergyCards={noSynergyCards} newestAsOf={null}
       avail="all"/>,
    );
    expect(screen.getAllByText("/40 measurable").length).toBeGreaterThan(0);
    expect(screen.queryByText("/100")).toBeNull();
  });

  // The legend used to print each segment's share of the achieved total, which always
  // summed to 100% and taught nothing about the weights. Points over weight makes the
  // headline auditable by addition.
  it("prints each segment's points over its weight", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
    expect(screen.getAllByLabelText("Pool, 12 of 15 points").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Roles, 8 of 25 points").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Synergy, 24 of 60 points").length).toBeGreaterThan(0);
  });

  // There is no missing third of a hundred to explain once the denominator is 40.
  it("drops the synergy legend entry rather than drawing a placeholder", () => {
    render(
      <CommanderDetail
        commander={commander({ synergyState: "absent", fitSynergy: null, score: 20, measurableTotal: 40, rankScore: 20 })}
        rank={3}
        isBestFit={false}
        synergyCards={noSynergyCards} newestAsOf={null}
       avail="all"/>,
    );
    expect(screen.queryByText(/^Synergy —/)).toBeNull();
    expect(screen.queryByLabelText(/^Synergy,/)).toBeNull();
  });

  it("explains only the segments that were measured", () => {
    render(
      <CommanderDetail
        commander={commander({ synergyState: "absent", fitSynergy: null, score: 20, measurableTotal: 40, rankScore: 20 })}
        rank={3}
        isBestFit={false}
        synergyCards={noSynergyCards} newestAsOf={null}
       avail="all"/>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /What Pool, Roles and Synergy mean/i })[0]);
    expect(screen.getAllByText(/Breadth, not quality/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/most-played list/)).toBeNull();
    expect(screen.getAllByText(/12 \+ 8 = 20\./).length).toBeGreaterThan(0);
  });

  // An aria-controls pointing at an id no element carries is a broken relationship,
  // and the panel only exists while the key is open.
  it("names the panel it controls only while that panel exists", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
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
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
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
      <CommanderDetail commander={noSynergy("absent")} rank={1} isBestFit={false} synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>,
    );
    expect(screen.queryByText(/EDHREC data unavailable/i)).toBeNull();
  });

  it("keeps the outage note off a commander whose rows are all excluded", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>,
    );
    expect(screen.queryByText(/EDHREC data unavailable/i)).toBeNull();
  });

  it("still shows the outage note when EDHREC is unreachable", () => {
    render(
      <CommanderDetail commander={noSynergy("degraded")} rank={1} isBestFit={false} synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>,
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
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} newestAsOf={null}  avail="all"/>,
    );
    expect(screen.getAllByText(synergyCopy.panel.subcaption("2"))).toHaveLength(1);
    expect(screen.getAllByText(synergyCopy.panel.subcaptionMobile("2"))).toHaveLength(1);
  });

  it("toggles a row through the provider, the bridge and the panel together", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} newestAsOf={null}  avail="all"/>,
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
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} newestAsOf={null}  avail="all"/>,
    );
    for (const link of screen.getAllByRole("link", { name: /Build this deck/i })) {
      expect(link).toHaveAttribute("href", `/decks?commander=${commander().oracleId}`);
    }
  });

  it("carries the selected oracle ids into the Build href", () => {
    render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={synergyCards} newestAsOf={null}  avail="all"/>,
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
        synergyCards={noSynergyCards} newestAsOf={null}
      />,
    );
    expect(screen.getAllByText(availabilityCopy.ranking.freeNote).length).toBeGreaterThan(0);
  });

  it("says nothing about availability in the canonical mode", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
    expect(screen.queryByText(availabilityCopy.ranking.freeNote)).toBeNull();
  });
});

describe("CommanderDetail card details trigger", () => {
  // Both breakpoint trees render in jsdom — one is `sm:hidden`, the other
  // `hidden sm:grid`, and neither media query resolves here. Two triggers is
  // therefore the passing state: one per width. Before the desktop column had
  // one, this count was 1 and the desktop card could not be opened at all, so
  // the printings, the rulings and a two-faced commander's flip control were
  // unreachable at that width.
  it("offers a card-details control at both widths", () => {
    render(<CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>);
    expect(screen.getAllByRole("button", { name: "View card details" })).toHaveLength(2);
  });
});

describe("commander detail — the desktop card face", () => {
  // The two card faces converge on one ring alpha and one shadow, and nothing
  // else covered it: the detail tests read content and interactions, and the
  // browser census only measures `[data-commander-thumb]` elements — which this
  // 220px-class face deliberately is not, because the player is meant to read
  // the printing here rather than identify a row.
  it("rings and shadows the face at the converged values", () => {
    const { container } = render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>,
    );
    const face = Array.from(container.querySelectorAll<HTMLElement>("div")).find(
      (el) => el.style.aspectRatio === "63/88",
    )!;
    expect(face.style.boxShadow).toContain("inset 0 0 0 1px rgba(0,0,0,0.4)");
    expect(face.style.boxShadow).toContain("0 20px 50px rgba(0,0,0,0.5)");
    // `.3` was this face's own ring and `0 24px 50px` the other face's shadow;
    // neither survives the convergence.
    expect(face.style.boxShadow).not.toContain("0.3)");
    expect(face.style.boxShadow).not.toContain("24px");
  });
});

describe("commander detail — the art header band", () => {
  // A page header, stated in px. The 1.6/1 ratio made this band 244px on a 390px
  // phone and 328px on a 520px one: a header whose height was a function of the
  // device rather than of the job, and whose scrim scaled its darkness with it.
  it("states 288px rather than an aspect ratio", () => {
    const { container } = render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>,
    );
    const band = container.querySelector<HTMLElement>(".sm\\:hidden.relative.flex-none");
    expect(band).not.toBeNull();
    expect(band!.style.height).toBe("288px");
    expect(band!.style.aspectRatio).toBe("");
    expect(band!.firstElementChild).toHaveAttribute("data-art-wash-band", "288");
    // The measured figure, pinned. The browser probe checks the hold against
    // whatever the component publishes, so it would follow this number down to
    // the handoff's 57 without failing — 57 is a percentage read of a px block,
    // which is the round's own bug. Only an assertion on the figure itself
    // catches the drift.
    expect(band!.firstElementChild).toHaveAttribute("data-art-wash-label-at", "96");
    // And the size the figure was measured against. At 25px a two-word commander
    // filled the phone's width and anything longer took both clamped lines,
    // pushing the pips off the row — so restoring 25 while leaving 96 in place is
    // exactly the regression this pins.
    const heading = band!.querySelector<HTMLElement>("h1")!;
    expect(heading.style.fontSize).toBe("19px");
  });

  // The 96px figure is only true while the name is two lines at most, and the
  // clamp is what makes the ceiling a ceiling. A long name has to keep it: a
  // third line grows the block past 96 and prints the first line on a ramp
  // still climbing, which is this round's own failure from the other direction.
  it("clamps even a very long name to two lines, so the block keeps its height", () => {
    const { container } = render(
      <CommanderDetail
        commander={commander({
          name: "Rograkh, Son of Rohgahh and Silas Renn, Seeker Adept of the Tenth District",
        })}
        rank={1}
        isBestFit
        synergyCards={noSynergyCards} newestAsOf={null}
       avail="all"/>,
    );
    const band = container.querySelector<HTMLElement>(".sm\\:hidden.relative.flex-none")!;
    const heading = band.querySelector<HTMLElement>("h1")!;
    expect(heading.style.display).toBe("-webkit-box");
    expect(heading.style.webkitLineClamp).toBe("2");
    expect(heading.style.overflow).toBe("hidden");
    // And the figure the ramp is keyed to has not moved for the long name.
    expect(band.firstElementChild).toHaveAttribute("data-art-wash-label-at", "96");
  });

  // `GRU` is the pips again in a second alphabet, and the swatches beside it
  // already carry the colours. `Temur` is the word a player uses, and it is the
  // word every deck surface already prints for the same identity.
  it("names the colour identity rather than spelling its letters", () => {
    render(
      <CommanderDetail
        commander={commander({ colorIdentity: ["G", "R", "U"] })}
        rank={1}
        isBestFit
        synergyCards={noSynergyCards}
        newestAsOf={null}
        avail="all"
      />,
    );

    expect(screen.getByText("Temur")).toBeInTheDocument();
    expect(screen.queryByText("GRU")).toBeNull();
  });

  // The pips leave the band's top edge for the block. Five plated swatches in a
  // corner would be five plates for a decorative read, and every other band in
  // the app already draws them beside the name — so moving them is both cheaper
  // than plating them and what leaves this top edge empty.
  it("draws the identity pips in the block, not at the top edge", () => {
    const { container } = render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>,
    );
    const band = container.querySelector<HTMLElement>(".sm\\:hidden.relative.flex-none")!;
    const pinned = Array.from(band.querySelectorAll<HTMLElement>("div.absolute")).filter(
      (d) => d.style.top !== "",
    );
    expect(pinned).toHaveLength(0);

    const heading = band.querySelector("h1")!;
    // Beside the name, in the name's own row.
    expect(heading.parentElement?.querySelector('[aria-hidden="true"]')).not.toBeNull();
    // And on the name's LAST line. jsdom lays nothing out, so the alignment is
    // only assertable as the declaration — but the declaration is the whole
    // defect: a flex container baseline-aligns to a multi-line item's first
    // baseline, so `items-baseline` puts the swatches beside line one of the
    // two-line name this block is sized for.
    expect(heading.parentElement?.className).toContain("items-end");
    expect(heading.parentElement?.className).not.toContain("items-baseline");
  });

  // The block reserves the corner the 44px card-details target sits in, the way
  // the deck tile's block clears its overflow control. Without it the name runs
  // under a plate drawn over it.
  it("keeps the block clear of the card-details corner", () => {
    const { container } = render(
      <CommanderDetail commander={commander()} rank={1} isBestFit synergyCards={noSynergyCards} newestAsOf={null}  avail="all"/>,
    );
    const band = container.querySelector<HTMLElement>(".sm\\:hidden.relative.flex-none")!;
    const block = band.querySelector<HTMLElement>("h1")!.closest("div.absolute") as HTMLElement;
    expect(Number.parseInt(block.style.paddingRight, 10)).toBeGreaterThanOrEqual(40);
  });
});

// ── The price reaches BOTH panels ──────────────────────────────────────────
//
// This exists because it did not. `newestAsOf` was threaded to the phone panel
// and not the desktop one, so above the breakpoint `priceState(price, null)`
// read `absent`: every unowned row drew a bare `buy` with no figure and spoke
// "available to buy" over a card with a live price. The phone was correct, which
// is what made it invisible — a diff review sees the prop threaded, and every
// `SynergyRow` test hands it in directly, so nothing rendered the wiring.
//
// The prop is required now, so this case is belt to that braces: it fails if the
// value stops ARRIVING, where the type only catches it not being passed.
describe("the price reaches both panels", () => {
  const priced: SynergyCard[] = [
    {
      oracleId: "oracle-unowned",
      name: "Rhystic Study",
      typeLine: "Enchantment",
      facet: "enchantment",
      inclusionPct: 44,
      synergyPts: 60,
      imageUri: null,
      owned: false,
      committedTo: null,
      availability: null,
      price: { cents: 450, foilCents: null, etchedCents: null, asOf: new Date("2026-09-15") },
      manaCost: null,
    },
  ];

  it("quotes the figure at both widths, not just the phone", () => {
    render(
      <CommanderDetail
        commander={commander()}
        rank={1}
        isBestFit
        synergyCards={priced}
        newestAsOf={new Date("2026-09-15")}
       avail="all"/>,
    );
    // Both panels are in the document at once — one per width — so a price that
    // reached only one of them shows up as a count of 1.
    expect(screen.getAllByText(/\$4\.50/).length).toBeGreaterThanOrEqual(2);
  });
});

// ── The key's page-level half is actually wired ────────────────────────────
//
// `coverage-section.test.tsx` proves the INVARIANT by injecting `markerElsewhere`
// directly, which is the right shape for that test and means it never touches
// this computation or either call site. A regression dropping
// `synergyCards.some(drawsMarker)` — or passing it to one panel and not the
// other, which is how the price bug shipped — would stay green there.
describe("the dot key reads the synergy panel too", () => {
  const freeRoleCard = {
    oracleId: "o-free", name: "Sol Ring", inclusionPct: 80, committedTo: null,
    availability: { owned: 2, hard: 0, soft: 0, free: 2, claims: [] },
  };
  const contendedSynergy: SynergyCard = {
    oracleId: "o-held", name: "Rhystic Study", typeLine: "Enchantment",
    facet: "enchantment", inclusionPct: 44, imageUri: null, synergyPts: 60,
    owned: true, committedTo: null,
    availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [] },
    price: null, manaCost: null,
  };

  it("drops the availability claim when only a synergy row is marked", () => {
    const c = commander();
    render(
      <CommanderDetail
        commander={{ ...c, roleCards: { ...c.roleCards, ramp: [freeRoleCard] } }}
        rank={1}
        isBestFit
        synergyCards={[contendedSynergy]}
        newestAsOf={null}
        avail="all"
      />,
    );
    // Role Coverage is entirely free; the marker is in the panel below it.
    expect(screen.getAllByText(explainedCopy.committed.dotOwned).length).toBeGreaterThan(0);
    expect(screen.queryByText("Owned and available.")).toBeNull();
  });

  it("keeps the claim when nothing anywhere is marked", () => {
    const c = commander();
    render(
      <CommanderDetail
        commander={{ ...c, roleCards: { ...c.roleCards, ramp: [freeRoleCard] } }}
        rank={1}
        isBestFit
        synergyCards={[{ ...contendedSynergy, availability: null }]}
        newestAsOf={null}
        avail="all"
      />,
    );
    expect(screen.getAllByText("Owned and available.").length).toBeGreaterThan(0);
  });
});
