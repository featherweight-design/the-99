// Narrow commanders by theme (#159, account 2, 2026-11-21): shipped Discover components SSR'd with
// shipped CSS, the proposal (proposal.diff) applied. Chrome above the rack is the shipped kaldheim
// capture; everything from the page header down is rendered.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import * as React from "react";
import { PageHeader } from "../src/components/commanders/page-header";
import { FilterRack } from "../src/components/commanders/rack/filter-rack";
import { FilterSheet } from "../src/components/commanders/rack/filter-sheet";
import { CommanderRow } from "../src/components/commanders/commander-row";
import { ZeroState, ZERO_PRIMARY, ZERO_SECONDARY } from "../src/components/ui/zero-state";
import { PrimaryButton, GhostButton } from "../src/components/ui/button";
import { SetListSheet } from "../src/components/ui/set-list-sheet";
import { resultLineWithAside } from "../src/components/commanders/rack/result-line";
import { defaultParams, type LaneParams } from "../src/lib/commanders/lane-params";
import { MECHANIC_LABELS, CREATURE_TYPE_LABELS } from "../src/lib/edhrec/tag-kinds.generated";
import { FORMAT_LABELS } from "../src/lib/edhrec/tag-kinds";
import { discoveryCopy } from "../src/lib/copy/commander-discovery";
import { filterCopy, themesPanelCopy } from "../src/lib/copy/lanes";
import type { ThemeOption } from "../src/components/commanders/rack/theme-control";

mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const TOTAL = 2948;
const slug = (l: string) => l.toLowerCase().replace(/\+1\/\+1/g, "p1p1").replace(/-1\/-1/g, "m1m1").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Discover counts, illustrative: the most-played themes by commanders that carry them.
const TOP: [string, number][] = [
  ["Tokens", 612], ["+1/+1 Counters", 418], ["Spellslinger", 396], ["Aristocrats", 344], ["Lifegain", 301],
  ["Voltron", 287], ["Artifacts", 276], ["Reanimator", 258], ["Landfall", 214], ["Blink", 198], ["Graveyard", 192],
  ["Dragons", 162], ["Mill", 141], ["Treasure", 133], ["Zombies", 121], ["Lifedrain", 117], ["Elves", 98],
  ["Vampires", 88], ["Angels", 74], ["Wheels", 61], ["Group Hug", 58], ["Pillow Fort", 44], ["Pirates", 41],
  ["Storm", 39], ["Rats", 22], ["Ramp", 251], ["Control", 214], ["Combo", 187], ["Midrange", 152], ["Card Draw", 131],
  ["Sacrifice", 126], ["Flying", 97], ["Enchantress", 76], ["Equipment", 72], ["Lands Matter", 69], ["Goblins", 66],
  ["Big Mana", 63], ["Stax", 52], ["Land Destruction", 9], ["Land Animation", 7], ["Rat Colony", 2], ["Rad Counters", 6], ["Raccoons", 4], ["Pegasi", 3],
];
const typal = new Set(CREATURE_TYPE_LABELS);
const known = new Map(TOP);
const rest = [...MECHANIC_LABELS, ...CREATURE_TYPE_LABELS].filter((l) => !known.has(l) && !FORMAT_LABELS.includes(l));
const ALL: ThemeOption[] = [
  ...TOP.map(([label, count]) => ({ label, count })),
  ...rest.map((label, i) => ({ label, count: Math.max(1, 48 - Math.floor((i * 47) / rest.length)) })),
]
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  .map((o) => ({ code: slug(o.label), label: o.label, hint: typal.has(o.label) ? "typal" : undefined, count: o.count, disabled: false }));
// The same list counted inside Blue: some themes go to zero and grey in place.
const BLUE: Record<string, number> = { tokens: 141, spellslinger: 233, aristocrats: 9, lifegain: 12, landfall: 0, "p1p1-counters": 58, voltron: 31, artifacts: 104, reanimator: 47, blink: 92, graveyard: 61, dragons: 11, mill: 88, treasure: 15, zombies: 23, elves: 0, angels: 0, "group-hug": 17, "pillow-fort": 6, storm: 26, "lands-matter": 0, "land-animation": 0, "land-destruction": 2, ramp: 38 };
const inBlue: ThemeOption[] = ALL.map((o) => {
  const count = BLUE[o.code] ?? Math.floor(o.count / 4);
  return { ...o, count, disabled: count === 0 };
}).sort((a, b) => (a.disabled === b.disabled ? b.count - a.count || a.label.localeCompare(b.label) : a.disabled ? 1 : -1));
const label = (c: string) => ALL.find((o) => o.code === c)!.label;

