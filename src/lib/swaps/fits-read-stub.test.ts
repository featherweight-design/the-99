import { describe, expect, it } from "vitest";

import { buildFitsReadPrompt, validFitsRead } from "./fits-read";
import { inputs } from "./fits-read.fixture";
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

  it("returns picks the validator keeps, each with a cut, and never a basic land or a never-cut card", () => {
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
