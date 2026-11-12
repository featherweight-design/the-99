import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const renderToString = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/"><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
import { writeFileSync } from "node:fs";
import { WhereCreditsWork } from "../src/components/welcome/where-credits-work";
import { WelcomeStrip } from "../src/components/welcome/welcome-strip";
import { FirstRunChecklist } from "../src/components/home/first-run";
import { MobileHeader, NavRail, TabBar } from "../src/components/shell/nav";
import { writtenForYou } from "../src/lib/discovery/showcase";
import { welcomeSheet } from "../src/lib/payments/welcome-sheet";
const exp = new Date("2026-11-20T18:00:00Z").getTime();
const facts = { lot: "held", units: 15, left: 15, expiresAtMs: exp, days: 8, teaser: true, free: 1 } as any;
const groups = [{ cards: [
  { id: "help-me-choose", state: { kind: "page", href: "/decks/new" } },
  { id: "suggested-changes", state: { kind: "deck", href: "/decks/1?tab=analysis" } },
  { id: "proposed-cuts", state: { kind: "deck", href: "/decks/1?tab=analysis" } },
] }] as any;
const sheets: Record<string, any> = {};
for (const up of [false, true]) {
  const w = writtenForYou(true, up).rows;
  sheets[`locked${up ? "" : "-shipped"}`] = welcomeSheet({ written: w, cards: 0, decks: 0, groups });
  sheets[`nodeck${up ? "" : "-shipped"}`] = welcomeSheet({ written: w, cards: 1284, decks: 0, groups });
  sheets[`decks${up ? "" : "-shipped"}`] = welcomeSheet({ written: w, cards: 1284, decks: 2, groups });
}
const about = { kind: "firstRun", ids: ["a"], ack: ["a"] } as any;
const home = (up: boolean, shell: "phone" | "desktop") => {
  const sheet = sheets[up ? "locked" : "locked-shipped"];
  const page = <FirstRunChecklist about={about} welcome={<WelcomeStrip facts={facts} sheet={sheet} place="first-run" afterAbout />} news />;
  return shell === "phone"
    ? <div className="flex min-h-screen flex-col"><MobileHeader theme={"amonkhet" as any} adminDoor={false as any} adminEnv={null as any} credits={null as any} /><main className="flex flex-1 flex-col pb-[100px]">{page}</main><TabBar locked /></div>
    : <div className="flex min-h-screen"><NavRail locked theme={"amonkhet" as any} adminDoor={false as any} adminEnv={null as any} credits={null as any} /><main className="flex min-w-0 flex-1 flex-col">{page}</main></div>;
};
for (const shell of ["phone", "desktop"] as const) {
  writeFileSync(`hero/home-${shell}.html`, renderToString(home(true, shell)));
  for (const [k, s] of Object.entries(sheets))
    writeFileSync(`hero/sheet-${k}-${shell}.html`, renderToString(<>{k.startsWith("locked") ? home(true, shell) : <main className="min-h-screen bg-[color:var(--bg)]" />}<WhereCreditsWork facts={facts} sheet={s} teaser={true} onClose={() => {}} /></>));
}

// ---- The Credits tour stop (proposal). Mirrors TourRun's card markup (first-run-tour.tsx) with the step's own body.
import { tourCopy } from "../src/lib/copy/discovery";
const T = tourCopy as any;
function TourCredits({ rows, index = 4, of = 7 }: { rows: any[]; index?: number; of?: number }) {
  const s = T.steps.credits;
  return (
    <>
      <svg data-tour-scrim className="fixed inset-0 z-[70] h-full w-full"><defs><mask id="m"><rect width="100%" height="100%" fill="white" /><rect id="cut" fill="black" /></mask></defs><rect width="100%" height="100%" fill="rgba(6,5,8,.66)" mask="url(#m)" /></svg>
      <div id="ring" data-tour-ring className="pointer-events-none fixed z-[70] shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_75%,transparent),0_0_0_6px_color-mix(in_oklab,var(--accent)_20%,transparent)]" />
      <section id="card" role="dialog" data-tour-card="credits" className="fixed z-[71] flex flex-col overflow-y-auto overscroll-contain rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-[14px_16px_16px] text-left text-[color:var(--fg-body)] shadow-[0_24px_60px_rgba(0,0,0,.55)] max-md:left-[16px] max-md:right-[16px] max-md:bottom-[100px] md:w-[340px] md:p-[14px_16px_14px_18px]">
        <div className="flex items-center justify-between gap-[10px]">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--accent-text)]">{T.kicker(index + 1, of, s.place)}</span>
          <button type="button" className="-my-[10px] -mr-[12px] h-[44px] w-[44px] flex-none rounded-[8px] text-[15px] text-[color:var(--fg-faint)] md:-my-[6px] md:-mr-[8px] md:h-[32px] md:w-[32px] md:text-[13px]">✕</button>
        </div>
        <h2 className="m-0 mt-[8px] font-display text-[20px] font-semibold leading-[1.2] text-[color:var(--fg)] md:mt-[6px] md:text-[19px]">{s.title}</h2>
        <p className="m-0 mt-[6px] text-pretty text-[14px] leading-[1.55] md:text-[13.5px]">{s.body}</p>
        <ul role="list" data-tour-credits className="m-0 mt-[10px] flex list-none flex-col p-0">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-[12px] border-0 border-t border-solid border-t-[color:var(--border)] py-[7px]">
              <span className="min-w-0 text-[13.5px] leading-[1.3] font-semibold text-[color:var(--fg)]">{r.name}</span>
              <span className="flex-none whitespace-nowrap rounded-full border border-solid border-[color:var(--accent-dim)] px-[9px] py-[2px] font-mono text-[11px] text-[color:var(--accent-text)]">{r.short}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-[4px] border-0 border-t border-solid border-t-[color:var(--border)] pt-[9px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{s.foot}</p>
        <div className="mt-[14px] flex items-center justify-between gap-[12px]">
          <span className="flex items-center gap-[6px]">
            {Array.from({ length: of }, (_, i) => <span key={i} className={`rotate-45 ${i === index ? "h-[8px] w-[8px] bg-[color:var(--accent)]" : i < index ? "h-[6px] w-[6px] bg-[color-mix(in_oklab,var(--accent)_45%,transparent)]" : "h-[6px] w-[6px] bg-[color:var(--border-strong)]"}`} />)}
          </span>
          <span className="flex flex-none gap-[8px]">
            <button type="button" className="h-[44px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] text-[14px] text-[color:var(--fg)] md:h-[32px] md:rounded-[8px] md:px-[12px] md:text-[12.5px]">{T.back}</button>
            <button type="button" className="h-[44px] rounded-[10px] border-0 bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)] md:h-[32px] md:rounded-[8px] md:px-[14px] md:text-[12.5px]">{T.next}</button>
          </span>
        </div>
      </section>
    </>
  );
}
const tourRows = writtenForYou(true, true).rows;
for (const shell of ["phone", "desktop"] as const) writeFileSync(`hero/tour-credits-${shell}.html`, renderToString(<>{home(true, shell)}<TourCredits rows={tourRows} /></>));
