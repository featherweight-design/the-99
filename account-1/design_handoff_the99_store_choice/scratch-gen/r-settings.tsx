import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { SettingsView } from "../src/components/settings/settings-view";
import { NewsSection } from "../src/components/settings/news-section";
import { SparesSection } from "../src/components/settings/spares-section";
import { FEED_KINDS } from "../src/lib/feed/kinds";
import { CardSearchContext } from "../src/components/card-search/card-search";
import { HelpContext } from "../src/components/help/help-root";
import { StoreSection } from "../src/components/settings/store-section";
mkdirSync("dz/frames", { recursive: true });
const R: any = { push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} };
const door = { adminDoor: false, adminEnv: null, credits: null, face: null } as any;
export const W = (x: any, path = "/settings") => (
  <AppRouterContext.Provider value={R}><PathnameContext.Provider value={path}><HelpContext.Provider value={{ go() {} } as any}><CardSearchContext.Provider value={{ isOpen: false, warmSearch() {}, openSearch() {} } as any}>{x}</CardSearchContext.Provider></HelpContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>
);
const ON = new Set(["price-drop", "trade-match", "spare-request"]);
const kinds = FEED_KINDS.filter((k) => !String(k).startsWith("announce") && !String(k).includes("wizard")).map((kind) => ({ kind, on: ON.has(kind) })) as any;
export function shell(main: any, path: string, overlay: any = null) {
  return renderToString(W(
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} theme="amonkhet" {...door} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col">{main}</main>
      </div>
      <TabBar locked={false} {...door} />
      {overlay}
    </div>, path));
}
const page = (store: any, o: any = {}) => shell(
  <SettingsView>
    <StoreSection store={store} washed={o.washed} saving={o.saving ?? null} />
    <NewsSection kinds={kinds} />
    <SparesSection spareMin={2} pods={[]} kept={[]} />
  </SettingsView>, "/settings", o.overlay ?? null);
const jobs: Record<string, [any, any?]> = { "s-mp": ["manapool"], "s-tcg": ["tcgplayer"], "s-ck": ["cardkingdom"], "s-wash": ["manapool", { washed: true }] };
for (const [k, [s, o]] of Object.entries(jobs)) writeFileSync(`dz/frames/${k}.html`, page(s, o));
console.log("ok");
