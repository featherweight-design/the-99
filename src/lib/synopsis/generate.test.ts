import { describe, expect, it, vi } from "vitest";

// Pure decisions only; the database paths are `probe:synopsis`'s.
vi.mock("../../db", () => ({ db: {} }));

import type { SynopsisFacts } from "./facts";
import { mergeRetry, outcomeOf, refusedSections, shown } from "./generate";
import { stubMode, stubReply, synopsisLive } from "./stub";
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
});

describe("mergeRetry", () => {
  const stored = content([ok("overview"), no("primer"), ok("keyCards"), no("weaknesses")], "old");

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
});
