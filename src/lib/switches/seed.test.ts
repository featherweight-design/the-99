// The flag-default seed: what it writes per switch, that it skips the model-call switch, and that it never overwrites.
import { describe, expect, it } from "vitest";
import { SWITCH_NAMES } from "./registry";
import { SEED_SQL, SEED_UPDATED_BY, SEEDED, seedFlagDefaults, seedLogLines, seedValue } from "./seed";

const e = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("seedValue", () => {
  it("is on for the exact string true, nothing for the kill value off, and off for anything else set or unset", () => {
    expect(seedValue("PUSH_ENABLED", "true")).toBe("on");
    expect(seedValue("PUSH_ENABLED", "off")).toBeNull();
    for (const v of [undefined, "false", "1", "TRUE"]) expect(seedValue("PUSH_ENABLED", v)).toBe("off");
  });

  it("seeds an unset variable as the switch's compiled fallback: on for the rate limit and the list cache", () => {
    expect(seedValue("RATE_LIMIT_ENABLED", undefined)).toBe("on");
    expect(seedValue("LIST_CACHE_ENABLED", undefined)).toBe("on");
    expect(seedValue("RATE_LIMIT_ENABLED", "false")).toBe("off");
  });
});

describe("SEEDED", () => {
  it("is every switch but the model-call switch, which must stay on with no row and stoppable by its env", () => {
    expect(SEEDED).not.toContain("MODEL_CALLS_ENABLED");
    expect([...SEEDED, "MODEL_CALLS_ENABLED"].sort()).toEqual([...SWITCH_NAMES].sort());
  });
});

describe("seedFlagDefaults", () => {
  const env = e({ PUSH_ENABLED: "true", RATE_LIMIT_ENABLED: "true", FEEDBACK_ENABLED: "off", MODEL_CALLS_ENABLED: "false" });

  it("offers each seeded switch the env's value in its own statement, skipping a killed one, and reports what the database did", async () => {
    const calls: unknown[][] = [];
    const lines = await seedFlagDefaults(
      async (_text, params) => {
        calls.push(params);
        return params[0] === "PUSH_ENABLED" ? [{ switch: "PUSH_ENABLED" }] : [];
      },
      env,
      "2026-11-02",
    );
    const offered = calls.map((p) => p[0]);
    expect(offered).toEqual(SEEDED.filter((n) => n !== "FEEDBACK_ENABLED"));
    expect(offered).not.toContain("MODEL_CALLS_ENABLED");
    const at = (n: string) => calls.find((p) => p[0] === n)!;
    expect(at("PUSH_ENABLED")).toEqual(["PUSH_ENABLED", "on", "seeded from env 2026-11-02", SEED_UPDATED_BY]);
    expect(at("PAYMENTS_ENABLED")[1]).toBe("off");
    const line = (n: string) => lines.find((l) => l.name === n);
    expect(line("PUSH_ENABLED")?.outcome).toBe("inserted");
    expect(line("RATE_LIMIT_ENABLED")?.outcome).toBe("kept");
    expect(line("FEEDBACK_ENABLED")).toEqual({ name: "FEEDBACK_ENABLED", value: null, outcome: "killed" });
    expect(seedLogLines(lines)).toContain("flag seed: PUSH_ENABLED inserted on");
  });

  it("fails one switch alone when the database refuses its row", async () => {
    const lines = await seedFlagDefaults(async (_t, params) => {
      if (params[0] === "PUSH_ENABLED") throw new Error("check violation");
      return [];
    }, env, "2026-11-02");
    expect(lines.find((l) => l.name === "PUSH_ENABLED")?.outcome).toBe("failed");
    expect(lines.filter((l) => l.outcome === "kept").length).toBe(SEEDED.length - 2);
  });

  it("sends nothing past the deadline, fails the statement it was waiting on, and still gives every switch its one line", async () => {
    let clock = 0;
    const sent: unknown[] = [];
    const lines = await seedFlagDefaults(async (_t, params) => {
      sent.push(params[0]);
      clock = 100;
      return params[0] === "ANNOUNCEMENTS_ENABLED" ? new Promise<never>(() => {}) : [];
    }, env, "2026-11-02", 50, () => clock);
    expect(sent).toEqual([SEEDED[0]]);
    expect(lines).toHaveLength(SEEDED.length);
    expect(lines.filter((l) => l.outcome === "failed").length).toBe(SEEDED.length - 1);
    expect(seedLogLines(lines).filter((l) => l.startsWith(`flag seed: ${SEEDED[0]} `))).toHaveLength(1);
  });

  it("writes an app-wide row only and never overwrites one: conflict on the target key does nothing", () => {
    expect(SEED_SQL).toMatch(/values \(\$1, 'app', null, null, \$2, \$3, \$4\)/);
    expect(SEED_SQL).toMatch(/on conflict on constraint flag_overrides_target_key do nothing/);
    expect(SEED_SQL).not.toMatch(/do update/);
  });
});
