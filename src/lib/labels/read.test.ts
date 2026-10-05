import { describe, expect, it } from "vitest";

import { labelInputHash, PROMPT_SYSTEM_SHA256 } from "./prompt";
import { freshLabels, labelSurfacesEnabled, standInLabelsEnabled } from "./read";
import type { Job } from "./types";

const CARD = {
  oracle_id: "00000000-0000-4000-8000-000000000009", name: "Murder", mana_cost: "{1}{B}{B}",
  type_line: "Instant", oracle_text: "Destroy target creature.", layout: "normal",
};
const hash = (over: Partial<typeof CARD> = {}, model = "m", version = "8", registry = PROMPT_SYSTEM_SHA256) => {
  const c = { ...CARD, ...over };
  return labelInputHash({ oracleId: c.oracle_id, name: c.name, mana_cost: c.mana_cost, type_line: c.type_line, oracle_text: c.oracle_text, layout: c.layout }, model, version, registry);
};
const JOB: Job = {
  space: "role", kind: "removal", restrictedTo: null, affects: null, to: null, method: "destroy",
  trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
};
const row = (over: Record<string, unknown> = {}) => ({ ...CARD, labels: [JOB], model: "m", prompt_version: "8", input_hash: hash(), ...over });

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

  // Version-aware freshness (Hugh, 2026-10-04): a row is read under the version that wrote it.
  it("still reads a v8 row once a v9 prompt is registered beside it", () => {
    const V9 = { ...PROMPT_SYSTEM_SHA256, "9": "9".repeat(64) };
    expect(freshLabels([row()], V9).get(CARD.oracle_id)).toEqual([JOB]);
    expect(freshLabels([row({ prompt_version: "9", input_hash: hash({}, "m", "9", V9) })], V9).get(CARD.oracle_id)).toEqual([JOB]);
  });

  it("leaves out a row of a prompt version the registry does not hold", () => {
    expect(freshLabels([row({ prompt_version: "7" })]).size).toBe(0);
  });

  it("leaves out a row whose stored version is not the one its hash was written under", () => {
    const V9 = { ...PROMPT_SYSTEM_SHA256, "9": "9".repeat(64) };
    expect(freshLabels([row({ prompt_version: "9" })], V9).size).toBe(0);
  });

  it("leaves out a malformed row whole, never half-read", () => {
    expect(freshLabels([row({ labels: [JOB, { ...JOB, affects: undefined }] })]).size).toBe(0);
    expect(freshLabels([row({ labels: "not an array" })]).size).toBe(0);
  });
});

// Two of the Gishath trial's land searches the model labelled `tutor` (2026-10-03), with their
// real oracle text and the jobs it wrote, and one search that reaches past lands.
const TUTOR = (restrictedTo: string): Job => ({
  space: "role", kind: "tutor", restrictedTo, affects: "self", to: "hand", method: null,
  trigger: "none", recurrence: "oneShot", threshold: null, modal: false,
});
const WIPE: Job = { ...JOB, kind: "wipes", affects: "opponents", modal: true, restrictedTo: "creature" };
const labelled = (card: Partial<typeof CARD>, labels: Job[]) => {
  const c = { ...CARD, ...card };
  return { ...c, labels, model: "m", prompt_version: "8", input_hash: hash(c) };
};

describe("freshLabels — a land search is never a tutor", () => {
  it("leaves Land Tax out once its only job, the tutor, is dropped, so the text path reads it as ramp", () => {
    const r = labelled({
      oracle_id: "00000000-0000-4000-8000-00000000000a", name: "Land Tax", mana_cost: "{W}", type_line: "Enchantment",
      oracle_text: "At the beginning of your upkeep, if an opponent controls more lands than you, you may search your library for up to three basic land cards, reveal them, put them into your hand, then shuffle.",
    }, [TUTOR("land")]);
    expect(freshLabels([r]).has(r.oracle_id)).toBe(false);
  });

  it("drops the tutor job on Nylea's Intervention and keeps its wipe", () => {
    const r = labelled({
      oracle_id: "00000000-0000-4000-8000-00000000000b", name: "Nylea's Intervention", mana_cost: "{X}{G}{G}", type_line: "Sorcery",
      oracle_text: "Choose one —\n• Search your library for up to X land cards, reveal them, put them into your hand, then shuffle.\n• Nylea's Intervention deals twice X damage to each creature with flying.",
    }, [{ ...TUTOR("land"), modal: true }, WIPE]);
    expect(freshLabels([r]).get(r.oracle_id)).toEqual([WIPE]);
  });

  it("keeps the tutor job when any search can find more than a land (Traverse the Ulvenwald)", () => {
    const job = TUTOR("creature or land");
    const r = labelled({
      oracle_id: "00000000-0000-4000-8000-00000000000c", name: "Traverse the Ulvenwald", mana_cost: "{G}", type_line: "Sorcery",
      oracle_text: "Search your library for a basic land card, reveal it, put it into your hand, then shuffle.\nDelirium — If there are four or more card types among cards in your graveyard, instead search your library for a creature or land card, reveal it, put it into your hand, then shuffle.",
    }, [job]);
    expect(freshLabels([r]).get(r.oracle_id)).toEqual([job]);
  });

  it("keeps a tutor job on a card that searches nothing (a top-of-library dig)", () => {
    const job = TUTOR("creature");
    const r = labelled({
      oracle_id: "00000000-0000-4000-8000-00000000000d", name: "Commune with Nature", mana_cost: "{G}", type_line: "Sorcery",
      oracle_text: "Look at the top five cards of your library. You may reveal a creature card from among them and put it into your hand. Put the rest on the bottom of your library in any order.",
    }, [job]);
    expect(freshLabels([r]).get(r.oracle_id)).toEqual([job]);
  });
});

// 2026-10-03: 3,237 staging rows are `[]`, mostly the model answering no job (Lightning Bolt, wrongly)
// and some with every job failed by `validateJob`. Read as labelled, they matched nothing and got no
// stand-ins.
describe("freshLabels — an empty row", () => {
  it("is unlabelled, so the text path reads the card", () => {
    const empty = row({ labels: [] });
    const m = freshLabels([empty]);
    expect(m.has(CARD.oracle_id)).toBe(false);
    expect(m.size).toBe(0);
  });
});

describe("standInLabelsEnabled", () => {
  it("is on for the exact string 'true' alone", () => {
    expect(standInLabelsEnabled({ STAND_IN_LABELS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(standInLabelsEnabled({ STAND_IN_LABELS_ENABLED: "TRUE" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(standInLabelsEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("labelSurfacesEnabled", () => {
  const env = (v: Record<string, string>) => v as unknown as NodeJS.ProcessEnv;
  it("is on for the exact string 'true' alone", () => {
    expect(labelSurfacesEnabled(env({ LABEL_SURFACES_ENABLED: "true" }))).toBe(true);
    expect(labelSurfacesEnabled(env({ LABEL_SURFACES_ENABLED: "TRUE" }))).toBe(false);
    expect(labelSurfacesEnabled(env({ LABEL_SURFACES_ENABLED: "1" }))).toBe(false);
    expect(labelSurfacesEnabled(env({}))).toBe(false);
  });

  it("is its own switch: the stand-ins sheet's does not turn it on", () => {
    expect(labelSurfacesEnabled(env({ STAND_IN_LABELS_ENABLED: "true" }))).toBe(false);
  });
});
