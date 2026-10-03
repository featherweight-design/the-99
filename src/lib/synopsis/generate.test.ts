import { describe, expect, it, vi } from "vitest";

// Pure decisions only; the database paths are `probe:synopsis`'s.
vi.mock("../../db", () => ({ db: {} }));

import type { SynopsisFacts } from "./facts";
import { chargeFor, failedRunSet, mergeRetry, outcomeOf, refusedSections, shown, sumUsage } from "./generate";
import { isRepair } from "./prompt";
import { stubDelayMs, stubMode, stubReply, synopsisLive } from "./stub";
import type { CheckedSynopsis, SectionVerdict } from "./types";
import { validateSynopsis } from "./validate";

const ok = (section: SectionVerdict["section"]): SectionVerdict => ({ section, status: "ok", failed: 0, total: 1 });
const no = (section: SectionVerdict["section"]): SectionVerdict => ({ section, status: "refused", reason: "unknown_card", failed: 1, total: 1 });

function content(verdicts: SectionVerdict[], tag: string): CheckedSynopsis {
  const pass = (s: string) => verdicts.find((v) => v.section === s)?.status === "ok";
  return {
    verdicts,
    overview: pass("overview") ? `${tag} overview.` : null,
    primer: pass("primer") ? { strategy: [`${tag}.`], mulligan: { keep: [], sendBack: [] }, tips: [] } : null,
    keyCards: pass("keyCards") ? [] : null,
    weaknesses: pass("weaknesses") ? [`${tag} weakness.`] : null,
    cards: {},
  };
}

describe("the run's outcome and charge", () => {
  it("is survived only when every section passed, and shown when any did", () => {
    expect(outcomeOf([ok("overview"), ok("primer")])).toBe("survived");
    expect(outcomeOf([ok("overview"), no("primer")])).toBe("refused");
    expect(shown(content([no("overview"), ok("primer")], "a"))).toBe(true);
    expect(shown(content([no("overview"), no("primer")], "a"))).toBe(false);
    expect(shown(null)).toBe(false);
  });

  // The credit rule (Hugh, 2026-09-24): all four render, or the unit comes back.
  it("charges only when all four sections render", () => {
    expect(chargeFor(content([ok("overview"), ok("primer"), ok("keyCards"), ok("weaknesses")], "a"))).toBe("spent");
    expect(chargeFor(content([no("overview"), ok("primer"), ok("keyCards"), ok("weaknesses")], "a"))).toBe("refunded");
    expect(chargeFor(content([no("overview"), no("primer"), no("keyCards"), no("weaknesses")], "a"))).toBe("refunded");
    expect(chargeFor(null)).toBe("refunded");
  });

  // Both calls of a repaired write are billed, so the settle records their sum.
  it("adds two replies' usage, and keeps one when the other got no response", () => {
    const a = { inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 };
    expect(sumUsage(a, a)).toEqual({ inputTokens: 2, outputTokens: 4, cacheReadTokens: 6, cacheWriteTokens: 8 });
    expect(sumUsage(a, undefined)).toBe(a);
    expect(sumUsage(undefined, a)).toBe(a);
    expect(sumUsage(undefined, undefined)).toBeUndefined();
  });
});

describe("a failed call's settle (H33)", () => {
  it("stores a rejection as its own class, with the status the call failed with, refunded", () => {
    expect(failedRunSet({ ok: false, errorClass: "upstream_rejected", status: 404 }, undefined)).toEqual({
      outcome: "upstream_rejected", content: null, usage: null, charge: "refunded", billed: undefined, errorStatus: 404,
    });
  });

  it("keeps a busy upstream busy, with its status", () => {
    expect(failedRunSet({ ok: false, errorClass: "upstream_busy", status: 529 }, undefined))
      .toMatchObject({ outcome: "upstream_busy", errorStatus: 529, charge: "refunded" });
  });

  it("stores no status for a failure that had none", () => {
    expect(failedRunSet({ ok: false, errorClass: "timeout" }, undefined).errorStatus).toBeUndefined();
  });
});

