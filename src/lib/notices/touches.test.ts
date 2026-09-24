import { describe, expect, it } from "vitest";

import { touches, type LoggedEntry, type ReadingMarks } from "./touches";

const reading: ReadingMarks = { seenSeq: 10, rulesVersion: 1, analyzedOracleIds: ["a", "b", "cmd"], commanderOracleIds: ["cmd"] };
const entry = (o: Partial<LoggedEntry>): LoggedEntry => ({ seq: 11, kind: "gameChanger", oracleIds: ["a"], detail: {}, ...o });

describe("touches", () => {
  it("counts a card-scoped entry past the mark on a card the reading analyzed", () => {
    expect(touches(entry({}), reading)).toBe(true);
  });
  it("ignores an entry at or before the mark, which the reading already saw", () => {
    expect(touches(entry({ seq: 10 }), reading)).toBe(false);
  });
  it("ignores a card the reading did not analyze", () => {
    expect(touches(entry({ oracleIds: ["z"] }), reading)).toBe(false);
  });
  it("needs EVERY piece of a combo, not one of them", () => {
    expect(touches(entry({ kind: "combo", oracleIds: ["a", "b"] }), reading)).toBe(true);
    expect(touches(entry({ kind: "combo", oracleIds: ["a", "z"] }), reading)).toBe(false);
  });
  it("needs a must-be-commander piece to lead the deck", () => {
    expect(touches(entry({ kind: "combo", oracleIds: ["a", "cmd"], detail: { mustBeCommander: ["cmd"] } }), reading)).toBe(true);
    expect(touches(entry({ kind: "combo", oracleIds: ["a", "b"], detail: { mustBeCommander: ["a"] } }), reading)).toBe(false);
  });
  it("counts a rules entry for a reading computed under an older version, whatever its seq", () => {
    expect(touches(entry({ kind: "rules", seq: 3, oracleIds: [], detail: { rulesVersion: "2" } }), reading)).toBe(true);
    expect(touches(entry({ kind: "rules", seq: 30, oracleIds: [], detail: { rulesVersion: "1" } }), reading)).toBe(false);
  });
});
