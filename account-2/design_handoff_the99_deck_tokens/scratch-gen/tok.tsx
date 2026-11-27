// Tokens surfacing R1 (account 2, 2026-11-27): the shipped deck page SSR'd with shipped CSS.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { BuilderShell } from "../src/components/decks/builder-shell";
import { DeckTokensProvider } from "../src/components/decks/deck-tokens-context";
import { recommendedMix } from "../src/lib/decks/mix";
import { provenanceForm } from "../src/lib/cards/price-fact";
import { ChangeCommanderProvider } from "../src/components/decks/change-commander-context";
import { SwapToolsProvider } from "../src/lib/swaps/context";

mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any; G.__EAGER = true;
const frames: any[] = existsSync("dz/frames.json") && process.argv[3] === "append" ? JSON.parse(readFileSync("dz/frames.json", "utf8")) : [];
const ONLY = process.argv[2] && process.argv[2] !== "all" ? process.argv[2] : null;
export function app(id: string, dev: "phone" | "desk", path: string, main: () => ReactNode, opts: { vh?: number; ls?: Record<string, string> } = {}) {
  if (ONLY && !id.includes(ONLY)) return;
  G.__PATH = path; G.__AV = { initials: "WC", art: null };
  // The stored view and fold, as the shell's useStoredView reads them.
  G.__LS = opts.ls ?? {};
  G.localStorage = { _s: { ...(opts.ls ?? {}) }, getItem(k: string) { return this._s[k] ?? null; }, setItem(k: string, v: string) { this._s[k] = v; }, removeItem(k: string) { delete this._s[k]; } };
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
const ART = ["brudiclad", "cayth", "alibou", "avenger-of-zendikar", "bloodline-keeper", "beorn", "heartless-act", "fire-lord-zuko", "arlinn", "ajani-unrelenting", "firebending-lesson", "assimilation-aegis"];
const img = (i: number) => `art/c-${ART[i % ART.length]}.jpg`;

let n = 0;
const card = (name: string, typeLine: string, group: string, role: any, cmc: number, over: any = {}): any => ({
  oracleId: "o-" + name.toLowerCase().replace(/\W+/g, "-"), name, typeLine, cardTypeGroup: group, role, cmc, owned: true, quantity: 1, auto: false,
  manaCost: null, imageUri: img(n++), printedName: null, printedSetCode: null, printedCollectorNumber: null, ...over });
const P = (cents: number) => ({ cents, foilCents: null, etchedCents: null, asOf: new Date("2026-11-26") });
const C = (names: string, type: string, group: string, role: any) => names.split("|").map((nm) => card(nm, type, group, role, 2));
const CARDS = [
  card("Burnished Hart", "Artifact Creature — Elk", "Creatures", "ramp", 3),
  card("Dockside Extortionist", "Creature — Goblin Pirate", "Creatures", "ramp", 2, { facts: ["gameChanger"] }),
  card("Flamekin Harbinger", "Creature — Elemental Shaman", "Creatures", "other", 1, { facts: ["tutor"] }),
  card("Foundry Inspector", "Artifact Creature — Construct", "Creatures", "ramp", 3),
  card("Fury", "Creature — Elemental Incarnation", "Creatures", "removal", 5),
  card("Ornithopter of Paradise", "Artifact Creature — Thopter", "Creatures", "ramp", 2),
  card("Pia Nalaar", "Legendary Creature — Human Artificer", "Creatures", "other", 3),
  card("Professional Face-Breaker", "Creature — Human Warrior", "Creatures", "ramp", 3),
  card("Smokebraider", "Creature — Elemental Shaman", "Creatures", "ramp", 2),
  card("Solemn Simulacrum", "Artifact Creature — Golem", "Creatures", "ramp", 4),
  card("Soulbright Flamekin", "Creature — Elemental Shaman", "Creatures", "ramp", 2, { owned: false, price: P(15) }),
  ...C("Abrade|Bolt Bend|Chaos Warp|Deflecting Swat|Lightning Bolt|Pyroblast|Red Elemental Blast|Return the Favor|Tibalt's Trickery|Untimely Malfunction", "Instant", "Instants", "removal"),
  ...C("Big Score|Demand Answers|Seething Song|Thrill of Possibility|Unexpected Windfall", "Instant", "Instants", "draw"),
  card("Gamble", "Sorcery", "Sorceries", "other", 1, { facts: ["tutor"] }),
  card("Jeska's Will", "Sorcery", "Sorceries", "ramp", 3, { owned: false, price: P(3855), facts: ["gameChanger"] }),
  ...C("Tempt with Vengeance|Storm Herd", "Sorcery", "Sorceries", "other"),
  ...C("Vandalblast|Chain Reaction|Blasphemous Act", "Sorcery", "Sorceries", "wipes"),
  ...C("Faithless Looting|Wheel of Fortune|Reforge the Soul", "Sorcery", "Sorceries", "draw"),
  ...C("Sol Ring|Arcane Signet|Mind Stone|Fellwar Stone|Thought Vessel|Everflowing Chalice|Coalition Relic|Chromatic Lantern|Commander's Sphere|Lightning Greaves|Swiftfoot Boots", "Artifact", "Artifacts", "ramp"),
  ...C("Rhystic Study|Mystic Remora|Valakut Exploration", "Enchantment", "Enchantments", "draw"),
  ...C("Smothering Tithe", "Enchantment", "Enchantments", "ramp"),
  ...C("Impact Tremors|Purphoros, God of the Forge|Warstorm Surge", "Enchantment", "Enchantments", "other"),
  ...C("Goldspan Dragon|Laelia, the Blade Reforged|Magda, Brazen Outlaw|Combat Celebrant", "Creature", "Creatures", "other"),
  ...C("Command Tower|Exotic Orchard|Path of Ancestry|City of Brass|Mana Confluence|Reflecting Pool|Battlefield Forge|Sulfurous Springs|Spirebluff Canal|Rugged Highlands|Wind-Scarred Crag", "Land", "Lands", "land"),
  card("Mountain", "Basic Land — Mountain", "Lands", "land", 0, { quantity: 30 }),
];
const commander: any = { oracleId: "o-ashling", name: "Ashling, the Limitless", colorIdentity: ["W", "U", "B", "R", "G"], manaCost: "{3}{R}", typeLine: "Legendary Creature — Elemental Shaman", oracleText: null, imageUri: img(3), artCropUri: "art/ashling-crop.jpg" };
const built = CARDS.reduce((s, c) => s + c.quantity, 0);
const DECK: any = { id: "d1", name: "Ashen Banner Parade", createdAt: new Date("2026-10-02"), filled: false, commander, partner: null, cards: CARDS, unresolvedRows: [],
  built, ownedCount: built - 2, coveredCount: built - 2, toBuyCount: 2, total: built, declaredBracket: null, intent: null, intentSeeded: false };

const mk = (name: string) => ({ oracleId: "o-" + name.toLowerCase().replace(/\W+/g, "-"), name, imageUri: null });
const tok = (name: string, typeLine: string, colors: string[], p: string | null, t: string | null, makers: string[], state: any, pic: string | null, cents: number | null, sc = "TLC", cn = "1"): any => ({
  oracleId: "t-" + name.toLowerCase(), name, typeLine, colors, power: p, toughness: t, oracleText: null, makers: makers.map(mk), state, source: state === "owned" ? "upload" : null, joined: false,
  picture: pic ? { scryfallId: "s-" + name, setCode: sc, collectorNumber: cn, imageUri: pic, imageUriSmall: pic, artCropUri: pic, printings: 12 } : null, printingPick: null,
  price: cents == null ? null : { cents, foilCents: null, etchedCents: null, asOf: new Date("2026-11-26"), printing: { scryfallId: "s-" + name, setCode: sc.toLowerCase(), collectorNumber: cn, productName: name, productSet: sc.toLowerCase(), productNumber: cn } } });
const TP = (f: string) => (existsSync(`out/art/${f}`) ? `art/${f}` : null);
export const TOKENS: any = { status: "ok", read: true, makerCount: 7, newestPriceAsOf: new Date("2026-11-26"), tokens: [
  tok("Treasure", "Token Artifact — Treasure", [], null, null, ["Big Score", "Dockside Extortionist", "Professional Face-Breaker", "Unexpected Windfall"], "owned", TP("t-treasure.jpg"), 25, "SLD", "2931"),
  tok("Elemental", "Token Creature — Elemental", ["R"], "1", "1", ["Tempt with Vengeance"], "not", TP("t-elemental.jpg"), 35, "SLD", "2906"),
  tok("Thopter", "Token Artifact Creature — Thopter", [], "1", "1", ["Pia Nalaar"], "not", TP("t-thopter.jpg"), 20, "FRA", "14"),
  tok("Goblin", "Token Creature — Goblin", ["R"], "1", "1", ["Smokebraider"], "owned", TP("t-goblin.jpg"), 15, "FRC", "9"),
] };

const FLIP = Array.from({ length: 22 }, (_, i) => ({ id: i === 1 ? "d1" : "f" + i, name: i === 1 ? "Ashen Banner Parade" : i === 0 ? "Abzan Counters" : "Brew " + String.fromCharCode(65 + i), createdAt: Date.UTC(2026, 0, 1) - i * 1000, lastPlayedAt: Date.UTC(2026, 10, 20) - i * 1000, sortPosition: i }));
const shell = (over: any = {}) => () => (
  <DeckTokensProvider deckId="d1" read={TOKENS}>
    <ChangeCommanderProvider deckId="d1" deckName="Ashen Banner Parade" pair={false} hasVersion>
    <SwapToolsProvider deckId="d1" deckName="Ashen Banner Parade" storedLimitCents={null}>
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false} commanderIdentity={commander.colorIdentity}
      arrivedFromImport={false} newestAsOf={new Date("2026-11-26")} versions={[{ number: 2, committedAt: new Date("2026-11-13"), cardCount: 99 } as any, { number: 1, committedAt: new Date("2026-10-12"), cardCount: 99 } as any]}
            draft={{ version: { id: "v2", number: 2, committedAt: new Date("2026-11-13T18:00:00Z"), note: null, commanderOracleId: "x", partnerOracleId: null, commanderSince: new Date("2026-10-12"), partnerSince: null }, adds: [], addChanges: [], removes: [], names: new Map(), costs: new Map(), prices: new Map(), pullFrom: new Map(), claimsKnown: true } as any}
            flipDecks={FLIP}
      nearCombos={{ total: 5, combos: [] } as any} provenance={provenanceForm(new Date("2026-11-26T08:00:00Z"), new Date("2026-11-27T03:00:00Z"))} {...over} />
    </SwapToolsProvider>
    </ChangeCommanderProvider>
  </DeckTokensProvider>
);
// Each frame: BEFORE (main, G.__TOK unset) or a concept. `ls` seeds the stored view and the Tokens fold.
const F = (id: string, tok: string | undefined, dev: "desk" | "phone", vh: number, over: any = {}, ls: Record<string, string> = {}) =>
  app(id, dev, "/decks/d1", () => { G.__TOK = tok; return shell(over)(); }, { vh, ls });
const OPEN = {}, FOLD = { "the99:deck-tokens-fold": "closed" }, CARDV = { "the99:deck-view": "card" };
for (const [dev, vh] of [["desk", 2300], ["phone", 3600]] as const) {
  F(`before-${dev}`, undefined, dev, vh, {}, OPEN);
  F(`before-fold-${dev}`, undefined, dev, vh, {}, FOLD);
  F(`base-${dev}`, "base", dev, vh, {}, OPEN);
  F(`base-fold-${dev}`, "base", dev, vh, {}, FOLD);
  F(`base-cards-${dev}`, "base", dev, vh + 400, {}, CARDV);
  F(`A-${dev}`, "A", dev, vh, {}, FOLD);
  F(`B-${dev}`, "B", dev, vh, {}, FOLD);
  F(`C-${dev}`, "C", dev, 1400, { initialBody: "shopping" }, FOLD);
  F(`before-shop-${dev}`, undefined, dev, 1400, { initialBody: "shopping" }, FOLD);
}
G.__TOK = undefined;
writeFileSync("dz/frames.json", JSON.stringify(frames));
