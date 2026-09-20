import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { ReadyToBuild } from "./ready-to-build";

// Only the fields the hero renders. `CommanderListItem` has fifteen more; a
// fixture that lists them all is a fixture that breaks when any of them moves.
function item(over = {}) {
  return {
    oracleId: "o1",
    slug: "atraxa-praetors-voice",
    name: "Atraxa, Praetors' Voice",
    colorIdentity: ["W", "U", "B", "G"],
    imageUri: null,
    score: 74,
    measurableTotal: 100,
    colorPoolSize: 92,
    ...over,
  } as unknown as CommanderListItem;
}

// `set` is not a field of `ReadySlice` — the slice ships `shown`, `moreCount`
// and `floor`, and the plan's fixture predates that. Kept as the source of the
// two shown cards so the spread below still reads.
const READY = {
  shown: [item(), item({ oracleId: "o2", score: 71, colorPoolSize: 88 })],
  moreCount: 7,
  floor: 70,
};

const IN_USE = new Map([["o1", { inUse: 12, wantedByDraft: 0 }]]);

describe("ReadyToBuild", () => {
  it("draws the frame's figures exactly", () => {
    render(<ReadyToBuild ready={READY} inUse={IN_USE} />);
    expect(screen.getByText("74")).toBeInTheDocument();
    expect(screen.getByText("92 of your cards fit")).toBeInTheDocument();
    expect(screen.getByText("12 in use")).toBeInTheDocument();
    expect(screen.getByText("7 more scored 70 or better")).toBeInTheDocument();
  });

  it("omits the in-use clause when nothing is in use", () => {
    render(<ReadyToBuild ready={READY} inUse={IN_USE} />);
    // "o2" has no entry at all, which is the same claim as zero.
    expect(screen.queryByText("0 in use")).toBeNull();
    expect(screen.getAllByText(/in use/)).toHaveLength(1);
  });

  it("prints the real denominator when a commander has no synergy read", () => {
    const partial = {
      ...READY,
      shown: [item({ score: 58, measurableTotal: 80 }), READY.shown[1]],
    };
    render(<ReadyToBuild ready={partial} inUse={IN_USE} />);
    expect(screen.getByText("/80 fit")).toBeInTheDocument();
  });

  // `Start this deck` is cut: nobody builds a deck automatically without seeing
  // the pool first, so the second action was the one offered in the wrong order.
  // `See the pool` takes the filled treatment as the only action left.
  it("gives each hero the one route that survives", () => {
    render(<ReadyToBuild ready={READY} inUse={IN_USE} />);
    expect(screen.queryAllByRole("link", { name: "Start this deck" })).toHaveLength(0);
    const pool = screen.getAllByRole("link", { name: "See the pool" });
    expect(pool).toHaveLength(2);
    // The route, not just the words. The old CTA pointed at
    // `/decks/new?commander=<oracleId>`, so a regression to it — or to a
    // malformed slug — reads identically to a reader of the label alone.
    for (const link of pool) {
      expect(link.getAttribute("href")).toMatch(/^\/commanders\/[a-z0-9-]+$/);
    }
  });

  it("drops the more-above line when nothing is above", () => {
    render(<ReadyToBuild ready={{ ...READY, moreCount: 0, floor: 74 }} inUse={IN_USE} />);
    expect(screen.queryByText(/more scored/)).toBeNull();
    expect(screen.getByRole("link", { name: "All commanders" })).toBeInTheDocument();
  });

  it("renders nothing at all when nothing scored", () => {
    const { container } = render(
      <ReadyToBuild ready={{ shown: [], moreCount: 0, floor: null }} inUse={IN_USE} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
