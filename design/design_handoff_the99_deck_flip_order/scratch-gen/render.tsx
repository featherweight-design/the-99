// Deck flip + custom order R2 (account 2, 2026-11-18): every frame is the shipped shell, the shipped deck header
// (SpineMobile / SpineDesktop) or the shipped Decks page (DecksView, DeckCard), rendered with the shipped CSS,
// with this round's proposal drawn in the app's own classes. Below the header, the rest of the deck page is the
// shipped kaldheim capture (public/about/pages/kaldheim).
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { SpineMobile } from "../src/components/decks/spine-mobile";
import { SpineDesktop } from "../src/components/decks/spine-desktop";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { DecksView } from "../src/components/decks/decks-view";
import { DeckCard } from "../src/components/decks/deck-card";

mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const frames: any[] = [];
function app(id: string, dev: "phone" | "desk", main: () => ReactNode, opts: { vh?: number; path?: string; g?: Record<string, unknown> } = {}) {
  for (const k of ["__WIDE", "__SORT", "__SORTOPEN", "__ARRANGE", "__SPINEACT", "__UNDERBAND", "__COUNTAFTER", "__SHELF", "__ARRLABEL", "__ARRCOUNT"]) delete G[k];
  G.__WIDE = dev === "desk";
  Object.assign(G, opts.g ?? {});
  G.__PATH = opts.path ?? "/decks";
  G.__AV = { initials: "WC", art: null };
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: new Date().toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  writeFileSync(`dz/frames/${id}.html`, renderToString(
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

// ---------- fixtures ----------
const NOW = "2026-11-18T12:00:00.000Z";
const D = (id: string, name: string, cmd: string, ci: string[], art: string, over: any = {}): any => ({ id, name, commanderName: cmd, commanderColorIdentity: ci, commanderImageUri: null, commanderArtCropUri: `art/${art}.jpg`,
  partnerName: null, partnerColorIdentity: null, folderId: null, folderName: null, statusPill: "Draft", bracket: null, built: 99, ownedCount: 99, toBuyCount: 0, unresolvedCount: 0, pendingChanges: 0, versionNumber: null,
  createdAt: new Date("2026-08-01"), lastPlayedAt: null, lastEditedAt: new Date("2026-11-10"), lastCommittedAt: null, inUseElsewhere: 0, proxiedCount: 0, ...over });
const DECKS = [
  D("d4", "Tidewrack Library", "Hakbal of the Surging Soul", ["W", "U"], "tide", { statusPill: "Complete", versionNumber: 3, lastPlayedAt: new Date("2026-11-16") }),
  D("d1", "Ashen Banner Parade", "Ashling, the Limitless", ["W", "U", "B", "R", "G"], "ashling", { statusPill: "To buy", toBuyCount: 8, ownedCount: 91, versionNumber: 1, pendingChanges: 2, lastPlayedAt: new Date("2026-11-14") }),
  D("d2", "Hollow Oak Hours", "Brawn, Amadeus Cho", ["U", "G"], "hollow", { toBuyCount: 14 }),
  D("d3", "Lanternlight Tinkers", "Zimone, Mystery Unraveler", ["U", "G"], "lantern", { built: 96 }),
  D("d5", "Saltmarsh Reclamation", "Slimefoot and Squee", ["B", "G"], "salt", { statusPill: "Building", built: 72 }),
];
const SHOP: any = { byDeck: new Map(), total: { copies: 45, cents: 76663, pricedCopies: 45 } };
// The deck on screen is #2 in Last played: Ashen Banner Parade, between Tidewrack Library and Hollow Oak Hours.
const cur = DECKS[1], prev = DECKS[0], next = DECKS[2];
const spineDeck: any = { id: cur.id, name: cur.name, intent: null,
  commander: { oracleId: "o4", name: cur.commanderName, colorIdentity: cur.commanderColorIdentity, artCropUri: cur.commanderArtCropUri, imageUri: cur.commanderArtCropUri, typeLine: "Legendary Creature", manaCost: "", oracleText: "" }, partner: null };
const sp: any = { deck: spineDeck, counts: { built: 99, ownedCount: 91, toBuyCount: 8 }, status: "To buy", onExport: () => {} };

// ---------- shared bits, drawn in the app's own classes ----------
const ghostSq = "flex flex-none cursor-pointer items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent p-0 text-[color:var(--fg)]";
const Chev = ({ dir, size = 16 }: { dir: "l" | "r"; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {dir === "l" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);
const Mono = ({ children, c = "--fg-faint", s = 11.5 }: { children: ReactNode; c?: string; s?: number }) => (
  <span className="font-mono" style={{ fontSize: s, color: `var(${c})` }}>{children}</span>
);
const pBody = <img src="art/p-body.png" alt="" style={{ width: 390, display: "block" }} />;
const dBody = <img src="art/d-body.png" alt="" style={{ width: "100%", maxWidth: 1238, display: "block" }} />;
const pRows = <img src="art/p-rows.png" alt="" style={{ width: 390, display: "block" }} />;

// A · Deck strip: a row above the band, outside the art.
const StripPhone = () => (
  <nav aria-label="Decks" className="flex h-[52px] items-center justify-between border-0 border-b border-solid border-b-[color:var(--border)] bg-[color:var(--bg)] pl-[6px] pr-[12px]">
    <a href="#" className="flex h-[44px] items-center gap-[4px] px-[8px] font-sans text-[14px] text-[color:var(--fg-body)] no-underline"><Chev dir="l" />All decks</a>
    <div className="flex items-center gap-[8px]">
      <Mono>2 of 5</Mono>
      <button type="button" aria-label="Previous deck · Tidewrack Library" className={`${ghostSq} h-[44px] w-[44px]`}><Chev dir="l" /></button>
      <button type="button" aria-label="Next deck · Hollow Oak Hours" className={`${ghostSq} h-[44px] w-[44px]`}><Chev dir="r" /></button>
    </div>
  </nav>
);
const StripDesk = ({ tip = false }: { tip?: boolean }) => (
  <nav aria-label="Decks" className="relative flex h-[48px] items-center justify-between border-0 border-b border-solid border-b-[color:var(--border)] bg-[color:var(--bg)] px-[24px]">
    <div className="flex items-center gap-[10px] font-sans text-[13px]">
      <a href="#" className="text-[color:var(--fg-body)] no-underline">Decks</a><span className="text-[color:var(--fg-faint)]">/</span>
      <a href="#" className="text-[color:var(--fg-body)] no-underline">All decks</a>
      <Mono>· Last played</Mono>
    </div>
    <div className="flex items-center gap-[8px]">
      <Mono>2 of 5</Mono>
      <button type="button" aria-label="Previous deck · Tidewrack Library" className={`${ghostSq} h-[32px] w-[32px]`}><Chev dir="l" /></button>
      <button type="button" aria-label="Next deck · Hollow Oak Hours" className={`${ghostSq} h-[32px] w-[32px] ${tip ? "bg-[color:var(--elevated)]" : ""}`}><Chev dir="r" /></button>
    </div>
    {tip && (
      <div className="absolute right-[18px] top-[44px] z-30 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] py-[8px] shadow-[0_22px_50px_rgba(0,0,0,0.6)]">
        <div><Mono s={10.5}>NEXT DECK</Mono></div>
        <div className="mt-[2px] flex items-center gap-[10px] font-sans text-[13px] text-[color:var(--fg)]">Hollow Oak Hours<span className="rounded-[4px] border border-solid border-[color:var(--border-strong)] px-[5px] font-mono text-[11px] text-[color:var(--fg-faint)]">→</span></div>
      </div>
    )}
  </nav>
);

// B · Neighbour row: under the header, named neighbours.
const NB = ({ d, dir, h }: { d: any; dir: "l" | "r"; h: number }) => (
  <button type="button" className={`flex min-w-0 flex-1 cursor-pointer items-center gap-[10px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] text-left ${dir === "r" ? "flex-row-reverse text-right" : ""}`} style={{ height: h }}>
    <span className="text-[color:var(--fg-faint)]"><Chev dir={dir} /></span>
    <span className="flex min-w-0 flex-col">
      <Mono s={10.5}>{dir === "l" ? "PREVIOUS" : "NEXT"}</Mono>
      <span className="truncate font-sans text-[14px] text-[color:var(--fg)]">{d.name}</span>
    </span>
  </button>
);
const NeighbourPhone = () => (
  <div className="border-0 border-b border-solid border-b-[color:var(--border)] px-[16px] pb-[14px] pt-[4px]">
    <div className="mb-[8px] flex justify-between"><Mono>Last played · All decks</Mono><Mono>2 of 5</Mono></div>
    <div className="flex gap-[8px]"><NB d={prev} dir="l" h={56} /><NB d={next} dir="r" h={56} /></div>
  </div>
);
const NeighbourDesk = () => (
  <div className="flex items-center justify-end gap-[10px] border-0 border-b border-solid border-b-[color:var(--border)] px-[24px] py-[12px]">
    <span className="mr-auto"><Mono>Last played · All decks · 2 of 5 · ← → to flip</Mono></span>
    <div className="flex w-[520px] gap-[8px]"><NB d={prev} dir="l" h={48} /><NB d={next} dir="r" h={48} /></div>
  </div>
);

// C · Switch deck: one more control in the header's actions row, opening the list.
const SwitchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="6" width="13" height="15" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v13" />
  </svg>
);
const SwitchPhoneBtn = (
  <button type="button" aria-label="Switch deck, 2 of 5" className="flex min-h-[44px] items-center gap-[6px] rounded-[7px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[9px] py-[6px] font-mono text-[11px] text-[color:var(--accent-text)]">
    <SwitchIcon />2 of 5
  </button>
);
const SwitchDeskBtn = (
  <button type="button" className="flex h-[36px] items-center gap-[8px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[12px] font-sans text-[13px] font-medium text-[color:var(--fg)]">
    <SwitchIcon />2 of 5<span className="text-[color:var(--fg-faint)]">▾</span>
  </button>
);
const SwitchRow = ({ d, i, on }: { d: any; i: number; on: boolean }) => (
  <button type="button" className={`flex min-h-[56px] w-full cursor-pointer items-center gap-[12px] border-x-0 border-b-0 border-solid border-t border-t-[color:var(--elevated)] px-[14px] py-[6px] text-left ${on ? "bg-[color:var(--elevated)]" : "bg-transparent"}`}>
    <Mono s={11}>{i + 1}</Mono>
    <img src={d.commanderArtCropUri} alt="" className="h-[40px] w-[58px] flex-none rounded-[5px] object-cover" />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate font-display text-[16px] text-[color:var(--fg)]">{d.name}</span>
      <Mono s={11}>{d.statusPill} · {d.built} / 99</Mono>
    </span>
    {on && <span className="text-[color:var(--accent)]">✓</span>}
  </button>
);
const SwitchList = () => (<>{DECKS.map((d, i) => <SwitchRow key={d.id} d={d} i={i} on={d.id === cur.id} />)}</>);
const SwitchSheet = () => (
  <div className="fixed inset-0 z-40">
    <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" />
    <div className="absolute inset-x-0 bottom-0 rounded-t-[16px] border-0 border-t border-solid border-t-[color:var(--border-strong)] bg-[color:var(--surface)] pb-[24px]">
      <div className="flex items-center justify-between pl-[16px] pr-[4px] pt-[4px]">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">Switch deck · Last played</span>
        <button type="button" aria-label="Close" className="flex h-[44px] w-[44px] items-center justify-center border-0 bg-transparent text-[18px] text-[color:var(--fg-muted)]">✕</button>
      </div>
      <SwitchList />
    </div>
  </div>
);
const SwitchPop = () => (
  <div style={{ position: "absolute", right: 24, top: 300, width: 360 }} className="z-40 overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)]">
    <div className="px-[14px] py-[10px]"><span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">Last played · All decks</span></div>
    <SwitchList />
  </div>
);

// D · Next deck at the foot of the page: shipped DeckCard tiles.
const FootTiles = ({ wide }: { wide: boolean }) => (
  <section className={wide ? "px-[24px] py-[28px]" : "px-[16px] py-[20px]"}>
    <div className="mb-[10px] flex justify-between"><span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">Keep going · Last played · 2 of 5</span></div>
    <div className={wide ? "grid grid-cols-2 gap-[16px]" : "flex flex-col gap-[12px]"} style={wide ? { maxWidth: 820, marginLeft: "auto" } : undefined}>
      {(wide ? [prev, next] : [next]).map((d, i) => (
        <div key={d.id}>
          <div className="mb-[6px] flex items-center gap-[6px] text-[color:var(--fg-body)]">{(wide && i === 0) ? <><Chev dir="l" size={14} /><Mono c="--fg-body">Previous</Mono></> : <><Mono c="--fg-body">Next</Mono><Chev dir="r" size={14} /></>}</div>
          <DeckCard deck={d} shopping={undefined} now={new Date(NOW)} folders={[]} onCreateFolder={() => {}} onMove={async () => true} />
        </div>
      ))}
      {!wide && <a href="#" className="flex h-[48px] items-center justify-center gap-[6px] rounded-[10px] border border-solid border-[color:var(--border-strong)] font-sans text-[14px] text-[color:var(--fg-body)] no-underline"><Chev dir="l" size={14} />Previous · Tidewrack Library</a>}
    </div>
  </section>
);

// ---------- flip frames ----------
const P = { path: "/decks/d4" };
app("F0-phone", "phone", () => <><SpineMobile {...sp} />{pBody}</>, { ...P, vh: 1200 });
app("F0-desk", "desk", () => <><SpineDesktop {...sp} />{dBody}</>, { ...P, vh: 900 });
app("FA-phone", "phone", () => <><StripPhone /><SpineMobile {...sp} />{pBody}</>, { ...P, vh: 1200 });
app("FA-desk", "desk", () => <><StripDesk tip /><SpineDesktop {...sp} />{dBody}</>, { ...P, vh: 900 });
app("FB-phone", "phone", () => <><SpineMobile {...sp} /><NeighbourPhone />{pBody}</>, { ...P, vh: 1200 });
app("FB-desk", "desk", () => <><SpineDesktop {...sp} /><NeighbourDesk />{dBody}</>, { ...P, vh: 900 });
app("FC-phone", "phone", () => <><SpineMobile {...sp} />{pBody}</>, { ...P, vh: 1200, g: { __SPINEACT: SwitchPhoneBtn } });
app("FC-phone-open", "phone", () => <><SpineMobile {...sp} />{pBody}<SwitchSheet /></>, { ...P, vh: 844, g: { __SPINEACT: SwitchPhoneBtn } });
app("FC-desk-open", "desk", () => <><SpineDesktop {...sp} />{dBody}<SwitchPop /></>, { ...P, vh: 900, g: { __SPINEACT: SwitchDeskBtn } });
app("FD-phone", "phone", () => <>{pRows}<FootTiles wide={false} /></>, { ...P, vh: 1330 });
app("FD-desk", "desk", () => <>{dBody}<FootTiles wide /></>, { ...P, vh: 1400 });

// ---------- custom order frames ----------
const list = () => <DecksView decks={DECKS} folders={[]} shopping={SHOP} buildable={9} cards={1284} now={NOW} />;
app("O1-desk", "desk", list, { vh: 900, g: { __SORT: "custom", __SORTOPEN: true, __ARRANGE: true } });
app("O1-phone", "phone", list, { vh: 1100, g: { __SORT: "custom", __SORTOPEN: true, __ARRANGE: true } });

const Handle = ({ lifted }: { lifted?: boolean }) => (
  <button type="button" aria-label="Move" className={`flex h-[52px] w-[44px] flex-none cursor-grab items-center justify-center rounded-[8px] border-0 ${lifted ? "bg-[color:var(--elevated)] outline outline-2 outline-[color:var(--accent)]" : "bg-transparent"} text-[color:var(--fg-muted)]`}>
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden>{[0, 1, 2].flatMap((r) => [0, 1].map((c) => <circle key={`${r}${c}`} cx={3 + c * 8} cy={4 + r * 6} r="1.8" />))}</svg>
  </button>
);
const ARow = ({ d, i, wide, lifted }: { d: any; i: number; wide: boolean; lifted?: boolean }) => (
  <li className={`flex items-center gap-[12px] rounded-[12px] border border-solid ${lifted ? "relative z-10 -rotate-[0.6deg] border-[color:var(--accent)] bg-[color:var(--surface-raised)] shadow-[0_22px_50px_rgba(0,0,0,0.6)]" : "border-[color:var(--border-strong)] bg-[color:var(--surface)]"} p-[8px]`} style={{ listStyle: "none", height: 76 }}>
    {wide && <span className="w-[18px] text-right"><Mono s={12}>{i + 1}</Mono></span>}
    <img src={d.commanderArtCropUri} alt="" className="h-[58px] w-[86px] flex-none rounded-[7px] object-cover" />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate font-display text-[17px] text-[color:var(--fg)]">{d.name}</span>
      <span className="truncate font-mono text-[11.5px] text-[color:var(--fg-muted)]">{wide ? `${d.commanderName} · ` : ""}{d.statusPill} · {d.built} / 99</span>
    </span>
    <Handle lifted={lifted} />
  </li>
);
const Slot = () => <li className="rounded-[12px] border-[1.5px] border-dashed border-[color:var(--border-dashed)]" style={{ listStyle: "none", height: 76 }} />;
const ArrangeHead = ({ wide }: { wide: boolean }) => (
  <div className={`flex ${wide ? "items-end justify-between" : "flex-col"} gap-[12px] border-0 border-b border-solid border-b-[color:var(--border)] pb-[16px]`}>
    <div>
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">All decks · 5</span>
      <h1 className="m-0 mt-[6px] font-display text-[26px] font-normal text-[color:var(--fg)]">Arrange decks</h1>
      <p className="m-0 mt-[6px] font-sans text-[13.5px] text-[color:var(--fg-muted)]">Drag a deck by its handle. Filters and search come back when you’re done.</p>
    </div>
    {wide && <div className="flex gap-[10px]"><button type="button" className="h-[36px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] font-sans text-[14px] text-[color:var(--fg)]">Cancel</button><button type="button" className="h-[36px] rounded-[8px] border-0 bg-[color:var(--fg)] px-[18px] font-sans text-[14px] font-semibold text-[color:var(--bg)]">Done</button></div>}
  </div>
);
const Arrange = ({ wide }: { wide: boolean }) => {
  const order = [DECKS[0], DECKS[2], DECKS[1], DECKS[3], DECKS[4]];
  return (
    <div className={wide ? "px-[24px] pt-[24px]" : "px-[16px] pt-[20px]"}>
      <ArrangeHead wide={wide} />
      <ol className="m-0 mt-[16px] flex flex-col gap-[8px] p-0" style={{ maxWidth: wide ? 680 : undefined }}>
        <ARow d={order[0]} i={0} wide={wide} />
        <ARow d={order[1]} i={1} wide={wide} lifted />
        <Slot />
        <ARow d={order[3]} i={3} wide={wide} />
        <ARow d={order[4]} i={4} wide={wide} />
      </ol>
      {!wide && (
        <div className="fixed inset-x-0 z-20 flex gap-[10px] border-0 border-t border-solid border-t-[color:var(--border)] bg-[color:var(--bg)] px-[16px] py-[12px]" style={{ bottom: "var(--tabbar-h)" }}>
          <button type="button" className="h-[44px] flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent font-sans text-[15px] text-[color:var(--fg)]">Cancel</button>
          <button type="button" className="h-[44px] flex-1 rounded-[8px] border-0 bg-[color:var(--fg)] font-sans text-[15px] font-semibold text-[color:var(--bg)]">Done</button>
        </div>
      )}
    </div>
  );
};
app("O2-desk", "desk", () => <Arrange wide />, { vh: 860 });
app("O2-phone", "phone", () => <Arrange wide={false} />, { vh: 844 });

// ================= R3 =================
// One strip, the same markup at both widths: the way back on the left, position and arrows on the right. No hover card.
const Flip = ({ sq, cap = true }: { sq: number; cap?: boolean }) => (
  <div className="flex flex-none items-center gap-[8px]">
    {cap && <Mono>2 of 5</Mono>}
    <button type="button" title="Previous deck · Tidewrack Library (←)" aria-label="Previous deck · Tidewrack Library" className={ghostSq} style={{ width: sq, height: sq }}><Chev dir="l" /></button>
    <button type="button" title="Next deck · Hollow Oak Hours (→)" aria-label="Next deck · Hollow Oak Hours" className={ghostSq} style={{ width: sq, height: sq }}><Chev dir="r" /></button>
  </div>
);
const Back = ({ label = "All decks" }: { label?: string }) => (
  <a href="#" className="flex h-[44px] items-center gap-[4px] font-sans text-[14px] text-[color:var(--fg-body)] no-underline"><Chev dir="l" />{label}</a>
);
const Strip = ({ wide, label, border = "b" }: { wide: boolean; label?: string; border?: "b" | "t" | "none" }) => (
  <nav aria-label="Decks" className="flex w-full items-center justify-between bg-[color:var(--bg)]"
    style={{ height: wide ? 48 : 52, padding: wide ? "0 24px 0 18px" : "0 12px 0 10px", borderBottom: border === "b" ? "1px solid var(--border)" : undefined, borderTop: border === "t" ? "1px solid var(--border)" : undefined }}>
    <Back label={label} /><Flip sq={wide ? 36 : 44} />
  </nav>
);
// E · Under the art: the same strip as the under-band block's first row (phone), directly under the band (desktop).
const UnderRow = () => (
  <div className="flex w-full items-center justify-between" style={{ margin: "-6px -4px 2px" , width: "calc(100% + 8px)" }}>
    <Back /><Flip sq={44} />
  </div>
);
// F · In the count row: no new height. The bar gives up the width.
const CountFlip = ({ wide }: { wide: boolean }) => (
  <div className="flex flex-none items-center gap-[6px]" style={{ marginLeft: wide ? 14 : 6 }}>
    <span aria-hidden style={{ width: 1, height: 20, background: "var(--border-strong)", marginRight: 6 }} />
    <Flip sq={wide ? 32 : 44} />
  </div>
);
// G · By the thumbs: a pill floating over the bottom-right, above the add bar and tab bar.
const Pill = ({ wide }: { wide: boolean }) => (
  <div className="fixed z-30 flex items-center gap-[2px] rounded-[14px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[3px] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
    style={wide ? { right: 24, bottom: 24 } : { right: 12, bottom: "calc(var(--tabbar-h) + 76px)" }}>
    <button type="button" aria-label="Previous deck · Tidewrack Library" className="flex h-[44px] w-[44px] items-center justify-center rounded-[11px] border-0 bg-transparent text-[color:var(--fg)]"><Chev dir="l" /></button>
    <Mono c="--fg-body" s={12.5}>2 of 5</Mono>
    <button type="button" aria-label="Next deck · Hollow Oak Hours" className="flex h-[44px] w-[44px] items-center justify-center rounded-[11px] border-0 bg-transparent text-[color:var(--fg)]"><Chev dir="r" /></button>
  </div>
);
const pBodyAdd = <div style={{ position: "relative" }}>{pBody}</div>;
app("RA-phone", "phone", () => <><Strip wide={false} /><SpineMobile {...sp} />{pBody}</>, { ...P, vh: 1000 });
app("RA-desk", "desk", () => <><Strip wide /><SpineDesktop {...sp} />{dBody}</>, { ...P, vh: 760 });
app("RE-phone", "phone", () => <><SpineMobile {...sp} />{pBody}</>, { ...P, vh: 1000, g: { __UNDERBAND: <UnderRow /> } });
app("RE-desk", "desk", () => <><SpineDesktop {...sp} /><Strip wide border="b" />{dBody}</>, { ...P, vh: 760 });
app("RF-phone", "phone", () => <><SpineMobile {...sp} />{pBody}</>, { ...P, vh: 1000, g: { __COUNTAFTER: <CountFlip wide={false} /> } });
app("RF-desk", "desk", () => <><SpineDesktop {...sp} />{dBody}</>, { ...P, vh: 760, g: { __COUNTAFTER: <CountFlip wide /> } });
app("RG-phone", "phone", () => <><SpineMobile {...sp} />{pBodyAdd}<Pill wide={false} /></>, { ...P, vh: 844 });
app("RG-phone-scrolled", "phone", () => <>{pRows}<Pill wide={false} /></>, { ...P, vh: 844 });
app("RG-desk", "desk", () => <><SpineDesktop {...sp} />{dBody}<Pill wide /></>, { ...P, vh: 760 });

// Arrange, centred on desktop, and inside a folder.
const SIMIC = [DECKS[2], DECKS[3]];
const ArrangeC = ({ wide, folder }: { wide: boolean; folder?: boolean }) => {
  const rows = folder ? [DECKS[3], DECKS[2]] : [DECKS[0], DECKS[2], DECKS[1], DECKS[3], DECKS[4]];
  return (
    <div className={wide ? "px-[24px] pt-[28px]" : "px-[16px] pt-[20px]"}>
      <div style={{ maxWidth: wide ? 720 : undefined, margin: wide ? "0 auto" : undefined }}>
        <div className={`flex ${wide ? "items-end justify-between" : "flex-col"} gap-[12px] border-0 border-b border-solid border-b-[color:var(--border)] pb-[16px]`}>
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{folder ? "Folder · Simic · 2" : "All decks · 5"}</span>
            <h1 className="m-0 mt-[6px] font-display text-[26px] font-normal text-[color:var(--fg)]">{folder ? "Arrange Simic" : "Arrange decks"}</h1>
            <p className="m-0 mt-[6px] font-sans text-[13.5px] text-[color:var(--fg-muted)]">{folder ? "Moves these decks among themselves. Your other decks keep their places in All decks." : "Drag a deck by its handle. Filters and search come back when you’re done."}</p>
          </div>
          {wide && <div className="flex gap-[10px]"><button type="button" className="h-[36px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] font-sans text-[14px] text-[color:var(--fg)]">Cancel</button><button type="button" className="h-[36px] rounded-[8px] border-0 bg-[color:var(--fg)] px-[18px] font-sans text-[14px] font-semibold text-[color:var(--bg)]">Done</button></div>}
        </div>
        <ol className="m-0 mt-[16px] flex flex-col gap-[8px] p-0">
          {folder ? <><ARow d={rows[0]} i={0} wide={wide} lifted /><ARow d={rows[1]} i={1} wide={wide} /></> : <>
            <ARow d={rows[0]} i={0} wide={wide} /><ARow d={rows[1]} i={1} wide={wide} lifted /><Slot /><ARow d={rows[3]} i={3} wide={wide} /><ARow d={rows[4]} i={4} wide={wide} /></>}
        </ol>
      </div>
      {!wide && (
        <div className="fixed inset-x-0 z-20 flex gap-[10px] border-0 border-t border-solid border-t-[color:var(--border)] bg-[color:var(--bg)] px-[16px] py-[12px]" style={{ bottom: "var(--tabbar-h)" }}>
          <button type="button" className="h-[44px] flex-1 rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent font-sans text-[15px] text-[color:var(--fg)]">Cancel</button>
          <button type="button" className="h-[44px] flex-1 rounded-[8px] border-0 bg-[color:var(--fg)] font-sans text-[15px] font-semibold text-[color:var(--bg)]">Done</button>
        </div>
      )}
    </div>
  );
};
app("RO-desk", "desk", () => <ArrangeC wide />, { vh: 760 });
app("RO-desk-folder", "desk", () => <ArrangeC wide folder />, { vh: 560 });
app("RO-phone-folder", "phone", () => <ArrangeC wide={false} folder />, { vh: 844 });
const FOLDERS: any = [{ id: "f1", name: "Simic", deckCount: 2, createdAt: new Date("2026-09-01") }];
const SD = DECKS.map((d) => (d.id === "d2" || d.id === "d3") ? { ...d, folderId: "f1", folderName: "Simic" } : d);
app("RO-folder-list-desk", "desk", () => <DecksView decks={SD} folders={FOLDERS} shopping={SHOP} buildable={9} cards={1284} now={NOW} />, { vh: 900, g: { __SORT: "custom", __SORTOPEN: true, __ARRANGE: true, __SHELF: "f1", __ARRLABEL: "Arrange Simic…", __ARRCOUNT: 2 } });

writeFileSync("dz/frames.json", JSON.stringify(frames));
