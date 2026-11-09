import { describe, expect, it } from "vitest";

import { judgeReplies } from "./collect";
import { labelInputHash } from "./prompt";
import type { CardRow } from "./publish";

// The collect's pure half, by behaviour: what one intent's replies stage. This is the path that left the
// 18 commander-legal cards sharing a name unlabelled while replies were matched by name.
const MODEL = "claude-sonnet-4-5";
const ramp = {
  space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null, affects: null,
  to: null, method: null, trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
};
const draw = {
  space: "role", kind: "draw", restrictedTo: null, affects: null,
  to: null, method: null, trigger: "cast", recurrence: "oneShot", threshold: null, modal: false,
};
const card = (oracleId: string, name: string, oracle_text: string): CardRow =>
  ({ oracleId, name, mana_cost: "{2}", type_line: "Artifact", oracle_text, layout: "normal" });
// Two oracle rows sharing one name, with different text.
const A = card("00000000-0000-4000-8000-00000000000a", "Shared Name", "{T}: Add {C}.");
const B = card("00000000-0000-4000-8000-00000000000b", "Shared Name", "When this enters, draw a card.");
const C = card("00000000-0000-4000-8000-00000000000c", "Other Card", "{T}: Add {C}.");
const byId = new Map([A, B, C].map((c) => [c.oracleId, c]));
const intentOf = (cards: CardRow[]) => ({
  asked: cards.map((c) => c.oracleId),
  askedHashes: Object.fromEntries(cards.map((c) => [c.oracleId, labelInputHash(c, MODEL)])),
});
const reply = (answers: unknown[]) => JSON.stringify(answers);

describe("judgeReplies", () => {
  it("stages two cards sharing a name, each with its own answer", () => {
    const j = judgeReplies(intentOf([A, B]), [reply([
      { key: "1", name: "Shared Name", jobs: [ramp] },
      { key: "2", name: "Shared Name", jobs: [draw] },
    ])], byId, MODEL);
    expect(j.rejected).toEqual([]);
    expect(j.moved).toBe(0);
    expect(j.staged).toEqual([
      { oracleId: A.oracleId, labels: [ramp], inputHash: labelInputHash(A, MODEL) },
      { oracleId: B.oracleId, labels: [draw], inputHash: labelInputHash(B, MODEL) },
    ]);
  });

  // A missing or unknown key is a REAL error: refused, recorded, and the card is short (the floor judges it).
  it("leaves a card short, and records why, when its answer has no key or an unknown one", () => {
    const j = judgeReplies(intentOf([A, B]), [reply([
      { name: "Shared Name", jobs: [ramp] },
      { key: "7", name: "Shared Name", jobs: [draw] },
    ])], byId, MODEL);
    expect(j.staged).toEqual([]);
    expect(j.rejected).toEqual(["missing key (name Shared Name)", "unknown key 7 (name Shared Name)"]);
  });

  it("records an unparseable reply and stages nothing from it", () => {
    const j = judgeReplies(intentOf([A]), ["I cannot help with that."], byId, MODEL);
    expect(j).toEqual({ staged: [], moved: 0, rejected: ["unparseable"] });
  });

  // A RENAME since the request: the answer still names the old name. The card is MOVED (not staged, out
  // of the floor), and its answer is not refused for the name it was sent under.
  it("counts a card renamed since it was asked as moved, never as a refused answer", () => {
    const intent = intentOf([A, C]);
    const renamed = new Map(byId).set(C.oracleId, { ...C, name: "Other Card, Renamed" });
    const j = judgeReplies(intent, [reply([
      { key: "1", name: "Shared Name", jobs: [ramp] },
      { key: "2", name: "Other Card", jobs: [ramp] },
    ])], renamed, MODEL);
    expect(j.rejected).toEqual([]);
    expect(j.moved).toBe(1);
    expect(j.staged.map((s) => s.oracleId)).toEqual([A.oracleId]);
  });

  it("counts a card gone from the catalog as moved", () => {
    const gone = new Map(byId);
    gone.delete(B.oracleId);
    const j = judgeReplies(intentOf([A, B]), [reply([{ key: "1", jobs: [ramp] }, { key: "2", jobs: [draw] }])], gone, MODEL);
    expect(j.moved).toBe(1);
    expect(j.staged.map((s) => s.oracleId)).toEqual([A.oracleId]);
  });
});
