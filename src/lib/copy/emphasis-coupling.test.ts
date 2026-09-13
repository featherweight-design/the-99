// `Emphasised` renders its `clause` by LOCATING it inside `text`. The two are
// separate copy keys, so a punctuation change to the body that lands inside the
// clause makes the mark silently stop rendering: no type error, no failing
// component test, just an unmarked sentence.
//
// The 2026-09-13 em-dash sweep changed both of these bodies, which is why this
// exists. It is a contract between two keys, not a rendering test — the
// component tests already cover the rendering.
import { describe, expect, it } from "vitest";
import { discoveryCopy } from "./commander-discovery";
import { planeCopy } from "./commanders-plane";

describe("an emphasis clause is a substring of the body it marks", () => {
  it("discovery: the floor rule, inside the floor body", () => {
    // Arguments are arbitrary: the clause interpolates only `floorPct`, so any
    // consistent value proves the containment the component depends on.
    expect(discoveryCopy.empty.floorBody(30, 120, 4000, 22)).toContain(
      discoveryCopy.empty.floorEmphasis(30),
    );
  });

  it("discovery: the day-one clause, inside the no-decks body", () => {
    expect(discoveryCopy.empty.noDecksBody).toContain(discoveryCopy.empty.noDecksEmphasis);
  });

  it("plane: the floor rule, inside the pool-variant body", () => {
    expect(planeCopy.floorPool.body(30, 120, 40, 160, 900, 9)).toContain(
      planeCopy.floorPool.emphasis(30),
    );
  });
});
