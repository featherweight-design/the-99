// Add a partner to an existing deck (account 2, 2026-11-21): shipped components SSR'd with shipped CSS,
// the proposal (partner-add.tsx, partner-add copy, three exports from change-commander-sheet.tsx) applied.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import * as React from "react";
import { CardDetailContext } from "../src/components/cards/card-detail-context";
import { ModalChrome } from "../src/components/decks/receipt-modal";
import { CandidateGroupHeading, CandidateRow } from "../src/components/decks/change-commander-sheet";
import { SpineMobile } from "../src/components/decks/spine-mobile";
import { SpineDesktop } from "../src/components/decks/spine-desktop";
import { CommanderSection } from "../src/components/decks/change-commander-review";
import { ToastFrame } from "../src/components/collection/edit-toast-frame";
import { CardModal } from "../src/components/cards/card-modal";
import { OracleText } from "../src/components/cards/oracle-text";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { AddPartnerSection, PartnerConfirm, PartnerDoorBox, type PartnerCandidate } from "../src/components/decks/partner-add";
import { partnerAddCopy as pcopy } from "../src/lib/copy/partner-add";
import { changeCommanderCopy as cc } from "../src/lib/copy/change-commander";

mkdirSync("dz/frames", { recursive: true });
const CTX: any = new Proxy({}, { get: (_t, k) => (k === "then" ? undefined : () => undefined) });
const A = (s: string) => `art/a-${s}.jpg`;
const C = (s: string) => `art/c-${s}.jpg`;
const NOW = new Date("2026-11-21T15:00:00Z");
const price = (cents: number) => ({ cents, foilCents: null, etchedCents: null, asOf: NOW });
const free = { owned: 1, hard: 0, soft: 0, free: 1, claims: [] } as any;
const held = (deck: string) => ({ owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "z", name: deck, quantity: 1, mature: true, pending: false, commander: false, commanderCopies: 0, since: 0, versionNumber: 4, granted: 0, grantedAt: null }] }) as any;

type H = { slug: string; name: string; mana: string; cmc: number; owned?: boolean; inDeck?: boolean; avail?: any; price?: number };
const half = (h: H): any => ({
  oracleId: "o-" + h.slug, name: h.name, manaCost: h.mana, cmc: h.cmc, artCropUri: A(h.slug), imageUri: C(h.slug),
  inDeck: !!h.inDeck, owned: h.owned ?? false, availability: h.owned && !h.inDeck ? h.avail ?? free : null,
  price: h.price ? price(h.price) : null,
});
const pc = (h: H, n: number, widens: string[] | null, of = 88): PartnerCandidate => ({ key: h.slug, half: half(h), widens, fit: { n, of } });

const ISHAI = { oracleId: "o-ishai", name: "Ishai, Ojutai Dragonspeaker", imageUri: C("ishai-ojutai-dragonspeaker"), manaCost: "{2}{W}{U}" };
const BRUSE: H = { slug: "bruse-tarl-boorish-herder", name: "Bruse Tarl, Boorish Herder", mana: "{2}{R}{W}", cmc: 4, owned: true };
const KRAUM: H = { slug: "kraum-ludevics-opus", name: "Kraum, Ludevic’s Opus", mana: "{3}{U}{R}", cmc: 5, owned: true };
const TYMNA: H = { slug: "tymna-the-weaver", name: "Tymna the Weaver", mana: "{1}{W}{B}", cmc: 3, owned: true, avail: held("HD - Zombies") };
const SAKA: H = { slug: "sakashima-of-a-thousand-faces", name: "Sakashima of a Thousand Faces", mana: "{3}{U}", cmc: 4, owned: true, inDeck: true };
const THRAS: H = { slug: "thrasios-triton-hero", name: "Thrasios, Triton Hero", mana: "{G}{U}", cmc: 2, price: 1149 };
const SILAS: H = { slug: "silas-renn-seeker-adept", name: "Silas Renn, Seeker Adept", mana: "{1}{U}{B}", cmc: 3, price: 349 };
const RAVOS: H = { slug: "ravos-soultender", name: "Ravos, Soultender", mana: "{3}{W}{B}", cmc: 5, price: 189 };

