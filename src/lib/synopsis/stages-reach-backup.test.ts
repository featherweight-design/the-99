import { describe, expect, it } from "vitest";

import type { FactCard } from "./facts";
import { allChecksPass, backupText, checkBackupLine, checkCastReach, checkTipLead, i3RepairTargets, type OverviewDoc, type StagesChecks, type StagesReply } from "./stages";

const card = (name: string, manaValue: number, categories: FactCard["categories"] = []): FactCard => ({ oracleId: name, name, typeLine: "Artifact", quantity: 1, categories, oracleText: null, manaValue });
const facts = { commanders: ["Daretti"], cards: [card("Daretti", 4, ["commander"]), card("Palladium Myr", 3, ["ramp"]), card("Mind Stone", 2, ["ramp"]), card("Sol Ring", 1, ["ramp"]), card("Shock", 1)] };
const early = (text: string): OverviewDoc => ({ overview: [], strategy: [], stages: [{ text }], winsBy: [], alternate: [], landKeep: [], keep: [], sendBack: [], tips: [], keyCards: [], weaknesses: [] });

describe("checkCastReach", () => {
  it("fails a ramp card that costs as much as the turn it is said to help on", () => {
    const r = checkCastReach(early("Around turn 3, [[Palladium Myr]] helps land [[Daretti]]."), facts);
    expect(r.pass).toBe(false);
    expect(r.offenders[0]).toMatchObject({ card: "Palladium Myr", manaValue: 3, turn: 3 });
  });
  it("passes ramp cast a turn earlier, and non-ramp cards and the commander are not judged", () => {
    expect(checkCastReach(early("Around turn 3, [[Mind Stone]] helps land [[Daretti]] after [[Shock]]."), facts).pass).toBe(true);
    expect(checkCastReach(early("Around turn 2, [[Sol Ring]] helps."), facts).pass).toBe(true);
  });
  it("judges nothing in a line with no turn", () => {
    expect(checkCastReach(early("[[Palladium Myr]] helps land [[Daretti]]."), facts).pass).toBe(true);
  });
});

describe("checkTipLead", () => {
  const reply = (tipKinds?: ("plan" | "trick")[]) => ({ primer: { tips: [{ text: "a", evidence: [] }, { text: "b", evidence: [] }] }, tipKinds }) as unknown as StagesReply;
  it("fails a trick that leads a plan-level tip", () => {
    expect(checkTipLead(reply(["trick", "plan"])).pass).toBe(false);
  });
  it("passes plan first, all tricks, and an untagged old reply; fails a misaligned list", () => {
    expect(checkTipLead(reply(["plan", "trick"])).pass).toBe(true);
    expect(checkTipLead(reply(["trick", "trick"])).pass).toBe(true);
    expect(checkTipLead(reply(undefined)).pass).toBe(true);
    expect(checkTipLead(reply(["plan"])).pass).toBe(false);
  });
});

describe("the Backup line", () => {
  const plans = (b: string[]) => ({ plans: { primary: "x", backups: b } });
  it("takes the first backup and drops a leading label", () => {
    expect(backupText(plans(["Backup: [[Shock]] wins instead.", "second"]))).toBe("[[Shock]] wins instead.");
    expect(backupText(plans([]))).toBe("");
  });
  it("is storable only within a stage line's budget and with no turn", () => {
    expect(checkBackupLine("[[Shock]] wins instead.")).toBe(true);
    expect(checkBackupLine("[[Shock]] wins by turn 5.")).toBe(false);
    expect(checkBackupLine("Shock wins instead.")).toBe(false);
    expect(checkBackupLine("x".repeat(400))).toBe(false);
    expect(checkBackupLine("")).toBe(false);
  });
});

describe("the new checks reach the repair and the gate", () => {
  const base = { cardsInList: { pass: true, offenders: [] }, turnNumbers: { pass: true, offenders: [] }, explainedOnce: { pass: true, passExceptCommanders: true, offenders: [] }, stageFit: { pass: true, offenders: [], max: 4 }, stagesNameCards: { pass: true, offenders: [] }, length: { pass: true }, shape: { pass: true, offenders: [] } } as unknown as StagesChecks;
  it("a failed cast reach or tip lead sends the primer to the one repair and fails the gate", () => {
    const reach = { ...base, castReach: { pass: false, offenders: [{ where: "stages[0]", card: "Palladium Myr", manaValue: 3, turn: 3 }] } } as StagesChecks;
    expect(i3RepairTargets(reach).sections).toContain("primer");
    const inOverview = { ...base, castReach: { pass: false, offenders: [{ where: "overview[0]", card: "Palladium Myr", manaValue: 3, turn: 3 }] } } as StagesChecks;
    expect(i3RepairTargets(inOverview).sections).toEqual(["overview"]);
    expect(allChecksPass(reach, false)).toBe(false);
    const lead = { ...base, tipLead: { pass: false, offenders: ["the first tip is a trick though a later one is plan-level"] } } as StagesChecks;
    expect(i3RepairTargets(lead).sections).toContain("primer");
    expect(allChecksPass(lead, false)).toBe(false);
  });
});
