import { describe, expect, it } from "vitest";
import type { CheckedSynopsis } from "../synopsis/types";
import { LANDING_PRECON_NAME, pickLandingPrecon, plainOverview, shapeLandingPrecon } from "./landing-precon";

const list = [{ fileName: "a.json", name: "Alpha" }, { fileName: "m.json", name: LANDING_PRECON_NAME }];
const content = (overview: string | null) => ({ overview }) as CheckedSynopsis;

describe("landing precon", () => {
  it("features Mutant Menace when it has an Overview, else the first, else none", () => {
    expect(pickLandingPrecon(list)?.fileName).toBe("m.json");
    expect(pickLandingPrecon([list[0]])?.fileName).toBe("a.json");
    expect(pickLandingPrecon([])).toBeNull();
  });

  it("draws a card mark as its plain name", () => {
    expect(plainOverview("[[The Wise Mothman]] leads  a deck.\n")).toBe("The Wise Mothman leads a deck.");
  });

  it("shapes nothing for an Overview with no lead", () => {
    const extras = { commander: null, contractVersion: 13, art: {}, evidenceNames: {} };
    const body = content("[[A]] wins.");
    expect(shapeLandingPrecon({ name: "X", content: body, ...extras })).toEqual({ name: "X", overview: "A wins.", content: body, ...extras });
    expect(shapeLandingPrecon({ name: "X", content: content("  "), ...extras })).toBeNull();
    expect(shapeLandingPrecon({ name: "X", content: content(null), ...extras })).toBeNull();
    expect(shapeLandingPrecon(null)).toBeNull();
  });
});
