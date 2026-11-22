import { describe, expect, it } from "vitest";

import { JUDGED_PROMPT_VERSION, judgedInputHash } from "./judged";
import { freshVerifiedThemes, type JudgedRow } from "./judged-read";

const card = { oracleId: "00000000-0000-4000-8000-000000000001", name: "Howling Mine", mana_cost: "{2}", type_line: "Artifact", oracle_text: "At the beginning of each player's draw step, that player draws an additional card.", layout: "normal" };
const row = (over: Partial<JudgedRow> = {}): JudgedRow => ({
  oracleId: card.oracleId, verifiedThemes: ["groupHug"], model: "m", promptVersion: JUDGED_PROMPT_VERSION,
  inputHash: judgedInputHash(card, "m"), name: card.name, manaCost: card.mana_cost, typeLine: card.type_line, oracleText: card.oracle_text, layout: card.layout,
  ...over,
});

describe("freshVerifiedThemes", () => {
  it("serves the verified themes of a fresh row", () => {
    expect(freshVerifiedThemes(row())).toEqual(["groupHug"]);
    expect(freshVerifiedThemes(row({ verifiedThemes: [] }))).toEqual([]);
  });

  it("serves nothing for an unverified row, whatever pass 1 said", () => {
    expect(freshVerifiedThemes(row({ verifiedThemes: null }))).toEqual([]);
  });

  it("serves nothing when the card text, the model or the version moved since the row was written", () => {
    expect(freshVerifiedThemes(row({ oracleText: "Changed." }))).toEqual([]);
    expect(freshVerifiedThemes(row({ model: "other" }))).toEqual([]);
    expect(freshVerifiedThemes(row({ promptVersion: "j0" }))).toEqual([]);
  });

  it("drops a name outside the four and a repeat, and tolerates a malformed value", () => {
    expect(freshVerifiedThemes(row({ verifiedThemes: ["politics", "politics", "tokens", 3] }))).toEqual(["politics"]);
    expect(freshVerifiedThemes(row({ verifiedThemes: { a: 1 } }))).toEqual([]);
  });
});
