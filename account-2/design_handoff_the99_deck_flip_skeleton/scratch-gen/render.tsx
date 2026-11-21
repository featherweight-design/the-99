// Deck flip skeleton R1 (account 2, 2026-11-21). Every frame is the shipped shell + the shipped deck header
// (SpineMobile / SpineDesktop with the shipped DeckFlipStrip), rendered with the shipped CSS (kaldheim). The body
// skeleton is drawn in the app's own classes and its skeleton tokens (tile-skeleton BAR, anim-skeleton).
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { SpineMobile } from "../src/components/decks/spine-mobile";
import { SpineDesktop } from "../src/components/decks/spine-desktop";
import { DeckFlipStrip } from "../src/components/decks/deck-flip-strip";
import { LoadingScreen } from "../src/components/shell/loading-screen";
import { shellCopy } from "../src/lib/copy/shell";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { BAR } from "../src/components/ui/tile-skeleton";

mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const frames: any[] = [];
function app(id: string, dev: "phone" | "desk", main: () => ReactNode, opts: { vh?: number; skin?: string } = {}) {
  G.__PATH = "/decks/d2";
  G.__AV = { initials: "WC", art: null };
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: new Date().toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  writeFileSync(`dz/frames/${id}.html`, (opts.skin ?? "") + renderToString(
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex min-h-dvh flex-1">
        <NavRail locked={false} openLock={null as any} theme="kaldheim" {...door} friendsMoment={false} badges={badges} />
        <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
          <MobileHeader theme="kaldheim" {...door} />
          <main className="relative flex min-w-0 flex-1 flex-col">{main()}</main>
        </div>
        <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
      </div>
    </CardDetailProvider>,
  ));
  frames.push({ id, dev, vh: opts.vh });
}

// ---------- fixtures: flipping from Ashen Banner Parade (2 of 5) to Hollow Oak Hours (3 of 5) ----------
const deckOf = (id: string, name: string, cmd: string, ci: string[], art: string): any => ({ id, name, intent: null,
  commander: { oracleId: "o-" + id, name: cmd, colorIdentity: ci, artCropUri: art, imageUri: art, typeLine: "Legendary Creature", manaCost: "", oracleText: "" }, partner: null });
const hollow = deckOf("d2", "Hollow Oak Hours", "Brawn, Amadeus Cho", ["U", "G"], "hollow.jpg");
const flipTo = (k: number, prevName: string, nextName: string): any => ({ mounted: true, search: "", flip: { k, n: 5, caption: null, href: "/decks", prev: { id: "p", name: prevName }, next: { id: "n", name: nextName } } });
const f3 = flipTo(3, "Ashen Banner Parade", "Lanternlight Tinkers");
const hollowSp: any = { deck: hollow, counts: { built: 99, ownedCount: 85, toBuyCount: 14 }, status: "To buy", onExport: () => {} };

