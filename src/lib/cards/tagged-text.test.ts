import { beforeEach, describe, expect, it, vi } from "vitest";

const names = vi.hoisted(() => ({ map: new Map<string, string>(), asked: [] as string[][] }));
vi.mock("../decks/notes-store", () => ({ currentNames: async (ids: string[]) => { names.asked.push([...ids]); return new Map([...names.map].filter(([id]) => ids.includes(id))); } }));

const { resolveTaggedText } = await import("./tagged-text");

const SOL = "0000aaaa-0000-4000-8000-000000000001";
const DS = "0000aaaa-0000-4000-8000-000000000002";
beforeEach(() => { names.map = new Map([[SOL, "Sol Ring"], [DS, "Doubling Season"]]); names.asked = []; });

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
});
