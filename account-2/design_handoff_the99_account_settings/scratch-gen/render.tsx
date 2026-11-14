// Account settings R1: SSR of the shipped Settings page, shell chrome and the proposal (account-section, delete-account).
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { SettingsView } from "../src/components/settings/settings-view";
import { NewsSection } from "../src/components/settings/news-section";
import { SparesSection } from "../src/components/settings/spares-section";
import { FriendDecksSection } from "../src/components/settings/friend-decks-section";
import { FEED_KINDS } from "../src/lib/feed/kinds";
import { AccountSection, type AccountFx } from "../src/components/settings/account-section";
import { DeleteScreen, VerifyScreen } from "../src/components/settings/delete-account";
import { CardSearchContext } from "../src/components/card-search/card-search";
import { HelpContext } from "../src/components/help/help-root";
import { AccountSheet, AccountPopover } from "../src/components/shell/account-menu";
import { TopBar, Hero } from "../src/components/landing/landing";
import { LaunchListProvider } from "../src/components/landing/launch-panel";
import { ToastFrame } from "../src/components/collection/edit-toast-frame";
import { accountCopy } from "../src/lib/copy/account";

const R: any = { push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} };
const door = { adminDoor: false, adminEnv: null, credits: null, face: null } as any;
const W = (x: any, path = "/settings") => (
  <AppRouterContext.Provider value={R}><PathnameContext.Provider value={path}><HelpContext.Provider value={{ go() {} } as any}><CardSearchContext.Provider value={{ isOpen: false, warmSearch() {}, openSearch() {} } as any}>{x}</CardSearchContext.Provider></HelpContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>
);
const ON = new Set(["price-drop", "trade-match", "spare-request"]);
const kinds = FEED_KINDS.filter((k) => !String(k).startsWith("announce") && !String(k).includes("wizard")).map((kind) => ({ kind, on: ON.has(kind) })) as any;

const DEV = [
  { id: "a", browser: "Safari", device: "iPhone", kind: "phone", place: "Oakland, US", ago: null, current: true },
  { id: "b", browser: "Chrome", device: "Mac", kind: "desktop", place: "Oakland, US", ago: "2 days ago" },
  { id: "c", browser: "Safari", device: "iPad", kind: "tablet", place: "Sacramento, US", ago: "3 weeks ago" },
] as const;
const DEV_D = DEV.map((d) => ({ ...d, current: d.id === "b", ago: d.id === "a" ? "1 hour ago" : d.id === "b" ? null : d.ago }));
const base: AccountFx = { name: "Wren Calloway", email: "wren@example.com", methods: ["google", "code"], devices: DEV as any };

function page(account: AccountFx, overlay: any = null, desk = false) {
  return renderToString(W(
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} theme="amonkhet" {...door} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col">
          <SettingsView>
            <NewsSection kinds={kinds} />
            <SparesSection spareMin={2} pods={[]} kept={[]} />
            <FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false }} />
            <AccountSection fx={desk && Array.isArray(account.devices) ? { ...account, devices: account.devices === (DEV as any) ? DEV_D as any : account.devices } : account} />
          </SettingsView>
        </main>
      </div>
      <TabBar locked={false} {...door} />
      {overlay}
    </div>,
  ));
}

