import { describe, expect, it } from "vitest";
import { jobTally, type JobRowsByCard } from "./job-tally";
import { computeLabelRoleCounts, labelRolesOf, roleCounterFor, roleNamedFor, type LabelCountCard } from "./label-role-counts";
import { computeRoleCounts } from "./mix";
import { labelRoleCountsEnabled, roleBasisFromEnv } from "./label-counts-flag";

const c = (id: string, role: LabelCountCard["role"], quantity = 1): LabelCountCard =>
  ({ oracleId: id, name: id, role, quantity });

const BY_CARD: JobRowsByCard = {
  rock: ["ramp"],
  dork: ["ramp", "draw"],
  bolt: ["removal"],
  wrath: ["removal", "wipes"],
  vanilla: [],
};

describe("computeLabelRoleCounts", () => {
  const deck = [
    c("rock", "ramp"), c("dork", "ramp"), c("bolt", "removal"), c("wrath", "wipes"),
    c("vanilla", "other"), c("mystery", "draw"), c("forest", "land", 3),
  ];

  it("counts a card in every role its label names", () => {
    const counts = computeLabelRoleCounts(deck, BY_CARD);
    // `mystery` has no label and is the classifier's draw (next test).
    expect(counts).toEqual({ ramp: 2, draw: 2, removal: 2, wipes: 1, land: 3 });
  });

  it("counts a card with no label by the classifier", () => {
    // `mystery` is classified draw and absent from the map, so the classifier's call.
    const counts = computeLabelRoleCounts(deck, BY_CARD);
    expect(counts.draw).toBe(2); // dork by label, mystery by text
  });

  it("counts a labeled card that does none as none, where an unlabeled one would be counted", () => {
    // `vanilla` is labeled-and-doing-nothing; the classifier would call this one ramp.
    const counts = computeLabelRoleCounts([c("vanilla", "ramp")], BY_CARD);
    expect(counts.ramp).toBe(0);
  });

  it("gives an unlabeled card with no classifier role to no cell", () => {
    const counts = computeLabelRoleCounts([c("mystery", "other")], BY_CARD);
    expect(counts).toEqual({ ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0 });
  });

  it("is the Jobs card's tally EXACTLY: the four cells equal jobTally's rows over every nonland card, labeled or not", () => {
    const tally = jobTally(
      deck.filter((d) => d.role !== "land").map((d) => ({ oracleId: d.oracleId!, name: d.name!, copies: d.quantity, role: d.role })),
      BY_CARD,
    );
    const counts = computeLabelRoleCounts(deck, BY_CARD);
    for (const key of ["ramp", "draw", "removal", "wipes"] as const) {
      expect(counts[key]).toBe(tally.rows.find((r) => r.key === key)!.copies);
    }
  });

  it("weights by quantity and leaves lands to card.role", () => {
    const counts = computeLabelRoleCounts([c("rock", "ramp", 2), c("forest", "land", 36)], BY_CARD);
    expect(counts.ramp).toBe(2);
    expect(counts.land).toBe(36);
  });

  it("reads a card without an id from its text", () => {
    expect(computeLabelRoleCounts([{ role: "ramp", quantity: 2 }], BY_CARD).ramp).toBe(2);
  });
});

describe("roleCounterFor", () => {
  const deck = [c("dork", "ramp"), c("bolt", "removal")];

  it("is computeRoleCounts exactly when there are no label rows", () => {
    for (const none of [null, undefined]) {
      const count = roleCounterFor(none);
      expect(count(deck)).toEqual(computeRoleCounts(deck));
      expect(count.byLabel).toBe(false);
    }
  });

  it("counts by label when it has them", () => {
    const count = roleCounterFor(BY_CARD);
    expect(count.byLabel).toBe(true);
    expect(count(deck)).toEqual({ ramp: 1, draw: 1, removal: 1, wipes: 0, land: 0 });
  });
});

describe("labelRolesOf", () => {
  it("lists the four roles a label names in the strip's order, and nothing for an unlabeled card", () => {
    expect(labelRolesOf(["removal", "ramp", "finisher"])).toEqual(["ramp", "removal"]);
    expect(labelRolesOf(undefined)).toEqual([]);
    expect(labelRolesOf([])).toEqual([]);
  });
});

describe("LABEL_ROLE_COUNTS_ENABLED", () => {
  it("is off unless exactly 'true'", () => {
    expect(labelRoleCountsEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(labelRoleCountsEnabled({ LABEL_ROLE_COUNTS_ENABLED: "" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(labelRoleCountsEnabled({ LABEL_ROLE_COUNTS_ENABLED: "1" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(labelRoleCountsEnabled({ LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("selects the targets' basis", () => {
    expect(roleBasisFromEnv({} as unknown as NodeJS.ProcessEnv)).toBe("classifier");
    expect(roleBasisFromEnv({ LABEL_ROLE_COUNTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe("labels");
  });
});

describe("roleNamedFor", () => {
  const card = { oracleId: "a", role: "ramp" };
  it("names the classifier's role for a queried card with no label", () => {
    expect(roleNamedFor(card, {}, new Set(["a"]))).toBe("ramp");
  });
  it("names nothing for a queried card whose label does none", () => {
    expect(roleNamedFor(card, { a: [] }, new Set(["a"]))).toBeUndefined();
  });
  it("falls back to the classifier for a card the page never queried", () => {
    expect(roleNamedFor(card, {}, new Set(["b"]))).toBe("ramp");
  });
  it("falls back to the classifier when there is no label read, and for a land", () => {
    expect(roleNamedFor(card, null, new Set(["a"]))).toBe("ramp");
    expect(roleNamedFor({ oracleId: "a", role: "land" }, {}, new Set(["a"]))).toBe("land");
  });
  it("names the first role the label names", () => {
    expect(roleNamedFor(card, { a: ["draw", "ramp"] }, new Set(["a"]))).toBe("ramp");
  });
});
