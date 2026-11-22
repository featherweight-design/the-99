import { renderToString } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { CardSearchContext } from "../src/components/card-search/card-search";
import { HelpContext } from "../src/components/help/help-root";
const R: any = { push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} };
const door = { adminDoor: false, adminEnv: null, credits: null, face: null } as any;
export const W = (x: any, path: string) => (
  <AppRouterContext.Provider value={R}><PathnameContext.Provider value={path}><HelpContext.Provider value={{ go() {} } as any}><CardSearchContext.Provider value={{ isOpen: false, veiled: false, query: "", setQuery() {}, phase: "idle", searching: false, online: true, list: [], active: -1, busy: false, listboxId: "cs", inputRef: { current: null }, placeBody() {}, canAdd: false, onFieldKey() {}, escape() {}, onClear() {}, pick() {}, retry() {}, closeSearch() {}, warmSearch() {}, openSearch() {} } as any}>{x}</CardSearchContext.Provider></HelpContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>
);
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
