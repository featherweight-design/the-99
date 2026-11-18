// A5 generator (scratch only): the demo dialog's shipped markup (demo.tsx, copied verbatim, static) on the PROPOSED step 7.
import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const renderToString = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/"><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
import { writeFileSync } from "node:fs";
import { landingCopy } from "../src/lib/copy/landing";
import { SEGMENT } from "../src/components/ui/segment";
import { DemoProviders } from "../src/components/landing/demo/demo-providers";
import { StepUpgrade, type DemoUpgrade } from "../src/components/landing/demo/demo-step-upgrade";
import { Demo } from "../src/components/landing/demo/demo";

const c = landingCopy.demo;
const STEPS = c.steps.length;
const idOf = (c: string) => [...new Set(c.split("").filter((x) => x === "U" || x === "R"))];
const cmcOf = (c: string) => c.split("").reduce((n, x) => n + (/\d/.test(x) ? +x : 1), 0);
// The fresh-start R2 fixture, verbatim: [cut, cutCost, cutOwned, add, addCost, addOwned, price, why, theme, cutWhy, cutGroup, addGroup, addRole, cutRole, cutType, addType]
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
const strat = (key: string, label: string) => ({ key, label, blurb: "", source: "edhrec", backingIds: [], backing: [] });
const run = { id: "r1", status: "done", strategyKey: "muddle/3/spellslinger", strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-12T19:00:00Z"),
  pairs, buyTotalCents: toBuy.cents, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x", toBuy, owned: 14 - toBuy.cards, started: false, themes };
const buy = pairs.filter((p) => !cards[p.addId].owned);
const panel = { boxBracket: 2, listFp: "x", cards, runs: [run], allowance: { used: 0, limit: 1, reopensAt: null, nextAt: null },
  commanders: [
    { key: "rootha", isFace: true, cards: [{ oracleId: "rootha", name: "Rootha, Mercurial Artist", manaCost: "{3}{U}{R}", cmc: 5, typeLine: "Legendary Creature" }], line: "", strategies: [strat("spellslinger", "Spells")] },
    { key: "muddle", isFace: false, cards: [{ oracleId: "muddle", name: "Muddle, the Ever-Changing", manaCost: "{2}{U}{R}", cmc: 4, typeLine: "Legendary Creature" }], line: "", strategies: [strat("spellslinger", "Spells"), strat("tokens", "Tokens")] },
  ] };
const upgrade: DemoUpgrade = { precon: "Prismari Artistry", panel: panel as any, runId: "r1" };

// demo.tsx's classes, verbatim.
const BUTTON = "inline-flex h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] px-[18px] text-[14px]";
const BTN_L = `${BUTTON} border-0 bg-[color:var(--fg)] font-medium text-[color:var(--bg)]`;
const BTN_Q = `${BUTTON} border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-normal text-[color:var(--fg)]`;
const HEADING = "m-0 font-display font-bold leading-[1.25] text-[color:var(--fg)] focus:outline-none";
const CHIP = "inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-[6px] border border-solid px-[8px] font-mono text-[10.5px] font-medium tracking-[0.04em]";
const CHIP_FREE = `${CHIP} border-[color:color-mix(in_oklab,var(--success)_45%,transparent)] text-[color:var(--success)]`;
const CHIP_CREDIT = `${CHIP} border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] text-[color:var(--accent-text)]`;
const LINK = "cursor-pointer border-0 bg-transparent p-0 underline underline-offset-[3px]";
const LABEL = "whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-muted)]";
const noop = () => {};

function Dialog({ index, unpicked, seed = null }: { index: number; unpicked?: string[]; seed?: number[] | null }) {
  const step = c.steps[index];
  const line = (step.line as any)("Wren", String(pairs.length));
  return (
    <div role="presentation" className="fixed inset-0 z-50 flex flex-col bg-[color:var(--bg)]">
      <div role="dialog" className="flex min-h-0 flex-1 flex-col focus:outline-none">
        <div className="flex flex-none items-center gap-[12px] border-b border-solid border-b-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[4px] pl-[16px] pr-[4px] md:pl-[24px] md:pr-[12px]">
          <span className={LABEL}>{c.step(index + 1, STEPS)}</span>
          <span aria-hidden className="flex flex-1 gap-[4px]">
            {c.steps.map((s, i) => <span key={s.id} data-on={i < index + 1 || undefined} className={`${SEGMENT} bg-[color:var(--border-strong)] data-[on]:bg-[color:var(--accent)]`} />)}
          </span>
          <button type="button" className={`${LINK} flex min-h-[44px] items-center whitespace-nowrap text-[13px] text-[color:var(--fg-muted)] decoration-[color:var(--fg-faint)]`}>{c.skip}</button>
          <button type="button" className="inline-flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[16px] text-[color:var(--fg-muted)]"><span aria-hidden="true">{"✕"}</span></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_auto_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
          <div id="col" className="min-h-0 overflow-y-auto overscroll-contain lg:contents">
            <div className="mx-auto flex w-full max-w-[680px] flex-col gap-[10px] px-[16px] pb-[14px] pt-[16px] lg:col-start-1 lg:row-start-1 lg:mx-0 lg:max-w-none lg:px-[28px] lg:pb-[8px] lg:pt-[28px]">
              <div className="flex flex-wrap gap-[6px]">
                {step.tags.map((tag) => (
                  <span key={tag.label} className={tag.kind === "free" ? CHIP_FREE : CHIP_CREDIT}>
                    {tag.kind === "free" ? null : <span aria-hidden className="block h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />}
                    {tag.label}
                  </span>
                ))}
              </div>
              <h3 className={`${HEADING} text-[19px] lg:text-[23px]`}>{step.title("Wren")}</h3>
              <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--fg-body)]">{line}</p>
            </div>
            <div id="app" className="min-w-0 border-t border-solid border-t-[color:var(--border)] bg-[color:var(--bg)] lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0 lg:border-l-[color:var(--border)]">
              <div className="mx-auto w-full max-w-[680px] lg:max-w-[1080px]">
                <div id="panel" className="relative p-[16px] lg:px-[28px] lg:py-[24px]">
                  <span className="absolute right-[12px] top-[8px] font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.stage("Wren")}</span>
                  <div data-testid="demo-app" className="pt-[10px]">
                    <DemoProviders onOpen={noop} onClose={noop} openOracleId={null}>
                      <StepUpgrade upgrade={upgrade} unpicked={unpicked} seedSet={seed} />
                    </DemoProviders>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row-start-2 border-t border-solid border-t-[color:var(--border-strong)] bg-[color:var(--surface-raised)] lg:col-start-1 lg:row-start-2 lg:border-t-0 lg:bg-transparent">
            <div className="mx-auto flex w-full max-w-[680px] items-center gap-[10px] px-[16px] py-[12px] md:justify-end lg:mx-0 lg:max-w-none lg:justify-start lg:px-[28px] lg:pb-[24px] lg:pt-[8px]">
              <button type="button" className={BTN_Q}>{c.back}</button>
              <button type="button" className={`${BTN_L} flex-1 md:w-[180px] md:flex-none`}>{c.next}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
writeFileSync("up/step7.html", renderToString(<Dialog index={6} seed={[3]} />));
writeFileSync("up/step7mixed.html", renderToString(<Dialog index={6} unpicked={["c-cut0", "a-add3"]} />));
writeFileSync("up/step7uneven.html", renderToString(<Dialog index={6} unpicked={["c-cut0"]} />));
const art = [{ src: "art/c-ashling.jpg", name: "Ashling" }, { src: "art/c-giada.jpg", name: "Giada" }, { src: "art/c-zimone.jpg", name: "Zimone" }];
writeFileSync("up/start.html", renderToString(<main className="flex flex-1 flex-col bg-[color:var(--bg)] text-[color:var(--fg)]"><Demo art={art} publicPages={false} /></main>));
console.log(STEPS, buy.length, toBuy.cents);
