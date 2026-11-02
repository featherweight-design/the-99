// The flag-default seed: what it writes per switch, that it skips the model-call switch, and that it never overwrites.
import { describe, expect, it } from "vitest";
import { SWITCH_NAMES } from "./registry";
import { SEED_SQL, SEED_UPDATED_BY, SEEDED, seedFlagDefaults, seedLogLines, seedValue } from "./seed";

const e = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("seedValue", () => {
  it("is on for the exact string true and off for anything else, the kill value included", () => {
    expect(seedValue("true")).toBe("on");
    for (const v of [undefined, "false", "off", "1", "TRUE"]) expect(seedValue(v)).toBe("off");
  });
});

describe("SEEDED", () => {
  it("is every switch but the model-call switch, which must stay on with no row and stoppable by its env", () => {
    expect(SEEDED).not.toContain("MODEL_CALLS_ENABLED");
    expect([...SEEDED, "MODEL_CALLS_ENABLED"].sort()).toEqual([...SWITCH_NAMES].sort());
  });
});

describe("seedFlagDefaults", () => {
  it("offers every seeded switch the env's value, and reports inserted only for the rows the database returned", async () => {
    const calls: { text: string; params: unknown[] }[] = [];
    const lines = await seedFlagDefaults(
      async (text, params) => {
        calls.push({ text, params });
        return [{ switch: "PUSH_ENABLED" }];
      },
      e({ PUSH_ENABLED: "true", RATE_LIMIT_ENABLED: "true", FEEDBACK_ENABLED: "off", MODEL_CALLS_ENABLED: "false" }),
      "2026-11-02",
    );
    expect(calls).toHaveLength(1);
    const [names, values, note, by] = calls[0].params as [string[], string[], string, string];
    expect(names).toEqual(SEEDED);
    expect(names).not.toContain("MODEL_CALLS_ENABLED");
    const at = (n: string) => values[names.indexOf(n)];
    expect([at("PUSH_ENABLED"), at("RATE_LIMIT_ENABLED"), at("FEEDBACK_ENABLED"), at("PAYMENTS_ENABLED")]).toEqual(["on", "on", "off", "off"]);
    expect(note).toBe("seeded from env 2026-11-02");
    expect(by).toBe(SEED_UPDATED_BY);
    expect(lines.find((l) => l.name === "PUSH_ENABLED")).toEqual({ name: "PUSH_ENABLED", value: "on", inserted: true });
    expect(lines.find((l) => l.name === "RATE_LIMIT_ENABLED")?.inserted).toBe(false);
    expect(seedLogLines(lines)).toContain("flag seed: PUSH_ENABLED inserted on");
  });

  it("writes app-wide rows only and never overwrites one: conflict on the target key does nothing", () => {
    expect(SEED_SQL).toMatch(/select s\.name, 'app', null, null, s\.value/);
    expect(SEED_SQL).toMatch(/on conflict on constraint flag_overrides_target_key do nothing/);
    expect(SEED_SQL).not.toMatch(/do update/);
  });
});
