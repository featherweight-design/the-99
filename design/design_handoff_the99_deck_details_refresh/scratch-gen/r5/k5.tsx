// Large-page keys back to the top (account 2, 2026-11-27): shipped BuilderShell SSR'd with shipped CSS.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { BuilderShell } from "../src/components/decks/builder-shell";
import { recommendedMix } from "../src/lib/decks/mix";
import { provenanceForm } from "../src/lib/cards/price-fact";

mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any; G.__EAGER = true;
const frames: any[] = [];
const ONLY = process.argv[2];
const TAG = process.env.TAG || "after";
export function app(id: string, dev: "phone" | "desk", path: string, main: () => ReactNode, opts: { vh?: number } = {}) {
  if (ONLY && !id.includes(ONLY)) return;
  G.__PATH = path; G.__AV = { initials: "WC", art: null };
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: new Date().toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  writeFileSync(`dz/frames/${id}.html`, renderToString(
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex min-h-dvh flex-1">
        <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
        <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
          <MobileHeader theme="amonkhet" {...door} />
          <main className="relative flex min-w-0 flex-1 flex-col">{main()}</main>
        </div>
        <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
      </div>
    </CardDetailProvider>,
  ));
  frames.push({ id, dev, vh: opts.vh });
}
const ART = ["brudiclad", "cayth", "alibou", "avenger-of-zendikar", "bloodline-keeper", "beorn", "heartless-act", "fire-lord-zuko", "arlinn", "ajani-unrelenting", "assimilation-aegis", "firebending-lesson"];
const img = (i: number) => `art/c-${ART[i % ART.length]}.jpg`;
const NEW = new Date("2026-11-26T12:00:00Z");
const fact = (cents: number | null) => ({ cents, foilCents: null, etchedCents: null, asOf: NEW });
let n = 0;
const card = (name: string, typeLine: string, group: string, role: string, cmc: number, over: any = {}): any => {
  const i = n++;
  return { oracleId: "o-" + i, name, typeLine, cardTypeGroup: group, role, cmc, owned: true, quantity: 1, auto: false,
    price: fact(80 + i * 37), manaCost: null, imageUri: img(i), printedName: null, printedSetCode: null, printedCollectorNumber: null, ...over };
};
const CARDS = [
  card("Goblin Rabblemaster", "Creature — Goblin Warrior", "Creatures", "other", 3),
  card("Legion Warboss", "Creature — Goblin Soldier", "Creatures", "other", 3, { owned: false, price: fact(450) }),
  card("Krenko, Tin Street Kingpin", "Legendary Creature — Goblin", "Creatures", "other", 3),
  card("Purphoros, God of the Forge", "Legendary Enchantment Creature — God", "Creatures", "other", 4, { owned: false, price: fact(1890) }),
  card("Impact Tremors", "Enchantment", "Enchantments", "other", 2),
  card("Shared Animosity", "Enchantment", "Enchantments", "other", 3, { proxied: true }),
  card("Sol Ring", "Artifact", "Artifacts", "ramp", 1),
  card("Arcane Signet", "Artifact", "Artifacts", "ramp", 2),
  card("Jeska's Will", "Sorcery", "Sorceries", "ramp", 3, { owned: false, price: fact(1260) }),
  card("Lightning Bolt", "Instant", "Instants", "removal", 1),
  card("Chaos Warp", "Instant", "Instants", "removal", 3),
  card("Blasphemous Act", "Sorcery", "Sorceries", "wipe", 9),
  card("Faithless Looting", "Sorcery", "Sorceries", "draw", 1),
  card("Valakut Exploration", "Enchantment", "Enchantments", "draw", 3, { owned: false, price: fact(320) }),
  card("Mountain", "Basic Land — Mountain", "Lands", "land", 0, { quantity: 30, price: fact(5) }),
  card("Ancient Den", "Artifact Land", "Lands", "land", 0),
  card("Castle Embereth", "Land", "Lands", "land", 0),
];
const commander: any = { oracleId: "ashling", name: "Ashling, the Limitless", colorIdentity: ["R"], manaCost: "{3}{R}", cmc: 4,
  typeLine: "Legendary Creature — Elemental Shaman", oracleText: null, imageUri: img(7), owned: true };
const built = CARDS.reduce((s, c) => s + c.quantity, 0);
const toBuy = CARDS.filter((c) => !c.owned).length;
const DECK: any = { id: "d1", name: "Ashen Banner Parade", createdAt: new Date("2026-09-01"), filled: false, commander, partner: null, cards: CARDS,
  unresolvedRows: [], built, ownedCount: built - toBuy, coveredCount: built - toBuy, toBuyCount: toBuy, total: built, declaredBracket: 3,
  intent: null, intentSeeded: false, noteCounts: { gameChanger: 1, extraTurns: 0, tutor: 0 }, limits: { capCents: 1000, sets: [], ownedOnly: false } };
const sug = (name: string, role: string, i: number, over: any = {}): any => ({ facts: null, oracleId: "s-" + i, reason: "edhrec", reasonType: "edhrec", reasonLabel: "EDHREC staple",
  owned: i % 3 !== 0, inDeck: false, typeLine: "Artifact", cardTypeGroup: "Artifacts", role, imageUri: img(i + 3), manaCost: "{2}", manaValue: 2, inclusionPct: 40 - i, lift: null, synergyFigure: null, ...over });
const SUGS = [
  sug("Mind Stone", "ramp", 0), sug("Fellwar Stone", "ramp", 1), sug("Thought Vessel", "ramp", 2), sug("Wayfarer's Bauble", "ramp", 3), sug("Talisman of Conviction", "ramp", 4),
  sug("Abrade", "removal", 5), sug("Abrupt Decay", "removal", 6), sug("Vandalblast", "removal", 7), sug("Feed the Swarm", "removal", 8),
  sug("Light Up the Stage", "draw", 9), sug("Wheel of Fortune", "draw", 10), sug("Reckless Impulse", "draw", 11), sug("Big Score", "draw", 12),
  sug("Anger of the Gods", "wipe", 13), sug("Vandal Blast", "wipe", 14),
];
const shell = (over: any) => () => (
  <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={SUGS} degraded={false} firstRun={false}
    commanderIdentity={["R"]} arrivedFromImport={false} newestAsOf={NEW} provenance={provenanceForm(NEW, new Date("2026-11-27T03:00:00Z"))} {...over} />
);
for (const [k, o, vd, vp] of [["A", {}, 1740, 2460], ["S", { initialBody: "shopping" }, 1540, 2160], ["K", { initialView: "tuning", initialHubTool: "consider" }, 3130, 4890]] as const) {
  app(`${k}-desk`, "desk", "/decks/d1", shell(o), { vh: vd });
  app(`${k}-phone`, "phone", "/decks/d1", shell(o), { vh: vp });
}
writeFileSync("dz/frames.json", JSON.stringify(frames));
