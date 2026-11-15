import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { writeFileSync } from "node:fs";
import { FirstRunChecklist } from "../src/components/home/first-run";
import { MobileHeader, NavRail, TabBar } from "../src/components/shell/nav";
import { IosInstallSheetFrame } from "../src/components/pwa/ios-install-sheet";
import { tourCopy } from "../src/lib/copy/discovery";
const T = tourCopy as any;
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const renderToString = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/"><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
const about = { kind: "firstRun", ids: ["a"], ack: ["a"] } as any;
const friends = { friends: [], links: [], now: "2026-11-15T03:00:00Z" } as any;
type K = "safari" | "chrome" | "firefox" | "android";
const g = globalThis as any;
const home = (slot: K | null, shell: "phone" | "desktop") => {
  g.__installPreview = slot ?? undefined;
  const page = <FirstRunChecklist about={about} friends={friends} news />;
  return shell === "phone"
    ? <div className="flex min-h-screen flex-col"><MobileHeader theme={"amonkhet" as any} adminDoor={false as any} adminEnv={null as any} credits={null as any} /><main className="flex flex-1 flex-col pb-[100px]">{page}</main><TabBar locked /></div>
    : <div className="flex min-h-screen"><NavRail locked theme={"amonkhet" as any} adminDoor={false as any} adminEnv={null as any} credits={null as any} /><main className="flex min-w-0 flex-1 flex-col">{page}</main></div>;
};
// The tour card: TourRun's markup (first-run-tour.tsx; it needs a browser), with the Install stop's body. Placed by post.js.
function TourInstall({ kind, index = 7, of = 8 }: { kind: K; index?: number; of?: number }) {
  const s = T.steps.install;
  return (
    <>
      <svg data-tour-scrim className="fixed inset-0 z-[70] h-full w-full"><defs><mask id="m"><rect width="100%" height="100%" fill="white" /><rect id="cut" fill="black" /></mask></defs><rect width="100%" height="100%" fill="rgba(6,5,8,.66)" mask="url(#m)" /></svg>
      <div id="ring" data-tour-ring className="pointer-events-none fixed z-[70] shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_75%,transparent),0_0_0_6px_color-mix(in_oklab,var(--accent)_20%,transparent)]" />
      <section id="card" role="dialog" data-tour-card="install" className="fixed z-[71] flex flex-col overflow-y-auto overscroll-contain rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] p-[14px_16px_16px] text-left text-[color:var(--fg-body)] shadow-[0_24px_60px_rgba(0,0,0,.55)] max-md:left-[16px] max-md:right-[16px] max-md:bottom-[100px] md:w-[340px] md:p-[14px_16px_14px_18px]">
        <div className="flex items-center justify-between gap-[10px]">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--accent-text)]">{T.kicker(index + 1, of, s.place)}</span>
          <button type="button" aria-label={T.skip} className="-my-[10px] -mr-[12px] h-[44px] w-[44px] flex-none rounded-[8px] text-[15px] text-[color:var(--fg-faint)] md:-my-[6px] md:-mr-[8px] md:h-[32px] md:w-[32px] md:text-[13px]">✕</button>
        </div>
        <h2 className="m-0 mt-[8px] font-display text-[20px] font-semibold leading-[1.2] text-[color:var(--fg)] md:mt-[6px] md:text-[19px]">{s.title}</h2>
        <p className="m-0 mt-[6px] text-pretty text-[14px] leading-[1.55] md:text-[13.5px]">{s.body[kind]}</p>
        <p className="m-0 mt-[10px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">{s.foot}</p>
        <div className="mt-[14px] flex items-center justify-between gap-[12px]">
          <span className="flex items-center gap-[6px]">
            {Array.from({ length: of }, (_, i) => <span key={i} className={`rotate-45 ${i === index ? "h-[8px] w-[8px] bg-[color:var(--accent)]" : i < index ? "h-[6px] w-[6px] bg-[color-mix(in_oklab,var(--accent)_45%,transparent)]" : "h-[6px] w-[6px] bg-[color:var(--border-strong)]"}`} />)}
          </span>
          <span className="flex flex-none gap-[8px]">
            <button type="button" className="h-[44px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] text-[14px] text-[color:var(--fg)]">{T.back}</button>
            <button type="button" className="h-[44px] rounded-[10px] border-0 bg-[color:var(--fg)] px-[20px] text-[14px] font-semibold text-[color:var(--bg)]">{T.finish}</button>
          </span>
        </div>
      </section>
    </>
  );
}
for (const k of ["safari", "chrome", "firefox", "android"] as const) {
  writeFileSync(`hero/tour-${k}-phone.html`, renderToString(<>{home(k, "phone")}<TourInstall kind={k} /></>));
}
writeFileSync(`hero/home-safari-phone.html`, renderToString(home("safari", "phone")));
writeFileSync(`hero/home-none-phone.html`, renderToString(home(null, "phone")));
writeFileSync(`hero/home-none-desktop.html`, renderToString(home(null, "desktop")));
for (const b of ["safari", "chrome", "firefox"] as const)
  writeFileSync(`hero/sheet-${b}-phone.html`, renderToString(<>{home(b, "phone")}<IosInstallSheetFrame browser={b} onClose={() => {}} /></>));
console.log("ok");
