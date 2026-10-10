import { beforeEach, describe, expect, it, vi } from "vitest";

const readLabels = vi.fn();
vi.mock("../labels/read", () => ({ readLabels: (ids: string[]) => readLabels(ids) }));

import { loadJobRows } from "./job-rows";

const job = (space: string, kind: string) => ({ space, kind });

describe("loadJobRows", () => {
  beforeEach(() => {
    readLabels.mockReset();
  });

  it("reads labels for nonland cards only and converts each to its row keys", async () => {
    readLabels.mockResolvedValue(new Map([["rock", [job("role", "ramp")]], ["lord", [job("theme", "pump")]]]));
    const out = await loadJobRows([
      { oracleId: "rock", typeLine: "Artifact" },
      { oracleId: "lord", typeLine: "Creature — Elf" },
      { oracleId: "forest", typeLine: "Basic Land — Forest" },
    ]);
    expect(readLabels).toHaveBeenCalledWith(["rock", "lord"]);
    expect(out).toEqual({ rock: ["ramp"], lord: [] });
  });

  it("returns null, not an empty record, when the read fails", async () => {
    readLabels.mockRejectedValue(new Error("db down"));
    expect(await loadJobRows([{ oracleId: "rock", typeLine: "Artifact" }])).toBeNull();
  });
});
