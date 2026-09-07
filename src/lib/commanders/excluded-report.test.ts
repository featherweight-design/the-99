import { describe, expect, it } from "vitest";
import { planeCopy } from "../copy/commanders-plane";
import type { ExcludedMatch } from "../discovery/excluded-match";
import { resolveExcludedReport, type ColourExcludedMatch } from "./excluded-report";

const server = (over: Partial<ExcludedMatch> = {}): ExcludedMatch => ({
  oracleId: "a",
  name: "Atraxa, Praetors' Voice",
  cause: "floor",
  pct: 12,
  ...over,
});

const colour = (over: Partial<ColourExcludedMatch> = {}): ColourExcludedMatch => ({
  name: "Yarok, the Desecrated",
  colorIdentity: ["B", "G", "U"],
  joinOnly: false,
  ...over,
});

const resolve = (input: Partial<Parameters<typeof resolveExcludedReport>[0]> = {}) =>
  resolveExcludedReport({
    server: [],
    colour: [],
    colors: [],
    freeCards: 2805,
    listHasRows: true,
    ...input,
  });

describe("resolveExcludedReport", () => {
  it("says nothing when nothing was excluded", () => {
    expect(resolve()).toBeNull();
  });

  it("names the scope over every other cause", () => {
    const out = resolve({
      server: [server({ cause: "scope", pct: null }), server({ oracleId: "b" })],
      colour: [colour()],
      colors: ["G"],
    });
    expect(out?.cause).toBe("scope");
    expect(out?.cta).toBe(planeCopy.excluded.scopeCta);
  });

  it("names the mode only when the mode is the cause", () => {
    const both = resolve({ colour: [colour({ joinOnly: true }), colour()], colors: ["G"] });
    // A row the pips would have removed anyway is a pip exclusion: `Switch to
    // Contains` would not bring it back, so the pips are named instead.
    expect(both?.cause).toBe("colors");
    const only = resolve({ colour: [colour({ joinOnly: true })], colors: ["G"] });
    expect(only?.cause).toBe("join");
    expect(only?.cta).toBe(planeCopy.excluded.joinCta);
  });

  it("puts the pool ahead of the floor, and the floor ahead of the unmeasurable", () => {
    expect(
      resolve({ server: [server(), server({ oracleId: "b", cause: "pool" })] })?.cause,
    ).toBe("pool");
    expect(
      resolve({ server: [server({ cause: "unmeasured", pct: null }), server({ oracleId: "b" })] })
        ?.cause,
    ).toBe("floor");
    expect(resolve({ server: [server({ cause: "unmeasured", pct: null })] })?.cause).toBe(
      "unmeasured",
    );
  });

  it("counts a group rather than naming one of it", () => {
    const out = resolve({ server: [server(), server({ oracleId: "b", name: "Meren" })] });
    expect(out?.name).toBeNull();
    expect(out?.body).toBe(
      planeCopy.search.asideMore(2, planeCopy.excluded.control.floor(30)),
    );
  });

  it("names the commander above a live list, and marks it", () => {
    const out = resolve({ server: [server({ cause: "scope", pct: null })] });
    expect(out?.name).toBe("Atraxa, Praetors' Voice");
    expect(out?.body).toContain("Atraxa, Praetors' Voice");
    // Above a live list the rows are the count, so there is no second figure.
    expect(out?.heading).toBeNull();
    expect(out?.aside).toBeNull();
  });

  it("takes the heading and the count when no row survived", () => {
    const out = resolve({
      server: [server({ cause: "scope", pct: null })],
      listHasRows: false,
    });
    expect(out?.heading).toBe(planeCopy.search.heldHeading("Atraxa, Praetors' Voice"));
    expect(out?.aside).toBe(planeCopy.search.heldAside(1));
    // The heading has already named it, so the body opens with "It".
    expect(out?.name).toBeNull();
    expect(out?.body).toBe(planeCopy.excluded.heldScope);
  });

  // The singular held pair names a commander and then diagnoses it from that one row's
  // identity, which is a claim the other matches did not make.
  it("counts rather than names when several matches are held back", () => {
    const out = resolve({
      colour: [colour(), colour({ name: "Muldrotha, the Gravetide" })],
      colors: ["R"],
      listHasRows: false,
    });
    expect(out?.heading).toBe(planeCopy.search.heldHeadingMany(2));
    expect(out?.heading).not.toContain("Yarok");
    expect(out?.body).toBe(planeCopy.search.heldMany(2, planeCopy.excluded.control.colors(["R"])));
    expect(out?.body).not.toContain("Blue");
    expect(out?.aside).toBe(planeCopy.search.heldAside(2));
  });

  it("names the tier's own count when a second cause is also holding a match back", () => {
    const out = resolve({
      server: [server({ cause: "scope", pct: null }), server({ oracleId: "b" })],
      listHasRows: false,
    });
    // Two matches, one of them the outermost cause: the aside counts both, the body only
    // the ones the named control would return.
    expect(out?.aside).toBe(planeCopy.search.heldAside(2));
    expect(out?.body).toBe(planeCopy.search.heldMany(1, planeCopy.excluded.control.scope));
  });

  it("prints the pool's denominator, not the row's percentage", () => {
    const out = resolve({ server: [server({ cause: "pool" })], freeCards: 1190 });
    expect(out?.body).toContain("1,190");
    expect(out?.cta).toBe(planeCopy.excluded.poolCta);
  });

  it("offers the fit sort to a commander with nothing to measure", () => {
    const out = resolve({ server: [server({ cause: "unmeasured", pct: null })] });
    expect(out?.body).toBe(planeCopy.excluded.unmeasuredAlso("Atraxa, Praetors' Voice"));
    expect(out?.cta).toBe(planeCopy.excluded.floorCta);
  });
});