const YOURS = [pc(SAKA, 52, null), pc(BRUSE, 47, ["W", "U", "R"]), pc(KRAUM, 44, ["W", "U", "R"]), pc(TYMNA, 39, ["W", "U", "B"])];
const TOBUY = [pc(THRAS, 50, ["W", "U", "G"]), pc(SILAS, 41, ["W", "U", "B"]), pc(RAVOS, 33, ["W", "U", "B"])];
const MATCHED = ["Arcane Signet", "Brainstorm", "Counterspell", "Cyclonic Rift", "Dovin’s Veto", "Fact or Fiction", "Mystic Remora", "Narset, Parter of Veils", "Rhystic Study", "Swords to Plowshares", "Teferi’s Protection", "Windfall"];
const OPENS = ["Boros Charm", "Blasphemous Act", "Chaos Warp", "Comeuppance", "Deflecting Swat", "Electrolyze", "Lightning Greaves", "Lightning Helix", "Narset’s Reversal", "Pyroblast", "Thrill of Possibility", "Wear // Tear"];

// The shipped Replace groups (single commanders in exactly W/U), drawn by the shipped CandidateRow.
const hargilde: any = {
  key: "hg", fit: { n: 46, of: 88 }, matched: [], deckCount: 210,
  halves: [{ oracleId: "o-hg", name: "Hargilde, Kindly Runechanter", manaCost: "{2}{W}{U}", cmc: 4, artCropUri: A("hargilde-kindly-runechanter"), imageUri: null, inDeck: false, owned: true, availability: free, price: null }],
};
const replaceGroups = (
  <section className="flex flex-col">
    <CandidateGroupHeading label={cc.sheet.groupYours(1)} note={cc.sheet.groupNote} />
    <CandidateRow candidate={hargilde} pair={false} current={{ cmc: 4, name: "Ishai" }} newestAsOf={null} siblings={[]} open={false} onToggle={() => {}} onChoose={() => {}} />
    <p className="pl-[68px] pt-[10px] font-mono text-[11px]" style={{ color: "var(--fg-faint)" }}>{cc.sheet.groupBuy(9)} · {cc.sheet.showAll(9)}</p>
  </section>
);

// The cuts: Suggested changes' cut line. Plains first (land count), then the two the pair's decks run least.
const cutItem = (slug: string, name: string, type: string, rationale: string): any => ({
  side: "cut", id: "cut-" + slug, cardOracleId: "o-" + slug, cardName: name, cardTypeLine: type, cardImageUri: C(slug),
  rationale, rationaleShort: rationale, evidence: [], position: 0, verdict: "pending", owned: true, ownedQuantity: 1,
  availability: null, price: null, bracketAfter: null, applies: true, inDeck: true, locked: false,
});
const cutsFor = (PAIR: string) => [
  cutItem("plains", "Plains", "Basic Land — Plains", pcopy.confirm.reasonLands(37)),
  cutItem("sphinxs-tutelage", "Sphinx’s Tutelage", "Enchantment", pcopy.confirm.reasonUnplayed(PAIR)),
  cutItem("hedron-archive", "Hedron Archive", "Artifact", pcopy.confirm.reasonRare(2, PAIR)),
];
const CUTS = cutsFor("Ishai + Bruse Tarl");
const PONDER = [cutItem("ponder", "Ponder", "Sorcery", "")];
const plateOf = (it: any) => ({ oracleId: it.cardOracleId, name: it.cardName, imageUri: it.cardImageUri, manaCost: it.cardTypeLine.startsWith("Basic") ? null : it.cardOracleId === "o-ponder" ? "{U}" : it.cardOracleId === "o-hedron-archive" ? "{4}" : "{2}{U}" });

