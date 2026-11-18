import { writeFileSync } from "node:fs";
import { R } from "./render";
import * as Shipped from "./proposal/menu-shipped";
import * as New from "./proposal/menu-new";
import { SignaturePicker } from "./src/components/social/signature-picker";

(globalThis as any).__INLINE = true;
(globalThis as any).__DECK = {
  k: "done",
  tiles: [
    { oracleId: "poly", name: "Polyraptor", artCropUri: "art/crop-polyraptor.jpg", colorIdentity: ["G"], printingId: null },
    { oracleId: "zim", name: "Zimone, Infinite Analyst", artCropUri: "art/crop-zimone.jpg", colorIdentity: ["G", "U"], printingId: null },
    { oracleId: "sai", name: "Sai, Master Thopterist", artCropUri: "art/crop-sai.jpg", colorIdentity: ["U"], printingId: null },
    { oracleId: "gha", name: "Ghalta, Primal Hunger", artCropUri: "art/crop-ghalta.jpg", colorIdentity: ["G"], printingId: null },
    { oracleId: "roo", name: "Rootha, Mercurial Artist", artCropUri: "art/crop-rootha.jpg", colorIdentity: ["U", "R"], printingId: null },
  ],
};

const noop = () => {};
const identity = { name: "Hugh", email: "hugh@example.com", initials: "H" } as any;
const chip = { kind: "credits", label: "12 credits", line: null, hollow: false } as any;
const base = { kind: "popover" as const, identity, theme: "amonkhet" as any, panelId: "p", nameId: "n", busy: false, onClose: noop, onSignOut: noop, onAbout: noop, admin: null, onSettings: noop, onTour: noop, onAdmin: noop, chip, onCredits: noop };
const POLY = "art/crop-polyraptor.jpg";
const GHALTA = "art/crop-ghalta.jpg";
const current = { oracleId: "poly", name: "Polyraptor", artCropUri: POLY, printingId: null, printingGone: false };

/** Desktop: the rail's foot with the 30px trigger open, the popover over it. */
const rail = (pop: any, over: any = null) => (
  <div className="relative h-[800px] w-[1280px] overflow-hidden" style={{ background: "var(--bg)" }}>
    <div className="absolute inset-y-0 left-0 w-[232px] border-r border-[color:var(--border)]" style={{ background: "var(--surface-rail)" }}>
      <div className="absolute bottom-[18px] left-[18px]">
        <span aria-hidden className="absolute bottom-[calc(100%+6px)] left-[18px] h-1 w-1 -translate-x-1/2 rotate-45" style={{ background: "var(--accent)" }} />
        <span className="block p-[3px]"><span className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full border border-[color:var(--accent-hover)] bg-[color:var(--elevated)]">{pop.props.art ? <img src={pop.props.art} alt="" className="h-full w-full object-cover" /> : <span className="font-mono text-[11px] text-[color:var(--accent-hover)]">H</span>}</span></span>
        {pop}
      </div>
    </div>
    {over}
  </div>
);
const sheetFrame = (sheet: any, over: any = null) => (
  <div className="relative h-[844px] w-[390px] overflow-hidden" style={{ background: "var(--bg)" }}>
    {sheet}
    {over}
  </div>
);
const picker = <SignaturePicker current={current} onSave={async () => {}} onClose={noop} returnFocusRef={{ current: null }} toast={null} />;

const out: Record<string, any> = {
  "m-shipped-d": rail(<Shipped.AccountPopover {...base} art={POLY} />),
  "m-shipped-p": sheetFrame(<Shipped.AccountSheet {...base} kind="sheet" art={POLY} />),
  "m-face-d": rail(<New.AccountPopover {...base} art={POLY} />),
  "m-face-p": sheetFrame(<New.AccountSheet {...base} kind="sheet" art={POLY} />),
  "m-mark-d": rail(<New.AccountPopover {...base} art={POLY} mark />),
  "m-mark-p": sheetFrame(<New.AccountSheet {...base} kind="sheet" art={POLY} mark />),
  "m-none-d": rail(<New.AccountPopover {...base} art={null} />),
  "m-none-p": sheetFrame(<New.AccountSheet {...base} kind="sheet" art={null} />),
  "m-pick-d": rail(<New.AccountPopover {...base} art={POLY} picking />, picker),
  "m-pick-p": sheetFrame(<New.AccountSheet {...base} kind="sheet" art={POLY} picking />, picker),
  "m-saved-d": rail(<New.AccountPopover {...base} art={GHALTA} />),
  "m-saved-p": sheetFrame(<New.AccountSheet {...base} kind="sheet" art={GHALTA} />),
};
for (const [k, el] of Object.entries(out)) writeFileSync(`hero/${k}.html`, R(el, "/"));
console.log("menu ok");