const d = accountCopy.del;
const HELD = { plan: 74, pack: 40, subscribed: true };
const jobs: Record<string, [AccountFx, any]> = {
  "s-default": [base, null],
  "s-password": [{ ...base, name: "Sam Ortiz", email: "sam@example.com", methods: ["password", "code"] }, null],
  "s-editing": [{ ...base, editing: "Wren Calloway" }, null],
  "s-loading": [{ ...base, devices: "loading" }, null],
  "s-failed": [{ ...base, devices: "failed" }, null],
  "s-signing-out": [{ ...base, devices: DEV.map((x) => (x.id === "b" ? { ...x, pending: true } : x)) as any }, null],
  "s-one-device": [{ ...base, devices: [DEV[0]] as any }, null],
  "d1": [base, <DeleteScreen held={null} typed="" />],
  "d1-typed": [base, <DeleteScreen held={null} typed="delete" />],
  "d1-held": [base, <DeleteScreen held={HELD} typed="" />],
  "d1-packs": [base, <DeleteScreen held={{ plan: 0, pack: 40, subscribed: false }} typed="" />],
  "d1-cancelled": [base, <DeleteScreen held={null} typed="delete" note={d.notDeleted} />],
  "d1-failed": [base, <DeleteScreen held={null} typed="delete" line={d.failed} />],
  "d1-limited": [base, <DeleteScreen held={null} typed="delete" line={d.tooMany} />],
  "d2-password": [base, <VerifyScreen kind="password" email="sam@example.com" />],
  "d2-password-typed": [base, <VerifyScreen kind="password" email="sam@example.com" typed="x" />],
  "d2-password-wrong": [base, <VerifyScreen kind="password" email="sam@example.com" typed="x" line={d.wrongPassword} />],
  "d2-code": [base, <VerifyScreen kind="code" email="wren@example.com" typed="4802" />],
  "d2-code-wrong": [base, <VerifyScreen kind="code" email="wren@example.com" typed="480217" line="That code isn’t right. Check the email and try again." cooling={null} />],
  "d2-code-limited": [base, <VerifyScreen kind="code" email="wren@example.com" typed="480217" line={d.tooMany} cooling={null} />],
  "d2-google": [base, <VerifyScreen kind="google" email="wren.plays@gmail.com" typed="" />],
  "d2-busy": [base, <VerifyScreen kind="code" email="wren@example.com" typed="480217" busy cooling={null} />],
};
mkdirSync("gen/out", { recursive: true });
for (const [k, [fx, ov]] of Object.entries(jobs)) {
  writeFileSync(`gen/out/p-${k}.html`, page(fx, ov));
  writeFileSync(`gen/out/d-${k}.html`, page(fx, ov, true));
}
console.log(Object.keys(jobs).length);

const idn = { name: "Wren Calloway", email: "wren@example.com", initials: "WC" };
const mp: any = { identity: idn, art: null, panelId: "m", nameId: "mn", theme: "amonkhet", busy: false, admin: null, chip: null,
  onClose() {}, onManage() {}, onSignOut() {}, onAbout() {}, onAdmin() {}, onSettings() {}, onCredits() {}, onTour() {} };
for (const [k, no] of [["m-before", false], ["m-after", true]] as const) {
  (globalThis as any).__noManage = no;
  writeFileSync(`gen/out/p-${k}.html`, page(base, <AccountSheet kind="sheet" {...mp} />));
  writeFileSync(`gen/out/d-${k}.html`, page(base, <div className="fixed bottom-[52px] left-[13px] z-40"><div className="relative h-0 w-0"><AccountPopover kind="popover" {...mp} /></div></div>, true));
}
(globalThis as any).__noManage = false;

const CMD = [
  { name: "Ghalta, Primal Hunger", slug: "ghalta", colorIdentity: ["G"], artCropUri: "art/art-ghalta.jpg", imageUri: "art/c-avenger-of-zendikar.jpg", prose: null },
  { name: "Giada, Font of Hope", slug: "giada", colorIdentity: ["W"], artCropUri: "art/art-giada.jpg", imageUri: "art/c-polyraptor.jpg", prose: null },
  { name: "Aang, Swift Savior", slug: "aang", colorIdentity: ["W", "U"], artCropUri: "art/hero-aang.jpg", imageUri: "art/c-cemetery-prowler.jpg", prose: null },
];
for (const k of ["x-landing"]) {
  const h = renderToString(W(
    <div className="contents" style={{ ["--tabbar-h" as any]: "0px" }}>
      <LaunchListProvider action={(async () => ({ ok: true })) as any}><main className="flex flex-1 flex-col bg-[color:var(--bg)] text-[color:var(--fg)]"><TopBar /><Hero commanders={CMD as any} /></main></LaunchListProvider>
      <ToastFrame frameRef={{ current: null }} role="status" title={accountCopy.deleted} />
    </div>, "/"));
  writeFileSync(`gen/out/p-${k}.html`, h); writeFileSync(`gen/out/d-${k}.html`, h);
}