const ui = (body: ReactNode) => <CardDetailContext.Provider value={CTX}>{body}</CardDetailContext.Provider>;
const sheet = (title: string, body: ReactNode) => (
  <ModalChrome title={title} aside={<span className="hidden md:inline">HD - Ishai</span>} closeLabel={cc.sheet.close.single} backLabel={cc.sheet.title.single} onClose={() => {}} width={700}>
    <div className="flex flex-col gap-[16px] px-[18px] pb-[22px] pt-[16px]">{body}</div>
  </ModalChrome>
);

// The deck's header, before (Ishai) and after (the pair). Phone and desktop spines are both drawn; CSS shows one.
const deckOf = (pair: boolean): any => ({
  id: "d1", name: "HD - Ishai",
  commander: { oracleId: "o-ishai", name: ISHAI.name, colorIdentity: ["W", "U"], artCropUri: A("ishai-ojutai-dragonspeaker"), imageUri: ISHAI.imageUri, typeLine: "Legendary Creature — Bird Monk", manaCost: "{2}{W}{U}", oracleText: "Partner" },
  partner: pair ? { oracleId: "o-bruse", name: BRUSE.name, colorIdentity: ["R", "W"], artCropUri: A(BRUSE.slug), imageUri: C(BRUSE.slug), typeLine: "Legendary Creature — Human Ally", manaCost: "{2}{R}{W}", oracleText: "Partner" } : null,
});
const spine = (pair: boolean) => {
  const p: any = { deck: deckOf(pair), counts: { built: pair ? 98 : 99, ownedCount: pair ? 98 : 99, toBuyCount: 0 }, status: "Built" as const, onExport: () => {} };
  return <><SpineDesktop {...p} /><SpineMobile {...p} /></>;
};
function shell(main: ReactNode) {
  (globalThis as any).__PATH = "/decks/d1";
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: NOW.toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  return (
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col">{main}</main>
      </div>
      <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
    </div>
  );
}
const ORACLE = "Flying\nWhenever you cast a noncreature spell, put a +1/+1 counter on Ishai, Ojutai Dragonspeaker.\n{3}{U}: Ishai gains hexproof until end of turn.\nPartner (You can have two commanders if both have partner.)";
const oracleBox = (text: string) => (
  <div className="rounded-[10px] p-[14px_16px] text-[13.5px] leading-[1.6] md:p-[18px_20px] md:text-[15px] md:leading-[1.65]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg-body)" }}><OracleText text={text} keywords={["Flying", "Partner"]} symbols /></div>
);
function detailsPhone(text: string, door: ReactNode) {
  return (
    <div className="relative min-h-dvh" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-x-0 bottom-0 top-[56px] rounded-t-[18px] border-t border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[18px]">
        <div className="flex h-[22px] items-center justify-center"><span className="block h-[4px] w-[36px] rounded-[2px]" style={{ background: "var(--border-strong)" }} /></div>
        <div className="mt-[6px] flex justify-center"><img src={ISHAI.imageUri!} alt="" className="w-[250px] rounded-[12px] border border-[color:var(--border-strong)]" /></div>
        <div className="mt-[16px]">{oracleBox(text)}</div>
        {door}
      </div>
    </div>
  );
}
function detailsDesk(text: string, door: ReactNode) {
  return (
    <div className="flex min-h-dvh items-center justify-center gap-[28px] p-[40px]" style={{ background: "var(--bg)" }}>
      <img src={ISHAI.imageUri!} alt="" className="w-[300px] rounded-[14px] border border-[color:var(--border-strong)]" />
      <div className="w-[560px]">{oracleBox(text)}{door}</div>
    </div>
  );
}

