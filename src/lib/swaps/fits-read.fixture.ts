import type { FitsDeckBlock, FitsReadInputs } from "./fits-read";

/** Find a deck read's test fixture: three decks and a subject card, shared by the read's tests. */

export const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
export const SUBJECT = id(1);
export const KRENKO = id(10);
export const KRATOS = id(20);

export const card = (n: number, name: string, kinds: string[] = ["tokens"]) => ({ oracleId: id(n), name, typeLine: "Creature — Goblin", kinds });

export function deck(deckId: string, commander: string, commanderId: string, list: ReturnType<typeof card>[], extra: Partial<FitsDeckBlock> = {}): FitsDeckBlock {
  return {
    deckId,
    commanders: [{ oracleId: commanderId, name: commander, typeLine: "Legendary Creature", oracleText: "Make goblins.", kinds: ["tokens"] }],
    plan: { source: "v2", text: "Go wide with goblins, then swing with haste." },
    themes: [],
    list,
    keyCardIds: [],
    lockedIds: [],
    ...extra,
  };
}

export const goblins = deck("deck-goblins", "Krenko, Mob Boss", KRENKO, [
  card(11, "Goblin Instigator"), card(12, "Skirk Prospector", ["sacOutlet"]), card(13, "Beastmaster Ascension", ["pump"]), card(14, "Mountain", []),
], { keyCardIds: [id(13)], lockedIds: [id(14)] });
export const kratos = deck("deck-kratos", "Kratos, God of War", KRATOS, [card(21, "Guttersnipe", ["spellslinger", "drain"]), card(22, "Lightning Greaves", ["protection"])]);
export const omnath = deck("deck-omnath", "Omnath", id(30), [card(31, "Rampant Growth", ["ramp"])], { plan: null, themes: [{ kind: "landfall", n: 9 }] });

export const subject = { oracleId: SUBJECT, name: "Ajani Unrelenting", typeLine: "Legendary Planeswalker — Ajani", oracleText: "+1: Create a token.", kinds: ["tokens", "draw"] };

export function inputs(candidates = ["deck-goblins", "deck-kratos"]): FitsReadInputs {
  return {
    card: subject,
    decks: [goblins, kratos, omnath],
    candidates: candidates.map((deckId) => ({ deckId, need: { role: "draw", have: 2, target: 5 }, inclusion: null })),
  };
}

