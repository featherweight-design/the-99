import { describe, expect, it } from "vitest";

import { buildFitsReadPrompt, validFitsRead } from "./fits-read";
import { id, inputs } from "./fits-read.fixture";
import { fitsReadLive, fitsStubMode, stubFitsReply, type FitsStubMode } from "./fits-read-stub";

function settle(mode: FitsStubMode) {
  const inp = inputs();
  const prompt = buildFitsReadPrompt(inp, "per-press");
  const reply = stubFitsReply(inp, prompt, mode);
  return reply.ok ? validFitsRead({ reply: reply.value, prompt, inputs: inp }) : reply;
}

describe("the read's stub", () => {
  it("calls the real model only in production or on FITS_READ_LIVE=1", () => {
    expect(fitsReadLive({ NODE_ENV: "development" })).toBe(false);
    expect(fitsReadLive({ NODE_ENV: "production" })).toBe(true);
    expect(fitsReadLive({ NODE_ENV: "test", FITS_READ_LIVE: "1" })).toBe(true);
    expect(fitsStubMode({ FITS_READ_STUB: "nonsense" })).toBe("picks");
  });

  it("cuts neither a basic land nor a Key card nor a locked card, though each comes first in the list", () => {
    const base = inputs();
    const g = base.decks[0];
    const forest = { oracleId: id(16), name: "Forest", typeLine: "Basic Land — Forest", kinds: [] };
    // Goblins' list reordered: a basic, its Key card (13), its locked card (14), then Skirk Prospector.
    const list = [forest, ...g.list.filter((c) => c.oracleId === id(13) || c.oracleId === id(14)), ...g.list.filter((c) => c.oracleId === id(12))];
    const inp = { ...base, decks: [{ ...g, list }, ...base.decks.slice(1)] };
    const prompt = buildFitsReadPrompt(inp, "per-press");
    const reply = stubFitsReply(inp, prompt, "picks");
    if (!reply.ok) throw new Error("expected a reply");
    expect(prompt.cardOf.get(reply.value.picks[0].cut!.replace(/[{}]/g, ""))).toBe(id(12));
  });

  it("returns picks the validator keeps, each with a cut", () => {
    const v = settle("picks");
    expect(v).toMatchObject({ outcome: "picks", drops: {} });
    if (!("picks" in v)) throw new Error("expected a validated read");
    expect(v.picks.map((p) => p.deckId)).toEqual(["deck-goblins", "deck-kratos"]);
    expect(v.picks.every((p) => p.cut !== null)).toBe(true);
  });

  it("draws every other outcome the view has: no fit, every deck failing validation, busy, timeout", () => {
    expect(settle("noFit")).toMatchObject({ outcome: "noFit" });
    expect(settle("failed")).toMatchObject({ outcome: "failed" });
    expect(settle("busy")).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(settle("timeout")).toEqual({ ok: false, errorClass: "timeout" });
  });
});