const SETS = [["fdc", "Foundations Jumpstart", "FDC"], ["tdc", "Tarkir: Dragonstorm Commander", "TDC"], ["eoc", "Edge of Eternities Commander", "EOC"]]
  .map(([code, l, hint], i) => ({ code, label: l, hint, count: 40 - i * 9, disabled: false }));

// Rows. Art is the shipped art crops used in earlier rounds (Scryfall is blocked in the build box).
type R = { slug: string; name: string; ci: string[]; art: string; styles: string[]; capped?: boolean; score: number; parts: [number, number, number]; decks: number; cents: number };
const ROW: Record<string, R> = {
  lathliss: { slug: "lathliss", name: "Lathliss, Dragon Queen", ci: ["R"], art: "crop-lathliss.jpg", styles: ["Dragons", "Tokens", "Treasure"], score: 84, parts: [30, 24, 30], decks: 4212, cents: 349 },
  quintorius: { slug: "quintorius", name: "Quintorius, Field Historian", ci: ["R", "W"], art: "crop-quintorius.jpg", styles: ["Tokens", "Graveyard", "Spirits"], score: 79, parts: [28, 23, 28], decks: 2931, cents: 39 },
  dina: { slug: "dina", name: "Dina, Soul Steeper", ci: ["B", "G"], art: "crop-dina.jpg", styles: ["Aristocrats", "Lifegain", "Lifedrain"], score: 88, parts: [32, 26, 30], decks: 6104, cents: 49 },
  giada: { slug: "giada", name: "Giada, Font of Hope", ci: ["W"], art: "crop-giada.jpg", styles: ["Angels", "+1/+1 Counters", "Lifegain"], score: 86, parts: [31, 25, 30], decks: 9870, cents: 199 },
  mothman: { slug: "mothman", name: "The Wise Mothman", ci: ["B", "G", "U"], art: "a-mothman.jpg", styles: ["Rad Counters", "Mill", "+1/+1 Counters"], score: 71, parts: [26, 20, 25], decks: 3318, cents: 279 },
  yshtola: { slug: "yshtola", name: "Y’shtola, Night’s Blessed", ci: ["W", "U", "B"], art: "a-yshtola.jpg", styles: ["Spellslinger", "Lifedrain", "Control"], score: 87, parts: [31, 26, 30], decks: 7561, cents: 365 },
};
const item = (r: R, rank: number) => ({
  slug: r.slug, name: r.name, colorIdentity: r.ci, artCropUri: `art/${r.art}`, rank, prose: null,
  gapSlot: { kind: "allPlayed" as const, labels: r.styles, capped: r.capped ?? true },
  score: r.score, measurableTotal: 100, fitPool: r.parts[0], fitRoles: r.parts[1], fitSynergy: r.parts[2],
  deckCount: r.decks, price: { kind: "priced" as const, cents: r.cents }, priceOk: true, href: "#",
});

type Dev = "phone" | "desk";
const frames: any[] = [];
let PENDING_OPEN: string | null = null;
function emit(id: string, dev: Dev, body: () => ReactNode, o: { vh?: number } = {}) {
  writeFileSync(`dz/frames/${id}.html`, renderToString(<>{body()}</>));
  G.__OPEN = null;
  frames.push({ id, dev, vh: o.vh ?? (dev === "phone" ? 844 : 900) });
}

const P = (o: Partial<LaneParams>): LaneParams => ({ ...defaultParams("discover"), ...o });

