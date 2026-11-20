import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { writeFileSync } from "node:fs";
import { ComboBody, ModalPanel, type FindingArt } from "./src/components/decks/receipt-modal";
import { MissingPieceWhereLine } from "./src/components/decks/combo-where-line";
import { GhostButton } from "./src/components/ui/button";
import { combosCloseCopy } from "./src/lib/copy/combos-close";
import type { ComboModal } from "./src/lib/bracket/combo-modal";

const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
export const R = (el: any, path = "/decks/d1") =>
  rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value={path}><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);

export const AANG = { oracleId: "aang", name: "Avatar Aang" };
export const TOUCH = { oracleId: "touch", name: "Searing Touch" };
export const ART: FindingArt = new Map([
  ["aang", { name: "Avatar Aang", imageUri: "art/card-avatar-aang.jpg" }],
  ["touch", { name: "Searing Touch", imageUri: "art/card-searing-touch.jpg" }],
]);
export const SHORT: ComboModal = {
  variantId: "v1",
  cards: [AANG, TOUCH],
  produces: ["Infinite damage", "Infinite storm count"],
  mana: { kind: "free" },
  steps: [
    "With Aang, Master of Elements on the battlefield, cast Searing Touch with buyback. Aang makes it cost {W}{U}{B}{R}{G} less, so it costs nothing.",
    "Searing Touch deals 1 damage to any target and goes back to your hand.",
    "Repeat as many times as you like.",
  ],
  prerequisites: "Avatar Aang transformed into Aang, Master of Elements.",
};

const noop = () => {};
const sheet390 = (inner: any) => (
  <div className="flex min-h-[844px] w-[390px] flex-col justify-end" style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }}>
    <div className="flex w-full flex-col overflow-hidden rounded-t-[14px] border-t border-[color:var(--border-strong)]" style={{ background: "var(--surface-raised)", boxShadow: "var(--modal-shadow)" }}>{inner}</div>
  </div>
);
const modal760 = (inner: any) => (
  <div className="flex w-[1280px] items-start justify-center py-[48px]" style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }}>
    <div className="flex w-[760px] flex-col overflow-hidden rounded-[14px] border border-[color:var(--border-strong)]" style={{ background: "var(--surface-raised)", boxShadow: "var(--modal-shadow)" }}>{inner}</div>
  </div>
);

// Shipped: card details → combo (UI-3), one piece away.
const shipped = (
  <ModalPanel title="Avatar Aang + Searing Touch" closeLabel="Close" onClose={noop} back={{ label: "Avatar Aang", aria: "Back to Avatar Aang", onBack: noop }}>
    <ComboBody
      combo={SHORT}
      art={ART}
      oneAway={{
        missingOracleId: "touch",
        stillOracleId: "aang",
        where: (id) => <MissingPieceWhereLine where={id === "aang" ? { kind: "inDeck" } : { kind: "buy", cents: 25, soldOut: false, qualifier: null }} on="plate" />,
        action: <GhostButton className="h-[44px] md:h-[36px] min-h-0 md:min-h-0 rounded-[9px] px-[18px] text-[13.5px] font-semibold">{combosCloseCopy.detail.add("Searing Touch")}</GhostButton>,
      }}
    />
  </ModalPanel>
);
writeFileSync("hero/combo-shipped-p.html", R(sheet390(shipped)));
writeFileSync("hero/combo-shipped-d.html", R(modal760(shipped)));

import { ComboSheetBody, Foot, BackBar, Head, type Plate } from "./proposal/combo-sheet";
import { FeedItemRow } from "./src/components/feed/feed-item";

const LONG: ComboModal = {
  ...SHORT,
  variantId: "v2",
  steps: [
    "Cast Avatar Aang.",
    "In one turn, waterbend, earthbend, firebend and airbend at least once each.",
    "Then Avatar Aang transforms into Aang, Master of Elements.",
    "Keep Searing Touch in your hand. Aang makes each spell you cast cost {W}{U}{B}{R}{G} less.",
    "Cast Searing Touch and pay its buyback {4}. With Aang, the whole cost is nothing.",
    "Searing Touch deals 1 damage to any target.",
    "With buyback paid, Searing Touch returns to your hand as it resolves.",
    "Each cast adds one to the storm count.",
    "Go back to step 5. Repeat as many times as you like.",
  ],
};

const buy = <MissingPieceWhereLine where={{ kind: "buy", cents: 25, soldOut: false, qualifier: null }} on="plate" />;
const inDeck = <MissingPieceWhereLine where={{ kind: "inDeck" }} on="plate" />;
const add = <GhostButton className="h-[44px] md:h-[36px] min-h-0 md:min-h-0 rounded-[9px] px-[18px] text-[13.5px] font-semibold">{combosCloseCopy.detail.add("Searing Touch")}</GhostButton>;

