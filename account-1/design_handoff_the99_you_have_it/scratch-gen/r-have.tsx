// You have a card a friend wants (account 1, 2026-11-22): every frame's HTML.
import { writeFileSync, mkdirSync } from "node:fs";
import { shell, W } from "./shell";
import { FriendHead } from "../src/components/social/friend-head";
import { FriendStrip } from "../src/components/social/friend-strip";
import { FriendWishlist } from "../src/components/social/friend-wishlist";
import { WaitingOnYou } from "../src/components/social/waiting-on-you";
import { FriendsList } from "../src/components/social/friends-list";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { SpareGlyph } from "../src/components/social/spare-key-item";
import { named } from "../src/lib/person-name/mint";
import { HavePress, HaveKey, HaveSheet, HaveCallout, haveCopy, type HaveKind } from "./friend-have";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;

const COLIN = "7b0c1f40-3a55-4e1a-9d0e-2c6d5a8b9e01";
const face = (img: string, name: string) => ({ oracleId: "o-" + img, name, artCropUri: `art/face-${img}.jpg` });
const colin = { publicId: COLIN, displayName: named("Colin"), since: new Date(Date.UTC(2026, 8, 14)), commander: face("ghalta", "Ghalta, Primal Hunger") };
const NOW = Date.UTC(2026, 10, 22, 20);
const PATH = `/friends/${COLIN}/wishlist`;

// Colin's wishlist: name, crop, wants, what you have of it.
type Have = { kind: HaveKind; mark?: "requested" | "accepted" | null } | null;
const WL: [string, string, number, Have][] = [
  ["Lathliss, Dragon Queen", "lathliss", 2, { kind: "spare" }],
  ["Polyraptor", "polyraptor", 1, null],
  ["Giada, Font of Hope", "giada", 1, { kind: "spare", mark: "requested" }],
  ["Zimone, Infinite Analyst", "zimone", 1, null],
  ["Ghoulcaller Gisa", "gisa", 1, null],
  ["Jace, Multiverse Architect", "jace", 1, { kind: "spare", mark: "accepted" }],
  ["The Wise Mothman", "mothman", 1, null],
  ["Tam, the Possibility", "tam", 2, { kind: "spare" }],
  ["Killian, Decisive Mentor", "killian", 1, null],
];
const lines = WL.map(([name, img, q]) => ({ oracleId: "o-" + img, name, quantity: q, imageUri: `art/c-${img}.jpg`, layout: "normal", backImageUri: null }));
const haveOf = (oracleId: string) => WL.find((w) => "o-" + w[1] === oracleId)?.[3] ?? null;
const CSS = `<style>ul:has([data-dz=have]) [data-testid=wishlist-tile-caption]{min-height:26px;line-height:26px}li:has([data-dz=have]) [data-testid=wishlist-tile-caption]{padding-right:34px}@media(min-width:768px){li:has([data-dz=have]) [data-testid=wishlist-tile-caption]{padding-right:40px}}</style>`;

function page(body: any) {
  return (
    <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
      <FriendHead friend={colin as any} nowMs={NOW} />
      <FriendStrip publicId={COLIN} counts={{ decks: 4, spares: 25, wishlist: lines.length }} />
      {body}
    </div>
  );
}
function wishlist(name: string, o: { loaded: boolean; open?: string; sheet?: any; dev: "phone" | "desk"; callout?: boolean; filtered?: boolean }) {
  G.__VW = o.dev === "desk" ? 1300 : 390;
  G.__HAVE = o.loaded ? (l: any) => { const h = haveOf(l.oracleId); return h ? <HavePress kind="spare" mark={h.mark ?? null} name={l.name} open={o.open === l.oracleId} /> : null; } : undefined;
  G.__HAVEKEY = o.loaded ? () => <>{o.callout === false ? null : <HaveCallout n={4} friend="Colin" names="Lathliss, Giada, Jace and Tam" filtered={o.filtered} />}<HaveKey items={["spare", "asked", "accepted"]} /></> : undefined;
  G.__HEADN = o.filtered ? lines.length : undefined;
  const shown = o.filtered ? lines.filter((l) => haveOf(l.oracleId)) : lines;
  const html = shell(<>{page(<FriendWishlist name={named("Colin")} lines={shown as any} />)}</>, PATH, o.sheet ? W(<CardDetailProvider>{o.sheet}</CardDetailProvider>, PATH) : null);
  writeFileSync(`dz/frames/${name}.html`, CSS + html);
  G.__HAVE = G.__HAVEKEY = G.__HEADN = undefined; G.__VW = 0;
}
const card = (img: string, name: string) => ({ oracleId: "o-" + img, name, imageUri: `art/c-${img}.jpg` });
const deckRow = (deck: string, art: string, copies = 1) => ({ kind: "deck" as const, deck, art: `art/face-${art}.jpg`, copies });
const sheets = {
  offer: <HaveSheet card={card("lathliss", "Lathliss, Dragon Queen")} friend="Colin" wants={2}
    rows={[{ kind: "spare", spare: 1, state: "offer" }]} foot={haveCopy.foot.offer("Colin")} />,
  offered: <HaveSheet card={card("lathliss", "Lathliss, Dragon Queen")} friend="Colin" wants={2}
    rows={[{ kind: "spare", spare: 1, state: "offered", days: 14 }]} foot={haveCopy.foot.offered("Colin")} />,
  asked: <HaveSheet card={card("giada", "Giada, Font of Hope")} friend="Colin" wants={1}
    rows={[{ kind: "asked", copies: 1, days: 12, spare: 1 }]} foot={haveCopy.foot.asked("Colin")} />,
  accepted: <HaveSheet card={card("jace", "Jace, Multiverse Architect")} friend="Colin" wants={1}
    rows={[{ kind: "spare", spare: 1, state: "accepted" }]} foot={haveCopy.foot.accepted("Colin")} />,
};
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  wishlist(`${d}-f0`, { loaded: false, dev });
  wishlist(`${d}-f1`, { loaded: true, dev });
  wishlist(`${d}-f2`, { loaded: true, dev, open: "o-lathliss", sheet: sheets.offer });
  wishlist(`${d}-f3`, { loaded: true, dev, open: "o-lathliss", sheet: sheets.offered });
  wishlist(`${d}-f4`, { loaded: true, dev, open: "o-giada", sheet: sheets.asked });
  wishlist(`${d}-f6`, { loaded: true, dev, open: "o-jace", sheet: sheets.accepted });
  wishlist(`${d}-ff`, { loaded: true, dev, filtered: true });
}

