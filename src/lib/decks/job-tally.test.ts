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
  const cards = ["rock", "both", "wrath", "guard", "lord", "etb", "new"].map((oracleId) => ({ oracleId, name: oracleId.toUpperCase(), copies: 1, role: "other" }));
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

  it("states overlap and none; a card with no label and no classifier role is in no row", () => {
    expect(t.overlap).toBe(1);
    expect(t.none).toBe(2); // lord and etb are labeled and do none; "new" has no label and is not said to do none
    expect(t.cast).toBe(7);
  });

  it("reads a card with no label from its classifier role", () => {
    const f = jobTally([{ oracleId: "new", name: "NEW", copies: 2, role: "draw" }], byCard);
    expect(f.rows.find((r) => r.key === "draw")).toMatchObject({ copies: 2, names: ["NEW"] });
    expect(f.none).toBe(0);
  });

  it("gives a card with no label and no classifier role to no row, and ignores a role the classifier cannot give a row", () => {
    const u = jobTally([{ oracleId: "a", name: "A", copies: 1, role: "other" }, { oracleId: "b", name: "B", copies: 1 }, { oracleId: "c", name: "C", copies: 1, role: "land" }], byCard);
    expect(u.rows.every((r) => r.copies === 0)).toBe(true);
    expect(u.none).toBe(0);
  });

  it("weights by copies", () => {
    const w = jobTally([{ oracleId: "rock", name: "ROCK", copies: 3 }], byCard);
    expect(w.rows[0].copies).toBe(3);
    expect(w.cast).toBe(3);
  });
});
