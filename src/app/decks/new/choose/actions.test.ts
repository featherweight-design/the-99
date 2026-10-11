// The deeper read's actions, at their wire boundary. The probe calls `runDeeperRead` directly,
// since an action needs a request and a signed-in reader, so what only this file can catch is
// the action's own refusals: input a forged call can send, refused before anything is reserved.

import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ run: vi.fn(), status: vi.fn(), begin: vi.fn(), after: vi.fn(), redirect: vi.fn((to: string) => { throw new Error(`REDIRECT ${to}`); }) }));
vi.mock("../../../../lib/intake/the-read-run", () => ({ beginTheRead: stub.begin }));
vi.mock("next/server", () => ({ after: stub.after }));
vi.mock("next/navigation", () => ({ redirect: stub.redirect }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/intake/deeper-read", () => ({ runDeeperRead: stub.run, deeperStatus: stub.status }));
const vocab = vi.hoisted(() => ({ themes: vi.fn(), printings: vi.fn() }));
vi.mock("../../../../lib/intake/search", () => ({ loadIntakeThemes: vocab.themes }));
vi.mock("../../../../lib/sets/printed-in-read", () => ({ loadCommanderPrintings: vocab.printings }));
const flag = vi.hoisted(() => ({ on: true }));
vi.mock("../../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => flag.on }));

import { lookDeeper, lookStatus, submitChoose } from "./actions";

const ID = "0000aaaa-0000-4000-8000-000000000001";
const ok = { readId: ID, words: "big lizards", budgetDollars: null, bracket: null, themes: [], card: null };

beforeEach(() => {
  flag.on = true;
  stub.run.mockReset().mockResolvedValue({ kind: "read", chips: [], notUsed: [], notUnderstood: [] });
  stub.status.mockReset().mockResolvedValue({ kind: "running" });
  stub.begin.mockReset();
  stub.after.mockReset();
  vocab.themes.mockReset().mockResolvedValue([{ slug: "landfall", label: "Landfall", commanders: 300 }]);
  vocab.printings.mockReset().mockResolvedValue({ sets: [{ code: "mh3", name: "Modern Horizons 3" }] });
});

describe("submitChoose (rework plan PR 3, F8)", () => {
  const landed = async (query: string) => {
    try { await submitChoose(query); } catch (e) { return String((e as Error).message).replace("REDIRECT ", ""); }
    return null;
  };

  it("refuses the read for a theme or set the pickers would not offer, or when the vocabulary cannot be read", async () => {
    stub.begin.mockResolvedValue({ kind: "started", readId: ID, finish: vi.fn() });
    for (const q of ["?w=x&t=landfall,ignore-previous-instructions&tj=any", "?w=x&p=mh3,zzz"]) {
      const to = await landed(q);
      expect(to).not.toContain("r=");
    }
    vocab.themes.mockRejectedValueOnce(new Error("catalog down"));
    expect(await landed("?w=x&t=landfall")).not.toContain("r=");
    expect(stub.begin).not.toHaveBeenCalled();
    expect(await landed("?w=x&t=landfall&p=mh3")).toContain(`r=${ID}`);
  });

  it("lands an empty box on the free results, reserving nothing", async () => {
    const to = await landed("?c=b&w=%20%20");
    expect(stub.begin).not.toHaveBeenCalled();
    expect(to).toContain("v=results");
    expect(to).not.toContain("r=");
  });

  it("begins the read, schedules its calls after the response, and lands with r naming it", async () => {
    const finish = vi.fn();
    stub.begin.mockResolvedValue({ kind: "started", readId: ID, finish });
    const to = await landed("?w=scary+horrors&c=b&m=exact");
    expect(stub.begin.mock.calls[0][1]).toMatchObject({ words: "scary horrors", filters: { colors: ["B"], match: "exactly" } });
    expect(stub.after).toHaveBeenCalledWith(finish);
    expect(to).toContain(`r=${ID}`);
    expect(to).toContain("w=scary+horrors");
  });

  it("lands a repeat on its stored read, and a refusal (no credit, paused, in flight) on the free results", async () => {
    stub.begin.mockResolvedValue({ kind: "read", readId: "old", result: { picks: [], pool: 1, weighed: 0 }, repeat: true });
    expect(await landed("?w=scary")).toContain("r=old");
    // Marked as a repeat, so its line says no credit was used (7m).
    expect(await landed("?w=scary")).toContain("rr=1");
    for (const kind of ["allowance", "paused", "ownerShare", "in_flight"]) {
      stub.begin.mockResolvedValue({ kind });
      const to = await landed("?w=scary");
      expect(to).not.toContain("r=");
      expect(to).not.toContain("rr=");
      expect(to).toContain("w=scary");
      // Only a read already running names its cause (rb=1); the standing line says the rest.
      expect(to?.includes("rb=1")).toBe(kind === "in_flight");
    }
    expect(stub.after).not.toHaveBeenCalled();
  });

  it("refuses words over the cap rather than trimming them", async () => {
    expect(await submitChoose(`?w=${"x".repeat(801)}`)).toEqual({ kind: "refused" });
    // Leading space does not buy room, and an emoji counts as the box counts it (two units).
    expect(await submitChoose(`?w=${encodeURIComponent(` ${"x".repeat(800)}`)}`)).toEqual({ kind: "refused" });
    expect(await submitChoose(`?w=${encodeURIComponent("😀".repeat(401))}`)).toEqual({ kind: "refused" });
    expect(stub.begin).not.toHaveBeenCalled();
  });

  it("never carries a card from the address into the read (F1)", async () => {
    stub.begin.mockResolvedValue({ kind: "allowance" });
    const to = await landed(`?w=scary&a=${ID}`);
    expect(stub.begin.mock.calls[0][1].filters.card).toBeNull();
    expect(to).not.toContain("a=");
  });

  it("does nothing with the feature off", async () => {
    flag.on = false;
    await expect(submitChoose("?w=scary")).rejects.toThrow("not found");
    expect(stub.begin).not.toHaveBeenCalled();
  });
});

describe("lookStatus", () => {
  const ask = { words: "big lizards", budgetDollars: null, bracket: null };

  it("asks where the checked ask stands", async () => {
    expect(await lookStatus({ ...ask, words: "  big lizards " })).toEqual({ kind: "running" });
    expect(stub.status).toHaveBeenCalledWith("user_1", { words: "big lizards", controls: { budgetDollars: null, bracket: null } });
  });

  it("refuses a forged argument, and is not found with the feature off", async () => {
    for (const input of [null, { ...ask, words: "" }, { ...ask, budgetDollars: 0 }, { ...ask, bracket: 6 }]) {
      expect(await lookStatus(input as never)).toEqual({ kind: "refused" });
    }
    expect(stub.status).not.toHaveBeenCalled();
    flag.on = false;
    await expect(lookStatus(ask)).rejects.toThrow("not found");
  });
});

describe("lookDeeper", () => {
  it("is not found with the feature off, and reserves nothing", async () => {
    flag.on = false;
    await expect(lookDeeper(ok)).rejects.toThrow("not found");
    expect(stub.run).not.toHaveBeenCalled();
  });

  it("refuses a forged argument before any read is reserved", async () => {
    const forged = [
      null, undefined, "words", 42,
      { ...ok, readId: "not-a-uuid" }, { ...ok, readId: 7 },
      { ...ok, words: "" }, { ...ok, words: "   " }, { ...ok, words: 5 }, { ...ok, words: "x".repeat(801) },
      { ...ok, budgetDollars: 0 }, { ...ok, budgetDollars: 1.5 }, { ...ok, budgetDollars: 100_001 },
      { ...ok, bracket: 0 }, { ...ok, bracket: 6 }, { ...ok, bracket: 2.5 },
      { ...ok, themes: "dinosaurs" }, { ...ok, themes: [1] }, { ...ok, themes: null },
      { ...ok, themes: ["Dinosaurs"] }, { ...ok, themes: ["-bad"] },
      { ...ok, card: "not-a-uuid" }, { ...ok, card: 7 },
    ];
    for (const input of forged) {
      expect(await lookDeeper(input as never)).toEqual({ kind: "refused" });
    }
    expect(stub.run).not.toHaveBeenCalled();
  });

  it("accepts more than MAX_THEMES existing themes (pre-open review): resolveWords never caps what a player's params accumulate", async () => {
    const themes = Array.from({ length: 12 }, (_, i) => `theme-${i}`);
    await lookDeeper({ ...ok, themes });
    expect(stub.run).toHaveBeenCalledWith("user_1", {
      readId: ID, words: "big lizards", controls: { budgetDollars: null, bracket: null },
      existing: { themes, card: null },
    });
  });

  it("hands a sound press to the read, trimmed, with its controls and existing answers", async () => {
    const card = "0000aaaa-0000-4000-8000-000000000002";
    await lookDeeper({
      ...ok, words: "  big lizards  ", budgetDollars: 100_000, bracket: 5, themes: ["dinosaurs"], card,
    });
    expect(stub.run).toHaveBeenCalledWith("user_1", {
      readId: ID, words: "big lizards", controls: { budgetDollars: 100_000, bracket: 5 },
      existing: { themes: ["dinosaurs"], card },
    });
  });
});
