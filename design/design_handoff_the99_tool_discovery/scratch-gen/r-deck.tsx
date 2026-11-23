// Finding the tools (account 1, 2026-11-23): the deck page frames, today and with a Tuning tab.
import { writeFileSync } from "node:fs";
import type { ReactNode } from "react";
import { shell, W } from "./shell";
import { SpineMobile } from "../src/components/decks/spine-mobile";
import { SpineDesktop } from "../src/components/decks/spine-desktop";
import { BuilderTabs } from "../src/components/decks/builder-tabs";
import { TuningHub } from "../src/components/decks/tuning-hub";
import { builderTabSpecs } from "../src/lib/decks/builder-tab-specs";
import { CardDetailContext } from "../src/components/cards/card-detail-context";
import { projected } from "../src/lib/demo/projected";

const G = globalThis as any;
const CTX: any = new Proxy({}, { get: (_t, k) => (k === "then" ? undefined : () => undefined) });
const P: any = projected();
const D = P.decks.played;
export const deck: any = {
  id: "d1", name: D.deckName, intent: null,
  commander: { ...D.commander, artCropUri: "art/a-ashling.jpg", imageUri: "art/c-ashling.jpg" },
  partner: null,
};
export const spine = () => {
  const p: any = { deck, counts: { built: 99, ownedCount: 93, toBuyCount: 6 }, status: "Built" as const, onExport: () => {} };
  return <><SpineDesktop {...p} /><SpineMobile {...p} /></>;
};
const tabsOld = builderTabSpecs({ built: 99, suggestionCount: 40, gameCount: 6, versionCount: 3 });
// The proposal: Consider leaves the row, Tuning joins it after Analysis.
export const tabsNew = (() => {
  const t = tabsOld.filter((x) => x.id !== "consider");
  const i = t.findIndex((x) => x.id === "analysis") + 1;
  t.splice(i, 0, { id: "tuning" as any, label: "Tuning", accessibleName: "Tuning, tools for this deck" });
  return t;
})();
export const TILES: any = {
  suggested_changes: { kind: "ok", at: "2026-11-18T19:00:00Z", accepted: 3, total: 5 },
  mana: "2026-11-20T19:00:00Z",
  proposed_cuts: null,
  history: { runs: 4, running: 0 },
};
export function hubTools(considerPanel: ReactNode = <div />) {
  return [
    { tool: "consider" as const, panel: considerPanel, owned: 14, toBuy: 26 },
    { tool: "suggested" as const, panel: <div />, v2: null },
    { tool: "mana" as const, panel: <div /> },
    { tool: "cuts" as const, panel: <div />, over: 0, total: 100 },
    { tool: "history" as const },
  ];
}
export function deckPage(name: string, dev: "phone" | "desk", tabs: any[], view: string, body: ReactNode) {
  G.__VW = dev === "desk" ? 1300 : 390;
  const html = shell(
    <CardDetailContext.Provider value={CTX}>
      <div className="flex flex-col min-h-dvh" style={{ background: "var(--bg)" }}>
        {spine()}
        <BuilderTabs tabs={tabs} view={view as any} onViewChange={() => {}} />
        {body}
      </div>
    </CardDetailContext.Provider>, "/decks/d1");
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0;
}
const hub = (open?: string, panel?: ReactNode) => {
  G.__TILES = TILES; G.__INTAB = true; G.__OPEN = open;
  const el = <div id="panel-tuning" role="tabpanel" className="px-[16px] pb-[30px] md:px-[30px]"><TuningHub deckId="d1" drawn tools={hubTools(panel) as any} /></div>;
  return el;
};
if (process.argv[2] === "smoke") {
  for (const dev of ["phone", "desk"] as const) {
    const d = dev === "desk" ? "d" : "p";
    deckPage(`${d}-t1`, dev, tabsNew, "tuning", hub());
    deckPage(`${d}-t0`, dev, tabsOld, "analysis", <div />);
  }
}
import { ConsiderPanel } from "../src/components/decks/consider-panel";
import { recommendedMix } from "../src/lib/decks/mix";
const sug = (slug: string, name: string, reason: any, role: any, owned: boolean, type: string, cost: string, mv: number): any => ({
  oracleId: "o-" + slug, name, printedName: null, reason, reasonType: reason === "edhrec" ? "synergy" : "role", reasonLabel: reason, owned, inDeck: false,
  typeLine: type, comboPartner: null, cardTypeGroup: type.includes("Creature") ? "Creatures" : type.includes("Planeswalker") ? "Planeswalkers" : "Instants", role,
  imageUri: `art/c-${slug}.jpg`, manaCost: cost, manaValue: mv, inclusionPct: 30 + mv * 3, lift: null, synergyFigure: null,
  availability: owned ? { owned: 1, hard: 0, soft: 0, free: 1, claims: [] } : null, price: owned ? null : { cents: 349, foilCents: null, etchedCents: null, asOf: new Date("2026-11-22") }, facts: null,
});
const SUGS = [
  sug("killian", "Killian, Decisive Mentor", "draw", "draw", true, "Legendary Creature — Human Warlock", "{W}{B}", 2),
  sug("jace", "Jace, Multiverse Architect", "draw", "draw", true, "Legendary Planeswalker — Jace", "{1}{U}{U}", 3),
  sug("tam", "Tam, the Possibility", "draw", "draw", true, "Legendary Creature — Gorgon Wizard", "{1}{G}{U}", 3),
  sug("card-sai", "Sai, Master Thopterist", "draw", "draw", false, "Legendary Creature — Human Artificer", "{2}{U}", 3),
  sug("miku", "Miku, Song of the People", "ramp", "ramp", true, "Legendary Creature — Dryad", "{2}{G}{W}", 4),
  sug("muddle", "Muddle, the Ever-Changing", "ramp", "ramp", true, "Legendary Creature — Elemental Shapeshifter", "{2}{G}{U}", 4),
  sug("quintorius", "Quintorius, History Chaser", "edhrec", "other", true, "Legendary Planeswalker — Quintorius", "{3}{R}{W}", 5),
  sug("heroes", "Heroes in a Half Shell", "edhrec", "other", false, "Legendary Creature — Mutant Ninja Turtle", "{W}{U}{B}{R}{G}", 5),
];
export function considerPanel() {
  const mix = recommendedMix(null, false, "nonland" as any);
  return <ConsiderPanel mix={mix} deckId="d1" declaredBracket={null} noteCounts={{} as any} suggestions={SUGS} deckCards={D.cards} deckOracleIds={D.cards.map((c: any) => c.oracleId)}
    commanderOracleId={deck.commander.oracleId} commanderShortName="Ashling" degraded={false} sort={"fit" as any} onSortChange={() => {}} newestAsOf={new Date("2026-11-22")} />;
}
if (process.argv[2] === "all") {
  for (const dev of ["phone", "desk"] as const) {
    const d = dev === "desk" ? "d" : "p";
    deckPage(`${d}-t0`, dev, tabsOld, "analysis", <div />);
    deckPage(`${d}-t1`, dev, tabsNew, "tuning", hub());
    deckPage(`${d}-t2`, dev, tabsNew, "tuning", hub("consider", considerPanel()));
    G.__OPEN = undefined;
  }
  console.log("ok");
}
