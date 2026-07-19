import { classifyRoles, ROLE_TARGETS } from "../recs/roles";
import type { PoolCard } from "../recs/score";

export type ReasonType = "edhrec" | "role";

export type DeckSuggestion = {
  oracleId: string;
  name: string;
  reason: "edhrec" | "ramp" | "draw" | "removal" | "wipes" | "land";
  reasonType: ReasonType;
  reasonLabel: string;
  owned: boolean;
  inDeck: boolean;
};

export type Suggestion = { oracleId: string; reason: "edhrec" | "ramp" | "draw" | "removal" | "wipes" | "land" };
const MAX = 99;
export const LAND_TARGET = 37;

export function humanRole(reason: Suggestion["reason"]): string {
  return reason === "land" ? "lands" : reason;
}

export function buildSuggestionPayload(
  s: Suggestion & { name: string; owned: boolean },
  inclusionByName: Record<string, number>,
): DeckSuggestion {
  let reasonType: ReasonType;
  let reasonLabel: string;

  if (s.reason === "edhrec") {
    reasonType = "edhrec";
    const inclusion = inclusionByName[s.name.toLowerCase()];
    reasonLabel = inclusion != null ? `EDHREC · ${inclusion}% of decks` : "EDHREC staple";
  } else {
    reasonType = "role";
    const target = s.reason === "land" ? LAND_TARGET : (ROLE_TARGETS[s.reason] ?? LAND_TARGET);
    reasonLabel = `Fills ${humanRole(s.reason)} · rec ${target}`;
  }

  return {
    oracleId: s.oracleId,
    name: s.name,
    reason: s.reason,
    reasonType,
    reasonLabel,
    owned: s.owned,
    inDeck: false,
  };
}

export function suggestDeck(args: {
  commander: PoolCard;
  ownedPool: PoolCard[];
  edhrecTopCards: string[] | null;
}): Suggestion[] {
  const out: Suggestion[] = [];
  const used = new Set<string>();
  const add = (oracleId: string, reason: Suggestion["reason"]) => {
    if (out.length < MAX && !used.has(oracleId)) { used.add(oracleId); out.push({ oracleId, reason }); }
  };

  if (args.edhrecTopCards) {
    // Iterate EDHREC's list (not the pool) so suggestion order follows
    // EDHREC's ranking regardless of DB/pool ordering. Index full name AND
    // front face — EDHREC lists DFCs/MDFCs by front face while Scryfall
    // names them "Front // Back".
    const ownedByName = new Map<string, PoolCard>();
    for (const c of args.ownedPool) {
      const lower = c.name.toLowerCase();
      if (!ownedByName.has(lower)) ownedByName.set(lower, c);
      const front = lower.split(" // ")[0];
      if (!ownedByName.has(front)) ownedByName.set(front, c);
    }
    for (const name of args.edhrecTopCards) {
      const c = ownedByName.get(name.toLowerCase());
      if (c) add(c.oracleId, "edhrec");
    }
  }

  const counts: Record<"ramp" | "draw" | "removal" | "wipes" | "land", number> = {
    ramp: 0, draw: 0, removal: 0, wipes: 0, land: 0,
  };
  for (const c of args.ownedPool) {
    if (used.has(c.oracleId)) {
      for (const r of classifyRoles(c)) counts[r]++;
    }
  }
  for (const c of args.ownedPool) {
    if (used.has(c.oracleId)) continue;
    for (const role of classifyRoles(c)) {
      const target = role === "land" ? LAND_TARGET : ROLE_TARGETS[role];
      if (counts[role] < target) { add(c.oracleId, role); counts[role]++; break; }
    }
  }
  return out;
}
