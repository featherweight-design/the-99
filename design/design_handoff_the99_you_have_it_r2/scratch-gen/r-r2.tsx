// You have it R2 (2026-11-23): every frame's HTML. Offers in Request history, and the offerer's answer sheet over Home.
import { writeFileSync, mkdirSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { shell, W } from "./shell";
import { RequestHistory } from "../src/components/social/request-history";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { WhatsNew } from "../src/components/home/whats-new";
import { OfferAnswerSheet } from "../src/components/home/offer-answer-sheet";
import { named } from "../src/lib/person-name/mint";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;

const NOW = Date.UTC(2026, 10, 23, 15);
const D = (m: number, d: number, h = 18) => new Date(Date.UTC(2026, m - 1, d, h));
const face = (img: string, name: string) => ({ oracleId: "o-" + img, name, artCropUri: `art/face-${img}.jpg` });
const colin = { publicId: "c1", displayName: named("Colin"), commander: face("ghalta", "Ghalta, Primal Hunger") };
const max = { publicId: "m1", displayName: named("Max"), commander: face("sai", "Sai, Master Thopterist") };
const peter = { publicId: "p1", displayName: named("Peter"), commander: face("polyraptor", "Polyraptor") };
const CARDS: Record<string, string> = {
  lathliss: "Lathliss, Dragon Queen", jace: "Jace, Multiverse Architect", giada: "Giada, Font of Hope", tam: "Tam, the Possibility",
  polyraptor: "Polyraptor", zimone: "Zimone, Infinite Analyst", killian: "Killian, Decisive Mentor", mothman: "The Wise Mothman",
};
let n = 0;
const e = (img: string, other: any, state: string, created: Date, ended: Date | null, o: { offer?: boolean; copies?: number; deck?: string } = {}) => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, oracleId: "o-" + img, card: { name: CARDS[img], imageUri: `art/c-${img}.jpg` },
  copies: o.copies ?? 1, deckName: o.deck ?? null, other, state, createdAt: created, endedAt: ended, offer: o.offer,
});

// From you: your offers among your asks (newest first). Today Nov 23.
const fromYou = [
  e("lathliss", colin, "open", D(11, 21), D(11, 21), { offer: true }),
  e("zimone", peter, "open", D(11, 20), D(11, 20), { deck: "Thopter Works" }),
  e("jace", colin, "yes", D(11, 16), D(11, 18), { offer: true }),
  e("tam", max, "no", D(11, 12), D(11, 13), { offer: true, copies: 2 }),
  e("killian", max, "yes", D(11, 9), D(11, 10), { deck: "Thopter Works" }),
  e("giada", peter, "expired", D(10, 24), D(11, 7), { offer: true }),
  e("mothman", colin, "withdrawn", D(10, 19), D(10, 22), { offer: true }),
  e("polyraptor", colin, "no", D(10, 11), D(10, 12), { deck: "Dino Stampede" }),
];
// To you: offers made to you among asks of you (a withdrawn offer never shows here, as a withdrawn ask never shows to the holder).
const toYou = [
  e("lathliss", max, "open", D(11, 22), D(11, 22), { offer: true }),
  e("giada", colin, "open", D(11, 21), D(11, 21)),
  e("tam", peter, "yes", D(11, 15), D(11, 15), { offer: true, copies: 2 }),
  e("jace", colin, "no", D(11, 11), D(11, 12), { offer: true }),
  e("killian", max, "yes", D(11, 6), D(11, 7), { copies: 1 }),
  e("zimone", peter, "expired", D(10, 20), D(11, 3), { offer: true }),
];

function history(name: string, dev: "phone" | "desk", tab: "asked" | "ofYou", asked: any[], ofYou: any[]) {
  G.__VW = dev === "desk" ? 1300 : 390; G.__TAB = tab;
  const html = shell(<CardDetailProvider><RequestHistory asked={{ entries: asked, next: null }} ofYou={{ entries: ofYou, next: null }} hiddenCount={0} nowMs={NOW} /></CardDetailProvider>, "/friends/requests");
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0; G.__TAB = undefined;
}
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  history(`${d}-h1`, dev, "asked", fromYou, toYou);
  history(`${d}-h2`, dev, "ofYou", fromYou, toYou);
}
history("p-h3a", "phone", "asked", [], toYou);
history("p-h3b", "phone", "ofYou", fromYou, []);

