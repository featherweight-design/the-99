import { describe, expect, it } from "vitest";
import { LEDGER_LIMITS, ledgerLimits } from "./ledger-limits";

describe("LEDGER_LIMITS", () => {
  it("holds each ledger's limits exactly as the eval scripts enforced them before the move", () => {
    expect(LEDGER_LIMITS).toEqual({
      "ledger.jsonl": { hardCapUsd: 25, askAtUsd: 15 },
      "ledger-overview-accuracy.jsonl": { hardCapUsd: 15, askAtUsd: 11 },
      "ledger-tuning-lists.jsonl": { hardCapUsd: 3, askAtUsd: 2.5 },
      "ledger-cuts.jsonl": { hardCapUsd: 15, askAtUsd: 10 },
      "ledger-model-tiering-tuning.jsonl": { hardCapUsd: 2, askAtUsd: 1.6 },
      "ledger-model-tiering-cuts.jsonl": { hardCapUsd: 2, askAtUsd: 1.6 },
      "ledger-model-switch.jsonl": { hardCapUsd: 1.5, askAtUsd: 1.3 },
      "ledger-help-me-choose.jsonl": { hardCapUsd: 5, askAtUsd: null },
      "ledger-find-a-deck.jsonl": { hardCapUsd: 2, askAtUsd: null },
    });
  });

  it("answers null for a file no script guards by name, including an inherited key", () => {
    expect(ledgerLimits("ledger-cuts.jsonl")).toEqual({ hardCapUsd: 15, askAtUsd: 10 });
    expect(ledgerLimits("ledger-new.jsonl")).toBeNull();
    expect(ledgerLimits("toString")).toBeNull();
  });
});
