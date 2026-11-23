import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as { spent: string[]; installedAt: Date | null; preferred?: string | null }[] }));
vi.mock("../../db", () => {
  const chain = { from: () => chain, where: () => chain, limit: async () => rows.value };
  return { db: { select: () => chain } };
});

import { readShellPrefs } from "./prefs";

describe("readShellPrefs", () => {
  it("reads no row as nothing spent and never installed", async () => {
    rows.value = [];
    expect(await readShellPrefs("user_1")).toEqual({ spentMoments: [], installed: false, preferredStore: null });
  });

  it("reads a stamp as installed, and a null one as not", async () => {
    rows.value = [{ spent: ["m1"], installedAt: new Date("2026-11-15T00:00:00Z"), preferred: "tcgplayer" }];
    expect(await readShellPrefs("user_1")).toEqual({ spentMoments: ["m1"], installed: true, preferredStore: "tcgplayer" });
    rows.value = [{ spent: [], installedAt: null }];
    expect((await readShellPrefs("user_1")).installed).toBe(false);
  });
});
