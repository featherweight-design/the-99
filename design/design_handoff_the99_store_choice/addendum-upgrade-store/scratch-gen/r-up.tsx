import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { CardSearchContext } from "../src/components/card-search/card-search";
import { HelpContext } from "../src/components/help/help-root";
import { projected } from "../src/lib/demo/projected";
import { ResultView } from "../src/components/decks/precons/upgrade/result-view";
import { DemoProviders } from "../src/components/landing/demo/demo-providers";
import { preconUpgradeCopy } from "../src/lib/copy/precon-upgrade";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
G.__NOW = "2026-11-23T19:00:00Z";
const R: any = { push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} };
const door = { adminDoor: false, adminEnv: null, credits: null, face: null } as any;
const W = (x: any, path: string) => (
  <AppRouterContext.Provider value={R}><PathnameContext.Provider value={path}><HelpContext.Provider value={{ go() {} } as any}><CardSearchContext.Provider value={{ isOpen: false, warmSearch() {}, openSearch() {} } as any}>{x}</CardSearchContext.Provider></HelpContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>
);
const u = projected()!.upgrade!;
// To buy: six adds the fixture account does not own (the fixture owns 13 of 14), so the price area has something to say.
const BUY = new Set(["Gifts Ungiven", "Pinnacle Monk // Mystic Peak", "Counterspell", "Mind Stone", "Fury", "Narset, Parter of Veils"]);
// Placeholder store figures, as the store-choice boards: TCGplayer ~9% under Mana Pool, Card Kingdom ~18% over.
const scale: Record<string, number> = { manapool: 1, tcgplayer: 0.91, cardkingdom: 1.18 };
function panelFor(store: string | null, gaps: string[] = []) {
  const run0 = u.panel.runs[0];
  const pairs = run0.pairs.map((p) => ({ ...p, addCents: gaps.includes(p.add) ? 0 : Math.round(p.addCents * scale[store ?? "manapool"] * 2.4) }));
  const cards = { ...u.panel.cards };
  for (const p of run0.pairs) cards[p.addId] = { ...cards[p.addId], owned: !BUY.has(p.add) } as any;
  const buy = pairs.filter((p) => BUY.has(p.add));
  const run = { ...run0, pairs, unpicked: [], deck: null, pricesAsOf: new Date("2026-11-23T07:00:00Z"),
    toBuy: { cards: buy.length, cents: buy.reduce((n, p) => n + p.addCents, 0) }, owned: pairs.length - buy.length } as any;
  return { panel: { ...u.panel, cards, runs: [run] } as any, run };
}
const copy = preconUpgradeCopy.flow;
function sheet(store: string | null, gaps?: string[]) {
  G.__STORE = store;
  const { panel, run } = panelFor(store, gaps);
  const body = (
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} theme="amonkhet" {...door} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col p-[16px] md:p-[28px]"><h1 className="m-0 font-display text-[24px] text-[color:var(--fg)]">{u.precon}</h1></main>
      </div>
      <TabBar locked={false} {...door} />
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" style={{ background: "color-mix(in oklab, black 62%, transparent)" }}>
        <div role="dialog" className="relative z-10 mx-auto flex h-[calc(100dvh-24px)] w-full flex-col gap-[14px] overflow-hidden rounded-[16px_16px_0_0] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px_18px_18px] md:h-auto md:max-h-[88dvh] md:max-w-[720px] md:rounded-[14px] md:p-[24px_24px_20px]">
          <div className="mx-auto h-[4px] w-[36px] flex-none rounded-full bg-[color:var(--border-strong)] md:hidden" />
          <div className="flex flex-none items-start justify-between gap-[12px]">
            <h2 className="m-0 font-display text-[20px] font-normal text-[color:var(--fg)]">{copy.resultTitle}</h2>
            <span className="-mr-[10px] -mt-[10px] flex h-[44px] w-[44px] items-center justify-center text-[15px] text-[color:var(--fg-muted)]">✕</span>
          </div>
          <div data-body="" className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overflow-x-hidden p-[6px]">
            <DemoProviders onOpen={() => {}} onClose={() => {}} openOracleId={null}><ResultView panel={panel} run={run} fileName="x" /></DemoProviders>
          </div>
        </div>
      </div>
    </div>
  );
  return renderToString(W(body, "/precons/x"));
}
const jobs: [string, string | null, string[]?][] = [["u-mp", "manapool"], ["u-tcg", "tcgplayer"], ["u-ck", "cardkingdom"], ["u-ck-gap", "cardkingdom", ["Fury"]], ["u-ck-none", "cardkingdom", [...BUY]], ["u-off", null]];
for (const [k, s, g] of jobs) writeFileSync(`dz/frames/${k}.html`, sheet(s, g));
console.log("ok", u.precon);
