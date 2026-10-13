import { beforeEach, describe, expect, it, vi } from "vitest";

const names = vi.hoisted(() => ({ map: new Map<string, string>(), asked: [] as string[][], fail: false }));
const legal = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock("../decks/notes-store", () => ({
  currentLegalNames: async (ids: string[]) => { if (names.fail) throw new Error("db down"); names.asked.push([...ids]); return new Map([...names.map].filter(([id]) => ids.includes(id) && legal.ids.has(id))); },
  currentNames: async (ids: string[]) => { names.asked.push([...ids]); return new Map([...names.map].filter(([id]) => ids.includes(id))); } }));

const { boxRawMax, resolveBoxText, resolveTaggedText } = await import("./tagged-text");

const SOL = "0000aaaa-0000-4000-8000-000000000001";
const DS = "0000aaaa-0000-4000-8000-000000000002";
beforeEach(() => { names.fail = false; names.map = new Map([[SOL, "Sol Ring"], [DS, "Doubling Season"]]); names.asked = []; legal.ids = new Set([SOL]); });

describe("resolveTaggedText", () => {
  it("replaces each tag with the catalog's name, not the one the client sent, and lists the cards once", async () => {
    const out = await resolveTaggedText(`a deck with [[${SOL}|Sol Rong]] and [[${DS}|ds]] and [[${SOL}|Sol Ring]] again`);
    expect(out.text).toBe("a deck with Sol Ring and Doubling Season and Sol Ring again");
    expect(out.tagged).toEqual([{ oracleId: SOL, name: "Sol Ring" }, { oracleId: DS, name: "Doubling Season" }]);
    expect(out.body).toBe(`a deck with [[${SOL}|Sol Ring]] and [[${DS}|Doubling Season]] and [[${SOL}|Sol Ring]] again`);
    expect(names.asked).toEqual([[SOL, DS]]);
  });

  it("degrades an id the catalog does not hold to its words, so a forged tag names no card", async () => {
    const ghost = "0000aaaa-0000-4000-8000-0000000000ff";
    const out = await resolveTaggedText(`[[${ghost}|Black Lotus]] please`);
    expect(out.text).toBe("Black Lotus please");
    expect(out.body).toBe("Black Lotus please");
    expect(out.tagged).toEqual([]);
  });

  it("leaves a name typed by hand as plain words and asks the catalog nothing", async () => {
    const out = await resolveTaggedText("[[Sol Ring]] by hand");
    expect(out).toEqual({ text: "[[Sol Ring]] by hand", body: "[[Sol Ring]] by hand", tagged: [] });
    expect(names.asked).toEqual([[]]);
  });

  it("with commanderLegalOnly, a card banned in Commander degrades to plain words and is not tagged", async () => {
    const out = await resolveTaggedText(`[[${SOL}|Sol Ring]] and [[${DS}|Doubling Season]]`, { commanderLegalOnly: true });
    expect(out.tagged).toEqual([{ oracleId: SOL, name: "Sol Ring" }]);
    expect(out.text).toBe("Sol Ring and Doubling Season");
    expect(out.body).toBe(`[[${SOL}|Sol Ring]] and Doubling Season`);
  });
});

describe("resolveBoxText", () => {
  const box = { cap: 20, maxTags: 2 };
  it("resolves a tag to the catalog's name and trims", async () => {
    expect(await resolveBoxText(`  more of [[${SOL}|Sol Rong]]  `, box)).toEqual({ ok: true, text: "more of Sol Ring" });
  });
  it("answers a blank box as an empty string", async () => {
    expect(await resolveBoxText("   ", box)).toEqual({ ok: true, text: "" });
  });
  it("refuses a body past the raw bound before it reads anything", async () => {
    expect(await resolveBoxText(`a${" ".repeat(boxRawMax(20, 2))}`, box)).toEqual({ ok: false });
    expect(names.asked).toEqual([]);
  });
  it("refuses more tags than the box allows, and a drawn length over the cap", async () => {
    expect(await resolveBoxText(`[[${SOL}|a]][[${SOL}|a]][[${SOL}|a]]`, box)).toEqual({ ok: false });
    expect(await resolveBoxText("x".repeat(21), box)).toEqual({ ok: false });
    expect(await resolveBoxText("x".repeat(20), box)).toEqual({ ok: true, text: "x".repeat(20) });
  });
  it("checks the cap again on the resolved name, which can be longer than the one sent", async () => {
    // "Doubling Season" is 15 characters: with 10 letters it is 25 against a cap of 20, where the client sent 11.
    legal.ids.add(DS);
    expect(await resolveBoxText(`${"x".repeat(10)}[[${DS}|a]]`, { cap: 20, maxTags: 2 })).toEqual({ ok: false });
  });
  it("answers a failed catalog read as a refusal, never a throw", async () => {
    names.fail = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect(await resolveBoxText(`a [[${SOL}|Sol Ring]]`, box)).toEqual({ ok: false });
    } finally {
      log.mockRestore();
    }
  });

  it("turns a card banned in Commander into the words it carried", async () => {
    expect(await resolveBoxText(`[[${DS}|Banned Thing]]`, box)).toEqual({ ok: true, text: "Banned Thing" });
  });
});