// ---- Home: the offerer's answer item, and the sheet it opens ----
const at = (dt: Date) => dt.toISOString();
const fv = (o: any) => ({ href: null, opens: null, outbound: null, name: null, setSize: null, owned: null, combo: null, answer: null, askable: false, ...o });
const card = (img: string) => ({ oracleId: "o-" + img, name: CARDS[img], image: `art/c-${img}.jpg`, art: null, colorIdentity: null });
const feedFriend = (f: any) => ({ publicId: f.publicId, displayName: f.displayName });
const items = (answer: "yes" | "no") => [
  fv({ key: "k1", kind: "spare-request", at: at(new Date(NOW - 3600e3 * 2)), unseen: true, card: card(answer === "yes" ? "jace" : "tam"), friend: feedFriend(answer === "yes" ? colin : max), answer, offer: true }),
  fv({ key: "k2", kind: "spare-request", at: at(new Date(NOW - 3600e3 * 26)), unseen: false, card: card("killian"), friend: feedFriend(max), answer: "yes", answerDetail: { others: [], standalone: false } }),
  fv({ key: "k3", kind: "trade-match", at: at(new Date(NOW - 3600e3 * 30)), unseen: false, card: card("polyraptor"), friend: feedFriend(peter) }),
];
const faces = new Map<string, any>([[colin.publicId, colin.commander], [max.publicId, max.commander], [peter.publicId, peter.commander]]);
function home(name: string, dev: "phone" | "desk", answer: "yes" | "no", sheet: boolean) {
  G.__VW = dev === "desk" ? 1300 : 390;
  const feed: any = { chosen: true, on: ["spare-request", "trade-match"], items: items(answer), unseen: 1, lead: null };
  const offer = answer === "yes"
    ? { id: "o1", answer, answeredAt: new Date(NOW - 3600e3 * 2), offeredOn: "Nov 16", copies: 1, card: { name: CARDS.jace, imageUri: "art/c-jace.jpg" }, friend: colin }
    : { id: "o2", answer, answeredAt: new Date(NOW - 3600e3 * 2), offeredOn: "Nov 12", copies: 2, card: { name: CARDS.tam, imageUri: "art/c-tam.jpg" }, friend: max };
  const html = shell(
    <div className="mx-auto box-border flex w-full max-w-[720px] flex-col gap-[18px] px-[16px] pb-[40px] pt-[22px] md:px-0 md:pt-[36px]">
      <h1 className="m-0 font-display text-[24px] font-bold text-[color:var(--fg)] md:text-[28px]">Home</h1>
      <WhatsNew feed={feed} now={at(new Date(NOW))} faces={faces as any} />
    </div>, "/", sheet ? W(<CardDetailProvider><OfferAnswerSheet offer={offer as any} now={new Date(NOW)} /></CardDetailProvider>, "/") : null);
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0;
}
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  home(`${d}-s0`, dev, "yes", false);
  home(`${d}-s1`, dev, "yes", true);
  home(`${d}-s2`, dev, "no", true);
}

// ---- Call 3: a spare under your Offer threshold, on a friend's wishlist (threshold 2, you hold 1 spare) ----
import { FriendHead } from "../src/components/social/friend-head";
import { FriendStrip } from "../src/components/social/friend-strip";
import { FriendWishlist } from "../src/components/social/friend-wishlist";
import { SparesSection } from "../src/components/settings/spares-section";
const COLIN = "7b0c1f40-3a55-4e1a-9d0e-2c6d5a8b9e01";
const colinF = { publicId: COLIN, displayName: named("Colin"), since: new Date(Date.UTC(2026, 8, 14)), commander: face("ghalta", "Ghalta, Primal Hunger") };
const WL: [string, number][] = [["lathliss", 2], ["polyraptor", 1], ["giada", 1], ["zimone", 1], ["jace", 1], ["mothman", 1], ["tam", 2], ["killian", 1]];
const lines = WL.map(([img, q]) => ({ oracleId: "o-" + img, name: CARDS[img], quantity: q, imageUri: `art/c-${img}.jpg`, layout: "normal", backImageUri: null }));
const hv = (img: string, o: any = {}) => ({ oracleId: "o-" + img, spare: 1, mark: null, requestId: null, daysLeft: null, ...o });
const ONLY = [hv("polyraptor", { under: 2 })];
const MIXED = [hv("lathliss"), hv("polyraptor", { under: 2 }), hv("jace", { mark: "accepted" }), hv("tam", { under: 2 })];
function wish(name: string, dev: "phone" | "desk", haves: any[], open?: string) {
  G.__VW = dev === "desk" ? 1300 : 390; G.__OPEN = open;
  const html = shell(
    <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
      <FriendHead friend={colinF as any} nowMs={NOW} />
      <FriendStrip publicId={COLIN} counts={{ decks: 4, spares: 25, wishlist: lines.length }} />
      <FriendWishlist name={named("Colin")} friendPublicId={COLIN} lines={lines as any} haves={haves as any} />
    </div>, `/friends/${COLIN}/wishlist`);
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0; G.__OPEN = undefined;
}
function settings(name: string, dev: "phone" | "desk") {
  G.__VW = dev === "desk" ? 1300 : 390;
  const html = shell(
    <div className="mx-auto box-border w-full max-w-[720px] px-[16px] pb-[40px] pt-[22px] md:px-0 md:pt-[36px]">
      <h1 className="m-0 font-display text-[24px] font-bold text-[color:var(--fg)] md:text-[28px]">Settings</h1>
      <SparesSection spareMin={2} pods={[named("Tuesday pod")]} kept={[]} />
    </div>, "/settings");
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0;
}
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  wish(`${d}-t1`, dev, ONLY);
  wish(`${d}-t2`, dev, MIXED);
  wish(`${d}-t3`, dev, MIXED, "o-polyraptor");
  wish(`${d}-t0`, dev, []);
  settings(`${d}-g1`, dev);
}
void renderToString;
console.log("ok");
