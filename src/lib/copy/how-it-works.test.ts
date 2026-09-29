import { describe, expect, it } from "vitest";
import { FLOOR_PCT } from "../discovery/floor";
import { FLAT_TARGETS } from "../decks/mix";
import { MODEL_FRIEND_DAILY_ALLOWANCE, MODEL_OWNER_DAILY_ALLOWANCE } from "../model/allowance-rule";
import { READY_COUNT, READY_SHOWN } from "../recs/ready-to-build";
import { RELEASE_DELAY_DAYS } from "../catalog/index-due";
import { THEME_ORDER } from "../recs/themes";
import { POOL_FULL_AT, POOL_WEIGHT, ROLES_WEIGHT, SYNERGY_WEIGHT } from "../recs/score";
import { howItWorksCopy } from "./about";
import { deckAnalysisCopy } from "./deck-analysis";
import { bracketSubRows, howItWorksRowsCopy as c } from "./how-it-works";

const row = (id: string) => {
  const r = c.rows.find((x) => x.id === id);
  if (!r) throw new Error(`no row ${id}`);
  return r;
};
const prose = (r: (typeof c.rows)[number]) => [r.title, r.from, r.how, r.refresh, r.exact].join(" ");
const everyString = [
  c.title, c.sub, c.keyHeading, ...Object.values(c.keyDefs), ...Object.values(c.fields),
  ...Object.values(c.verdicts), c.bracketsLead, c.tutorsSub, ...c.rows.flatMap((r) => [r.title, r.from, r.how, r.refresh, r.exact]),
  ...bracketSubRows().flatMap((s) => [s.label, ...s.lines]),
];

describe("How the app reaches its answers: the rows", () => {
  it("is eight rows with unique `how-` ids, each tagged with at least one known method", () => {
    expect(c.rows).toHaveLength(8);
    expect(new Set(c.rows.map((r) => r.id)).size).toBe(8);
    for (const r of c.rows) {
      expect(r.id.startsWith("how-")).toBe(true);
      expect(r.methods.length).toBeGreaterThan(0);
      for (const m of r.methods) expect(Object.keys(howItWorksCopy.methods)).toContain(m);
    }
  });

  // Handoff rule 2: a figure the code holds is templated from it. Each assertion reads the
  // constant, so a changed constant that the sentence failed to follow fails here.
  it("templates every figure from the constant that holds it", () => {
    const roles = row("how-roles").how;
    for (const [role, n] of [["ramp", FLAT_TARGETS.ramp], ["draw", FLAT_TARGETS.draw], ["removal", FLAT_TARGETS.removal], ["wipes", FLAT_TARGETS.wipes], ["lands", FLAT_TARGETS.land]] as const) {
      expect(roles).toContain(`${n} ${role}`);
    }
    const recs = row("how-recommendations").how;
    expect(recs).toContain(`Pool ${POOL_WEIGHT}, Roles ${ROLES_WEIGHT} and Synergy ${SYNERGY_WEIGHT}`);
    expect(recs).toContain(`full at ${POOL_FULL_AT} legal cards`);
    expect(recs).toContain(`out of ${POOL_WEIGHT + ROLES_WEIGHT}`);
    expect(recs).toContain(`${FLOOR_PCT}% of the list`);
    expect(recs).toContain(`top ${READY_COUNT}`);
    expect(recs).toContain(`shows ${["zero", "one", "two", "three"][READY_SHOWN] ?? READY_SHOWN} of`);
    // `dailyPicks` hands back the whole set when it is no larger than the count, with no rotation.
    expect(recs).toContain(`all of them when ${["zero", "one", "two", "three"][READY_SHOWN] ?? READY_SHOWN} or fewer qualify`);
    expect(roles).toContain(`(${FLAT_TARGETS.land - 1} beside a partner)`);
    expect(row("how-themes").from).toContain(`are ${THEME_ORDER.length} patterns`);
    // The index cadence, from `indexDue`'s own delay: 14 days reads "about two weeks".
    const weeks = ["zero", "one", "two", "three", "four"][Math.round(RELEASE_DELAY_DAYS / 7)];
    for (const id of ["how-roles", "how-themes", "how-recommendations", "how-written"]) {
      expect(row(id).refresh).toContain(`about ${weeks} weeks after each new expansion or Commander set`);
    }
    const written = row("how-written").how;
    expect(written).toContain(`the owner has ${MODEL_OWNER_DAILY_ALLOWANCE} and friends have ${MODEL_FRIEND_DAILY_ALLOWANCE}`);
  });

  // Brief §3: the schedules run on GitHub, which starts them hours late, so no row names a clock
  // time. And no row may promise that a build has already happened (b1, 2026-09-28).
  it("names no clock time and promises no build that may not have run", () => {
    for (const r of c.rows) {
      expect(r.refresh).not.toMatch(/\d{1,2}(:\d{2})?\s?(am|pm)|\d{1,2}:\d{2}/i);
      expect(prose(r)).not.toMatch(/\b(has|have) (been )?(built|refreshed|run)\b|\blast (built|refreshed)\b/i);
    }
  });

  // Each names the input its rule actually reads (round 3 of #1134): `classifyRoles` takes a land
  // from the type line alone, `all_claims` drops a proxied card's claim, and `priceState` calls a
  // row sold out when its `as_of` is not the newest refresh, which two runs in one day can do.
  it("names what each rule really reads", () => {
    expect(row("how-roles").how).toMatch(/land is read from its type line/);
    expect(row("how-availability").from).toMatch(/proxies/);
    expect(row("how-availability").how).toMatch(/proxy claims nothing/);
    expect(row("how-prices").how).toMatch(/earlier refresh/);
    expect(row("how-prices").how).not.toMatch(/earlier day/);
  });

  it("carries no em-dash in anything it renders", () => {
    for (const s of everyString) expect(s).not.toContain("—");
  });

  it("reads the Brackets sub-rows from the decisions sheet's own sentences, plus tutors", () => {
    const d = deckAnalysisCopy.detection;
    const subs = bracketSubRows();
    expect(subs.map((s) => s.label)).toEqual(Object.values(deckAnalysisCopy.findings.labels));
    expect(subs[0].lines).toEqual([d.gameChangers.from]);
    expect(subs[1].lines).toEqual([d.landDenial.from, d.landDenial.misses].filter(Boolean));
    expect(subs[3].lines).toEqual([d.combos.from, d.combos.misses]);
    expect(subs[4].lines).toEqual([c.tutorsSub]);
  });
});

describe("introWithAppendix", () => {
  it("names the appendix at the end of the intro's first sentence", async () => {
    const { aboutCopy } = await import("./about");
    const { introWithAppendix } = await import("./how-it-works");
    expect(introWithAppendix(aboutCopy.pageIntro)).toBe(
      "Four chapters, in the order you would use them, then how the app reaches its answers. " +
        "Each entry shows the thing it describes and links to where it lives.",
    );
  });
});