// ---------- body skeleton (the deck page under the header), shipped skeleton tokens ----------
const SH = "rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)]";
const NAME = [62, 48, 74, 55, 68, 44, 80, 58, 66, 50, 72, 46];
const TABS = ["Your deck", "Analysis", "Consider", "Games", "Versions"];
function Rows({ n, start = 0 }: { n: number; start?: number }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-[6px] p-0">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex h-[37px] items-center gap-[12px] rounded-[8px] bg-[color:var(--surface-rail)] px-[10px]">
          <span className="h-[8px] w-[8px] flex-none rounded-full bg-[color:var(--surface-raised)]" />
          <span className={`${BAR} h-[12px]`} style={{ width: `${NAME[(i + start) % NAME.length] * 0.6}%` }} />
          <span className="ml-auto flex gap-[3px]">{Array.from({ length: 1 + ((i + start) % 3 === 0 ? 1 : 0) }, (_, j) => <span key={j} className="h-[9px] w-[9px] rounded-full bg-[color:var(--surface-raised)]" />)}</span>
          <span className="w-[22px]" />
        </li>
      ))}
    </ul>
  );
}
function Body({ wide }: { wide: boolean }) {
  const px = wide ? "px-[22px]" : "px-[16px]";
  return (
    <div aria-hidden className="flex flex-col">
      <div className={`anim-skeleton flex flex-col ${px} pt-[14px]`} style={{ gap: wide ? 22 : 18 }}>
        {/* the to-do card's shell: heading line, one step, foot line */}
        <div className="overflow-hidden rounded-[14px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center justify-between px-[14px] py-[14px]"><span className={`${BAR} h-[10px] w-[52%]`} /><span className={`${BAR} h-[10px] w-[48px]`} /></div>
          <div className={`flex items-center gap-[12px] bg-[color:var(--surface-sunken)] px-[14px] ${wide ? "h-[64px]" : "h-[96px]"}`}>
            <span className="flex flex-1 flex-col gap-[8px]"><span className={`${BAR} h-[9px] w-[70px] bg-[color:var(--surface-raised)]`} /><span className={`${BAR} h-[14px] w-[64%]`} />{!wide && <span className={`${BAR} h-[10px] w-[52%] bg-[color:var(--surface-raised)]`} />}</span>
            <span className={`${SH} h-[44px] ${wide ? "w-[150px]" : "w-[120px]"} flex-none`} />
          </div>
          <div className="px-[14px] py-[16px]"><span className={`${BAR} block h-[10px] w-[44%] bg-[color:var(--surface-raised)]`} /></div>
        </div>
        {/* the mix: caption, five cells, the why link */}
        <div className="flex flex-col gap-[10px]">
          <span className={`${BAR} h-[10px] w-[180px]`} />
          <div className="grid grid-cols-5" style={{ gap: wide ? 14 : 6 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`flex flex-col gap-[9px] rounded-[10px] border border-solid border-[color:var(--border)] ${wide ? "h-[150px] p-[16px]" : "h-[78px] items-center p-[10px]"}`}>
                <span className={`${BAR} h-[8px] w-[46%] bg-[color:var(--surface-raised)]`} />
                <span className={`${BAR} ${wide ? "h-[18px] w-[34%]" : "h-[16px] w-[30%]"}`} />
                {wide && <span className="mt-[6px] h-[6px] w-full rounded-full bg-[color:var(--surface-raised)]" />}
                <span className={`${BAR} h-[8px] w-[58%] bg-[color:var(--surface-raised)] ${wide ? "mt-auto" : ""}`} />
              </div>
            ))}
          </div>
          <span className={`${BAR} h-[10px] w-[120px] bg-[color:var(--surface-raised)]`} />
        </div>
      </div>
      {/* the tab row is words that never change: drawn real, the kept tab underlined, counts as bars */}
      <nav className={`mt-[18px] flex gap-[28px] overflow-hidden border-0 border-y border-solid border-[color:var(--border)] ${wide ? "px-[22px]" : "px-[16px]"}`}>
        {TABS.map((t, i) => (
          <span key={t} className={`flex flex-none items-center gap-[7px] py-[16px] font-sans text-[16px] ${i === 0 ? "border-0 border-b-[3px] border-solid border-[color:var(--accent)] font-semibold text-[color:var(--fg)]" : "text-[color:var(--fg-muted)]"}`}>
            {t}{i !== 1 && <span className={`anim-skeleton ${BAR} h-[10px] w-[16px]`} />}
          </span>
        ))}
      </nav>
      <div className={`anim-skeleton flex flex-col gap-[12px] ${px} pb-[24px] pt-[14px]`}>
        {wide ? (
          <div className="flex items-center gap-[10px]">
            <span className={`${SH} h-[46px] w-[480px]`} /><span className="flex-1" />
            <span className={`${SH} h-[46px] w-[130px]`} /><span className={`${SH} h-[46px] w-[230px]`} /><span className={`${SH} h-[46px] w-[150px]`} /><span className={`${SH} h-[46px] w-[90px]`} />
          </div>
        ) : (
          <>
            <span className={`${SH} h-[50px] w-full`} />
            <div className="flex justify-between"><span className={`${SH} h-[44px] w-[116px]`} /><span className={`${SH} h-[44px] w-[96px]`} /></div>
          </>
        )}
        <span className={`${BAR} mt-[8px] h-[13px] w-[110px]`} />
        <Rows n={wide ? 6 : 9} />
      </div>
    </div>
  );
}

// B's header: the shipped band with every per-deck fact as a shape (no art, no words).
const SKIN_B = `<style>
.skb .art-wash-art{background-image:none!important;background-color:var(--surface-sunken);opacity:1!important}
.skb [data-wash-label]{z-index:2}
.skb [data-testid="change-commander-door"],.skb button[aria-label="View card details"],.skb [data-testid="spine-rename-hint"],.skb h1+button,.skb h1~span button{visibility:hidden}
.skb [data-art-wash-band] ~ * button:not([aria-haspopup]){}
.skb [data-art-wash-band]{background:var(--surface-sunken)!important}
.skb [data-block-scrim]{display:none}
.skb h1,.skb [data-spine-meta],.skb [data-spine-chips]>*,.skb [data-spine-count]{color:transparent!important;background:var(--elevated);border-radius:4px;border-color:transparent!important;width:fit-content}
.skb h1 *,.skb [data-spine-meta] *,.skb [data-spine-chips] *,.skb [data-spine-count] *{visibility:hidden}
.skb [data-testid="spine-bar-fill"]{background:var(--surface-raised)!important}
.skb [data-testid="spine-band"] button,.skb [data-testid="spine-band"] a{visibility:hidden}
.skb header [data-art-wash-band]~* button{visibility:hidden}
</style>`;

const now = (wide: boolean) => <LoadingScreen copy={shellCopy.loading.decks} />;
app("N-phone", "phone", () => now(false), { vh: 844 });
app("N-desk", "desk", () => now(true), { vh: 860 });

const headerA = () => <><SpineDesktop {...hollowSp} /><div data-flip-row className="hidden md:flex" style={{ borderBottom: "1px solid var(--border)", padding: "6px 24px" }}><DeckFlipStrip flipState={f3} width="desktop" /></div><SpineMobile {...hollowSp} flipStrip={f3} /></>;
app("A-phone", "phone", () => <>{headerA()}<Body wide={false} /></>, { vh: 1580 });
app("A-desk", "desk", () => <>{headerA()}<Body wide /></>, { vh: 1180 });
app("B-phone", "phone", () => <div className="skb">{headerA()}<Body wide={false} /></div>, { vh: 1580, skin: SKIN_B });
app("B-desk", "desk", () => <div className="skb">{headerA()}<Body wide /></div>, { vh: 1180, skin: SKIN_B });
writeFileSync("dz/frames.json", JSON.stringify(frames));
