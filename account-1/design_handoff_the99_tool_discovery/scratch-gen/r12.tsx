// Finding the tools R12 (account 1, 2026-11-24): Home search follow-ups: tool marks, a press that opens, a deck picker, halos.
import { writeFileSync } from "node:fs";
import { shell } from "./shell";
import { Dashboard } from "../src/components/home/dashboard";
import { WelcomeStrip } from "../src/components/welcome/welcome-strip";
import { named } from "../src/lib/person-name/mint";
import { HomeSearchPanel, ToolAnswers, ANSWERS, HeadSearch, FirstRunSearchRow } from "./ask";
import { FirstRunChecklist } from "../src/components/home/first-run";
import { FeedSheet } from "./feed-sheet";
import { OfferAnswerSheet } from "../src/components/home/offer-answer-sheet";
const G = globalThis as any;
const NOW = new Date("2026-11-23T15:00:00Z");
const facts: any = { lot: "held", units: 3, left: 3, expiresAtMs: Date.UTC(2026, 10, 30, 12), days: 7, teaser: true, free: 1 };
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const deck = (id: string, name: string, cmd: string, art: string, ci: string[], o: any = {}): any => ({ id, name, createdAt: ago(400), commanderName: cmd, commanderColorIdentity: ci, commanderImageUri: `art/c-${art}.jpg`, commanderArtCropUri: `art/a-${art}.jpg`, partnerName: null, partnerColorIdentity: null, folderId: null, folderName: null, built: 99, ownedCount: 93, toBuyCount: 6, unresolvedCount: 0, pendingChanges: 0, versionNumber: 3, lastPlayedAt: null, lastEditedAt: ago(5), inUseElsewhere: 0, proxiedCount: 0, statusPill: "To buy", bracket: { permits: [3], answered: null }, ...o, lastCommittedAt: o.lastEditedAt ?? ago(5) });
const DECKS = [
  deck("d1", "Ashen Banner Parade", "Ashling, the Limitless", "ashling", ["W", "U", "B", "R", "G"]),
  deck("d2", "Giada's Choir", "Giada, Font of Hope", "giada", ["W"], { lastEditedAt: ago(30), built: 96, ownedCount: 88, toBuyCount: 8, statusPill: "Draft", bracket: { permits: [2], answered: null } }),
  deck("d3", "Counting Lands", "Zimone, Mystery Unraveler", "zimone", ["U", "G"], { lastEditedAt: ago(70), ownedCount: 99, toBuyCount: 0, statusPill: "Complete", bracket: { permits: [4], answered: null } }),
  deck("d4", "Crystal Tower", "Y'shtola, Night's Blessed", "yshtola", ["W", "U", "B"], { lastEditedAt: ago(140), built: 84, ownedCount: 80, toBuyCount: 19, statusPill: "To buy" }),
  deck("d5", "Tam's Lost Things", "Tam, Mindful First-Year", "tam", ["G", "U"], { lastEditedAt: ago(300), ownedCount: 97, toBuyCount: 2, statusPill: "To buy" }),
];
const COLIN = { publicId: "p1", displayName: named("Colin") };
const view = (n: number, o: any = {}): any => ({ key: `k${n}`, kind: "new-set", at: ago(n * 6 + 2).toISOString(), unseen: false, card: null, friend: null, href: `/collection/sets/s${n}`, opens: null, outbound: null, name: `Set ${n}`, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o });
const card = (id: string, name: string, art: string, ci: string[]) => ({ oracleId: id, name, image: `art/c-${art}.jpg`, art: `art/c-${art}.jpg`, colorIdentity: ci });
const LEAD = view(0, { kind: "trade-match", unseen: true, key: "lead", name: null, href: "/friends/p1", card: card("g", "Ghalta, Primal Hunger", "ghalta", ["G"]), friend: COLIN });
const FEED: any = { chosen: true, on: ["new-set", "new-precon", "price-drop", "trade-match", "combo"], unseen: 2, lead: LEAD, items: [
  view(1, { kind: "price-drop", unseen: true, href: null, outbound: "https://example.com", name: null, card: card("l", "Lathliss, Dragon Queen", "lathliss", ["R"]), drop: { fromCents: 1240, toCents: 890, printing: null } }),
  view(2, { kind: "combo", href: null, opens: "gi", name: null, card: card("gi", "Gisa, the Hellraiser", "gisa", ["B"]), combo: { pieces: ["Gisa, the Hellraiser", "Bloodline Keeper"], added: "Gisa, the Hellraiser", variantId: "v1" } }),
  view(3, { kind: "price-drop", href: null, outbound: "https://example.com", name: null, card: card("sw", "Swords to Plowshares", "swords", ["W"]), drop: { fromCents: 310, toCents: 224, printing: null } }),
  view(4, { kind: "combo", href: null, opens: "ze", name: null, card: card("ze", "Zimone, Mystery Unraveler", "zimone", ["U", "G"]), combo: { pieces: ["Zimone, Mystery Unraveler", "Avenger of Zendikar"], added: "Avenger of Zendikar", variantId: "v2" } }),
  view(5, { kind: "new-set", name: "Avatar: The Last Airbender", setSize: 286 }),
  view(6, { kind: "combo", href: null, opens: "mo", name: null, card: card("mo", "The Mothman", "mothman", ["B", "G"]), combo: { pieces: ["The Mothman", "Cemetery Prowler"], added: "Cemetery Prowler", variantId: "v3" } }),
  view(7, { kind: "price-drop", href: null, outbound: "https://example.com", name: null, card: card("ms", "Mystical Tutor", "mystical-tutor", ["U"]), drop: { fromCents: 1890, toCents: 1525, printing: null } }),
] };
const FRIENDS: any = {
  you: { displayName: "You", commander: null },
  friends: [
    { ...COLIN, commander: { oracleId: "x", name: "Ghalta, Primal Hunger", artCropUri: "art/face-ghalta.jpg" } },
    { publicId: "p2", displayName: named("Maya"), commander: { oracleId: "y", name: "Jace", artCropUri: "art/face-jace.jpg" } },
    { publicId: "p3", displayName: named("Rui"), commander: { oracleId: "z", name: "Sai", artCropUri: "art/face-sai.jpg" } },
    { publicId: "p4", displayName: named("Priya"), commander: { oracleId: "w", name: "Zimone", artCropUri: "art/face-zimone.jpg" } },
    { publicId: "p6", displayName: named("Max"), commander: null },
  ],
  links: [], invites: null,
};
const face = (n: string, you = false, art: string | null = null) => ({ displayName: you ? n : named(n), you, commander: art ? { oracleId: n, name: n, artCropUri: art } : null });
const TABLE: any = { tableId: "t1", podId: "p1", podName: named("Thursday night"), closesAt: new Date("2026-11-24T02:00:00Z"), setByYou: false, setterName: COLIN.displayName, yourDeck: "Ashen Banner Parade", seats: [face("You", true, "art/a-ashling.jpg"), face("Colin", false, "art/face-ghalta.jpg"), face("Maya", false, "art/face-jace.jpg")] };
const LOG: any = { gameMs: Date.parse("2026-11-20T03:00:00Z"), startedAt: new Date("2026-11-20T03:00:00Z"), deckId: 1, deckName: "Crystal Tower", result: { kind: "won", name: COLIN.displayName },
  seats: [{ name: COLIN.displayName, you: false, place: 1, artCropUri: "art/face-ghalta.jpg" }, { name: named("You"), you: true, place: 2, artCropUri: "art/a-yshtola.jpg" }, { name: named("Maya"), you: false, place: 3, artCropUri: "art/face-jace.jpg" }],
  loggedAt: null, until: new Date("2026-11-27T11:00:00Z"), tableId: "7a0e0000-0000-4000-8000-000000000001", podName: named("Thursday night") };
