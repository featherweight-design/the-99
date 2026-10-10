import { describe, expect, it } from "vitest";
import type { Job } from "../labels/types";
import { jobRowsOf, jobTally } from "./job-tally";

const job = (space: "role" | "theme", kind: string) => ({ space, kind }) as unknown as Job;
const labels = new Map<string, Job[]>([
  ["rock", [job("role", "ramp")]],
  ["both", [job("role", "ramp"), job("role", "draw")]],
  ["wrath", [job("role", "wipes")]],
  ["guard", [job("theme", "protection")]],
  ["lord", [job("theme", "pump")]],
  // `draw` exists in both spaces; only the role counts as the Card draw row.
  ["etb", [job("theme", "draw")]],
]);

const byCard = Object.fromEntries([...labels].map(([id, jobs]) => [id, jobRowsOf(jobs)]));

describe("jobTally", () => {
  const cards = ["rock", "both", "wrath", "guard", "lord", "etb", "new"].map((oracleId) => ({ oracleId, name: oracleId.toUpperCase(), copies: 1 }));
  const t = jobTally(cards, byCard);
  const row = (k: string) => t.rows.find((r) => r.key === k)!;

  it("counts one row per job, keyed by space and kind", () => {
    expect(row("ramp").names).toEqual(["ROCK", "BOTH"]);
    expect(row("draw").names).toEqual(["BOTH"]);
    expect(row("wipes").copies).toBe(1);
    expect(row("protection").names).toEqual(["GUARD"]);
    expect(row("removal").copies).toBe(0);
    expect(row("finisher").copies).toBe(0);
  });

  it("states overlap, none and unlabeled separately", () => {
    expect(t.overlap).toBe(1);
    expect(t.none).toBe(2);
    expect(t.unlabeled).toBe(1);
    expect(t.unlabeledNames).toEqual(["NEW"]);
    expect(t.labeled).toBe(6);
  });

  it("weights by copies", () => {
    const w = jobTally([{ oracleId: "rock", name: "ROCK", copies: 3 }], byCard);
    expect(w.rows[0].copies).toBe(3);
    expect(w.labeled).toBe(3);
  });
});
