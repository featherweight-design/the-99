import { describe, expect, it } from "vitest";

import { decodeKey, encodeKey, shapeRun, type RawRun } from "./history";
import { parseChooseParams, type ChooseParams } from "./params";
import { askOf, pastRunHref } from "./submit";

const ID = "0000aaaa-0000-4000-8000-000000000001";
const OC = (n: number) => `0000bbbb-0000-4000-8000-00000000000${n}`;
const base: RawRun = {
  id: ID, createdAt: new Date("2026-10-13T21:40:00.123Z"), status: "ok", errorClass: null,
  ask: "w=a+graveyard+deck&c=b%2Cg&v=results",
  result: { picks: [1, 2, 3, 4].map((n) => ({ oracleId: OC(n), reason: [{ text: "x" }] })), pool: 164, weighed: 21 },
};

describe("shapeRun", () => {
  it("shapes an answered run: the words, the first three picks, the count and the reopen link", () => {
    const row = shapeRun(base)!;
    expect(row).toMatchObject({ id: ID, at: "2026-10-13T21:40:00.123Z", state: "ok", words: "a graveyard deck", picks: 4, pool: 164 });
    expect(row.thumbs).toEqual([OC(1), OC(2), OC(3)]);
    expect(row.href).toBe(`/decks/new/choose?w=a+graveyard+deck&c=b%2Cg&v=results&r=${ID}&h=1`);
  });

  it("lists a run that found nothing with no picks, and keeps its stored pool", () => {
    const row = shapeRun({ ...base, status: "failed", errorClass: "nothing_valid", result: { picks: [], pool: 3445, weighed: 0 } })!;
    expect(row).toMatchObject({ state: "nothing", picks: 0, thumbs: [], pool: 3445 });
  });

  it("lists the run in flight with neither picks nor pool", () => {
    expect(shapeRun({ ...base, status: "pending", result: null })).toMatchObject({ state: "reading", picks: 0, thumbs: [], pool: null });
  });

  it("never lists a run that has no answer: a failed, stopped or interrupted read", () => {
    expect(shapeRun({ ...base, status: "failed", errorClass: "timeout", result: null })).toBeNull();
    expect(shapeRun({ ...base, status: "failed", errorClass: "interrupted", result: null })).toBeNull();
    expect(shapeRun({ ...base, status: "cancelled", result: null })).toBeNull();
  });

  it("draws a tagged card as its name and collapses line breaks", () => {
    const tagged = new URLSearchParams({ w: "unlike mine\n  [[0000cccc-0000-4000-8000-000000000001|Meren of Clan Nel Toth]] please", v: "results" }).toString();
    const row = shapeRun({ ...base, ask: tagged })!;
    expect(row.words).toBe("unlike mine Meren of Clan Nel Toth please");
  });

  it("does not list an ask with no words: a read is never made from none", () => {
    expect(shapeRun({ ...base, ask: "c=b&v=results" })).toBeNull();
  });
});

describe("the keyset", () => {
  const key = { at: "2026-10-13T21:40:00.123Z", id: ID };
  it("round-trips a key", () => {
    expect(decodeKey(encodeKey(key))).toEqual(key);
  });
  it("reads anything it did not write as no key", () => {
    for (const bad of [null, undefined, "", "x", "12.not-a-uuid", `abc.${ID}`, `1.${ID}; drop table`, `${"9".repeat(16)}.${ID}`, "9".repeat(200)]) {
      expect(decodeKey(bad)).toBeNull();
    }
  });
});

describe("the stored ask", () => {
  const p: ChooseParams = {
    ...parseChooseParams(new URLSearchParams("w=spooky&c=b,g&m=exact&t=graveyard&b=60&k=3&a=0000cccc-0000-4000-8000-000000000001&n=junk&r=" + ID)),
  };

  it("is the results address without the read, the card or Not used, and parses back to the same answers", () => {
    const ask = askOf(p);
    expect(ask.startsWith("?")).toBe(false);
    const back = parseChooseParams(new URLSearchParams(ask));
    expect(back).toMatchObject({ words: "spooky", colors: ["b", "g"], match: "exactly", themes: ["graveyard"], budgetDollars: 60, bracket: 3, readId: null, card: null, notUsed: [], results: true });
  });

  it("is capped like the address: nothing past the words cap is stored", () => {
    const long = parseChooseParams(new URLSearchParams({ w: "x".repeat(5000) }));
    expect(parseChooseParams(new URLSearchParams(askOf(long))).words.length).toBeLessThanOrEqual(800);
  });

  it("makes a reopen link that names the run and marks it past", () => {
    const href = pastRunHref(askOf(p), ID);
    const sp = new URLSearchParams(href.split("?")[1]);
    expect(sp.get("r")).toBe(ID);
    expect(sp.get("h")).toBe("1");
    expect(sp.get("v")).toBe("results");
    expect(parseChooseParams(sp).words).toBe("spooky");
  });
});
