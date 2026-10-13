// The choose actions, at their wire boundary: what only a test with the action's own seams can
// catch is its refusals, before anything is reserved.

import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: vi.fn(async () => process.env) }));

const stub = vi.hoisted(() => ({ begin: vi.fn(), after: vi.fn(), redirect: vi.fn((to: string) => { throw new Error(`REDIRECT ${to}`); }) }));
vi.mock("../../../../lib/intake/the-read-run", () => ({ beginTheRead: stub.begin }));
vi.mock("next/server", () => ({ after: stub.after }));
vi.mock("next/navigation", () => ({ redirect: stub.redirect }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
const vocab = vi.hoisted(() => ({ themes: vi.fn(), printings: vi.fn() }));
vi.mock("../../../../lib/intake/search", () => ({ loadIntakeThemes: vocab.themes }));
vi.mock("../../../../lib/sets/printed-in-read", () => ({ loadCommanderPrintings: vocab.printings }));
const flag = vi.hoisted(() => ({ on: true }));
vi.mock("../../../../lib/intake/flag", () => ({ helpMeChooseEnabled: () => flag.on }));

const tags = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("../../../../lib/cards/tagged-text", async (original) => {
  const real = await original<typeof import("../../../../lib/cards/tagged-text")>();
  tags.resolve.mockImplementation(real.resolveTaggedText);
  return { ...real, resolveTaggedText: tags.resolve };
});

import { submitChoose } from "./actions";

const ID = "0000aaaa-0000-4000-8000-000000000001";

beforeEach(() => {
  flag.on = true;
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

  it("reads a tagged card by its name, hands the read the card as tagged, and keeps the stored tag in the address", async () => {
    const finish = vi.fn();
    stub.begin.mockResolvedValue({ kind: "started", readId: ID, finish });
    tags.resolve.mockResolvedValueOnce({
      text: "a deck with Rhystic Study", body: "a deck with [[c0ffee00-0000-4000-8000-000000000009|Rhystic Study]]",
      tagged: [{ oracleId: "c0ffee00-0000-4000-8000-000000000009", name: "Rhystic Study" }],
    });
    const to = await landed(`?w=${encodeURIComponent("a deck with [[c0ffee00-0000-4000-8000-000000000009|Rhystic Study]]")}`);
    expect(stub.begin.mock.calls[0][1]).toMatchObject({ words: "a deck with Rhystic Study", tagged: [{ name: "Rhystic Study" }] });
    // A tag here is a requirement, so a card banned in Commander must not resolve to one.
    expect(tags.resolve).toHaveBeenCalledWith(expect.any(String), { commanderLegalOnly: true });
    expect(decodeURIComponent(String(to).replace(/\+/g, " "))).toContain("[[c0ffee00-0000-4000-8000-000000000009|Rhystic Study]]");
  });

  it("takes a tagged body whose raw length is over the cap but whose drawn text is not", async () => {
    stub.begin.mockResolvedValue({ kind: "started", readId: ID, finish: vi.fn() });
    const tag = (n: number) => `[[c0ffee00-0000-4000-8000-00000000000${n}|Rhystic Study]]`;
    // 740 + 3 x (space + 13-letter name) = 782 drawn; the three ids take it to 905 raw, over 800.
    const w = `${"x".repeat(740)} ${tag(1)} ${tag(2)} ${tag(3)}`;
    expect(w.length).toBeGreaterThan(800);
    tags.resolve.mockResolvedValueOnce({ text: "a deck", body: w, tagged: [] });
    await landed(`?w=${encodeURIComponent(w)}`);
    expect(stub.begin).toHaveBeenCalled();
  });

  it("refuses words that grow past the cap once the catalog's name replaces the tag's", async () => {
    // 799 drawn characters pass the pre-check; the catalog's own name then makes it 812.
    tags.resolve.mockResolvedValueOnce({ text: `${"x".repeat(799)} Rhystic Study`, body: "x", tagged: [] });
    expect(await submitChoose(`?w=${encodeURIComponent(`${"x".repeat(796)} [[c0ffee00-0000-4000-8000-000000000001|A]]`)}`)).toEqual({ kind: "refused" });
    expect(stub.begin).not.toHaveBeenCalled();
  });

  it("refuses a fourth tag, and drawn text over the cap even when the body is short", async () => {
    const tag = (n: number) => `[[c0ffee00-0000-4000-8000-00000000000${n}|A]]`;
    expect(await submitChoose(`?w=${encodeURIComponent(`${tag(1)} ${tag(2)} ${tag(3)} ${tag(4)}`)}`)).toEqual({ kind: "refused" });
    expect(await submitChoose(`?w=${encodeURIComponent(`${"x".repeat(790)} [[c0ffee00-0000-4000-8000-000000000001|Rhystic Study]]`)}`)).toEqual({ kind: "refused" });
    expect(stub.begin).not.toHaveBeenCalled();
  });

  it("marks a read started from the form, and leaves a retry from the results unmarked (entry path)", async () => {
    stub.begin.mockResolvedValue({ kind: "started", readId: ID, finish: vi.fn() });
    expect(await landed("?w=scary")).toContain("rf=1");
    const retried = async (query: string, from?: string) => {
      try { await submitChoose(query, from as "results"); } catch (e) { return String((e as Error).message).replace("REDIRECT ", ""); }
      return null;
    };
    expect(await retried("?w=scary", "results")).not.toContain("rf=");
    // Anything else a caller sends is the form.
    expect(await retried("?w=scary", "bogus")).toContain("rf=1");
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
    // Leading space does not buy room, and an emoji counts as the prompt boundary counts it (one character).
    expect(await submitChoose(`?w=${encodeURIComponent(` ${"x".repeat(800)}`)}`)).toEqual({ kind: "refused" });
    expect(await submitChoose(`?w=${encodeURIComponent("😀".repeat(801))}`)).toEqual({ kind: "refused" });
    expect(stub.begin).not.toHaveBeenCalled();
    // 800 emoji are 1,600 units and within the cap: the raw bound allows two units a character.
    stub.begin.mockResolvedValue({ kind: "started", readId: ID, finish: vi.fn() });
    await landed(`?w=${encodeURIComponent("😀".repeat(800))}`);
    expect(stub.begin).toHaveBeenCalled();
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
