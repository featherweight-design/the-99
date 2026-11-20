import { writeFileSync } from "node:fs";
import { R } from "./base";
import { CreatePreFilled } from "../src/components/decks/create-pre-filled";
import { GuidedFlow, type Strategy, type Plan } from "../src/components/decks/guided/guided-flow";

const A = (n: string) => `art/c-${n}.jpg`;
const strategies: Strategy[] = [
  { key: "bigCreatures", label: "Big creatures", count: 31, blurb: "Every big body you cast makes Ghalta cheaper, and trample turns them into damage.", more: 28,
    examples: [{ name: "Polyraptor", img: A("polyraptor") }, { name: "Beorn the Fierce", img: A("beorn") }, { name: "Cemetery Prowler", img: A("cemetery-prowler") }] },
  { key: "counters", label: "+1/+1 Counters", count: 17, blurb: "Counters grow the board’s power fast, so Ghalta comes down sooner and hits harder.", more: 15,
    examples: [{ name: "Avabruck Caretaker", img: A("avabruck-caretaker") }, { name: "Avenger of Zendikar", img: A("avenger-of-zendikar") }] },
];
const plan: Plan = [
  { name: "Beorn the Fierce", img: A("beorn"), line: "and the other early bodies put power on the board, so Ghalta costs two or three by turn four." },
  { name: "Ghalta", img: A("ghalta"), line: "lands for almost nothing and swings at once: trample makes every blocker a speed bump." },
  { name: "Avenger of Zendikar", img: A("avenger-of-zendikar"), line: "fills the board with Plants, and one big landfall turn tramples through for the win." },
];
const lot = "15 welcome credits";
const base = { oracleId: "g", name: "Ghalta, Primal Hunger", typeLine: "Legendary Creature — Elder Dinosaur", colorIdentity: ["G"], imageUri: A("ghalta"), typedName: "Ghalta Stomps" };
const page = (o: any = {}) => R(<CreatePreFilled {...base} build={{ kind: "guided" }} {...o} />);
const flow = (o: any) => R(<GuidedFlow deck="Ghalta Stomps" commander="Ghalta" strategies={strategies} lot={lot} {...o} />);
const out: Record<string, string> = {};
const P = (s: any, b: any, c: any) => ({ strategy: s, bracket: b, cards: c });
out["g-strategy"] = page() + flow({ stage: { kind: "pick", step: "strategy" }, picks: P("bigCreatures", null, null) });
out["g-strategy0"] = page() + flow({ stage: { kind: "pick", step: "strategy" }, picks: P(null, null, null) });
out["g-bracket"] = page() + flow({ stage: { kind: "pick", step: "bracket" }, picks: P("bigCreatures", 3, null) });
out["g-cards"] = page() + flow({ stage: { kind: "pick", step: "cards" }, picks: P("bigCreatures", 3, "own") });
out["g-wait"] = page() + flow({ stage: { kind: "wait", clock: "0:04", phase: "sharpen" }, picks: P("bigCreatures", 3, "own") });
out["g-wait2"] = page() + flow({ stage: { kind: "wait", clock: "0:09", phase: "plan" }, picks: P("bigCreatures", 3, "own") });
out["g-failed"] = page() + flow({ stage: { kind: "failed" }, picks: P("bigCreatures", 3, "own") });
const result = { sharpened: 14, toBuy: null, plan };
out["g-result"] = page() + flow({ stage: { kind: "result" }, picks: P("bigCreatures", 3, "own"), result });
out["g-short"] = page() + flow({ stage: { kind: "result", short: 9 }, picks: P("bigCreatures", 3, "own"), result });

// Help me choose: the answers carry in
const answers: any = { themes: [{ slug: "bigCreatures", label: "Big creatures", pct: 41 }], themeJoin: "all", sets: [], pool: "any",
  card: { oracleId: "av", name: "Avenger of Zendikar", imageUri: A("avenger-of-zendikar"), owned: true, held: null, price: null, pct: 38 }, cardUnread: false, budgetDollars: 60, bracket: 3 };
const handOff = { answers, create: {} as any, resultsHref: "#", changeHref: "#", drawBlock: true, readReach: false };
out["h-page"] = R(<CreatePreFilled {...base} handOff={handOff} build={{ kind: "guided" }} />);
const keeps = [{ name: "Avenger of Zendikar", img: A("avenger-of-zendikar"), line: "the card you built around · from your answers" }];
const hp = R(<CreatePreFilled {...base} handOff={handOff} build={{ kind: "guided" }} />);
out["h-strategy"] = hp + flow({ stage: { kind: "pick", step: "strategy" }, picks: P("bigCreatures", 3, "budget"), fromAnswers: true, budget: 60, keeps });
out["h-bracket"] = hp + flow({ stage: { kind: "pick", step: "bracket" }, picks: P("bigCreatures", 3, "budget"), fromAnswers: true, budget: 60, keeps });
out["h-cards"] = hp + flow({ stage: { kind: "pick", step: "cards" }, picks: P("bigCreatures", 3, "budget"), fromAnswers: true, budget: 60, keeps });
out["h-result"] = hp + flow({ stage: { kind: "result" }, picks: P("bigCreatures", 3, "budget"), budget: 60, result: { ...result, toBuy: { n: 5, dollars: "$41.80" } } });
// commander-page picks kept
const keepsPicks = [{ name: "Polyraptor", img: A("polyraptor"), line: "one of 2 picks from the commander page" }, { name: "Beorn the Fierce", img: A("beorn"), line: "one of 2 picks from the commander page" }];
out["g-cards-picks"] = page({ selectedOracleIds: ["a", "b"] }) + flow({ stage: { kind: "pick", step: "cards" }, picks: P("bigCreatures", 3, "buy"), keeps: keepsPicks });
for (const [k, v] of Object.entries(out)) writeFileSync(`out/${k}.html`, v);
console.log(Object.keys(out).join(" "));
