import { describe, expect, it } from "vitest";
import { jobTally, type JobRowsByCard } from "./job-tally";
import { computeLabelRoleCounts, labelRolesOf, roleCounterFor, type LabelCountCard } from "./label-role-counts";
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
    const { counts } = computeLabelRoleCounts(deck, BY_CARD);
    expect(counts).toEqual({ ramp: 2, draw: 1, removal: 2, wipes: 1, land: 3 });
  });

  it("counts a card with no label toward no role, and says how many", () => {
    // `mystery` is classified draw, but absent from the map: unlabeled, not a draw.
    const { counts, unlabeled } = computeLabelRoleCounts(deck, BY_CARD);
    expect(counts.draw).toBe(1); // dork alone
    expect(unlabeled).toBe(1);
  });

  it("is the Jobs card's tally: the four cells equal jobTally's rows over the same cards", () => {
    const tally = jobTally(
      deck.filter((d) => d.role !== "land").map((d) => ({ oracleId: d.oracleId!, name: d.name!, copies: d.quantity })),
      BY_CARD,
    );
    const { counts } = computeLabelRoleCounts(deck, BY_CARD);
    for (const key of ["ramp", "draw", "removal", "wipes"] as const) {
      expect(counts[key]).toBe(tally.rows.find((r) => r.key === key)!.copies);
    }
  });

  it("weights by quantity and leaves lands to card.role", () => {
    const { counts } = computeLabelRoleCounts([c("rock", "ramp", 2), c("forest", "land", 36)], BY_CARD);
    expect(counts.ramp).toBe(2);
    expect(counts.land).toBe(36);
  });

  it("treats a card without an id as unlabeled", () => {
    const { unlabeled } = computeLabelRoleCounts([{ role: "ramp", quantity: 2 }], BY_CARD);
    expect(unlabeled).toBe(2);
  });
});

describe("roleCounterFor", () => {
  const deck = [c("dork", "ramp"), c("bolt", "removal")];

  it("is computeRoleCounts exactly when there are no label rows", () => {
    for (const none of [null, undefined]) {
      const count = roleCounterFor(none);
      expect(count(deck)).toEqual(computeRoleCounts(deck));
      expect(count.byLabel).toBe(false);
      expect(count.unlabeled(deck)).toBe(0);
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
