import { describe, expect, it } from "vitest";

import { buildPhraseIndex } from "./match";
import { validateRead } from "./read";
import { intakeLive, stubMode, stubReply } from "./stub";

const index = buildPhraseIndex(
  [{ slug: "dinosaurs", label: "Dinosaurs" }],
  [{ oracleId: "ds", name: "Doubling Season" }],
);
const none = { budgetDollars: null, bracket: null };

describe("the deeper read's stub", () => {
  it("is live only in production or under INTAKE_LIVE=1", () => {
    expect(intakeLive({ NODE_ENV: "development" })).toBe(false);
    expect(intakeLive({ NODE_ENV: "test", INTAKE_LIVE: "1" })).toBe(true);
    expect(intakeLive({ NODE_ENV: "production" })).toBe(true);
  });

  it("reads the words as the free match does, in a shape the validator keeps", () => {
    const out = stubReply("dinosaurs with Doubling Season and big energy", index, "mapped");
    if (!out.ok) throw new Error("expected a reply");
    const read = validateRead({ reply: out.value, words: "dinosaurs with Doubling Season and big energy", index, controls: none });
    expect(read.chips).toEqual([
      { kind: "theme", slug: "dinosaurs", label: "Dinosaurs" },
      { kind: "card", oracleId: "ds", name: "Doubling Season" },
    ]);
    expect(read.useful).toBe(true);
  });

  it("carries the budget and bracket the words name", () => {
    const out = stubReply("dinosaurs under $100, bracket 3", index, "mapped");
    if (!out.ok) throw new Error("expected a reply");
    expect(out.value).toMatchObject({ budgetDollars: 100, bracket: 3 });
  });

  it("switches to each outcome the panel draws", () => {
    const nothing = stubReply("dinosaurs", index, stubMode({ INTAKE_STUB: "nothing" }));
    if (!nothing.ok) throw new Error("expected a reply");
    expect(validateRead({ reply: nothing.value, words: "dinosaurs", index, controls: none }).useful).toBe(false);
    expect(stubReply("x", index, "malformed")).toMatchObject({ ok: false, errorClass: "malformed" });
    expect(stubReply("x", index, "busy")).toMatchObject({ ok: false, errorClass: "upstream_busy" });
    expect(stubReply("x", index, "timeout")).toMatchObject({ ok: false, errorClass: "timeout" });
    expect(stubMode({ INTAKE_STUB: "bogus" })).toBe("mapped");
  });
});