function rack(dev: Dev, params: LaneParams, shown: number, themeOptions = ALL) {
  return (
    <FilterRack params={params} lane="discover" onChange={() => {}} shown={shown} total={TOTAL} excludedByExactly={null}
      forceWide={dev === "desk"} printedInOptions={SETS} themeOptions={themeOptions} />
  );
}
function list(rows: { r: R; rank: number }[], picked: string[]) {
  return (
    <ul className="flex flex-col gap-[10px] sm:gap-[12px] list-none p-0 m-0">
      {rows.map(({ r, rank }, i) => (
        <li key={r.slug}>
          <CommanderRow position={i} onHide={() => {}} item={item(r, rank)} pickedThemes={picked.map(label).filter((l) => r.styles.includes(l))} />
        </li>
      ))}
    </ul>
  );
}
function shell(dev: Dev, inner: ReactNode, overlay?: ReactNode) {
  if (dev === "desk") {
    return (
      <div className="flex min-h-dvh">
        <img src="art/dk-rail.png" alt="" style={{ width: 62, height: 900, position: "fixed", left: 0, top: 0, objectFit: "cover", objectPosition: "top left" }} />
        <main className="flex-1 flex flex-col" style={{ marginLeft: 62 }}>
          <img src="art/dk-head.png" alt="" style={{ width: 1238, height: 150, display: "block" }} />
          <section className="flex flex-col min-h-screen">{inner}</section>
        </main>
        {overlay}
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <img src="art/ph-head.png" alt="" style={{ width: 390, height: 128, display: "block" }} />
      <section className="flex flex-col min-h-screen">{inner}</section>
      <img src="art/ph-bar.png" alt="" style={{ width: 390, height: 74, position: "fixed", left: 0, bottom: 0, zIndex: 30 }} />
      {overlay}
    </div>
  );
}
const body = (children: ReactNode) => (
  <div className="flex flex-1 flex-col p-[12px_14px] sm:px-[34px] sm:pb-[34px] sm:pt-[14px]">{children}</div>
);
function page(dev: Dev, params: LaneParams, shown: number, content: ReactNode, opts: { themeOptions?: ThemeOption[]; overlay?: ReactNode } = {}) {
  return shell(dev, <>
    <PageHeader lane="discover" />
    {rack(dev, params, shown, opts.themeOptions)}
    {body(content)}
  </>, opts.overlay);
}
const SEL = (dev: Dev) => dev === "desk"; // the panel opens on desk; the sheet on phone

function sheet(params: LaneParams, shown: number, themeOptions = ALL) {
  return (
    <FilterSheet open onOpenChange={() => {}} params={params} lane="discover" onChange={() => {}} shown={shown} total={TOTAL}
      resultLine={resultLineWithAside(shown, TOTAL, "discover", null, null)} printedInOptions={SETS} themeOptions={themeOptions} />
  );
}
const LIST_COPY: any = {
  panelAriaLabel: themesPanelCopy.panelAriaLabel, sheetTitle: themesPanelCopy.sheetTitle, footerSelected: themesPanelCopy.footerSelected,
  searchPlaceholder: themesPanelCopy.searchPlaceholder, searchAriaLabel: themesPanelCopy.searchAriaLabel, none: filterCopy.themes.listNone,
  empty: filterCopy.themes.listEmpty, optionAriaUnavailable: themesPanelCopy.optionAriaUnavailable, announceMatches: themesPanelCopy.announceMatches,
  announceResult: filterCopy.themes.listShown, done: "Back to filters",
};
const layer = (selected: string[], options = ALL, note?: string) => (
  <SetListSheet copy={LIST_COPY} note={note} onDismiss={() => {}} options={options} selected={selected} onToggle={() => {}} shown={0} total={TOTAL} returnFocusTo={{ current: null }} />
);

const empty = (heading: string, text: string, cta: string) => (
  <ZeroState heading={heading} body={text}
    primary={<PrimaryButton onClick={() => {}} className={ZERO_PRIMARY}>{cta}</PrimaryButton>}
    secondary={<GhostButton href="#" className={ZERO_SECONDARY}>{discoveryCopy.empty.filteredScopeLink}</GhostButton>} />
);
const E = discoveryCopy.empty;

for (const dev of ["desk", "phone"] as Dev[]) {
  const d = dev === "desk" ? "D" : "P";
  const open = (fn: () => ReactNode) => { G.__OPEN = dev === "desk" ? themesPanelCopy.panelAriaLabel : null; return fn(); };

  // 1 · No theme picked: the rack at rest, the shipped list.
  emit(`${d}1-none`, dev, () => page(dev, P({}), TOTAL, list([{ r: ROW.yshtola, rank: 1 }, { r: ROW.giada, rank: 2 }], [])));
  // 2 · Picking: the panel (desk) or the sheet (phone), nothing picked yet.
  emit(`${d}2-open`, dev, () => open(() => page(dev, P({}), TOTAL, list([{ r: ROW.yshtola, rank: 1 }, { r: ROW.giada, rank: 2 }], []),
    { overlay: dev === "phone" ? sheet(P({}), TOTAL) : undefined })));
  // 3 · One picked.
  const one = P({ themes: ["tokens"] });
  emit(`${d}3-one`, dev, () => page(dev, one, 612, list([{ r: ROW.lathliss, rank: 4 }, { r: ROW.quintorius, rank: 9 }], one.themes)));
  // 4 · Several picked, Any, picker still open.
  const two = P({ themes: ["aristocrats", "tokens"] });
  emit(`${d}4-several-open`, dev, () => open(() => page(dev, two, 801, list([{ r: ROW.lathliss, rank: 4 }, { r: ROW.dina, rank: 6 }], two.themes),
    { overlay: dev === "phone" ? sheet(two, 801) : undefined })));
  // 5 · Several picked, All.
  const all = P({ themes: ["aristocrats", "lifegain"], themeMatch: "all" });
  emit(`${d}5-all`, dev, () => page(dev, all, 41, list([{ r: ROW.dina, rank: 6 }, { r: ROW.giada, rank: 11 }].map((x) => x.r === ROW.giada ? { r: { ...ROW.giada, styles: ["Lifegain", "Aristocrats", "Angels"] }, rank: 11 } : x), all.themes)));
  // 6 · With color: Blue lit, the picker counts inside Blue and greys the zeros.
  const blue = P({ colors: ["u"] });
  emit(`${d}6-color-open`, dev, () => open(() => page(dev, blue, 744, list([{ r: ROW.yshtola, rank: 1 }, { r: ROW.mothman, rank: 14 }], []),
    { themeOptions: inBlue, overlay: dev === "phone" ? sheet(blue, 744, inBlue) : undefined })));
  // 7 · No matches, All (the pick itself emptied it).
  const zero = P({ themes: ["aristocrats", "landfall", "lifegain"], themeMatch: "all" });
  emit(`${d}7-zero-all`, dev, () => page(dev, zero, 0, empty(E.filteredThemesAllHeading, E.filteredThemesAllBody("Aristocrats, Landfall and Lifegain", TOTAL), E.filteredThemesAllCta)));
  // 8 · No matches, color + theme.
  const cz = P({ colors: ["w"], themes: ["rad-counters"] });
  emit(`${d}8-zero-color`, dev, () => page(dev, cz, 0, empty(E.filteredTogetherHeading, E.filteredColorsThemesBody("white", "Rad Counters", TOTAL), E.filteredCta)));
  // 9 · A theme with very few commanders.
  const few = P({ themes: ["rad-counters"] });
  emit(`${d}9-few`, dev, () => page(dev, few, 1, list([{ r: ROW.mothman, rank: 14 }], few.themes)));
  // 10 · Searching the list: typal themes carry their hint.
  if (dev === "desk") {
    G.__QUERY = "lan";
    emit(`D6b-color-zero`, dev, () => open(() => page(dev, P({ colors: ["u"] }), 744, list([{ r: ROW.yshtola, rank: 1 }, { r: ROW.mothman, rank: 14 }], []), { themeOptions: inBlue })));
    G.__QUERY = "ra";
    emit(`D10-search`, dev, () => open(() => page(dev, P({}), TOTAL, list([{ r: ROW.yshtola, rank: 1 }, { r: ROW.giada, rank: 2 }], []))));
    G.__QUERY = undefined;
  } else {
    // The whole list, one layer over the sheet.
    emit(`P10-layer`, dev, () => page(dev, two, 801, list([{ r: ROW.lathliss, rank: 4 }], two.themes), { overlay: <>{sheet(two, 801)}{layer(two.themes)}</> }));
  }
}
writeFileSync("dz/frames.json", JSON.stringify(frames, null, 1));
console.log(frames.length, "frames");
