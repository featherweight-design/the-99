import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { writeFileSync } from "node:fs";
import { FirstRunChecklist } from "../src/components/home/first-run";
import { MobileHeader, NavRail, TabBar } from "../src/components/shell/nav";
import { InstallRowView, type InstallRowKind } from "../src/components/pwa/install-row";
import { IosInstallSheetFrame } from "../src/components/pwa/ios-install-sheet";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const renderToString = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/"><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
const about = { kind: "firstRun", ids: ["a"], ack: ["a"] } as any;
const friends = { friends: [], links: [], now: "2026-11-15T03:00:00Z" } as any;
const home = (kind: InstallRowKind | null, shell: "phone" | "desktop") => {
  const page = <FirstRunChecklist about={about} friends={friends} news install={kind ? <InstallRowView kind={kind} /> : null} />;
  return shell === "phone"
    ? <div className="flex min-h-screen flex-col"><MobileHeader theme={"amonkhet" as any} adminDoor={false as any} adminEnv={null as any} credits={null as any} /><main className="flex flex-1 flex-col pb-[100px]">{page}</main><TabBar locked /></div>
    : <div className="flex min-h-screen"><NavRail locked theme={"amonkhet" as any} adminDoor={false as any} adminEnv={null as any} credits={null as any} /><main className="flex min-w-0 flex-1 flex-col">{page}</main></div>;
};
for (const k of ["safari", "chrome", "firefox", "android"] as const) {
  writeFileSync(`hero/home-${k}-phone.html`, renderToString(home(k, "phone")));
}
writeFileSync(`hero/home-none-phone.html`, renderToString(home(null, "phone")));
writeFileSync(`hero/home-none-desktop.html`, renderToString(home(null, "desktop")));
writeFileSync(`hero/home-safari-desktop.html`, renderToString(home("safari", "desktop")));
for (const b of ["safari", "chrome", "firefox"] as const)
  writeFileSync(`hero/sheet-${b}-phone.html`, renderToString(<>{home(b, "phone")}<IosInstallSheetFrame browser={b} onClose={() => {}} /></>));
writeFileSync(`hero/row-alone.html`, renderToString(<div style={{ width: 358, padding: 16 }}><InstallRowView kind="safari" /></div>));
console.log("ok");
