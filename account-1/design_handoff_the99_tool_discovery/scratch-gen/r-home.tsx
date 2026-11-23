// Finding the tools (account 1, 2026-11-23): Home's welcome strip and its Where credits work sheet, today and proposed.
import { writeFileSync } from "node:fs";
import { shell } from "./shell";
import { Dashboard } from "../src/components/home/dashboard";
import { WelcomeStrip } from "../src/components/welcome/welcome-strip";
import { WhereCreditsWork, Row } from "../src/components/welcome/where-credits-work";
import { writtenForYouCopy } from "../src/lib/copy/discovery";
import { Lock } from "../src/components/ui/lock";
import { welcomeFreeCopy } from "./find";
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
function home(name: string, dev: "phone" | "desk", sheet: any | null, free = false) {
  G.__VW = dev === "desk" ? 1300 : 390; G.__INLINE = true; G.__FREEBLOCK = free ? freeBlock : undefined;
  const strip = <WelcomeStrip facts={facts} sheet={sheet ?? today} place="dashboard" />;
  const html = shell(
    <Dashboard stats={{ totalCards: 4492, uniqueCards: 2926 }} lastUpdated={new Date("2026-11-21T12:00:00Z")} timeZone="UTC" ready={null}
      inUse={new Map()} decks={[deck("d1", "Ashen Banner Parade", "Ashling, the Limitless", "ashling", ["W", "U", "B", "R", "G"])]} commitments={null}
      shopping={{ byDeck: new Map(), total: { cards: 0, cents: 0 } } as any} welcome={strip} now={NOW.toISOString()} {...({} as any)} />,
    "/", sheet ? <WhereCreditsWork facts={facts} sheet={sheet} teaser onClose={() => {}} /> : null);
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0; G.__FREEBLOCK = undefined;
}
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  home(`${d}-h0`, dev, null);
  home(`${d}-s0`, dev, today);
  home(`${d}-s1`, dev, proposed, true);
}
console.log("ok");