// ---- Colin's side: /friends, Waiting on you with the offer; and ideas ----
const max = { publicId: "m", displayName: named("Max"), commander: face("sai", "Sai, Master Thopterist") };
const offerAsk = (o: any, img = "lathliss", nm = "Lathliss, Dragon Queen") => ({
  id: "x" + img, oracleId: "o-" + img, card: { name: nm, imageUri: `art/c-${img}.jpg` }, copies: 1, deckName: null, spare: 1,
  asker: max, createdAt: new Date(NOW - 3600e3 * 2), daysLeft: 14, offer: o,
});
const offerRow = (ask: any) => ({ key: ask.id, kind: "spare-request" as const, createdAt: ask.createdAt, unseen: true as const, ask });
const ACCENT = "flex flex-none cursor-pointer items-center justify-center whitespace-nowrap bg-transparent font-sans h-[36px] min-w-[64px] rounded-[9px] px-[14px] text-[13px] font-semibold text-[color:var(--accent-text)] [border:1px_solid_var(--accent)] md:rounded-[8px]";
function friends(name: string, rows: any[], dev: "phone" | "desk", frow?: (f: any) => any) {
  G.__VW = dev === "desk" ? 1300 : 390; G.__FROW = frow;
  const fl = [
    { publicId: COLIN, displayName: named("Colin"), since: new Date(Date.UTC(2026, 8, 14)), commander: face("ghalta", "Ghalta, Primal Hunger") },
    { publicId: "c", displayName: named("Chris"), since: new Date(Date.UTC(2026, 9, 2)), commander: face("jace", "Jace, Multiverse Architect") },
    { publicId: "m", displayName: named("Max"), since: new Date(Date.UTC(2026, 9, 20)), commander: face("sai", "Sai, Master Thopterist") },
    { publicId: "p", displayName: named("Peter"), since: new Date(Date.UTC(2026, 10, 1)), commander: face("polyraptor", "Polyraptor") },
  ];
  writeFileSync(`dz/frames/${name}.html`, shell(
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-[18px] px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px]">
      <h1 className="m-0 font-display text-[26px] font-bold text-[color:var(--fg)] md:text-[30px]">Friends</h1>
      {rows.length ? <WaitingOnYou rows={rows} now={new Date(NOW)} /> : null}
      <FriendsList friends={fl as any} now={new Date(NOW)} timeZone="UTC" fresh={null} removing={null} onRemove={() => {}} linkable />
    </div>, "/friends"));
  G.__VW = 0; G.__FROW = undefined;
}
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  // C1 · Colin's side: a friend (Max, standing in for you) offered Lathliss.
  friends(`${d}-c1`, [offerRow(offerAsk({ kind: haveCopy.waiting.kind, title: haveCopy.waiting.title("Max", "Lathliss"), detail: haveCopy.waiting.detail("Max", 1, 2) }))], dev);
  // I1 · idea: the friends list says how many of each friend's wanted cards you can spare.
  friends(`${d}-i1`, [], dev, (f: any) => f.publicId === COLIN || f.publicId === "p" ? (
    <span className="relative z-10 inline-flex h-[22px] flex-none items-center gap-[6px] rounded-[4px] px-[7px] font-mono text-[11.5px] text-[color:var(--fact)] bg-[color-mix(in_oklab,var(--fact)_14%,transparent)]" aria-label={haveCopy.friendChip(f.publicId === COLIN ? 4 : 1, f.publicId === COLIN ? "Colin" : "Peter")}>
      <SpareGlyph size={13} />{f.publicId === COLIN ? 4 : 1}
    </span>) : null);
}
console.log("ok");
