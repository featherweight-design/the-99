import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { writeFileSync } from "node:fs";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { UpgradeFlow } from "../src/components/decks/precons/upgrade/upgrade-flow";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const R = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/precons/x"><SearchParamsContext.Provider value={new URLSearchParams() as any}><CardDetailProvider fetchCard={(async () => null) as any}>{el}</CardDetailProvider></SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
const strat = (key: string, label: string, blurb: string, cards: [string, string][], n: number) => ({ key, label, blurb, source: "edhrec" as const,
  backingIds: cards.map((c) => c[0]), backing: [...cards.map(([id, name]) => ({ oracleId: id, name })), ...Array.from({ length: n - cards.length }, (_, i) => ({ oracleId: `x${i}`, name: `x${i}` }))] });
const spells = strat("spellslinger", "Spells", "Cast cheap instants and sorceries, and each one turns Muddle into a copy of your best creature for the turn.", [["counterspell", "Counterspell"], ["swan", "Swan Song"], ["searing", "Searing Touch"]], 28);
const tokens = strat("tokens", "Tokens", "Muddle’s copies arrive as tokens at every opponent, so creatures that make more tokens get copied the most.", [["lathliss", "Lathliss, Dragon Queen"], ["ashling", "Ashling, the Limitless"], ["sai", "Sai, Master Thopterist"]], 9);
const art = new Map(Object.entries({ counterspell: "art/c-counterspell.jpg", swan: "art/c-swan-song.jpg", searing: "art/c-searing-touch.jpg", lathliss: "art/c-lathliss.jpg", ashling: "art/c-ashling.jpg", sai: "art/c-sai.jpg", rootha: "art/c-rootha.jpg", muddle: "art/c-muddle.jpg" }));
const ID: Record<string, string> = { U: "U", R: "R", "2": "", "3": "", "4": "" };
const idOf = (c: string) => [...new Set(c.split("").filter((x) => x === "U" || x === "R"))];
const cmcOf = (c: string) => c.split("").reduce((n, x) => n + (/\d/.test(x) ? +x : 1), 0);
// [cut, cutCost, cutOwned, add, addCost, addOwned, price, why, theme]
const P: any[] = [
  ["Sai, Master Thopterist", "2U", true, "Counterspell", "UU", false, 150, "Two mana, at instant speed: stops their best spell and turns Muddle into a copy.", "Artifacts", "Makes Thopters off artifacts, and the deck casts fewer of them now.", "Creatures", "Instants", null, null, "Creature — Human Artificer", "Instant"],
  ["Thopter Engineer", "2R", true, "Lightning Bolt", "R", "held", 0, "Three damage for one mana, and Muddle copies something on the way.", "Artifacts", "Its haste is for artifact creatures, and few are left.", "Creatures", "Instants", "removal", null, "Creature — Human Artificer", "Instant"],
  ["Brudiclad, Telchor Engineer", "4UR", false, "Swan Song", "U", false, 1290, "One mana answers their best instant, sorcery or enchantment.", "Artifacts", "Six mana for a token plan the deck no longer runs.", "Creatures", "Instants", "removal", null, "Legendary Artifact Creature — Phyrexian Artificer", "Instant"],
  ["Wizard’s Staff", "2R", false, "Searing Touch", "R", true, 0, "Cheap removal that copies well, and you own a spare.", "Artifacts", "An equipment the deck rarely has a body for.", "Artifacts", "Instants", "removal", null, "Artifact — Equipment", "Instant"],
  ["Pia and Kiran Nalaar", "2RR", false, "Chaos Warp", "2R", false, 90, "Answers any permanent, which red rarely can.", "Artifacts", "Thopters for an artifact count the deck has left.", "Creatures", "Instants", "removal", null, "Legendary Creature — Human Artificer", "Instant"],
  ["Mind Stone", "2", true, "Mystical Tutor", "U", false, 520, "Puts the spell the turn needs on top, for one mana.", "Artifacts", "Ramp the deck has enough of at this curve.", "Artifacts", "Instants", null, "ramp", "Artifact", "Instant"],
  ["Etherium Sculptor", "1U", true, "Archmage Emeritus", "2UU", false, 30, "A card for every instant or sorcery.", "Artifacts", "Discounts artifacts, and the deck casts spells instead.", "Creatures", "Creatures", "draw", null, "Artifact Creature — Vedalken Artificer", "Creature — Human Wizard"],
  ["Retrofitter Foundry", "3", false, "Baral, Chief of Compliance", "1U", false, 180, "Every spell costs one less, and your counterspells draw.", "Artifacts", "A slow engine that wants spare mana every turn.", "Artifacts", "Creatures", "draw", null, "Artifact", "Legendary Creature — Human Wizard"],
  ["Foundry Inspector", "3", true, "Storm-Kiln Artist", "3R", false, 60, "Treasure for every spell, and Muddle can copy it for more.", "Artifacts", "Its discount is for artifacts only.", "Artifacts", "Creatures", "ramp", null, "Artifact Creature — Construct", "Creature — Dwarf Shaman"],
  ["Unwinding Clock", "4", false, "Electrostatic Field", "1R", false, 25, "A wall early, and 1 damage to each opponent with every spell.", "Artifacts", "Untaps artifacts the deck no longer plays.", "Artifacts", "Creatures", null, null, "Artifact", "Creature — Wall"],
  ["Lathliss, Dragon Queen", "4R", true, "Guttersnipe", "2R", true, 0, "Two damage to each opponent with every spell.", "Tokens", "Five mana for Dragons the deck doesn’t cast.", "Creatures", "Creatures", null, null, "Legendary Creature — Dragon", "Creature — Goblin Shaman"],
  ["Goblin Instigator", "1R", true, "Veyran, Voice of Duality", "1UR", false, 310, "Your spell triggers happen twice, Muddle’s included.", "Tokens", "Two small bodies, and the deck isn’t going wide.", "Creatures", "Creatures", null, null, "Creature — Goblin Rogue", "Legendary Creature — Efreet Wizard"],
  ["Krenko, Tin Street Kingpin", "2R", false, "Mystic Confluence", "3UUU", false, 160, "A counter, a bounce or three cards, whichever the turn needs.", "Tokens", "Goblins need attacks the spell plan won’t make.", "Creatures", "Instants", "draw", null, "Legendary Creature — Goblin Warrior", "Instant"],
  ["Hellrider", "2RR", false, "Thousand-Year Storm", "4UR", false, 280, "Each spell is copied once for every spell before it that turn.", "Tokens", "Rewards a wide attack the deck won’t make.", "Creatures", "Enchantments", null, null, "Creature — Devil", "Enchantment"],
];
const IMG: Record<string, string> = { Counterspell: "art/c-counterspell.jpg", "Swan Song": "art/c-swan-song.jpg", "Searing Touch": "art/c-searing-touch.jpg", "Mystical Tutor": "art/c-mystical-tutor.jpg", "Sai, Master Thopterist": "art/c-sai.jpg", "Brudiclad, Telchor Engineer": "art/c-brudiclad.jpg", "Wizard’s Staff": "art/c-wizards-staff.jpg", "Lathliss, Dragon Queen": "art/c-lathliss.jpg" };
const cards: Record<string, any> = { rootha: { cmc: 5, identity: ["U", "R"], owned: true }, muddle: { cmc: 4, identity: ["U", "R"], owned: true } };
const held = { owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "d2", name: "Niv-Mizzet Spells", mature: true }] };
const pairs = P.map((p, i) => {
  const cutId = `cut${i}`, addId = `add${i}`;
  cards[cutId] = { cmc: cmcOf(p[1]), identity: idOf(p[1]), owned: p[2], group: p[10], role: p[13], typeLine: p[14], image: IMG[p[0]] ?? null };
  cards[addId] = { cmc: cmcOf(p[4]), identity: idOf(p[4]), owned: !!p[5], ...(p[5] === "held" ? { claims: held } : {}), group: p[11], role: p[12], typeLine: p[15], image: IMG[p[3]] ?? null, bracketAfter: p[3] === "Mystical Tutor" ? [3] : null };
  return { cutId, cut: p[0], addId, add: p[3], addCents: p[6], reason: p[7], cutReason: p[9], position: i };
});
const themes = Object.fromEntries(P.map((p, i) => [`cut${i}`, p[8]]));
const toBuy = { cards: P.filter((p) => !p[5]).length, cents: P.reduce((n, p) => n + (p[5] ? 0 : p[6]), 0) };
const run = (o: any) => ({ status: "done", refunded: false, pairs, buyTotalCents: toBuy.cents, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy, owned: 14 - toBuy.cards, themes, started: false, ...o });
const r1 = run({ id: "r1", strategyKey: "muddle/3/spellslinger", strategyLabel: "Spells", createdAt: new Date("2026-11-12T19:00:00Z") });
const r2 = run({ id: "r2", strategyKey: "muddle/3/tokens", strategyLabel: "Tokens", createdAt: new Date("2026-11-11T19:00:00Z"), pairs: pairs.slice(0, 12) });
const r3 = run({ id: "r3", strategyKey: "rootha/2/spellslinger", strategyLabel: "Spells", createdAt: new Date("2026-11-10T19:00:00Z"), bracketTarget: 2, bracketAfter: 2, refunded: true, pairs: pairs.slice(0, 9) });
const allowance = { used: 1, limit: 1, reopensAt: null, nextAt: null, payments: true, pack: 13 };
const commanders = [
  { key: "rootha", isFace: true, cards: [{ oracleId: "rootha", name: "Rootha, Mercurial Artist", manaCost: "{3}{U}{R}", cmc: 5, typeLine: "Legendary Creature" }], line: "Copies your instants and sorceries, and turns each copy into an Elemental.", strategies: [spells] },
  { key: "muddle", isFace: false, cards: [{ oracleId: "muddle", name: "Muddle, the Ever-Changing", manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }], line: "Each instant or sorcery you cast turns Muddle into a copy of your best creature.", strategies: [spells, tokens] },
];
const panel = (runs: any[]) => ({ boxBracket: 2, runs, listFp: "x", cards, allowance, commanders }) as any;
const used = (id: string) => (id === "r1u" ? "Prismari Artistry" : id === "r2" ? "Muddle Tokens" : null);
const base = { fileName: "prismari", precon: "Prismari Artistry", art, onClose() {}, onConfirm() {}, onStart() {} } as any;
const deck = { nextVersion: 1, onApply() {}, pending: false, refusals: {} };
const r1u = { ...r1, id: "r1u", started: true };
const out: Record<string, any> = {
  // S0 first time: as shipped
  first: <UpgradeFlow {...base} panel={panel([])} />,
  // F1 applied: start screen, last run used in a deck
  applied: <UpgradeFlow {...base} panel={panel([r1u, r2, r3])} deckOf={used} />,
  "applied-open": <UpgradeFlow {...base} panel={panel([r1u, r2, r3])} deckOf={used} init={{ opened: "r1u", fromStart: true }} />,
  // F2 not applied
  open: <UpgradeFlow {...base} panel={panel([r1, r2, r3])} deckOf={used} />,
  "open-open": <UpgradeFlow {...base} panel={panel([r1, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true }} />,
  "deck-open": <UpgradeFlow {...base} apply={deck} panel={panel([r1, r2, r3])} deckOf={used} />,
  "deck-open-open": <UpgradeFlow {...base} apply={deck} panel={panel([r1, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true }} />,
  // F3 in progress: resumes on the wait
  wait: <UpgradeFlow {...base} panel={panel([r1u, r2, r3])} deckOf={used} view={{ kind: "wait", picks: { commander: "muddle", bracket: 3, strategy: "tokens" }, startedAt: Date.now() - 5000 }} />,
  // landed while away: result once
  landed: <UpgradeFlow {...base} panel={panel([{ ...r2, id: "r4", createdAt: new Date("2026-11-15T17:00:00Z") }, r1u, r3])} deckOf={used} view={{ kind: "results", runId: "r4" }} />,
  // R2: Sai stays, Wizard's Staff goes for Counterspell (Searing Touch not picked)
  mixed: <UpgradeFlow {...base} panel={panel([{ ...r1, unpicked: ["c-cut0", "a-add3"] }, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true }} />,
  "deck-mixed": <UpgradeFlow {...base} apply={deck} panel={panel([{ ...r1, unpicked: ["c-cut0", "a-add3"] }, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true }} />,
  // one side short: counts must match
  uneven: <UpgradeFlow {...base} panel={panel([{ ...r1, unpicked: ["c-cut0"] }, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true }} />,
  // Mystical Tutor not picked: the bracket stays 2
  missed: <UpgradeFlow {...base} panel={panel([{ ...r1, unpicked: ["a-add5", "c-cut5"] }, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true, seedSet: [2] }} />,
  history: <UpgradeFlow {...base} panel={panel([r1, r2, r3])} deckOf={used} init={{ history: true }} />,
};
for (const [k, el] of Object.entries(out)) writeFileSync(`hero/${k}.html`, R(el));
console.log("ok", Object.keys(out).length);
