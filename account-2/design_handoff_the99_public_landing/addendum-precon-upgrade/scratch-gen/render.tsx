// A5 generator (scratch only): the demo dialog's shipped markup (demo.tsx, copied verbatim, static) on the PROPOSED step 7.
import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { landingCopy } from "../src/lib/copy/landing";
import { SEGMENT } from "../src/components/ui/segment";
import { DemoProviders } from "../src/components/landing/demo/demo-providers";
import { StepUpgrade, type DemoUpgrade } from "../src/components/landing/demo/demo-step-upgrade";
import { Demo } from "../src/components/landing/demo/demo";

const c = landingCopy.demo;
const STEPS = c.steps.length;
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
// (cut, cutMv, cutOwned, add, addMv, addOwned, price$, why, theme, cutId, addColors, cutColors)
const P: [string, number, boolean, string, number, boolean, number, string, string, string[], string[]][] = [
  ["Sai, Master Thopterist", 3, true, "Brainstorm", 1, false, 120, "One mana, at instant speed: Muddle becomes a copy in the middle of combat.", "Artifacts", ["U"], ["U"]],
  ["Wizard’s Staff", 3, false, "Ponder", 1, true, 40, "Finds the next spell for a single mana.", "Artifacts", ["R"], ["U"]],
  ["Brudiclad, Telchor Engineer", 6, false, "Preordain", 1, false, 90, "Another one-mana look ahead, so every turn has a spell to cast.", "Artifacts", ["U", "R"], ["U"]],
  ["Thopter Engineer", 3, true, "Lightning Bolt", 1, true, 110, "Three damage for one mana, and Muddle copies something on the way.", "Artifacts", ["R"], ["R"]],
  ["Pia and Kiran Nalaar", 4, false, "Chaos Warp", 3, false, 90, "Answers any permanent, which red rarely can.", "Artifacts", ["R"], ["R"]],
  ["Mind Stone", 2, true, "Fact or Fiction", 4, false, 50, "Four cards looked at, and the pile you keep is usually two spells.", "Artifacts", [], ["U"]],
  ["Etherium Sculptor", 2, true, "Archmage Emeritus", 4, false, 30, "A card for every instant or sorcery.", "Artifacts", ["U"], ["U"]],
  ["Retrofitter Foundry", 3, false, "Baral, Chief of Compliance", 2, false, 180, "Every spell costs one less, and your counterspells draw.", "Artifacts", [], ["U"]],
  ["Foundry Inspector", 3, true, "Storm-Kiln Artist", 4, false, 60, "Treasure for every spell, and Muddle can copy it for more.", "Artifacts", [], ["R"]],
  ["Unwinding Clock", 4, false, "Electrostatic Field", 2, false, 25, "A wall early, and 1 damage to each opponent with every spell.", "Artifacts", [], ["R"]],
  ["Lathliss, Dragon Queen", 6, true, "Guttersnipe", 3, true, 35, "Two damage to each opponent with every spell.", "Tokens", ["R"], ["R"]],
  ["Goblin Instigator", 2, true, "Veyran, Voice of Duality", 3, false, 310, "Your spell triggers happen twice, Muddle’s included.", "Tokens", ["R"], ["U", "R"]],
  ["Krenko, Tin Street Kingpin", 3, false, "Mystic Confluence", 6, false, 160, "A counter, a bounce or three cards, whichever the turn needs.", "Tokens", ["R"], ["U"]],
  ["Hellrider", 4, false, "Thousand-Year Storm", 6, false, 280, "Each spell is copied once for every spell before it that turn.", "Tokens", ["R"], ["U", "R"]],
];
const cards: Record<string, any> = {
  rootha: { owned: true, cmc: 5, identity: ["U", "R"] },
  muddle: { owned: false, cmc: 4, identity: ["U", "R"] },
};
const themes: Record<string, string> = {};
const pairs = P.map(([cut, cmv, cown, add, amv, aown, cents, why, theme, cc, ac], i) => {
  cards[slug(cut)] = { owned: cown, cmc: cmv, identity: cc };
  cards[slug(add)] = { owned: aown, cmc: amv, identity: ac };
  themes[slug(cut)] = theme;
  return { cutId: slug(cut), cut, addId: slug(add), add, addCents: cents, reason: why, position: i };
});
const buy = pairs.filter((p) => !cards[p.addId].owned);
const strat = (key: string, label: string) => ({ key, label, blurb: "", source: "edhrec", backingIds: [], backing: [] });
const run = { id: "r1", status: "done", strategyKey: "muddle/3/spellslinger", strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-10T15:00:00Z"),
  pairs, buyTotalCents: buy.reduce((n, p) => n + p.addCents, 0), bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "x",
  toBuy: { cards: buy.length, cents: buy.reduce((n, p) => n + p.addCents, 0) }, owned: pairs.length - buy.length, started: false, themes };
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

function Dialog({ index, all = false }: { index: number; all?: boolean }) {
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
                      <StepUpgrade upgrade={upgrade} startAll={all} />
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
writeFileSync("up/step7.html", renderToString(<Dialog index={6} />));
writeFileSync("up/step7all.html", renderToString(<Dialog index={6} all />));
const art = [{ src: "art/c-ashling.jpg", name: "Ashling" }, { src: "art/c-giada.jpg", name: "Giada" }, { src: "art/c-zimone.jpg", name: "Zimone" }];
writeFileSync("up/start.html", renderToString(<main className="flex flex-1 flex-col bg-[color:var(--bg)] text-[color:var(--fg)]"><Demo art={art} publicPages={false} /></main>));
console.log(STEPS, buy.length, run.toBuy.cents);