/** Phone: the sheet from 52px down, its head and foot pinned, the body scrolling (data-scroll). */
const phone = (head: any, body: any, foot: any, under: any = null) => (
  <div className="relative h-[844px] w-[390px] overflow-hidden" style={{ background: "var(--bg)" }}>
    {under}
    <div className="absolute inset-0" style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }} />
    <div className="absolute inset-x-0 bottom-0 flex max-h-[792px] flex-col overflow-hidden rounded-t-[18px] border-t border-[color:var(--border-strong)]" style={{ background: "var(--surface-raised)", boxShadow: "var(--modal-shadow)" }}>
      {head}
      <div data-scroll className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      {foot}
    </div>
  </div>
);
const desk = (head: any, body: any, foot: any, under: any = null) => (
  <div className="relative flex h-[800px] w-[1280px] items-center justify-center overflow-hidden" style={{ background: "var(--bg)" }}>
    {under}
    <div className="absolute inset-0" style={{ background: "color-mix(in oklab, var(--bg) 72%, transparent)" }} />
    <div className="relative flex max-h-[680px] w-[760px] flex-col overflow-hidden rounded-[14px] border border-[color:var(--border-strong)]" style={{ background: "var(--surface-raised)", boxShadow: "var(--modal-shadow)" }}>
      {head}
      <div data-scroll className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      {foot}
    </div>
  </div>
);

type V = { head: any; plates: Plate[]; combo: ComboModal; titled: boolean; action?: any; under?: (w: boolean) => any };
const VARIANTS: Record<string, V> = {
  // From card details (UI-3): the deck holds both, opened from Avatar Aang.
  card: { head: <BackBar label="Avatar Aang" />, combo: SHORT, titled: true, plates: [{ oracleId: "aang", where: inDeck, still: true }, { oracleId: "touch", where: inDeck }] },
  // Pushed from the deck's combos one piece away (UI-2).
  oneaway: { head: <BackBar label="5 combos" />, combo: SHORT, titled: true, action: add, plates: [{ oracleId: "aang", where: inDeck }, { oracleId: "touch", where: buy, missing: true }] },
  long: { head: <BackBar label="5 combos" />, combo: LONG, titled: true, action: add, plates: [{ oracleId: "aang", where: inDeck }, { oracleId: "touch", where: buy, missing: true }] },
};
for (const [k, v] of Object.entries(VARIANTS)) {
  writeFileSync(`hero/c-${k}-p.html`, R(phone(v.head, <ComboSheetBody combo={v.combo} art={ART} plates={v.plates} titled={v.titled} />, <Foot action={v.action} />)));
  writeFileSync(`hero/c-${k}-d.html`, R(desk(v.head, <ComboSheetBody wide combo={v.combo} art={ART} plates={v.plates} titled={v.titled} />, <Foot action={v.action} />)));
}

// Feed-opened: the sheet on its own, nothing under it but the page the item was on.
const feedItem: any = { key: "k1", kind: "combo", at: "2026-11-15T14:00:00Z", unseen: true, card: { oracleId: "touch", name: "Searing Touch", image: "art/card-searing-touch.jpg", art: null, colorIdentity: ["R"] }, friend: null, href: null, opens: "aang", outbound: null, name: null, setSize: null, owned: null, drop: null, combo: { pieces: ["Avatar Aang", "Searing Touch"], added: "Searing Touch" }, answer: null, askable: false };
const feedRow = <FeedItemRow item={feedItem} now="2026-11-15T16:00:00Z" />;
writeFileSync("hero/feedrow-p.html", R(<div className="w-[390px] px-[16px] py-[16px]">{feedRow}</div>, "/"));
writeFileSync("hero/feedrow-d.html", R(<div className="w-[720px] px-[24px] py-[16px]">{feedRow}</div>, "/"));
const elsewhere = <MissingPieceWhereLine where={{ kind: "elsewhere", decks: [{ id: "d2", name: "Fire Nation Rising", committed: true }] }} on="plate" />;
const spare = <MissingPieceWhereLine where={{ kind: "spare" }} on="plate" />;
const fplates: Plate[] = [{ oracleId: "aang", where: elsewhere }, { oracleId: "touch", where: spare }];
const fhead = (m: boolean) => <Head mark={m} eyebrow="Combos you can make" title="Avatar Aang + Searing Touch" lead="You added Searing Touch. You own both halves now." />;
writeFileSync("hero/c-feed-p.html", R(phone(fhead(false), <ComboSheetBody combo={SHORT} art={ART} plates={fplates} titled={false} />, <Foot />), "/"));
writeFileSync("hero/c-feed-d.html", R(desk(fhead(false), <ComboSheetBody wide combo={SHORT} art={ART} plates={fplates} titled={false} />, <Foot />), "/"));
console.log("ok");
