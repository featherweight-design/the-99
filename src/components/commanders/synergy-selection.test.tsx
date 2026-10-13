import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SynergySelection,
  SynergySelectionProvider,
  useSynergySelection,
} from "./synergy-selection";
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

  it("states the fill, the pick and the total", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="desktop" />);
    // The total ("75") is wrapped in a highlighted span, so getByText on the full
    // string no longer matches; use a function query on the container instead.
    expect(
      screen.getByText((_content, el) =>
        el?.tagName === "SPAN" &&
        // 92 and 99, not 68 and 75: the fill continues to the body through its synergy
        // residual, so seven picks leave ninety-two for it and the deck arrives whole.
        el.textContent === synergyCopy.select.promise("92", "7", "99"),
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

  it("says the selection fills the deck on its own only when it does", () => {
    render(<SynergySelection selectedCards={owned(99)} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(synergyCopy.select.promiseFull("99"))).toBeInTheDocument();
  });

  // The build places the selection first and fills what is left under the 99, so
  // the baseline is a ceiling on the fill, not a fixed part of it. Reading it as
  // fixed put the clamp line — "your picks fill the 99 on their own" — on a deck
  // the fill was still placing 59 cards of.
  it("shrinks the filled figure once the selection eats into the baseline", () => {
    render(<SynergySelection selectedCards={owned(40)} onClear={() => {}} width="desktop" />);
    expect(screen.queryByText(synergyCopy.select.promiseFull("40"))).not.toBeInTheDocument();
    expect(
      screen.getByText((_content, el) =>
        el?.tagName === "SPAN" &&
        el.textContent === synergyCopy.select.promise("59", "40", "99"),
      ),
    ).toBeInTheDocument();
  });

  it("takes the mobile promise string at phone width", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="phone" />);
    // Total is wrapped in a span; check the container text content instead.
    expect(
      screen.getByText((_content, el) =>
        el?.tagName === "SPAN" &&
        el.textContent === synergyCopy.select.promiseMobile("92", "7", "99"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText((_content, el) =>
        el?.tagName === "SPAN" &&
        // 92 and 99, not 68 and 75: the fill continues to the body through its synergy
        // residual, so seven picks leave ninety-two for it and the deck arrives whole.
        el.textContent === synergyCopy.select.promise("92", "7", "99"),
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
// CoverageSection refreshes the route after a recovered retry, so the whole
// detail tree needs a router even where no test clicks Retry.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

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
      <CommanderDetail
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
