import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { writeFileSync } from "node:fs";
import { UpgradeFlow } from "../src/components/decks/precons/upgrade/upgrade-flow";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const R = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/precons/x"><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
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
  ["Sai, Master Thopterist", "2U", true, "Brainstorm", "U", false, 120, "One mana, at instant speed: Muddle becomes a copy in the middle of combat.", "Artifacts"],
  ["Thopter Engineer", "2R", true, "Lightning Bolt", "R", "held", 0, "Three damage for one mana, and Muddle copies something on the way.", "Artifacts"],
  ["Brudiclad, Telchor Engineer", "4UR", false, "Preordain", "U", false, 90, "Another one-mana look ahead, so every turn has a spell to cast.", "Artifacts"],
  ["Wizard’s Staff", "2R", false, "Ponder", "U", true, 0, "Finds the next spell for a single mana.", "Artifacts"],
  ["Pia and Kiran Nalaar", "2RR", false, "Chaos Warp", "2R", false, 90, "Answers any permanent, which red rarely can.", "Artifacts"],
  ["Mind Stone", "2", true, "Fact or Fiction", "3U", false, 50, "Four cards looked at, and the pile you keep is usually two spells.", "Artifacts"],
  ["Etherium Sculptor", "1U", true, "Archmage Emeritus", "2UU", false, 30, "A card for every instant or sorcery.", "Artifacts"],
  ["Retrofitter Foundry", "3", false, "Baral, Chief of Compliance", "1U", false, 180, "Every spell costs one less, and your counterspells draw.", "Artifacts"],
  ["Foundry Inspector", "3", true, "Storm-Kiln Artist", "3R", false, 60, "Treasure for every spell, and Muddle can copy it for more.", "Artifacts"],
  ["Unwinding Clock", "4", false, "Electrostatic Field", "1R", false, 25, "A wall early, and 1 damage to each opponent with every spell.", "Artifacts"],
  ["Lathliss, Dragon Queen", "4R", true, "Guttersnipe", "2R", true, 0, "Two damage to each opponent with every spell.", "Tokens"],
  ["Goblin Instigator", "1R", true, "Veyran, Voice of Duality", "1UR", false, 310, "Your spell triggers happen twice, Muddle’s included.", "Tokens"],
  ["Krenko, Tin Street Kingpin", "2R", false, "Mystic Confluence", "3UUU", false, 160, "A counter, a bounce or three cards, whichever the turn needs.", "Tokens"],
  ["Hellrider", "2RR", false, "Thousand-Year Storm", "4UR", false, 280, "Each spell is copied once for every spell before it that turn.", "Tokens"],
];
const cards: Record<string, any> = { rootha: { cmc: 5, identity: ["U", "R"], owned: true }, muddle: { cmc: 4, identity: ["U", "R"], owned: true } };
const held = { owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "d2", name: "Niv-Mizzet Spells", mature: true }] };
const pairs = P.map((p, i) => {
  const cutId = `cut${i}`, addId = `add${i}`;
  cards[cutId] = { cmc: cmcOf(p[1]), identity: idOf(p[1]), owned: p[2] };
  cards[addId] = { cmc: cmcOf(p[4]), identity: idOf(p[4]), owned: !!p[5], ...(p[5] === "held" ? { claims: held } : {}) };
  return { cutId, cut: p[0], addId, add: p[3], addCents: p[6], reason: p[7], position: i };
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
  rejected: <UpgradeFlow {...base} panel={panel([r1, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true, rejected: ["add0"] }} />,
  "deck-rejected": <UpgradeFlow {...base} apply={deck} panel={panel([r1, r2, r3])} deckOf={used} init={{ opened: "r1", fromStart: true, rejected: ["add0"] }} />,
  history: <UpgradeFlow {...base} panel={panel([r1, r2, r3])} deckOf={used} init={{ history: true }} />,
};
for (const [k, el] of Object.entries(out)) writeFileSync(`hero/${k}.html`, R(el));
console.log("ok", Object.keys(out).length);
