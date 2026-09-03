import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SynergySelection } from "./synergy-selection";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";

const owned = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ oracleId: `o${i}`, owned: true }));
const unowned = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ oracleId: `u${i}`, owned: false }));

const synergyCard = (id: string): SynergyCard => ({
  oracleId: id,
  name: id,
  typeLine: "Creature — Human",
  facet: "creature",
  inclusionPct: null,
  synergyPts: null,
  owned: true,
});
const synergyCards = (n: number): SynergyCard[] =>
  Array.from({ length: n }, (_, i) => synergyCard(`o${i}`));

describe("SynergySelection", () => {
  it("renders nothing at zero selection so the locked promise stands alone", () => {
    const { container } = render(
      <SynergySelection selectedCards={[]} onClear={() => {}} width="desktop" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("states the fill, the pick and the total", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="desktop" />);
    // The total ("75") is wrapped in a highlighted span, so getByText on the full
    // string no longer matches; use a function query on the container instead.
    expect(
      screen.getByText((_content, el) =>
        el?.tagName === "SPAN" &&
        el.textContent === synergyCopy.select.promise("68", "7", "75"),
      ),
    ).toBeInTheDocument();
  });

  it("names the unowned cards in the selection", () => {
    render(
      <SynergySelection
        selectedCards={[...owned(5), ...unowned(2)]}
        onClear={() => {}}
        width="desktop"
      />,
    );
    expect(screen.getByText(synergyCopy.select.promiseUnowned("2"))).toBeInTheDocument();
  });

  it("clamps at 99 and says the selection fills the deck on its own", () => {
    render(<SynergySelection selectedCards={owned(40)} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(synergyCopy.select.promiseFull("40"))).toBeInTheDocument();
  });

  it("takes the mobile promise string at phone width", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="phone" />);
    // Total is wrapped in a span; check the container text content instead.
    expect(
      screen.getByText((_content, el) =>
        el?.tagName === "SPAN" &&
        el.textContent === synergyCopy.select.promiseMobile("68", "7", "75"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText((_content, el) =>
        el?.tagName === "SPAN" &&
        el.textContent === synergyCopy.select.promise("68", "7", "75"),
      ),
    ).not.toBeInTheDocument();
  });

  it("clears the selection", () => {
    const onClear = vi.fn();
    render(<SynergySelection selectedCards={owned(3)} onClear={onClear} width="desktop" />);
    fireEvent.click(screen.getByRole("button", { name: synergyCopy.select.clearAria("3") }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

// The live-region test must assert against CommanderDetail itself, not the
// announcer in isolation: only a real render of detail.tsx can prove the
// announcer is placed correctly in the page tree. A test that mounts the
// announcer directly is a tautology — it always finds exactly one because it
// always mounts exactly one, regardless of what detail.tsx does.
import { CommanderDetail } from "./detail";
import type { RankedCommander } from "../../lib/recs/recommend";

function detailCommander(): RankedCommander {
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
    fitPool: 12,
    fitRoles: 8,
    fitSynergy: 24,
    score: 44,
    slug: "krenko-mob-boss",
    synergyState: "ok",
  };
}

describe("SelectableLiveAnnouncer — placement in CommanderDetail", () => {
  it("renders exactly one ARIA live region in the full CommanderDetail tree", () => {
    // Assert against the page component, not the announcer in isolation.
    // Deleting the announcer from detail.tsx, or moving it inside a breakpoint
    // container and duplicating it, will fail this assertion — the isolated test
    // above cannot see either of those regressions.
    const { container } = render(
      <CommanderDetail
        commander={detailCommander()}
        rank={1}
        isBestFit
        synergyCards={synergyCards(3)}
      />,
    );
    // The SelectableLiveAnnouncer renders a <span>; other providers in the tree
    // (e.g. CardDetailProvider) render <div> live regions. Querying for the span
    // form isolates the announcer from siblings.
    const regions = container.querySelectorAll('span[aria-live="polite"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveClass("sr-only");
  });
});
