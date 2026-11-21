import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SynergySelection,
  SynergySelectionProvider,
  useSynergySelection,
} from "./synergy-selection";
import { guidedBuildCopy } from "../../lib/copy/guided-build";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { MAX_SELECTION } from "../../lib/decks/selection-param";
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
  imageUri: null,
  owned: true,
  committedTo: null, availability: null, price: null,
  manaCost: null,
});
const synergyCards = (n: number): SynergyCard[] =>
  Array.from({ length: n }, (_, i) => synergyCard(`o${i}`));

// The provider's own bound, exercised through a probe rather than through the
// panel: 100 rows of UI to prove an arithmetic rule is a slower test that
// asserts less. `sanitizeSelection` drops everything past MAX_SELECTION, so a
// picker that let the set grow past it would show a count and promise the build
// silently cannot keep.
describe("SynergySelectionProvider — the picker honours the build's bound", () => {
  function Probe() {
    const { selected, toggle } = useSynergySelection();
    return (
      <>
        <span data-testid="count">{selected.size}</span>
        <button type="button" onClick={() => toggle(`o${selected.size}`)}>add</button>
        <button type="button" onClick={() => toggle("o0")}>remove first</button>
      </>
    );
  }

  const mountProbe = () =>
    render(
      <SynergySelectionProvider>
        <Probe />
      </SynergySelectionProvider>,
    );

  it("refuses a pick past MAX_SELECTION and keeps removal working", () => {
    mountProbe();
    const add = screen.getByText("add");
    for (let i = 0; i < MAX_SELECTION + 5; i += 1) fireEvent.click(add);
    expect(screen.getByTestId("count")).toHaveTextContent(String(MAX_SELECTION));

    fireEvent.click(screen.getByText("remove first"));
    expect(screen.getByTestId("count")).toHaveTextContent(String(MAX_SELECTION - 1));
  });
});

describe("SynergySelection", () => {
  it("renders nothing at zero selection so the locked promise stands alone", () => {
    const { container } = render(
      <SynergySelection selectedCards={[]} onClear={() => {}} width="desktop" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("says where the picks go, and promises nothing about how the rest is built", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(guidedBuildCopy.commander.picks(7))).toBeInTheDocument();
    expect(screen.queryByText(/We.ll fill/)).not.toBeInTheDocument();
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

  it("draws the same line at phone width", () => {
    render(<SynergySelection selectedCards={owned(40)} onClear={() => {}} width="phone" />);
    expect(screen.getByText(guidedBuildCopy.commander.picks(40))).toBeInTheDocument();
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
// CoverageSection refreshes the route after a recovered retry, so the whole
// detail tree needs a router even where no test clicks Retry.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// The page's Hide control calls these server actions; mocked so no render here reaches a database.
vi.mock("../../app/commanders/actions", () => ({
  hideCommanderAction: vi.fn(async () => true),
  unhideCommanderAction: vi.fn(async () => true),
}));

import { CommanderDetail } from "./detail";
import type { CommanderDetailScore } from "../../lib/recs/recommend";

function detailCommander(): CommanderDetailScore {
  return {
    oracleId: "oracle-1",
    roleBasis: "classifier",
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
  };
}

describe("SelectableLiveAnnouncer — placement in CommanderDetail", () => {
  it("renders exactly one ARIA live region in the full CommanderDetail tree", () => {
    // Assert against the page component, not the announcer in isolation.
    // Deleting the announcer from detail.tsx, or moving it inside a breakpoint
    // container and duplicating it, will fail this assertion — the isolated test
    // above cannot see either of those regressions.
    const { container } = render(
      <CommanderDetail hidden={false}
        commander={detailCommander()}
        rank={1}
        isBestFit
        synergyCards={synergyCards(3)}
        newestAsOf={null}
       avail="all"/>,
    );
    // The SelectableLiveAnnouncer renders a <span>; other providers in the tree
    // (e.g. CardDetailProvider) render <div> live regions. Querying for the span
    // form isolates the announcer from siblings.
    const regions = container.querySelectorAll('span[aria-live="polite"]');
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveClass("sr-only");
  });
});