describe("mergeRetry", () => {
  const stored = content([ok("overview"), no("primer"), ok("keyCards"), no("weaknesses")], "old");

  // The fixed land line survives a repair and a retry: it is the facts', not a section's.
  it("carries the land range through the merge", () => {
    const lands = { keep: { low: 2, high: 4 }, sendBack: { none: 0, under: 1, over: 5 } };
    const fresh = { ...content([ok("overview"), ok("primer"), ok("keyCards"), ok("weaknesses")], "new"), lands };
    expect(mergeRetry(stored, fresh, refusedSections(stored)).content.lands).toEqual(lands);
    expect(mergeRetry({ ...stored, lands }, content([ok("overview"), ok("primer"), ok("keyCards"), ok("weaknesses")], "new"), refusedSections(stored)).content.lands).toEqual(lands);
  });

  it("keeps every passing section byte for byte and takes only the retried ones", () => {
    const fresh = content([ok("overview"), ok("primer"), ok("keyCards"), ok("weaknesses")], "new");
    const { content: merged, anyRetriedPassed } = mergeRetry(stored, fresh, refusedSections(stored));
    expect(merged.overview).toBe("old overview.");
    expect(merged.primer?.strategy).toEqual(["new."]);
    expect(merged.weaknesses).toEqual(["new weakness."]);
    expect(merged.verdicts.map((v) => v.status)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(anyRetriedPassed).toBe(true);
  });

  it("charges nothing when every retried section fails again, whatever the rest did", () => {
    const fresh = content([ok("overview"), no("primer"), ok("keyCards"), no("weaknesses")], "new");
    expect(mergeRetry(stored, fresh, refusedSections(stored)).anyRetriedPassed).toBe(false);
  });
});

describe("the stub", () => {
  const facts: SynopsisFacts = {
    commanders: ["Kratos"],
    identity: ["R"],
    unproducible: [],
    lands: 36,
    ramp: 10,
    keep: { low: 2, high: 4 },
    sendBack: { none: 0, under: 1, over: 5 },
    commanderManaValues: [],
    figures: [2, 4, 7, 10, 36],
    cards: ["Kratos", "Sol Ring", "Chaos Warp", "Impact Tremors", "Goblin Bombardment", "Mountain"].map((name) => ({
      oracleId: `id-${name}`, name, typeLine: "Card", quantity: 1,
      categories: name === "Mountain" ? ["land" as const] : [], oracleText: null,
    })),
  };
  const run = (mode: Parameters<typeof stubReply>[1]) => {
    const reply = stubReply(facts, mode);
    return reply.ok ? validateSynopsis(reply.value, facts, new Map()).verdicts.map((v) => v.status) : reply.errorClass;
  };

  it("passes the accept contract on a whole deck, and reaches each outcome the UI draws", () => {
    expect(run("survived")).toEqual(["ok", "ok", "ok", "ok"]);
    expect(run("partial")).toEqual(["refused", "ok", "ok", "ok"]);
    expect(run("refused")).toEqual(["refused", "refused", "refused", "refused"]);
    expect(run("busy")).toBe("upstream_busy");
    expect(run("timeout")).toBe("timeout");
    expect(run("malformed")).toBe("malformed");
  });

  // Contract B's two outcomes, told apart by the request: a repair's user message names reasons.
  it("repairs on the repair call alone, or refuses it again", () => {
    const status = (mode: Parameters<typeof stubReply>[1], repair: boolean) => {
      const reply = stubReply(facts, mode, repair);
      return reply.ok ? validateSynopsis(reply.value, facts, new Map()).verdicts.map((v) => v.status) : reply.errorClass;
    };
    expect(status("repairs", false)).toEqual(["refused", "ok", "ok", "ok"]);
    expect(status("repairs", true)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(status("unrepaired", true)).toEqual(["refused", "ok", "ok", "ok"]);
    expect(stubMode({ SYNOPSIS_STUB: "repairs" })).toBe("repairs");
    expect(isRepair("Those sections failed checking for these reasons; fix exactly these: overview: unknown_card.")).toBe(true);
    expect(isRepair("Write the overview.")).toBe(false);
  });

  it("passes on a deck of lands with only a few spells, naming distinct cards", () => {
    const landHeavy: SynopsisFacts = {
      ...facts,
      cards: ["Kratos", "Sol Ring", "Mountain", "Forest", "Command Tower", "Exotic Orchard"].map((name) => ({
        oracleId: `id-${name}`, name, typeLine: "Card", quantity: 1,
        categories: ["Kratos", "Sol Ring"].includes(name) ? [] : ["land" as const], oracleText: null,
      })),
    };
    const reply = stubReply(landHeavy, "survived");
    expect(reply.ok && validateSynopsis(reply.value, landHeavy, new Map()).verdicts.map((v) => v.status)).toEqual(["ok", "ok", "ok", "ok"]);
  });

  it("is the model everywhere but production, unless a run opts in", () => {
    expect(synopsisLive({ NODE_ENV: "development" })).toBe(false);
    expect(synopsisLive({ NODE_ENV: "test" })).toBe(false);
    expect(synopsisLive({})).toBe(false);
    expect(synopsisLive({ NODE_ENV: "development", SYNOPSIS_LIVE: "1" })).toBe(true);
    expect(synopsisLive({ NODE_ENV: "production" })).toBe(true);
    expect(stubMode({ SYNOPSIS_STUB: "partial" })).toBe("partial");
    expect(stubMode({ SYNOPSIS_STUB: "nonsense" })).toBe("survived");
  });

  it("waits only as long as a probe asks, and never past a minute", () => {
    expect(stubDelayMs({})).toBe(0);
    expect(stubDelayMs({ SYNOPSIS_STUB_DELAY_MS: "nonsense" })).toBe(0);
    expect(stubDelayMs({ SYNOPSIS_STUB_DELAY_MS: "-5" })).toBe(0);
    expect(stubDelayMs({ SYNOPSIS_STUB_DELAY_MS: "2500" })).toBe(2500);
    expect(stubDelayMs({ SYNOPSIS_STUB_DELAY_MS: "600000" })).toBe(60_000);
  });
});