// D · the shipped card details (CardModal) for the deck's own commander on its deck page, with the door after the card facts.
const ISHAI_CARD: any = {
  oracleId: "o-ishai", name: "Ishai, Ojutai Dragonspeaker", typeLine: "Legendary Creature — Bird Monk", manaCost: "{2}{W}{U}", cmc: 4,
  oracleText: "Flying\nWhenever an opponent casts a spell, put a +1/+1 counter on Ishai, Ojutai Dragonspeaker.\nPartner (You can have two commanders if both have partner.)",
  keywords: ["Flying", "Partner"], rarity: "mythic", colorIdentity: ["W", "U"], imageUri: ISHAI.imageUri, printedName: null, quantity: 1,
  printings: [{ setCode: "CM2", scryfallId: "x", setName: "Commander Anthology Volume II", collectorNumber: "12", releasedAt: "2018-06-08", quantity: 1, finishes: { nonfoil: 1 }, imageUri: ISHAI.imageUri, artCropUri: A("ishai-ojutai-dragonspeaker"), backImageUri: null, hasOwnBack: false, hasOwnArt: true, flavorName: null }],
  setCodes: ["CM2"], primarySetCode: "CM2", preferredPrinting: null, proxiedBy: [],
  availability: { owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "d1", name: "HD - Ishai", quantity: 1, mature: true, pending: false, commander: true, senior: true }] },
};
const details = (door: ReactNode, full = true) => (
  <CardModal card={ISHAI_CARD} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} deckId="d1" deckName="HD - Ishai" deckPage deckHolds openCombo={full} commanderDoor={door} />
);

type Dev = "phone" | "desk";
const frames: { id: string; dev: Dev; vh?: number }[] = [];
function emit(id: string, dev: Dev, body: ReactNode, vh?: number) {
  writeFileSync(`dz/frames/${id}.html`, renderToString(ui(<>{body}</>)));
  frames.push({ id, dev, vh });
}

const list = (openKey?: string) => (
  <AddPartnerSection kind="partner" short="Ishai" counted={88} yours={YOURS} toBuy={TOBUY} toBuyTotal={14} openKey={openKey} matched={MATCHED} replace={replaceGroups} />
);
const confirm = (o: Partial<React.ComponentProps<typeof PartnerConfirm>> = {}) => {
  const picked = o.pickedId ?? "o-plains";
  const pool = [...CUTS, ...PONDER];
  const cutIt = pool.find((c) => c.cardOracleId === picked);
  return (
    <PartnerConfirm commander={ISHAI} partner={half(BRUSE)} cut={cutIt ? plateOf(cutIt) : null} cuts={CUTS} pickedId={picked}
      widens={["W", "U", "R"]} opens={{ n: 12, colors: "red" }} opensNames={OPENS} hasVersion {...o} />
  );
};

