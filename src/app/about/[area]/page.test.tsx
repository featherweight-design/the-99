import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SWITCH_NAMES } from "../../../lib/switches/registry";
import { ABOUT_AREA_IDS, ABOUT_SECTIONS } from "../../../lib/copy/about-pages";

// /about/[area] (About visual PR 3): an unknown area is a 404; a known one draws its sections in order, each at its own
// id, from the reader's switches (Review Focus 2: a label switched off is gone from the list and the pins, and the
// numbers close up) and in the reader's theme.
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env(Object.fromEntries(SWITCH_NAMES.map((n) => [n, "true"])));

const m = vi.hoisted(() => ({
  env: {} as NodeJS.ProcessEnv,
  theme: "amonkhet",
  requestSwitchEnv: vi.fn<(userId: string) => Promise<NodeJS.ProcessEnv>>(async () => ({}) as NodeJS.ProcessEnv),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  seen: { version: 16, ids: [] as string[] },
  asked: [] as (readonly string[] | undefined)[],
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../lib/theme/server", () => ({ resolveTheme: async () => m.theme }));
vi.mock("../../../lib/about/read", () => ({ aboutSeen: async () => m.seen }));
// The card input reads the database; a reader with one deck that fits every deck tool stands in for it.
vi.mock("../../../lib/discovery/showcase-input", async () => {
  const { SWITCH_FLAGS } = await import("../../../lib/switches/flags");
  const { DECK_TOOLS } = await import("../../../lib/discovery/fits");
  return {
    switchesOn: (e: NodeJS.ProcessEnv) => (n: keyof typeof SWITCH_FLAGS) => SWITCH_FLAGS[n](e),
    loadCardInput: async (_userId: string, e: NodeJS.ProcessEnv, _perf?: unknown, only?: readonly string[]) => (m.asked.push(only), {
      isOn: (n: keyof typeof SWITCH_FLAGS) => SWITCH_FLAGS[n](e),
      fits: Object.fromEntries(DECK_TOOLS.map((t) => [t, { decks: [{ id: "d1", name: "Ghalta" }] }])),
      deckCount: 1,
      hasSyncBase: true,
      place: true,
    }),
  };
});
vi.mock("../../../lib/about/back-read", () => ({
  ownDeckName: vi.fn(async (_userId: string, deckId: string | null) => (deckId === "0b6c2f4e-1111-4222-8333-444455556666" ? "Sai" : null)),
}));
vi.mock("next/navigation", () => ({ notFound: m.notFound, usePathname: () => "/about/decks", useRouter: () => ({ refresh: () => {} }) }));

import AboutAreaRoute from "./page";
import { AreaPage, type AreaSection } from "../../../components/about/pages/area-page";
import { RecordPageVisit } from "../../../components/about/pages/record-page-visit";
import { afterVisit, heldAnswer, seenKeysOf, visibleSections } from "../../../lib/about/pages-visible";
import type { Landable } from "../../../lib/discovery/page-tools";

type El = ReactElement<{
  area: string;
  sections: AreaSection[];
  landable: Landable;
  initialLit: string | null;
  back: { from: string; screen: string } | null;
}>;
/** The route's two children: the page, and the visit it records once open (PR 6b). */
const route = async (area: string, query: Record<string, string | string[]> = {}) => {
  const el = (await AboutAreaRoute({ params: Promise.resolve({ area }), searchParams: Promise.resolve(query) })) as ReactElement<{ children: ReactElement[] }>;
  return el.props.children;
};
const draw = async (area: string, query: Record<string, string | string[]> = {}) => (await route(area, query))[0] as El;
const visitOf = async (area: string) =>
  (await route(area))[1] as ReactElement<{ area: string; owed: boolean; keys: readonly string[]; claimed: readonly string[] }>;

beforeEach(() => {
  vi.clearAllMocks();
  m.seen = { version: 16, ids: [] };
  m.env = ALL_ON;
  m.theme = "amonkhet";
  m.requestSwitchEnv.mockImplementation(async () => m.env);
});

describe("/about/[area]", () => {
  it("404s an area that is not one of the six", async () => {
    for (const area of ["nope", "Decks", "toString", ""]) {
      await expect(draw(area)).rejects.toThrow("NEXT_NOT_FOUND");
    }
    expect(m.notFound).toHaveBeenCalledTimes(4);
  });

  it("draws each of the six areas' sections, in order, decided from the reader's own switches", async () => {
    for (const area of ABOUT_AREA_IDS) {
      const el = await draw(area);
      expect(isValidElement(el) && el.type).toBe(AreaPage);
      expect(el.props.area).toBe(area);
      expect(el.props.sections.map((s) => s.id)).toEqual(ABOUT_SECTIONS.filter((s) => s.area === area).map((s) => s.id));
    }
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("u1");
  });

  it("gives each section its id, and the On this page chips jump to them", async () => {
    const html = renderToStaticMarkup(await draw("decks"));
    for (const s of ABOUT_SECTIONS.filter((x) => x.area === "decks")) {
      expect(html).toContain(`id="${s.id}"`);
      expect(html).toContain(`href="#${s.id}"`);
    }
    expect(html).toContain("On this page");
  });

  it("a label switched off for the reader has no line and no pin, and the numbers close up (Review Focus 2)", async () => {
    // Suggested changes' switch carries two labels here, its own and Describe your deck's.
    const GONE = ["decks/analysis/suggested", "decks/analysis/describe"];
    const DESCRIBE = "in a sentence or two. Suggested changes uses it";
    const CUTS = "counts where a deck over 100 runs long";
    const analysis = async () => (await draw("decks")).props.sections.find((s) => s.id === "analysis")!;
    expect(renderToStaticMarkup(await draw("decks"))).toContain(DESCRIBE);
    const on = await analysis();
    // Proposed cuts' own switch is retired: its name set off moves nothing, and the label stays with the tab.
    m.env = env({ ...(ALL_ON as Record<string, string>), PROPOSED_CUTS_ENABLED: "off" });
    const retired = await analysis();
    m.env = env({ ...(ALL_ON as Record<string, string>), TUNING_ENABLED: "off" });
    const off = await analysis();
    for (const width of ["phone", "desktop"] as const) {
      expect(on[width].labels.map((l) => l.key)).toEqual(expect.arrayContaining([...GONE, "decks/analysis/cuts"]));
      expect(retired[width].labels.map((l) => l.key)).toEqual(on[width].labels.map((l) => l.key));
      for (const key of GONE) {
        expect(off[width].labels.map((l) => l.key)).not.toContain(key);
        expect(off[width].shots.flatMap((s) => s.pins).map((p) => p.key)).not.toContain(key);
      }
      expect(off[width].labels.map((l) => l.key)).toContain("decks/analysis/cuts");
      expect(off[width].labels.map((l) => l.n)).toEqual(off[width].labels.map((_, i) => i + 1));
      expect(off[width].labels).toHaveLength(on[width].labels.length - GONE.length);
    }
    // Nothing of them reaches the page, at either width; Proposed cuts, on the tab, still does.
    const html = renderToStaticMarkup(await draw("decks"));
    for (const key of GONE) expect(html).not.toContain(key);
    expect(html).not.toContain(DESCRIBE);
    expect(html).toContain(CUTS);
  });

  it("draws the reader's theme's captures, phone and desktop, never one width's in the other's place", async () => {
    m.theme = "kamigawa";
    const el = await draw("decks");
    // The page is told the theme it was drawn in, so a theme picked later asks the server again (ThemeRefresh).
    expect((el.props as { theme?: string }).theme).toBe("kamigawa");
    const [s] = el.props.sections;
    expect(s.phone.shots[0].shot.src).toMatch(/^\/about\/pages\/kamigawa\/phone\//);
    expect(s.desktop.shots[0].shot.src).toMatch(/^\/about\/pages\/kamigawa\/desktop\//);
  });

  it("draws each section's Try it from the tools whose labels it draws, its Where line aimed at the label (call 6)", async () => {
    const analysis = (await draw("decks")).props.sections.find((s) => s.id === "analysis")!;
    expect(analysis.tools.map((c) => c.card.id)).toEqual(["suggested-changes", "proposed-cuts", "mana-balance"]);
    const cuts = analysis.tools.find((c) => c.card.id === "proposed-cuts")!;
    expect(cuts.card.showMe).toBe("/about/decks?lit=decks%2Fanalysis%2Fcuts#analysis");
    // The press is still Try it, unchanged.
    expect(cuts.card.state).toMatchObject({ kind: "deck", href: "/decks/d1?tool=proposed-cuts" });
    // Each width's own picture: the 390 crop on a phone, the tool's desktop crop from md.
    expect(cuts.phone?.src).toMatch(/^\/about\/shots\//);
    expect(cuts.desktop?.src).toBe("/about/pages/amonkhet/desktop/tools/proposed-cuts.webp");
    const html = renderToStaticMarkup(await draw("decks"));
    expect(html).toContain('href="/about/decks?lit=decks%2Fanalysis%2Fcuts#analysis"');
    // The card's Where line (R4 board 5) replaces its Show me link.
    expect(html).toContain("Show it above ↑");
    expect(html).not.toContain("How it works ›");
  });

  // R4 board 4, both widths: a band between two sections, none above the first (ruling 3), and each kicker counting
  // the sections this reader is drawn, in the accent.
  const parse = (html: string) => {
    const root = document.createElement("div");
    root.innerHTML = html;
    return root;
  };

  it("draws a band between each two sections and a kicker giving each one's place, in the accent", async () => {
    const el = await draw("decks");
    const total = el.props.sections.length;
    expect(total).toBeGreaterThan(2);
    const root = parse(renderToStaticMarkup(el));
    const bands = root.querySelectorAll("[data-about-band]");
    expect(bands).toHaveLength(total - 1);
    for (const b of bands) {
      expect(b.nextElementSibling?.tagName).toBe("SECTION");
      expect(b.previousElementSibling?.tagName).toBe("SECTION");
      expect(b.className).toMatch(/(^| )h-\[10px\]( |$)/);
      expect(b.className).toContain("bg-[color:var(--bg)]");
      expect(b.className).toContain("border-y");
    }
    const sections = [...root.querySelectorAll("section")];
    // The first keeps its single top rule; the rest have the band instead.
    expect(sections[0].className).toContain("border-t");
    for (const sec of sections.slice(1)) expect(sec.className).not.toMatch(/(^| )border-t( |$)/);
    const kickers = [...root.querySelectorAll("[data-about-kicker]")];
    expect(kickers.map((k) => k.textContent)).toEqual(sections.map((_, i) => `Decks · screen ${i + 1} of ${total}`));
    for (const k of kickers) expect(k.className).toContain("text-[color:var(--accent-text)]");
  });

  it("counts only the sections the reader is drawn, and a one-section page draws no count (R4 ruling 4)", async () => {
    const el = await draw("decks");
    const props = el.props as unknown as Parameters<typeof AreaPage>[0];
    const fewer = parse(renderToStaticMarkup(<AreaPage {...props} sections={props.sections.slice(1)} />));
    const n = el.props.sections.length - 1;
    expect([...fewer.querySelectorAll("[data-about-kicker]")].map((k) => k.textContent)).toEqual(
      Array.from({ length: n }, (_, i) => `Decks · screen ${i + 1} of ${n}`),
    );
    expect(fewer.querySelectorAll("[data-about-band]")).toHaveLength(n - 1);
    const one = parse(renderToStaticMarkup(<AreaPage {...props} sections={props.sections.slice(0, 1)} />));
    expect([...one.querySelectorAll("[data-about-kicker]")].map((k) => k.textContent)).toEqual(["Decks"]);
    expect(one.querySelectorAll("[data-about-band]")).toHaveLength(0);
  });

  it("reads fits only for the tools the area draws, and none for an area that draws none", async () => {
    m.requestSwitchEnv.mockResolvedValue(ALL_ON);
    m.asked.length = 0;
    const decks = await draw("decks");
    const drawn = decks.props.sections.flatMap((s) => s.tools.map((t) => t.card.id)).sort();
    expect(m.asked).toHaveLength(1);
    expect([...(m.asked[0] ?? [])].sort()).toEqual(drawn);
    for (const area of ["home", "collection", "commanders", "shopping", "friends"]) {
      m.asked.length = 0;
      const page = await draw(area);
      const ids = page.props.sections.flatMap((s) => s.tools.map((t) => t.card.id));
      if (ids.length === 0) expect(m.asked).toEqual([]);
      else expect([...(m.asked[0] ?? [])].sort()).toEqual([...ids].sort());
    }
  });

  it("a switch off for the reader takes the tool card with its label (Review Focus 2)", async () => {
    const cards = async () => (await draw("decks")).props.sections.flatMap((s) => s.tools.map((c) => c.card.id));
    expect(await cards()).toContain("proposed-cuts");
    // Proposed cuts' own switch is retired: its retired name set off keeps the card, and the Analysis tab takes it.
    m.env = env({ ...(ALL_ON as Record<string, string>), PROPOSED_CUTS_ENABLED: "off" });
    expect(await cards()).toContain("proposed-cuts");
    m.env = env({ ...(ALL_ON as Record<string, string>), ANALYSIS_TAB_ENABLED: "off" });
    expect(await cards()).not.toContain("proposed-cuts");
    expect(renderToStaticMarkup(await draw("decks"))).not.toContain('data-tool-card="proposed-cuts"');
  });

  it("hands over the labels this page can land on, New only while the reader has not been told, and lands `?lit=` on first paint", async () => {
    const lit = "decks/analysis/cuts";
    const fresh = await draw("decks", { lit });
    expect(fresh.props.initialLit).toBe(lit);
    expect(fresh.props.landable[lit]).toEqual({ isNew: true, section: "analysis" });
    const drawn = fresh.props.sections.flatMap((s) => [...s.desktop.labels, ...s.phone.labels, ...s.rules].map((l) => l.key));
    expect(Object.keys(fresh.props.landable).sort()).toEqual([...new Set(drawn)].sort());
    const freshHtml = renderToStaticMarkup(fresh);
    expect(freshHtml).toContain("data-about-new");
    expect(freshHtml).toContain('data-about-landing-card="proposed-cuts"');
    m.seen = { version: 16, ids: [lit] };
    const told = await draw("decks", { lit });
    expect(told.props.landable[lit]).toEqual({ isNew: false, section: "analysis" });
    const html = renderToStaticMarkup(told);
    expect(html).not.toContain("data-about-new");
    expect(html).not.toContain("data-about-landing-card");
  });

  it("marks a label New when only a switched sentence of it is unseen, lit by its base key (a sentence's Show me)", async () => {
    // Friend spares, told whole before SPARE_REQUESTS_ENABLED was on; its sentence is the launch now.
    const spare = "shopping/deck-shopping/spare";
    m.seen = { version: 16, ids: [spare, "friend-spares"] };
    const el = await draw("shopping", { lit: spare });
    expect(el.props.initialLit).toBe(spare);
    expect(el.props.landable[spare]).toEqual({ isNew: true, section: "deck-shopping" });
    expect(el.props.landable).not.toHaveProperty([`${spare}@SPARE_REQUESTS_ENABLED`]);
    m.seen = { version: 16, ids: [spare, `${spare}@SPARE_REQUESTS_ENABLED`] };
    expect((await draw("shopping", { lit: spare })).props.landable[spare]).toEqual({ isNew: false, section: "deck-shopping" });
  });

  it("lights nothing on first paint for a label this page does not draw", async () => {
    for (const lit of ["friends/friends/add", "decks/analysis/nope", "toString", ["decks/analysis/cuts", "decks/analysis/cuts"]]) {
      const el = await draw("decks", { lit });
      expect(el.props.initialLit).toBeNull();
    }
    m.env = env({ ...(ALL_ON as Record<string, string>), ANALYSIS_TAB_ENABLED: "off" });
    const off = await draw("decks", { lit: "decks/analysis/cuts" });
    expect(off.props.initialLit).toBeNull();
    expect(off.props.landable).not.toHaveProperty(["decks/analysis/cuts"]);
    expect((await draw("decks")).props.initialLit).toBeNull();
  });
});

describe("/about/[area], reached by the ? (PR 6a)", () => {
  it("draws the back bar for a validated from, named for its screen", async () => {
    expect((await draw("collection", { from: "/collection/replace" })).props.back).toEqual({ from: "/collection/replace", screen: "Upload a file" });
    expect((await draw("decks", { from: "/credits", lit: "rule/credits" })).props.back).toEqual({ from: "/credits", screen: "Credits" });
    expect((await draw("decks")).props.back).toBeNull();
  });

  it("names a deck by the reader's own deck's name, else by its section", async () => {
    const own = "/decks/0b6c2f4e-1111-4222-8333-444455556666";
    expect((await draw("decks", { from: own })).props.back).toEqual({ from: own, screen: "Sai" });
    const other = "/decks/7a0e0000-0000-4000-8000-000000000001";
    expect((await draw("decks", { from: other })).props.back).toEqual({ from: other, screen: "Your deck" });
  });

  it("draws no bar for a from that could leave the app, or names nothing", async () => {
    for (const from of ["//evil.example", "https://evil.example/x", "/\\evil", "javascript:alert(1)", "/admin", ["/a", "/b"]]) {
      expect((await draw("collection", { from })).props.back, JSON.stringify(from)).toBeNull();
    }
  });

  it("lands a rule the ? names, lit, with no New tag", async () => {
    const el = await draw("decks", { from: "/credits", lit: "rule/credits" });
    expect(el.props.initialLit).toBe("rule/credits");
    expect(el.props.landable["rule/credits"]).toEqual({ isNew: false, section: "analysis" });
    const html = renderToStaticMarkup(el);
    expect(html).toMatch(/data-rule="rule\/credits" data-lit=""/);
    expect(html).not.toContain("data-about-new");
  });

  it("a label the ? names that the reader is not told about draws no New tag and no card under it (A1)", async () => {
    const html = renderToStaticMarkup(await draw("decks", { from: "/decks/new", lit: "decks/your-decks/new-deck" }));
    expect(html).toContain('data-about-label="decks/your-decks/new-deck"');
    expect(html).not.toContain("data-about-new");
    expect(html).not.toContain("data-about-landing-card");
  });

  it("a unit switched off for the reader lands on its section with nothing lit (Review Focus 2)", async () => {
    // Suggested changes' label (Shopping's limit was the example until SWAP_TOOLS_ENABLED retired: it always draws now).
    m.env = env({ ...ALL_ON, TUNING_ENABLED: "" });
    const el = await draw("decks", { from: "/settings", lit: "decks/analysis/suggested" });
    expect(el.props.initialLit).toBeNull();
    expect(el.props.landable).not.toHaveProperty(["decks/analysis/suggested"]);
    expect(el.props.sections.map((s) => s.id)).toContain("analysis");
    expect(el.props.back).toEqual({ from: "/settings", screen: "Settings" });
  });
});

describe("/about/[area], the visit (PR 6b)", () => {
  it("records the visit once open, decided from the reader's own switches, acknowledging the state it rendered from", async () => {
    const visit = await visitOf("decks");
    expect(visit.type).toBe(RecordPageVisit);
    expect(visit.props.area).toBe("decks");
    expect(visit.props.keys).toEqual(heldAnswer(visibleSections(m.env), m.seen, null));
  });

  // Review round 7: an already-current Decks visit acknowledges a Shopping launch another tab marked seen.
  it("hands the no-write path every key the reader holds, another page's included", async () => {
    const [shopping] = seenKeysOf(visibleSections(m.env), "shopping");
    m.seen = { version: 16, ids: [...seenKeysOf(visibleSections(m.env), "decks"), shopping] };
    const visit = await visitOf("decks");
    expect(visit.props.owed).toBe(false);
    expect(visit.props.keys).toContain(shopping);
  });

  it("owes a write while the reader lacks a key of this page, and none once they hold them all", async () => {
    m.seen = { version: 16, ids: [] };
    expect((await visitOf("decks")).props.owed).toBe(true);
    m.seen = { version: 16, ids: seenKeysOf(visibleSections(m.env), "decks") };
    expect((await visitOf("decks")).props.owed).toBe(false);
  });

  it("owes a first-run reader a write (the baseline it writes is pinned in actions.test.ts)", async () => {
    m.seen = { version: 0, ids: [] };
    expect((await visitOf("home")).props.owed).toBe(true);
  });

  it("hands the visit exactly the keys this render would write, for the action to intersect with what it draws then", async () => {
    m.seen = { version: 16, ids: ["decks/games/matchups"] };
    const behind = await visitOf("decks");
    expect(behind.props.claimed).toEqual(seenKeysOf(visibleSections(m.env), "decks").filter((k) => k !== "decks/games/matchups"));
    m.seen = { version: 0, ids: [] };
    expect((await visitOf("home")).props.claimed).toEqual(afterVisit(visibleSections(m.env), "home", m.seen).ids);
    m.seen = { version: 16, ids: seenKeysOf(visibleSections(m.env), "decks") };
    expect((await visitOf("decks")).props.claimed).toEqual([]);
  });
});

