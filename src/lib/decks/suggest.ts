import type { DeckDetailCard } from "./grouping";
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
  // Carried so a click can draw the decklist row before the server answers.
  // Both are server-derived: the client cannot classify a card it has only a
  // name for, and guessing puts the optimistic row in a group it then jumps out
  // of — which is more jarring than the latency it was meant to hide.
  typeLine: string;
  cardTypeGroup: DeckDetailCard["cardTypeGroup"];
  role: DeckDetailCard["role"];
  imageUri: string | null;
  // Scryfall's cost string ("{2}{G}{G}") and its numeric value. Both are drawn:
  // the pips come from the string, the "cheapest first" sort from the number,
  // and parsing one out of the other on the client would guess at hybrid and
  // Phyrexian symbols the string spells out exactly.
  manaCost: string | null;
  manaValue: number;
  // The same figure reasonLabel interpolates, kept as a number so a tile can
  // size a bar without parsing a sentence. Null is the drawn "no EDHREC figure"
  // state and must render as absence, never as 0%.
  inclusionPct: number | null;
  // EDHREC synergy: how much more this commander's decks run the card than
  // decks generally. Surfaced only where positive (decision 6) — zero and
  // negative resolve to null, because "runs it less than average" is not a
  // reason to add a card.
  lift: number | null;
};

export type Suggestion = { oracleId: string; reason: "edhrec" | "ramp" | "draw" | "removal" | "wipes" | "land" };
const MAX = 99;
export const LAND_TARGET = 37;

// The slot a suggestion was picked to fill, which is not what the card is:
// suggestDeck offers a card against the first role it can close a gap on, so a
// card classified as removal can arrive to close the ramp gap, and it is the
// ramp figure it was counted against. EDHREC picks were chosen for no slot at
// all, so they fall back to the card's own role.
export function shelfRoleOf(s: DeckSuggestion): DeckDetailCard["role"] {
  return s.reasonType === "role" && s.reason !== "edhrec" ? s.reason : s.role;
}

export function humanRole(reason: Suggestion["reason"]): string {
  return reason === "land" ? "lands" : reason;
}

export function buildSuggestionPayload(
  s: Suggestion & {
    name: string;
    owned: boolean;
    typeLine: string;
    cardTypeGroup: DeckDetailCard["cardTypeGroup"];
    role: DeckDetailCard["role"];
    imageUri: string | null;
    manaCost: string | null;
    manaValue: number;
  },
  inclusionByName: Record<string, number>,
  synergyByName: Record<string, number> = {},
): DeckSuggestion {
  let reasonType: ReasonType;
  let reasonLabel: string;
  let inclusionPct: number | null = null;
  let lift: number | null = null;

  if (s.reason === "edhrec") {
    reasonType = "edhrec";
    // EDHREC keys DFCs/MDFCs by front face while Scryfall names them
    // "Front // Back" — fall back to the front face on a miss.
    const lower = s.name.toLowerCase();
    // Both maps arrive as parameters, so this is their own boundary — parse.ts
    // filtering non-finite figures upstream does not bind a caller that builds
    // a map some other way. A NaN would otherwise reach the label as
    // "EDHREC · NaN% of decks", and an Infinity would clear the `> 0` test and
    // render as a real lift.
    const raw = inclusionByName[lower] ?? inclusionByName[lower.split(" // ")[0]];
    const inclusion = Number.isFinite(raw) ? raw : undefined;
    inclusionPct = inclusion ?? null;
    const synergy = synergyByName[lower] ?? synergyByName[lower.split(" // ")[0]];
    lift = Number.isFinite(synergy) && synergy > 0 ? synergy : null;
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
    typeLine: s.typeLine,
    cardTypeGroup: s.cardTypeGroup,
    role: s.role,
    imageUri: s.imageUri,
    manaCost: s.manaCost,
    manaValue: s.manaValue,
    inclusionPct,
    lift,
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