// D · the door on the commander's card details
emit("D0-phone", "phone", details(<PartnerDoorBox kind="partner" short="Ishai" />, false), 844);
emit("D1-phone", "phone", details(<PartnerDoorBox kind="partner" short="Ishai" />), 1040);
emit("D1-desk", "desk", details(<PartnerDoorBox kind="partner" short="Ishai" />), 1000);
// L · the list
emit("L1-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, list())}</>, 1640);
emit("L1-desk", "desk", <>{shell(spine(false))}{sheet(cc.sheet.title.single, list())}</>, 1500);
emit("L2-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, list("bruse-tarl-boorish-herder"))}</>, 1760);
// C · the confirm
emit("C1-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm())}</>, 1200);
emit("C1-desk", "desk", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm())}</>, 1180);
emit("C2-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm({ pickedId: "o-hedron-archive", opensOpen: true }))}</>, 1400);
emit("C3-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm({ pickedId: "o-ponder", query: "pon", results: PONDER }))}</>, 1060);
emit("C4-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm({ partner: half(THRAS), cuts: cutsFor("Ishai + Thrasios"), widens: ["W", "U", "G"], opens: { n: 9, colors: "green" } }))}</>, 1250);
emit("C5-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm({ cut: null, pickedId: "none", room: 98 }))}</>, 830);
emit("C6-phone", "phone", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm({ hasVersion: false }))}</>, 1210);
emit("C7-desk", "desk", <>{shell(spine(false))}{sheet(cc.sheet.title.single, confirm({ failed: true }))}</>, 1260);
// A · after: the deck page under the pair, with the Undo toast; and the review page's Commander section
const toast = (
  <div className="pointer-events-none fixed bottom-[calc(var(--tabbar-h,0px)+10px)] left-[16px] right-[16px] z-[60] flex flex-col md:bottom-[16px] md:left-[calc(var(--rail-w)+16px)] md:right-auto md:w-[440px]">
    <ToastFrame frameRef={{ current: null }} placement="inline" kind="receipt" title={`${pcopy.toast.added("Bruse Tarl", "Ishai")} ${pcopy.toast.cut("Plains")}`}
      actions={<button type="button" className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2">{pcopy.toast.undo}</button>} />
  </div>
);
emit("A1-phone", "phone", <>{shell(spine(true))}{toast}</>, 844);
emit("A1-desk", "desk", <>{shell(spine(true))}{toast}</>, 760);
const row = (slug: string, name: string, side: "from" | "to") => ({ oracleId: "o-" + slug, name, printedName: null, artCropUri: A(slug), side, buy: false, price: null });
const reviewState: any = {
  commander: true, addChanges: [], removes: [{ oracleId: "o-plains" }],
  commanderRows: { newestAsOf: null, rows: [row("ishai-ojutai-dragonspeaker", ISHAI.name, "from"), row("ishai-ojutai-dragonspeaker", ISHAI.name, "to"), row(BRUSE.slug, BRUSE.name, "to")] },
};
emit("A2-phone", "phone", <div className="p-[16px]" style={{ background: "var(--bg)" }}><CommanderSection state={reviewState} /></div>, 220);
emit("A2-desk", "desk", <div className="mx-auto w-[760px] p-[24px]" style={{ background: "var(--bg)" }}><CommanderSection state={reviewState} /></div>, 220);
// V · the four other pair rules, phone
let OF = 88;
const vrow = (slug: string, name: string, mana: string, cmc: number, n: number, widens: string[] | null, extra: Partial<H> = {}) => pc({ slug, name, mana, cmc, owned: true, ...extra }, n, widens, OF);
OF = 81; emit("V1-phone", "phone", <>{shell(<div />)}{sheet(cc.sheet.title.single, <AddPartnerSection kind="background" short="Lae’zel" counted={81} yours={[vrow("noble-heritage", "Noble Heritage", "{2}{W}", 3, 38, null)]} toBuy={[vrow("raised-by-giants", "Raised by Giants", "{5}{G}", 6, 31, ["W", "G"], { owned: false, price: 29 })]} toBuyTotal={22} />)}</>, 980);
OF = 84; emit("V2-phone", "phone", <>{shell(<div />)}{sheet(cc.sheet.title.single, <AddPartnerSection kind="friends" short="Hargilde" counted={84} yours={[vrow("sophina-spearsage-deserter", "Sophina, Spearsage Deserter", "{3}{R}{W}", 5, 36, ["W", "U", "R"])]} toBuy={[vrow("bjorna-nightfall-alchemist", "Bjorna, Nightfall Alchemist", "{U}{R}", 2, 34, ["W", "U", "R"], { owned: false, price: 79 })]} />)}</>, 940);
OF = 86; emit("V3-phone", "phone", <>{shell(<div />)}{sheet(cc.sheet.title.single, <AddPartnerSection kind="doctor" short="The Tenth Doctor" counted={86} yours={[vrow("rose-tyler", "Rose Tyler", "{1}{W}", 2, 49, ["W", "U", "R"]), vrow("donna-noble", "Donna Noble", "{3}{R}", 4, 44, null)]} toBuy={[]} />)}</>, 940);
OF = 83; emit("V4-phone", "phone", <>{shell(<div />)}{sheet(cc.sheet.title.single, <AddPartnerSection kind="with" short="Pir" other="Toothy, Imaginary Friend" counted={83} yours={[]} toBuy={[vrow("toothy-imaginary-friend", "Toothy, Imaginary Friend", "{3}{U}", 4, 57, ["G", "U"], { owned: false, price: 42 })]} />)}</>, 820);

writeFileSync("dz/frames.json", JSON.stringify(frames));
console.log(frames.length, "frames");