const ARRIVALS: any = { lines: [{ kind: "set", code: "trc", name: "Star Trek Commander", revealed: 15 }], href: "/decks/precons?sort=newest#announced", keys: ["trc"] };
const ART = ["art/c-killian.jpg", "art/c-lathliss.jpg", "art/c-ghalta.jpg"];
const SHEET: any = { shape: "decks", lead: [], line: null, rows: [] };
function full(name: string, dev: "phone" | "desk", panel: any = {}, alt: "" | "a" | "c" = "", over: any = null, feed: any = null, badges: any = { home: 2, friends: 1 }) {
  G.__VW = dev === "desk" ? 1300 : 390; G.__INLINE = true; G.__BADGES = badges; G.__FOOT = true; G.__FACE = { name: "You", art: "art/a-tam.jpg", commander: null };
  const ws = <WelcomeStrip facts={facts} sheet={SHEET} place="dashboard" />;
  const strip = ws;
  const html = shell(
    <Dashboard stats={{ totalCards: 4492, uniqueCards: 2926 }} lastUpdated={new Date("2026-11-21T12:00:00Z")} timeZone="UTC" ready={null}
      inUse={new Map()} decks={DECKS} commitments={{ inUse: 488, overCommitted: 2 } as any}
      shopping={{ byDeck: new Map([["d1", { copies: 6, cents: 2140 }], ["d2", { copies: 8, cents: 3120 }], ["d4", { copies: 19, cents: 7480 }], ["d5", { copies: 2, cents: 1520 }]]), total: { copies: 35, cents: 14260, pricedCopies: 35 } } as any} welcome={strip} searchUserId="u1"
      feed={feed ?? FEED} zone="UTC" archive friends={FRIENDS} tables={[TABLE]} logGames={[LOG]} arrivals={ARRIVALS} now={NOW.toISOString()} commandersPlace />,
    "/", over);
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0; G.__FOOT = false;
}

