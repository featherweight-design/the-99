import type { CheckedSynopsis, SectionId } from "../src/lib/synopsis/types";
const A = (n: string) => `art/c-${n}.jpg`;
const C: Record<string, [string, string]> = {
  "ghalta, primal hunger": ["g", "ghalta"], "polyraptor": ["po", "polyraptor"], "beorn the fierce": ["be", "beorn"],
  "cemetery prowler": ["cp", "cemetery-prowler"], "avabruck caretaker": ["ac", "avabruck-caretaker"], "avenger of zendikar": ["av", "avenger-of-zendikar"],
};
const names: Record<string, string> = { "ghalta, primal hunger": "Ghalta, Primal Hunger", polyraptor: "Polyraptor", "beorn the fierce": "Beorn the Fierce", "cemetery prowler": "Cemetery Prowler", "avabruck caretaker": "Avabruck Caretaker", "avenger of zendikar": "Avenger of Zendikar" };
export const art = new Map(Object.entries(C).map(([k, [id, img]]) => [id, { name: names[k], imageUri: A(img) }]));
export const content: CheckedSynopsis = {
  verdicts: (["overview", "primer", "keyCards", "weaknesses"] as SectionId[]).map((section) => ({ section, status: "ok" as const, failed: 0 as const, total: 2 })),
  overview: "A big-creatures deck that makes [[Ghalta, Primal Hunger]] cheap: every large body on the board takes mana off her cost, and trample turns the board into damage.",
  primer: {
    strategy: [
      "[[Beorn the Fierce]] and [[Cemetery Prowler]] put power on the board early, so Ghalta costs two or three by turn four.",
      "[[Ghalta, Primal Hunger]] lands for almost nothing and swings at once: trample makes every blocker a speed bump.",
      "[[Avenger of Zendikar]] fills the board with Plants, and one big landfall turn tramples through for the win.",
    ],
    mulligan: { keep: ["Three lands and a creature with 4 or more power."], sendBack: ["A hand of only big creatures and two lands."] },
    tips: [
      { cards: ["Polyraptor"], text: "Cast [[Polyraptor]] before a board wipe: its copies come back to rebuild the board." },
      { cards: ["Avabruck Caretaker"], text: "[[Avabruck Caretaker]] grows the creature you swing with, so Ghalta's discount climbs every turn." },
    ],
  },
  keyCards: [
    { card: "Ghalta, Primal Hunger", claims: ["finisher"], job: "The payoff: twelve trample damage for a fraction of her cost." },
    { card: "Avenger of Zendikar", claims: ["finisher"], job: "Turns lands into an army for the last swing." },
    { card: "Polyraptor", claims: ["threat"], job: "A board that copies itself whenever it is hit." },
  ],
  weaknesses: ["Folds to a board wipe before Ghalta lands, with few ways to protect the board."],
  cards: Object.fromEntries(Object.entries(C).map(([k, [id]]) => [k, { oracleId: id, name: names[k] }])),
} as CheckedSynopsis;
export const overview = { content, commanderId: "g", art };
