import type { ServerState } from "../../../lib/scan/server-scan";
import type { ScanGuess, ScanPanel, ScanScreen } from "./scan-view";

/**
 * The scanner's screen from what the server scanner knows (`src/lib/scan/server-scan.ts`, PR 2b) and what the
 * player has done, pure. Under server matching one lookup answers a card that has held steady, so the drawn
 * "three agreeing frames" become the scanner's own steps: a card settling or being looked up is `unsure`, and the
 * answer is `sure` or `notSure` by the margin gate the lookup already applied (`result.sure`).
 */
export type ScanInputs = {
  /** `getUserMedia` refused, or no camera. */
  blocked: boolean;
  server: ServerState;
  /** The detector sees a card in the frame (before it has settled). */
  cardInView: boolean;
  dark: boolean;
  /** The guess under the player's finger (V4), frozen while the press is down. */
  held: ScanGuess | null;
  /** The card just added (V5), shown until the hook clears it. */
  added: { name: string } | null;
  /** Copies of each card on the list, by oracle id. */
  onList: ReadonlyMap<string, number>;
  /** The card last added, and whether the frame has emptied since: unbroken view is a duplicate, not a new copy. */
  lastAdded: { oracleId: string; emptiedSince: boolean } | null;
};

export function scanScreen(i: ScanInputs): ScanScreen {
  if (i.blocked) return { kind: "blocked" };
  const scanning = (panel: Extract<ScanScreen, { kind: "scanning" }>["panel"]): ScanScreen => ({ kind: "scanning", panel, dark: i.dark });
  if (i.added) return scanning({ kind: "added", name: i.added.name });
  if (i.held) return scanning({ kind: "sure", guess: i.held, held: true, again: againFor(i, i.held.oracleId) });
  const s = i.server;
  switch (s.kind) {
    case "idle":
      return scanning(i.cardInView ? { kind: "unsure", agreeing: 0 } : { kind: "looking" });
    case "looking":
      return scanning({ kind: "unsure", agreeing: 1 });
    case "retrying":
      return scanning({ kind: "unsure", agreeing: 2 });
    case "match": {
      const guesses = s.result.guesses.map(toScanGuess);
      if (guesses.length === 0) return scanning({ kind: "looking" });
      if (s.result.sure) return scanning({ kind: "sure", guess: guesses[0], held: false, again: againFor(i, guesses[0].oracleId) });
      // No sheen signal reaches the scanner yet, so the sleeve line stays off rather than guessing.
      return scanning({ kind: "notSure", guesses: guesses.slice(0, 3), sleeves: false });
    }
    // A refusal or a failed lookup leaves the screen looking; the hook says why once, in a toast.
    case "refused":
    case "failed":
      return scanning({ kind: "looking" });
  }
}

function againFor(i: ScanInputs, oracleId: string): Extract<ScanPanel, { kind: "sure" }>["again"] {
  const count = i.onList.get(oracleId) ?? 0;
  if (count === 0) return null;
  const unbroken = i.lastAdded?.oracleId === oracleId && !i.lastAdded.emptiedSince;
  return { kind: unbroken ? "duplicate" : "second", count };
}

function toScanGuess(g: { oracleId: string; name: string; typeLine?: string; imageUri?: string | null }): ScanGuess {
  return { oracleId: g.oracleId, name: g.name, typeLine: g.typeLine ?? "", imageUri: g.imageUri ?? null };
}
