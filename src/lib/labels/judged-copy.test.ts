import { describe, expect, it } from "vitest";

import { JUDGED_PROMPT_VERSION, judgedInputHash } from "./judged";
import { planJudgedCopy, type SourceJudged } from "./judged-copy";

const card = (oracleId: string, text = "Each player draws a card.") => ({
  oracleId, name: `Card ${oracleId}`, mana_cost: "{2}{U}", type_line: "Sorcery", oracle_text: text, layout: "normal",
});

const row = (oracleId: string, over: Partial<SourceJudged> = {}): SourceJudged => ({
  oracleId, themes: ["groupHug"], verifiedThemes: ["groupHug"], verifiedAt: new Date(0),
  model: "claude-sonnet-5-5", promptVersion: JUDGED_PROMPT_VERSION,
  inputHash: judgedInputHash(card(oracleId), "claude-sonnet-5-5"), ...over,
});

describe("planJudgedCopy", () => {
  it("installs a complete row whose hash matches the target's own card", () => {
    const plan = planJudgedCopy([row("a")], [card("a")]);
    expect(plan.install.map((r) => r.oracleId)).toEqual(["a"]);
  });

  it("leaves a row the verifier has not finished on the source", () => {
    const plan = planJudgedCopy([row("a", { verifiedThemes: null })], [card("a")]);
    expect(plan.install).toEqual([]);
    expect(plan.unverified).toEqual(["a"]);
  });

  it("installs a verified row with no surviving theme (an empty verdict is a verdict)", () => {
    const plan = planJudgedCopy([row("a", { verifiedThemes: [] })], [card("a")]);
    expect(plan.install).toHaveLength(1);
  });

  it("reports a row written under another prompt version, without installing it", () => {
    const plan = planJudgedCopy([row("a", { promptVersion: "j2" })], [card("a")]);
    expect(plan.otherVersion).toEqual(["a"]);
    expect(plan.install).toEqual([]);
  });

  it("refuses a row describing text the target no longer holds", () => {
    const plan = planJudgedCopy([row("a")], [card("a", "Draw two cards.")]);
    expect(plan.mismatched).toEqual(["a"]);
    expect(plan.install).toEqual([]);
  });

  it("counts a card the target's catalog lacks", () => {
    const plan = planJudgedCopy([row("a")], []);
    expect(plan.notInTargetCatalog).toEqual(["a"]);
  });
});
