// Finding the tools (account 1, 2026-11-23): Home's welcome strip and its Where credits work sheet, today and proposed.
import { writeFileSync } from "node:fs";
import { shell } from "./shell";
import { Dashboard } from "../src/components/home/dashboard";
import { WelcomeStrip } from "../src/components/welcome/welcome-strip";
import { WhereCreditsWork, Row } from "../src/components/welcome/where-credits-work";
import { writtenForYouCopy } from "../src/lib/copy/discovery";
import { Lock } from "../src/components/ui/lock";
import { welcomeFreeCopy, WhatYouCanDo } from "./find";
import { HomeSearchPanel, HomeSearch, HomeAsk, PhoneSheet, DeskDropdown, Starters, RecentRows, ToolAnswers, NoTool, ANSWERS } from "./ask";
const G = globalThis as any;
const NOW = new Date("2026-11-23T15:00:00Z");
const facts: any = { lot: "held", units: 3, left: 3, expiresAtMs: Date.UTC(2026, 10, 30, 12), days: 7, teaser: true, free: 1 };
const W = Object.fromEntries(writtenForYouCopy.rows.map((r) => [r.id, r]));
const row = (id: string, tryHref: string | null, where?: string) => ({ id, name: W[id].name, where: where ?? W[id].where, short: W[id].short, cost: W[id].cost, tryHref });
// Today: as `welcomeSheet` draws a reader with decks. Overview and Which deck needs it most? have no landing.
const today: any = { shape: "decks", lead: [], line: null, rows: [
  row("overview", null), row("suggested", "/decks/d1?tool=suggested-changes"), row("look-deeper", "/decks/d1?tool=proposed-cuts"),
  row("help-me-choose", "/decks/new/choose?tool=help-me-choose"), row("find-a-deck-read", null), row("upgrade", "/decks/precons"),
] };
// Proposed: every row lands, the Tuning rows name the new tab, and Which deck needs it most? lands on the cards in no deck.
const T = welcomeFreeCopy;
const proposed: any = { shape: "decks", lead: [], line: null, rows: [
  row("overview", "/decks/d1?tool=overview"), row("suggested", "/decks/d1?tool=suggested-changes", T.tuningWhere), row("look-deeper", "/decks/d1?tool=proposed-cuts", T.tuningWhere),
  row("help-me-choose", "/decks/new/choose?tool=help-me-choose"), row("find-a-deck-read", "/collection?avail=free&tool=find-a-deck", T.noDeckWhere), row("upgrade", "/decks/precons"),
] };
const freeBlock = (
  <>
    <p data-welcome-line="free" className="m-0 mt-[6px] flex items-center gap-[8px] border-t border-t-[color:var(--border)] pb-[3px] pt-[9px] font-mono text-[11px] text-[color:var(--fg-muted)]">
      <i aria-hidden className="block h-[6px] w-[6px] flex-none rotate-45 border border-[color:var(--fg-faint)]" />
      {T.line}
    </p>
    <ul role="list" className="m-0 flex list-none flex-col p-0">
      <Row row={{ id: "consider" as any, name: T.consider, where: T.tuningWhere, short: T.free, cost: T.free, tryHref: "/decks/d1?tool=consider" }} />
      <Row row={{ id: "find-a-deck" as any, name: T.findADeck, where: T.noDeckWhere, short: T.free, cost: T.free, tryHref: "/collection?avail=free&tool=find-a-deck" }} />
    </ul>
  </>
);
const deck = (id: string, name: string, cmd: string, art: string, ci: string[]): any => ({ id, name, createdAt: NOW, commanderName: cmd, commanderColorIdentity: ci, commanderImageUri: `art/c-${art}.jpg`, commanderArtCropUri: `art/a-${art}.jpg`, partnerName: null, partnerColorIdentity: null, folderId: null, folderName: null, built: 99, ownedCount: 93, toBuyCount: 6, unresolvedCount: 0, pendingChanges: 0, versionNumber: 3, lastPlayedAt: null, lastEditedAt: NOW, lastCommittedAt: NOW, inUseElsewhere: 0, proxiedCount: 0, statusPill: "built", bracket: null });
function home(name: string, dev: "phone" | "desk", sheet: any | null, free = false, todo: boolean | "ask" | "search" | "panel" = false, panel: any = {}, over: any = null) {
  G.__VW = dev === "desk" ? 1300 : 390; G.__INLINE = true; G.__FREEBLOCK = free ? freeBlock : undefined;
  const strip0 = <WelcomeStrip facts={facts} sheet={sheet ?? today} place="dashboard" />;
  const ART = ["art/c-killian.jpg", "art/c-lathliss.jpg", "art/c-ghalta.jpg"];
  const strip = todo === "panel" ? <><div className="order-0 relative z-[5]"><HomeSearchPanel art={ART} {...panel} /></div>{strip0}</> : todo === "search" ? <><div className="order-0"><HomeSearch /></div>{strip0}</> : todo ? <>{strip0}<div className="order-1 mt-[4px] min-[1180px]:order-none">{todo === "ask" ? <HomeAsk /> : <WhatYouCanDo spares={212} deck="Ashen Banner Parade" />}</div></> : strip0;
  const html = shell(
    <Dashboard stats={{ totalCards: 4492, uniqueCards: 2926 }} lastUpdated={new Date("2026-11-21T12:00:00Z")} timeZone="UTC" ready={null}
      inUse={new Map()} decks={[deck("d1", "Ashen Banner Parade", "Ashling, the Limitless", "ashling", ["W", "U", "B", "R", "G"])]} commitments={null}
      shopping={{ byDeck: new Map(), total: { cards: 0, cents: 0 } } as any} welcome={strip} now={NOW.toISOString()} {...({} as any)} />,
    "/", over ?? (sheet ? <WhereCreditsWork facts={facts} sheet={sheet} teaser onClose={() => {}} /> : null));
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0; G.__FREEBLOCK = undefined;
}
const RECENT = [
  { oracleId: "k", name: "Killian, Decisive Mentor", imageUri: "art/c-killian.jpg", flavorName: null, owned: 1, decks: [], wishlist: false },
  { oracleId: "l", name: "Lathliss, Dragon Queen", imageUri: "art/c-lathliss.jpg", flavorName: null, owned: 1, decks: ["Ashen Banner Parade"], wishlist: false },
  { oracleId: "g", name: "Ghalta, Primal Hunger", imageUri: "art/c-ghalta.jpg", flavorName: null, owned: 0, decks: [], wishlist: true },
];
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  home(`${d}-h0`, dev, null);
  home(`${d}-s0`, dev, today);
  home(`${d}-s1`, dev, proposed, true);
  home(`${d}-h1`, dev, null, false, true);
  home(`${d}-h2`, dev, null, false, "ask");
  home(`${d}-h3`, dev, null, false, "search");
  const desk = dev === "desk";
  home(`${d}-h4`, dev, null, false, "panel");
  if (desk) home(`${d}-h5`, dev, null, false, "panel", { query: "where do my spare cards go", open: <ToolAnswers answers={ANSWERS.spares} /> }, null);
  const Frame = (q: string, body: any) => (desk ? <DeskDropdown query={q} body={body} /> : <PhoneSheet query={q} body={body} />);
  home(`${d}-a0`, dev, null, false, false, Frame("", <><Starters /><RecentRows rows={RECENT} /></>));
  home(`${d}-a1`, dev, null, false, false, Frame("where do my spare cards go", <ToolAnswers answers={ANSWERS.spares} />));
  home(`${d}-a3`, dev, null, false, false, Frame("what’s on the banned list", <NoTool />));
}
console.log("ok");
