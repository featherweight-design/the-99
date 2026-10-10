import { beforeEach, describe, expect, it, vi } from "vitest";

const readLabels = vi.fn();
vi.mock("../labels/read", () => ({ readLabels: (ids: string[]) => readLabels(ids) }));

import { loadStatsLabels } from "./stats-labels";

describe("loadStatsLabels", () => {
  beforeEach(() => {
    readLabels.mockReset();
  });

  it("reads labels for nonland cards only, in one call", async () => {
    readLabels.mockResolvedValue(new Map());
    await loadStatsLabels([
      { oracleId: "rock", typeLine: "Artifact" },
      { oracleId: "forest", typeLine: "Basic Land — Forest" },
      { oracleId: "lord", typeLine: "Creature — Elf" },
    ]);
    expect(readLabels).toHaveBeenCalledTimes(1);
    expect(readLabels).toHaveBeenCalledWith(["rock", "lord"]);
  });

  it("returns null when the read fails", async () => {
    readLabels.mockRejectedValue(new Error("db down"));
    expect(await loadStatsLabels([{ oracleId: "x", typeLine: "Artifact" }])).toBeNull();
  });
});
