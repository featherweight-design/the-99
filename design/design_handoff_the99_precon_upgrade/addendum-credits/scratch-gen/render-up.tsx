import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { UpgradeFlow } from "../src/components/decks/precons/upgrade/upgrade-flow";
const strat = (key: string, label: string, blurb: string, cards: [string, string][], n: number) => ({ key, label, blurb, source: "edhrec" as const,
  backingIds: cards.map((c) => c[0]), backing: [...cards.map(([id, name]) => ({ oracleId: id, name })), ...Array.from({ length: n - cards.length }, (_, i) => ({ oracleId: `x${i}`, name: `x${i}` }))] });
const spells = strat("spellslinger", "Spells", "Cast cheap instants and sorceries, and each one turns Muddle into a copy of your best creature for the turn.", [["counterspell", "Counterspell"], ["swan", "Swan Song"], ["searing", "Searing Touch"]], 28);
const tokens = strat("tokens", "Tokens", "Muddle’s copies arrive as tokens at every opponent, so creatures that make more tokens get copied the most.", [["lathliss", "Lathliss, Dragon Queen"], ["ashling", "Ashling, the Limitless"], ["sai", "Sai, Master Thopterist"]], 9);
const art = new Map(Object.entries({ counterspell: "art/c-counterspell.jpg", swan: "art/c-swan-song.jpg", searing: "art/c-searing-touch.jpg", lathliss: "art/c-lathliss.jpg", ashling: "art/c-ashling.jpg", sai: "art/c-sai.jpg", rootha: "art/c-rootha.jpg", muddle: "art/c-muddle.jpg" }));
const nextAt = new Date("2026-11-13T10:01:00Z");
const A: Record<string, any> = {
  one_on: { used: 0, limit: 1, reopensAt: null, nextAt: null, payments: true },
  one_off: { used: 0, limit: 1, reopensAt: null, nextAt: null, payments: false },
  zero_on: { used: 1, limit: 1, reopensAt: nextAt, nextAt, payments: true },
  zero_off: { used: 1, limit: 1, reopensAt: nextAt, nextAt, payments: false },
  back: { used: 0, limit: 1, reopensAt: null, nextAt: null, payments: true, pack: 40, paidUsedToday: 0, paidLimit: 20 },
};
const panel = (a: any) => ({ boxBracket: 2, runs: [], listFp: "x", cards: {}, allowance: a,
  commanders: [
    { key: "rootha", isFace: true, cards: [{ oracleId: "rootha", name: "Rootha, Mercurial Artist", manaCost: "{3}{U}{R}", cmc: 5, typeLine: "Legendary Creature" }], line: "Copies your instants and sorceries, and turns each copy into an Elemental.", strategies: [spells] },
    { key: "muddle", isFace: false, cards: [{ oracleId: "muddle", name: "Muddle, the Ever-Changing", manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }], line: "Each instant or sorcery you cast turns Muddle into a copy of your best creature.", strategies: [spells, tokens] },
  ] });
for (const [k, a] of Object.entries(A)) {
  for (const step of ["intro", "strategy"] as const) {
    const html = renderToString(<UpgradeFlow precon="Prismari Artistry" panel={panel(a) as any} art={art} onClose={() => {}} onConfirm={() => {}} initStep={step} initPicks={{ commander: "muddle", bracket: 3, strategy: step === "strategy" ? "spellslinger" : null } as any} />);
    writeFileSync(`hero/up-${k}-${step}.html`, html);
  }
}
