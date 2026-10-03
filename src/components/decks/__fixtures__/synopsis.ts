import type { SynopsisRow } from "../../../lib/synopsis/generate";
import type { SynopsisState } from "../../../lib/synopsis/read";
import type { CheckedSynopsis, SectionId } from "../../../lib/synopsis/types";

/** A whole overview, every section passing, naming two cards by mark. */
export function checkedSynopsis(over: Partial<CheckedSynopsis> = {}): CheckedSynopsis {
  return {
    verdicts: (["overview", "primer", "keyCards", "weaknesses"] as SectionId[]).map((section) => ({
      section, status: "ok" as const, failed: 0 as const, total: 2,
    })),
    overview: "Ramp early with [[Sol Ring]], then close with [[Craterhoof Behemoth]].",
    primer: {
      strategy: ["Play [[Sol Ring]] on turn one.", "Swing with everything."],
      mulligan: { keep: ["Two lands and [[Sol Ring]]."], sendBack: ["No lands."] },
      tips: [{ cards: ["Craterhoof Behemoth"], text: "Hold [[Craterhoof Behemoth]] for a wide board." }],
    },
    keyCards: [{ card: "Sol Ring", claims: ["ramp"], job: "Fast mana on turn one." }],
    weaknesses: ["Folds to a board wipe."],
    cards: {
      "sol ring": { oracleId: "sol-ring", name: "Sol Ring" },
      "craterhoof behemoth": { oracleId: "craterhoof", name: "Craterhoof Behemoth" },
    },
    ...over,
  };
}

export function synopsisRow(content: CheckedSynopsis = checkedSynopsis()): SynopsisRow {
  return { id: "syn-1", fingerprint: "list", contractVersion: 1, createdAt: new Date(), content };
}

export function synopsisState(over: Partial<SynopsisState> = {}): SynopsisState {
  return {
    synopsis: synopsisRow(),
    stale: false,
    wouldSpend: false,
    pressWrites: false,
    allowance: { used: 1, limit: 3, reopensAt: null, nextAt: new Date() },
    lastFailed: false,
    lastRejected: false,
    lastRefused: null,
    art: {},
    pending: false,
    illegal: false,
    ...over,
  };
}