import { ToolRow, ToolsHeading } from "../src/components/card-search/ask-results";
import { SearchProgress } from "../src/components/card-search/card-search";
import { SearchField } from "../src/components/ui/text-field";
import { SearchGlyph } from "../src/components/card-search/card-search";
import { showcaseCopy } from "../src/lib/copy/discovery";
import { askCopy } from "../src/lib/copy/card-search";
const T = showcaseCopy.tools as any;
G.__STARTERS = ["Where can my spare cards go?", "How do I make my deck better?", "What can I build with my cards?", "What should I buy next?"];
const tm = (id: string, credit: string | null, state: any): any => ({ id, copy: T[id], credit, state, note: null });
const BUILD = [tm("help-me-choose", "1 credit", { kind: "page", href: "/decks/new/choose?tool=help-me-choose", label: T["help-me-choose"].press }), tm("precons", null, { kind: "page", href: "/decks/precons?tool=precons", label: T.precons.press })];
const BETTER = [tm("suggested-changes", "1 credit", { kind: "deck", href: "/decks/d1?tool=suggested-changes", deck: "Ashen Banner Parade", more: 3 }), tm("lineup", null, { kind: "page", href: "/decks?view=stats&tool=lineup", label: T.lineup?.press ?? "Open Stats" })];
function Tools({ models }: { models: any[] }) {
  return <div role="listbox" aria-label="Tools"><ToolsHeading />{models.map((m, i) => <ToolRow key={m.id} model={m} id={`t-${i}`} first={i === 0} active={false} onPress={() => {}} />)}</div>;
}
const PICK_DECKS = [DECKS[0], DECKS[2], DECKS[3], DECKS[4]];
const edited = (d: any) => { const h = Math.round((NOW.getTime() - d.lastEditedAt.getTime()) / 3600000); return h < 24 ? `edited ${h}h ago` : `edited ${Math.round(h / 24)}d ago`; };
/** R12 proposed: a deck tool that fits several decks asks which, inside the search, before it goes. */
function DeckPick({ tool, decks, active = 0 }: { tool: any; decks: any[]; active?: number }) {
  return (
    <div data-ask-pick="" role="group" aria-label={`${tool.copy.name}: pick a deck`}>
      <div className="flex items-center gap-2 px-2 pt-1 pb-2 md:px-[6px]">
        <button type="button" className="flex h-11 min-w-11 items-center gap-1 rounded-[8px] px-2 text-[14px] font-medium text-[color:var(--accent-text)] md:h-8 md:text-[13px]"><span aria-hidden>‹</span> Answers</button>
      </div>
      <div className="flex items-center gap-3 px-4 pb-3 md:px-[14px]">
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex items-center gap-2"><span className="text-[16px] font-semibold text-[color:var(--fg)] md:text-[15px]">{tool.copy.name}</span>
          <span className="flex-none rounded-full border border-solid border-[color:var(--border-strong)] px-2 font-mono text-[10.5px] leading-[18px] text-[color:var(--fg-body)]">{tool.credit ?? askCopy.free}</span></span>
          <span className="text-[13px] leading-[1.45] text-[color:var(--fg-muted)] md:text-[12.5px]">Which deck? {decks.length} of yours can use it.</span>
        </span>
      </div>
      <h3 className="px-4 pt-1 pb-[6px] font-mono text-[10.5px] font-medium tracking-[0.14em] text-[color:var(--fg-faint)] uppercase md:px-[14px]">Your decks, last touched first</h3>
      <div role="listbox" aria-label="Your decks">
        {decks.map((d, i) => (
          <div key={d.id} role="option" aria-selected={i === active} className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[8px] py-2 pr-[14px] pl-4 md:min-h-[54px] md:py-[6px] md:pl-[14px] ${i ? "border-t border-solid border-[color:var(--border)]" : ""} ${i === active ? "bg-[color:var(--elevated)]" : ""}`}>
            <span className="block h-[44px] w-[60px] flex-none overflow-hidden rounded-[6px] border border-solid border-[color:var(--border-strong)] md:h-[36px] md:w-[50px]"><img src={d.commanderArtCropUri} alt="" className="h-full w-full object-cover" /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="truncate font-display text-[15px] font-bold text-[color:var(--fg)] md:text-[14px]">{d.name}</span>
              <span className="truncate font-mono text-[11px] text-[color:var(--fg-faint)]">{d.commanderName} · {edited(d)}</span>
            </span>
            <span aria-hidden className="flex-none text-[16px] text-[color:var(--fg-faint)]">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function DeskDrop({ children, busy = false }: { children: any; busy?: boolean }) {
  return (
    <div hidden data-drop-holder="">
      <div data-drop="" className="absolute top-full right-0 left-0 z-40 mt-2">
        <div className="flex flex-col overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[6px] shadow-[0_22px_50px_rgba(0,0,0,0.6)]">
          {busy ? <div className="mb-1 flex-none"><SearchProgress /></div> : null}
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
function PhoneSheet({ q, children, busy = false }: { q: string; children: any; busy?: boolean }) {
  return (
    <div data-card-search-sheet="" className="fixed inset-0 z-50 flex flex-col bg-[color:var(--bg)]">
      <div className="flex items-center gap-[6px] border-b border-b-[color:var(--border)] py-3 pr-2 pl-[14px] pt-[14px]">
        <SearchField containerClassName="h-11 min-w-0 flex-1 rounded-[10px] border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] pr-[6px] pl-[13px]" className="text-[16px] whitespace-nowrap"
          leading={<span className="flex-none text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>} value={q} onChange={() => {}} placeholder={askCopy.placeholder} />
        <button type="button" className="flex h-11 w-11 flex-none items-center justify-center text-[16px] text-[color:var(--fg-muted)]">✕</button>
      </div>
      {busy ? <SearchProgress /> : null}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
type V = { name: string; q: string; body: () => any; busy?: boolean; big?: boolean; pending?: string; pick?: boolean };
const VARIANTS: V[] = [
  { name: "mk0", q: "what can I build with my cards?", body: () => <Tools models={BUILD} /> },
  { name: "mk1", q: "what can I build with my cards?", body: () => <Tools models={BUILD} />, big: true },
  { name: "go", q: "what can I build with my cards?", body: () => <Tools models={BUILD} />, big: true, pending: "precons", busy: true },
  { name: "pk0", q: "how do I make my deck better?", body: () => <Tools models={BETTER} /> },
  { name: "pk1", q: "how do I make my deck better?", body: () => <Tools models={BETTER} />, big: true, pick: true },
  { name: "pk2", q: "how do I make my deck better?", body: () => <DeckPick tool={BETTER[0]} decks={PICK_DECKS} />, big: true },
];
for (const v of VARIANTS) {
  G.__BIGMARK = !!v.big; G.__PENDING = v.pending; G.__PICKLINE = !!v.pick;
  for (const dev of ["phone", "desk"] as const) {
    const d = dev === "desk" ? "d" : "p";
    const over = dev === "desk" ? <DeskDrop busy={v.busy}>{v.body()}</DeskDrop> : <PhoneSheet q={v.q} busy={v.busy}>{v.body()}</PhoneSheet>;
    full(`${d}-s12-${v.name}`, dev, {}, "", over, FEED, { home: 2, friends: 1 });
  }
}
G.__BIGMARK = false; G.__PENDING = undefined; G.__PICKLINE = false;
console.log("ok");
import { IntakeForm } from "../src/components/intake/intake-form";
import { ChooseHeader } from "../src/components/intake/choose-header";
import { parseLiveParams } from "../src/lib/intake/params";
import { helpMeChooseCopy } from "../src/lib/copy/help-me-choose";
const THEMES: any[] = [{ slug: "tokens", label: "Tokens", commanders: 812 }, { slug: "landfall", label: "Landfall", commanders: 240 }, { slug: "dragons", label: "Dragons", commanders: 120 }, { slug: "artifacts", label: "Artifacts", commanders: 501 }];
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  G.__VW = dev === "desk" ? 1300 : 390; G.__INLINE = true; G.__BADGES = { home: 2, friends: 1 };
  const hc = helpMeChooseCopy.intake;
  const html = shell(
    <div className="flex flex-col pb-[24px] md:px-[40px] md:pb-[48px]"><div className="md:mx-auto md:w-full md:max-w-[1100px] lg:flex lg:items-start lg:justify-center lg:gap-[40px]"><div className="min-w-0 md:w-[680px] md:max-w-full md:shrink">
      <ChooseHeader title={hc.title} sub={hc.sub} subPhone={hc.subPhone} centered />
      <IntakeForm themes={THEMES} sets={[]} initial={parseLiveParams(new URLSearchParams())} standing={null} />
    </div></div></div>, "/decks/new/choose", null);
  writeFileSync(`dz/frames/${d}-s12-hmc.html`, html);
  G.__VW = 0;
}
console.log("hmc ok");
import { ChooseIntro } from "../src/components/intake/choose-intro";
const INTRO_ART = { lead: "art/crop-ghalta.jpg", behind: ["art/crop-lathliss.jpg", "art/crop-gisa.jpg"] as [string, string] };
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  G.__VW = dev === "desk" ? 1300 : 390; G.__INLINE = true; G.__BADGES = { home: 2, friends: 1 };
  const hc = helpMeChooseCopy.intake;
  const html = shell(
    <div className="flex flex-col pb-[24px] md:px-[40px] md:pb-[48px]"><div className="md:mx-auto md:w-full md:max-w-[1100px] lg:flex lg:items-start lg:justify-center lg:gap-[40px]"><div className="min-w-0 md:w-[680px] md:max-w-full md:shrink">
      <ChooseHeader title={hc.title} sub={hc.sub} subPhone={hc.subPhone} centered />
      <div data-intro="" className="px-[18px] pt-[14px] md:px-0 md:pt-0 md:pb-[22px]"><ChooseIntro folded={false} art={INTRO_ART} freePerDay={1} wordsId="anything-else" /></div>
      <IntakeForm themes={THEMES} sets={[]} initial={parseLiveParams(new URLSearchParams())} standing={null} />
    </div></div></div>, "/decks/new/choose", null);
  writeFileSync(`dz/frames/${d}-s12-hmi.html`, html);
  G.__VW = 0;
}
console.log("hmi ok");
