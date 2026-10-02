import { describe, expect, it } from "vitest";

import { labelInputHash } from "./prompt";
import { freshLabels, standInLabelsEnabled } from "./read";
import type { Job } from "./types";

const CARD = {
  oracle_id: "00000000-0000-4000-8000-000000000009", name: "Murder", mana_cost: "{1}{B}{B}",
  type_line: "Instant", oracle_text: "Destroy target creature.", layout: "normal",
};
const hash = (over: Partial<typeof CARD> = {}, model = "m") => {
  const c = { ...CARD, ...over };
  return labelInputHash({ oracleId: c.oracle_id, name: c.name, mana_cost: c.mana_cost, type_line: c.type_line, oracle_text: c.oracle_text, layout: c.layout }, model);
};
const JOB: Job = {
  space: "role", kind: "removal", restrictedTo: null, affects: null, to: null, method: "destroy",
  trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
};
const row = (over: Record<string, unknown> = {}) => ({ ...CARD, labels: [JOB], model: "m", input_hash: hash(), ...over });

describe("freshLabels", () => {
  it("reads a row whose hash still matches the card's text", () => {
    expect(freshLabels([row()]).get(CARD.oracle_id)).toEqual([JOB]);
  });

  it("leaves out a stale row: the card's text moved since it was labelled", () => {
    expect(freshLabels([row({ oracle_text: "Destroy target creature. Draw a card." })]).size).toBe(0);
  });

  it("leaves out a row labelled under another model than its hash names", () => {
    expect(freshLabels([row({ model: "other" })]).size).toBe(0);
  });

  it("leaves out a malformed row whole, never half-read", () => {
    expect(freshLabels([row({ labels: [JOB, { ...JOB, affects: undefined }] })]).size).toBe(0);
    expect(freshLabels([row({ labels: "not an array" })]).size).toBe(0);
  });
});

describe("standInLabelsEnabled", () => {
  it("is on for the exact string 'true' alone", () => {
    expect(standInLabelsEnabled({ STAND_IN_LABELS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(standInLabelsEnabled({ STAND_IN_LABELS_ENABLED: "TRUE" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(standInLabelsEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
