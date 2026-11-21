import { describe, expect, it } from "vitest";

import {
  JUDGED_PREFILTER, JUDGED_SYSTEM, JUDGED_THEMES, judgedInputHash, judgedSystemHash, parseJudgedReply, renderJudgedBody,
  buildJudgedRequest, withoutFailed,
} from "./judged";

const card = { oracleId: "a", name: "Howling Mine", mana_cost: "{2}", type_line: "Artifact", oracle_text: "At the beginning of each player's draw step, if Howling Mine is untapped, that player draws an additional card." };

describe("parseJudgedReply", () => {
  it("reads each sent key's themes, sorted and deduplicated", () => {
    const r = parseJudgedReply('Here: {"1": ["politics", "groupHug", "groupHug"], "2": []}', ["1", "2"]);
    expect(r).toEqual({ ok: true, themes: new Map([["1", ["groupHug", "politics"]], ["2", []]]), refused: [] });
  });
  it("refuses a missing key, an unknown theme and a non-array, never repairing them", () => {
    const r = parseJudgedReply('{"1": ["stax"], "2": "bigMana", "4": []}', ["1", "2", "3"]);
    expect(r).toEqual({ ok: true, themes: new Map(), refused: ["1", "2", "3"] });
  });
  it("does not read silence as an empty answer", () => {
    expect(parseJudgedReply("I cannot help", ["1"]).ok).toBe(false);
    expect(parseJudgedReply("{nope}", ["1"]).ok).toBe(false);
    expect(parseJudgedReply("[]", ["1"]).ok).toBe(false);
  });
});

describe("the input hash", () => {
  it("moves with the card text, the model and the instruction", () => {
    const base = judgedInputHash(card, "m");
    expect(judgedInputHash({ ...card, oracle_text: "x" }, "m")).not.toBe(base);
    expect(judgedInputHash(card, "n")).not.toBe(base);
    expect(judgedInputHash(card, "m", "j2", judgedSystemHash(`${JUDGED_SYSTEM} `))).not.toBe(base);
  });
});

describe("the pre-filter", () => {
  const hits = (theme: (typeof JUDGED_THEMES)[number], text: string) => new RegExp(JUDGED_PREFILTER[theme].replaceAll("\\y", "\\b")).test(text);
  it("catches the canonical card of each theme", () => {
    expect(hits("groupHug", "that player draws an additional card")).toBe(true);
    expect(hits("pillowFort", "creatures can’t attack you unless their controller pays {2}")).toBe(true);
    expect(hits("bigMana", "add three mana of any one color")).toBe(true);
    expect(hits("politics", "will of the council — starting with you, each player votes")).toBe(true);
  });
  it("leaves out a plain creature", () => {
    for (const t of JUDGED_THEMES) expect(hits(t, "flying. when this creature enters, you gain 2 life.")).toBe(false);
  });
});

describe("renderJudgedBody", () => {
  it("numbers the cards in order", () => {
    expect(renderJudgedBody([card, card])).toMatch(/Key: 1\n[^]*Key: 2\n/);
  });
});

describe("withoutFailed", () => {
  const cards = [{ oracleId: "a" }, { oracleId: "b" }, { oracleId: "c" }];
  it("leaves a failed card out and reports it, so the next run does not ask again", () => {
    expect(withoutFailed(cards, ["b"], false)).toEqual({ todo: [{ oracleId: "a" }, { oracleId: "c" }], dropped: [{ oracleId: "b" }] });
  });
  it("asks everything again only when told to", () => {
    expect(withoutFailed(cards, ["b"], true)).toEqual({ todo: cards, dropped: [] });
  });
});

describe("buildJudgedRequest for Sonnet 5.5", () => {
  it("sends no temperature and turns thinking off with between_tools, which 5.5 requires", () => {
    const { params } = buildJudgedRequest("j-0", "claude-sonnet-5-5", [card]);
    expect(params).not.toHaveProperty("temperature");
    expect(params.thinking).toEqual({ type: "between_tools" });
  });
  it("keeps disabled for Sonnet 5 and temperature 0 for Sonnet 4.5", () => {
    expect(buildJudgedRequest("j-0", "claude-sonnet-5", [card]).params.thinking).toEqual({ type: "disabled" });
    const old = buildJudgedRequest("j-0", "claude-sonnet-4-5", [card]).params;
    expect(old.temperature).toBe(0);
    expect(old).not.toHaveProperty("thinking");
  });
});
